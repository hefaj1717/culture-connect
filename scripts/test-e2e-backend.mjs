import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';

const STUDENT_EMAIL = 'student.e2e@culturequest.local';
const STUDENT_PASSWORD = 'CultureQuestE2E!2026';
const STUDENT_ID = '10000000-0000-4000-8000-000000000001';
const EVENT_ID = '40000000-0000-4000-8000-000000000004';
const REWARD_ID = '50000000-0000-4000-8000-000000000005';
const QUEST_ID = '60000000-0000-4000-8000-000000000006';
const EVENT_CODE = 'culturequest:event:e2e-live-check-in-token';
const QUEST_CODE = 'culturequest:quest:e2e-completion-token';

if (process.env.E2E_SKIP_RESET !== 'true') {
  execFileSync('npx', ['supabase', 'db', 'reset', '--local'], { stdio: 'inherit' });
}

const statusOutput = execFileSync('npx', ['supabase', 'status', '-o', 'env'], {
  encoding: 'utf8',
});
const localEnv = Object.fromEntries(
  statusOutput
    .split('\n')
    .map((line) => line.match(/^([A-Z_]+)="(.*)"$/))
    .filter(Boolean)
    .map((match) => [match[1], match[2]]),
);
const apiUrl = process.env.E2E_SUPABASE_URL ?? localEnv.API_URL;
const anonKey = process.env.E2E_SUPABASE_ANON_KEY ?? localEnv.ANON_KEY;

assert.ok(apiUrl, 'Local Supabase API URL is unavailable. Run `npx supabase start`.');
assert.ok(anonKey, 'Local Supabase anon key is unavailable. Run `npx supabase start`.');

async function request(path, { body, method = 'GET', token } = {}) {
  const response = await fetch(`${apiUrl}${path}`, {
    method,
    headers: {
      apikey: anonKey,
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(body ? { 'Content-Type': 'application/json' } : {}),
      Prefer: 'return=representation',
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  const text = await response.text();
  const payload = text ? JSON.parse(text) : null;

  assert.equal(
    response.ok,
    true,
    `${method} ${path} failed (${response.status}): ${JSON.stringify(payload)}`,
  );
  return payload;
}

const session = await request('/auth/v1/token?grant_type=password', {
  body: { email: STUDENT_EMAIL, password: STUDENT_PASSWORD },
  method: 'POST',
});
assert.ok(session.access_token, 'The seeded student could not sign in.');
const token = session.access_token;

const rsvp = await request('/rest/v1/user_event_responses', {
  body: { event_id: EVENT_ID, status: 'going', user_id: STUDENT_ID },
  method: 'POST',
  token,
});
assert.equal(rsvp[0]?.status, 'going', 'RSVP was not saved as going.');

const attendance = await request('/rest/v1/rpc/confirm_organizer_event_attendance', {
  body: {
    _check_in_code: EVENT_CODE,
    _event_id: EVENT_ID,
    _user_lat: 51.2478,
    _user_lng: 22.5601,
  },
  method: 'POST',
  token,
});
assert.equal(attendance.success, true, `Check-in failed: ${JSON.stringify(attendance)}`);
assert.equal(attendance.duplicate, false, 'First check-in was incorrectly marked duplicate.');

const duplicateAttendance = await request('/rest/v1/rpc/confirm_organizer_event_attendance', {
  body: {
    _check_in_code: EVENT_CODE,
    _event_id: EVENT_ID,
    _user_lat: 51.2478,
    _user_lng: 22.5601,
  },
  method: 'POST',
  token,
});
assert.equal(duplicateAttendance.success, true, 'Duplicate check-in should be idempotent.');
assert.equal(duplicateAttendance.duplicate, true, 'Duplicate check-in was not detected.');

const quest = await request('/rest/v1/rpc/complete_quest', {
  body: { _completion_code: QUEST_CODE, _quest_id: QUEST_ID },
  method: 'POST',
  token,
});
assert.equal(quest.success, true, `Quest completion failed: ${JSON.stringify(quest)}`);

const redemption = await request('/rest/v1/rpc/redeem_organizer_reward', {
  body: { _reward_id: REWARD_ID },
  method: 'POST',
  token,
});
assert.equal(redemption.success, true, `Reward redemption failed: ${JSON.stringify(redemption)}`);
assert.equal(redemption.duplicate, false, 'First reward redemption was incorrectly marked duplicate.');
assert.equal(redemption.qc_spent, 5, 'Reward did not spend the expected 5 QC.');

const duplicateRedemption = await request('/rest/v1/rpc/redeem_organizer_reward', {
  body: { _reward_id: REWARD_ID },
  method: 'POST',
  token,
});
assert.equal(duplicateRedemption.success, true, 'Duplicate reward redemption should be idempotent.');
assert.equal(duplicateRedemption.duplicate, true, 'Duplicate reward redemption was not detected.');

const profiles = await request(
  `/rest/v1/profiles?id=eq.${STUDENT_ID}&select=total_xp,total_qc`,
  { token },
);
assert.deepEqual(
  profiles[0],
  { total_qc: 25, total_xp: 80 },
  'Final XP/QC totals do not match event + quest - reward.',
);

console.log('E2E backend journey passed: login -> RSVP -> QR -> XP/QC -> quest -> reward.');
