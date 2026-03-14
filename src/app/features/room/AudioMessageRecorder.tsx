import {
  forwardRef,
  useCallback,
  useEffect,
  useImperativeHandle,
  useMemo,
  useRef,
  useState,
} from 'react';
import { useVoiceRecorder } from '$plugins/voice-recorder-kit';
import type { VoiceRecorderStopPayload } from '$plugins/voice-recorder-kit';
import { mobileOrTablet } from '$utils/user-agent';
import { Box, Text } from 'folds';
import * as css from './AudioMessageRecorder.css';

export type AudioRecordingCompletePayload = {
  audioBlob: Blob;
  waveform: number[];
  audioLength: number;
};

export type AudioMessageRecorderHandle = {
  stop: () => void;
  cancel: () => void;
};

type AudioMessageRecorderProps = {
  onRecordingComplete: (payload: AudioRecordingCompletePayload) => void;
  onRequestClose: () => void;
  onWaveformUpdate: (waveform: number[]) => void;
  onAudioLengthUpdate: (length: number) => void;
};

function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${s.toString().padStart(2, '0')}`;
}

export const AudioMessageRecorder = forwardRef<
  AudioMessageRecorderHandle,
  AudioMessageRecorderProps
>(({ onRecordingComplete, onRequestClose, onWaveformUpdate, onAudioLengthUpdate }, ref) => {
  const isDismissedRef = useRef(false);
  const userRequestedStopRef = useRef(false);
  const [isCanceling, setIsCanceling] = useState(false);
  const [isShaking, setIsShaking] = useState(false);
  const [swipeX, setSwipeX] = useState(0);
  const [showCancelHint, setShowCancelHint] = useState(false);
  const [announcedTime, setAnnouncedTime] = useState(0);
  const touchStartXRef = useRef(0);
  const isSwipingRef = useRef(false);

  const onRecordingCompleteRef = useRef(onRecordingComplete);
  onRecordingCompleteRef.current = onRecordingComplete;
  const onRequestCloseRef = useRef(onRequestClose);
  onRequestCloseRef.current = onRequestClose;
  const onWaveformUpdateRef = useRef(onWaveformUpdate);
  onWaveformUpdateRef.current = onWaveformUpdate;
  const onAudioLengthUpdateRef = useRef(onAudioLengthUpdate);
  onAudioLengthUpdateRef.current = onAudioLengthUpdate;

  const stableOnStop = useCallback((payload: VoiceRecorderStopPayload) => {
    if (!userRequestedStopRef.current) return;
    if (isDismissedRef.current) return;
    onRecordingCompleteRef.current({
      audioBlob: payload.audioFile,
      waveform: payload.waveform,
      audioLength: payload.audioLength,
    });
    onWaveformUpdateRef.current(payload.waveform);
    onAudioLengthUpdateRef.current(payload.audioLength);
  }, []);

  const stableOnDelete = useCallback(() => {
    isDismissedRef.current = true;
    onRequestCloseRef.current();
  }, []);

  const { levels, seconds, error, handleStop, handleDelete } = useVoiceRecorder({
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
    setIsCanceling(true);
    setTimeout(() => {
      isDismissedRef.current = true;
      handleDelete();
    }, 180);
  }, [handleDelete]);

  useImperativeHandle(ref, () => ({ stop: doStop, cancel: doCancel }), [doStop, doCancel]);

  useEffect(() => {
    if (seconds > 0 && seconds % 30 === 0 && seconds !== announcedTime) {
      setAnnouncedTime(seconds);
    }
  }, [seconds, announcedTime]);

  const CANCEL_THRESHOLD = 80;

  const handlePointerDown = useCallback((e: React.PointerEvent) => {
    if (!mobileOrTablet()) return;
    touchStartXRef.current = e.clientX;
    isSwipingRef.current = true;
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
  }, []);

  const handlePointerMove = useCallback((e: React.PointerEvent) => {
    if (!isSwipingRef.current || !mobileOrTablet()) return;
    const deltaX = e.clientX - touchStartXRef.current;
    if (deltaX < 0) {
      setSwipeX(Math.max(deltaX, -CANCEL_THRESHOLD - 20));
      setShowCancelHint(deltaX < -30);
    } else {
      setSwipeX(0);
      setShowCancelHint(false);
    }
  }, []);

  const handlePointerUp = useCallback(
    (e: React.PointerEvent) => {
      if (!isSwipingRef.current || !mobileOrTablet()) return;
      isSwipingRef.current = false;
      (e.target as HTMLElement).releasePointerCapture(e.pointerId);

      const deltaX = e.clientX - touchStartXRef.current;
      if (deltaX < -CANCEL_THRESHOLD) {
        doCancel();
      } else if (deltaX < -30) {
        setIsShaking(true);
        setTimeout(() => setIsShaking(false), 300);
      }
      setSwipeX(0);
      setShowCancelHint(false);
    },
    [doCancel]
  );

  const BAR_COUNT = 28;
  const bars = useMemo(() => {
    const step = Math.max(1, levels.length / BAR_COUNT);
    return Array.from(
      { length: BAR_COUNT },
      (_, i) => levels[Math.min(Math.floor(i * step), levels.length - 1)] ?? 0.15
    );
  }, [levels]);

  const containerClassName = [
    css.Container,
    isCanceling ? css.ContainerCanceling : null,
    isShaking ? css.ContainerShake : null,
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <>
      {error && (
        <Text size="T200" style={{ color: 'var(--color-critical-main)' }}>
          {error}
        </Text>
      )}
      <Box
        grow="Yes"
        alignItems="Center"
        gap="200"
        className={containerClassName}
        style={{ transform: swipeX !== 0 ? `translateX(${swipeX}px)` : undefined }}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerUp}
      >
        <div aria-hidden className={css.RecDot} />

        <Box grow="Yes" alignItems="Center" gap="100" className={css.WaveformContainer}>
          {bars.map((level, i) => (
            <div
              // eslint-disable-next-line react/no-array-index-key
              key={i}
              className={css.WaveformBar}
              style={{ height: Math.max(3, Math.round(level * 20)) }}
            />
          ))}
        </Box>

        <Text size="T200" className={css.Timer} aria-live="polite" aria-atomic="true">
          {formatTime(seconds)}
        </Text>
        {announcedTime > 0 && announcedTime === seconds && (
          <span className={css.SrOnly} aria-live="polite">
            Recording duration: {formatTime(announcedTime)}
          </span>
        )}

        {showCancelHint && (
          <div
            role="status"
            aria-live="polite"
            className={[css.CancelHint, css.CancelHintVisible].join(' ')}
          >
            Release to cancel
          </div>
        )}
      </Box>
    </>
  );
});
