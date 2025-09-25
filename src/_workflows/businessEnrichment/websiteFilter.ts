/**
 * Helper functions for filtering and validating company websites
 */
import { openAIWebSearch } from '../../tools/openAiWebSearch.ts';

/**
 * Checks if URL is a root domain (not a path within a third-party site)
 */
export function isRootDomain(url: string): boolean {
  try {
    const urlObj = new URL(url);
    const pathSegments = urlObj.pathname.split('/').filter(segment => segment.length > 0);
    // Allow root domain or single path segment (like /home, /pt, etc)
    return pathSegments.length <= 1;
  } catch {
    return false;
  }
}

export interface CompanyDetails {
  name: string;
  city: string;
  state: string;
  address: string;
  cnae?: string;
  porte?: string;
}

/**
 * Validates if a website belongs to the company using OpenAI with location and business details
 */
export async function validateWebsiteWithOpenAI(url: string, company: CompanyDetails): Promise<boolean> {
  try {
    const validationResults = await openAIWebSearch.run({
      type: 'search',
      query: `site:${url} "${company.name}" "${company.city}" "${company.state}"`,
      gl: 'br',
      location: 'Brazil',
      interval: 'allTime',
      prompt: `Analyze if the website ${url} belongs EXACTLY to the company "${company.name}" located in ${company.city}/${company.state}, Brazil.

               COMPANY DATA:
               - Name: ${company.name}
               - Location: ${company.city}, ${company.state}, Brazil
               - Address: ${company.address}
               ${company.cnae ? `- Business Activity: ${company.cnae}` : ''}
               ${company.porte ? `- Company Size: ${company.porte}` : ''}

               MANDATORY CRITERIA:
               - The website must belong to the company with this EXACT NAME
               - The company must be located in ${company.city}/${company.state}, Brazil
               - Must be the official/corporate website of the company
               - CANNOT be another company with similar name in different city

               Answer ONLY "YES" if it's EXACTLY this company in this location or "NO" otherwise.`
    });

    const response = JSON.stringify(validationResults).toLowerCase();
    return response.includes('yes') && !response.includes('no');
  } catch (error) {
    console.warn(`Error validating website ${url} for ${company.name}:`, error);
    return false;
  }
}

/**
 * Extracts and filters website URLs from OpenAI search results
 * Returns the best match after applying root domain filtering and validation
 */
export async function extractAndValidateWebsite(
  searchResults: any[],
  company: CompanyDetails
): Promise<string | undefined> {
  if (!Array.isArray(searchResults) || searchResults.length === 0) {
    return undefined;
  }

  // Extract all URLs from results
  const allUrls: string[] = [];
  const urlRegex = /https?:\/\/[^\s"'<>]+/g;
  const resultText = JSON.stringify(searchResults);
  let match;

  while ((match = urlRegex.exec(resultText)) !== null) {
    allUrls.push(match[0]);
  }

  // Filter to only root domain URLs
  const rootDomainUrls = allUrls.filter(url => {
    if (url.includes('NOT_FOUND') || url.includes('NÃO ENCONTRADO') || url.includes('N\\u003O ENCONTRADO')) {
      return false;
    }
    return isRootDomain(url);
  });

  // console.log(`Found ${rootDomainUrls.length} root domain URLs for ${company.name}:`, rootDomainUrls);

  if (rootDomainUrls.length === 0) {
    return undefined;
  }

  if (rootDomainUrls.length === 1) {
    // Even with one URL, validate it to ensure it's the right company and location
    console.log(`Validating single URL for ${company.name} in ${company.city}/${company.state}...`);
    const isValid = await validateWebsiteWithOpenAI(rootDomainUrls[0], company);
    if (isValid) {
      console.log(`✅ OpenAI validated ${rootDomainUrls[0]} as official website for ${company.name}`);
      return rootDomainUrls[0];
    } else {
      console.log(`❌ OpenAI rejected ${rootDomainUrls[0]} - not the correct company/location`);
      return undefined;
    }
  }

  // Multiple root domains found, use OpenAI to validate
  console.log(`Multiple root domains found for ${company.name}, validating with OpenAI...`);

  for (const url of rootDomainUrls) {
    const isValid = await validateWebsiteWithOpenAI(url, company);
    if (isValid) {
      console.log(`✅ OpenAI validated ${url} as official website for ${company.name}`);
      return url;
    }
  }

  console.log(`❌ Could not validate any URL as official website for ${company.name} in ${company.city}/${company.state}`);
  return undefined;
}

/**
 * Main function to search for a company's official website
 * Handles the complete workflow: search with OpenAI -> filter -> validate
 */
export async function searchCompanyWebsite(company: CompanyDetails): Promise<string | undefined> {
  console.log(`🔍 Searching website for: ${company.name}`);

  try {
    const searchQuery = `"${company.name}" ${company.city} ${company.state}`;

    const webSearchResults = await openAIWebSearch.run({
      type: 'search',
      query: searchQuery,
      gl: 'br',
      location: 'Brazil',
      interval: 'allTime',
      prompt: `Find ONLY the official website owned by the company "${company.name}" located in ${company.city}, ${company.state}, Brazil.
              Return ONLY the company's own domain (example: www.company.com.br).
              DO NOT return:
              - CNPJ lookup sites (receita.fazenda.gov.br, cnpj.biz, etc.)
              - Social media pages (facebook.com, instagram.com, etc.)
              - Business directories (empresas.com.br, guiamais.com.br, etc.)
              - Marketplaces (mercadolivre, olx, etc.)
              - Companies with similar names in different cities

              If you cannot find an official website owned by this exact company in this location, return "NOT_FOUND".`
    });

    // Extract and validate website using existing helper function
    const foundWebsite = await extractAndValidateWebsite(webSearchResults, company);

    if (foundWebsite) {
      console.log(`✅ Found official website for ${company.name}: ${foundWebsite}`);
      return foundWebsite;
    } else {
      console.log(`❌ No official website found for ${company.name} (only third-party or invalid sites available)`);
      return undefined;
    }
  } catch (error) {
    console.error(`Error searching website for ${company.name}:`, error);
    return undefined;
  }
}