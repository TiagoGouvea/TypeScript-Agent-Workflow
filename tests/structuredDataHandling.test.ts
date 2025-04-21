import { describe, it, expect } from 'vitest';
// Ajuste o caminho se necessário
import { z } from 'zod';
import {
  rawDataObjectToStr,
  inputSchemaToStructuredData,
  mergeTwoStructuredData,
  type RawData,
} from '../src/types/workflow/StructuredData';

describe('StructuredDataHandling', () => {
  // Testes para mergeTwoStepInputData
  describe('mergeTwoStepInputData', () => {
    it('should merge two StepInputData objects (basic case, needs implementation check)', () => {
      const inputDataOne: RawData = {
        name: { description: 'Name from one', value: 'Bob' },
      };
      const inputDataTwo: RawData = {
        email: { description: 'Email from two', value: 'bob@example.com' },
      };
      const result = mergeTwoStructuredData(inputDataOne, inputDataTwo);
      console.log('result', result);
      expect(result).toEqual({
        name: { description: 'Name from one', value: 'Bob' },
        email: { description: 'Email from two', value: 'bob@example.com' },
      });
    });

    it('should handle overlapping keys (needs specific logic defined in function)', () => {
      const inputDataOne: RawData = {
        id: { description: 'ID one', value: 1 },
        status: { description: 'Status one', value: 'pending' },
      };
      const inputDataTwo: RawData = {
        status: { description: 'Status two', value: 'completed' },
        date: { description: 'Date two', value: new Date('2025-01-01') },
      };

      const result = mergeTwoStructuredData(inputDataOne, inputDataTwo);

      expect(result).toEqual({
        id: { description: 'ID one', value: 1 },
        status: { description: 'Status two', value: 'completed' },
        date: { description: 'Date two', value: new Date('2025-01-01') },
      });
    });

    it('should handle one or both inputs being empty (needs implementation check)', () => {
      const inputDataOne: RawData = {};
      const inputDataTwo: RawData = {
        message: { description: 'A message', value: 'Hello' },
      };

      const result1 = mergeTwoStructuredData(inputDataOne, inputDataTwo);
      const result2 = mergeTwoStructuredData(inputDataTwo, inputDataOne); // Order might matter
      const result3 = mergeTwoStructuredData(inputDataOne, inputDataOne); // Both empty

      expect(result1).toEqual({
        message: { description: 'A message', value: 'Hello' },
      });
      expect(result2).toEqual({
        message: { description: 'A message', value: 'Hello' },
      });
      expect(result3).toEqual({});
    });
  });

  describe('inputDataObjectToInputData', () => {
    it('should convert a simple data object to StepInputData format', () => {
      const inputDataObject = { name: 'James', age: 33 };
      const expected: RawData = {
        name: { value: 'James' },
        age: { value: 33 },
      };
      expect(rawDataObjectToStr(inputDataObject)).toEqual(expected);
    });

    it('should handle different data types correctly', () => {
      const inputDataObject = {
        isActive: true,
        count: 0,
        details: { id: 'a', status: 'ok' },
        items: ['x', 'y'],
      };
      const expected: RawData = {
        isActive: { value: true },
        count: { value: 0 },
        details: { value: { id: 'a', status: 'ok' } },
        items: { value: ['x', 'y'] },
      };
      expect(rawDataObjectToStr(inputDataObject)).toEqual(expected);
    });

    it('should handle null and undefined values', () => {
      const inputDataObject = { user: null, task: undefined, id: '123' };
      const expected: RawData = {
        user: { value: null },
        task: { value: undefined },
        id: { value: '123' },
      };
      expect(rawDataObjectToStr(inputDataObject)).toEqual(expected);
    });

    it('should return an empty object if the input data object is empty', () => {
      const inputDataObject = {};
      const expected: RawData = {};
      expect(rawDataObjectToStr(inputDataObject)).toEqual(expected);
    });
  });

  describe('inputSchemaToStructuredData', () => {
    it('should convert a zod schema to structured data with descriptions and undefined values', () => {
      const schema = z.object({
        name: z.string().describe('Nome do usuário'),
        age: z.number().describe('Idade do usuário'),
      });
      const result = inputSchemaToStructuredData(schema);
      expect(result).toEqual({
        name: { description: 'Nome do usuário', value: undefined },
        age: { description: 'Idade do usuário', value: undefined },
      });
    });

    it('should fallback to key as description if none is provided', () => {
      const schema = z.object({
        city: z.string(),
      });
      const result = inputSchemaToStructuredData(schema);
      expect(result).toEqual({
        city: { description: 'city', value: undefined },
      });
    });
  });
});
