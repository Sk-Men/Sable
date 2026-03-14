import { forwardRef, useCallback, useImperativeHandle, useRef } from 'react';
import { useVoiceRecorder } from '$plugins/voice-recorder-kit';
import type { VoiceRecorderStopPayload } from '$plugins/voice-recorder-kit';
import { Box, Text, color, config, toRem } from 'folds';

export type AudioMessageRecorderHandle = {
  stop: () => void;
  cancel: () => void;
};

type AudioMessageRecorderProps = {
  onRecordingComplete: (audioBlob: Blob) => void;
  onRequestClose: () => void;
  onWaveformUpdate: (waveform: number[]) => void;
  onAudioLengthUpdate: (length: number) => void;
};

function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${s.toString().padStart(2, '0')}`;
}

const KEYFRAMES = `
@keyframes recDotPulse {
  0%, 100% { opacity: 1; }
  50%       { opacity: 0.25; }
}
`;
if (typeof document !== 'undefined') {
  const styleId = '__audio-recorder-keyframes';
  if (!document.getElementById(styleId)) {
    const style = document.createElement('style');
    style.id = styleId;
    style.textContent = KEYFRAMES;
    document.head.appendChild(style);
  }
}

export const AudioMessageRecorder = forwardRef<
  AudioMessageRecorderHandle,
  AudioMessageRecorderProps
>(({ onRecordingComplete, onRequestClose, onWaveformUpdate, onAudioLengthUpdate }, ref) => {
  const isDismissedRef = useRef(false);
  // Guard against React Strict Mode's double-invoke of the autoStart effect,
  // which fires onstop with a ~110-byte blob before the user does anything.
  const userRequestedStopRef = useRef(false);

  // Keep stable refs for prop callbacks so useVoiceRecorder's internal
  // useCallbacks never need to be recreated (which would reset the timer).
  const onRecordingCompleteRef = useRef(onRecordingComplete);
  onRecordingCompleteRef.current = onRecordingComplete;
  const onRequestCloseRef = useRef(onRequestClose);
  onRequestCloseRef.current = onRequestClose;
  const onWaveformUpdateRef = useRef(onWaveformUpdate);
  onWaveformUpdateRef.current = onWaveformUpdate;
  const onAudioLengthUpdateRef = useRef(onAudioLengthUpdate);
  onAudioLengthUpdateRef.current = onAudioLengthUpdate;

  // Stable stop handler — empty dep array intentional; live values via refs.

  const stableOnStop = useCallback((payload: VoiceRecorderStopPayload) => {
    if (!userRequestedStopRef.current) return;
    if (isDismissedRef.current) return;
    onRecordingCompleteRef.current(payload.audioFile);
    onWaveformUpdateRef.current(payload.waveform);
    onAudioLengthUpdateRef.current(payload.audioLength);
  }, []);

  // Stable delete handler — empty dep array intentional; live values via refs.

  const stableOnDelete = useCallback(() => {
    isDismissedRef.current = true;
    onRequestCloseRef.current();
  }, []);

  const { levels, seconds, handleStop, handleDelete } = useVoiceRecorder({
    autoStart: true,
    onStop: stableOnStop,
    onDelete: stableOnDelete,
  });

  const doStop = useCallback(() => {
    if (isDismissedRef.current) return;
    userRequestedStopRef.current = true;
    handleStop();
  }, [handleStop]);

  const doCancel = useCallback(() => {
    if (isDismissedRef.current) return;
    isDismissedRef.current = true;
    handleDelete();
  }, [handleDelete]);

  useImperativeHandle(ref, () => ({ stop: doStop, cancel: doCancel }), [doStop, doCancel]);

  const BAR_COUNT = 28;
  const step = Math.max(1, levels.length / BAR_COUNT);
  const bars = Array.from(
    { length: BAR_COUNT },
    (_, i) => levels[Math.min(Math.floor(i * step), levels.length - 1)] ?? 0.15
  );

  return (
    <Box
      grow="Yes"
      alignItems="Center"
      gap="200"
      style={{ minWidth: 0, overflow: 'hidden', padding: `0 ${config.space.S200}` }}
    >
      {/* Pulsing red dot */}
      <div
        aria-hidden
        style={{
          width: 7,
          height: 7,
          borderRadius: '50%',
          backgroundColor: color.Critical.Main,
          flexShrink: 0,
          animation: 'recDotPulse 1.4s ease-in-out infinite',
        }}
      />

      {/* Live waveform bars */}
      <Box
        grow="Yes"
        alignItems="Center"
        gap="25"
        style={{ height: 22, overflow: 'hidden', minWidth: 0 }}
      >
        {bars.map((level, i) => (
          <div
            // eslint-disable-next-line react/no-array-index-key
            key={i}
            style={{
              width: 2,
              height: Math.max(3, Math.round(level * 20)),
              borderRadius: 1,
              backgroundColor: color.Primary.Main,
              transition: 'height 70ms ease-out',
              flexShrink: 0,
            }}
          />
        ))}
      </Box>

      {/* Timer */}
      <Text
        size="T200"
        style={{
          fontVariantNumeric: 'tabular-nums',
          color: color.Critical.Main,
          minWidth: toRem(28),
          flexShrink: 0,
          fontWeight: 600,
        }}
      >
        {formatTime(seconds)}
      </Text>
    </Box>
  );
});
