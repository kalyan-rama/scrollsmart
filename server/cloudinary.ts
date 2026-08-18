import { v2 as cloudinary } from 'cloudinary';

// Configure Cloudinary if environment variables exist
const cloudName = process.env.CLOUDINARY_CLOUD_NAME;
const apiKey = process.env.CLOUDINARY_API_KEY;
const apiSecret = process.env.CLOUDINARY_API_SECRET;

const isCloudinaryConfigured = Boolean(
  cloudName &&
  cloudName.trim() !== '' &&
  apiKey &&
  apiKey.trim() !== '' &&
  apiSecret &&
  apiSecret.trim() !== ''
);

if (isCloudinaryConfigured) {
  cloudinary.config({
    cloud_name: cloudName,
    api_key: apiKey,
    api_secret: apiSecret,
    secure: true,
  });
}

/**
 * Generate a centralized Cloudinary 9:16 auto-cropped delivery URL
 */
export function getCloudinaryVideoUrl(publicId: string, fallbackUrl?: string): string {
  // If a direct Cloudinary / CDN URL is already provided, use it directly
  if (fallbackUrl && (fallbackUrl.startsWith('http://') || fallbackUrl.startsWith('https://'))) {
    return fallbackUrl;
  }
  if (publicId && (publicId.startsWith('http://') || publicId.startsWith('https://'))) {
    return publicId;
  }

  if (isCloudinaryConfigured && publicId) {
    try {
      return cloudinary.url(publicId, {
        resource_type: 'video',
        secure: true,
        transformation: [
          { aspect_ratio: '9:16', crop: 'fill', gravity: 'auto' },
          { quality: 'auto', fetch_format: 'auto' },
        ],
      });
    } catch (err) {
      console.warn('[Cloudinary URL Error]', err);
    }
  }

  // If Cloudinary cloud name is provided without secret, construct valid delivery URL directly
  const activeCloud = cloudName || 'r9g9g9qc';
  if (publicId) {
    return `https://res.cloudinary.com/${activeCloud}/video/upload/ar_9:16,c_fill,g_auto,q_auto,f_auto/${publicId}.mp4`;
  }

  // Fallback to provided direct CDN video URL
  return fallbackUrl || 'https://res.cloudinary.com/r9g9g9qc/video/upload/v1787030473/ClipDown.com_AQMCZO8zJegOCbr6TErkTSxarFeQm_qk7BtzmIaTwK4xMamz-AUOFRYo9N-r5wCn5cI65FV285XGZ59GKyKFOSLNhnKZ9sPIsO-Vsxw.mp4';
}

/**
 * Generate a video frame thumbnail (.jpg at offset) for fast previews
 */
export function getCloudinaryThumbnailUrl(publicId: string, fallbackThumb?: string): string {
  if (fallbackThumb && (fallbackThumb.startsWith('http://') || fallbackThumb.startsWith('https://'))) {
    return fallbackThumb;
  }

  if (isCloudinaryConfigured && publicId) {
    try {
      return cloudinary.url(publicId, {
        resource_type: 'video',
        format: 'jpg',
        secure: true,
        transformation: [
          { aspect_ratio: '9:16', crop: 'fill', gravity: 'auto' },
          { start_offset: '1.0' },
          { quality: 'auto' },
        ],
      });
    } catch (err) {
      console.warn('[Cloudinary Thumbnail Error]', err);
    }
  }

  const activeCloud = cloudName || 'r9g9g9qc';
  if (publicId) {
    return `https://res.cloudinary.com/${activeCloud}/video/upload/ar_9:16,c_fill,g_auto,so_1.0,q_auto,f_jpg/${publicId}.jpg`;
  }

  return fallbackThumb || 'https://images.unsplash.com/photo-1555066931-4365d14bab8c?auto=format&fit=crop&w=600&q=80';
}
