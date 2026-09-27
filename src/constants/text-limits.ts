export const textLimits = {
  confirmationCode: 8,
  email: 254,
  eventDescription: 1200,
  eventTitle: 80,
  firstName: 40,
  lastName: 40,
  organizerBio: 500,
  organizerInstitutionName: 80,
  organizerLocationSearch: 120,
  organizerNote: 500,
  organizerRole: 60,
  password: 128,
  placeSearch: 120,
  questDescription: 900,
  questStopDescription: 500,
  questStopEta: 24,
  questStopTitle: 70,
  questTheme: 40,
  questTitle: 80,
  rewardDescription: 700,
  rewardXp: 5,
  rewardTitle: 80,
  rewardQc: 5,
  websiteUrl: 140,
};

export function limitText(value: string, maxLength: number) {
  return value.length > maxLength ? value.slice(0, maxLength) : value;
}
