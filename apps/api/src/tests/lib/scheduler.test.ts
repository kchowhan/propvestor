import { describe, it, expect, vi, beforeEach } from 'vitest';
import { setupMonthlyRentJob, deleteScheduledJob, listScheduledJobs } from '../../lib/scheduler.js';

// Mock Google Cloud Scheduler
vi.mock('@google-cloud/scheduler', () => ({
  CloudSchedulerClient: vi.fn(() => ({
    locationPath: vi.fn((projectId, location) => `projects/${projectId}/locations/${location}`),
    jobPath: vi.fn((projectId, location, jobName) => `projects/${projectId}/locations/${location}/jobs/${jobName}`),
    getJob: vi.fn(() => Promise.resolve([{ name: 'test-job' }])),
    updateJob: vi.fn(() => Promise.resolve([{ name: 'test-job' }])),
    createJob: vi.fn(() => Promise.resolve([{ name: 'test-job' }])),
    deleteJob: vi.fn(() => Promise.resolve()),
    listJobs: vi.fn(() => Promise.resolve([[
      {
        name: 'test-job',
        schedule: '0 2 1 * *',
        state: 'ENABLED',
        status: { lastAttemptTime: new Date() },
        scheduleTime: new Date(),
      },
    ]])),
  })),
}));

describe('Scheduler Library', () => {
  beforeEach(() => {
    process.env.SCHEDULER_SECRET = 'test-secret';
  });

  describe('setupMonthlyRentJob', () => {
    it('should create or update scheduled job', async () => {
      const result = await setupMonthlyRentJob(
        'test-project',
        'us-central1',
        'monthly-rent',
        'https://api.example.com/billing/generate-monthly-rent',
        'service-account@example.com'
      );

      expect(result).toBeDefined();
      // The result is a job path from jobPath() which should contain the job name
      expect(typeof result).toBe('string');
    });
  });

  describe('deleteScheduledJob', () => {
    it('should delete scheduled job', async () => {
      await expect(
        deleteScheduledJob('test-project', 'us-central1', 'monthly-rent')
      ).resolves.not.toThrow();
    });
  });

  describe('listScheduledJobs', () => {
    it('should list scheduled jobs', async () => {
      const result = await listScheduledJobs('test-project', 'us-central1');

      expect(result).toBeDefined();
      expect(Array.isArray(result)).toBe(true);
    });
  });
});

