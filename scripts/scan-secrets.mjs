import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';

const skippedPaths = new Set(['package-lock.json', 'scripts/scan-secrets.mjs']);
const skippedExtensions = new Set(['.avif', '.gif', '.jpeg', '.jpg', '.png', '.webp']);

const patterns = [
  {
    name: 'private key',
    regex: /-----BEGIN (?:RSA |EC |OPENSSH |DSA )?PRIVATE KEY-----/,
  },
  {
    name: 'Supabase service role secret',
    regex: /\b(?:SUPABASE_SERVICE_ROLE_KEY|service_role)\b/i,
  },
  {
    name: 'Google API key',
    regex: /\bAIza[0-9A-Za-z_-]{35}\b/,
  },
  {
    name: 'GitHub token',
    regex: /\b(?:ghp_[0-9A-Za-z_]{36,}|github_pat_[0-9A-Za-z_]+)\b/,
  },
  {
    name: 'Slack token',
    regex: /\bxox[baprs]-[0-9A-Za-z-]+\b/,
  },
  {
    name: 'Stripe secret key',
    regex: /\bsk_(?:live|test)_[0-9A-Za-z]+\b/,
  },
  {
    name: 'Resend API key',
    regex: /\bre_[0-9A-Za-z_-]{20,}\b/,
  },
];

const files = execFileSync('git', ['ls-files', '-z'], { encoding: 'utf8' })
  .split('\0')
  .filter(Boolean)
  .filter((file) => !skippedPaths.has(file))
  .filter((file) => {
    const extension = file.slice(file.lastIndexOf('.')).toLowerCase();
    return !skippedExtensions.has(extension);
  });

const findings = [];

for (const file of files) {
  let content;

  try {
    content = readFileSync(file, 'utf8');
  } catch {
    continue;
  }

  const lines = content.split(/\r?\n/);

  lines.forEach((line, index) => {
    const trimmedLine = line.trim();

    if (
      trimmedLine.startsWith('#') ||
      trimmedLine.startsWith('//') ||
      trimmedLine.startsWith('--') ||
      trimmedLine.startsWith('*')
    ) {
      return;
    }

    for (const pattern of patterns) {
      if (pattern.regex.test(line)) {
        findings.push(`${file}:${index + 1} matched ${pattern.name}`);
      }
    }
  });
}

if (findings.length > 0) {
  console.error('Potential committed secrets found:');
  findings.forEach((finding) => console.error(`- ${finding}`));
  process.exit(1);
}

console.log('No committed secrets matched the scanner patterns.');
