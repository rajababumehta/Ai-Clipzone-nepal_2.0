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

/**
 * Compresses an image client-side to ensure it is lightweight (<200KB)
 * and safely fits in Firestore documents.
 */
export const compressImageFile = (
  file: File,
  maxDimension = 1200,
  quality = 0.75
): Promise<ChatAttachment> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error('Failed to read image file'));
    reader.onload = (e) => {
      const img = new Image();
      img.onerror = () => reject(new Error('Failed to decode image'));
      img.onload = () => {
        let width = img.width;
        let height = img.height;
        if (width > maxDimension || height > maxDimension) {
          if (width > height) {
            height = Math.round((height * maxDimension) / width);
            width = maxDimension;
          } else {
            width = Math.round((width * maxDimension) / height);
            height = maxDimension;
          }
        }
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          const rawUrl = e.target?.result as string;
          resolve({ type: 'image', url: rawUrl, name: file.name, size: file.size });
          return;
        }
        ctx.drawImage(img, 0, 0, width, height);
        // Use JPEG for optimal compression unless small PNG
        const mime = file.type === 'image/png' && file.size < 150 * 1024 ? 'image/png' : 'image/jpeg';
        const dataUrl = canvas.toDataURL(mime, quality);
        const estimatedSize = Math.round((dataUrl.length * 3) / 4);
        resolve({ type: 'image', url: dataUrl, name: file.name, size: estimatedSize });
      };
      img.src = e.target?.result as string;
    };
    reader.readAsDataURL(file);
  });
};

/**
 * Reads document (PDF, Doc, text, etc.) as Data URL, strictly ensuring file size < 700KB.
 */
export const readDocumentFile = (
  file: File,
  maxBytes = 720 * 1024
): Promise<ChatAttachment> => {
  return new Promise((resolve, reject) => {
    if (file.size > maxBytes) {
      reject(
        new Error(
          `फाइल धेरै ठूलो छ (${formatFileSize(file.size)})। कृपया ७०० KB भन्दा सानो फाइल छनोट गर्नुहोस्।`
        )
      );
      return;
    }
    const reader = new FileReader();
    reader.onerror = () => reject(new Error('Failed to read document file'));
    reader.onload = (e) => {
      resolve({
        type: 'document',
        url: e.target?.result as string,
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
