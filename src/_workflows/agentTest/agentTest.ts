import { z } from 'zod';
import { createAgentStep, InputSource } from '../../types/workflow/Step.ts';
import { Workflow } from '../../types/workflow/Workflow.ts';

// Create a simple code step
const simpleStep = createAgentStep({
  name: 'Should return a number',
  systemPrompt: 'Should return a number between 1 and 10',
  outputSchema: z.object({
    result: z.number(),
  }),
});

// Create a workflow with the step
const workflow = new Workflow({ simpleStep });

// Assemble the workflow with the defined steps
export const testWorkflow = new Workflow({ simpleStep });

await testWorkflow.execute();
