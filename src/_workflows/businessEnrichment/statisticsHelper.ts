/**
 * Helper functions for generating business enrichment statistics
 */

export interface EnrichedCompany {
  name: string;
  city: string;
  state: string;
  country: string;
  address: string;
  googlePlace?: {
    title: string;
    address: string;
    rating: number;
    reviewsCount: number;
    website?: string;
    phone?: string;
  };
  websiteSearchResult?: string;
  processed: boolean;
}

export interface StatisticsResult {
  totalCompanies: number;
  foundOnGooglePlaces: number;
  notFoundOnGooglePlaces: number;
  foundWithWebsite: number;
  foundWebsiteViaSearch?: number;
  successRate: number;
  websiteRate: number;
}

/**
 * Generates statistics for Google Places search results
 */
export function generateGooglePlacesStatistics(results: any[]): StatisticsResult {
  const totalCompanies = results.length;

  const foundOnGooglePlaces = results.filter((result: any) =>
    result.enrichedData?.googlePlace !== undefined
  ).length;

  const foundWithWebsite = results.filter((result: any) =>
    result.enrichedData?.googlePlace?.website !== undefined &&
    result.enrichedData?.googlePlace?.website !== null &&
    result.enrichedData?.googlePlace?.website !== ''
  ).length;

  const notFoundOnGooglePlaces = totalCompanies - foundOnGooglePlaces;
  const successRate = totalCompanies > 0 ? Math.round((foundOnGooglePlaces / totalCompanies) * 100) : 0;
  const websiteRate = totalCompanies > 0 ? Math.round((foundWithWebsite / totalCompanies) * 100) : 0;

  return {
    totalCompanies,
    foundOnGooglePlaces,
    notFoundOnGooglePlaces,
    foundWithWebsite,
    successRate,
    websiteRate,
  };
}

/**
 * Generates statistics for website search results (after OpenAI search)
 */
export function generateWebsiteSearchStatistics(results: any[]): StatisticsResult {
  const totalCompanies = results.length;

  const foundOnGooglePlaces = results.filter((result: any) =>
    result.enrichedData?.googlePlace !== undefined
  ).length;

  const foundWithWebsiteFromPlaces = results.filter((result: any) =>
    result.enrichedData?.googlePlace?.website !== undefined &&
    result.enrichedData?.googlePlace?.website !== null &&
    result.enrichedData?.googlePlace?.website !== ''
  ).length;

  const foundWebsiteViaSearch = results.filter((result: any) =>
    result.enrichedData?.websiteSearchResult !== undefined &&
    result.enrichedData?.websiteSearchResult !== null &&
    result.enrichedData?.websiteSearchResult !== ''
  ).length;

  const foundWithWebsite = foundWithWebsiteFromPlaces + foundWebsiteViaSearch;
  const notFoundOnGooglePlaces = totalCompanies - foundOnGooglePlaces;
  const successRate = totalCompanies > 0 ? Math.round((foundOnGooglePlaces / totalCompanies) * 100) : 0;
  const websiteRate = totalCompanies > 0 ? Math.round((foundWithWebsite / totalCompanies) * 100) : 0;

  return {
    totalCompanies,
    foundOnGooglePlaces,
    notFoundOnGooglePlaces,
    foundWithWebsite,
    foundWebsiteViaSearch,
    successRate,
    websiteRate,
  };
}

/**
 * Logs Google Places statistics to console
 */
export function logGooglePlacesStatistics(stats: StatisticsResult, results: any[]): void {
  console.log('\n=== GOOGLE PLACES SEARCH STATISTICS ===');
  console.log(`📊 Total companies processed: ${stats.totalCompanies}`);
  console.log(`✅ Found on Google Places: ${stats.foundOnGooglePlaces}`);
  console.log(`❌ Not found on Google Places: ${stats.notFoundOnGooglePlaces}`);
  console.log(`🌐 With website from Places: ${stats.foundWithWebsite}`);
  console.log(`📈 Google Places success rate: ${stats.successRate}%`);
  console.log(`🔗 Website rate from Places: ${stats.websiteRate}%`);
  console.log('=======================================\n');

  // Log companies not found for analysis
  if (stats.notFoundOnGooglePlaces > 0) {
    console.log('🔍 Companies not found on Google Places:');
    results.forEach((result: any, index: number) => {
      if (result.enrichedData?.googlePlace === undefined) {
        console.log(`${index + 1}. ${result.enrichedData?.name}`);
        console.log(`   Address: ${result.enrichedData?.address}`);
      }
    });
    console.log('');
  }
}

/**
 * Logs final statistics to console (after website search)
 */
export function logFinalStatistics(stats: StatisticsResult, results: any[]): void {
  console.log('\n=== FINAL BUSINESS ENRICHMENT STATISTICS ===');
  console.log(`📊 Total companies processed: ${stats.totalCompanies}`);
  console.log(`✅ Found on Google Places: ${stats.foundOnGooglePlaces}`);
  console.log(`❌ Not found on Google Places: ${stats.notFoundOnGooglePlaces}`);
  console.log(`🌐 Total with website: ${stats.foundWithWebsite}`);
  console.log(`🔍 Found website via search: ${stats.foundWebsiteViaSearch || 0}`);
  console.log(`📈 Google Places success rate: ${stats.successRate}%`);
  console.log(`🔗 Overall website rate: ${stats.websiteRate}%`);
  console.log('============================================\n');
}