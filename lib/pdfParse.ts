import { PDFParse } from "pdf-parse";

/**
 * Extract text from a PDF buffer. Uses pdf-parse under the hood.
 * Use this instead of instantiating PDFParse directly for a simple buffer-in, text-out API.
 */
export default async function pdfParse(pdfBuffer: Buffer): Promise<{ text: string }> {
  const parser = new PDFParse({ data: pdfBuffer });
  try {
    const result = await parser.getText();
    return { text: result?.text?.trim() ?? "" };
  } finally {
    await parser.destroy();
  }
}
