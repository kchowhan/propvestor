declare module 'docusign-esign' {
  export class ApiClient {
    setBasePath(basePath: string): void;
    setOAuthBasePath(basePath: string): void;
    addDefaultHeader(header: string, value: string): void;
    requestJWTUserToken(
      integrationKey: string,
      userId: string,
      scopes: string[],
      privateKey: string | Buffer,
      expiresIn: number
    ): Promise<{ body: { access_token: string } }>;
    getUserInfo(accessToken: string): Promise<{
      accounts: Array<{
        accountId: string;
        isDefault: boolean;
        baseUri: string;
      }>;
    }>;
  }

  export class EnvelopesApi {
    constructor(apiClient: ApiClient);
    createEnvelope(
      accountId: string,
      options: { envelopeDefinition: EnvelopeDefinition }
    ): Promise<{ envelopeId: string }>;
    getEnvelope(accountId: string, envelopeId: string): Promise<Envelope>;
    getDocument(
      accountId: string,
      envelopeId: string,
      documentId: string
    ): Promise<Buffer>;
  }

  export class EnvelopeDefinition {
    emailSubject?: string;
    emailBlurb?: string;
    documents?: Document[];
    recipients?: Recipients;
    status?: string;
  }

  export class Document {
    documentBase64?: string;
    name?: string;
    fileExtension?: string;
    documentId?: string;
  }

  export class Recipients {
    signers?: Signer[];
  }

  export class Signer {
    email?: string;
    name?: string;
    recipientId?: string;
    routingOrder?: string;
    tabs?: Tabs;
  }

  export class Tabs {
    signHereTabs?: SignHere[];
    dateSignedTabs?: DateSigned[];
    textTabs?: Text[];
  }

  export class SignHere {
    anchorString?: string;
    anchorUnits?: string;
    anchorXOffset?: string;
    anchorYOffset?: string;
    documentId?: string;
    pageNumber?: string;
    recipientId?: string;
    xPosition?: string;
    yPosition?: string;
  }

  export class DateSigned {
    anchorString?: string;
    anchorUnits?: string;
    anchorXOffset?: string;
    anchorYOffset?: string;
    documentId?: string;
    pageNumber?: string;
    recipientId?: string;
    xPosition?: string;
    yPosition?: string;
  }

  export class Text {
    anchorString?: string;
    anchorUnits?: string;
    anchorXOffset?: string;
    anchorYOffset?: string;
    documentId?: string;
    pageNumber?: string;
    recipientId?: string;
    xPosition?: string;
    yPosition?: string;
    value?: string;
    locked?: string;
    font?: string;
    fontSize?: string;
  }

  export interface Envelope {
    envelopeId?: string;
    status?: string;
    emailSubject?: string;
    sentDateTime?: string;
    completedDateTime?: string;
    statusDateTime?: string;
  }
}
