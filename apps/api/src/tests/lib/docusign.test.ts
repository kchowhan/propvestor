import { describe, it, expect, vi, beforeEach } from 'vitest';
import { sendEnvelope, downloadCompletedDocument } from '../../lib/docusign.js';

// Mock storage
vi.mock('../../lib/storage.js', () => ({
  uploadFile: vi.fn(() => Promise.resolve('documents/test-file.pdf')),
  getSignedUrl: vi.fn(() => Promise.resolve('https://signed-url.com')),
  deleteFile: vi.fn(() => Promise.resolve()),
  fileExists: vi.fn(() => Promise.resolve(true)),
}));

vi.mock('../../config/env.js', () => ({
  env: {
    GCS_BUCKET_NAME: 'test-bucket',
    GCS_PROJECT_ID: 'test-project',
  },
}));

// Mock DocuSign SDK
vi.mock('docusign-esign', () => {
  const Recipients = vi.fn(function() {
    this.signers = [];
  });
  
  const DateSigned = vi.fn(function() {
    this.documentId = '';
    this.pageNumber = '';
  });
  
  const FullName = vi.fn(function() {
    this.documentId = '';
    this.pageNumber = '';
  });
  
  const InitialHere = vi.fn(function() {
    this.documentId = '';
    this.pageNumber = '';
  });
  
  return {
    default: {
      ApiClient: vi.fn(() => ({
        setBasePath: vi.fn(),
        setOAuthBasePath: vi.fn(),
        addDefaultHeader: vi.fn(),
        requestJWTUserToken: vi.fn(() => Promise.resolve({
          body: { access_token: 'test-token' },
        })),
        getUserInfo: vi.fn(() => Promise.resolve({
          accounts: [{ accountId: 'test-account' }],
        })),
      })),
      EnvelopesApi: vi.fn(() => ({
        createEnvelope: vi.fn(() => Promise.resolve({
          envelopeId: 'test-envelope-id',
        })),
        getDocument: vi.fn(() => Promise.resolve(Buffer.from('pdf content'))),
      })),
      EnvelopeDefinition: vi.fn(function() {
        this.recipients = new Recipients();
      }),
      Document: vi.fn(),
      Signer: vi.fn(),
      SignHere: vi.fn(),
      Tabs: vi.fn(),
      Recipients,
      DateSigned,
      FullName,
      InitialHere,
    },
  };
});

describe('DocuSign Library', () => {
  beforeEach(() => {
    process.env.DOCUSIGN_INTEGRATOR_KEY = 'test-key';
    process.env.DOCUSIGN_USER_ID = 'test-user';
    process.env.DOCUSIGN_PRIVATE_KEY = Buffer.from('test-key').toString('base64');
  });

  describe('sendEnvelope', () => {
    it('should send envelope for signature', async () => {
      const result = await sendEnvelope({
        pdfBuffer: Buffer.from('test pdf'),
        fileName: 'lease.pdf',
        signers: [
          {
            email: 'tenant@example.com',
            name: 'John Doe',
            routingOrder: 1,
          },
        ],
      });

      expect(result).toBeDefined();
      expect(result).toBe('test-envelope-id');
    });
  });

  describe('downloadCompletedDocument', () => {
    it('should download completed document', async () => {
      await downloadCompletedDocument('test-envelope-id', 'leases/test-lease.pdf');
      // Should not throw
    });
  });
});

