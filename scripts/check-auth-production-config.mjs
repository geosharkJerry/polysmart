#!/usr/bin/env node

const required = [
  "LOGTO_ENDPOINT",
  "LOGTO_APP_ID",
  "LOGTO_APP_SECRET",
  "LOGTO_COOKIE_SECRET",
  "TURNSTILE_SITE_KEY",
  "TURNSTILE_SECRET_KEY"
];

const placeholderPatterns = [
  /placeholder/i,
  /example\.com/i,
  /^replace-with/i,
  /^test_/i,
  /^dummy/i,
  /^changeme/i,
  /^your-/i
];

const problems = [];

for (const key of required) {
  const value = (process.env[key] || "").trim();
  if (!value) {
    problems.push(`${key}: missing`);
    continue;
  }

  if (placeholderPatterns.some((pattern) => pattern.test(value))) {
    problems.push(`${key}: placeholder-looking value`);
  }
}

if (problems.length) {
  console.error("[polysmart] Auth production config check failed:");
  for (const line of problems) {
    console.error(`- ${line}`);
  }
  process.exit(1);
}

console.log("[polysmart] Auth production config check passed.");
