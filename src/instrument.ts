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

/**
 * Scrub Matrix-specific identifiers from URLs that appear in Sentry spans, breadcrumbs,
 * transaction names, and page URLs. Covers both Matrix API paths and client-side app routes.
 * Room IDs, user IDs, event IDs, media paths, and deep-link parameters are replaced with
 * safe placeholders so no PII leaks into Sentry.
 */
function scrubMatrixUrl(url: string): string {
  return (
    url
      // ── Matrix Client-Server API paths ──────────────────────────────────────────────
      // /rooms/!roomId:server/...
      .replace(/\/rooms\/![^/?#\s]*/g, '/rooms/![ROOM_ID]')
      // /event/$eventId and /relations/$eventId
      .replace(/\/event\/(?:\$|%24)[^/?#\s]*/g, '/event/$[EVENT_ID]')
      .replace(/\/relations\/(?:\$|%24)[^/?#\s]*/g, '/relations/$[EVENT_ID]')
      // /profile/@user:server  or  /profile/%40user%3Aserver
      .replace(/\/profile\/(?:%40|@)[^/?#\s]*/gi, '/profile/[USER_ID]')
      // /user/@user:server/...  and  /presence/@user:server/status
      .replace(/\/(user|presence)\/(?:%40|@)[^/?#\s]*/gi, '/$1/[USER_ID]')
      // /room_keys/keys/{version}/{roomId}/{sessionId}
      .replace(/\/room_keys\/keys\/[^/?#\s]*/gi, '/room_keys/keys/[REDACTED]')
      // /sendToDevice/{eventType}/{txnId}
      .replace(/\/sendToDevice\/([^/?#\s]+)\/[^/?#\s]+/gi, '/sendToDevice/$1/[TXN_ID]')
      // Media – MSC3916 (/media/thumbnail|download/{server}/{mediaId}) and legacy (v1/v3)
      .replace(
        /(\/media\/(?:thumbnail|download)\/)(?:[^/?#\s]+)\/(?:[^/?#\s]+)/gi,
        '$1[SERVER]/[MEDIA_ID]'
      )
      .replace(
        /(\/media\/v\d+\/(?:thumbnail|download)\/)(?:[^/?#\s]+)\/(?:[^/?#\s]+)/gi,
        '$1[SERVER]/[MEDIA_ID]'
      )
      // ── App route path segments ─────────────────────────────────────────────────────
      // Bare Matrix room/space IDs in URL segments: /!roomId:server/
      .replace(/\/![^/?#\s:]+:[^/?#\s]*/g, '/![ROOM_ID]')
      // Bare Matrix user IDs in URL segments: /@user:server/
      .replace(/\/@[^/?#\s:]+:[^/?#\s]*/g, '/@[USER_ID]')
      // ── Deep-link push notification URLs (percent-encoded) ─────────────────────────
      // URL-encoded user IDs: /%40user%3Aserver  (%40 = @)
      .replace(/\/%40[^/?#\s]*/gi, '/[USER_ID]')
      // URL-encoded room IDs: /%21room%3Aserver  (%21 = !)
      .replace(/\/%21[^/?#\s]*/gi, '/![ROOM_ID]')
      // ── Preview URL endpoint ────────────────────────────────────────────────────────
      // The ?url= query parameter on preview_url contains the full external URL being
      // previewed — strip the entire query string so browsing habits cannot be inferred.
      .replace(/(\/preview_url)\?[^#\s]*/gi, '$1')
  );
}

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
    profileSessionSampleRate:
      environment === 'development' || environment === 'preview' ? 1.0 : 0.1,

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
      // Scrub Matrix identifiers from the transaction name (the matched route or page URL).
      // React Router normally parameterises routes (e.g. /home/:roomIdOrAlias/) but falls
      // back to the raw URL when matching fails, so we scrub defensively here.
      if (event.transaction) {
        // eslint-disable-next-line no-param-reassign
        event.transaction = scrubMatrixUrl(event.transaction);
      }

      // Scrub Matrix identifiers from HTTP span descriptions and data URLs
      if (event.spans) {
        // eslint-disable-next-line no-param-reassign
        event.spans = event.spans.map((span) => {
          const newDesc = span.description ? scrubMatrixUrl(span.description) : span.description;
          const spanData = span.data as Record<string, unknown> | undefined;
          const spanHttpUrl = spanData?.['http.url'];
          const rawHttpUrl = typeof spanHttpUrl === 'string' ? spanHttpUrl : undefined;
          const newHttpUrl = rawHttpUrl ? scrubMatrixUrl(rawHttpUrl) : undefined;

          const descChanged = newDesc !== span.description;
          const urlChanged = newHttpUrl !== undefined && newHttpUrl !== rawHttpUrl;

          if (!descChanged && !urlChanged) return span;
          return {
            ...span,
            ...(descChanged ? { description: newDesc } : {}),
            ...(urlChanged ? { data: { ...spanData, 'http.url': newHttpUrl } } : {}),
          };
        });
      }
      return event;
    },

    // Sanitize sensitive data from all breadcrumb messages and HTTP data URLs before sending to Sentry
    beforeBreadcrumb(breadcrumb) {
      // Scrub Matrix paths from HTTP breadcrumb data.url (captures full request URLs)
      const bData = breadcrumb.data as Record<string, unknown> | undefined;
      const rawUrl = typeof bData?.url === 'string' ? bData.url : undefined;
      const scrubbedUrl = rawUrl ? scrubMatrixUrl(rawUrl) : undefined;
      const urlChanged = scrubbedUrl !== undefined && scrubbedUrl !== rawUrl;

      // Scrub Matrix paths from navigation breadcrumb data.from / data.to (page URLs that
      // may contain room IDs or user IDs as path segments in the app's client-side routes)
      const rawFrom = typeof bData?.from === 'string' ? bData.from : undefined;
      const rawTo = typeof bData?.to === 'string' ? bData.to : undefined;
      const scrubbedFrom = rawFrom ? scrubMatrixUrl(rawFrom) : undefined;
      const scrubbedTo = rawTo ? scrubMatrixUrl(rawTo) : undefined;
      const fromChanged = scrubbedFrom !== undefined && scrubbedFrom !== rawFrom;
      const toChanged = scrubbedTo !== undefined && scrubbedTo !== rawTo;

      // Scrub message text — token values and Matrix entity IDs
      // Do NOT use single-character patterns like '@', '!', '$' as they are far too broad.
      const message = breadcrumb.message
        ? breadcrumb.message
            .replace(
              /(access_token|password|refresh_token|device_id|session_id|sync_token|next_batch)([=:\s]+)([^\s&"']+)/gi,
              '$1$2[REDACTED]'
            )
            .replace(/@[^\s:@]+:[^\s,'"(){}[\]]+/g, '@[USER_ID]')
            .replace(/![^\s:]+:[^\s,'"(){}[\]]+/g, '![ROOM_ID]')
            .replace(/\$[A-Za-z0-9_+/-]{10,}/g, '$[EVENT_ID]')
        : breadcrumb.message;
      const messageChanged = message !== breadcrumb.message;

      if (!messageChanged && !urlChanged && !fromChanged && !toChanged) return breadcrumb;
      return {
        ...breadcrumb,
        ...(messageChanged ? { message } : {}),
        ...(urlChanged || fromChanged || toChanged
          ? {
              data: {
                ...bData,
                ...(urlChanged ? { url: scrubbedUrl } : {}),
                ...(fromChanged ? { from: scrubbedFrom } : {}),
                ...(toChanged ? { to: scrubbedTo } : {}),
              },
            }
          : {}),
      };
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
            // Scrub Matrix URL patterns embedded in error message strings
            // (e.g. MatrixError: "Got error 403 (https://.../preview_url?url=https://...)"
            // or paths containing room/user/event IDs)
            // eslint-disable-next-line no-param-reassign
            exception.value = scrubMatrixUrl(exception.value);
          }
        });
      }

      // Scrub request data
      if (event.request?.url) {
        // eslint-disable-next-line no-param-reassign
        event.request.url = scrubMatrixUrl(
          event.request.url.replace(
            /(access_token|password|token)([=:]\s*)([^\s&]+)/gi,
            '$1$2[REDACTED]'
          )
        );
      }

      // Scrub the transaction name on error events (set when the error occurred during a
      // page-load or navigation transaction — raw URL leaks here when route matching fails)
      if (event.transaction) {
        // eslint-disable-next-line no-param-reassign
        event.transaction = scrubMatrixUrl(event.transaction);
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
