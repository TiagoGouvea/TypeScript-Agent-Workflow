import { z } from 'zod';
import { Workflow } from '../../types/workflow/Workflow.ts';
import { InputSource } from '../../types/workflow/Input.ts';
import { AgentNode } from '../../nodes/Agent.ts';
import { serperWebSearch } from '../../tools/serperWebSearch.ts';
import { scrapingBee } from '../../tools/scrapingBee.ts';
import { redditSearch } from '../../tools/redditSearch.ts';
import { redditRead } from '../../tools/redditRead.ts';
import { slackMessage } from '../../tools/slackMessage.ts';
import { toolWithFixedParams } from '../../types/workflow/Tool.ts';

// Steps
// 1 - understandSubject - Ask the subject of the news, the interval, source languages
// 2 - Research about the best news
// 3 - Write the final list
// 4 - Send it to Slack

const understandSubject = new AgentNode({
  introductionText: 'I will create a daily news summary for you',
  inputSource: InputSource.UserInput,
  inputSchema: z.object({
    subject: z.string().describe('What subject do you want to search about?'),
    public: z.string().describe('What the public that will read the news?'),
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
    reddit: z.string().describe('Should I search on Reddit too? Ex: yes, no'),
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
  systemPrompt: `
  You must validate the user input.
  The next step agent will search news about the subject, thinking on the public that will read it, in the interval and in the source languages the user specified.
  `,
});

const searchNews = new AgentNode({
  introductionText: 'Searching for the news',
  inputSource: InputSource.LastStep,
  inputSchema: understandSubject.outputSchema,
  outputSchema: z.object({
    news: z.array(
      z.object({
        url: z.string(),
        title: z.string(),
        summary: z.string(),
        date: z.string(),
        source: z.string(),
        keywords: z.array(z.string()),
      }),
    ),
  }),
  systemPrompt: `
  You must search news about the subject, in the interval and in the source languages the user specified.
  Search for at least 50 news and return at lest 50 news, so on the next step the workflow will filter and ranking the best.
  Run at least four different search with different keywords, so on the next step the workflow will filter and ranking the best.

  Always return at least 50 news.

  if reddit is yes, search on reddit at least three different searches.

  `,
  tools: [serperWebSearch, redditSearch],
});

const readNews = new AgentNode({
  introductionText: 'Reading the most relevant news',
  inputSource: InputSource.LastStep,
  inputSchema: searchNews.outputSchema,
  outputSchema: z.object({
    news: z.array(
      z.object({
        url: z.string(),
        title: z.string(),
        summary: z.string(),
        date: z.string(),
        source: z.string(),
        keywords: z.array(z.string()),
      }),
    ),
  }),
  systemPrompt: `
  Use scrapping tool to read the most relevant news, add more information on that, and return these first on the final list.

  Always return at least 40 news.

  if reddit is yes, read the most relevant news from reddit.
  `,
  tools: [scrapingBee, redditRead],
});

const writeNews = new AgentNode({
  introductionText: 'I will write the final daily news',
  inputSource: InputSource.LastStep,
  inputSchema: searchNews.outputSchema,
  outputSchema: z.object({
    markdown: z.string(),
  }),
  systemPrompt: `
  You must write a newsletter about the previous subject, ranking the most relevant news first.
  
  Always return at least 20 news.

  If reddit is yes, return the most relevant discussions on the context, with a summary.

  Return the markdown following this template.
  
  # [News Title]
  [link]
  [Source] - [date] 
  [Summary]
  
  # News Title
  [link]
  [Source] - [date] 
  [Summary]

  # Reddit Post Title
  [link]
  [Author] [date] 
  [Summary]
  `,
});

// Create a slackMessage tool with fixed webhookUrl
const slackMessageWithFixedWebhook = toolWithFixedParams(slackMessage, {
  webhookUrl: process.env.SLACK_WEBHOOK_URL,
});

const sendSlackMessage = new AgentNode({
  introductionText: 'I will send the final daily news to Slack',
  inputSource: InputSource.LastStep,
  inputSchema: z.object({
    markdown: z.string(),
  }),
  outputSchema: z.object({
    markdown: z.string(),
  }),
  systemPrompt: `
  You must send the final daily news to Slack. 
  Adjust the markdown format to the slack format, example: [title](link).
  `,
  tools: [slackMessageWithFixedWebhook],
});

const testWorkflow = new Workflow({
  understandSubject,
  searchNews,
  readNews,
  writeNews,
  sendSlackMessage,
});
await testWorkflow.execute();

console.log('-----------------------');
console.log('Here is the daily news!');
console.log(testWorkflow.getResult('rawData').markdown);
