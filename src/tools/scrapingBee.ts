import chalk from 'chalk';
import { CrawlingAPI } from 'crawlbase';
import OpenAI from 'openai';
import * as cheerio from 'cheerio';
import axios from 'axios';
import { z } from 'zod';
import { tool } from '../types/workflow/Tool.ts';

if (!process.env.SCRAPINGBEE_API_KEY)
  throw new Error(
    'You must set the SCRAPINGBEE_API_KEY environment variable to use scrapingBee.',
  );

export const scrapingBee = tool({
  name: 'webScraper',
  description: 'Scrape web content from URLs with various return formats',
  params: z.object({
    url: z.string().describe('URL to scrapping from'),
    returnMode: z
      .enum(['lookFor', 'fullHtmlContent', 'justText'])
      .describe(
        '"lookFor" - will process the HTML with LLM to return just the "lookFor" information (other than the complete HTML) - recommended when you are looking for some specify information on the url.\n' +
          '"fullHtmlContent" - will return the whole HTML - recommended when you need the complete contents and links\n' +
          '"justText" - will return just the text from the HTML (without any HTML tags)',
      ),
    lookFor: z
      .string()
      .describe(
        'A small prompt with the information that the model should look for',
      ),
  }),
  run: async (params) => {
    const { url, lookFor, returnMode } = params;
    // console.log('webScraper params', params);

    console.log(
      chalk.bgCyan(' WEB SCRAPER '),
      chalk.cyan(
        `🔎 Scraping ${returnMode == 'lookFor' ? `looking for "${lookFor}"` : returnMode} from ${url}`,
      ),
    );

    try {
      const response = await axios.get('https://app.scrapingbee.com/api/v1', {
        params: {
          api_key: process.env.SCRAPINGBEE_API_KEY,
          url: params.url,
          wait: 5000,
        },
      });

      // console.dir(response.status);
      // console.dir(response.statusText);
      // console.dir(response.data);

      if (response.status === 200) {
        const content = response.data;
        // console.log('keys response', Object.keys(response));
        // console.log('keys content', Object.keys(content));

        // Se 'lookFor' estiver definido, você pode implementar lógica adicional aqui
        // para procurar por informações específicas no 'content'

        // console.log('Conteúdo da página:', content.length);

        // console.log(stripHtml(content));
        if (returnMode === 'fullHtmlContent') return stripHtml(content);
        if (returnMode === 'justText') {
          return stripAllHtmlWithMarkdownHeaders(content);
        }

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
          'Error:',
          params,
          response.status,
          // response.statusText,
          // response.data,
        );
        return {
          error: 'Failed to scrape url: ' + url,
          details: `Status Code: ${response.status} - ${response.statusText}`,
        };
      }
    } catch (error: any) {
      console.error('Error during web scraping:', error.message);
      console.error(error.message);
      console.log(Object.keys(error));
      return {
        error: 'Failed to scrape url: ' + url,
        details: error.message,
      };
    }
  },
});

function stripHtml(html: string) {
  const $ = cheerio.load(html);
  $('style, script, img, noscript, path, svg').remove();
  // Retira atributos como "class", "id", "style", etc.
  $('*').each((_, el) => {
    $(el).removeAttr('class').removeAttr('id').removeAttr('style');
  });
  // Retorna o HTML simplificado
  return $.html();
}

function stripAllHtml(html: string): string {
  const $ = cheerio.load(html);
  $('script, style, noscript, iframe, img, svg, link, meta').remove();
  let text = $.root().text();
  text = text
    .replace(/\s+/g, ' ') // Substitui múltiplos espaços por um único
    .replace(/\n\s*\n/g, '\n') // Remove linhas vazias extras
    .trim();

  return text;
}

function stripAllHtmlWithMarkdownHeaders(html: string): string {
  const $ = cheerio.load(html);

  // Remove elementos não-textuais
  $('script, style, noscript, iframe, img, svg, link, meta').remove();

  // Converte headings para Markdown
  $('h1').each((_, el) => {
    $(el).replaceWith(`# ${$(el).text()}\n\n`);
  });
  $('h2').each((_, el) => {
    $(el).replaceWith(`## ${$(el).text()}\n\n`);
  });
  $('h3').each((_, el) => {
    $(el).replaceWith(`### ${$(el).text()}\n\n`);
  });

  // Obtém o texto com formatação Markdown
  let text = $.root().text();

  // Limpa espaços em branco excessivos e formata quebras de linha
  text = text
    .replace(/\n{3,}/g, '\n\n') // Limpa múltiplas quebras de linha
    .replace(/\s+/g, ' ') // Remove espaços consecutivos
    .trim();

  return text;
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
