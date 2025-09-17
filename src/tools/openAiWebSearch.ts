import OpenAI from 'openai';
import chalk from 'chalk';
import { z } from 'zod';
import { tool } from '../types/workflow/Tool.ts';
import readline from 'node:readline/promises';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY!,
});

export const openAIWebSearch = tool({
  name: 'openAIWebSearch',
  description: 'Search the web for news, articles, and other web results.',
  params: z.object({
    type: z.string().describe('Type of search, e.g. "news", "search", etc.'),
    query: z.string().describe('The search term to query the web for.'),
    gl: z.enum(['br', 'us']).describe('Country code for search localization.'),
    location: z.string().describe('Country name for search localization.'),
    interval: z
      .enum([
        'lastHour',
        'last24Hours',
        'lastWeek',
        'lastMonth',
        'lastYear',
        'allTime',
      ])
      .describe('Time interval for the search.'),
  }),
  run: async ({ type, query, gl, location, interval }) => {
    console.log(
      chalk.bgCyan(' WEB SEARCH '),
      chalk.cyan(`Searching via OpenAI for: ${query} (${type})`),
    );

    // Map your interval to a descriptive suffix
    const intervalSuffixes: Record<typeof interval, string> = {
      lastHour: 'in the last hour',
      last24Hours: 'in the last 24 hours',
      lastWeek: 'in the last week',
      lastMonth: 'in the last month',
      lastYear: 'in the last year',
      allTime: '',
    };
    const timeContext = intervalSuffixes[interval];
    const fullPrompt = `${query}${timeContext ? ` ${timeContext}` : ''} - at least 10 results`;

    console.log('fullPrompt', fullPrompt);

    // // Call the OpenAI Function‐Calling API with the built-in web_search tool
    // const response = await openai.responses.create({
    //   model: 'gpt-4o-mini',
    //   tools: [{ type: 'web_search_preview' }],
    //   input: fullPrompt,
    // });
    // console.dir(response, { depth: null });

    // const response = await openai.chat.completions.create({
    //   model: 'gpt-4o-mini',
    //   messages: [{ role: 'user', content: fullPrompt }],
    // response_format: {
    //   type: 'json_schema',
    //   json_schema: {
    //     name: 'web_search_preview',
    //     schema: {
    //       type: 'object', // root must be object
    //       properties: {
    //         results: {
    //           // array wrapped here
    //           type: 'array',
    //           items: {
    //             type: 'object',
    //             properties: {
    //               title: { type: 'string' },
    //               url: { type: 'string' },
    //               description: { type: 'string' },
    //             },
    //             required: ['title', 'url'],
    //           },
    //         },
    //       },
    //       required: ['results'],
    //       additionalProperties: false,
    //     },
    //   },
    // },
    // tools: [{ type: 'web_search_preview' }],
    // tools: [
    //   {
    //     type: 'function',
    //     function: {
    //       name: 'web_search_preview',
    //       description: 'Search the web for up-to-date information',
    //     },
    //   },
    // ],
    // tool_choice: {
    //   // Força o uso da ferramenta
    //   type: 'function',
    //   function: { name: 'web_search_preview' },
    // },
    // tools: {
    //   web_search_preview: openai.tools.webSearchPreview(),
    // },
    // });

    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-search-preview',
      temperature: 0.3,
      web_search_options: {
        // search_context_size: 'high',
      },
      response_format: {
        type: 'json_schema',
        json_schema: {
          name: 'web_search_preview',
          schema: {
            type: 'object', // root must be object
            properties: {
              results: {
                // array wrapped here
                type: 'array',
                items: {
                  type: 'object',
                  properties: {
                    title: { type: 'string' },
                    url: { type: 'string' },
                    description: { type: 'string' },
                  },
                  required: ['title', 'url'],
                },
              },
            },
            required: ['results'],
            additionalProperties: false,
          },
        },
      },
      messages: [
        {
          role: 'user',
          content: fullPrompt,
        },
      ],
    });
    // console.dir(completion, { depth: null });

    const results = JSON.parse(completion.choices[0].message.content);
    console.dir(results.results, { depth: null });

    // console.log('response.output_text', response.output_text);

    // The model will return the search summary directly in message.content
    // const result = response.output_text;
    return results.results;
  },
});
