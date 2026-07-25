# CultureQuest Frontend Quality Checklist

This app uses Expo React Native, Expo Router-style app files, NativeWind, local
screen state, and a single Auth Context for session/user authorization state.

## Architecture

- Keep reusable UI in `src/components`.
- Keep screen-specific UI near the screen until it is reused or the screen becomes
  difficult to maintain.
- Split large screens incrementally. Current priority targets:
  - `src/app/profile.tsx`: extract edit profile, create event, create reward,
    badges, and reward redemption modules.
  - `src/app/explore.tsx`: extract event detail, scanner, event cards, and filters.
  - `src/app/index.tsx`: extract home hero, activity map, notifications, and
    leaderboard.

## State Management

- Local UI state stays inside screens/components.
- Auth/session/role state stays in `AuthProvider`.
- Avoid introducing Redux/Zustand until there is shared app state that cannot be
  cleanly represented by Auth Context plus local state.
- Do not duplicate the same server-derived state across multiple contexts.

## Forms

- Validate on submit and on blur.
- Show field-level errors near the field, not only one generic form error.
- Disable submit buttons while async work is in flight.
- Keep server/API errors visible after submit failure.

## Loading and Error States

- Every async action should have:
  - a loading state,
  - a disabled duplicate-submit state,
  - a user-readable error fallback.
- Do not silently swallow errors unless the UI has a known safe fallback.

## Responsive Testing

Test important screens at:

- 375 px width
- 768 px width
- 1280 px width

For native, also verify iPhone status bar/safe-area behavior and Android keyboard
behavior.

## Accessibility

- Interactive controls need `accessibilityRole` and meaningful labels.
- Selected tabs/buttons should expose `accessibilityState`.
- Text contrast should target at least 4.5:1 for body-sized text.
- Do not rely on color alone for form errors or selected states.
- Keep tap targets large enough for mobile use.

## Performance

- Avoid adding heavy libraries for one-off UI.
- Keep images optimized and reused through `BrandImage`.
- Lazy-load heavy screens/components only when bundle size becomes a measured
  problem. Native Expo screens are already separated at the app tab level, but the
  current large screen files should be split before adding more features.
