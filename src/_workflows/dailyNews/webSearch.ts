import axios from 'axios';
import chalk from 'chalk';
import type { NodeTool } from './webScrap.ts';

export const webSearch: NodeTool = {
  toolDeclaration: {
    type: 'function',
    name: 'webSearch',
    strict: true,
    parameters: {
      type: 'object',
      properties: {
        type: {
          type: 'string',
          description: 'Tipo de busca, por exemplo: "news", "search", etc.',
        },
        query: {
          type: 'string',
          description:
            'Termo de busca a ser pesquisado no Google.' +
            'Varie os termos entre buscas consecutivas para obter resultados variados',
        },
        gl: {
          type: 'string',
          enum: ['br', 'us'],
          description: 'Country',
        },
        location: {
          type: 'string',
          description: 'Country name',
        },
        interval: {
          type: 'string',
          enum: [
            'lastHour',
            'last24Hours',
            'lastWeek',
            'lastMonth',
            'lastYear',
            'allTime',
          ],
          description: 'Intervalo de tempo para a busca.',
        },
      },
      additionalProperties: false,
      required: ['type', 'query', 'interval', 'gl', 'location'],
    },
  },
  run: async (params) => {
    const { type, query, interval, gl, location } = params;
    // console.log('webSearch params', params);

    console.log(
      chalk.bgCyan(' WEB SEARCH '),
      chalk.cyan(`Searching on Google for: ${query} (${type})`),
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
      // location,
    });

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
      // console.log('webSearch response.data.len', response.data[type].length);
      if (!response.data[type]) {
        console.log('🚨🚨🚨');
        console.log(response);
      }
      // console.log('response.data', response.data);
      return response.data[type] || [];
    } catch (error: any) {
      console.error('Error during Serper search:', error.message);
      console.error(error);
      return {
        error: 'Failed to execute Serper search',
        details: error.message,
      };
    }
  },
};
