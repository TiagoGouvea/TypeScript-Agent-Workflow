import { describe, it, expect, vi, beforeEach } from 'vitest';
import { z } from 'zod';
import { Workflow } from '../src/types/workflow/Workflow';
import { InputSource } from '../src/types/workflow/Input';
import { createAgentStep } from '../src/types/workflow/Step';

vi.mock('../src/llm/callModel.ts', () => ({
  callModel: vi.fn().mockImplementation(async () => ({
    agentResponse: {
      result: 4,
      gotToNextStep: true,
    },
  })),
}));

describe('Agent Step', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Agent Step Execution', () => {
    it('should execute an agent step correctly', async () => {
      // Mock the executeAgentStep and formatStepResult methods to avoid the null lastResponseSchema issue

      // Create an agent step
      const agentStep = createAgentStep({
        name: 'Agent Step - multiply number by 2',
        inputSource: InputSource.DataObject,
        inputDataObject: {
          firstNumber: '2',
        },
        inputSchema: z.object({
          firstNumber: z.number(),
        }),
        outputSchema: z.object({
          result: z.number(),
        }),
        systemPrompt: 'Multiply number by two',
      });

      // Create workflow with the agent step
      const workflow = new Workflow({ agentStep });

      // Execute the workflow
      await workflow.execute();
      const result = workflow.getResult('rawData');

      console.log('result', result);
    });
  });
});
