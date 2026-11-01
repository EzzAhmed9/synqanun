/**
 * ===========================================================================
 * SLOT: Microsoft Word / Microsoft Graph — NOT BUILT
 * ===========================================================================
 * Where "Open in Word" will plug in. Today the OCR canvas exports a .docx that
 * the reader downloads (lib/ocr/docx.ts); this slot is for opening that same
 * file in Word for the web, inside the firm's own Microsoft 365 tenant, when
 * the firm connects it.
 *
 * The intended shape, for whoever builds it (Track A.5, reviewed in Track B):
 *
 *   1. Sign-in: MSAL with the firm's Entra ID tenant, delegated scope
 *      `Files.ReadWrite` only — the user's own OneDrive, nothing tenant-wide.
 *   2. Upload: `PUT /me/drive/root:/SynQanun/OCR/{name}.docx:/content` with the
 *      Blob from `buildDocx()`. Files over 4 MB use an upload session.
 *   3. Open: the response's `webUrl`, in a new tab.
 *
 * Note what that changes: steps 2 and 3 SEND the converted text to Microsoft,
 * which the in-browser OCR never does. The canvas's "your file never leaves
 * your browser" line must not be shown beside this action once it exists; the
 * action needs its own sentence saying where the file is going.
 *
 * Until then `microsoftWord` is null, and the canvas renders the slot as a
 * labelled, inert placeholder (data-slot="microsoft-word-graph").
 */
export interface WordIntegration {
  /** Upload the .docx to the signed-in user's OneDrive and return its Word for the web URL. */
  openInWord(file: Blob, name: string): Promise<{ webUrl: string }>;
}

export const microsoftWord: WordIntegration | null = null;
