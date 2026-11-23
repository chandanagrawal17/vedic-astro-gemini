import { GoogleGenAI } from "@google/genai";
import { z } from "zod";
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

export class GeminiLlmProvider implements LlmProvider {
  public readonly providerName = "gemini";
  public modelName: string;
  private readonly primaryModel: string;
  private readonly fallbackModel: string | null;
  private readonly apiKey: string;

  constructor(options?: {
    apiKey?: string;
    modelName?: string;
    fallbackModel?: string | null;
  }) {
    if (typeof window !== "undefined") {
      throw new Error("GeminiLlmProvider must only run on the server.");
    }
    const key = options?.apiKey || process.env.GEMINI_API_KEY;
    if (!key) {
      throw new LlmProviderError(
        "Missing GEMINI_API_KEY environment variable.",
        500
      );
    }
    this.apiKey = key;
    this.primaryModel =
      options?.modelName || process.env.GEMINI_MODEL || "gemini-3.8-flash";
    this.modelName = this.primaryModel;

    const envFallback =
      options?.fallbackModel !== undefined
        ? options.fallbackModel
        : process.env.GEMINI_FALLBACK_MODEL || "gemini-3.1-flash-lite";
    this.fallbackModel =
      envFallback && envFallback !== this.primaryModel ? envFallback : null;
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
      const isTransient =
        msg.includes("503") ||
        msg.includes("UNAVAILABLE") ||
        msg.includes("429") ||
        msg.includes("RESOURCE_EXHAUSTED");

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

    const modelsToTry = this.fallbackModel
      ? [this.primaryModel, this.fallbackModel]
      : [this.primaryModel, this.primaryModel];

    let lastErr: unknown;
    for (let i = 0; i < modelsToTry.length; i++) {
      const model = modelsToTry[i];
      const attemptTimeout =
        i === 0 && this.fallbackModel ? Math.min(timeoutMs, 15000) : timeoutMs;
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
        lastErr = err;
        const canRetry =
          err instanceof LlmProviderError &&
          (err.statusCode === 503 || err.statusCode === 429 || err.isTimeout);
        if (!canRetry || i === modelsToTry.length - 1) {
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
