export interface ChatAttachment {
  type: 'image' | 'document';
  url: string; // Base64 data URL
  name: string;
  size: number;
}

export const formatFileSize = (bytes?: number): string => {
  if (!bytes || bytes <= 0) return '';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
};

const MAX_IMAGE_DATA_URL_CHARS = 700 * 1024;
const MAX_MESSAGE_PAYLOAD_BYTES = 920 * 1024;

/**
 * Strips large inline base64 data URLs from per-message senderAvatar fields so
 * individual message documents never exceed Firestore's 1MB limit when combined
 * with attachments. Avatars are resolved from the conversation/subAdmin/logo.
 */
export const sanitizeMessageAvatar = (url?: string): string | undefined => {
  if (!url || typeof url !== 'string') return undefined;
  const trimmed = url.trim();
  if (!trimmed || trimmed.startsWith('data:')) return undefined;
  if (trimmed.length > 2048) return undefined;
  return trimmed;
};

/**
 * Estimates serialized payload byte size and ensures a Firestore message document
 * safely fits inside Firestore's 1 MiB document limit.
 */
export const assertFirestoreMessageSize = (payload: Record<string, any>): void => {
  const clean: Record<string, any> = {};
  Object.keys(payload).forEach((k) => {
    if (payload[k] !== undefined) clean[k] = payload[k];
  });
  const json = JSON.stringify(clean);
  const byteSize = typeof TextEncoder !== 'undefined'
    ? new TextEncoder().encode(json).length
    : json.length;
  if (byteSize > MAX_MESSAGE_PAYLOAD_BYTES) {
    throw new Error(
      'फाइल वा म्यासेजको साइज धेरै ठूलो छ (Maximum 1MB limit)। कृपया सानो फोटो वा फाइल पठाउनुहोस्।'
    );
  }
};

/**
 * Compresses an image client-side to guarantee it safely fits in Firestore documents.
 */
export const compressImageFile = (
  file: File,
  maxDimension = 1100,
  quality = 0.72
): Promise<ChatAttachment> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error('Failed to read image file'));
    reader.onload = (e) => {
      const img = new Image();
      img.onerror = () => reject(new Error('Failed to decode image'));
      img.onload = () => {
        const renderAt = (dim: number, q: number, preferPng: boolean): string => {
          let width = img.width;
          let height = img.height;
          if (width > dim || height > dim) {
            if (width > height) {
              height = Math.round((height * dim) / width);
              width = dim;
            } else {
              width = Math.round((width * dim) / height);
              height = dim;
            }
          }
          const canvas = document.createElement('canvas');
          canvas.width = Math.max(1, width);
          canvas.height = Math.max(1, height);
          const ctx = canvas.getContext('2d');
          if (!ctx) {
            return (e.target?.result as string) || '';
          }
          ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
          const mime = preferPng ? 'image/png' : 'image/jpeg';
          return canvas.toDataURL(mime, q);
        };

        const preferPng = file.type === 'image/png' && file.size < 120 * 1024;
        let dataUrl = renderAt(maxDimension, quality, preferPng);

        const attempts: Array<[number, number]> = [
          [900, 0.65],
          [750, 0.55],
          [600, 0.45],
        ];
        for (const [dim, q] of attempts) {
          if (dataUrl.length <= MAX_IMAGE_DATA_URL_CHARS) break;
          dataUrl = renderAt(dim, q, false);
        }

        if (dataUrl.length > MAX_IMAGE_DATA_URL_CHARS) {
          reject(
            new Error('फोटोको साइज धेरै ठूलो भयो। कृपया अर्को सानो फोटो छनोट गर्नुहोस्।')
          );
          return;
        }

        const estimatedSize = Math.round((dataUrl.length * 3) / 4);
        resolve({ type: 'image', url: dataUrl, name: file.name, size: estimatedSize });
      };
      img.src = e.target?.result as string;
    };
    reader.readAsDataURL(file);
  });
};

/**
 * Estimates serialized UTF-8 byte size of a Firestore payload object.
 */
export const estimateJsonByteSize = (payload: Record<string, any>): number => {
  const json = JSON.stringify(payload);
  return typeof TextEncoder !== 'undefined'
    ? new TextEncoder().encode(json).length
    : json.length;
};

/**
 * Compresses branding images (signatures, stamps, logos) with alpha transparency preserved
 * via WebP/PNG so multiple images fit safely inside a single Firestore 1 MiB document.
 */
export const compressBrandingImageFile = (
  file: File,
  maxDimension = 700,
  maxDataUrlChars = 110 * 1024
): Promise<ChatAttachment> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error('Failed to read image file'));
    reader.onload = (e) => {
      const originalDataUrl = (e.target?.result as string) || '';
      const img = new Image();
      img.onerror = () => reject(new Error('Failed to decode image'));
      img.onload = () => {
        const renderAt = (
          dim: number,
          mime: 'image/png' | 'image/webp' | 'image/jpeg',
          quality?: number
        ): string => {
          let width = img.width;
          let height = img.height;
          if (width > dim || height > dim) {
            if (width > height) {
              height = Math.round((height * dim) / width);
              width = dim;
            } else {
              width = Math.round((width * dim) / height);
              height = dim;
            }
          }
          const canvas = document.createElement('canvas');
          canvas.width = Math.max(1, width);
          canvas.height = Math.max(1, height);
          const ctx = canvas.getContext('2d');
          if (!ctx) return originalDataUrl;
          if (mime === 'image/jpeg') {
            ctx.fillStyle = '#ffffff';
            ctx.fillRect(0, 0, canvas.width, canvas.height);
          }
          ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
          return quality !== undefined ? canvas.toDataURL(mime, quality) : canvas.toDataURL(mime);
        };

        // Keep tiny original images untouched when already well under limit
        if (originalDataUrl.length <= maxDataUrlChars && img.width <= maxDimension && img.height <= maxDimension) {
          resolve({
            type: 'image',
            url: originalDataUrl,
            name: file.name,
            size: Math.round((originalDataUrl.length * 3) / 4),
          });
          return;
        }

        // Prefer WebP (preserves transparency at tiny file size)
        const webpAttempts: Array<[number, number]> = [
          [maxDimension, 0.85],
          [Math.min(maxDimension, 560), 0.75],
          [440, 0.65],
          [340, 0.55],
          [260, 0.45],
        ];

        let bestUrl = '';
        for (const [dim, q] of webpAttempts) {
          const candidate = renderAt(dim, 'image/webp', q);
          if (candidate.startsWith('data:image/webp')) {
            bestUrl = candidate;
            if (candidate.length <= maxDataUrlChars) break;
          } else {
            break;
          }
        }

        // Fallback to JPEG (with white background) if WebP encoding isn't supported or still too large
        if (!bestUrl || bestUrl.length > maxDataUrlChars) {
          const jpegAttempts: Array<[number, number]> = [
            [Math.min(maxDimension, 560), 0.72],
            [440, 0.6],
            [320, 0.48],
          ];
          for (const [dim, q] of jpegAttempts) {
            const candidate = renderAt(dim, 'image/jpeg', q);
            if (!bestUrl || candidate.length < bestUrl.length) {
              bestUrl = candidate;
            }
            if (candidate.length <= maxDataUrlChars) break;
          }
        }

        if (!bestUrl || bestUrl.length > 260 * 1024) {
          reject(new Error('Image is still too large after compression. Please choose a smaller image.'));
          return;
        }

        resolve({
          type: 'image',
          url: bestUrl,
          name: file.name,
          size: Math.round((bestUrl.length * 3) / 4),
        });
      };
      img.src = originalDataUrl;
    };
    reader.readAsDataURL(file);
  });
};

/**
 * Reads document (PDF, Doc, text, etc.) as Data URL, strictly ensuring base64 payload fits in Firestore (<1MB).
 */
export const readDocumentFile = (
  file: File,
  maxBytes = 620 * 1024
): Promise<ChatAttachment> => {
  return new Promise((resolve, reject) => {
    if (file.size > maxBytes) {
      reject(
        new Error(
          `फाइल धेरै ठूलो छ (${formatFileSize(file.size)})। कृपया ६२० KB भन्दा सानो फाइल छनोट गर्नुहोस्।`
        )
      );
      return;
    }
    const reader = new FileReader();
    reader.onerror = () => reject(new Error('Failed to read document file'));
    reader.onload = (e) => {
      const resultUrl = (e.target?.result as string) || '';
      if (resultUrl.length > 880 * 1024) {
        reject(
          new Error(
            `फाइल धेरै ठूलो छ (${formatFileSize(file.size)})। कृपया अझ सानो फाइल छनोट गर्नुहोस्।`
          )
        );
        return;
      }
      resolve({
        type: 'document',
        url: resultUrl,
        name: file.name,
        size: file.size
      });
    };
    reader.readAsDataURL(file);
  });
};

/**
 * Initiates download of base64 or hosted file attachment.
 */
export const downloadFileAttachment = (url: string, filename: string) => {
  try {
    const link = document.createElement('a');
    link.href = url;
    link.download = filename || 'download';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  } catch (e) {
    console.error('Download failed:', e);
    const fallbackLink = document.createElement('a');
    fallbackLink.href = url;
    fallbackLink.target = '_blank';
    fallbackLink.rel = 'noopener noreferrer';
    document.body.appendChild(fallbackLink);
    fallbackLink.click();
    document.body.removeChild(fallbackLink);
  }
};
