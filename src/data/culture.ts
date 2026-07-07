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
  attendeeCount: number;
  organizerName: string;
  organizerImage: 'museum' | 'cafe' | 'theater';
  checkInCode: string;
};

export type RewardPartner = {
  id: string;
  name: string;
  category: 'cafe' | 'bar' | 'restaurant' | 'shop' | 'bookstore';
  location: string;
  discount: string;
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
  events: CultureEvent[];
  rewardPartners: RewardPartner[];
};

export const cultureCities: CultureCity[] = [
  { id: 'leuven', name: 'Leuven', country: 'Belgium', label: 'Leuven, Belgium' },
  { id: 'lublin', name: 'Lublin', country: 'Poland', label: 'Lublin, Poland' },
];

export const defaultCityId: CityId = 'leuven';

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
        color: '#F59E0B',
        coordinates: { latitude: 50.88095, longitude: 4.70504 },
      },
    ],
    events: [
      {
        id: 'e1',
        title: 'Student Dance Night',
        venueId: 'stuk',
        venueName: 'STUK Arts Centre',
        category: 'performance',
        date: 'Thu, Apr 3',
        time: '20:30 - 22:00',
        description:
          'Contemporary dance performances by student choreographers from across Europe.',
        xpBonus: 80,
        isFeatured: true,
        isFlashQuest: true,
        spotsLeft: 45,
        language: 'en',
        isInternational: true,
        isFree: true,
        attendeeCount: 128,
        organizerName: 'STUK Student Arts Team',
        organizerImage: 'theater',
        checkInCode: 'culturequest:event:e1',
      },
      {
        id: 'e2',
        title: 'Contemporary Photography Exhibition',
        venueId: 'm-museum',
        venueName: 'M-Museum Leuven',
        category: 'exhibition',
        date: 'Until Apr 15',
        time: '11:00 - 18:00',
        description:
          'A curated collection of emerging European photographers exploring urban identity.',
        xpBonus: 100,
        isFeatured: true,
        isFlashQuest: false,
        language: 'en',
        isInternational: true,
        isFree: false,
        attendeeCount: 96,
        organizerName: 'M-Museum Leuven',
        organizerImage: 'museum',
        checkInCode: 'culturequest:event:e2',
      },
      {
        id: 'e3',
        title: 'Multilingual Poetry Slam',
        venueId: '30cc',
        venueName: '30CC Cultural Centre',
        category: 'performance',
        date: 'Fri, Apr 4',
        time: '19:30 - 21:30',
        description: 'Poetry performances by students from 12 countries. Perform or just enjoy!',
        xpBonus: 60,
        isFeatured: false,
        isFlashQuest: false,
        language: 'multilingual',
        isInternational: true,
        isFree: true,
        attendeeCount: 74,
        organizerName: '30CC Student Stage',
        organizerImage: 'theater',
        checkInCode: 'culturequest:event:e3',
      },
      {
        id: 'e4',
        title: "Art-House Film: 'The Quiet Migration'",
        venueId: 'stuk',
        venueName: 'Cinema ZED at STUK',
        category: 'screening',
        date: 'Sat, Apr 5',
        time: '21:00',
        description:
          'Award-winning documentary about cultural exchange in European university cities. English subtitles.',
        xpBonus: 80,
        isFeatured: false,
        isFlashQuest: false,
        spotsLeft: 23,
        language: 'en',
        isInternational: true,
        isFree: false,
        attendeeCount: 53,
        organizerName: 'Cinema ZED at STUK',
        organizerImage: 'theater',
        checkInCode: 'culturequest:event:e4',
      },
      {
        id: 'e5',
        title: 'Free Sunday at M-Museum',
        venueId: 'm-museum',
        venueName: 'M-Museum Leuven',
        category: 'exhibition',
        date: 'Sun, Apr 6',
        time: '11:00 - 18:00',
        description:
          'Free entry on the first Sunday of the month. Explore the full collection and temporary exhibitions.',
        xpBonus: 100,
        isFeatured: true,
        isFlashQuest: false,
        language: 'multilingual',
        isInternational: true,
        isFree: true,
        attendeeCount: 182,
        organizerName: 'M-Museum Leuven',
        organizerImage: 'museum',
        checkInCode: 'culturequest:event:e5',
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
        color: '#24458F',
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
        color: '#F59E0B',
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
        color: '#22C55E',
        coordinates: { latitude: 51.24582, longitude: 22.5655 },
      },
    ],
    events: [
      {
        id: 'lu-e1',
        title: 'Castle Night Walk',
        venueId: 'lublin-castle',
        venueName: 'Lublin Castle',
        category: 'exhibition',
        date: 'Thu, Apr 3',
        time: '19:30 - 21:00',
        description:
          'A guided evening route through castle stories, hidden details, and Old Town viewpoints.',
        xpBonus: 100,
        isFeatured: true,
        isFlashQuest: true,
        spotsLeft: 32,
        language: 'en',
        isInternational: true,
        isFree: true,
        attendeeCount: 88,
        organizerName: 'Lublin Castle Culture Team',
        organizerImage: 'museum',
        checkInCode: 'culturequest:event:lu-e1',
      },
      {
        id: 'lu-e2',
        title: 'CSK Rooftop Sessions',
        venueId: 'cs-kultura',
        venueName: 'Centrum Spotkania Kultur',
        category: 'concert',
        date: 'Fri, Apr 4',
        time: '20:00 - 22:00',
        description:
          'Live electronic and indie sets on the cultural centre rooftop with student discounts.',
        xpBonus: 80,
        isFeatured: true,
        isFlashQuest: false,
        language: 'multilingual',
        isInternational: true,
        isFree: false,
        attendeeCount: 146,
        organizerName: 'CSK Rooftop Crew',
        organizerImage: 'theater',
        checkInCode: 'culturequest:event:lu-e2',
      },
      {
        id: 'lu-e3',
        title: 'Old Town Sketch & Coffee',
        venueId: 'heca-cafe',
        venueName: 'Heca Cafe',
        category: 'workshop',
        date: 'Sat, Apr 5',
        time: '11:00 - 13:00',
        description:
          'Meet other students, sketch Old Town corners, and collect XP with a coffee stop.',
        xpBonus: 50,
        isFeatured: false,
        isFlashQuest: false,
        language: 'en',
        isInternational: true,
        isFree: true,
        attendeeCount: 41,
        organizerName: 'Heca Cafe Sketch Club',
        organizerImage: 'cafe',
        checkInCode: 'culturequest:event:lu-e3',
      },
      {
        id: 'lu-e4',
        title: 'Student Film Night: Lublin Stories',
        venueId: 'cs-kultura',
        venueName: 'CSK Cinema',
        category: 'screening',
        date: 'Sat, Apr 5',
        time: '19:00',
        description:
          'Short films by local students with English subtitles and a post-screening chat.',
        xpBonus: 70,
        isFeatured: false,
        isFlashQuest: false,
        spotsLeft: 40,
        language: 'en',
        isInternational: true,
        isFree: false,
        attendeeCount: 67,
        organizerName: 'CSK Cinema Students',
        organizerImage: 'theater',
        checkInCode: 'culturequest:event:lu-e4',
      },
      {
        id: 'lu-e5',
        title: 'Free Gallery Sunday',
        venueId: 'lublin-castle',
        venueName: 'National Museum in Lublin',
        category: 'exhibition',
        date: 'Sun, Apr 6',
        time: '10:00 - 17:00',
        description: 'Drop into selected galleries, collect XP, and finish with an Old Town route.',
        xpBonus: 90,
        isFeatured: true,
        isFlashQuest: false,
        language: 'pl',
        isInternational: false,
        isFree: true,
        attendeeCount: 119,
        organizerName: 'National Museum in Lublin',
        organizerImage: 'museum',
        checkInCode: 'culturequest:event:lu-e5',
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
        color: '#F59E0B',
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
        color: '#22C55E',
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
export const events = cultureByCity.leuven.events;
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
