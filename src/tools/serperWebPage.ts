import axios from 'axios';
import chalk from 'chalk';
import { z } from 'zod';
import { tool } from '../types/workflow/Tool.ts';

export const serperWebPage = tool({
  name: 'serperWebPage',
  description: 'Extract content from a specific webpage URL using Serper.',
  params: z.object({
    url: z
      .string()
      .url()
      .describe('The URL of the webpage to extract content from'),
  }),
  run: async (params) => {
    const { url } = params;

    console.log(
      chalk.bgCyan(' WEB PAGE '),
      chalk.cyan(`Extracting content from: ${url}`),
    );

    const data = JSON.stringify({
      url,
    });

    const config = {
      method: 'post',
      maxBodyLength: Infinity,
      url: 'https://google.serper.dev/webpage',
      headers: {
        'X-API-KEY': process.env.SERPER_API_KEY!,
        'Content-Type': 'application/json',
      },
      data,
    };

    try {
      const response = await axios.request(config);

      if (!response.data) {
        console.log('🚨🚨🚨 No data returned from webpage');
        return { error: 'No content extracted from webpage' };
      }

      return response.data;
    } catch (error: any) {
      const code =
        error?.status ||
        error?.response?.status ||
        error?.code ||
        error?.status;
      const message =
        error?.response?.message ||
        error?.response?.data?.message ||
        error?.data;
      console.error(
        'Error during Serper webpage extraction - code:' +
          code +
          ' - message:' +
          message,
      );
      if (!code || !message) {
        console.log('keys', Object.keys(error));
        console.error(error);
      }
      return {
        error: 'Failed to extract webpage content',
        details: message,
      };
    }
  },
});
