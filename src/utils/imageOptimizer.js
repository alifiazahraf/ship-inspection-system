// Image optimization utilities for PDF generation
// Helps reduce PDF file size by compressing and resizing images

/**
 * Compress and resize image for PDF embedding
 * @param {string} imageUrl - URL of the image to optimize
 * @param {Object} options - Optimization options
 * @returns {Promise<string>} - Optimized base64 image data
 */
export const getOptimizedImageForPDF = async (imageUrl, options = {}) => {
  const {
    maxWidth = 300,           // Max width for PDF images
    maxHeight = 225,          // Max height for PDF images  
    quality = 0.7,            // JPEG quality (0.1 to 1.0)
    format = 'jpeg'           // Output format
  } = options;

  try {
    // Fetch the image
    const response = await fetch(imageUrl, { mode: 'cors' });
    const blob = await response.blob();
    
    // Create image element
    const img = new Image();
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    
    return new Promise((resolve, reject) => {
      img.onload = () => {
        // Calculate new dimensions while maintaining aspect ratio
        let { width, height } = img;
        
        if (width > maxWidth) {
          height = (height * maxWidth) / width;
          width = maxWidth;
        }
        
        if (height > maxHeight) {
          width = (width * maxHeight) / height;
          height = maxHeight;
        }
        
        // Set canvas size
        canvas.width = width;
        canvas.height = height;
        
        // Draw and compress image
        ctx.drawImage(img, 0, 0, width, height);
        
        // Convert to optimized base64
        const optimizedDataUrl = canvas.toDataURL(`image/${format}`, quality);
        resolve(optimizedDataUrl);
      };
      
      img.onerror = () => reject(new Error('Failed to load image'));
      img.src = URL.createObjectURL(blob);
    });
    
  } catch (error) {
    console.error('Error optimizing image:', error);
    return null;
  }
};

/**
 * Batch optimize images for PDF
 * @param {Array<string>} imageUrls - Array of image URLs
 * @param {Object} options - Optimization options
 * @returns {Promise<Array<string>>} - Array of optimized base64 images
 */
export const batchOptimizeImages = async (imageUrls, options = {}) => {
  const promises = imageUrls.map(url => 
    url ? getOptimizedImageForPDF(url, options) : Promise.resolve(null)
  );
  
  return Promise.all(promises);
};

/**
 * Get different image sizes for different PDF contexts
 */
export const PDF_IMAGE_CONFIGS = {
  // For main table thumbnails (small)
  table: {
    maxWidth: 150,
    maxHeight: 112,
    quality: 0.6
  },
  
  // For detail section (medium) 
  detail: {
    maxWidth: 300,
    maxHeight: 225,
    quality: 0.7
  },
  
  // For full page display (large but compressed)
  fullPage: {
    maxWidth: 500,
    maxHeight: 375,
    quality: 0.8
  }
};

/**
 * Estimate file size reduction
 * @param {number} originalSize - Original file size in bytes
 * @param {Object} config - Optimization config
 * @returns {number} - Estimated compressed size
 */
export const estimateCompressedSize = (originalSize, config = PDF_IMAGE_CONFIGS.detail) => {
  const dimensionReduction = (config.maxWidth * config.maxHeight) / (1920 * 1080); // Assume HD source
  const qualityReduction = config.quality;
  const base64Overhead = 1.33; // Base64 adds ~33%
  
  return Math.round(originalSize * dimensionReduction * qualityReduction * base64Overhead);
}; 