# CultureQuest

CultureQuest is a mobile application for discovering local culture, joining
events, completing city quests, and supporting university communities.

The application combines event discovery, QR attendance verification,
organizer profiles, rewards, notifications, a city activity map, and a digital
passport in one experience for residents, students, and visitors.

> **Project status:** active beta development. The repository is suitable for
> development and internal testing, but the application is not yet a finished
> production release.

## Main features

- Discover upcoming and live cultural events by city.
- Respond as interested or going and confirm attendance with secure QR codes.
- Explore predicted city activity on an interactive map.
- Complete time-limited quests and build a digital passport.
- Earn permanent XP and spend Quest Credits (QC) on organizer rewards.
- Follow verified organizers and receive event announcements.
- Compare university communities through the campus leaderboard.
- Create events, quests, and rewards through moderated organizer workflows.
- Review content, audit XP, and manage submissions with admin tools.
- Receive in-app and real-time updates about moderation and content changes.

## Technology

- [Expo SDK 58](https://docs.expo.dev/versions/v58.0.0/) and React Native
- TypeScript and Expo Router
- Supabase Auth, PostgreSQL, Realtime, Storage, and Row Level Security
- NativeWind and shared design tokens
- Jest for unit tests
- Supabase CLI database contract tests
- Maestro mobile end-to-end flows

## Requirements

- Node.js and npm
- iOS Simulator with Xcode, an Android emulator, or a physical device
- A Supabase project for connected development
- A Google Maps Platform key with the Places API enabled
- Docker Desktop and the Supabase CLI for local database tests

## Local setup

1. Clone the repository and install locked dependencies:

   ```bash
   git clone https://github.com/hefaj1717/culture-connect.git
   cd culture-connect
   npm ci
   ```

2. Create a local environment file:

   ```bash
   cp .env.example .env
   ```

3. Add your own development credentials to `.env`:

   ```dotenv
   EXPO_PUBLIC_SUPABASE_URL=
   EXPO_PUBLIC_SUPABASE_ANON_KEY=
   EXPO_PUBLIC_GOOGLE_MAPS_API_KEY=
   ```

   Only use the public Supabase anon key in the client. Never place a Supabase
   service-role key or another server secret in an `EXPO_PUBLIC_*` variable.
   Restrict the Google key in Google Cloud to the APIs and applications that
   require it.

4. Start the application:

   ```bash
   npm start
   ```

   Use the terminal shortcuts to open iOS or Android. A development build is
   recommended when testing native integrations.

## Local Supabase

Docker Desktop must be running before starting the local stack:

```bash
npx supabase start
npx supabase db reset
```

Database changes belong in `supabase/migrations`. Check a remote deployment
before applying it:

```bash
npx supabase db push --dry-run
```

Do not commit files from `supabase/.temp` or local environment credentials.

## Quality checks

Run the full frontend quality suite:

```bash
npm run quality:frontend
```

Individual checks are also available:

```bash
npm run lint
npx tsc --noEmit
npm run test:unit
npm run test:db
npm run test:e2e
npm run security:check
```

Database tests require the local Supabase stack. Maestro tests require a
configured simulator or emulator and a test build of the application.

## Project structure

```text
src/app/                 Expo Router screens
src/components/          Shared UI and feature components
src/hooks/               Reusable screen and form behavior
src/lib/                 Data access and domain logic
src/constants/           Theme and application constants
supabase/migrations/     Versioned database schema changes
supabase/tests/          Database security and contract tests
.maestro/flows/          Mobile end-to-end scenarios
```

## Security

Authentication and authorization are enforced in Supabase with Row Level
Security and restricted RPC functions. The repository also runs dependency,
secret, TypeScript, lint, unit, and database checks in CI.

If you discover a security issue, do not publish credentials or exploit
details in a public issue. Contact the repository owner privately.

## License

This repository is **source-visible but not open source**. Copyright © 2026
Karol Wlosek. All rights reserved. No permission is granted to copy, modify,
redistribute, sublicense, or reuse the project without prior written
permission. See [LICENSE](LICENSE).

Third-party libraries and assets remain subject to their own licenses.
