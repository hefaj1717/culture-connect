# CultureQuest E2E tests

Maestro verifies real interactions on an installed iOS/Android build. It is intentionally
not wired to Expo Go: E2E needs a deterministic test build and a separate seeded Supabase
project, so it can never mutate production data.

Before enabling these flows:

1. Create a non-production Supabase project and seed it with one student, organizer,
   approved event, quest, and reward.
2. Set final `ios.bundleIdentifier` and `android.package` in `app.json`.
3. Create the `e2e-test` profile in `eas.json` and build it with the test Supabase URL.
4. Add flows for RSVP rollback, QR check-in, reward redemption, moderation, and
   `event → organizer → event → back` navigation.

Run after the test build is installed:

```sh
npm run test:e2e
```

The executable Maestro flows will be added together with the test build configuration;
they must use the final application identifier and controlled test data.
