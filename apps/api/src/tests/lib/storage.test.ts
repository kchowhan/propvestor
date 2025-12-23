import { describe, it, expect, vi, beforeEach } from 'vitest';
import { uploadFile, getSignedUrl, deleteFile, fileExists } from '../../lib/storage.js';

// Mock env config
vi.mock('../../config/env.js', () => ({
  env: {
    GCS_BUCKET_NAME: 'test-bucket',
    GCS_PROJECT_ID: 'test-project',
  },
}));

// Create shared mock instances
const mockFile = {
  save: vi.fn(() => Promise.resolve()),
  getSignedUrl: vi.fn(() => Promise.resolve(['https://signed-url.com'])),
  delete: vi.fn(() => Promise.resolve()),
  exists: vi.fn(() => Promise.resolve([true])),
};

const mockBucket = {
  file: vi.fn(() => mockFile),
};

// Mock Google Cloud Storage
vi.mock('@google-cloud/storage', () => ({
  Storage: vi.fn(() => ({
    bucket: vi.fn(() => mockBucket),
  })),
}));

describe('Storage Library', () => {
  beforeEach(() => {
    // Reset mocks before each test
    mockFile.save.mockClear();
    mockFile.getSignedUrl.mockClear();
    mockFile.delete.mockClear();
    mockFile.exists.mockClear();
    mockBucket.file.mockClear();
    
    // Set default return values
    mockFile.save.mockResolvedValue(undefined);
    mockFile.getSignedUrl.mockResolvedValue(['https://signed-url.com']);
    mockFile.delete.mockResolvedValue(undefined);
    mockFile.exists.mockResolvedValue([true]);
    mockBucket.file.mockReturnValue(mockFile);
  });

  describe('uploadFile', () => {
    it('should upload file successfully', async () => {
      const buffer = Buffer.from('test content');
      const result = await uploadFile(buffer, 'test.txt', 'text/plain', 'documents');

      expect(result).toBeDefined();
      expect(result).toContain('documents');
      expect(mockFile.save).toHaveBeenCalled();
    });

    it('should handle errors', async () => {
      mockFile.save.mockRejectedValueOnce(new Error('Storage error'));
      
      await expect(
        uploadFile(Buffer.from('test'), 'test.txt', 'text/plain')
      ).rejects.toThrow('Failed to upload file');
    });
  });

  describe('getSignedUrl', () => {
    it('should get signed URL', async () => {
      const url = await getSignedUrl('documents/test.txt', 3600);

      expect(url).toBe('https://signed-url.com');
      expect(mockFile.getSignedUrl).toHaveBeenCalled();
    });
  });

  describe('deleteFile', () => {
    it('should delete file', async () => {
      await expect(deleteFile('documents/test.txt')).resolves.not.toThrow();
      expect(mockFile.delete).toHaveBeenCalled();
    });
  });

  describe('fileExists', () => {
    it('should check if file exists', async () => {
      const exists = await fileExists('documents/test.txt');
      expect(exists).toBe(true);
      expect(mockFile.exists).toHaveBeenCalled();
    });
  });
});
