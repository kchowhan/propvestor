import { AppError } from './errors.js';
import crypto from 'crypto';

// RentSpree API client
// Note: This is a placeholder implementation. You'll need to replace with actual RentSpree API endpoints
// based on their documentation at https://docs.rentspree.com

import { env } from '../config/env.js';

let rentspreeApiKey: string | null = null;
let rentspreeBaseUrl: string = env.RENTSPREE_BASE_URL || 'https://api.rentspree.com/v1';

function getApiKey(): string {
  if (!rentspreeApiKey) {
    rentspreeApiKey = env.RENTSPREE_API_KEY || '';
    if (!rentspreeApiKey) {
      throw new AppError(500, 'CONFIG_ERROR', 'RentSpree API key not configured');
    }
  }
  return rentspreeApiKey;
}

export interface CreateApplicationRequest {
  applicantFirstName: string;
  applicantLastName: string;
  applicantEmail: string;
  applicantPhone?: string;
  propertyAddress?: string;
  unitNumber?: string;
  rentAmount?: number;
  // Additional fields as required by RentSpree
}

export interface CreateApplicationResponse {
  applicationId: string; // RentSpree's external request ID
  applicationUrl: string; // Link for applicant to complete screening
  status: string;
}

/**
 * Create a new screening application in RentSpree
 * 
 * NOTE: This implementation uses a generic API structure. You MUST:
 * 1. Review RentSpree API documentation at https://docs.rentspree.com
 * 2. Update the endpoint URL if different
 * 3. Update request/response format to match RentSpree's actual API
 * 4. Verify authentication method (Bearer token, API key in header, etc.)
 * 5. Test with RentSpree sandbox/test environment first
 */
export async function createScreeningApplication(
  request: CreateApplicationRequest
): Promise<CreateApplicationResponse> {
  const apiKey = getApiKey();

  try {
    // IMPORTANT: Verify this endpoint with RentSpree documentation
    // Common alternatives: /api/v1/applications, /v1/tenant-screening, /applications/create
    const endpoint = `${rentspreeBaseUrl}/applications`;
    
    // IMPORTANT: Verify request format with RentSpree documentation
    // This is a generic structure - update based on actual API requirements
    const requestBody = {
      applicant: {
        firstName: request.applicantFirstName,
        lastName: request.applicantLastName,
        email: request.applicantEmail,
        phone: request.applicantPhone,
      },
      property: {
        address: request.propertyAddress,
        unit: request.unitNumber,
      },
      rentAmount: request.rentAmount,
      // Add any additional fields required by RentSpree
    };

    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        // IMPORTANT: Verify authentication method with RentSpree
        // Common options: 'Authorization: Bearer ${apiKey}', 'X-API-Key: ${apiKey}', etc.
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
        // Add any additional headers required by RentSpree
      },
      body: JSON.stringify(requestBody),
    });

    if (!response.ok) {
      let errorMessage = 'Unknown error';
      try {
        const errorData = await response.json();
        errorMessage = errorData.message || errorData.error || JSON.stringify(errorData);
      } catch {
        errorMessage = `HTTP ${response.status}: ${response.statusText}`;
      }
      
      throw new AppError(
        response.status,
        'RENTSPREE_ERROR',
        `Failed to create screening application: ${errorMessage}`
      );
    }

    const data = await response.json();

    // IMPORTANT: Verify response structure with RentSpree documentation
    // Update field mappings based on actual API response
    return {
      applicationId: data.id || data.applicationId || data.application_id || data.requestId,
      applicationUrl: data.applicationUrl || data.application_url || data.link || data.url || data.applicationLink,
      status: data.status || data.state || 'PENDING',
    };
  } catch (error: any) {
    if (error instanceof AppError) {
      throw error;
    }
    
    // Handle network errors
    if (error.message?.includes('fetch failed') || error.code === 'ENOTFOUND') {
      throw new AppError(
        503,
        'RENTSPREE_ERROR',
        `Failed to connect to RentSpree API: ${error.message}`
      );
    }
    
    throw new AppError(500, 'RENTSPREE_ERROR', `Failed to create application: ${error.message}`);
  }
}

/**
 * Get application status from RentSpree
 * 
 * NOTE: Update field mappings based on RentSpree's actual API response structure
 */
export async function getApplicationStatus(applicationId: string): Promise<{
  status: string;
  recommendation?: string;
  creditScore?: number;
  incomeVerified?: boolean;
  evictionHistory?: boolean;
  criminalHistory?: boolean;
  flags?: string[];
  reportPdfUrl?: string;
}> {
  const apiKey = getApiKey();

  try {
    // IMPORTANT: Verify endpoint format with RentSpree documentation
    const endpoint = `${rentspreeBaseUrl}/applications/${applicationId}`;
    
    const response = await fetch(endpoint, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      let errorMessage = 'Failed to get application status';
      try {
        const errorData = await response.json();
        errorMessage = errorData.message || errorData.error || errorMessage;
      } catch {
        errorMessage = `HTTP ${response.status}: ${response.statusText}`;
      }
      
      throw new AppError(
        response.status,
        'RENTSPREE_ERROR',
        errorMessage
      );
    }

    const data = await response.json();

    // IMPORTANT: Update field mappings based on RentSpree's actual response structure
    // Common field name variations are included as fallbacks
    return {
      status: data.status || data.state || data.applicationStatus || 'PENDING',
      recommendation: data.recommendation || data.decision || data.recommendationStatus,
      creditScore: data.creditScore || data.credit_score || data.score?.credit,
      incomeVerified: data.incomeVerified !== undefined 
        ? data.incomeVerified 
        : (data.income_verified !== undefined ? data.income_verified : undefined),
      evictionHistory: data.evictionHistory !== undefined
        ? data.evictionHistory
        : (data.eviction_history !== undefined ? data.eviction_history : undefined),
      criminalHistory: data.criminalHistory !== undefined
        ? data.criminalHistory
        : (data.criminal_history !== undefined ? data.criminal_history : undefined),
      flags: data.flags || data.warnings || data.riskFlags || data.risk_flags || [],
      reportPdfUrl: data.reportUrl || data.report_url || data.pdfUrl || data.pdf_url || data.reportPdf || data.report_pdf,
    };
  } catch (error: any) {
    if (error instanceof AppError) {
      throw error;
    }
    
    if (error.message?.includes('fetch failed') || error.code === 'ENOTFOUND') {
      throw new AppError(
        503,
        'RENTSPREE_ERROR',
        `Failed to connect to RentSpree API: ${error.message}`
      );
    }
    
    throw new AppError(500, 'RENTSPREE_ERROR', `Failed to get application status: ${error.message}`);
  }
}

/**
 * Verify webhook signature from RentSpree
 * 
 * IMPORTANT: Implement based on RentSpree's actual webhook signature method
 * Common methods:
 * - HMAC-SHA256 with timestamp + payload
 * - HMAC-SHA1
 * - X-Signature header with specific format
 * 
 * Check RentSpree webhook documentation for exact implementation
 */
export function verifyWebhookSignature(
  payload: string,
  signature: string,
  secret: string
): boolean {
  if (!secret) {
    console.warn('RentSpree webhook secret not configured - skipping signature verification');
    return true; // In development, allow without verification
  }

  try {
    // IMPORTANT: Replace with RentSpree's actual signature verification method
    // Example for HMAC-SHA256 (common pattern):
    
    // Common pattern: HMAC-SHA256 of timestamp + payload
    // Adjust based on RentSpree's actual method
    // Some services include timestamp in signature: timestamp + payload
    const expectedSignature = crypto
      .createHmac('sha256', secret)
      .update(payload)
      .digest('hex');
    
    // Use constant-time comparison to prevent timing attacks
    if (signature.length !== expectedSignature.length) {
      return false;
    }
    
    return crypto.timingSafeEqual(
      Buffer.from(signature),
      Buffer.from(expectedSignature)
    );
    
    // Alternative: Simple comparison (if RentSpree uses different format)
    // return signature === expectedSignature;
    
  } catch (error) {
    console.error('Error verifying RentSpree webhook signature:', error);
    return false;
  }
}

