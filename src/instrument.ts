/**
 * Sentry instrumentation - MUST be imported first in the application lifecycle
 *
 * Configure via environment variables:
 * - VITE_SENTRY_DSN: Your Sentry DSN (required to enable Sentry)
 * - VITE_SENTRY_ENVIRONMENT: Environment name (defaults to MODE)
 * - VITE_APP_VERSION: Release version for tracking
 */
import * as Sentry from '@sentry/react';
import React from 'react';
import {
  useLocation,
  useNavigationType,
  createRoutesFromChildren,
  matchRoutes,
} from 'react-router-dom';

const dsn = import.meta.env.VITE_SENTRY_DSN;
const environment = import.meta.env.VITE_SENTRY_ENVIRONMENT || import.meta.env.MODE;
const release = import.meta.env.VITE_APP_VERSION;

// Per-session error event counter for rate limiting
let sessionErrorCount = 0;
const SESSION_ERROR_LIMIT = 50;

// Check user preferences
const sentryEnabled = localStorage.getItem('sable_sentry_enabled') !== 'false';
const replayEnabled = localStorage.getItem('sable_sentry_replay_enabled') === 'true';

// Only initialize if DSN is provided and user hasn't opted out
if (dsn && sentryEnabled) {
  Sentry.init({
    dsn,
    environment,
    release,

    // Do not send PII (IP addresses, user identifiers) to protect privacy
    sendDefaultPii: false,

    integrations: [
      // React Router v6 browser tracing integration
      Sentry.reactRouterV6BrowserTracingIntegration({
        useEffect: React.useEffect,
        useLocation,
        useNavigationType,
        createRoutesFromChildren,
        matchRoutes,
      }),
      // Session replay with privacy settings (only if user opted in)
      ...(replayEnabled
        ? [
            Sentry.replayIntegration({
              maskAllText: true, // Mask all text for privacy
              blockAllMedia: true, // Block images/video/audio for privacy
              maskAllInputs: true, // Mask form inputs
            }),
          ]
        : []),
      // Capture console.error/warn as structured logs in the Sentry Logs product
      Sentry.consoleLoggingIntegration({ levels: ['error', 'warn'] }),
      // Browser profiling — captures JS call stacks during Sentry transactions
      Sentry.browserProfilingIntegration(),
    ],

    // Performance Monitoring - Tracing
    // 100% in development and preview, lower in production for cost control
    tracesSampleRate: environment === 'development' || environment === 'preview' ? 1.0 : 0.1,

    // Browser profiling — profiles every sampled session (requires Document-Policy: js-profiling response header)
    profileSessionSampleRate: environment === 'development' || environment === 'preview' ? 1.0 : 0.1,

    // Control which URLs get distributed tracing headers
    tracePropagationTargets: [
      'localhost',
      /^https:\/\/[^/]*\.sable\.chat/,
      // Add your Matrix homeserver domains here if needed
    ],

    // Session Replay sampling
    // Record 100% in development and preview for testing, 10% in production
    // Always record 100% of sessions with errors
    replaysSessionSampleRate:
      environment === 'development' || environment === 'preview' ? 1.0 : 0.1,
    replaysOnErrorSampleRate: 1.0,

    // Enable structured logging to Sentry
    enableLogs: true,

    // Scrub sensitive data from structured logs before sending to Sentry
    beforeSendLog(log) {
      // Drop debug-level logs in production to reduce noise and quota usage
      if (log.level === 'debug' && environment === 'production') return null;
      // Redact Matrix IDs and tokens from log messages
      if (typeof log.message === 'string') {
        // eslint-disable-next-line no-param-reassign
        log.message = log.message
          .replace(
            /(access_token|password|token|refresh_token|session_id|sync_token|next_batch)([=:\s]+)([^\s&]+)/gi,
            '$1$2[REDACTED]'
          )
          .replace(/@[^:]+:[^\s]+/g, '@[USER_ID]')
          .replace(/![^:]+:[^\s]+/g, '![ROOM_ID]')
          .replace(/\$[^:\s]+/g, '$[EVENT_ID]');
      }
      return log;
    },

    // Rate limiting: cap error events per page-load session to avoid quota exhaustion.
    // Separate counters for errors and transactions so perf traces do not drain the error budget.
    beforeSendTransaction(event) {
      return event;
    },

    // Sanitize sensitive data from all breadcrumb messages before sending to Sentry
    beforeBreadcrumb(breadcrumb) {
      if (!breadcrumb.message) return breadcrumb;
      // Always apply redaction — both token values and Matrix entity IDs.
      // Do NOT use single-character patterns like '@', '!', '$' as they are far too broad.
      const redacted = breadcrumb.message
        // Redact token key=value pairs (e.g. access_token=abc123)
        .replace(
          /(access_token|password|refresh_token|device_id|session_id|sync_token|next_batch)([=:\s]+)([^\s&"']+)/gi,
          '$1$2[REDACTED]'
        )
        // Redact full Matrix user IDs: @localpart:server.tld
        .replace(/@[^\s:@]+:[^\s,'"(){}\[\]]+/g, '@[USER_ID]')
        // Redact full Matrix room IDs: !opaque:server.tld
        .replace(/![^\s:]+:[^\s,'"(){}\[\]]+/g, '![ROOM_ID]')
        // Redact Matrix event IDs: $base64Url (at least 10 chars to avoid false positives)
        .replace(/\$[A-Za-z0-9\-_+/]{10,}/g, '$[EVENT_ID]');
      return redacted === breadcrumb.message ? breadcrumb : { ...breadcrumb, message: redacted };
    },

    beforeSend(event, hint) {
      sessionErrorCount += 1;
      if (sessionErrorCount > SESSION_ERROR_LIMIT) {
        return null; // Drop event — session limit reached
      }

      // Improve grouping for Matrix API errors.
      // MatrixError objects carry an `errcode` (e.g. M_FORBIDDEN, M_NOT_FOUND) — use it to
      // split errors into meaningful issue groups rather than merging them all by stack trace.
      const originalException = hint?.originalException;
      if (
        originalException !== null &&
        typeof originalException === 'object' &&
        'errcode' in originalException &&
        typeof (originalException as Record<string, unknown>).errcode === 'string'
      ) {
        const errcode = (originalException as Record<string, unknown>).errcode as string;
        // Preserve default grouping AND split by errcode
        // eslint-disable-next-line no-param-reassign
        event.fingerprint = ['{{ default }}', errcode];
      }

      // Scrub sensitive data from error messages
      if (event.message) {
        if (
          event.message.includes('access_token') ||
          event.message.includes('password') ||
          event.message.includes('token')
        ) {
          // eslint-disable-next-line no-param-reassign
          event.message = event.message.replace(
            /(access_token|password|token|refresh_token|session_id|sync_token|next_batch)([=:]\s*)([^\s&]+)/gi,
            '$1$2[REDACTED]'
          );
        }
        // Redact Matrix IDs to protect user privacy
        // eslint-disable-next-line no-param-reassign
        event.message = event.message.replace(/@[^:]+:[^\s]+/g, '@[USER_ID]');
        // eslint-disable-next-line no-param-reassign
        event.message = event.message.replace(/![^:]+:[^\s]+/g, '![ROOM_ID]');
        // eslint-disable-next-line no-param-reassign
        event.message = event.message.replace(/\$[^:\s]+/g, '$[EVENT_ID]');
      }

      // Scrub sensitive data from exception values
      if (event.exception?.values) {
        event.exception.values.forEach((exception) => {
          if (exception.value) {
            // eslint-disable-next-line no-param-reassign
            exception.value = exception.value.replace(
              /(access_token|password|token|refresh_token|session_id|sync_token|next_batch)([=:]\s*)([^\s&]+)/gi,
              '$1$2[REDACTED]'
            );
            // Redact Matrix IDs
            // eslint-disable-next-line no-param-reassign
            exception.value = exception.value.replace(/@[^:]+:[^\s]+/g, '@[USER_ID]');
            // eslint-disable-next-line no-param-reassign
            exception.value = exception.value.replace(/![^:]+:[^\s]+/g, '![ROOM_ID]');
            // eslint-disable-next-line no-param-reassign
            exception.value = exception.value.replace(/\$[^:\s]+/g, '$[EVENT_ID]');
          }
        });
      }

      // Scrub request data
      if (event.request?.url) {
        // eslint-disable-next-line no-param-reassign
        event.request.url = event.request.url.replace(
          /(access_token|password|token)([=:]\s*)([^\s&]+)/gi,
          '$1$2[REDACTED]'
        );
      }

      if (event.request?.headers) {
        const headers = event.request.headers as Record<string, string>;
        if (headers.Authorization) {
          headers.Authorization = '[REDACTED]';
        }
      }

      return event;
    },
  });

  // Expose Sentry globally for debugging and console testing
  // Set app-wide attributes on the global scope so they appear on all events and logs
  Sentry.getGlobalScope().setAttributes({
    'app.name': 'sable',
    'app.version': release ?? 'unknown',
  });

  // Tag all events with the PR number when running in a PR preview deployment
  const prNumber = import.meta.env.VITE_SENTRY_PR;
  if (prNumber) {
    Sentry.getGlobalScope().setTag('pr', prNumber);
  }

  // @ts-expect-error - Adding to window for debugging
  window.Sentry = Sentry;

  // eslint-disable-next-line no-console
  console.info(
    `[Sentry] Initialized for ${environment} environment${replayEnabled ? ' with Session Replay' : ''}`
  );
  // eslint-disable-next-line no-console
  console.info(`[Sentry] DSN configured: ${dsn?.substring(0, 30)}...`);
  // eslint-disable-next-line no-console
  console.info(`[Sentry] Release: ${release || 'not set'}`);
} else if (!sentryEnabled) {
  // eslint-disable-next-line no-console
  console.info('[Sentry] Disabled by user preference');
} else {
  // eslint-disable-next-line no-console
  console.info('[Sentry] Disabled - no DSN provided');
}

// Export Sentry for use in other parts of the application
export { Sentry };
