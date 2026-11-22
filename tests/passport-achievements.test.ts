import { buildPassportAchievements } from '@/components/profile/passport-achievements';

describe('Digital Passport university ranking awards', () => {
  it('shows a permanent academic-year badge for each finalized podium result', () => {
    const badges = buildPassportAchievements({
      betaUser: false,
      eventsCompleted: 0,
      questsCompleted: 0,
      sameOrganizerEvents: 0,
      universityRankingAwards: [
        {
          academicYear: '2026/2027',
          cityKey: 'lublin',
          rank: 1,
          universityName: 'Maria Curie-Sklodowska University',
        },
        {
          academicYear: '2027/2028',
          cityKey: 'lublin',
          rank: 3,
          universityName: 'Maria Curie-Sklodowska University',
        },
      ],
    });

    expect(badges).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          color: '#A63446',
          progress: '2026/2027 · 1st place',
          title: 'Campus Champions',
          unlocked: true,
        }),
        expect.objectContaining({
          color: '#1F3A44',
          progress: '2027/2028 · 3rd place',
          title: 'Campus Bronze',
          unlocked: true,
        }),
      ]),
    );
  });
});
