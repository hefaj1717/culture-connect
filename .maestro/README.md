# CultureQuest Maestro E2E

These flows target Expo Go on a local Android emulator and the deterministic local
Supabase seed. Production data is never used.

## Test accounts

- Student: `student.e2e@culturequest.local`
- Organizer: `organizer.e2e@culturequest.local`
- Admin: `admin.e2e@culturequest.local`
- Password for all three: `CultureQuestE2E!2026`

## Run the UI flows

With Docker Desktop and an ARM64 Android emulator (or a physical Android phone)
running, use one command:

```sh
npm run test:e2e
```

The runner starts local Supabase, restores deterministic test data, forwards the
required ports, starts Metro with test-only environment variables, runs all Maestro
flows, and stops Metro afterwards.

## Manual equivalent

1. Start Docker Desktop.
2. Start Supabase: `npx supabase start`.
3. Reset local test data: `npm run test:e2e:reset`.
4. Start an Android emulator with an ARM-compatible image.
5. Forward local ports:

   ```sh
   adb reverse tcp:8081 tcp:8081
   adb reverse tcp:54321 tcp:54321
   ```

6. Start Expo in a second terminal:

   ```sh
   EXPO_PUBLIC_SUPABASE_URL=http://127.0.0.1:54321 \
   EXPO_PUBLIC_SUPABASE_ANON_KEY="$(npx supabase status -o env | sed -n 's/^ANON_KEY="\(.*\)"$/\1/p')" \
   EXPO_PUBLIC_E2E_MODE=true \
   EXPO_PUBLIC_E2E_EVENT_CODE=culturequest:event:e2e-live-check-in-token \
   npx expo start --localhost --clear
   ```

7. Run `$HOME/.maestro/bin/maestro test .maestro/flows`.

`EXPO_PUBLIC_E2E_MODE` exposes one test-only check-in control that calls the same
secured attendance RPC as the scanner. It is absent from normal builds. Camera
permission and optical QR recognition should still receive a short manual test on a
physical device.

The database half of the complete journey can run without an emulator:

```sh
npm run test:e2e:backend
```

That command resets only the local Supabase instance and verifies login, RSVP,
idempotent QR check-in, XP/QC awards, quest completion, and reward redemption.
