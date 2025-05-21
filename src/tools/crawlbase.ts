import chalk from 'chalk';
import { CrawlingAPI } from 'crawlbase';
import OpenAI from 'openai';
import * as cheerio from 'cheerio';
import type { NodeTool } from '../types/workflow/Tool';

if (!process.env.CRAWLBASE_API_KEY)
  throw new Error(
    'You must set the CRAWLBASE_API_KEY environment variable to use webScraper.',
  );

export const crawlbase: NodeTool = {
  toolDeclaration: {
    type: 'function',
    name: 'webScraper',
    strict: true,
    parameters: {
      type: 'object',
      properties: {
        url: {
          type: 'string',
          description: 'URL to scrapping from',
        },
        returnMode: {
          type: 'string',
          enum: ['lookFor', 'fullHtmlContent'],
          description: `
           "lookFor" - will process the HTML with LLM to return just the "lookFor" information (other than the complete HTML) - recommended when you are looking for some specify information on the url.
           "fullHtmlContent" - will return the whole HTML - recommended when you need the complete contents
          `,
          default: 'lookFor',
        },
        lookFor: {
          type: 'string',
          description:
            'A small prompt with the information that the model should look for',
        },
      },
      additionalProperties: false,
      required: ['url', 'lookFor', 'returnMode'],
    },
  },
  run: async (params) => {
    const { url, lookFor, mode } = params;
    // console.log('webScraper params', params);

    console.log(
      chalk.bgCyan(' WEB SCRAPER '),
      chalk.cyan(`🔎 Scraping looking for "${lookFor}" at ${url}`),
    );

    try {
      const api = new CrawlingAPI({
        token: process.env.CRAWLBASE_API_KEY!,
        timeout: 10000,
      });
      // Return raw scraped content
      // Faz uma requisição GET para a URL fornecida
      const response = await api.get(url, { autoparse: true });

      if (response.statusCode === 200) {
        const content = response.body;
        // console.log('keys response', Object.keys(response));
        // console.log('keys content', Object.keys(content));

        // Se 'lookFor' estiver definido, você pode implementar lógica adicional aqui
        // para procurar por informações específicas no 'content'

        // console.log('Conteúdo da página:', content.length);

        if (mode === 'fullHtmlContent') return content;

        return content;

        console.log(chalk.cyan(`🌐 Extracting information`));

        console.log('--------------------------------------');
        console.log('content', content);
        const stripedContent = stripHtml(content);
        console.log('stripedContent', stripedContent);
        console.log('--------------------------------------');
        const simplifiedContent = await simplifyContent(
          stripedContent,
          lookFor,
        );
        console.log('simplifiedContent', simplifiedContent);

        return simplifiedContent;
      } else {
        console.error(
          'Erro ao acessar a página:',
          response.statusCode,
          response.originalStatus,
          response.pcStatus,
        );
        return {
          error: 'Falha ao acessar a página',
          details: `Status Code: ${response.statusCode}`,
        };
      }
    } catch (error: any) {
      console.error('Error during web scraping:', error);
      console.error(error);
      return {
        error: 'Failed to execute web scraping or embeddings processing',
        details: error.message,
      };
    }
  },
};

function stripHtml(html: string) {
  const $ = cheerio.load(html);
  $('style, script, img, link, meta, noscript').remove();
  // Retira atributos como "class", "id", "style", etc.
  $('*').each((_, el) => {
    $(el).removeAttr('class').removeAttr('id').removeAttr('style');
  });
  // Retorna o HTML simplificado
  return $.html();
}

export async function simplifyContent(
  htmlBody: string,
  lookFor: string,
): Promise<string> {
  const prompt = `
    Você é um assistente especializado em processar HTML. 
    Eu fornecerei um conteúdo HTML, e sua tarefa é procurar dentro desse HTML e retornar o conteúdo que estamos procurando.
    
    Remova:
    - Todo o CSS
    - Tags HTML
    - Menus de navegação ou rodapés
    - Publicidade ou elementos irrelevantes
    
    Busque por:
    ${lookFor}
    
    Retorne:
    - Não retorne nenhuma informação que não esteja explicitamente no HTML fornecido
    - O texto no HTML que está diretamente relacionado ao que foi solicitado
    - Links relevantes para se obter mais informações em uma próxima interação
    
    
    # Aqui está o HTML:
    ${htmlBody}`;

  const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
  });

  try {
    const response = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [{ role: 'user', content: prompt }],
    });

    // console.log('prompt', prompt);
    console.log('response', response.choices);

    if (response.choices?.[0]?.message?.content) {
      return response.choices[0].message.content.trim();
    } else {
      throw new Error('No response content from OpenAI.');
    }
  } catch (error: any) {
    console.error('Error while simplifying HTML content:', error.message);
    return `Error: ${error.message}`;
  }
}
