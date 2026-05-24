const path = require('path');
const { Readable } = require('stream');
const cloudinary = require('../config/cloudinary');
const { getEnv } = require('../config/env');

const isCloudinaryConfigured = () => {
  return Boolean(
    getEnv('CLOUDINARY_CLOUD_NAME') &&
    getEnv('CLOUDINARY_API_KEY') &&
    getEnv('CLOUDINARY_API_SECRET')
  );
};

const buildPublicId = (folder, originalName) => {
  const uniqueSuffix = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
  const extension = path.extname(originalName || '').toLowerCase();
  const baseName = path.basename(originalName || 'upload', extension)
    .replace(/[^a-zA-Z0-9-_]/g, '-')
    .slice(0, 48) || 'upload';

  return {
    folder: folder.replace(/^\/+|\/+$/g, ''),
    publicId: `${baseName}-${uniqueSuffix}`,
    uniqueSuffix,
    extension
  };
};

const uploadBufferToCloudinary = ({
  buffer,
  originalName,
  mimeType,
  folder,
  resourceType = 'auto'
}) => {
  if (!isCloudinaryConfigured()) {
    throw new Error('Cloudinary is not configured');
  }

  return new Promise((resolve, reject) => {
    const { folder: cleanFolder, publicId } = buildPublicId(folder, originalName);

    const uploadStream = cloudinary.uploader.upload_stream(
      {
        folder: cleanFolder,
        public_id: publicId,
        resource_type: resourceType,
        overwrite: false,
        use_filename: false,
        unique_filename: false,
        transformation: undefined,
        format: undefined,
        type: 'upload',
        tags: [cleanFolder]
      },
      (error, result) => {
        if (error) {
          reject(error);
          return;
        }

        resolve({
          url: result.secure_url,
          publicId: result.public_id,
          format: result.format,
          resourceType: result.resource_type,
          bytes: result.bytes,
          originalName,
          mimeType
        });
      }
    );

    Readable.from(buffer).pipe(uploadStream);
  });
};

const deleteFromCloudinary = async (publicId, resourceType = 'image') => {
  if (!publicId || !isCloudinaryConfigured()) {
    return;
  }

  const result = await cloudinary.uploader.destroy(publicId, {
    resource_type: resourceType,
    invalidate: true
  });

  return result;
};

module.exports = {
  isCloudinaryConfigured,
  uploadBufferToCloudinary,
  deleteFromCloudinary
};