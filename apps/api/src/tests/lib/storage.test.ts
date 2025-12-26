import { describe, it, expect, vi, beforeEach } from 'vitest';
import { PassThrough } from 'stream';
import { uploadFile, uploadFileStream, getSignedUrl, deleteFile, fileExists } from '../../lib/storage.js';
import * as fs from 'fs';

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
  createWriteStream: vi.fn(() => new PassThrough()),
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

vi.mock('fs', () => ({
  createReadStream: vi.fn(),
}));

describe('Storage Library', () => {
  beforeEach(() => {
    // Reset mocks before each test
    mockFile.save.mockClear();
    mockFile.createWriteStream.mockClear();
    mockFile.getSignedUrl.mockClear();
    mockFile.delete.mockClear();
    mockFile.exists.mockClear();
    mockBucket.file.mockClear();
    
    // Set default return values
    mockFile.save.mockResolvedValue(undefined);
    mockFile.createWriteStream.mockReturnValue(new PassThrough());
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

  describe('uploadFileStream', () => {
    it('should upload file successfully', async () => {
      // Create a proper mock stream that will finish
      const mockWriteStream = new PassThrough();
      mockFile.createWriteStream.mockReturnValue(mockWriteStream);
      
      // Mock createReadStream to return a readable stream
      const mockReadStream = new PassThrough();
      vi.mocked(fs.createReadStream).mockReturnValue(mockReadStream as any);
      
      // Start the upload (it will wait for streams to finish)
      const uploadPromise = uploadFileStream('/tmp/test.txt', 'test.txt', 'text/plain', 'documents');
      
      // Simulate file read and write completion
      process.nextTick(() => {
        mockReadStream.push('test content');
        mockReadStream.end();
        mockWriteStream.end();
      });

      const result = await uploadPromise;

      expect(result).toBeDefined();
      expect(result).toContain('documents');
      expect(mockFile.createWriteStream).toHaveBeenCalled();
    }, 10000);

    it('should handle errors', async () => {
      mockFile.createWriteStream.mockImplementationOnce(() => {
        const stream = new PassThrough();
        process.nextTick(() => stream.emit('error', new Error('Stream error')));
        return stream;
      });

      await expect(
        uploadFileStream('/tmp/test.txt', 'test.txt', 'text/plain')
      ).rejects.toThrow('Failed to upload file');
      
      // Suppress the error log from the stream error handler
      // The error is expected and handled correctly
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
