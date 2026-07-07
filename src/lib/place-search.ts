import { type CityId, type Venue, getCultureCityData } from '@/data/culture';

export type PlaceSuggestion = {
  id: string;
  name: string;
  address: string;
  latitude: number;
  longitude: number;
  source: 'google' | 'local';
};

type GoogleAutocompleteResponse = {
  suggestions?: {
    placePrediction?: {
      placeId?: string;
      text?: {
        text?: string;
      };
      structuredFormat?: {
        mainText?: {
          text?: string;
        };
        secondaryText?: {
          text?: string;
        };
      };
    };
  }[];
};

type GooglePlaceDetailsResponse = {
  id?: string;
  formattedAddress?: string;
  displayName?: {
    text?: string;
  };
  location?: {
    latitude?: number;
    longitude?: number;
  };
};

const GOOGLE_PLACES_API_KEY = process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY;

export const hasGooglePlacesApiKey = !!GOOGLE_PLACES_API_KEY;

const citySearchContext: Record<
  CityId,
  { countryCode: string; latitude: number; longitude: number }
> = {
  leuven: { countryCode: 'be', latitude: 50.8798, longitude: 4.7005 },
  lublin: { countryCode: 'pl', latitude: 51.2465, longitude: 22.5684 },
};

export async function searchPlaces(query: string, cityId: CityId) {
  const normalizedQuery = query.trim();

  if (normalizedQuery.length < 2) {
    return [];
  }

  if (GOOGLE_PLACES_API_KEY) {
    const googleResults = await searchGooglePlaces(normalizedQuery, cityId);
    if (googleResults.length > 0) {
      return googleResults;
    }
  }

  return searchLocalPlaces(normalizedQuery, cityId);
}

async function searchGooglePlaces(query: string, cityId: CityId): Promise<PlaceSuggestion[]> {
  const cityContext = citySearchContext[cityId];

  try {
    const response = await fetch('https://places.googleapis.com/v1/places:autocomplete', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Goog-Api-Key': GOOGLE_PLACES_API_KEY ?? '',
        'X-Goog-FieldMask':
          'suggestions.placePrediction.placeId,suggestions.placePrediction.text,suggestions.placePrediction.structuredFormat',
      },
      body: JSON.stringify({
        input: query,
        includedRegionCodes: [cityContext.countryCode],
        locationBias: {
          circle: {
            center: {
              latitude: cityContext.latitude,
              longitude: cityContext.longitude,
            },
            radius: 12000,
          },
        },
      }),
    });

    if (!response.ok) {
      return [];
    }

    const data = (await response.json()) as GoogleAutocompleteResponse;
    const predictions = data.suggestions
      ?.map((suggestion) => suggestion.placePrediction)
      .filter((prediction) => prediction?.placeId)
      .slice(0, 5);

    if (!predictions?.length) {
      return [];
    }

    const details = await Promise.all(
      predictions.map((prediction) => fetchGooglePlaceDetails(prediction?.placeId ?? '')),
    );

    return details.filter((place): place is PlaceSuggestion => !!place);
  } catch {
    return [];
  }
}

async function fetchGooglePlaceDetails(placeId: string): Promise<PlaceSuggestion | null> {
  if (!GOOGLE_PLACES_API_KEY || !placeId) {
    return null;
  }

  try {
    const response = await fetch(`https://places.googleapis.com/v1/places/${placeId}`, {
      headers: {
        'Content-Type': 'application/json',
        'X-Goog-Api-Key': GOOGLE_PLACES_API_KEY,
        'X-Goog-FieldMask': 'id,displayName,formattedAddress,location',
      },
    });

    if (!response.ok) {
      return null;
    }

    const data = (await response.json()) as GooglePlaceDetailsResponse;
    if (
      !data.id ||
      !data.displayName?.text ||
      !data.formattedAddress ||
      typeof data.location?.latitude !== 'number' ||
      typeof data.location?.longitude !== 'number'
    ) {
      return null;
    }

    return {
      id: data.id,
      name: data.displayName.text,
      address: data.formattedAddress,
      latitude: data.location.latitude,
      longitude: data.location.longitude,
      source: 'google',
    };
  } catch {
    return null;
  }
}

function searchLocalPlaces(query: string, cityId: CityId): PlaceSuggestion[] {
  const normalizedQuery = query.toLowerCase();
  return getCultureCityData(cityId)
    .venues.filter(
      (venue) =>
        venue.name.toLowerCase().includes(normalizedQuery) ||
        venue.address.toLowerCase().includes(normalizedQuery),
    )
    .slice(0, 5)
    .map(mapVenueToSuggestion);
}

function mapVenueToSuggestion(venue: Venue): PlaceSuggestion {
  return {
    id: venue.id,
    name: venue.name,
    address: venue.address,
    latitude: venue.coordinates.latitude,
    longitude: venue.coordinates.longitude,
    source: 'local',
  };
}
