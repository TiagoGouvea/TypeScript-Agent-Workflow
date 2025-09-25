import { z } from 'zod';
import { tool } from '../types/workflow/Tool.ts';
import { SerperWebSearchService } from '../services/serperWebSearchService.ts';

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
    return SerperWebSearchService.search(params);
  },
});
