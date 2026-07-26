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

export type EventCategory =
  'exhibition' | 'performance' | 'screening' | 'workshop' | 'festival' | 'concert';

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
  time: string;
  description: string;
  xpBonus: number;
  isFeatured: boolean;
  isFlashQuest: boolean;
  spotsLeft?: number;
  language: EventLanguage;
  isInternational: boolean;
  isFree: boolean;
  interestedCount?: number;
  attendeeCount: number;
  organizerName: string;
  organizerImage: 'museum' | 'cafe' | 'theater';
  imageUrl?: string;
  checkInCode: string;
  venueAddress?: string;
  venueCoordinates?: {
    latitude: number;
    longitude: number;
  };
};

export type RewardPartner = {
  id: string;
  name: string;
  category: 'cafe' | 'bar' | 'restaurant' | 'shop' | 'bookstore';
  location: string;
  discount: string;
  description?: string;
  condition: string;
  xpCost: number;
  isPopular: boolean;
  badge?: string;
  color: string;
};

export type CultureCityData = CultureCity & {
  heroImage: 'leuven' | 'lublin';
  statusText: string;
  pilotText: string;
  heroTitle: string;
  heroSubtitle: string;
  levelTip: string;
  venues: Venue[];
  rewardPartners: RewardPartner[];
};

export const cultureCities: CultureCity[] = [
  { id: 'leuven', name: 'Leuven', country: 'Belgium', label: 'Leuven, Belgium' },
  { id: 'lublin', name: 'Lublin', country: 'Poland', label: 'Lublin, Poland' },
];

export const defaultCityId: CityId = 'leuven';
export const defaultEventXp = 50;

export const cultureByCity: Record<CityId, CultureCityData> = {
  leuven: {
    ...cultureCities[0],
    heroImage: 'leuven',
    statusText: 'Students exploring Leuven right now',
    pilotText: 'Leuven Pilot is LIVE - join now',
    heroTitle: 'Your city.\nYour adventure.',
    heroSubtitle: "Explore Leuven's cultural scene. Earn XP. Unlock real rewards at local cafes.",
    levelTip: 'Check in at 2 more venues this week to unlock the Weekend Explorer badge.',
    venues: [
      {
        id: 'stuk',
        name: 'STUK Arts Centre',
        category: 'arts-centre',
        address: 'Naamsestraat 96, 3000 Leuven',
        hours: 'Tue-Sun 10:00-22:00',
        description:
          "Leuven's leading arts centre for theatre, music, dance, and visual arts. A student favourite with year-round programming.",
        rating: 4.8,
        checkIns: 518,
        xpReward: 80,
        isPartner: true,
        isLive: true,
        tags: ['Theatre', 'Music', 'Student-friendly'],
        color: '#EC4899',
        coordinates: { latitude: 50.87662, longitude: 4.70092 },
      },
      {
        id: 'm-museum',
        name: 'M-Museum Leuven',
        category: 'museum',
        address: 'Leopold Vanderkelenstraat 28, 3000 Leuven',
        hours: 'Tue-Sun 11:00-18:00',
        description:
          'Contemporary and classical art collections in the heart of Leuven. Free entry on the first Sunday of every month.',
        rating: 4.6,
        checkIns: 342,
        xpReward: 100,
        isPartner: true,
        tags: ['Art', 'Museum', 'Free first Sunday'],
        color: '#6366F1',
        coordinates: { latitude: 50.87925, longitude: 4.70339 },
      },
      {
        id: '30cc',
        name: '30CC Cultural Centre',
        category: 'cultural-centre',
        address: 'Bondgenotenlaan 21, 3000 Leuven',
        hours: 'Check programme',
        description:
          "Leuven's official cultural programming hub. Theatre, concerts, exhibitions, and multilingual events throughout the year.",
        rating: 4.5,
        checkIns: 287,
        xpReward: 60,
        isPartner: true,
        tags: ['Events', 'Culture', 'Multilingual'],
        color: '#F4A261',
        coordinates: { latitude: 50.88095, longitude: 4.70504 },
      },
    ],
    rewardPartners: [
      {
        id: 'r1',
        name: 'STUKcafe',
        category: 'cafe',
        location: 'Inside STUK Arts Centre, Naamsestraat 96',
        discount: 'Free coffee with any purchase',
        condition: 'Unlock at 100 XP',
        xpCost: 100,
        isPopular: true,
        badge: 'Hot',
        color: '#EC4899',
      },
      {
        id: 'r2',
        name: 'Cafe Partner Leuven',
        category: 'cafe',
        location: 'City centre, Leuven',
        discount: '15% off any drink',
        condition: 'Unlock at 50 XP',
        xpCost: 50,
        isPopular: true,
        badge: 'New',
        color: '#6366F1',
      },
    ],
  },
  lublin: {
    ...cultureCities[1],
    heroImage: 'lublin',
    statusText: 'Students exploring Lublin right now',
    pilotText: 'Lublin Pilot is LIVE - join now',
    heroTitle: 'Your city.\nYour adventure.',
    heroSubtitle: "Explore Lublin's old town, student spots, and cultural nights. Earn XP nearby.",
    levelTip: 'Check in near the Old Town twice this week to unlock the Lublin Explorer badge.',
    venues: [
      {
        id: 'lublin-castle',
        name: 'Lublin Castle',
        category: 'museum',
        address: 'Zamkowa 9, 20-117 Lublin',
        hours: 'Tue-Sun 10:00-17:00',
        description:
          'A landmark museum above the Old Town with royal history, chapel frescoes, and city views.',
        rating: 4.8,
        checkIns: 436,
        xpReward: 100,
        isPartner: true,
        isLive: true,
        tags: ['Castle', 'Museum', 'Old Town'],
        color: '#7C3AED',
        coordinates: { latitude: 51.25013, longitude: 22.57243 },
      },
      {
        id: 'cs-kultura',
        name: 'Centrum Spotkania Kultur',
        category: 'cultural-centre',
        address: 'Plac Teatralny 1, 20-029 Lublin',
        hours: 'Daily 09:00-22:00',
        description:
          'Modern cultural hub for concerts, exhibitions, cinema, rooftop views, and student events.',
        rating: 4.7,
        checkIns: 389,
        xpReward: 80,
        isPartner: true,
        tags: ['Concerts', 'Cinema', 'Rooftop'],
        color: '#6366F1',
        coordinates: { latitude: 51.24633, longitude: 22.54761 },
      },
      {
        id: 'heca-cafe',
        name: 'Heca Cafe',
        category: 'cafe',
        address: 'Grodzka 21, 20-112 Lublin',
        hours: 'Mon-Sun 09:00-21:00',
        description:
          'Cozy Old Town cafe for study sessions, quick meetups, and culture-route coffee breaks.',
        rating: 4.6,
        checkIns: 264,
        xpReward: 50,
        isPartner: true,
        tags: ['Coffee', 'Study spot', 'Old Town'],
        color: '#F4A261',
        coordinates: { latitude: 51.24868, longitude: 22.56869 },
      },
      {
        id: 'perlowy-browar',
        name: 'Perlowy Browar',
        category: 'bar',
        address: 'Bernardynska 15, 20-109 Lublin',
        hours: 'Tue-Sun 13:00-23:00',
        description:
          'Industrial-style brewery courtyard close to the centre, ideal for evening quests.',
        rating: 4.5,
        checkIns: 218,
        xpReward: 60,
        isPartner: false,
        tags: ['Food', 'Evening', 'Courtyard'],
        color: '#2F9E73',
        coordinates: { latitude: 51.24582, longitude: 22.5655 },
      },
    ],
    rewardPartners: [
      {
        id: 'lu-r1',
        name: 'Heca Cafe',
        category: 'cafe',
        location: 'Grodzka 21, Old Town',
        discount: 'Free espresso after your next check-in',
        condition: 'Unlock at 80 XP',
        xpCost: 80,
        isPopular: true,
        badge: 'Hot',
        color: '#F4A261',
      },
      {
        id: 'lu-r2',
        name: 'Perlowy Browar',
        category: 'restaurant',
        location: 'Bernardynska 15, city centre',
        discount: '15% off student lunch set',
        condition: 'Unlock at 120 XP',
        xpCost: 120,
        isPopular: true,
        badge: 'New',
        color: '#2F9E73',
      },
      {
        id: 'lu-r3',
        name: 'Bookland Lublin',
        category: 'bookstore',
        location: 'Krakowskie Przedmiescie',
        discount: '10% off notebooks and city guides',
        condition: 'Unlock at 60 XP',
        xpCost: 60,
        isPopular: false,
        color: '#6366F1',
      },
    ],
  },
};

export function getCultureCityData(cityId?: string | null) {
  if (cityId === 'lublin') return cultureByCity.lublin;
  return cultureByCity.leuven;
}

export const venues = cultureByCity.leuven.venues;
export const rewardPartners = cultureByCity.leuven.rewardPartners;

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
  performance: 'Performance',
  screening: 'Screening',
  workshop: 'Workshop',
  festival: 'Festival',
  concert: 'Concert',
};

export const languageLabels: Record<EventLanguage, string> = {
  en: 'English',
  nl: 'Nederlands',
  fr: 'Francais',
  pl: 'Polish',
  multilingual: 'Multilingual',
};
