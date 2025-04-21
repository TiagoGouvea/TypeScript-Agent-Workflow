import { describe, it, vi, beforeEach, expect } from 'vitest';
import { z } from 'zod';
import { createAgentStep } from '../../src/types/workflow/Step';
import { InputSource } from '../../src/types/workflow/Input';
import { Workflow } from '../../src/types/workflow/Workflow';

describe('Integration Agent Test', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Sequential step execution', () => {
    it('should execute an agent step correctly', async () => {
      // Mock the executeAgentStep and formatStepResult methods to avoid the null lastResponseSchema issue

      // Create an agent step
      const agentStep = createAgentStep({
        systemPrompt: 'Add +1 to the number, until it is 3',
        inputSource: InputSource.DataObject,
        inputDataObject: {
          number: '0',
        },
        inputSchema: z.object({
          number: z.number(),
        }),
        outputSchema: z.object({
          number: z.number(),
        }),
      });

      // Create workflow with the agent step
      const workflow = new Workflow({ agentStep });

      // Execute the workflow
      await workflow.execute();
      const result = workflow.getResult('rawData');

      expect(result.number).toBe(3);
    });
  });
});
