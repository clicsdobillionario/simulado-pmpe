export const MODELS = [
  'gemini-3.8-flash',
  'gemini-flash-latest',
  'gemini-flash-lite-latest'
];

export const RETRY_STATUS_CODES = [429, 503];

export const MAX_RETRIES_PER_MODEL = 2;
export const MAX_TOTAL_ATTEMPTS = 5;

export const BASE_DELAY_MS = 3000;
export const MAX_DELAY_MS = 60000;

export const BATCH_SIZE = 50;
export const REQUEST_DELAY_MS = 13000;

export function parseRetryAfter(errorMessage) {
  const match = /retry in ([\d.]+)s/i.exec(errorMessage || '');
  return match ? Math.ceil(parseFloat(match[1]) * 1000) + 500 : null;
}

export function getModelForAttempt(attemptIndex) {
  return MODELS[Math.min(attemptIndex, MODELS.length - 1)];
}

export function calculateBackoff(attempt, retryAfterMs = null) {
  if (retryAfterMs) return retryAfterMs;
  const delay = BASE_DELAY_MS * Math.pow(2, attempt);
  return Math.min(delay + Math.random() * 1000, MAX_DELAY_MS);
}