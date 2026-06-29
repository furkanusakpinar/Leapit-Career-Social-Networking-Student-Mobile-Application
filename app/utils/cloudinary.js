import axios from 'axios';

// SHA-1 Implementation
function sha1(message) {
  const utf8 = [];
  for (let i = 0; i < message.length; i++) {
    let charcode = message.charCodeAt(i);
    if (charcode < 0x80) {
      utf8.push(charcode);
    } else if (charcode < 0x800) {
      utf8.push(0xc0 | (charcode >> 6), 0x80 | (charcode & 0x3f));
    } else if (charcode < 0xd800 || charcode >= 0xe000) {
      utf8.push(0xe0 | (charcode >> 12), 0x80 | ((charcode >> 6) & 0x3f), 0x80 | (charcode & 0x3f));
    } else {
      i++;
      charcode = 0x10000 + (((charcode & 0x3ff) << 10) | (message.charCodeAt(i) & 0x3ff));
      utf8.push(0xf0 | (charcode >> 18), 0x80 | ((charcode >> 12) & 0x3f), 0x80 | ((charcode >> 6) & 0x3f), 0x80 | (charcode & 0x3f));
    }
  }

  const msgLen = utf8.length;
  // Pad
  utf8.push(0x80);
  while ((utf8.length % 64) !== 56) {
    utf8.push(0);
  }
  
  // Append length in bits as a 64-bit big-endian integer
  const bits = msgLen * 8;
  utf8.push(0, 0, 0, 0); // High 32 bits
  utf8.push(
    (bits >>> 24) & 0xff,
    (bits >>> 16) & 0xff,
    (bits >>> 8) & 0xff,
    bits & 0xff
  );

  let h0 = 0x67452301;
  let h1 = 0xefcdab89;
  let h2 = 0x98badcfe;
  let h3 = 0x10325476;
  let h4 = 0xc3d2e1f0;

  for (let chunkStart = 0; chunkStart < utf8.length; chunkStart += 64) {
    const w = new Int32Array(80);
    for (let i = 0; i < 16; i++) {
      const pos = chunkStart + i * 4;
      w[i] = (utf8[pos] << 24) | (utf8[pos + 1] << 16) | (utf8[pos + 2] << 8) | utf8[pos + 3];
    }

    for (let i = 16; i < 80; i++) {
      const val = w[i - 3] ^ w[i - 8] ^ w[i - 14] ^ w[i - 16];
      w[i] = (val << 1) | (val >>> 31);
    }

    let a = h0;
    let b = h1;
    let c = h2;
    let d = h3;
    let e = h4;

    for (let i = 0; i < 80; i++) {
      let f;
      let k;
      if (i < 20) {
        f = (b & c) | (~b & d);
        k = 0x5a827999;
      } else if (i < 40) {
        f = b ^ c ^ d;
        k = 0x6ed9eba1;
      } else if (i < 60) {
        f = (b & c) | (b & d) | (c & d);
        k = 0x8f1bbcdc;
      } else {
        f = b ^ c ^ d;
        k = 0xca62c1d6;
      }

      const temp = (((a << 5) | (a >>> 27)) + f + e + k + w[i]) | 0;
      e = d;
      d = c;
      c = (b << 30) | (b >>> 2);
      b = a;
      a = temp;
    }

    h0 = (h0 + a) | 0;
    h1 = (h1 + b) | 0;
    h2 = (h2 + c) | 0;
    h3 = (h3 + d) | 0;
    h4 = (h4 + e) | 0;
  }

  let hex = "";
  const words = [h0, h1, h2, h3, h4];
  for (let i = 0; i < words.length; i++) {
    const val = words[i];
    let strHex = (val >>> 0).toString(16);
    while (strHex.length < 8) {
      strHex = "0" + strHex;
    }
    hex += strHex;
  }
  return hex;
}

// Credentials
const CLOUD_NAME = process.env.EXPO_PUBLIC_CLOUDINARY_CLOUD_NAME || 'dmxgxyehn';
const API_KEY = process.env.EXPO_PUBLIC_CLOUDINARY_API_KEY || '863475419813878';
const API_SECRET = process.env.EXPO_PUBLIC_CLOUDINARY_API_SECRET || 'SLJLPsfSEg2dCYTcIqEXGRq_rII';

/**
 * Uploads a file (image/video) to Cloudinary using signed uploads.
 * @param {string} fileUri - Local URI of the file
 * @param {string} mediaType - Type of media ('image' or 'video')
 * @returns {Promise<string>} - HTTPS secure URL of the uploaded asset
 */
export async function uploadToCloudinary(fileUri, mediaType = 'image') {
  if (!fileUri) return null;

  const resourceType = mediaType === 'video' ? 'video' : 'image';
  const url = `https://api.cloudinary.com/v1_1/${CLOUD_NAME}/${resourceType}/upload`;

  const timestamp = Math.floor(Date.now() / 1000).toString();

  // Create signature
  const stringToSign = `timestamp=${timestamp}${API_SECRET}`;
  const signature = sha1(stringToSign);

  // File structure for FormData in React Native
  let fileType = 'image/jpeg';
  if (resourceType === 'video') {
    fileType = 'video/mp4';
  } else if (fileUri.endsWith('.png')) {
    fileType = 'image/png';
  } else if (fileUri.endsWith('.gif')) {
    fileType = 'image/gif';
  }

  const fileName = fileUri.substring(fileUri.lastIndexOf('/') + 1) || `upload_${timestamp}.${resourceType === 'video' ? 'mp4' : 'jpg'}`;

  const formData = new FormData();
  formData.append('file', {
    uri: fileUri,
    type: fileType,
    name: fileName,
  });
  formData.append('api_key', API_KEY);
  formData.append('timestamp', timestamp);
  formData.append('signature', signature);

  try {
    const response = await axios.post(url, formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });

    if (response.data && response.data.secure_url) {
      return response.data.secure_url;
    } else {
      throw new Error('secure_url bulunamadı.');
    }
  } catch (error) {
    console.error('Cloudinary yükleme hatası:', error.response?.data || error.message);
    throw new Error(error.response?.data?.error?.message || error.message);
  }
}
/**
 * Extracts the Cloudinary public_id from a secure_url.
 * Example: https://res.cloudinary.com/demo/image/upload/v123/folder/my_photo.jpg
 *          → "folder/my_photo"
 */
export function extractPublicId(cloudinaryUrl) {
  if (!cloudinaryUrl) return null;
  try {
    // Match everything after /upload/v<version>/ or /upload/
    const match = cloudinaryUrl.match(/\/upload\/(?:v\d+\/)?(.+?)(?:\.[^.]+)?$/);
    return match ? match[1] : null;
  } catch {
    return null;
  }
}

/**
 * Deletes an asset from Cloudinary using the signed Destroy API.
 * @param {string} cloudinaryUrl - The secure_url returned by Cloudinary on upload
 * @param {string} mediaType - 'image' or 'video'
 * @returns {Promise<boolean>} - true if deleted successfully
 */
export async function deleteFromCloudinary(cloudinaryUrl, mediaType = 'image') {
  const publicId = extractPublicId(cloudinaryUrl);
  if (!publicId) {
    console.warn('deleteFromCloudinary: public_id çıkarılamadı:', cloudinaryUrl);
    return false;
  }

  const resourceType = mediaType === 'video' ? 'video' : 'image';
  const timestamp = Math.floor(Date.now() / 1000).toString();

  // Signed string: alphabetical order of params + secret
  const stringToSign = `public_id=${publicId}&timestamp=${timestamp}${API_SECRET}`;
  const signature = sha1(stringToSign);

  const formData = new FormData();
  formData.append('public_id', publicId);
  formData.append('api_key', API_KEY);
  formData.append('timestamp', timestamp);
  formData.append('signature', signature);

  try {
    const response = await axios.post(
      `https://api.cloudinary.com/v1_1/${CLOUD_NAME}/${resourceType}/destroy`,
      formData,
      { headers: { 'Content-Type': 'multipart/form-data' } }
    );
    const result = response.data?.result;
    if (result === 'ok') {
      return true;
    } else {
      console.warn('deleteFromCloudinary: beklenmeyen yanıt:', response.data);
      return false;
    }
  } catch (error) {
    console.error('deleteFromCloudinary hatası:', error.response?.data || error.message);
    return false;
  }
}
