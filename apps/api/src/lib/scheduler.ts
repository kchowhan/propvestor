import { CloudSchedulerClient } from '@google-cloud/scheduler';
import { AppError } from './errors.js';

let schedulerClient: CloudSchedulerClient | null = null;

function getSchedulerClient(): CloudSchedulerClient {
  if (!schedulerClient) {
    schedulerClient = new CloudSchedulerClient();
  }
  return schedulerClient;
}

/**
 * Create or update a scheduled job for monthly rent charge generation
 */
export async function setupMonthlyRentJob(
  projectId: string,
  location: string,
  jobName: string,
  targetUrl: string,
  serviceAccountEmail: string
): Promise<string> {
  const client = getSchedulerClient();
  const parent = client.locationPath(projectId, location);

  // Job runs on the 1st of each month at 2 AM
  const schedule = '0 2 1 * *'; // Cron: minute hour day month day-of-week

  const job = {
    name: client.jobPath(projectId, location, jobName),
    schedule,
    timeZone: 'America/Los_Angeles', // Adjust as needed
    httpTarget: {
      uri: targetUrl,
      httpMethod: 'POST' as const,
      headers: {
        'Content-Type': 'application/json',
        'X-Scheduler-Secret': process.env.SCHEDULER_SECRET || '',
      },
      body: Buffer.from(
        JSON.stringify({
          action: 'generate-monthly-rent',
          month: new Date().getMonth() + 1, // Current month
          year: new Date().getFullYear(),
        })
      ).toString('base64'),
      oidcToken: {
        serviceAccountEmail,
      },
    },
  };

  try {
    // Try to get existing job
    const [existingJob] = await client.getJob({
      name: job.name,
    });

    // Update existing job
    const [updatedJob] = await client.updateJob({
      job,
      updateMask: {
        paths: ['schedule', 'httpTarget'],
      },
    });

    return updatedJob.name!;
  } catch (error: any) {
    // Job doesn't exist, create it
    if (error.code === 5) {
      // NOT_FOUND
      const [createdJob] = await client.createJob({
        parent,
        job,
      });
      return createdJob.name!;
    }
    throw new AppError(500, 'SCHEDULER_ERROR', `Failed to setup scheduler job: ${error.message}`);
  }
}

/**
 * Delete a scheduled job
 */
export async function deleteScheduledJob(
  projectId: string,
  location: string,
  jobName: string
): Promise<void> {
  const client = getSchedulerClient();
  const jobPath = client.jobPath(projectId, location, jobName);

  try {
    await client.deleteJob({
      name: jobPath,
    });
  } catch (error: any) {
    if (error.code !== 5) {
      // Ignore NOT_FOUND errors
      throw new AppError(500, 'SCHEDULER_ERROR', `Failed to delete scheduler job: ${error.message}`);
    }
  }
}

/**
 * List all scheduled jobs
 */
export async function listScheduledJobs(projectId: string, location: string) {
  const client = getSchedulerClient();
  const parent = client.locationPath(projectId, location);

  const [jobs] = await client.listJobs({
    parent,
  });

  return jobs.map((job) => ({
    name: job.name,
    schedule: job.schedule,
    state: job.state,
    lastAttemptTime: job.status?.lastAttemptTime,
    nextRunTime: job.scheduleTime,
  }));
}

