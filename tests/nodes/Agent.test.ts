import { describe, it, expect, vi, beforeEach } from 'vitest';
import { z } from 'zod';
import { Workflow } from '../../src/types/workflow/Workflow';
import { InputSource } from '../../src/types/workflow/Input';
import { createAgentStep } from '../../src/types/workflow/Step';
import { AgentNode } from '../../src/nodes/Agent';

// vi.mock('../src/llm/callModel.ts', () => ({
//   callModel: vi.fn().mockImplementation(async () => ({
//     agentResponse: {
//       result: 4,
//       gotToNextStep: true,
//     },
//   })),
// }));

describe('Nodes - Agent', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Agent Step Execution', () => {
    it('Should execute an agent step once', async () => {
      // Mock the executeAgentStep and formatStepResult methods to avoid the null lastResponseSchema issue

      // Create an agent step
      const agentStep = new AgentNode({
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
      // console.log('result', result);
      expect(result.result).toBe(4);
    });

    it('Should execute agent steps some times', async () => {
      // Mock the executeAgentStep and formatStepResult methods to avoid the null lastResponseSchema issue

      // Create an agent step
      const agentStep = new AgentNode({
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
      // console.log('result', result);
      expect(result.number).toBe(3);
    });
  });
});
