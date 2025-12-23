import docusign from 'docusign-esign';
import { AppError } from './errors.js';
import { getSignedUrl } from './storage.js';

const { ApiClient, EnvelopesApi, EnvelopeDefinition, Document, Signer, SignHere, Tabs, Text, DateSigned } = docusign;

let apiClient: docusign.ApiClient | null = null;

/**
 * Initialize DocuSign API client
 */
function getApiClient(): docusign.ApiClient {
  if (!apiClient) {
    apiClient = new ApiClient();
    
    const basePath = process.env.DOCUSIGN_BASE_PATH || 'https://demo.docusign.net/restapi';
    apiClient.setBasePath(basePath);
    
    // Use JWT authentication
    const integratorKey = process.env.DOCUSIGN_INTEGRATOR_KEY;
    const userId = process.env.DOCUSIGN_USER_ID;
    const privateKey = process.env.DOCUSIGN_PRIVATE_KEY;
    const authServer = process.env.DOCUSIGN_AUTH_SERVER || 'account.docusign.com';
    
    if (!integratorKey || !userId || !privateKey) {
      throw new AppError(500, 'CONFIG_ERROR', 'DocuSign credentials not configured');
    }
    
    // JWT authentication will be handled in sendEnvelope
    apiClient.setOAuthBasePath(authServer);
  }
  
  return apiClient;
}

/**
 * Get access token using JWT
 */
async function getAccessToken(): Promise<string> {
  const apiClient = getApiClient();
  const integratorKey = process.env.DOCUSIGN_INTEGRATOR_KEY!;
  const userId = process.env.DOCUSIGN_USER_ID!;
  const privateKey = process.env.DOCUSIGN_PRIVATE_KEY!;
  const authServer = process.env.DOCUSIGN_AUTH_SERVER || 'account.docusign.com';
  
  try {
    const results = await apiClient.requestJWTUserToken(
      integratorKey,
      userId,
      ['signature', 'impersonation'],
      Buffer.from(privateKey, 'base64'),
      3600 // 1 hour
    );
    
    return results.body.access_token;
  } catch (error: any) {
    throw new AppError(500, 'DOCUSIGN_AUTH_ERROR', `Failed to authenticate with DocuSign: ${error.message}`);
  }
}

/**
 * Send lease document for signature
 */
export interface SignerInfo {
  email: string;
  name: string;
  routingOrder: number;
}

export interface SendEnvelopeOptions {
  pdfBuffer: Buffer;
  fileName: string;
  signers: SignerInfo[];
  emailSubject?: string;
  emailBlurb?: string;
}

export async function sendEnvelope(options: SendEnvelopeOptions): Promise<string> {
  const { pdfBuffer, fileName, signers, emailSubject, emailBlurb } = options;
  
  // Get access token
  const accessToken = await getAccessToken();
  const apiClient = getApiClient();
  apiClient.addDefaultHeader('Authorization', `Bearer ${accessToken}`);
  
  // Get account ID
  const userInfo = await apiClient.getUserInfo(accessToken);
  const accountId = userInfo.accounts[0].accountId;
  
  // Create envelope definition
  const envelope = new EnvelopeDefinition();
  envelope.emailSubject = emailSubject || 'Please sign your lease agreement';
  envelope.emailBlurb = emailBlurb || 'Please review and sign the attached lease agreement.';
  envelope.status = 'sent';
  
  // Add document
  const document = new Document();
  document.documentBase64 = pdfBuffer.toString('base64');
  document.name = fileName;
  document.fileExtension = 'pdf';
  document.documentId = '1';
  envelope.documents = [document];
  
  // Add signers
  envelope.recipients = new docusign.Recipients();
  envelope.recipients.signers = signers.map((signer, index) => {
    const signerObj = new Signer();
    signerObj.email = signer.email;
    signerObj.name = signer.name;
    signerObj.recipientId = (index + 1).toString();
    signerObj.routingOrder = signer.routingOrder.toString();
    
    // Add signature tab
    const signHere = new SignHere();
    signHere.documentId = '1';
    signHere.pageNumber = '1';
    signHere.recipientId = signerObj.recipientId;
    signHere.xPosition = '100';
    signHere.yPosition = '700';
    
    // Add date signed tab
    const dateSigned = new DateSigned();
    dateSigned.documentId = '1';
    dateSigned.pageNumber = '1';
    dateSigned.recipientId = signerObj.recipientId;
    dateSigned.xPosition = '300';
    dateSigned.yPosition = '700';
    
    const tabs = new Tabs();
    tabs.signHereTabs = [signHere];
    tabs.dateSignedTabs = [dateSigned];
    signerObj.tabs = tabs;
    
    return signerObj;
  });
  
  // Send envelope
  const envelopesApi = new EnvelopesApi(apiClient);
  try {
    const result = await envelopesApi.createEnvelope(accountId, { envelopeDefinition: envelope });
    return result.envelopeId;
  } catch (error: any) {
    throw new AppError(500, 'DOCUSIGN_ERROR', `Failed to send envelope: ${error.message}`);
  }
}

/**
 * Get envelope status
 */
export async function getEnvelopeStatus(envelopeId: string): Promise<{
  status: string;
  statusDateTime: string;
  completedDateTime?: string;
}> {
  const accessToken = await getAccessToken();
  const apiClient = getApiClient();
  apiClient.addDefaultHeader('Authorization', `Bearer ${accessToken}`);
  
  const userInfo = await apiClient.getUserInfo(accessToken);
  const accountId = userInfo.accounts[0].accountId;
  
  const envelopesApi = new EnvelopesApi(apiClient);
  try {
    const envelope = await envelopesApi.getEnvelope(accountId, envelopeId);
    return {
      status: envelope.status || 'unknown',
      statusDateTime: envelope.statusDateTime || '',
      completedDateTime: envelope.completedDateTime,
    };
  } catch (error: any) {
    throw new AppError(500, 'DOCUSIGN_ERROR', `Failed to get envelope status: ${error.message}`);
  }
}

/**
 * Download completed document
 */
export async function downloadCompletedDocument(
  envelopeId: string,
  storageKey: string
): Promise<void> {
  const accessToken = await getAccessToken();
  const apiClient = getApiClient();
  apiClient.addDefaultHeader('Authorization', `Bearer ${accessToken}`);
  
  const userInfo = await apiClient.getUserInfo(accessToken);
  const accountId = userInfo.accounts[0].accountId;
  
  const envelopesApi = new EnvelopesApi(apiClient);
  try {
    // Get the combined PDF (all documents merged)
    const result = await envelopesApi.getDocument(accountId, envelopeId, 'combined');
    
    // Handle different response types
    let pdfBuffer: Buffer;
    if (Buffer.isBuffer(result)) {
      pdfBuffer = result;
    } else if (typeof result === 'string') {
      pdfBuffer = Buffer.from(result, 'base64');
    } else {
      // Try to get the body if it's a response object
      pdfBuffer = Buffer.from((result as any).body || result, 'binary');
    }
    
    // Upload to GCS
    const { uploadFile } = await import('./storage.js');
    // Extract filename from storageKey
    const pathParts = storageKey.split('/');
    const fileName = pathParts[pathParts.length - 1];
    const folder = pathParts.slice(0, -1).join('/');
    await uploadFile(pdfBuffer, fileName, 'application/pdf', folder || undefined);
  } catch (error: any) {
    throw new AppError(500, 'DOCUSIGN_ERROR', `Failed to download document: ${error.message}`);
  }
}

