import { supabase } from '../supabaseClient';

export const uploadImage = async (file, shipId, type = 'before') => {
  if (!file) return null;

  try {
    // Compress before upload to keep storage footprint small (see compressImage).
    const { data: payload, ext, contentType } = await compressImage(file);
    const fileName = `${shipId}/${type}_${Date.now()}.${ext}`;
    const filePath = `findings/${fileName}`;

    const { error } = await supabase.storage
      .from('finding-images')
      .upload(filePath, payload, { contentType });

    if (error) throw error;

    const { data: { publicUrl } } = supabase.storage
      .from('finding-images')
      .getPublicUrl(filePath);

    return publicUrl;
  } catch (error) {
    console.error('Error uploading image:', error);
    throw error;
  }
};

// Ambil object path setelah 'finding-images/' dari sebuah public URL.
const extractStoragePath = (imageUrl) => {
  const parts = imageUrl.split('/');
  const bucketIndex = parts.findIndex((p) => p === 'finding-images');
  if (bucketIndex === -1) return null;
  return parts.slice(bucketIndex + 1).join('/');
};

export const deleteImage = async (imageUrl) => {
  if (!imageUrl) return;

  const filePath = extractStoragePath(imageUrl);
  if (!filePath) {
    console.error('Tidak bisa mem-parse path dari URL:', imageUrl);
    throw new Error('URL gambar tidak valid');
  }

  const { error } = await supabase.storage
    .from('finding-images')
    .remove([filePath]);

  if (error) {
    console.error('Error deleting image:', error);
    throw error;
  }
};

export const validateImageFile = (file) => {
  const maxSize = 5 * 1024 * 1024; // 5MB
  const allowedTypes = ['image/jpeg', 'image/png', 'image/gif'];

  if (!file) {
    return { valid: false, error: 'No file selected' };
  }

  if (file.size > maxSize) {
    return { valid: false, error: 'File size must be less than 5MB' };
  }

  if (!allowedTypes.includes(file.type)) {
    return { valid: false, error: 'File must be JPG, PNG, or GIF' };
  }

  return { valid: true };
};

export const resizeImage = (file, maxWidth = 1200, quality = 0.8) => {
  return new Promise((resolve) => {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    const img = new Image();

    img.onload = () => {
      const ratio = Math.min(maxWidth / img.width, maxWidth / img.height);
      canvas.width = img.width * ratio;
      canvas.height = img.height * ratio;

      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      
      canvas.toBlob(resolve, file.type, quality);
    };

    img.src = URL.createObjectURL(file);
  });
};

/**
 * Kompres/resize sebuah image File di browser SEBELUM di-upload.
 * - Membatasi sisi terpanjang ke maxSide (tidak pernah memperbesar).
 * - SELALU meng-output JPEG (quality tertentu). PNG/foto yang disimpan lossless
 *   bisa berukuran beberapa MB walau sudah di-resize; konversi ke JPEG memberi
 *   kompresi nyata. Latar diisi putih agar area transparan tidak menjadi hitam.
 * - Tipe selain JPEG/PNG/WebP (mis. GIF/HEIC) dilewati apa adanya.
 * - Selalu aman: bila gagal atau hasilnya tidak lebih kecil, kembalikan file asli.
 *
 * @param {File} file
 * @param {{maxSide?: number, quality?: number}} opts
 * @returns {Promise<{data: Blob|File, ext: string, contentType: string}>}
 */
export const compressImage = (file, { maxSide = 1920, quality = 0.8 } = {}) => {
  return new Promise((resolve) => {
    const origExt = (file && file.name && file.name.split('.').pop()) || 'jpg';
    const fallback = () => resolve({ data: file, ext: origExt, contentType: file.type });

    const compressible = ['image/jpeg', 'image/png', 'image/webp'];
    if (!file || !file.type || !compressible.includes(file.type)) {
      console.log(`[compressImage] dilewati (tipe: ${file && file.type}): ${file && file.name}`);
      fallback();
      return;
    }

    const objectUrl = URL.createObjectURL(file);
    const img = new Image();

    img.onload = () => {
      try {
        const longest = Math.max(img.width, img.height);
        const scale = Math.min(1, maxSide / longest); // jangan upscale
        const targetW = Math.round(img.width * scale);
        const targetH = Math.round(img.height * scale);

        const canvas = document.createElement('canvas');
        canvas.width = targetW;
        canvas.height = targetH;
        const ctx = canvas.getContext('2d');
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, targetW, targetH);
        ctx.drawImage(img, 0, 0, targetW, targetH);

        canvas.toBlob(
          (blob) => {
            URL.revokeObjectURL(objectUrl);
            // Jangan sampai hasilnya malah lebih besar dari aslinya.
            if (!blob || blob.size >= file.size) {
              console.log(
                `[compressImage] ${file.name}: ${(file.size / 1024).toFixed(0)}KB ${file.type} -> tidak dikompres (pakai asli)`
              );
              fallback();
            } else {
              console.log(
                `[compressImage] ${file.name}: ${(file.size / 1024).toFixed(0)}KB ${file.type} -> ${(blob.size / 1024).toFixed(0)}KB image/jpeg @ ${targetW}x${targetH}`
              );
              resolve({ data: blob, ext: 'jpg', contentType: 'image/jpeg' });
            }
          },
          'image/jpeg',
          quality
        );
      } catch (e) {
        URL.revokeObjectURL(objectUrl);
        fallback();
      }
    };

    img.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      fallback();
    };

    img.src = objectUrl;
  });
};