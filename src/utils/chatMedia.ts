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
 * Compresses an uploaded course thumbnail image directly in the browser
 * to crisp HD quality while strictly staying under Firestore's 350,000-char field cap.
 */
export const compressCourseThumbnail = (
  file: File,
  maxChars = 280000
): Promise<ChatAttachment> => {
  return new Promise((resolve, reject) => {
    if (!file || !file.type.startsWith('image/')) {
      reject(new Error('कृपया मान्य Image फाइल (PNG, JPG, WebP) मात्र छनोट गर्नुहोस्।'));
      return;
    }
    if (file.size > 15 * 1024 * 1024) {
      reject(new Error('फोटो १५ MB भन्दा सानो हुनुपर्छ (Image must be under 15MB).'));
      return;
    }

    const reader = new FileReader();
    reader.onerror = () => reject(new Error('इमेज पढ्न सकिएन। कृपया अर्को फोटो छान्नुहोस्।'));
    reader.onload = (e) => {
      const rawUrl = e.target?.result as string;
      if (!rawUrl) {
        reject(new Error('इमेज डाटा खाली छ।'));
        return;
      }

      const img = new Image();
      img.onerror = () => reject(new Error('इमेज डिकोड गर्न सकिएन। कृपया PNG वा JPG छान्नुहोस्।'));
      img.onload = () => {
        const attempts: Array<{ maxDim: number; quality: number }> = [
          { maxDim: 1280, quality: 0.84 },
          { maxDim: 1100, quality: 0.78 },
          { maxDim: 960, quality: 0.72 },
          { maxDim: 820, quality: 0.66 },
          { maxDim: 680, quality: 0.58 },
        ];

        let finalUrl = '';
        for (const step of attempts) {
          let width = img.naturalWidth || img.width;
          let height = img.naturalHeight || img.height;
          if (width > step.maxDim || height > step.maxDim) {
            if (width >= height) {
              height = Math.max(1, Math.round((height * step.maxDim) / width));
              width = step.maxDim;
            } else {
              width = Math.max(1, Math.round((width * step.maxDim) / height));
              height = step.maxDim;
            }
          }

          const canvas = document.createElement('canvas');
          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          if (!ctx) break;

          ctx.fillStyle = '#09090b';
          ctx.fillRect(0, 0, width, height);
          ctx.drawImage(img, 0, 0, width, height);

          const candidate = canvas.toDataURL('image/jpeg', step.quality);
          finalUrl = candidate;
          if (candidate.length <= maxChars) {
            break;
          }
        }

        if (!finalUrl || finalUrl.length > 340000) {
          reject(new Error('फोटो धेरै ठूलो भयो। कृपया अलि सानो वा कम रिजोलुसनको फोटो अपलोड गर्नुहोस्।'));
          return;
        }

        const estimatedSize = Math.round((finalUrl.length * 3) / 4);
        resolve({
          type: 'image',
          url: finalUrl,
          name: file.name,
          size: estimatedSize,
        });
      };
      img.src = rawUrl;
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
