const fs = require('fs/promises');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');
const { getEnv, getRequiredEnv, isProduction } = require('../config/env');

let supabaseClient = null;

const isCloudStorageConfigured = () => {
  return Boolean(
    getEnv('SUPABASE_URL') &&
    getEnv('SUPABASE_SERVICE_ROLE_KEY') &&
    getEnv('SUPABASE_STORAGE_BUCKET')
  );
};

const getSupabaseClient = () => {
  if (!supabaseClient) {
    supabaseClient = createClient(
      getRequiredEnv('SUPABASE_URL'),
      getRequiredEnv('SUPABASE_SERVICE_ROLE_KEY')
    );
  }

  return supabaseClient;
};

const buildStorageKey = (folder, originalName) => {
  const sanitizedFolder = folder.replace(/^\/+|\/+$/g, '');
  const extension = path.extname(originalName || '').toLowerCase();
  const baseName = path.basename(originalName || 'upload', extension)
    .replace(/[^a-zA-Z0-9-_]/g, '-')
    .slice(0, 48) || 'upload';
  const uniqueSuffix = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
  return `${sanitizedFolder}/${baseName}-${uniqueSuffix}${extension}`.replace(/\/+/g, '/');
};

const uploadFile = async ({ filePath, fileBuffer, originalName, mimeType, folder }) => {
  if (isCloudStorageConfigured()) {
    const bucket = getRequiredEnv('SUPABASE_STORAGE_BUCKET');
    const key = buildStorageKey(folder, originalName);
    const client = getSupabaseClient();
    const buffer = fileBuffer || await fs.readFile(filePath);

    const { error } = await client.storage.from(bucket).upload(key, buffer, {
      contentType: mimeType || 'application/octet-stream',
      upsert: false
    });

    if (error) {
      throw new Error(`Cloud upload failed: ${error.message}`);
    }

    const { data } = client.storage.from(bucket).getPublicUrl(key);
    if (filePath) {
      try {
        await fs.unlink(filePath);
      } catch (cleanupError) {
        if (cleanupError.code !== 'ENOENT') {
          throw cleanupError;
        }
      }
    }
    return {
      storage: 'supabase',
      key,
      path: key,
      url: data.publicUrl,
      filename: path.basename(key),
      originalName,
      mimeType,
      size: fileBuffer ? fileBuffer.length : undefined
    };
  }

  if (isProduction) {
    throw new Error('Cloud storage is not configured. Set SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, and SUPABASE_STORAGE_BUCKET in Railway.');
  }

  return {
    storage: 'local',
    key: filePath,
    path: filePath,
    url: filePath.startsWith('/uploads/') ? filePath : `/uploads/${folder.replace(/^\/+|\/+$/g, '')}/${path.basename(filePath)}`,
    filename: path.basename(filePath),
    originalName,
    mimeType,
    size: fileBuffer ? fileBuffer.length : undefined
  };
};

const deleteStoredFile = async ({ filePath, storage, key }) => {
  try {
    if (storage === 'supabase' && key) {
      const bucket = getRequiredEnv('SUPABASE_STORAGE_BUCKET');
      const client = getSupabaseClient();
      const { error } = await client.storage.from(bucket).remove([key]);
      if (error) {
        throw new Error(error.message);
      }
      return;
    }

    if (filePath) {
      await fs.unlink(filePath);
    }
  } catch (error) {
    if (error.code !== 'ENOENT') {
      throw error;
    }
  }
};

module.exports = {
  isCloudStorageConfigured,
  uploadFile,
  deleteStoredFile
};