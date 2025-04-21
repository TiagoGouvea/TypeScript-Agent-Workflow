import { z } from 'zod';
import { createAgentStep } from '../../types/workflow/Step.ts';
import { Workflow } from '../../types/workflow/Workflow.ts';
import { InputSource } from '../../types/workflow/Input.ts';

// Step 1: Discuss the subject and objectives
const createCharacter = createAgentStep({
  name: 'Create a character',
  introductionText: 'I will create a character',
  // Step Input
  inputSource: InputSource.UserInput,
  inputSchema: z.object({
    subject: z
      .string()
      .min(1, 'Title is required')
      .describe('Some details about how the character should be'),
  }),
  // Step Output
  outputSchema: z.object({
    name: z.string(),
    age: z.number(),
    gender: z.string(),
    description: z.string(),
    traits: z.array(z.string()),
    backstory: z.string(),
    goal: z.string(),
    objectives: z.array(z.string()),
  }),
  systemPrompt: `Create a character with the received subject`,
});

// Step 2: Write the final post
const writeStory = createAgentStep({
  name: 'Write a story',
  introductionText: 'I will write a story',
  inputSchema: createCharacter.outputSchema,
  inputSource: InputSource.LastStep,
  outputSchema: z.object({
    story: z.string().describe('A one-paragraph story with the character'),
  }),
  systemPrompt: `Create a story with the character`,
});

// Assemble the workflow with the defined steps
const testWorkflow = new Workflow({ createCharacter, writeStory });
await testWorkflow.execute();
// console.log(testWorkflow.getResult('rawData'));
