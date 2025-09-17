import axios from 'axios';
import chalk from 'chalk';
import { z } from 'zod';
import { tool } from '../types/workflow/Tool.ts';

export const serperWebSearch = tool({
  name: 'serperWebSearch',
  description: 'Search Google for news, web results, etc.',
  params: z.object({
    type: z
      .enum([
        'shopping',
        'news',
        'search',
        'images',
        'videos',
        'news',
        'places',
        'maps',
        'reviews',
        'scholar',
        'webpage',
      ])
      .describe('Tipo de conteúdo a ser buscado'),
    query: z
      .string()
      .describe(
        'Termo de busca a ser pesquisado no Google. Varie os termos entre buscas consecutivas para obter resultados variados',
      ),
    gl: z.enum(['br', 'us']).describe('Country'),
    hl: z.enum(['pt', 'en']).describe('Language'),
    location: z.string().describe('Country name - if open search send "-"'),
    interval: z
      .enum([
        'lastHour',
        'last24Hours',
        'lastWeek',
        'lastMonth',
        'lastYear',
        'allTime',
      ])
      .describe('Intervalo de tempo para a busca.'),
  }),
  run: async (params) => {
    const { type, query, interval, gl, hl, location } = params;
    // console.log('webSearch params', params);

    console.log(
      chalk.bgCyan(' WEB SEARCH '),
      chalk.cyan(
        `Searching on Google for: ${query} [${location}/${gl}/${hl}] (${type})`,
      ),
    );

    // Map user-friendly interval to `tbs` values
    const intervalMapping: Record<typeof interval, string> = {
      lastHour: 'qdr:h',
      last24Hours: 'qdr:d',
      lastWeek: 'qdr:w',
      lastMonth: 'qdr:m',
      lastYear: 'qdr:y',
      allTime: '',
    };

    const tbs = intervalMapping[interval];

    const data = JSON.stringify({
      q: query,
      num: 20,
      tbs: tbs !== '' ? tbs : null,
      gl,
      hl,
      location: location !== '-' ? location : null,
    });
    // console.log('search data', data);

    const config = {
      method: 'post',
      maxBodyLength: Infinity,
      url: 'https://google.serper.dev/' + type,
      headers: {
        'X-API-KEY': process.env.SERPER_API_KEY!,
        'Content-Type': 'application/json',
      },
      data,
    };

    // console.log('config', config);

    try {
      const response = await axios.request(config);
      const results = response.data[type] || response.data.organic;
      // console.log('webSearch response.data.len', results.length);
      if (!results) {
        console.log('🚨🚨🚨 No useful data?');
        console.log(response.data);
      }
      // console.log('response.data', response.data);
      return { relatedSearches: response.data.relatedSearches, results };
    } catch (error: any) {
      const code = error?.status || error?.response?.status || error?.code;
      const message =
        error?.response?.message || error?.response?.data?.message;
      console.error(
        'Error during Serper search - code:' + code + ' - message:' + message,
      );
      if (!code || !message) {
        console.error(error);
      }
      return {
        error: 'Failed to execute Serper search',
        details: message,
      };
    }
  },
});
