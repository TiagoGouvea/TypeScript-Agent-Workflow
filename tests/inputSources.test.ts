import { describe, it, expect } from 'vitest';
import { z } from 'zod';
import { Workflow } from '../src/types/workflow/Workflow';
import { createCodeStep } from '../src/types/workflow/Step';
import { InputSource } from '../src/types/workflow/Input';
import { type StructuredData } from '../src/types/workflow/StructuredData';

describe('Input Sources', () => {
  // Create a simple code step
  const firstStep = createCodeStep({
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

  it('[Step - InputSource.DataObject] Should use a object as input', async () => {
    const testWorkflow = new Workflow({ codeStep: firstStep });
    await testWorkflow.execute();
    const result = testWorkflow.getResult('rawData');
    console.log('Workflow result:', result);
    expect(result.calculation).toBe(6);
  });

  it('[Step - InputSource.LastStep] Should receive the output of the last step', async () => {
    // Create a simple code step
    const secondStep = createCodeStep({
      name: 'Should multiply the result by 2',
      inputSchema: firstStep.outputSchema, // use the first step's output schema
      inputSource: InputSource.LastStep,
      outputSchema: z.object({
        finalNumber: z.number(),
      }),
      run: async ({ stepInput }): Promise<StructuredData<any>> => {
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
    const globalInputStep = createCodeStep({
      name: 'Should multiply the result by 2',
      inputSource: InputSource.Global,
      outputSchema: z.object({
        finalNumber: z.number(),
      }),
      run: async ({ stepInput }): Promise<StructuredData<any>> => {
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
    const userInputStep = createCodeStep({
      name: 'Should multiply the result by 2',
      inputSchema: firstStep.outputSchema, // use the first step's output schema
      inputSource: InputSource.UserInput,
      outputSchema: z.object({
        finalNumber: z.number(),
      }),
      run: async ({ stepInput }): Promise<StructuredData<any>> => {
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
