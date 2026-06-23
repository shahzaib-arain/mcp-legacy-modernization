import request from 'supertest';
import app from '../src/app';

describe('Backend Load Tests', () => {
  const baseUrl = '/api/records';
  let token = '';

  beforeAll(async () => {
    // Register and login an admin to get a valid token
    const testUsername = `load_admin_${Date.now()}`;
    await request(app)
      .post('/api/auth/register')
      .send({
        username: testUsername,
        password: 'adminpassword123',
        name: 'Load Test Administrator',
        role: 'ADMIN',
      });

    const loginRes = await request(app)
      .post('/api/auth/login')
      .send({
        username: testUsername,
        password: 'adminpassword123',
      });

    token = loginRes.body.token;
  });

  const measure = async (fn: () => Promise<request.Response>) => {
    const start = Date.now();
    const res = await fn();
    const duration = Date.now() - start;
    return { res, duration };
  };

  test('20 concurrent GET /api/records should all succeed within 2 seconds each', async () => {
    const concurrent = 20;
    const promises = [];
    for (let i = 0; i < concurrent; i++) {
      promises.push(measure(() => 
        request(app)
          .get(baseUrl)
          .set('Authorization', `Bearer ${token}`)
      ));
    }
    const results = await Promise.all(promises);
    
    results.forEach(({ res, duration }) => {
      expect(res.status).toBe(200);
      expect(duration).toBeLessThanOrEqual(2000);
    });
  }, 30000);
});
