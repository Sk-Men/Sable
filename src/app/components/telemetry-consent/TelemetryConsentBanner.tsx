import { useEffect, useRef, useState } from 'react';
import { Box, Button, Icon, IconButton, Icons, Text } from 'folds';
import * as css from './TelemetryConsentBanner.css';

const SENTRY_KEY = 'sable_sentry_enabled';

export function TelemetryConsentBanner() {
  const isSentryConfigured = Boolean(import.meta.env.VITE_SENTRY_DSN);
  const [visible, setVisible] = useState(
    isSentryConfigured && localStorage.getItem(SENTRY_KEY) === null
  );
  const [dismissing, setDismissing] = useState(false);
  const dismissTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(
    () => () => {
      if (dismissTimerRef.current) clearTimeout(dismissTimerRef.current);
    },
    []
  );

  if (!visible) return null;

  const handleAcknowledge = () => {
    localStorage.setItem(SENTRY_KEY, 'true');
    setDismissing(true);
    dismissTimerRef.current = setTimeout(() => setVisible(false), 220);
  };

  const handleOptOut = () => {
    localStorage.setItem(SENTRY_KEY, 'false');
    window.location.reload();
  };

  return (
    <div className={css.Container}>
      <div
        className={css.Banner}
        data-dismissing={dismissing}
        role="region"
        aria-label="Crash reporting notice"
      >
        <div className={css.Header}>
          <Icon src={Icons.Shield} size="400" />
          <div className={css.HeaderText}>
            <Text size="H4">Crash reporting is enabled</Text>
            <Text size="T300" priority="300">
              Sable sends anonymous crash reports to help us fix bugs faster. No messages, room
              names, or personal data are included.{' '}
              <a
                href="https://github.com/SableClient/Sable/blob/dev/docs/PRIVACY.md"
                target="_blank"
                rel="noreferrer noopener"
              >
                Learn more
              </a>
            </Text>
          </div>
          <IconButton
            size="300"
            variant="Surface"
            fill="None"
            radii="300"
            onClick={handleAcknowledge}
            aria-label="Dismiss"
          >
            <Icon size="100" src={Icons.Cross} />
          </IconButton>
        </div>
        <Box className={css.Actions}>
          <Button variant="Secondary" fill="Soft" size="300" radii="300" onClick={handleOptOut}>
            <Text size="B300">Opt out</Text>
          </Button>
          <Button variant="Primary" fill="Solid" size="300" radii="300" onClick={handleAcknowledge}>
            <Text size="B300">Got it</Text>
          </Button>
        </Box>
      </div>
    </div>
  );
}
