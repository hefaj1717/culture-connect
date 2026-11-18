#!/usr/bin/env bash

set -euo pipefail

PROJECT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
ANDROID_ADB="${ADB_BIN:-${ANDROID_HOME:-$HOME/Library/Android/sdk}/platform-tools/adb}"
MAESTRO_CLI="${MAESTRO_BIN:-$HOME/.maestro/bin/maestro}"
METRO_LOG="${TMPDIR:-/tmp}/culturequest-e2e-metro.log"

cd "$PROJECT_DIR"

if [[ ! -x "$ANDROID_ADB" ]]; then
  echo "Android adb was not found at: $ANDROID_ADB" >&2
  exit 1
fi

if [[ ! -x "$MAESTRO_CLI" ]]; then
  echo "Maestro was not found at: $MAESTRO_CLI" >&2
  echo "Install it with: curl -Ls https://get.maestro.mobile.dev | bash" >&2
  exit 1
fi

if ! "$ANDROID_ADB" devices | awk 'NR > 1 && $2 == "device" { found = 1 } END { exit !found }'; then
  echo "No running Android device was found." >&2
  echo "Start an ARM64 emulator (Apple Silicon) or connect an Android phone, then retry." >&2
  exit 1
fi

if curl -fsS http://localhost:8081/status >/dev/null 2>&1; then
  echo "Metro is already running on port 8081." >&2
  echo "Stop the existing Expo process before starting the isolated E2E run." >&2
  exit 1
fi

npx supabase start >/dev/null

if [[ "${E2E_SKIP_RESET:-false}" != "true" ]]; then
  npx supabase db reset --local
fi

SUPABASE_ANON_KEY="$({ npx supabase status -o env 2>/dev/null || true; } | sed -n 's/^ANON_KEY="\(.*\)"$/\1/p')"
if [[ -z "$SUPABASE_ANON_KEY" ]]; then
  echo "Could not read the local Supabase anon key." >&2
  exit 1
fi

"$ANDROID_ADB" reverse tcp:8081 tcp:8081
"$ANDROID_ADB" reverse tcp:54321 tcp:54321

EXPO_PUBLIC_SUPABASE_URL=http://127.0.0.1:54321 \
EXPO_PUBLIC_SUPABASE_ANON_KEY="$SUPABASE_ANON_KEY" \
EXPO_PUBLIC_E2E_MODE=true \
EXPO_PUBLIC_E2E_EVENT_CODE=culturequest:event:e2e-live-check-in-token \
CI=1 \
npx expo start --localhost ${E2E_CLEAR_METRO:+--clear} >"$METRO_LOG" 2>&1 &
METRO_PID=$!

cleanup() {
  kill "$METRO_PID" 2>/dev/null || true
  wait "$METRO_PID" 2>/dev/null || true
}
trap cleanup EXIT INT TERM

for _ in $(seq 1 60); do
  if curl -fsS http://localhost:8081/status >/dev/null 2>&1; then
    break
  fi
  sleep 1
done

if ! curl -fsS http://localhost:8081/status >/dev/null 2>&1; then
  echo "Metro did not start. See: $METRO_LOG" >&2
  exit 1
fi

# Clear Expo Go so every run starts from the same application state.
"$ANDROID_ADB" shell pm clear host.exp.exponent >/dev/null
"$ANDROID_ADB" shell am start \
  -a android.intent.action.VIEW \
  -d exp://127.0.0.1:8081 \
  host.exp.exponent >/dev/null

for _ in $(seq 1 90); do
  if grep -q "Android Bundled" "$METRO_LOG"; then
    break
  fi
  sleep 1
done

if ! grep -q "Android Bundled" "$METRO_LOG"; then
  echo "The Android bundle did not finish. See: $METRO_LOG" >&2
  exit 1
fi

# Expo Go opens its developer-menu introduction asynchronously after the first
# bundle render. Wait for the actual native button instead of relying on a fixed
# delay, then dismiss it before Maestro starts asserting the React Native tree.
for _ in $(seq 1 30); do
  WINDOW_XML="$(
    "$ANDROID_ADB" shell uiautomator dump /sdcard/culturequest-window.xml >/dev/null 2>&1 &&
      "$ANDROID_ADB" shell cat /sdcard/culturequest-window.xml 2>/dev/null || true
  )"

  if [[ "$WINDOW_XML" == *'text="Continue"'* ]]; then
    DEVICE_SIZE="$($ANDROID_ADB shell wm size | sed -n 's/.*: \([0-9][0-9]*\)x\([0-9][0-9]*\).*/\1 \2/p' | tail -1)"
    read -r DEVICE_WIDTH DEVICE_HEIGHT <<<"$DEVICE_SIZE"
    "$ANDROID_ADB" shell input tap "$((DEVICE_WIDTH / 2))" "$((DEVICE_HEIGHT * 9 / 10))"
    sleep 2
    break
  fi

  sleep 1
done

"$MAESTRO_CLI" test "${E2E_FLOW:-.maestro/flows}"
