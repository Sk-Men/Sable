/** Codecs to test for */
const codecs = [
  'audio/ogg;codecs=speex',
  'audio/ogg;codecs=opus',
  'audio/ogg;codecs=vorbis',
  'audio/ogg',
  'audio/webm;codecs=opus',
  'audio/webm;codecs=vorbis',
  'audio/webm',
  'audio/mp4;codecs=aac',
  'audio/mp4',
  'audio/mpeg',
  'audio/wav;codecs=1',
  'audio/wav',
];

/**
 * Checks for supported audio codecs in the current browser and returns the first supported codec.
 * If no supported codec is found, it returns null.
 */
export function getSupportedAudioCodec(): string | null {
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
      return 'mp4';
    case 'audio/mpeg':
      return 'mp3';
    case 'audio/wav;codecs=1':
    case 'audio/wav':
      return 'wav';
    default:
      return 'dat'; // default extension for unknown codecs
  }
}
