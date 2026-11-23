import { z } from "zod";

export interface GenerateStructuredJsonOptions {
  temperature?: number;
  maxOutputTokens?: number;
  timeoutMs?: number;
}

export interface LlmProvider {
  readonly providerName: string;
  readonly modelName: string;

  generateStructuredJson<T>(
    systemPrompt: string,
    userPayload: unknown,
    schema: z.ZodType<T>,
    options?: GenerateStructuredJsonOptions
  ): Promise<T>;
}
