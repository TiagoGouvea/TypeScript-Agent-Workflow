/**
 * Helper functions for matching company addresses with Google Places results
 */
import type { GooglePlace } from './schemas.ts';

export interface GooglePlaceResult {
  title: string;
  address: string;
  rating: number;
  ratingCount: number;
  website: string;
  phoneNumber: string;
}

/**
 * Extracts street name from address string
 */
function extractStreet(address: string): string {
  const streetMatch = address.toLowerCase().match(/^([^,]+)/);
  return streetMatch ? streetMatch[1].trim() : '';
}

/**
 * Checks if two street names are similar
 */
function areStreetsSimilar(companyStreet: string, placeStreet: string): boolean {
  if (!companyStreet || !placeStreet) return false;

  const companyWords = companyStreet.split(' ').filter(word => word.length > 2);
  const placeWords = placeStreet.split(' ').filter(word => word.length > 2);

  // Check if any significant word from company street is in place street
  for (const companyWord of companyWords) {
    for (const placeWord of placeWords) {
      if (companyWord.includes(placeWord) || placeWord.includes(companyWord)) {
        return true;
      }
    }
  }

  return false;
}

/**
 * Finds matching Google Place result based on address similarity
 */
export function findMatchingPlace(
  companyAddress: string,
  placeResults: GooglePlaceResult[]
): GooglePlace {
  const companyStreet = extractStreet(companyAddress);

  // console.log('Company street extracted:', companyStreet);

  const matchingPlace = placeResults.find((place: GooglePlaceResult) => {
    if (!place.address) return false;

    const placeStreet = extractStreet(place.address);

    // console.log('Comparing with place address:', place.address);
    // console.log('Place street extracted:', placeStreet);

    const streetSimilarity = areStreetsSimilar(companyStreet, placeStreet);

    // console.log('Street similarity check:', {
    //   companyStreet,
    //   placeStreet,
    //   similarity: streetSimilarity
    // });

    return streetSimilarity;
  });

  if (matchingPlace) {
    console.log('✅ Found matching place by address:', matchingPlace.title);
    return {
      title: matchingPlace.title,
      address: matchingPlace.address,
      rating: matchingPlace.rating,
      reviewsCount: matchingPlace.ratingCount,
      website: matchingPlace.website,
      phone: matchingPlace.phoneNumber,
    };
  }

  console.log('🔻 No matching place found by address verification');
  return undefined;
}