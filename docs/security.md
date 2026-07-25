# CultureQuest Security Checklist

This app uses Expo React Native on the client and Supabase for authentication,
database access, storage, JWT sessions, password hashing, and Row Level Security.

## Current Guardrails

- Authentication uses Supabase Auth. CultureQuest does not store or hash passwords
  directly.
- Sessions use Supabase JWT access tokens with refresh token rotation enabled in
  `supabase/config.toml`.
- Authorization is enforced in Supabase Row Level Security policies and database
  functions. Frontend role checks are only for user experience.
- App data access uses `@supabase/supabase-js` query builder and RPC calls instead
  of string-concatenated SQL.
- External app requests currently use HTTPS endpoints.
- React Native text rendering escapes output by default. Do not add
  `dangerouslySetInnerHTML`, raw HTML rendering, or string-evaluated code.
- `.env` is ignored by git. Commit only `.env.example` placeholders.
- `npm run security:secrets` scans tracked files for common committed secret
  patterns.
- GitHub Actions runs dependency audit, secret scan, typecheck, and lint on pushes
  and pull requests.

## Production Gates

Before launch, complete these items:

1. **HTTPS everywhere**
   - Use HTTPS-only production APIs, web pages, and admin surfaces.
   - Use a hosting provider certificate or Let's Encrypt.
   - Do not ship any production `http://` redirect URLs.

2. **Auth redirect allowlist**
   - Remove Expo Go development wildcards such as `exp://**` from production
     Supabase redirect URLs.
   - Keep only the production app scheme, App/Universal Links, and owned HTTPS
     domains.

3. **CORS**
   - Native apps do not rely on browser CORS, but any future website, API route, or
     admin panel must allowlist only owned production domains.
   - Never use `Access-Control-Allow-Origin: *` for authenticated production APIs.

4. **SQL injection prevention**
   - Keep using Supabase query builder/RPC.
   - Never build raw SQL strings from user input.
   - Any new RPC should accept typed parameters and enforce authorization inside
     the function or RLS policy.

5. **XSS prevention**
   - Avoid raw HTML rendering.
   - If a web/admin surface is added, set a Content Security Policy and escape all
     user-generated output.

6. **CSRF protection**
   - The native app uses bearer/JWT auth, not cookie sessions.
   - If a cookie-based website/admin is added, use SameSite cookies and CSRF tokens
     for state-changing requests.

7. **Security headers**
   - For any hosted web/admin/API surface, set:
     - `Content-Security-Policy`
     - `X-Frame-Options: DENY`
     - `X-Content-Type-Options: nosniff`
     - `Referrer-Policy: strict-origin-when-cross-origin`
     - `Strict-Transport-Security` after HTTPS is stable

8. **Dependency audit**
   - Run `npm run security:audit` before releases.
   - Do not use `npm audit fix --force` unless the Expo SDK upgrade has been tested
     on the target Expo Go/dev-client version.

9. **Secret scanning**
   - Keep GitHub secret scanning enabled if the repository plan supports it.
   - Run `npm run security:secrets` before commits.
   - Rotate any secret that is ever committed, even if later removed from git.

## Current Audit Status

`npm audit --audit-level=moderate` currently passes. Vulnerable transitive packages
are pinned through `package.json` `overrides` so the Expo SDK version can remain on
the version used for current device testing.
