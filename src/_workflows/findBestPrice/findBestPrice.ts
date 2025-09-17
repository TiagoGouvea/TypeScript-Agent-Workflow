import { z } from 'zod';
import { Workflow } from '../../types/workflow/Workflow.ts';
import { InputSource } from '../../types/workflow/Input.ts';
import { AgentNode } from '../../nodes/Agent.ts';
import { CodeNode } from '../../nodes/Code.ts';
import { LoopNode } from '../../nodes/Loop.ts';
import { serperWebSearch } from '../../tools/serperWebSearch.ts';
import { serperWebPage } from '../../tools/serperWebPage.ts';
import { callModel } from '../../llm/callModel.ts';
import { scrapingBee } from '../../tools/scrapingBee.ts';

// Steps
// 1 - understandSubject - Ask the product name
// 2 - Research about stores

const inputObject = {
  // websiteUrl: 'https://www.goegrow.com.br',
  // productName: 'Samsung S25 Ultra',
  // productName: 'Samsung S24 Ultra',
  allowInternational: false,
  currencyToSearch: 'Real - R$',
  countryToSearch: 'Brazil',
  condition: 'Novo',
  additionalRules: 'Não retornar sites da china, trazer sempre o preço a vista',
};

const understandSubject = new AgentNode({
  introductionText: 'I will search for the best price for you',
  inputSource: InputSource.DataObjectAndUserInput,
  inputObject,
  inputSchema: z.object({
    productName: z
      .string()
      .describe('Which product do you want to search about?'),
    allowInternational: z.boolean().describe('Allow international stores?'),
    currencyToSearch: z.string(),
    countryToSearch: z.string(),
    condition: z.string().describe('New or Used?'),
    additionalRules: z.string(),
    // interval: z
    //   .string()
    //   .describe(
    //     'How recent must be the news? Ex: today, last 2 days, a week, a month...',
    //   ),
    // language: z
    //   .string()
    //   .describe(
    //     'What languages do you want to use on the search? Ex: English, Portuguese...',
    //   ),
    // reddit: z.string().describe('Should I search on Reddit too? Ex: yes, no'),
  }),
  outputSchema: z.object({
    productName: z
      .string()
      .describe('Which product do you want to search about?'),
    allowInternational: z.boolean().describe('Allow international stores?'),
    currencyToSearch: z.string(),
    countryToSearch: z.string(),
    condition: z.string().describe('New or Used?'),
    additionalRules: z.string(),
  }),
  systemPrompt: `
  You must validate the user input.
  `,
});

const searchWebSites = new AgentNode({
  introductionText: 'Searching for the product',
  inputSource: InputSource.LastStep,
  inputSchema: understandSubject.outputSchema,
  providerModel: 'gpt-4.1',
  outputSchema: z.object({
    prices: z.array(
      z.object({
        title: z.string(),
        url: z.string(),
        price: z
          .string()
          .describe('The price of the product, or "-" if not found yet'),
      }),
    ),
    bestPrice: z
      .object({
        title: z.string(),
        url: z.string(),
        price: z
          .string()
          .describe('The price of the product, or "-" if not found yet'),
      })
      .describe('The best price found'),
  }),
  debug: false,
  systemPrompt: `
  You are a price researcher and will search for the best price.

  You must search the given product in the source country the user specified.
  Search for at least 100 stores and return at least 100 links.
  Run at least four different search with different keywords.
  The next step the workflow will filter and ranking the best.
  Prefer to search with some months maximum interval, to avoid outdated prices.
  
  Intercalate between 'shopping' and 'search' types calling serperWebSearch to maximize the change of finding the product.

  ATTENTION!!! Pay attention to the exact product, avoiding variations, different versions, and typos.

  You should:
  - Return just stores links
  - Return just the prices in the currency the user specified
  - Return just the exact product match
  - Return just the condition the user specified

  You should not:
  - Return blog, fóruns, reviews, nor youtube links.
  - Return pages that are not stores
  - Return pages with other languages than the one specified.
  - if not allowInternational, you should not return international stores, nor prices in other currencies.

  Always return at least 50 links.
  `,
  tools: [serperWebSearch],
  maxIterations: 4,
});

// Loop into results scrapping for more information
// Use loopNode to execute a CodeNode for each item in an array

const scrapePricesLoop = new LoopNode({
  name: 'Scrape Prices Loop',
  childNode: new CodeNode({
    name: 'Scrape Price',
    inputSchema: z.object({
      title: z.string(),
      url: z.string(),
      price: z.string(),
    }),
    outputSchema: z.object({
      title: z.string(),
      url: z.string(),
      price: z.string(),
      scrapedPrice: z.string().optional(),
      error: z.string().optional(),
    }),
    run: async ({ stepInput }) => {
      // @ts-ignore
      if (stepInput.price !== '-') return stepInput;

      console.log(`Scraping price for: ${stepInput.title}`);

      try {
        // Use serperWebSearch with type "webpage" to extract price information
        console.log(stepInput.url);
        let scrapingResult = await serperWebPage.run({
          url: stepInput.url,
        });
        if (scrapingResult.error || !scrapingResult.length) {
          console.log('Trying second method');
          scrapingResult = await scrapingBee.run({
            url: stepInput.url,
            returnMode: 'justText',
            lookFor: '-',
          });
        }

        // console.log('scrapingResult.string.lenght', scrapingResult.length);
        // console.log('scrapingResult', scrapingResult);

        let scrapedPrice = '-';
        if (scrapingResult) {
          // Extract the price (using openAi llm)
          const priceExtractionResult = await callModel({
            systemPrompt: `You are a price extraction expert. Extract the price from the provided webpage content. Return only the price value, nothing else. If no price is found, return "NOT_FOUND".`,
            messages: [
              {
                role: 'user',
                content: `Extract the price from this webpage content for product "${stepInput.title}". Content: ${JSON.stringify(scrapingResult)}`,
              },
            ],
            responseFormat: z.object({
              price: z
                .string()
                .describe(
                  'The extracted price value or "NOT_FOUND" if no price is found, and formated in the currency specified by the user',
                ),
            }),
          });

          // console.log('Price extraction result:', priceExtractionResult.result);
          if (
            priceExtractionResult?.result?.price &&
            priceExtractionResult?.result?.price !== 'NOT_FOUND'
          ) {
            scrapedPrice = priceExtractionResult.result.price;
          }
        }

        return { ...stepInput, price: scrapedPrice };
      } catch (error) {
        console.error(`Error scraping ${stepInput.url}:`, error);
        return {
          title: stepInput.title,
          url: stepInput.url,
          price: stepInput.price,
          scrapedPrice: '-',
          error: error instanceof Error ? error.message : 'Unknown error',
        };
      }
    },
  }),
  arrayPath: 'prices',
  inputSource: InputSource.LastStep,
  inputSchema: searchWebSites.outputSchema,
  outputSchema: z.object({
    results: z.array(
      z.object({
        title: z.string(),
        url: z.string(),
        price: z.string(),
      }),
    ),
  }),
  debug: false,
});

// Final formating

const rankingProducts = new AgentNode({
  introductionText: 'Filtering and Ranking the deals',
  inputSource: InputSource.LastStep,
  inputSchema: scrapePricesLoop.outputSchema,
  providerModel: 'gpt-4.1',
  outputSchema: z.object({
    prices: z.array(
      z.object({
        title: z.string(),
        url: z.string(),
        price: z.string(),
      }),
    ),
    bestPrice: z
      .object({
        title: z.string(),
        url: z.string(),
        price: z.string(),
      })
      .describe('The best price found'),
  }),
  debug: false,
  systemPrompt: `
  You are a product filter and pricing ranker.

  You should:
  - Return just stores links
  - Return just the prices in the currency the user specified
  - Return just the exact product match (remove any variation)
  - Return just the condition the user specified (new, or used)
  - Order by price, the bests first

  You should not:
  - Return blog, fóruns, reviews, nor youtube links.
  - Return pages with other languages than the one specified.
  - if not allowInternational, you should not return international stores, nor prices in other currencies.
  `,
});

const testWorkflow = new Workflow({
  understandSubject,
  searchWebSites,
  scrapePricesLoop,
  rankingProducts,
});
await testWorkflow.execute();

console.log('-----------------------');
console.log('Here is the final result!');
const prices = testWorkflow.getResult('rawData');
console.log(prices);
// console.log(testWorkflow.getResult('structuredData'));
