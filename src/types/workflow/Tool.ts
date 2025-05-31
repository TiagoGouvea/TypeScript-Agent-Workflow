import type { Tool } from 'openai/resources/responses/responses';
import { z } from 'zod';

export type NodeTool = {
  toolDeclaration: Tool;
  run: any;
};

export type ToolConfig<T extends z.ZodSchema> = {
  name: string;
  description?: string;
  params: T;
  run: (params: z.infer<T>) => Promise<any>;
};

function zodToJsonSchema(schema: z.ZodSchema): any {
  const shape = (schema as any)._def.shape();
  const properties: any = {};
  const required: string[] = [];

  for (const [key, fieldSchema] of Object.entries(shape)) {
    let field = fieldSchema as z.ZodSchema;
    let fieldDef = (field as any)._def;
    let isOptional = false;

    // Handle ZodOptional wrapper
    if (fieldDef.typeName === 'ZodOptional') {
      isOptional = true;
      field = fieldDef.innerType;
      fieldDef = (field as any)._def;
    }

    // Handle ZodDefault wrapper
    if (fieldDef.typeName === 'ZodDefault') {
      field = fieldDef.innerType;
      fieldDef = (field as any)._def;
    }

    if (fieldDef.typeName === 'ZodString') {
      properties[key] = { type: 'string' };
      if (fieldDef.description) {
        properties[key].description = fieldDef.description;
      }
      if (fieldDef.checks) {
        const enumCheck = fieldDef.checks.find(
          (c: any) => c.kind === 'includes',
        );
        if (enumCheck) {
          properties[key].enum = enumCheck.value;
        }
      }
    } else if (fieldDef.typeName === 'ZodEnum') {
      properties[key] = {
        type: 'string',
        enum: fieldDef.values,
      };
      if (fieldDef.description) {
        properties[key].description = fieldDef.description;
      }
    } else if (fieldDef.typeName === 'ZodNumber') {
      properties[key] = { type: 'number' };
      if (fieldDef.description) {
        properties[key].description = fieldDef.description;
      }
      if (fieldDef.checks) {
        const minCheck = fieldDef.checks.find((c: any) => c.kind === 'min');
        const maxCheck = fieldDef.checks.find((c: any) => c.kind === 'max');
        if (minCheck) properties[key].minimum = minCheck.value;
        if (maxCheck) properties[key].maximum = maxCheck.value;
      }
    }

    // Only add to required if not optional and not having a default value
    if (!isOptional && fieldDef.typeName !== 'ZodDefault') {
      required.push(key);
    }
  }

  return {
    type: 'object',
    properties,
    required,
    additionalProperties: false,
  };
}

export function tool<T extends z.ZodSchema>(config: ToolConfig<T>): NodeTool {
  return {
    toolDeclaration: {
      type: 'function',
      name: config.name,
      description: config.description,
      strict: true,
      parameters: zodToJsonSchema(config.params),
    },
    run: config.run,
  };
}
