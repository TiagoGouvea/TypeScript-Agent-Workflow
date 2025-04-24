import { describe, it, expect, vi, beforeEach } from 'vitest';
import { z } from 'zod';
import { Workflow } from '../../src/types/workflow/Workflow';
import { AgentNode } from '../../src/nodes/Agent';
import { webSearch } from '../../src/_workflows/dailyNews/webSearch';

describe('Nodes - Agent With Tools', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Agent Step Execution', () => {
    it('Should execute an agent step once', async () => {
      const searchNews = new AgentNode({
        outputSchema: z.object({
          news: z.array(
            z.object({
              url: z.string(),
              title: z.string(),
              summary: z.string(),
              source: z.string(),
              keywords: z.array(z.string()),
            }),
          ),
        }),
        systemPrompt: `
        Search the most relevant news about AI from last week.
        Return 10 top news.
        Must be news from today, cannot be older.`,
        tools: [webSearch],
        allowHumanResponse: false,
      });

      // Create workflow with the agent step
      const workflow = new Workflow({ searchNews });

      // Execute the workflow
      await workflow.execute();
      const result = workflow.getResult('rawData');
      console.log('result', result);

      expect(result).toBeTruthy();
      expect(result.news).toBeTruthy();
      expect(result.news.length).toBeGreaterThan(0);
      expect(result.news[0].title).toBeTruthy();
    });
  });
});
