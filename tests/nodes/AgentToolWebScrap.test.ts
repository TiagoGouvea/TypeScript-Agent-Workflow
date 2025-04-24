import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Workflow } from '../../src/types/workflow/Workflow';
import { AgentNode } from '../../src/nodes/Agent';
import { z } from 'zod';
import { webScraper } from '../../src/_workflows/dailyNews/webScrap';

describe('Nodes - Agent With Tools - Web Scrap', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Agent Execution', () => {
    it('Should execute an agent step once', async () => {
      const scrap = new AgentNode({
        outputSchema: z.object({
          projects: z.array(
            z.object({
              url: z.string(),
              title: z.string(),
              summary: z.string(),
            }),
          ),
        }),
        systemPrompt: `What are the five last projects appmasters.io developed?`,
        tools: [webScraper],
        allowHumanResponse: false,
      });

      // Create workflow with the agent step
      const workflow = new Workflow({ scrap });

      // Execute the workflow
      await workflow.execute();
      const result = workflow.getResult('rawData');
      console.log('result', result);

      expect(result).toBeTruthy();
      // expect(result.news).toBeTruthy();
      // expect(result.news.length).toBeGreaterThan(0);
      // expect(result.news[0].title).toBeTruthy();
    });
  });
});
