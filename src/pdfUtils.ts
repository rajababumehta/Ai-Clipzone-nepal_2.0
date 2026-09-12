/**
 * Utility functions for Google Drive & Direct PDF embedding without requiring Google Drive Login
 */

export function extractDriveFileId(url: string): string | null {
  if (!url) return null;
  const trimmed = url.trim();

  // Pattern 1: /file/d/FILE_ID/
  const fileDMatch = trimmed.match(/\/file\/d\/([a-zA-Z0-9_-]+)/);
  if (fileDMatch && fileDMatch[1]) {
    return fileDMatch[1];
  }

  // Pattern 2: ?id=FILE_ID or &id=FILE_ID
  const idParamMatch = trimmed.match(/[?&]id=([a-zA-Z0-9_-]+)/);
  if (idParamMatch && idParamMatch[1]) {
    return idParamMatch[1];
  }

  // Pattern 3: /open?id=FILE_ID
  const openMatch = trimmed.match(/\/open\?id=([a-zA-Z0-9_-]+)/);
  if (openMatch && openMatch[1]) {
    return openMatch[1];
  }

  // Pattern 4: Bare file ID (length >= 20, alphanumeric with hyphens/underscores)
  if (/^[a-zA-Z0-9_-]{25,}$/.test(trimmed)) {
    return trimmed;
  }

  return null;
}

/**
 * Returns a direct viewer URL that loads without requiring Google Drive login.
 * Google Drive's `/preview` route renders the complete document inside an iframe or browser
 * without prompting for user authentication when file permissions are set to "Anyone with the link".
 */
export function getDirectPdfViewerUrl(url: string): string {
  if (!url) return '';
  const trimmed = url.trim();
  const driveId = extractDriveFileId(trimmed);

  if (driveId) {
    return `https://drive.google.com/file/d/${driveId}/preview`;
  }

  // If already a Google Docs viewer or Drive preview
  if (trimmed.includes('/preview') || trimmed.includes('docs.google.com/viewer')) {
    return trimmed;
  }

  // If it's a web URL, wrap in Google Docs Viewer for seamless cross-origin preview
  if (trimmed.startsWith('http://') || trimmed.startsWith('https://')) {
    if (trimmed.toLowerCase().endsWith('.pdf')) {
      return `https://docs.google.com/viewer?url=${encodeURIComponent(trimmed)}&embedded=true`;
    }
    return trimmed;
  }

  return trimmed;
}

/**
 * Returns a direct one-click download URL for Google Drive or direct files
 */
export function getDirectPdfDownloadUrl(url: string): string {
  if (!url) return '';
  const trimmed = url.trim();
  const driveId = extractDriveFileId(trimmed);

  if (driveId) {
    return `https://drive.google.com/uc?export=download&id=${driveId}`;
  }

  return trimmed;
}
