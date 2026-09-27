export type CityId = 'leuven' | 'lublin';

export type VenueCategory =
  | 'museum'
  | 'theater'
  | 'cinema'
  | 'cafe'
  | 'bar'
  | 'shop'
  | 'landmark'
  | 'gallery'
  | 'arts-centre'
  | 'cultural-centre';

export const eventCategories = [
  'exhibition',
  'concert',
  'screening',
  'workshop',
  'party',
  'performance',
  'market',
  'lecture',
  'sports',
  'other',
] as const;

export type EventCategory = (typeof eventCategories)[number];

export type EventLanguage = 'en' | 'nl' | 'fr' | 'pl' | 'multilingual';

export type CultureCity = {
  id: CityId;
  name: string;
  country: string;
  label: string;
};

export type Venue = {
  id: string;
  name: string;
  category: VenueCategory;
  address: string;
  description: string;
  hours: string;
  rating: number;
  checkIns: number;
  xpReward: number;
  isPartner: boolean;
  isLive?: boolean;
  tags: string[];
  color: string;
  coordinates: {
    latitude: number;
    longitude: number;
  };
};

export type CultureEvent = {
  id: string;
  title: string;
  venueId: string;
  venueName: string;
  category: EventCategory;
  date: string;
  endDate?: string;
  endsAt?: string;
  endTime?: string;
  time: string;
  startsAt?: string;
  description: string;
  xpBonus: number;
  qcBonus: number;
  isFeatured: boolean;
  isFlashQuest: boolean;
  spotsLeft?: number;
  language: EventLanguage;
  isInternational: boolean;
  isFree: boolean;
  interestedCount?: number;
  goingCount?: number;
  attendeeCount: number;
  organizerCityId?: CityId;
  organizerId?: string;
  organizerName: string;
  organizerImage: 'museum' | 'cafe' | 'theater';
  organizerAvatarUrl?: string | null;
  organizerBio?: string;
  organizerLocationAddress?: string | null;
  organizerLocationCoordinates?: {
    latitude: number;
    longitude: number;
  } | null;
  organizerLocationName?: string | null;
  imageUrl?: string;
  venueAddress?: string;
  venueCoordinates?: {
    latitude: number;
    longitude: number;
  };
};

export type RewardPartner = {
  availableDays?: number[];
  availableEndTime?: string | null;
  availableFrom?: string | null;
  availableStartTime?: string | null;
  availableUntil?: string | null;
  cityId?: CityId;
  id: string;
  name: string;
  category: 'cafe' | 'bar' | 'restaurant' | 'shop' | 'bookstore';
  location: string;
  discount: string;
  description?: string;
  condition: string;
  xpCost: number;
  qcCost: number;
  isPopular: boolean;
  badge?: string;
  color: string;
  imageUrl?: string | null;
  organizerId?: string | null;
  organizerName?: string | null;
  organizerAvatarUrl?: string | null;
  organizerBio?: string | null;
  organizerCityId?: CityId | null;
  organizerLocationAddress?: string | null;
  organizerLocationCoordinates?: {
    latitude: number;
    longitude: number;
  } | null;
  organizerLocationName?: string | null;
};

export type CultureCityData = CultureCity & {
  heroImage: 'leuven' | 'lublin';
  pilotText: string;
  heroTitle: string;
  heroSubtitle: string;
};

export const cultureCities: CultureCity[] = [
  { id: 'leuven', name: 'Leuven', country: 'Belgium', label: 'Leuven, Belgium' },
  { id: 'lublin', name: 'Lublin', country: 'Poland', label: 'Lublin, Poland' },
];

export const defaultCityId: CityId = 'leuven';
export const defaultEventXp = 50;
export const defaultEventQc = 5;

export const cultureByCity: Record<CityId, CultureCityData> = {
  leuven: {
    ...cultureCities[0],
    heroImage: 'leuven',
    pilotText: 'Leuven Pilot is LIVE - join now',
    heroTitle: 'Your city.\nYour adventure.',
    heroSubtitle: "Explore Leuven's cultural scene. Earn XP. Unlock real rewards at local cafes.",
  },
  lublin: {
    ...cultureCities[1],
    heroImage: 'lublin',
    pilotText: 'Lublin Pilot is LIVE - join now',
    heroTitle: 'Your city.\nYour adventure.',
    heroSubtitle: "Explore Lublin's old town, student spots, and cultural nights. Earn XP nearby.",
  },
};

export function getCultureCityData(cityId?: string | null) {
  if (cityId === 'lublin') return cultureByCity.lublin;
  return cultureByCity.leuven;
}

export const categoryLabels: Record<VenueCategory, string> = {
  museum: 'Museum',
  theater: 'Theater',
  cinema: 'Cinema',
  cafe: 'Cafe',
  bar: 'Bar',
  shop: 'Shop',
  landmark: 'Landmark',
  gallery: 'Gallery',
  'arts-centre': 'Arts Centre',
  'cultural-centre': 'Cultural Centre',
};

export const eventCategoryLabels: Record<EventCategory, string> = {
  exhibition: 'Exhibition',
  concert: 'Concert',
  screening: 'Screening',
  workshop: 'Workshop',
  party: 'Party',
  performance: 'Performance',
  market: 'Market',
  lecture: 'Lecture',
  sports: 'Sports',
  other: 'Other',
};

export const languageLabels: Record<EventLanguage, string> = {
  en: 'English',
  nl: 'Nederlands',
  fr: 'Francais',
  pl: 'Polish',
  multilingual: 'Multilingual',
};
