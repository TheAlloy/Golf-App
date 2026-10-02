/**
 * Native: no on-device text recognition is bundled yet (that needs a
 * development build with ML Kit rather than Expo Go). The scan flow still
 * keeps the photo as a reference next to the hole grid.
 */
export const OCR_SUPPORTED = false;

export async function recognizeText(_uri: string): Promise<string> {
  throw new Error('Text recognition is not available on this platform');
}
