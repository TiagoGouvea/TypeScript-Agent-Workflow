import { ZodObject, type ZodType } from 'zod';
import { logStep } from '../../utils/log.ts';

/**
 * Represents a single input field prepared for execution or user interaction
 */
export type StructuredDataField<T = any> = {
  description?: string;
  value?: T | undefined;
  zodSchema?: ZodType<T>;
};

/**
 * Represents the collection of all input fields for a step, mapping field names to their StepInputField representation.
 */
export type StructuredData<T extends Record<string, any>> = {
  [K in keyof T]: StructuredDataField<T[K]>;
};

// Free format object (any)
export type RawData = Record<string, any>;

export function mergeTwoStructuredData(
  inputDataOne: StructuredData<any>,
  inputDataTwo: StructuredData<any>,
): StructuredData<any> {
  logStep(
    'mergeTwoStepInputData inputDataOne',
    inputDataOne,
    'inputDataTwo',
    inputDataTwo,
  );
  const keys = Array.from(
    new Set([...Object.keys(inputDataOne), ...Object.keys(inputDataTwo)]),
  );
  // console.log('inputDataOne', inputDataOne);
  // console.log('inputDataTwo', inputDataTwo);
  // console.log('allKeys', keys);
  const stepInputData: StructuredData<any> = {};
  keys.forEach((key) => {
    stepInputData[key] = { ...inputDataOne[key], ...inputDataTwo[key] };
  });

  // console.log('mergeTwoStepInputData result', stepInputData);
  logStep('mergeTwoStepInputData result', stepInputData);
  return stepInputData;
}

export function inputSchemaToStructuredData(inputSchema: ZodType<any>) {
  if (!(inputSchema instanceof ZodObject))
    throw new Error('input schema deve ser do tipo ZodObject');

  const shape = inputSchema.shape as Record<string, { description?: string }>;

  const stepInput: StructuredData<any> = Object.keys(shape).reduce(
    (acc, key) => {
      acc[key] = {
        description: shape[key]?.description || key, // Use key as fallback description
        value: undefined,
      };
      return acc;
    },
    {} as StructuredData<any>,
  );
  // logStep('> stepInput before data', stepInput);
  return stepInput;
}

export function rawDataObjectToStructuredData(rawDataObject: RawData) {
  // logStep('inputDataObjectToInputData rawDataObject', rawDataObject);
  const stepInputData: StructuredData<any> = {};

  // Tratamento especial para strings - se for apenas uma string, tratá-la como um valor único
  if (typeof rawDataObject === 'string') {
    stepInputData['content'] = {
      value: rawDataObject,
    };
    return stepInputData;
  }

  // Tratamento para outros tipos
  for (const key of Object.keys(rawDataObject)) {
    logStep('key', key, rawDataObject[key]);
    stepInputData[key] = {
      value: rawDataObject[key],
    };
  }
  // logStep('inputDataObjectToInputData result', stepInputData);
  return stepInputData;
}

// StructuredDataToRawData
export function structuredDataToRawData(structuredData: StructuredData<any>) {
  const rawData: RawData = {};

  // Se for um objeto com uma única chave 'content', retornar diretamente o valor
  if (Object.keys(structuredData).length === 1 && 'content' in structuredData) {
    return structuredData.content.value;
  }

  for (const key in structuredData) {
    rawData[key] = structuredData[key].value;
  }
  return rawData;
}
