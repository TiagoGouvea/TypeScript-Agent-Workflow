import { z } from 'zod';
import { createCodeStep, InputSource } from '../../types/workflow/Step.ts';
import { Workflow } from '../../types/workflow/Workflow.ts';

// Create a simple code step
const simpleStep = createCodeStep({
  name: 'Should multiply two numbers',
  outputSchema: z.object({
    result: z.number(),
  }),
  inputSource: InputSource.UserInput,
  inputSchema: z.object({
    firstNumber: z.number().describe('Enter the first number:'),
    secondNumber: z.number().describe('Enter the second number:'),
  }),
  run: (input): Promise<number> => {
    console.log('input', input);
    return input.firstNumber.value * input.secondNumber.value;
  },
});

const testWorkflow = new Workflow({ simpleStep });

await testWorkflow.execute();

console.log('Workflow result:', testWorkflow.getResult());
