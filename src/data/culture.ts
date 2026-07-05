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

export type EventLanguage = 'en' | 'nl' | 'fr' | 'multilingual';

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

export const venues: Venue[] = [
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
  },
];

export const events: CultureEvent[] = [
  {
    id: 'e1',
    title: 'Student Dance Night',
    venueId: 'stuk',
    venueName: 'STUK Arts Centre',
    category: 'performance',
    date: 'Thu, Apr 3',
    time: '20:30 - 22:00',
    description: 'Contemporary dance performances by student choreographers from across Europe.',
    xpBonus: 80,
    isFeatured: true,
    isFlashQuest: true,
    spotsLeft: 45,
    language: 'en',
    isInternational: true,
    isFree: true,
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
  },
];

export const rewardPartners: RewardPartner[] = [
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
];

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
  multilingual: 'Multilingual',
};
