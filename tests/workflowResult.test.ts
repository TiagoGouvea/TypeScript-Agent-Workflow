import { describe, it, expect, vi, beforeEach } from 'vitest';
import { z } from 'zod';
import { Workflow } from '../src/types/workflow/Workflow';
import { type StructuredData } from '../src/types/workflow/StructuredData';
import { InputSource } from '../src/types/workflow/Input';
import { CodeNode } from '../src/nodes/Code';

describe('Workflow Result Values', () => {
  // Create a simple code step
  const codeStep = new CodeNode({
    name: 'Should multiply two numbers',
    inputSource: InputSource.DataObject,
    inputSchema: z.object({
      firstNumber: z.number().describe('Enter the first number:'),
      secondNumber: z.number().describe('Enter the second number:'),
    }),
    inputDataObject: {
      firstNumber: 2,
      secondNumber: 3,
    },
    outputSchema: z.object({
      calculation: z.number(),
    }),
    run: async ({ stepInput }): Promise<StructuredData<any>> => {
      if (!stepInput?.firstNumber.value || !stepInput?.secondNumber.value)
        throw new Error('stepInput is undefined');
      console.log('codeStep input', stepInput);
      const aa = stepInput.firstNumber.value * stepInput.secondNumber.value;
      console.log('aa,', aa);
      return {
        calculation: aa,
      } as any;
    },
  });

  describe('Workflow getResult', () => {
    it('Should return structuredData data', async () => {
      const testWorkflow = new Workflow({ codeStep });
      await testWorkflow.execute();
      const result = testWorkflow.getResult('structuredData');
      console.log('Workflow result:', result);
      expect(result.calculation.value).toBe(6);
    });

    it('Should return rawData from lastStep', async () => {
      const testWorkflow = new Workflow({ codeStep });
      await testWorkflow.execute();
      const result = testWorkflow.getResult('rawData');
      console.log('Workflow result:', result);
      expect(result.calculation).toBe(6);
    });
  });

  describe('Workflow getGlobal', () => {
    it('Should return structuredData from global', async () => {
      const testWorkflow = new Workflow({ codeStep });
      await testWorkflow.execute();
      const result = testWorkflow.getGlobal('structuredData');
      console.log('Workflow result:', result);
      expect(result.codeStep.output.calculation.value).toBe(6);
    });

    it('Should return rawData from global', async () => {
      const testWorkflow = new Workflow({ codeStep });
      await testWorkflow.execute();
      const result = testWorkflow.getGlobal('rawData');
      console.log('Workflow result:', result);
      expect(result.codeStep.calculation).toBe(6);
    });
  });
});
