import { useCallback, useEffect, useRef, useState } from 'react';
import { Box, Chip, Icon, Icons, IconButton, Text, color, config, toRem } from 'folds';

type AudioAttachmentPreviewProps = {
  audioUrl: string;
  waveform: number[];
  duration: number; // seconds
  onDelete: () => void;
};

function formatTime(s: number): string {
  const m = Math.floor(s / 60);
  const sec = Math.floor(s % 60);
  return `${m}:${sec.toString().padStart(2, '0')}`;
}

const BAR_COUNT = 44;

/**
 * Attachment-area chip for a just-recorded voice message.
 *
 * Shows a play/pause button, a clickable waveform scrubber that fills
 * with Primary colour as playback advances, a duration counter, and a
 * delete button that matches the UploadBoard cancel chip style.
 */
export function AudioAttachmentPreview({
  audioUrl,
  waveform,
  duration,
  onDelete,
}: AudioAttachmentPreviewProps) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const rafRef = useRef<number | null>(null);

  // Downsample waveform to BAR_COUNT display bars
  const bars = Array.from({ length: BAR_COUNT }, (_, i) => {
    const src = waveform.length > 0 ? waveform : Array(BAR_COUNT).fill(0.3);
    const step = src.length / BAR_COUNT;
    return src[Math.floor(i * step)] ?? 0;
  });

  const progress = duration > 0 ? Math.min(currentTime / duration, 1) : 0;

  // Animate current-time with rAF while playing for a smooth scrubber
  const startRaf = useCallback((audio: HTMLAudioElement) => {
    const tick = () => {
      setCurrentTime(audio.currentTime);
      rafRef.current = requestAnimationFrame(tick);
    };
    rafRef.current = requestAnimationFrame(tick);
  }, []);

  const stopRaf = useCallback(() => {
    if (rafRef.current !== null) {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    }
  }, []);

  useEffect(() => {
    const audio = new Audio(audioUrl);
    audioRef.current = audio;

    audio.onended = () => {
      setIsPlaying(false);
      setCurrentTime(0);
      stopRaf();
    };

    return () => {
      audio.pause();
      stopRaf();
    };
  }, [audioUrl, stopRaf]);

  const handlePlayPause = useCallback(() => {
    const audio = audioRef.current;
    if (!audio) return;

    if (isPlaying) {
      audio.pause();
      setIsPlaying(false);
      stopRaf();
    } else {
      audio.play().catch(() => {});
      setIsPlaying(true);
      startRaf(audio);
    }
  }, [isPlaying, startRaf, stopRaf]);

  const handleScrubClick = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      const audio = audioRef.current;
      if (!audio || !duration) return;
      const rect = e.currentTarget.getBoundingClientRect();
      const ratio = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
      audio.currentTime = ratio * duration;
      setCurrentTime(audio.currentTime);
    },
    [duration]
  );

  return (
    <Box
      alignItems="Center"
      gap="200"
      style={{
        backgroundColor: color.SurfaceVariant.Container,
        border: `${config.borderWidth.B300} solid ${color.SurfaceVariant.ContainerLine}`,
        borderRadius: config.radii.R300,
        padding: `${config.space.S100} ${config.space.S200}`,
        // Matches the max-width of UploadBoard so it looks native in that context
        maxWidth: toRem(400),
        width: '100%',
        boxSizing: 'border-box',
      }}
    >
      {/* Play / Pause */}
      <IconButton
        variant="SurfaceVariant"
        size="300"
        radii="300"
        onClick={handlePlayPause}
        title={isPlaying ? 'Pause' : 'Play voice message'}
        aria-label={isPlaying ? 'Pause' : 'Play voice message'}
      >
        <Icon src={isPlaying ? Icons.Pause : Icons.Play} size="200" />
      </IconButton>

      {/* Waveform scrubber */}
      <Box
        grow="Yes"
        alignItems="Center"
        gap="25"
        onClick={handleScrubClick}
        style={{
          height: 28,
          cursor: 'pointer',
          userSelect: 'none',
          overflow: 'hidden',
        }}
        title="Seek"
      >
        {bars.map((level, i) => {
          const barRatio = i / BAR_COUNT;
          const played = barRatio <= progress;
          return (
            <div
              // eslint-disable-next-line react/no-array-index-key
              key={i}
              style={{
                width: 2,
                height: Math.max(3, Math.round(level * 24)),
                borderRadius: 1,
                backgroundColor: played ? color.Primary.Main : color.SurfaceVariant.OnContainer,
                opacity: played ? 1 : 0.45,
                flexShrink: 0,
                transition: 'background-color 40ms, opacity 40ms',
                pointerEvents: 'none',
              }}
            />
          );
        })}
      </Box>

      {/* Time display: shows current position while playing, total when paused */}
      <Text
        size="T200"
        style={{
          fontVariantNumeric: 'tabular-nums',
          color: color.Surface.OnContainer,
          minWidth: toRem(30),
          textAlign: 'right',
          flexShrink: 0,
        }}
      >
        {formatTime(isPlaying ? currentTime : duration)}
      </Text>

      {/* Delete — matches UploadBoardHeader "Remove" chip style */}
      <Chip
        as="button"
        onClick={onDelete}
        variant="SurfaceVariant"
        radii="Pill"
        after={<Icon src={Icons.Cross} size="50" />}
        title="Remove voice message"
        aria-label="Remove voice message"
      />
    </Box>
  );
}
