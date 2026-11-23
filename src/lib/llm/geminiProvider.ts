import { GoogleGenAI } from "@google/genai";
import { z } from "zod";
import { readCleanEnv } from "@/lib/env";
import {
  GenerateStructuredJsonOptions,
  LlmProvider,
} from "@/lib/llm/provider";
import { zodToJsonSchema } from "@/lib/llm/zodToJsonSchema";

export class LlmProviderError extends Error {
  constructor(
    message: string,
    public readonly statusCode = 502,
    public readonly isTimeout = false
  ) {
    super(message);
    this.name = "LlmProviderError";
  }
}

function isRateLimitError(err: unknown, message: string): boolean {
  const errObj = err as { status?: number; statusCode?: number; code?: number } | null;
  if (errObj?.status === 429 || errObj?.statusCode === 429 || errObj?.code === 429) {
    return true;
  }
  return (
    message.includes("429") ||
    message.includes("RESOURCE_EXHAUSTED") ||
    message.toLowerCase().includes("rate limit") ||
    message.toLowerCase().includes("quota")
  );
}

export class GeminiLlmProvider implements LlmProvider {
  public readonly providerName = "gemini";
  public modelName: string;
  private readonly primaryModel: string;
  private readonly fallbackModel: string | null;
  private readonly apiKey: string;
  private readonly rateLimitBackoffMs: number;

  constructor(options?: {
    apiKey?: string;
    modelName?: string;
    fallbackModel?: string | null;
    rateLimitBackoffMs?: number;
  }) {
    if (typeof window !== "undefined") {
      throw new Error("GeminiLlmProvider must only run on the server.");
    }
    const key = options?.apiKey || readCleanEnv("GEMINI_API_KEY");
    if (!key) {
      throw new LlmProviderError(
        "Missing GEMINI_API_KEY environment variable.",
        500
      );
    }
    this.apiKey = key;
    this.primaryModel =
      options?.modelName || readCleanEnv("GEMINI_MODEL") || "gemini-3.8-flash";
    this.modelName = this.primaryModel;

    const envFallback =
      options?.fallbackModel !== undefined
        ? options.fallbackModel
        : readCleanEnv("GEMINI_FALLBACK_MODEL") || "gemini-3.1-flash-lite";
    this.fallbackModel =
      envFallback && envFallback !== this.primaryModel ? envFallback : null;
    this.rateLimitBackoffMs = options?.rateLimitBackoffMs ?? 3000;
  }

  private async invokeModel<T>(
    ai: GoogleGenAI,
    model: string,
    systemPrompt: string,
    userContent: string,
    jsonSchema: Record<string, unknown>,
    schema: z.ZodType<T>,
    options: GenerateStructuredJsonOptions | undefined,
    timeoutMs: number
  ): Promise<T> {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);

    try {
      const response = await ai.models.generateContent({
        model,
        contents: userContent,
        config: {
          systemInstruction: systemPrompt,
          temperature: options?.temperature ?? 0.35,
          maxOutputTokens: options?.maxOutputTokens,
          responseMimeType: "application/json",
          responseJsonSchema: jsonSchema,
          abortSignal: controller.signal,
        },
      });

      const rawText = response.text?.trim();
      if (!rawText) {
        throw new LlmProviderError(
          `Gemini (${model}) returned an empty response.`,
          502
        );
      }

      let parsedJson: unknown;
      try {
        parsedJson = JSON.parse(rawText);
      } catch (parseErr) {
        throw new LlmProviderError(
          `Gemini (${model}) returned invalid JSON: ${
            parseErr instanceof Error ? parseErr.message : String(parseErr)
          }`,
          502
        );
      }

      const validated = schema.safeParse(parsedJson);
      if (!validated.success) {
        const issues = validated.error.issues
          .slice(0, 5)
          .map((i) => `${i.path.join(".")}: ${i.message}`)
          .join("; ");
        throw new LlmProviderError(
          `Gemini (${model}) output failed Zod validation (${issues}).`,
          502
        );
      }

      this.modelName = model;
      return validated.data;
    } catch (err) {
      if (err instanceof LlmProviderError) {
        throw err;
      }
      if (err instanceof Error && err.name === "AbortError") {
        throw new LlmProviderError(
          `Blueprint synthesis timed out after ${timeoutMs}ms.`,
          504,
          true
        );
      }
      const msg = err instanceof Error ? err.message : String(err);

      if (isRateLimitError(err, msg)) {
        throw new LlmProviderError(
          "Our synthesis engine hit a brief rate limit. Please tap Retry in a few seconds.",
          429,
          false
        );
      }

      const isTransient =
        msg.includes("503") || msg.includes("UNAVAILABLE");

      throw new LlmProviderError(
        `Gemini API error: ${msg}`,
        isTransient ? 503 : 502,
        false
      );
    } finally {
      clearTimeout(timer);
    }
  }

  async generateStructuredJson<T>(
    systemPrompt: string,
    userPayload: unknown,
    schema: z.ZodType<T>,
    options?: GenerateStructuredJsonOptions
  ): Promise<T> {
    const ai = new GoogleGenAI({ apiKey: this.apiKey });
    const jsonSchema = zodToJsonSchema(schema);
    const timeoutMs = options?.timeoutMs ?? 20000;

    const userContent =
      typeof userPayload === "string"
        ? userPayload
        : JSON.stringify(userPayload, null, 2);

    const invokeWith429Retry = async (
      model: string,
      attemptTimeout: number
    ): Promise<T> => {
      try {
        return await this.invokeModel(
          ai,
          model,
          systemPrompt,
          userContent,
          jsonSchema,
          schema,
          options,
          attemptTimeout
        );
      } catch (err) {
        if (err instanceof LlmProviderError && err.statusCode === 429) {
          console.warn(
            `[GeminiLlmProvider] HTTP 429 on ${model}; backing off ${this.rateLimitBackoffMs}ms and retrying 1x.`
          );
          await new Promise((r) => setTimeout(r, this.rateLimitBackoffMs));
          return await this.invokeModel(
            ai,
            model,
            systemPrompt,
            userContent,
            jsonSchema,
            schema,
            options,
            attemptTimeout
          );
        }
        throw err;
      }
    };

    const modelsToTry = this.fallbackModel
      ? [this.primaryModel, this.fallbackModel]
      : [this.primaryModel, this.primaryModel];

    let lastErr: unknown;
    for (let i = 0; i < modelsToTry.length; i++) {
      const model = modelsToTry[i];
      const attemptTimeout =
        i === 0 && this.fallbackModel ? Math.min(timeoutMs, 15000) : timeoutMs;
      try {
        if (model === this.primaryModel && i === 0) {
          return await invokeWith429Retry(model, attemptTimeout);
        }
        return await this.invokeModel(
          ai,
          model,
          systemPrompt,
          userContent,
          jsonSchema,
          schema,
          options,
          attemptTimeout
        );
      } catch (err) {
        lastErr = err;
        const canFallback =
          err instanceof LlmProviderError &&
          (err.statusCode === 503 || err.isTimeout);
        if (!canFallback || i === modelsToTry.length - 1) {
          throw err;
        }
        if (model === modelsToTry[i + 1]) {
          await new Promise((r) => setTimeout(r, 800));
        } else {
          console.warn(
            `[GeminiLlmProvider] ${model} unavailable (${err.message}); falling back to ${modelsToTry[i + 1]}`
          );
        }
      }
    }

    throw lastErr instanceof Error
      ? lastErr
      : new LlmProviderError("Gemini API request failed.", 502);
  }
}

export function getLlmProvider(): LlmProvider {
  return new GeminiLlmProvider();
}
