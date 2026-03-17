import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { TelemetryConsentBanner } from './TelemetryConsentBanner';

const SENTRY_KEY = 'sable_sentry_enabled';
const TEST_DSN = 'https://examplePublicKey@o0.ingest.sentry.io/0';

describe('TelemetryConsentBanner', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.stubGlobal('location', { reload: vi.fn() });
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
  });

  // ── visibility ────────────────────────────────────────────────────────────

  it('renders nothing when VITE_SENTRY_DSN is not configured', () => {
    vi.stubEnv('VITE_SENTRY_DSN', '');
    const { container } = render(<TelemetryConsentBanner />);
    expect(container).toBeEmptyDOMElement();
  });

  it('renders nothing when the user has already acknowledged (opted in)', () => {
    vi.stubEnv('VITE_SENTRY_DSN', TEST_DSN);
    localStorage.setItem(SENTRY_KEY, 'true');
    const { container } = render(<TelemetryConsentBanner />);
    expect(container).toBeEmptyDOMElement();
  });

  it('renders nothing when the user has already opted out', () => {
    vi.stubEnv('VITE_SENTRY_DSN', TEST_DSN);
    localStorage.setItem(SENTRY_KEY, 'false');
    const { container } = render(<TelemetryConsentBanner />);
    expect(container).toBeEmptyDOMElement();
  });

  it('renders the banner when DSN is configured and no preference is saved', () => {
    vi.stubEnv('VITE_SENTRY_DSN', TEST_DSN);
    render(<TelemetryConsentBanner />);
    expect(screen.getByRole('region', { name: /crash reporting notice/i })).toBeInTheDocument();
    expect(screen.getByText(/crash reporting is enabled/i)).toBeInTheDocument();
  });

  // ── accessibility ─────────────────────────────────────────────────────────

  it('has both action buttons visible', () => {
    vi.stubEnv('VITE_SENTRY_DSN', TEST_DSN);
    render(<TelemetryConsentBanner />);
    expect(screen.getByRole('button', { name: /got it/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /opt out/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /dismiss/i })).toBeInTheDocument();
  });

  it('includes a link to the privacy policy', () => {
    vi.stubEnv('VITE_SENTRY_DSN', TEST_DSN);
    render(<TelemetryConsentBanner />);
    expect(screen.getByRole('link', { name: /learn more/i })).toBeInTheDocument();
  });

  // ── "Got it" action ───────────────────────────────────────────────────────

  it('"Got it" saves opted-in preference to localStorage', () => {
    vi.stubEnv('VITE_SENTRY_DSN', TEST_DSN);
    render(<TelemetryConsentBanner />);
    fireEvent.click(screen.getByRole('button', { name: /got it/i }));
    expect(localStorage.getItem(SENTRY_KEY)).toBe('true');
  });

  it('"Got it" does not reload the page', () => {
    vi.stubEnv('VITE_SENTRY_DSN', TEST_DSN);
    render(<TelemetryConsentBanner />);
    fireEvent.click(screen.getByRole('button', { name: /got it/i }));
    expect(window.location.reload).not.toHaveBeenCalled();
  });

  // ── dismiss (✕) action ────────────────────────────────────────────────────

  it('dismiss button (✕) saves opted-in preference to localStorage', () => {
    vi.stubEnv('VITE_SENTRY_DSN', TEST_DSN);
    render(<TelemetryConsentBanner />);
    fireEvent.click(screen.getByRole('button', { name: /dismiss/i }));
    expect(localStorage.getItem(SENTRY_KEY)).toBe('true');
  });

  it('dismiss button does not reload the page', () => {
    vi.stubEnv('VITE_SENTRY_DSN', TEST_DSN);
    render(<TelemetryConsentBanner />);
    fireEvent.click(screen.getByRole('button', { name: /dismiss/i }));
    expect(window.location.reload).not.toHaveBeenCalled();
  });

  // ── "Opt out" action ──────────────────────────────────────────────────────

  it('"Opt out" saves opted-out preference to localStorage', () => {
    vi.stubEnv('VITE_SENTRY_DSN', TEST_DSN);
    render(<TelemetryConsentBanner />);
    fireEvent.click(screen.getByRole('button', { name: /opt out/i }));
    expect(localStorage.getItem(SENTRY_KEY)).toBe('false');
  });

  it('"Opt out" reloads the page', () => {
    vi.stubEnv('VITE_SENTRY_DSN', TEST_DSN);
    render(<TelemetryConsentBanner />);
    fireEvent.click(screen.getByRole('button', { name: /opt out/i }));
    expect(window.location.reload).toHaveBeenCalledOnce();
  });
});
