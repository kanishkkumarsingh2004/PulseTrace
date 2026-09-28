import { TelemetryPayload } from '@pulsetrace/types';

const SENSITIVE_HEADERS = new Set([
  'authorization',
  'cookie',
  'set-cookie',
  'x-api-key',
  'x-auth-token',
  'proxy-authorization',
]);

const SENSITIVE_QUERY_PARAMS = new Set([
  'password',
  'secret',
  'token',
  'access_token',
  'api_key',
  'apikey',
  'auth',
]);

/**
 * Sanitizes telemetry headers and query params to scrub sensitive credentials.
 */
export function sanitizeTelemetryPayload(payload: TelemetryPayload): TelemetryPayload {
  const sanitized = { ...payload };

  if (sanitized.request.headers) {
    const cleanHeaders: Record<string, string> = {};
    for (const [key, value] of Object.entries(sanitized.request.headers)) {
      if (SENSITIVE_HEADERS.has(key.toLowerCase())) {
        cleanHeaders[key] = '[REDACTED]';
      } else {
        cleanHeaders[key] = value;
      }
    }
    sanitized.request.headers = cleanHeaders;
  }

  if (sanitized.request.queryParams) {
    const cleanParams: Record<string, string> = {};
    for (const [key, value] of Object.entries(sanitized.request.queryParams)) {
      if (SENSITIVE_QUERY_PARAMS.has(key.toLowerCase())) {
        cleanParams[key] = '[REDACTED]';
      } else {
        cleanParams[key] = value;
      }
    }
    sanitized.request.queryParams = cleanParams;
  }

  if (sanitized.response?.headers) {
    const cleanRespHeaders: Record<string, string> = {};
    for (const [key, value] of Object.entries(sanitized.response.headers)) {
      if (SENSITIVE_HEADERS.has(key.toLowerCase())) {
        cleanRespHeaders[key] = '[REDACTED]';
      } else {
        cleanRespHeaders[key] = value;
      }
    }
    sanitized.response.headers = cleanRespHeaders;
  }

  return sanitized;
}
