import { z } from 'zod';
import { Workflow } from '../../types/workflow/Workflow.ts';
import { InputSource } from '../../types/workflow/Input.ts';
import { AgentNode } from '../../nodes/Agent.ts';
import { scrapingBee } from '../../tools/scrapingBee.ts';

// BusinessWebsiteSummary
// 1 - Must receive/ask for the website url
// @todo loop on urls getting all the information?
// 2 - Will scrape the website for the most relevant pages
// 3 - Will write a summary about the business

// const inputObject = {
//   websiteUrl: 'https://appmasters.io',
//   summaryLanguage: 'Brazilian Portuguese',
// };
const inputObject = {
  // websiteUrl: 'https://www.goegrow.com.br',
  summaryLanguage: 'Brazilian Portuguese',
};

const understandSubject = new AgentNode({
  introductionText: 'I scrape information on the website',
  inputObject,
  inputSource: InputSource.DataObjectAndUserInput,
  inputSchema: z.object({
    websiteUrl: z.string().describe('What`s the website url?'),
    summaryLanguage: z
      .string()
      .describe(
        'What language to use on the summary? Ex: English, Portuguese... ',
      ),
  }),
  outputSchema: z.object({
    websiteUrl: z.string(),
    pages: z.array(
      z.object({ url: z.string(), title: z.string(), fullContent: z.string() }),
    ),
  }),
  systemPrompt: `
  You must scrape the website and gather as much information as possible about the business.
  1 - Always start scraping the website main url (received as input) with fullHtmlContent and look for the most relevant pages.
  2 - Scrape all the relevant pages, to get all the information.
  Relevant information to look for:
  - Services
  - Products
  - Founders names, skill, history
  - Team
  - Differentiation
  - About the company (history, awards, etc)
  Avoid scrapping blogs.
  
  Do not scrape just the main page, scrape the other pages too.
  Do not create or suppose a URL, just follow the links.
  Do not browse other websites.

  Return full text information of each url, don't miss anything, the maximum information is the best.
  `,
  tools: [scrapingBee],
});

const summarizeContent = new AgentNode({
  introductionText: 'I write a business detailed report from it`s website',
  inputSource: InputSource.LastStep,
  inputSchema: understandSubject.outputSchema,
  outputSchema: z.object({
    markdown: z.string(),
  }),
  systemPrompt: `
  You must transcribe the website content into a Markdown format, keeping the maximum information as possible, like suggested:

  \`\`\`
  # Company Name
  # Company Description
  # Company History
  # Services or Products
  ## Service one
  The maximum texts about the service.
  ## Service two
  The maximum texts about the service.
  # Team and Founders
  # Differentiation
  # Address and Social Networks
  \`\`\`
  
  You must return detailed information (not just a summary), the maximum you can on each topic.
  Try to "copy/paste" the information, other than summarizing it.
  
  You can create any other topics and subtopics to fit the information.

  Just rewrite the information received, do not create or suppose information.
  `,
});

const testWorkflow = new Workflow({ understandSubject, summarizeContent });
await testWorkflow.execute();

console.log('-----------------------');
console.log('Here is the summary!');
console.log(testWorkflow.getResult('rawData').markdown);
