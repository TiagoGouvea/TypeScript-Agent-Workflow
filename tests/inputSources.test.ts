import { describe, it, expect } from 'vitest';
import { z } from 'zod';
import { Workflow } from '../src/types/workflow/Workflow';
import { InputSource } from '../src/types/workflow/Input';
import { type StructuredData } from '../src/types/workflow/StructuredData';
import { CodeNode, type CodeNodeRunParams } from '../src/nodes/Code';

describe('Input Sources', () => {
  // Create a simple code step
  const firstStep = new CodeNode({
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
    run: async (params: CodeNodeRunParams): Promise<any> => {
      const { stepInput } = params;
      if (!stepInput?.firstNumber.value || !stepInput?.secondNumber.value)
        throw new Error('stepInput is undefined');
      const aa = stepInput.firstNumber.value * stepInput.secondNumber.value;
      return {
        calculation: aa,
      } as any;
    },
  });

  it('[Step - InputSource.DataObject] Should use a object as input', async () => {
    const testWorkflow = new Workflow({ firstStep });
    await testWorkflow.execute();
    const result = testWorkflow.getResult('rawData');
    // console.log('Workflow result:', result);
    expect(result.calculation).toBe(6);
  });

  it('[Step - InputSource.LastStep] Should receive the output of the last step', async () => {
    // Create a simple code step
    const secondStep = new CodeNode({
      name: 'Should multiply the result by 2',
      inputSchema: z.object({
        calculation: z.number(),
      }), // use the first step's output schema
      inputSource: InputSource.LastStep,
      outputSchema: z.object({
        finalNumber: z.number(),
      }),
      run: async (params: CodeNodeRunParams): Promise<any> => {
        const { stepInput } = params;
        if (!stepInput?.calculation.value)
          throw new Error('stepInput is undefined');
        // console.log('secondStep input', stepInput);
        return { finalNumber: stepInput.calculation.value * 2 } as any;
      },
    });
    const testWorkflow = new Workflow({ firstStep, secondStep });
    await testWorkflow.execute();
    const result = testWorkflow.getResult('rawData');
    // console.log('Workflow result:', result);
    expect(result.finalNumber).toBe(12);
  });

  it('[Step - InputSource.Global] Should receive the global state as input', async () => {
    // Create a simple code step
    const globalInputStep = new CodeNode({
      name: 'Should multiply the result by 2',
      inputSource: InputSource.Global,
      outputSchema: z.object({
        finalNumber: z.number(),
      }),
      run: async (params: CodeNodeRunParams): Promise<any> => {
        const { stepInput } = params;
        if (!stepInput?.firstStep?.output?.calculation?.value)
          throw new Error('stepInput is undefined');
        // console.log('globalInputStep input', stepInput);
        return {
          finalNumber: stepInput.firstStep.output?.calculation.value * 2,
        } as any;
      },
    });
    const testWorkflow = new Workflow({
      firstStep,
      globalInputStep,
    });
    await testWorkflow.execute();
    const result = testWorkflow.getResult('rawData');
    // console.log('Workflow result:', result);
    expect(result.finalNumber).toBe(12);
  });

  it('[Step - InputSource.UserInput] Should ask for user input', async () => {
    // Create a simple code step
    const userInputStep = new CodeNode({
      name: 'Should multiply the result by 2',
      inputSchema: z.object({
        calculation: z.number(),
      }),
      inputSource: InputSource.UserInput,
      outputSchema: z.object({
        finalNumber: z.number(),
      }),
      run: async (params: CodeNodeRunParams): Promise<any> => {
        const { stepInput } = params;
        if (!stepInput?.firstNumber.value || !stepInput?.secondNumber.value)
          throw new Error('stepInput is undefined');
        // console.log('run stepInput', stepInput);
        return {
          finalNumber:
            stepInput.firstNumber.value * stepInput.secondNumber.value,
        } as any;
      },
    });
    const testWorkflow = new Workflow({
      userInputStep,
    });
    await testWorkflow.execute();
    const result = testWorkflow.getResult('rawData');
    // console.log('Workflow result:', result);
    expect(result.finalNumber).toBe(6);
  });
});
