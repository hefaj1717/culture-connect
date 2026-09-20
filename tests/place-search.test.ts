const fetchMock = jest.fn();

process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY = 'test-google-key';

const { searchPlaces } = require('@/lib/place-search') as typeof import('@/lib/place-search');

describe('Google Places search', () => {
  beforeEach(() => {
    fetchMock.mockReset();
    globalThis.fetch = fetchMock;
  });

  it('treats a successful Google response with no suggestions as an empty state', async () => {
    fetchMock.mockResolvedValue({ ok: true, json: async () => ({ suggestions: [] }) });

    await expect(searchPlaces('zz', 'lublin')).resolves.toEqual({
      error: null,
      suggestions: [],
    });
  });

  it('returns a quota-specific error instead of masking it as an empty list', async () => {
    fetchMock.mockResolvedValue({
      ok: false,
      status: 429,
      json: async () => ({ error: { status: 'RESOURCE_EXHAUSTED' } }),
    });

    await expect(searchPlaces('cafe', 'lublin')).resolves.toEqual({
      error: {
        code: 'quota',
        message: 'Place search has reached its current limit. Please try again later.',
      },
      suggestions: [],
    });
  });

  it('returns a retryable network error when Google cannot be reached', async () => {
    fetchMock.mockRejectedValue(new Error('Network request failed'));

    await expect(searchPlaces('cafe', 'lublin')).resolves.toEqual({
      error: {
        code: 'network',
        message: "Can't reach Google Places. Check your connection and try again.",
      },
      suggestions: [],
    });
  });

  it('returns detailed Google place suggestions after a successful autocomplete response', async () => {
    fetchMock
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ suggestions: [{ placePrediction: { placeId: 'place-1' } }] }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          displayName: { text: 'Cafe Culture' },
          formattedAddress: 'Lublin, Poland',
          id: 'place-1',
          location: { latitude: 51.24, longitude: 22.56 },
        }),
      });

    await expect(searchPlaces('cafe', 'lublin')).resolves.toEqual({
      error: null,
      suggestions: [
        {
          address: 'Lublin, Poland',
          id: 'place-1',
          latitude: 51.24,
          longitude: 22.56,
          name: 'Cafe Culture',
          source: 'google',
        },
      ],
    });
  });
});
