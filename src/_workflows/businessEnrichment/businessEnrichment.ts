import { z } from 'zod';
import { Workflow } from '../../types/workflow/Workflow.ts';
import { InputSource } from '../../types/workflow/Input.ts';
import { CodeNode } from '../../nodes/Code.ts';
import { LoopNode } from '../../nodes/Loop.ts';
import { serperWebSearch } from '../../tools/serperWebSearch.ts';
import { openAIWebSearch } from '../../tools/openAiWebSearch.ts';
import { findMatchingPlace } from './addressMatcher.ts';
import { loadAndTransformCompanies } from './companiesFile.ts';
import {
  generateGooglePlacesStatistics,
  generateWebsiteSearchStatistics,
  logGooglePlacesStatistics,
  logFinalStatistics,
} from './statisticsHelper.ts';
import { searchCompanyWebsite } from './websiteFilter.ts';
import {
  CompanySchema,
  CompaniesArraySchema,
  EnrichedDataResultSchema,
  EnrichedResultsArraySchema,
  FinalResultSchema,
} from './schemas.ts';


/**
 * Workflow Objective:
 * - Read companies from companies.ts file - readCompaniesFile
 * - Process each company to find Google Place (serper place) - findGooglePlaceLoop/findGooglePlace
 * - Find it's website - findWebsiteLoop/
 * - Find it's linkedin
 */

const inputObject = {};

const readCompaniesFile = new CodeNode({
  name: 'Read Companies File',
  inputSource: InputSource.DataObjectAndUserInput,
  inputObject,
  inputSchema: z.object({}),
  outputSchema: CompaniesArraySchema,
  run: async ({ stepInput }) => {
    try {
      const companies = loadAndTransformCompanies();
      return { companies };
    } catch (error) {
      console.error('Error loading companies:', error);
      throw error;
    }
  },
});

const findGooglePlace = new CodeNode({
  name: 'Find Company\'s Google Place',
  inputSchema: CompanySchema.extend({
    name: z.string().describe('Company name'),
    city: z.string().describe('Company city'),
    state: z.string().describe('Company state'),
    country: z.string().describe('Company country'),
    address: z.string().describe('Company address'),
  }),
  outputSchema: EnrichedDataResultSchema,
  run: async ({ stepInput }) => {
    console.log('Step Input:', stepInput);
    // console.log('Processing company data:', stepInput.name);

    // Search for Google Place
    const searchQuery = `${stepInput.name} ${stepInput.city} ${stepInput.state} ${stepInput.country}`;
    console.log('Searching Google Places with query:', searchQuery);

    try {
      const placeResults = await serperWebSearch.run({
        type: 'places',
        query: searchQuery,
        gl: 'br',
        hl: 'pt',
        location: stepInput.country,
        interval: 'allTime',
      });

      // console.log('Google Places search results:');
      // console.dir(placeResults, { depth: null });

      let googlePlace = undefined;
      if (placeResults && placeResults.success && placeResults.results && placeResults.results.length > 0) {
        googlePlace = findMatchingPlace(stepInput.address, placeResults.results);
      }

      const enrichedData = {
        name: stepInput.name,
        city: stepInput.city,
        state: stepInput.state,
        country: stepInput.country,
        address: stepInput.address,
        googlePlace,
        processed: true,
      };

      // console.log('Enriched data:', enrichedData);
      return { enrichedData };
    } catch (error) {
      console.error('Error searching Google Places:', error);

      const enrichedData = {
        name: stepInput.name,
        city: stepInput.city,
        state: stepInput.state,
        country: stepInput.country,
        address: stepInput.address,
        googlePlace: undefined,
        processed: true,
      };

      return { enrichedData };
    }
  },
});

const findGooglePlaceLoop = new LoopNode({
  name: 'Enrich Companies Loop',
  childNode: findGooglePlace,
  arrayPath: 'companies',
  inputSource: InputSource.LastStep,
  inputSchema: readCompaniesFile.outputSchema,
  outputSchema: EnrichedResultsArraySchema,
});


const findWebsite = new CodeNode({
  name: 'Find Company Website',
  inputSchema: EnrichedDataResultSchema,
  outputSchema: EnrichedDataResultSchema,
  run: async ({ stepInput }) => {
    const company = stepInput.enrichedData;

    // Check if we need to search for website
    const needsWebsiteSearch =
      !company.googlePlace || // No Google Place found
      !company.googlePlace.website || // Google Place found but no website
      company.googlePlace.website === ''; // Empty website

    if (!needsWebsiteSearch) {
      // console.log(`✅ ${company.name} already has website: ${company.googlePlace?.website}`);
      return { enrichedData: { ...company, websiteSearchResult: undefined } };
    }

    try {
      // Use the main website search function from helper
      const companyDetails = {
        name: company.name,
        city: company.city,
        state: company.state,
        address: company.address,
        cnae: company.cnae,
        porte: company.porte,
      };

      const foundWebsite = await searchCompanyWebsite(companyDetails);

      const enrichedData = {
        ...company,
        websiteSearchResult: foundWebsite,
      };

      return { enrichedData };
    } catch (error) {
      console.error(`Error searching website for ${company.name}:`, error);
      return { enrichedData: { ...company, websiteSearchResult: undefined } };
    }
  },
});

const googlePlacesStatistics = new CodeNode({
  name: 'Google Places Statistics',
  inputSource: InputSource.LastStep,
  inputSchema: findGooglePlaceLoop.outputSchema,
  outputSchema: z.object({
    results: z.any(),
    statistics: z.object({
      totalCompanies: z.number(),
      foundOnGooglePlaces: z.number(),
      notFoundOnGooglePlaces: z.number(),
      foundWithWebsite: z.number(),
      successRate: z.number(),
      websiteRate: z.number(),
    }),
  }),
  run: async ({ stepInput }) => {
    const results = stepInput.results.value || stepInput.results;

    if (!Array.isArray(results)) {
      throw new Error(`Expected results to be an array, got ${typeof results}`);
    }

    const statistics = generateGooglePlacesStatistics(results);
    logGooglePlacesStatistics(statistics, results);

    return { results, statistics };
  },
});

const findWebsiteLoop = new LoopNode({
  name: 'Find Websites Loop',
  childNode: findWebsite,
  arrayPath: 'results',
  inputSource: InputSource.LastStep,
  inputSchema: googlePlacesStatistics.outputSchema,
  outputSchema: EnrichedResultsArraySchema,
});

const websiteSearchStatistics = new CodeNode({
  name: 'Website Search Statistics',
  inputSource: InputSource.LastStep,
  inputSchema: findWebsiteLoop.outputSchema,
  outputSchema: z.object({
    results: z.any(),
    statistics: z.object({
      totalCompanies: z.number(),
      foundOnGooglePlaces: z.number(),
      notFoundOnGooglePlaces: z.number(),
      foundWithWebsite: z.number(),
      foundWebsiteViaSearch: z.number().optional(),
      successRate: z.number(),
      websiteRate: z.number(),
    }),
  }),
  run: async ({ stepInput }) => {
    const results = stepInput.results.value || stepInput.results;

    if (!Array.isArray(results)) {
      throw new Error(`Expected results to be an array, got ${typeof results}`);
    }

    const statistics = generateWebsiteSearchStatistics(results);
    logFinalStatistics(statistics, results);

    return { results, statistics };
  },
});

const generateFinalSummary = new CodeNode({
  name: 'Generate Final Summary',
  inputSource: InputSource.LastStep,
  inputSchema: websiteSearchStatistics.outputSchema,
  outputSchema: FinalResultSchema,
  run: async ({ stepInput }) => {
    const { results, statistics } = stepInput;

    console.log('\n=== WORKFLOW COMPLETED SUCCESSFULLY ===');
    console.log('All statistics have been generated and logged above.');
    console.log('========================================\n');

    return { statistics, results };
  },
});

const businessEnrichmentWorkflow = new Workflow(
  {
    readCompaniesFile,
    findGooglePlaceLoop,
    googlePlacesStatistics,
    findWebsiteLoop,
    websiteSearchStatistics,
    generateFinalSummary,
  },
  {
    name: 'businessEnrichment',
  },
);
await businessEnrichmentWorkflow.execute();

// console.log('-----------------------');
// console.log('Business Enrichment Results:');
// console.log(JSON.stringify(businessEnrichmentWorkflow.getResult('rawData'), null, 2));
