import request from 'supertest';
import app from '../src/app';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

describe('NADRA System API Integration Tests', () => {
  let authToken = '';
  const testUsername = `testadmin_${Date.now()}`;
  const testPassword = 'testpassword123';
  const testNic = `TEST_${Date.now()}`;

  beforeAll(async () => {
    // Check connection
    await prisma.$connect();
  });

  afterAll(async () => {
    // Clean up test data if any remains
    try {
      await prisma.citizenRecord.deleteMany({
        where: { nic: { startsWith: 'TEST_' } },
      });
      await prisma.user.deleteMany({
        where: { username: { startsWith: 'testadmin_' } },
      });
    } catch (e) {
      console.error('Cleanup failed:', e);
    }
    await prisma.$disconnect();
  });

  // 1. Healthcheck
  test('GET /health should return 200 ok', async () => {
    const res = await request(app).get('/health');
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('ok');
  });

  // 2. Authentication
  test('POST /api/auth/register should register a new admin', async () => {
    const res = await request(app)
      .post('/api/auth/register')
      .send({
        username: testUsername,
        password: testPassword,
        name: 'Test Administrator',
        role: 'ADMIN',
      });
    
    expect(res.status).toBe(201);
    expect(res.body.status).toBe('success');
    expect(res.body.data.user.username).toBe(testUsername);
  });

  test('POST /api/auth/login should authenticate and return token', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({
        username: testUsername,
        password: testPassword,
      });

    expect(res.status).toBe(200);
    expect(res.body.status).toBe('success');
    expect(res.body.token).toBeDefined();
    authToken = res.body.token;
  });

  test('GET /api/auth/me should fetch profile with valid token', async () => {
    const res = await request(app)
      .get('/api/auth/me')
      .set('Authorization', `Bearer ${authToken}`);

    expect(res.status).toBe(200);
    expect(res.body.status).toBe('success');
    expect(res.body.data.user.username).toBe(testUsername);
  });

  // 3. Citizen CRUD Protected Operations
  test('GET /api/records without token should fail with 401', async () => {
    const res = await request(app).get('/api/records');
    expect(res.status).toBe(401);
  });

  test('POST /api/records with valid token should register citizen', async () => {
    const res = await request(app)
      .post('/api/records')
      .set('Authorization', `Bearer ${authToken}`)
      .send({
        nic: testNic,
        name: 'Test Citizen',
        fatherNic: '99999-9999999-9',
        motherName: 'Mother Name',
        birthCertificate: 'BC-TEST1234',
        residentForm: 'RF-98765',
        maritalStatus: 'single',
        age: 25,
      });

    expect(res.status).toBe(201);
    expect(res.body.status).toBe('success');
    expect(res.body.data.record.nic).toBe(testNic);
  });

  test('POST /api/records with age < 18 should fail validation', async () => {
    const res = await request(app)
      .post('/api/records')
      .set('Authorization', `Bearer ${authToken}`)
      .send({
        nic: `UNDER_${Date.now()}`,
        name: 'Underage Citizen',
        fatherNic: '99999-9999999-9',
        motherName: 'Mother Name',
        birthCertificate: 'BC-TEST1234',
        residentForm: 'RF-98765',
        maritalStatus: 'single',
        age: 17, // Failed age validation
      });

    expect(res.status).toBe(400);
    expect(res.body.message).toContain('18 or older');
  });

  test('GET /api/records should return paginated list', async () => {
    const res = await request(app)
      .get('/api/records?limit=5')
      .set('Authorization', `Bearer ${authToken}`);

    expect(res.status).toBe(200);
    expect(res.body.status).toBe('success');
    expect(Array.isArray(res.body.data.records)).toBe(true);
    expect(res.body.data.pagination.limit).toBe(5);
  });

  test('GET /api/records/:nic should retrieve details', async () => {
    const res = await request(app)
      .get(`/api/records/${testNic}`)
      .set('Authorization', `Bearer ${authToken}`);

    expect(res.status).toBe(200);
    expect(res.body.status).toBe('success');
    expect(res.body.data.record.name).toBe('Test Citizen');
  });

  test('PUT /api/records/:nic should update record details', async () => {
    const res = await request(app)
      .put(`/api/records/${testNic}`)
      .set('Authorization', `Bearer ${authToken}`)
      .send({
        name: 'Test Citizen Updated',
        maritalStatus: 'married',
      });

    expect(res.status).toBe(200);
    expect(res.body.status).toBe('success');
    expect(res.body.data.record.name).toBe('Test Citizen Updated');
    expect(res.body.data.record.maritalStatus).toBe('married');
  });

  test('DELETE /api/records/:nic should remove record', async () => {
    const res = await request(app)
      .delete(`/api/records/${testNic}`)
      .set('Authorization', `Bearer ${authToken}`);

    expect(res.status).toBe(200);
    expect(res.body.message).toContain('deleted successfully');

    // Verify it is gone
    const verify = await request(app)
      .get(`/api/records/${testNic}`)
      .set('Authorization', `Bearer ${authToken}`);
    expect(verify.status).toBe(404);
  });
});
