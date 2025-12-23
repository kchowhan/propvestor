import puppeteer from 'puppeteer';
import Handlebars from 'handlebars';
import { readFile } from 'fs/promises';
import { join } from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import { uploadFile } from './storage.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

export interface LeaseTemplateData {
  // Organization
  organizationName: string;
  
  // Property & Unit
  propertyName: string;
  propertyAddress: string;
  unitName: string;
  state: string;  // State code (e.g., "CA", "NY", "TX")
  bedrooms?: number;
  bathrooms?: number;
  squareFeet?: number;
  
  // Lease Terms
  startDate: string;
  endDate: string;
  rentAmount: string;
  depositAmount?: string;
  rentDueDay: number;
  
  // Tenants
  tenants: Array<{
    firstName: string;
    lastName: string;
    email?: string;
    phone?: string;
    isPrimary: boolean;
  }>;
  
  // Dates
  generatedDate: string;
}

/**
 * Normalize state code to uppercase (e.g., "ca" -> "CA", "California" -> "CA")
 * Maps common state names to codes
 */
function normalizeStateCode(state: string): string {
  const stateUpper = state.toUpperCase().trim();
  
  // If already a 2-letter code, return it
  if (stateUpper.length === 2) {
    return stateUpper;
  }
  
  // Map common state names to codes
  const stateMap: Record<string, string> = {
    'CALIFORNIA': 'CA',
    'NEW YORK': 'NY',
    'TEXAS': 'TX',
    'FLORIDA': 'FL',
    'ILLINOIS': 'IL',
    'PENNSYLVANIA': 'PA',
    'OHIO': 'OH',
    'GEORGIA': 'GA',
    'NORTH CAROLINA': 'NC',
    'MICHIGAN': 'MI',
    'NEW JERSEY': 'NJ',
    'VIRGINIA': 'VA',
    'WASHINGTON': 'WA',
    'ARIZONA': 'AZ',
    'MASSACHUSETTS': 'MA',
    'TENNESSEE': 'TN',
    'INDIANA': 'IN',
    'MISSOURI': 'MO',
    'MARYLAND': 'MD',
    'WISCONSIN': 'WI',
    'COLORADO': 'CO',
    'MINNESOTA': 'MN',
    'SOUTH CAROLINA': 'SC',
    'ALABAMA': 'AL',
    'LOUISIANA': 'LA',
    'KENTUCKY': 'KY',
    'OREGON': 'OR',
    'OKLAHOMA': 'OK',
    'CONNECTICUT': 'CT',
    'UTAH': 'UT',
    'IOWA': 'IA',
    'NEVADA': 'NV',
    'ARKANSAS': 'AR',
    'MISSISSIPPI': 'MS',
    'KANSAS': 'KS',
    'NEW MEXICO': 'NM',
    'NEBRASKA': 'NE',
    'WEST VIRGINIA': 'WV',
    'IDAHO': 'ID',
    'HAWAII': 'HI',
    'NEW HAMPSHIRE': 'NH',
    'MAINE': 'ME',
    'RHODE ISLAND': 'RI',
    'MONTANA': 'MT',
    'DELAWARE': 'DE',
    'SOUTH DAKOTA': 'SD',
    'NORTH DAKOTA': 'ND',
    'ALASKA': 'AK',
    'VERMONT': 'VT',
    'WYOMING': 'WY',
    'DISTRICT OF COLUMBIA': 'DC',
  };
  
  return stateMap[stateUpper] || stateUpper.substring(0, 2).toUpperCase();
}

/**
 * Get template name based on state, with fallback to default
 */
async function getTemplateName(state: string): Promise<string> {
  const stateCode = normalizeStateCode(state);
  const stateTemplatePath = join(__dirname, '../../templates', `lease-agreement-${stateCode.toLowerCase()}.hbs`);
  
  try {
    // Check if state-specific template exists
    await readFile(stateTemplatePath, 'utf-8');
    return `lease-agreement-${stateCode.toLowerCase()}`;
  } catch {
    // Fall back to default template
    return 'lease-agreement';
  }
}

/**
 * Load and compile a Handlebars template
 */
async function loadTemplate(templateName: string): Promise<HandlebarsTemplateDelegate> {
  const templatePath = join(__dirname, '../../templates', `${templateName}.hbs`);
  try {
    const templateContent = await readFile(templatePath, 'utf-8');
    return Handlebars.compile(templateContent);
  } catch (error) {
    throw new Error(`Failed to load template ${templateName}: ${error}`);
  }
}

/**
 * Generate PDF from HTML template
 * Automatically selects state-specific template if available, otherwise uses default
 */
export async function generateLeasePdf(
  data: LeaseTemplateData,
  templateName?: string
): Promise<Buffer> {
  // If template name not provided, auto-select based on state
  const selectedTemplate = templateName || await getTemplateName(data.state);
  
  // Load and compile template
  const template = await loadTemplate(selectedTemplate);
  const html = template(data);

  // Launch Puppeteer
  const browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
  });

  try {
    const page = await browser.newPage();
    
    // Set content
    await page.setContent(html, { waitUntil: 'networkidle0' });
    
    // Generate PDF
    const pdf = await page.pdf({
      format: 'Letter',
      margin: {
        top: '0.5in',
        right: '0.5in',
        bottom: '0.5in',
        left: '0.5in',
      },
      printBackground: true,
    });

    return Buffer.from(pdf);
  } finally {
    await browser.close();
  }
}

/**
 * Generate lease PDF and upload to GCS
 * Automatically selects state-specific template if available
 */
export async function generateAndUploadLeasePdf(
  data: LeaseTemplateData,
  organizationId: string,
  leaseId: string,
  templateName?: string
): Promise<{ storageKey: string; url: string }> {
  // Generate PDF (will auto-select state template if templateName not provided)
  const pdfBuffer = await generateLeasePdf(data, templateName);
  
  // Upload to GCS
  const fileName = `lease-${leaseId}-${Date.now()}.pdf`;
  const storageKey = await uploadFile(pdfBuffer, fileName, 'application/pdf', `leases/${organizationId}`);
  
  // Get signed URL (valid for 1 year - 365 days * 24 hours * 60 minutes)
  const { getSignedUrl } = await import('./storage.js');
  const url = await getSignedUrl(storageKey, 365 * 24 * 60);
  
  return { storageKey, url };
}

/**
 * Format currency
 */
Handlebars.registerHelper('currency', (value: number | string) => {
  const num = typeof value === 'string' ? parseFloat(value) : value;
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
  }).format(num);
});

/**
 * Format date
 */
Handlebars.registerHelper('date', (value: Date | string) => {
  const date = typeof value === 'string' ? new Date(value) : value;
  return date.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
});

/**
 * Equality helper for Handlebars
 */
Handlebars.registerHelper('eq', (a: any, b: any) => {
  return a === b;
});

/**
 * Addition helper for Handlebars
 */
Handlebars.registerHelper('add', (a: number, b: number) => {
  return a + b;
});

