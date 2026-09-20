# Testing CultureQuest

Run the smallest relevant layer while developing, then run all applicable layers before
merging a feature. Test data and test services must never point at the production project.

## 1. App logic and component tests

```sh
npm test
npm run test:coverage
```

Use this after editing TypeScript logic, UI state, formatting, loading/error handling,
RSVP, quests, rewards, or navigation helpers. These tests mock Supabase and native modules,
so they are fast and do not need Docker or a device.

## 2. Supabase schema, RLS, and RPC contracts

```sh
npx supabase start
npm run test:db
```

The pgTAP files in `supabase/tests/database` run against the local Supabase stack and are
rolled back after each test. Never run `--linked` against production data.

Run this after every migration, RLS policy, trigger, RPC, or database constraint change.

## 3. End-to-end device tests

```sh
npm run test:e2e
```

These will use Maestro against a dedicated test build and a seeded non-production Supabase
project. The remaining one-time setup is documented in `.maestro/README.md`, because it
needs final app identifiers and an EAS test build profile.

## Minimum before a pull request

```sh
npm run lint
npx tsc --noEmit
npm test
```

For database or native-navigation changes, also run the matching second or third layer.
