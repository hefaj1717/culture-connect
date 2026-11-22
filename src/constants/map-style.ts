import { Colors } from '@/constants/theme';

export const cultureMapStyle = [
  {
    elementType: 'geometry',
    stylers: [{ color: Colors.light.backgroundElement }],
  },
  {
    elementType: 'labels.icon',
    stylers: [{ visibility: 'off' }],
  },
  {
    elementType: 'labels.text.fill',
    stylers: [{ color: Colors.light.textSecondary }],
  },
  {
    elementType: 'labels.text.stroke',
    stylers: [{ color: Colors.light.background }],
  },
  {
    featureType: 'administrative',
    elementType: 'geometry.stroke',
    stylers: [{ color: Colors.light.progressTrack }],
  },
  {
    featureType: 'landscape.man_made',
    elementType: 'geometry',
    stylers: [{ color: Colors.light.backgroundElement }],
  },
  {
    featureType: 'poi',
    stylers: [{ visibility: 'off' }],
  },
  {
    featureType: 'road',
    elementType: 'geometry',
    stylers: [{ color: Colors.light.onPrimary }],
  },
  {
    featureType: 'road',
    elementType: 'geometry.stroke',
    stylers: [{ color: Colors.light.progressTrack }],
  },
  {
    featureType: 'road',
    elementType: 'labels.text.fill',
    stylers: [{ color: Colors.light.textSecondary }],
  },
  {
    featureType: 'transit',
    elementType: 'geometry',
    stylers: [{ color: Colors.light.progressTrack }],
  },
  {
    featureType: 'water',
    elementType: 'geometry',
    stylers: [{ color: '#C8E0E0' }],
  },
  {
    featureType: 'water',
    elementType: 'labels.text.fill',
    stylers: [{ color: Colors.light.textSecondary }],
  },
];
