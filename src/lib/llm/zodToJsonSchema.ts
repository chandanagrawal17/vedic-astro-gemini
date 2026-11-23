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
    // Omit minimum/maximum bounds from Gemini's constrained-decoding JSON schema
    // to prevent FSM state explosion; Zod enforces exact numeric bounds on parse.
    return withDescription({ type: isInt ? "integer" : "number" }, description);
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
    // Omit minItems/maxItems from Gemini's responseJsonSchema to avoid
    // nested array FSM state explosion; Zod validates exact lengths on parse.
    return withDescription(
      {
        type: "array",
        items: inner,
      },
      description
    );
  }

  if (zodType instanceof z.ZodTuple) {
    const items = def.items as z.ZodTypeAny[];
    const firstItem = items[0] ? convertZodType(items[0]) : { type: "string" };
    return withDescription(
      {
        type: "array",
        items: firstItem,
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
