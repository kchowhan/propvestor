import { Storage } from '@google-cloud/storage';
import { env } from '../config/env.js';

// Initialize Google Cloud Storage client
// If GOOGLE_APPLICATION_CREDENTIALS is set, it will use that service account
// Otherwise, it will use the credentials from the JSON file or environment
let storage: Storage | null = null;

const getStorage = (): Storage => {
  if (!storage) {
    if (env.GCS_PROJECT_ID && env.GCS_KEY_FILENAME) {
      // Use explicit credentials
      storage = new Storage({
        projectId: env.GCS_PROJECT_ID,
        keyFilename: env.GCS_KEY_FILENAME,
      });
    } else if (env.GCS_PROJECT_ID && env.GCS_CREDENTIALS) {
      // Use credentials from environment variable (JSON string)
      storage = new Storage({
        projectId: env.GCS_PROJECT_ID,
        credentials: JSON.parse(env.GCS_CREDENTIALS),
      });
    } else {
      // Try to use default credentials (GOOGLE_APPLICATION_CREDENTIALS env var or default)
      storage = new Storage({
        projectId: env.GCS_PROJECT_ID || undefined,
      });
    }
  }
  return storage;
};

const getBucket = () => {
  if (!env.GCS_BUCKET_NAME) {
    throw new Error('GCS_BUCKET_NAME is not configured');
  }
  return getStorage().bucket(env.GCS_BUCKET_NAME);
};

/**
 * Upload a file to Google Cloud Storage
 * @param fileBuffer - The file buffer to upload
 * @param fileName - The desired file name in storage
 * @param contentType - MIME type of the file
 * @param folder - Optional folder path (e.g., 'leases', 'documents')
 * @returns The storage key (path) of the uploaded file
 */
export const uploadFile = async (
  fileBuffer: Buffer,
  fileName: string,
  contentType: string,
  folder?: string,
): Promise<string> => {
  try {
    const bucket = getBucket();
    const storagePath = folder ? `${folder}/${fileName}` : fileName;
    const file = bucket.file(storagePath);

    await file.save(fileBuffer, {
      metadata: {
        contentType,
      },
      public: false, // Files are private by default
    });

    return storagePath;
  } catch (error) {
    console.error('Error uploading file to GCS:', error);
    throw new Error(`Failed to upload file: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
};

/**
 * Get a signed URL for downloading a file
 * @param storageKey - The storage key (path) of the file
 * @param expiresInMinutes - URL expiration time in minutes (default: 60)
 * @returns Signed URL that can be used to download the file
 */
export const getSignedUrl = async (
  storageKey: string,
  expiresInMinutes: number = 60,
): Promise<string> => {
  try {
    const bucket = getBucket();
    const file = bucket.file(storageKey);

    const [url] = await file.getSignedUrl({
      version: 'v4',
      action: 'read',
      expires: Date.now() + expiresInMinutes * 60 * 1000,
    });

    return url;
  } catch (error) {
    console.error('Error generating signed URL:', error);
    throw new Error(`Failed to generate download URL: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
};

/**
 * Delete a file from Google Cloud Storage
 * @param storageKey - The storage key (path) of the file to delete
 */
export const deleteFile = async (storageKey: string): Promise<void> => {
  try {
    const bucket = getBucket();
    const file = bucket.file(storageKey);
    await file.delete();
  } catch (error) {
    console.error('Error deleting file from GCS:', error);
    throw new Error(`Failed to delete file: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
};

/**
 * Check if a file exists in storage
 * @param storageKey - The storage key (path) of the file
 * @returns True if file exists, false otherwise
 */
export const fileExists = async (storageKey: string): Promise<boolean> => {
  try {
    const bucket = getBucket();
    const file = bucket.file(storageKey);
    const [exists] = await file.exists();
    return exists;
  } catch (error) {
    console.error('Error checking file existence:', error);
    return false;
  }
};

