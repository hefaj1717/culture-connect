import { type CityId } from '@/data/culture';

export type PlaceSuggestion = {
  id: string;
  name: string;
  address: string;
  latitude: number;
  longitude: number;
  source: 'google' | 'local';
};

export type PlaceSearchError = {
  code: 'configuration' | 'network' | 'quota' | 'service';
  message: string;
};

export type PlaceSearchResult = {
  error: PlaceSearchError | null;
  suggestions: PlaceSuggestion[];
};

type GoogleAutocompleteResponse = {
  suggestions?: { placePrediction?: { placeId?: string } }[];
};

type GoogleApiErrorResponse = {
  error?: { code?: number; message?: string; status?: string };
};

type GooglePlaceDetailsResponse = {
  id?: string;
  formattedAddress?: string;
  displayName?: { text?: string };
  location?: { latitude?: number; longitude?: number };
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

const errors = {
  configuration: {
    code: 'configuration',
    message: 'Place search is unavailable because Google Places is not configured for this app.',
  },
  network: {
    code: 'network',
    message: "Can't reach Google Places. Check your connection and try again.",
  },
  quota: {
    code: 'quota',
    message: 'Place search has reached its current limit. Please try again later.',
  },
  service: {
    code: 'service',
    message: 'Place search is temporarily unavailable. Please try again.',
  },
} as const satisfies Record<PlaceSearchError['code'], PlaceSearchError>;

export async function searchPlaces(query: string, cityId: CityId): Promise<PlaceSearchResult> {
  const normalizedQuery = query.trim();

  if (normalizedQuery.length < 2) return { error: null, suggestions: [] };
  if (!GOOGLE_PLACES_API_KEY) return { error: errors.configuration, suggestions: [] };

  return searchGooglePlaces(normalizedQuery, cityId);
}

async function searchGooglePlaces(query: string, cityId: CityId): Promise<PlaceSearchResult> {
  const cityContext = citySearchContext[cityId];
  const autocomplete = await requestGoogle<GoogleAutocompleteResponse>(
    'https://places.googleapis.com/v1/places:autocomplete',
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Goog-Api-Key': GOOGLE_PLACES_API_KEY ?? '',
        'X-Goog-FieldMask': 'suggestions.placePrediction.placeId',
      },
      body: JSON.stringify({
        input: query,
        includedRegionCodes: [cityContext.countryCode],
        locationBias: {
          circle: {
            center: { latitude: cityContext.latitude, longitude: cityContext.longitude },
            radius: 12000,
          },
        },
      }),
    },
  );

  if (autocomplete.error) return { error: autocomplete.error, suggestions: [] };

  const placeIds = (autocomplete.data?.suggestions ?? [])
    .map((suggestion) => suggestion.placePrediction?.placeId)
    .filter((placeId): placeId is string => !!placeId)
    .slice(0, 5);

  // An empty successful response is an empty state, not a technical failure.
  if (placeIds.length === 0) return { error: null, suggestions: [] };

  const detailResults = await Promise.all(placeIds.map(fetchGooglePlaceDetails));
  const suggestions = detailResults.flatMap((result) => (result.suggestion ? [result.suggestion] : []));
  const detailError = detailResults.find((result) => result.error)?.error ?? null;

  return { error: suggestions.length === 0 ? detailError ?? errors.service : null, suggestions };
}

async function fetchGooglePlaceDetails(placeId: string): Promise<{
  error: PlaceSearchError | null;
  suggestion: PlaceSuggestion | null;
}> {
  const result = await requestGoogle<GooglePlaceDetailsResponse>(
    `https://places.googleapis.com/v1/places/${placeId}`,
    {
      headers: {
        'Content-Type': 'application/json',
        'X-Goog-Api-Key': GOOGLE_PLACES_API_KEY ?? '',
        'X-Goog-FieldMask': 'id,displayName,formattedAddress,location',
      },
    },
  );

  if (result.error) return { error: result.error, suggestion: null };

  const data = result.data;
  if (
    !data?.id ||
    !data.displayName?.text ||
    !data.formattedAddress ||
    typeof data.location?.latitude !== 'number' ||
    typeof data.location?.longitude !== 'number'
  ) {
    return { error: errors.service, suggestion: null };
  }

  return {
    error: null,
    suggestion: {
      id: data.id,
      name: data.displayName.text,
      address: data.formattedAddress,
      latitude: data.location.latitude,
      longitude: data.location.longitude,
      source: 'google',
    },
  };
}

async function requestGoogle<T>(
  url: string,
  options: RequestInit,
): Promise<{ data: T | null; error: PlaceSearchError | null }> {
  try {
    const response = await fetch(url, options);
    if (!response.ok) {
      const body = (await response.json().catch(() => null)) as GoogleApiErrorResponse | null;
      return { data: null, error: mapGoogleError(response.status, body?.error?.status) };
    }

    return { data: (await response.json()) as T, error: null };
  } catch {
    return { data: null, error: errors.network };
  }
}

function mapGoogleError(httpStatus: number, status?: string): PlaceSearchError {
  if (httpStatus === 401 || httpStatus === 403 || status === 'PERMISSION_DENIED') {
    return errors.configuration;
  }
  if (httpStatus === 429 || status === 'RESOURCE_EXHAUSTED') return errors.quota;
  return errors.service;
}
