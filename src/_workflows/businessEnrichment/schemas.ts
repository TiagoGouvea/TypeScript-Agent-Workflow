import { z } from 'zod';

// Base schemas
export const CompanySchema = z.object({
  name: z.string(),
  city: z.string(),
  state: z.string(),
  country: z.string(),
  address: z.string(),
});

export const GooglePlaceSchema = z.object({
  title: z.string().optional(),
  address: z.string().optional(),
  rating: z.number().optional(),
  reviewsCount: z.number().optional(),
  website: z.string().optional(),
  phone: z.string().optional(),
}).optional();

export const EnrichedCompanySchema = CompanySchema.extend({
  googlePlace: GooglePlaceSchema,
  websiteSearchResult: z.string().optional(),
  processed: z.boolean(),
  cnae: z.string().optional(),
  porte: z.string().optional(),
});

// Array schemas
export const CompaniesArraySchema = z.object({
  companies: z.array(CompanySchema),
});

export const EnrichedDataResultSchema = z.object({
  enrichedData: EnrichedCompanySchema,
});

export const EnrichedResultsArraySchema = z.object({
  results: z.array(EnrichedDataResultSchema),
});

export const StatisticsSchema = z.object({
  totalCompanies: z.number(),
  foundOnGooglePlaces: z.number(),
  notFoundOnGooglePlaces: z.number(),
  foundWithWebsite: z.number(),
  foundWebsiteViaSearch: z.number(),
  successRate: z.number(),
  websiteRate: z.number(),
});

export const FinalResultSchema = z.object({
  statistics: StatisticsSchema,
  results: z.array(EnrichedDataResultSchema),
});

// Type exports
export type Company = z.infer<typeof CompanySchema>;
export type GooglePlace = z.infer<typeof GooglePlaceSchema>;
export type EnrichedCompany = z.infer<typeof EnrichedCompanySchema>;
export type Statistics = z.infer<typeof StatisticsSchema>;