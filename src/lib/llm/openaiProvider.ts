import { z } from "zod";
import { readCleanEnv } from "@/lib/env";
import { LlmProviderError } from "@/lib/llm/geminiProvider";
import {
  GenerateStructuredJsonOptions,
  LlmProvider,
} from "@/lib/llm/provider";
import { zodToJsonSchema } from "@/lib/llm/zodToJsonSchema";

export class OpenAiLlmProvider implements LlmProvider {
  public readonly providerName = "openai";
  public modelName: string;
  private readonly apiKey: string;
  private readonly baseUrl: string;
  private readonly rateLimitBackoffMs: number;

  constructor(options?: {
    apiKey?: string;
    modelName?: string;
    baseUrl?: string;
    rateLimitBackoffMs?: number;
  }) {
    if (typeof window !== "undefined") {
      throw new Error("OpenAiLlmProvider must only run on the server.");
    }
    const key = options?.apiKey || readCleanEnv("OPENAI_API_KEY");
    if (!key) {
      throw new LlmProviderError(
        "Missing OPENAI_API_KEY environment variable.",
        500
      );
    }
    this.apiKey = key;
    this.modelName =
      options?.modelName || readCleanEnv("OPENAI_MODEL") || "gpt-4.1-mini";
    this.baseUrl = (
      options?.baseUrl ||
      readCleanEnv("OPENAI_BASE_URL") ||
      "https://api.openai.com/v1"
    ).replace(/\/+$/, "");
    this.rateLimitBackoffMs = options?.rateLimitBackoffMs ?? 3000;
  }

  private async invokeModel<T>(
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
      const schemaReminder = `\n\nOUTPUT FORMAT REQUIREMENT:\nReturn a single valid JSON object matching this exact JSON Schema (preserving all keys, enum values, and array length constraints):\n${JSON.stringify(jsonSchema)}`;

      const body: Record<string, unknown> = {
        model: this.modelName,
        temperature: options?.temperature ?? 0.35,
        response_format: {
          type: "json_schema",
          json_schema: {
            name: "personal_blueprint_output",
            strict: false,
            schema: jsonSchema,
          },
        },
        messages: [
          {
            role: "system",
            content: `${systemPrompt}${schemaReminder}`,
          },
          {
            role: "user",
            content: userContent,
          },
        ],
      };

      if (options?.maxOutputTokens) {
        body.max_tokens = options.maxOutputTokens;
      }

      const res = await fetch(`${this.baseUrl}/chat/completions`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${this.apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(body),
        signal: controller.signal,
      });

      if (!res.ok) {
        const errText = await res.text().catch(() => "");
        if (res.status === 429) {
          if (
            errText.includes("insufficient_quota") ||
            errText.includes("credit_balance_exhausted")
          ) {
            console.error(
              `[OpenAiLlmProvider] ${this.modelName} quota/credits exhausted:`,
              errText.slice(0, 300)
            );
            throw new LlmProviderError(
              "OpenAI API credit balance exhausted. Please add billing credits to run OpenAI synthesis.",
              402,
              false
            );
          }
          throw new LlmProviderError(
            "Our synthesis engine hit a brief rate limit. Please tap Retry in a few seconds.",
            429,
            false
          );
        }
        if (res.status >= 500) {
          console.warn(`[OpenAiLlmProvider] ${this.modelName} HTTP ${res.status}:`, errText.slice(0, 300));
          throw new LlmProviderError(
            "Our synthesis engine is experiencing brief high demand. Please tap Retry in a few seconds.",
            res.status === 503 ? 503 : 502,
            false
          );
        }
        throw new LlmProviderError(
          `OpenAI API error (HTTP ${res.status}): ${errText.slice(0, 300)}`,
          502,
          false
        );
      }

      const payload = (await res.json()) as {
        choices?: Array<{ message?: { content?: string | null } }>;
      };
      const rawText = payload.choices?.[0]?.message?.content?.trim();
      if (!rawText) {
        throw new LlmProviderError(
          `OpenAI (${this.modelName}) returned an empty response.`,
          502
        );
      }

      let parsedJson: unknown;
      try {
        parsedJson = JSON.parse(rawText);
      } catch (parseErr) {
        throw new LlmProviderError(
          `OpenAI (${this.modelName}) returned invalid JSON: ${
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
          `OpenAI (${this.modelName}) output failed Zod validation (${issues}).`,
          502,
          false,
          true
        );
      }

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
      throw new LlmProviderError(
        `OpenAI API network error: ${err instanceof Error ? err.message : String(err)}`,
        502
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
    const jsonSchema = zodToJsonSchema(schema);
    const timeoutMs = options?.timeoutMs ?? 45000;
    const userContent =
      typeof userPayload === "string"
        ? userPayload
        : JSON.stringify(userPayload, null, 2);

    try {
      return await this.invokeModel(
        systemPrompt,
        userContent,
        jsonSchema,
        schema,
        options,
        timeoutMs
      );
    } catch (err) {
      if (err instanceof LlmProviderError && err.statusCode === 429) {
        await new Promise((r) => setTimeout(r, this.rateLimitBackoffMs));
        return await this.invokeModel(
          systemPrompt,
          userContent,
          jsonSchema,
          schema,
          options,
          timeoutMs
        );
      }
      if (err instanceof LlmProviderError && (err.statusCode === 503 || err.statusCode === 502) && !err.isZodValidation) {
        await new Promise((r) => setTimeout(r, 1500));
        return await this.invokeModel(
          systemPrompt,
          userContent,
          jsonSchema,
          schema,
          options,
          timeoutMs
        );
      }
      if (err instanceof LlmProviderError && err.isZodValidation) {
        console.warn(
          `[OpenAiLlmProvider] Schema validation failed on ${this.modelName}; retrying 1x with repair hint: ${err.message}`
        );
        const repairedUserContent = `${userContent}\n\nSCHEMA VALIDATION REPAIR INSTRUCTION (CRITICAL):\nYour previous JSON response failed strict schema validation:\n${err.message}\nRegenerate the complete valid JSON fixing every reported field count/constraint while keeping all telemetry IDs, scores, and date strings verbatim.`;
        return await this.invokeModel(
          systemPrompt,
          repairedUserContent,
          jsonSchema,
          schema,
          options,
          timeoutMs
        );
      }
      throw err;
    }
  }
}
