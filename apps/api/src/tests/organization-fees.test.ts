import { describe, it, expect, beforeEach } from 'vitest';
import request from 'supertest';
import jwt from 'jsonwebtoken';
import { createApp } from '../app.js';
import { prisma } from '../lib/prisma.js';
import { env } from '../config/env.js';
import { createTestUser, createTestOrganization, createTestMembership, cleanupTestData } from './setup.js';
import {
  createRentSpreeScreeningFee,
  createStripeProcessingFee,
  getOrganizationFees,
  calculateStripeFee,
} from '../lib/organization-fees.js';

const app = createApp();

describe('Organization Fees', () => {
  let testUser: any;
  let testOrg: any;
  let testTenant: any;
  let testScreeningRequest: any;
  let testPayment: any;
  let token: string;

  beforeEach(async () => {
    await cleanupTestData();
    testUser = await createTestUser();
    testOrg = await createTestOrganization();
    await createTestMembership(testUser.id, testOrg.id, 'OWNER');
    token = jwt.sign(
      { userId: testUser.id, organizationId: testOrg.id },
      env.JWT_SECRET
    );

    // Create a test tenant
    testTenant = await prisma.tenant.create({
      data: {
        organizationId: testOrg.id,
        firstName: 'Test',
        lastName: 'Tenant',
        email: 'test@example.com',
        phone: '555-0100',
        status: 'SCREENING',
      },
    });

    // Create a test screening request
    testScreeningRequest = await prisma.screeningRequest.create({
      data: {
        organizationId: testOrg.id,
        tenantId: testTenant.id,
        externalRequestId: 'test-request-id',
        status: 'PENDING',
      },
    });

    // Create a test lease and charge for payment testing
    const testProperty = await prisma.property.create({
      data: {
        organizationId: testOrg.id,
        name: 'Test Property',
        addressLine1: '123 Test St',
        city: 'Test City',
        state: 'CA',
        postalCode: '12345',
        country: 'US',
        type: 'SINGLE_FAMILY',
        status: 'ACTIVE',
      },
    });

    const testUnit = await prisma.unit.create({
      data: {
        propertyId: testProperty.id,
        name: 'Unit 1',
        bedrooms: 2,
        bathrooms: 1,
        status: 'OCCUPIED',
      },
    });

    const testLease = await prisma.lease.create({
      data: {
        organizationId: testOrg.id,
        unitId: testUnit.id,
        startDate: new Date('2024-01-01'),
        endDate: new Date('2024-12-31'),
        rentAmount: 2000,
        rentDueDay: 1,
        status: 'ACTIVE',
      },
    });

    const testCharge = await prisma.charge.create({
      data: {
        organizationId: testOrg.id,
        leaseId: testLease.id,
        type: 'RENT',
        description: 'Test rent',
        amount: 2000,
        dueDate: new Date(),
        status: 'PENDING',
      },
    });

    testPayment = await prisma.payment.create({
      data: {
        organizationId: testOrg.id,
        leaseId: testLease.id,
        chargeId: testCharge.id,
        amount: 2000,
        receivedDate: new Date(),
        method: 'STRIPE_CARD',
        stripePaymentIntentId: 'pi_test_123',
        reference: 'test-payment',
      },
    });
  });

  describe('calculateStripeFee', () => {
    it('should calculate card fee correctly (2.9% + $0.30)', () => {
      const amount = 1000;
      const fee = calculateStripeFee(amount, 'card');
      expect(fee).toBeCloseTo(29.30, 2); // 1000 * 0.029 + 0.30
    });

    it('should calculate ACH fee correctly ($0.80)', () => {
      const amount = 1000;
      const fee = calculateStripeFee(amount, 'ach');
      expect(fee).toBe(0.80);
    });
  });

  describe('createRentSpreeScreeningFee', () => {
    it('should create organization fee and charge for RentSpree screening', async () => {
      const feeAmount = 29.95;
      const feeId = await createRentSpreeScreeningFee(
        testOrg.id,
        testScreeningRequest.id,
        feeAmount,
        'Test screening'
      );

      const orgFee = await prisma.organizationFee.findUnique({
        where: { id: feeId },
        include: { charge: true },
      });

      expect(orgFee).toBeTruthy();
      expect(orgFee?.feeType).toBe('RENTSPREE_SCREENING');
      expect(Number(orgFee?.amount)).toBe(feeAmount);
      expect(orgFee?.screeningRequestId).toBe(testScreeningRequest.id);
      expect(orgFee?.chargeId).toBeTruthy();

      const charge = await prisma.charge.findUnique({
        where: { id: orgFee!.chargeId! },
      });

      expect(charge).toBeTruthy();
      expect(charge?.type).toBe('SERVICE_FEE');
      expect(Number(charge?.amount)).toBe(feeAmount);
      expect(charge?.organizationId).toBe(testOrg.id);
    });
  });

  describe('createStripeProcessingFee', () => {
    it('should create organization fee and charge for Stripe card processing', async () => {
      const paymentAmount = 2000;
      const feeId = await createStripeProcessingFee(
        testOrg.id,
        testPayment.id,
        paymentAmount,
        'card',
        'pi_test_123'
      );

      const orgFee = await prisma.organizationFee.findUnique({
        where: { id: feeId },
        include: { charge: true },
      });

      expect(orgFee).toBeTruthy();
      expect(orgFee?.feeType).toBe('STRIPE_PROCESSING');
      expect(orgFee?.paymentId).toBe(testPayment.id);
      expect(orgFee?.stripeFeeType).toBe('processing_fee');
      expect(orgFee?.chargeId).toBeTruthy();

      // Check that fee amount is calculated correctly
      const expectedFee = calculateStripeFee(paymentAmount, 'card');
      expect(Number(orgFee?.amount)).toBeCloseTo(expectedFee, 2);

      const charge = await prisma.charge.findUnique({
        where: { id: orgFee!.chargeId! },
      });

      expect(charge).toBeTruthy();
      expect(charge?.type).toBe('SERVICE_FEE');
      expect(Number(charge?.amount)).toBeCloseTo(expectedFee, 2);
    });

    it('should create organization fee and charge for Stripe ACH processing', async () => {
      const paymentAmount = 2000;
      const feeId = await createStripeProcessingFee(
        testOrg.id,
        testPayment.id,
        paymentAmount,
        'ach',
        'pi_test_123'
      );

      const orgFee = await prisma.organizationFee.findUnique({
        where: { id: feeId },
        include: { charge: true },
      });

      expect(orgFee).toBeTruthy();
      expect(orgFee?.feeType).toBe('STRIPE_PROCESSING');
      expect(orgFee?.stripeFeeType).toBe('ach_fee');
      expect(Number(orgFee?.amount)).toBe(0.80); // ACH fee is fixed at $0.80
    });
  });

  describe('getOrganizationFees', () => {
    it('should list all organization fees', async () => {
      // Create a few fees
      await createRentSpreeScreeningFee(
        testOrg.id,
        testScreeningRequest.id,
        29.95,
        'Test screening 1'
      );

      await createStripeProcessingFee(
        testOrg.id,
        testPayment.id,
        2000,
        'card',
        'pi_test_123'
      );

      const fees = await getOrganizationFees(testOrg.id);

      expect(fees.length).toBeGreaterThanOrEqual(2);
      expect(fees.some((f) => f.feeType === 'RENTSPREE_SCREENING')).toBe(true);
      expect(fees.some((f) => f.feeType === 'STRIPE_PROCESSING')).toBe(true);
    });

    it('should filter fees by type', async () => {
      await createRentSpreeScreeningFee(
        testOrg.id,
        testScreeningRequest.id,
        29.95,
        'Test screening'
      );

      await createStripeProcessingFee(
        testOrg.id,
        testPayment.id,
        2000,
        'card',
        'pi_test_123'
      );

      const rentspreeFees = await getOrganizationFees(testOrg.id, {
        feeType: 'RENTSPREE_SCREENING',
      });

      expect(rentspreeFees.length).toBeGreaterThanOrEqual(1);
      expect(rentspreeFees.every((f) => f.feeType === 'RENTSPREE_SCREENING')).toBe(true);
    });
  });

  describe('API Endpoints', () => {
    it('should list organization fees via API', async () => {
      await createRentSpreeScreeningFee(
        testOrg.id,
        testScreeningRequest.id,
        29.95,
        'Test screening'
      );

      const response = await request(app)
        .get('/api/organization-fees')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(response.body.data).toBeInstanceOf(Array);
      expect(response.body.data.length).toBeGreaterThanOrEqual(1);
    });

    it('should filter fees by type via API', async () => {
      await createRentSpreeScreeningFee(
        testOrg.id,
        testScreeningRequest.id,
        29.95,
        'Test screening'
      );

      const response = await request(app)
        .get('/api/organization-fees')
        .query({ feeType: 'RENTSPREE_SCREENING' })
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(response.body.data).toBeInstanceOf(Array);
      expect(response.body.data.every((f: any) => f.feeType === 'RENTSPREE_SCREENING')).toBe(
        true
      );
    });
  });
});

