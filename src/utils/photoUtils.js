/**
 * Utility functions for handling multiple photos in findings
 */

/**
 * Parse photo URLs from database string format to array
 * @param {string|null} photoString - JSON string from database or single URL
 * @returns {string[]} Array of photo URLs
 */
export const parsePhotoUrls = (photoString) => {
  if (!photoString) return [];
  
  // If it's already an array string, parse it
  if (photoString.startsWith('[')) {
    try {
      const parsed = JSON.parse(photoString);
      return Array.isArray(parsed) ? parsed : [photoString];
    } catch (error) {
      console.warn('Failed to parse photo URLs:', error);
      return [photoString];
    }
  }
  
  // If it's a single URL, return as array
  return [photoString];
};

/**
 * Serialize photo URLs array to database string format
 * @param {string[]} photoUrls - Array of photo URLs
 * @returns {string|null} JSON string or null if empty
 */
export const serializePhotoUrls = (photoUrls) => {
  if (!photoUrls || photoUrls.length === 0) return null;
  
  // If only one photo, store as single URL for backward compatibility
  if (photoUrls.length === 1) {
    return photoUrls[0];
  }
  
  // Multiple photos, store as JSON array
  return JSON.stringify(photoUrls);
};

/**
 * Get photo count for display purposes
 * @param {string|null} photoString - Photo string from database
 * @returns {number} Count of photos
 */
export const getPhotoCount = (photoString) => {
  return parsePhotoUrls(photoString).length;
};

/**
 * Get first photo URL for thumbnail display
 * @param {string|null} photoString - Photo string from database
 * @returns {string|null} First photo URL or null
 */
export const getFirstPhotoUrl = (photoString) => {
  const urls = parsePhotoUrls(photoString);
  return urls.length > 0 ? urls[0] : null;
};

/**
 * Add new photo URL to existing photos
 * @param {string|null} existingPhotos - Existing photo string from database
 * @param {string} newPhotoUrl - New photo URL to add
 * @returns {string} Updated photo string
 */
export const addPhotoUrl = (existingPhotos, newPhotoUrl) => {
  const currentUrls = parsePhotoUrls(existingPhotos);
  const updatedUrls = [...currentUrls, newPhotoUrl];
  return serializePhotoUrls(updatedUrls);
};

/**
 * Remove photo URL from existing photos
 * @param {string|null} existingPhotos - Existing photo string from database
 * @param {string} photoUrlToRemove - Photo URL to remove
 * @returns {string|null} Updated photo string or null if empty
 */
export const removePhotoUrl = (existingPhotos, photoUrlToRemove) => {
  const currentUrls = parsePhotoUrls(existingPhotos);
  const updatedUrls = currentUrls.filter(url => url !== photoUrlToRemove);
  return serializePhotoUrls(updatedUrls);
};

/**
 * Upload multiple photos to Supabase storage
 * @param {File[]} files - Array of files to upload
 * @param {string} shipId - Ship ID for file organization
 * @param {string} type - Photo type ('before' or 'after')
 * @param {object} supabase - Supabase client instance
 * @returns {Promise<string[]>} Array of uploaded photo URLs
 */
export const uploadMultiplePhotos = async (files, shipId, type, supabase) => {
  if (!files || files.length === 0) return [];
  
  const uploadPromises = files.map(async (file, index) => {
    const fileExt = file.name.split('.').pop();
    const fileName = `${shipId}/${type}_${Date.now()}_${index}.${fileExt}`;
    const filePath = `findings/${fileName}`;

    try {
      const { error } = await supabase.storage
        .from('finding-images')
        .upload(filePath, file);

      if (error) throw error;

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('finding-images')
        .getPublicUrl(filePath);

      return publicUrl;
    } catch (error) {
      console.error('Error uploading photo:', error);
      throw error;
    }
  });

  return Promise.all(uploadPromises);
};

/**
 * Delete photos from Supabase storage
 * @param {string[]} photoUrls - Array of photo URLs to delete
 * @param {object} supabase - Supabase client instance
 * @returns {Promise<void>}
 */
export const deletePhotosFromStorage = async (photoUrls, supabase) => {
  if (!photoUrls || photoUrls.length === 0) return;
  
  const deletePromises = photoUrls.map(async (url) => {
    try {
      // Extract file path from URL
      const urlParts = url.split('/');
      const bucketIndex = urlParts.findIndex(part => part === 'finding-images');
      if (bucketIndex === -1) return;
      
      const filePath = urlParts.slice(bucketIndex + 1).join('/');
      
      const { error } = await supabase.storage
        .from('finding-images')
        .remove([filePath]);
      
      if (error) {
        console.error('Error deleting photo:', error);
      }
    } catch (error) {
      console.error('Error parsing photo URL for deletion:', error);
    }
  });
  
  await Promise.all(deletePromises);
}; 