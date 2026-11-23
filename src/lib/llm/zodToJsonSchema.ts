import { z } from "zod";

type JsonSchemaObject = Record<string, unknown>;

function withDescription(
  schema: JsonSchemaObject,
  description?: string
): JsonSchemaObject {
  if (description) {
    return { ...schema, description };
  }
  return schema;
}

function convertZodType(zodType: z.ZodTypeAny): JsonSchemaObject {
  const def = zodType._def as Record<string, unknown>;
  const description = zodType.description;

  if (zodType instanceof z.ZodString) {
    return withDescription({ type: "string" }, description);
  }

  if (zodType instanceof z.ZodNumber) {
    const isInt =
      Array.isArray(def.checks) &&
      def.checks.some((c: { kind?: string }) => c.kind === "int");
    const base: JsonSchemaObject = { type: isInt ? "integer" : "number" };
    if (Array.isArray(def.checks)) {
      for (const check of def.checks as Array<{
        kind?: string;
        value?: number;
      }>) {
        if (check.kind === "min" && typeof check.value === "number") {
          base.minimum = check.value;
        } else if (check.kind === "max" && typeof check.value === "number") {
          base.maximum = check.value;
        }
      }
    }
    return withDescription(base, description);
  }

  if (zodType instanceof z.ZodBoolean) {
    return withDescription({ type: "boolean" }, description);
  }

  if (zodType instanceof z.ZodLiteral) {
    const val = def.value;
    const type =
      typeof val === "number"
        ? "number"
        : typeof val === "boolean"
          ? "boolean"
          : val === null
            ? "null"
            : "string";
    return withDescription({ type, enum: [val] }, description);
  }

  if (zodType instanceof z.ZodEnum) {
    return withDescription(
      {
        type: "string",
        enum: [...(def.values as string[])],
      },
      description
    );
  }

  if (zodType instanceof z.ZodArray) {
    const inner = convertZodType(def.type as z.ZodTypeAny);
    const out: JsonSchemaObject = {
      type: "array",
      items: inner,
    };
    const minLen = def.minLength as { value?: number } | null | undefined;
    const maxLen = def.maxLength as { value?: number } | null | undefined;
    const exactLen = def.exactLength as { value?: number } | null | undefined;
    if (exactLen && typeof exactLen.value === "number") {
      out.minItems = exactLen.value;
      out.maxItems = exactLen.value;
    } else {
      if (minLen && typeof minLen.value === "number") {
        out.minItems = minLen.value;
      }
      if (maxLen && typeof maxLen.value === "number") {
        out.maxItems = maxLen.value;
      }
    }
    return withDescription(out, description);
  }

  if (zodType instanceof z.ZodTuple) {
    const items = def.items as z.ZodTypeAny[];
    const firstItem = items[0] ? convertZodType(items[0]) : { type: "string" };
    return withDescription(
      {
        type: "array",
        items: firstItem,
        minItems: items.length,
        maxItems: items.length,
      },
      description
    );
  }

  if (zodType instanceof z.ZodObject) {
    const shape = zodType.shape as Record<string, z.ZodTypeAny>;
    const properties: Record<string, JsonSchemaObject> = {};
    const required: string[] = [];

    for (const [key, fieldSchema] of Object.entries(shape)) {
      properties[key] = convertZodType(fieldSchema);
      if (!(fieldSchema instanceof z.ZodOptional)) {
        required.push(key);
      }
    }

    return withDescription(
      {
        type: "object",
        properties,
        required,
        additionalProperties: false,
      },
      description
    );
  }

  if (zodType instanceof z.ZodNullable) {
    const inner = convertZodType(def.innerType as z.ZodTypeAny);
    return withDescription(
      {
        anyOf: [inner, { type: "null" }],
      },
      description
    );
  }

  if (zodType instanceof z.ZodOptional) {
    return convertZodType(def.innerType as z.ZodTypeAny);
  }

  if (zodType instanceof z.ZodDefault) {
    return convertZodType(def.innerType as z.ZodTypeAny);
  }

  if (zodType instanceof z.ZodEffects) {
    return convertZodType(def.schema as z.ZodTypeAny);
  }

  if (zodType instanceof z.ZodUnion) {
    const options = (def.options as z.ZodTypeAny[]).map(convertZodType);
    return withDescription({ anyOf: options }, description);
  }

  return withDescription({ type: "string" }, description);
}

/**
 * Converts a Zod schema into a clean JSON Schema compatible with Gemini `responseJsonSchema`.
 */
export function zodToJsonSchema(schema: z.ZodTypeAny): JsonSchemaObject {
  return convertZodType(schema);
}
