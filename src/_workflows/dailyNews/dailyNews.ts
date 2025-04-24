import { z } from 'zod';
import { Workflow } from '../../types/workflow/Workflow.ts';
import { InputSource } from '../../types/workflow/Input.ts';
import { AgentNode } from '../../nodes/Agent.ts';
import { openAiWebSearchTool } from './tools.ts';

// Steps
// 1 - understandSubject - Ask the subject of the news, the interval, source languages
// 2 - Research about the best news
// 3 - Write the final list

const understandSubject = new AgentNode({
  introductionText: 'I will create a daily news summary for you',
  // Step Input
  inputSource: InputSource.UserInput,
  inputSchema: z.object({
    subject: z.string().describe('What subject do you want to search about?'),
    interval: z
      .string()
      .describe(
        'How recent must be the news? Ex: today, last 2 days, a week, a month...',
      ),
    language: z
      .string()
      .describe(
        'What languages do you want to use on the search? Ex: English, Portuguese...',
      ),
  }),
  outputSchema: z.object({
    subject: z.string().describe('What subject do you want to search about?'),
    interval: z
      .string()
      .describe(
        'How recent must be the news? Ex: today, last 2 days, a week, a month...',
      ),
    language: z
      .string()
      .describe(
        'What languages do you want to use on the search? Ex: English, Portuguese...',
      ),
  }),
  systemPrompt: `You must search news about the subject, in the interval and in the source languages the user specified.`,
});

const searchNews = new AgentNode({
  introductionText: 'Searching for the news',
  inputSource: InputSource.LastStep,
  inputSchema: understandSubject.outputSchema,
  // Step Output
  outputSchema: z.object({
    news: z.array(
      z.object({
        url: z.string(),
        title: z.string(),
        summary: z.string(),
        author: z.string(),
        date: z.string(),
        source: z.string(),
        keywords: z.array(z.string()),
        sentiment: z.number(),
      }),
    ),
  }),
  systemPrompt: `You must search news about the subject, in the interval and in the source languages the user specified.`,
  tools: [openAiWebSearchTool],
});

const testWorkflow = new Workflow({ understandSubject });
await testWorkflow.execute();
console.log(testWorkflow.getResult('rawData'));
