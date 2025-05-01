import { vi, describe, it, expect } from 'vitest';
import { z } from 'zod';
import { Workflow } from '../src/types/workflow/Workflow';
import { CodeNode, type CodeNodeRunParams } from '../src/nodes/Code';
import { InputSource } from '../src/types/workflow/Input';
import appState from '../src/AppState';

describe('User Input Sources', () => {
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

  it('[Step - InputSource.UserInput] Should ask for user input', async () => {
    // Shame of me workaround
    appState.set('CUR_TEST', 'UserInput');

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

  it('[Step - InputSource.LastStepAndUserInput] Should receive data and ask for user input', async () => {
    // Shame of me workaround
    appState.set('CUR_TEST', 'LastStepAndUserInput');

    // Create a simple code step
    const userInputStep = new CodeNode({
      name: 'Should multiply {inputDataObject.firstNumber} by Y',
      inputSource: InputSource.LastStepAndUserInput,
      inputSchema: z.object({
        calculation: z.number(),
        secondNumber: z.number(),
      }),
      outputSchema: z.object({
        finalNumber: z.number(),
      }),
      run: async (params: CodeNodeRunParams): Promise<any> => {
        const { stepInput } = params;
        // console.log('params', params);
        if (!stepInput?.calculation.value || !stepInput?.secondNumber.value)
          throw new Error('stepInput is undefined');
        // console.log('run stepInput', stepInput);
        return {
          finalNumber:
            stepInput.calculation.value * stepInput.secondNumber.value,
        } as any;
      },
    });
    const testWorkflow = new Workflow({
      firstStep,
      userInputStep,
    });
    await testWorkflow.execute();
    const result = testWorkflow.getResult('rawData');
    // console.log('Workflow result:', result);
    expect(result.finalNumber).toBe(18);
  });
});
