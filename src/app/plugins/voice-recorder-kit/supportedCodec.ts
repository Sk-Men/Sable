/** Codecs to test for */
const codecs = [
  // silly webkit-prefixed codecs for Safari support, because safari, apparently lies when asked what it supports
  'audio/mp4;codecs=mp4a.40.2',
  'audio/mp4;codecs=mp4a.40.5',
  'audio/aac',
  // Firefox
  'audio/ogg;codecs=opus',
  'audio/ogg;codecs=vorbis',
  'audio/ogg',
  // Chromium / Firefox
  'audio/webm;codecs=opus',
  'audio/webm',
  // fallback
  'audio/wav;codecs=1',
  'audio/wav',
  // other Codecs
  'audio/ogg;codecs=speex',
  'audio/webm;codecs=vorbis',
  'audio/mp4;codecs=aac',
  'audio/mp4',
  'audio/mpeg',
];

/**
 * Checks for supported audio codecs in the current browser and returns the first supported codec.
 * If no supported codec is found, it returns null.
 */
export function getSupportedAudioCodec(): string | null {
  const isSafari = /^((?!chrome|android).)*safari/i.test(navigator.userAgent);

  if (isSafari && MediaRecorder.isTypeSupported('audio/mp4')) {
    return 'audio/mp4';
  }
  const supportedCodec = codecs.find((codec) => MediaRecorder.isTypeSupported(codec));
  return supportedCodec || null;
}

/**
 * Returns the appropriate file extension for a given audio codec.
 * This is used to ensure that the recorded audio file has the correct extension based on the codec used for recording.
 */
export function getSupportedAudioExtension(codec: string): string {
  switch (codec) {
    case 'audio/ogg;codecs=opus':
    case 'audio/ogg;codecs=vorbis':
    case 'audio/ogg;codecs=speex':
    case 'audio/ogg':
      return 'ogg';
    case 'audio/webm;codecs=opus':
    case 'audio/webm':
      return 'webm';
    case 'audio/mp4':
    case 'audio/mp4;codecs=aac':
      return 'm4a';
    case 'audio/mpeg':
      return 'mp3';
    case 'audio/wav;codecs=1':
    case 'audio/wav':
      return 'wav';
    // silly webkit stuff
    case 'audio/mp4;codecs=mp4a.40.2':
    case 'audio/mp4;codecs=mp4a.40.5':
      return 'm4a';
    case 'audio/aac':
      return 'aac';
    default:
      return 'dat'; // default extension for unknown codecs
  }
}
