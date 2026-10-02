import { createWorker } from 'tesseract.js';

/**
 * Web: Tesseract running in a worker. The worker, its WebAssembly core and
 * the English model are fetched on first use from tesseract.js's CDN, so the
 * first scan takes a few seconds longer and needs a network connection.
 */
export const OCR_SUPPORTED = true;

export async function recognizeText(uri: string): Promise<string> {
  const worker = await createWorker('eng');
  try {
    // A scorecard is numbers; telling the engine so cuts the misreads.
    await worker.setParameters({ tessedit_char_whitelist: '0123456789 ' });
    const { data } = await worker.recognize(uri);
    return data.text;
  } finally {
    await worker.terminate();
  }
}
