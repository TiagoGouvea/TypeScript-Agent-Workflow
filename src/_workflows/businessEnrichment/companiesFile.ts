/**
 * Helper functions for reading and transforming company data from JSON file
 */
import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export interface RawCompanyData {
  CNPJ: string;
  MATRIZ: string;
  RAZAO_SOCIAL: string;
  FANTASIA: string;
  ABERTURA: string;
  CNAE: string;
  DESC_CNAE: string;
  ENDERECO: string;
  BAIRRO: string;
  CEP: string;
  CIDADE: string;
  REGIAO: string;
  UF: string;
  DDD: string;
  TELEFONE: string;
  CELULAR: string;
  EMAIL: string;
  CAPITAL_SOCIAL: string;
  SIMPLES: string;
  MEI: string;
  LUCRO_REAL: string;
  LUCRO_PRESUMIDO: string;
  PORTE: string;
}

export interface TransformedCompany {
  name: string;
  city: string;
  state: string;
  country: string;
  address: string;
  cnae: string;
  porte: string;
}

/**
 * Reads companies data from the JSON file
 */
export function readCompaniesFromFile(): RawCompanyData[] {
  console.log('Reading companies from companies.json file');

  try {
    // Read the companies.json file from the workflow folder
    const companiesFilePath = path.join(__dirname, 'companies.json');
    console.log('Reading file from:', companiesFilePath);

    if (!fs.existsSync(companiesFilePath)) {
      throw new Error(`Companies file not found at: ${companiesFilePath}`);
    }

    const fileContent = fs.readFileSync(companiesFilePath, 'utf-8');
    console.log('File content length:', fileContent.length);

    // Parse JSON data
    const companies = JSON.parse(fileContent);
    console.log('Found companies:', companies.length);

    return companies;
  } catch (error) {
    console.error('Error reading companies file:', error);
    throw error;
  }
}

/**
 * Transforms raw company data into the expected format for the workflow
 */
export function transformCompanyData(companies: RawCompanyData[]): TransformedCompany[] {
  return companies.map((company) => ({
    name: company.FANTASIA || company.RAZAO_SOCIAL,
    city: company.CIDADE,
    state: company.UF,
    country: 'Brazil',
    address: `${company.ENDERECO}, ${company.BAIRRO}, ${company.CEP}, ${company.CIDADE}, ${company.UF}`,
    cnae: company.DESC_CNAE,
    porte: company.PORTE,
  }));
}

/**
 * Main function that reads and transforms company data
 */
export function loadAndTransformCompanies(): TransformedCompany[] {
  const rawCompanies = readCompaniesFromFile();
  const transformedCompanies = transformCompanyData(rawCompanies);

  console.log('Transformed companies:', transformedCompanies.length);
  return transformedCompanies;
}