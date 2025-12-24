import dotenv from 'dotenv';
import { z } from 'zod';

dotenv.config();

const envSchema = z.object({
  PORT: z.coerce.number().default(4000),
  DATABASE_URL: z.string().min(1),
  JWT_SECRET: z.string().min(10),
  JWT_EXPIRES_IN: z.string().default('7d'),
  CORS_ORIGIN: z.string().default('http://localhost:5173'), // Can be comma-separated for multiple origins
  // Email configuration (optional - defaults to console logging)
  SMTP_HOST: z.string().optional(),
  SMTP_PORT: z.string().optional(),
  SMTP_USER: z.string().optional(),
  SMTP_PASS: z.string().optional(),
  SMTP_SECURE: z.string().optional(),
  SMTP_FROM: z.string().optional(),
  APP_URL: z.string().optional(),
  // Google Cloud Storage configuration
  GCS_PROJECT_ID: z.string().optional(),
  GCS_BUCKET_NAME: z.string().optional(),
  GCS_KEY_FILENAME: z.string().optional(), // Path to service account key file
  GCS_CREDENTIALS: z.string().optional(), // JSON string of credentials (alternative to key file)
  // DocuSign configuration
  DOCUSIGN_INTEGRATOR_KEY: z.string().optional(),
  DOCUSIGN_USER_ID: z.string().optional(),
  DOCUSIGN_PRIVATE_KEY: z.string().optional(), // Base64 encoded private key
  DOCUSIGN_BASE_PATH: z.string().optional(), // Default: https://demo.docusign.net/restapi
  DOCUSIGN_AUTH_SERVER: z.string().optional(), // Default: account.docusign.com
  // Stripe configuration
  STRIPE_SECRET_KEY: z.string().optional(),
  STRIPE_PUBLISHABLE_KEY: z.string().optional(),
  STRIPE_WEBHOOK_SECRET: z.string().optional(),
  // Google Cloud Scheduler configuration
  GCS_SCHEDULER_LOCATION: z.string().optional().default('us-central1'),
  GCS_SCHEDULER_SERVICE_ACCOUNT: z.string().optional(),
  SCHEDULER_SECRET: z.string().optional(), // Secret token for scheduler to authenticate
  // RentSpree configuration
  RENTSPREE_API_KEY: z.string().optional(),
  RENTSPREE_WEBHOOK_SECRET: z.string().optional(),
  RENTSPREE_BASE_URL: z.string().optional().default('https://api.rentspree.com/v1'),
});

export const env = envSchema.parse({
  PORT: process.env.PORT,
  DATABASE_URL: process.env.DATABASE_URL,
  JWT_SECRET: process.env.JWT_SECRET,
  JWT_EXPIRES_IN: process.env.JWT_EXPIRES_IN,
  CORS_ORIGIN: process.env.CORS_ORIGIN,
  SMTP_HOST: process.env.SMTP_HOST,
  SMTP_PORT: process.env.SMTP_PORT,
  SMTP_USER: process.env.SMTP_USER,
  SMTP_PASS: process.env.SMTP_PASS,
  SMTP_SECURE: process.env.SMTP_SECURE,
  SMTP_FROM: process.env.SMTP_FROM,
  APP_URL: process.env.APP_URL,
  GCS_PROJECT_ID: process.env.GCS_PROJECT_ID,
  GCS_BUCKET_NAME: process.env.GCS_BUCKET_NAME,
  GCS_KEY_FILENAME: process.env.GCS_KEY_FILENAME,
  GCS_CREDENTIALS: process.env.GCS_CREDENTIALS,
  DOCUSIGN_INTEGRATOR_KEY: process.env.DOCUSIGN_INTEGRATOR_KEY,
  DOCUSIGN_USER_ID: process.env.DOCUSIGN_USER_ID,
  DOCUSIGN_PRIVATE_KEY: process.env.DOCUSIGN_PRIVATE_KEY,
  DOCUSIGN_BASE_PATH: process.env.DOCUSIGN_BASE_PATH,
  DOCUSIGN_AUTH_SERVER: process.env.DOCUSIGN_AUTH_SERVER,
  STRIPE_SECRET_KEY: process.env.STRIPE_SECRET_KEY,
  STRIPE_PUBLISHABLE_KEY: process.env.STRIPE_PUBLISHABLE_KEY,
  STRIPE_WEBHOOK_SECRET: process.env.STRIPE_WEBHOOK_SECRET,
  GCS_SCHEDULER_LOCATION: process.env.GCS_SCHEDULER_LOCATION,
  GCS_SCHEDULER_SERVICE_ACCOUNT: process.env.GCS_SCHEDULER_SERVICE_ACCOUNT,
  RENTSPREE_API_KEY: process.env.RENTSPREE_API_KEY,
  RENTSPREE_WEBHOOK_SECRET: process.env.RENTSPREE_WEBHOOK_SECRET,
  RENTSPREE_BASE_URL: process.env.RENTSPREE_BASE_URL,
  SCHEDULER_SECRET: process.env.SCHEDULER_SECRET,
});
