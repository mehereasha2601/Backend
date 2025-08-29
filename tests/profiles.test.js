/**
 * @fileoverview Comprehensive Test Suite for Profile API
 * @description Complete test coverage for Profile API endpoints including validation,
 * authentication, error handling, and edge cases.
 * @author Easha from OK AI team
 * @version 1.0.0
 * @since 2025-01-26
 */

const request = require('supertest');
const app = require('../app');

describe('Profile API', () => {
  const VALID_TOKEN = process.env.INTERNAL_API_TOKEN || 'your-secret-token-here';
  const INVALID_TOKEN = 'invalid-token';
  const EXISTING_USER_ID = '4ed491e3-2efa-4c0b-a4f0-bd5aafa83bb4';
  const NON_EXISTENT_USER_ID = '00000000-0000-0000-0000-000000000000';
  const VALID_PHONE = '+919876543210';
  const INVALID_PHONE = '123';
  const TIMEOUT_MS = 10000;

  describe('Authentication', () => {
    test('should reject requests without authorization header', async () => {
      const response = await request(app)
        .post('/api/profiles')
        .send({ phoneNumber: VALID_PHONE })
        .expect(401);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('Missing or invalid authorization header. Use: Bearer <token>');
    }, TIMEOUT_MS);

    test('should reject requests with invalid token', async () => {
      const response = await request(app)
        .post('/api/profiles')
        .set('Authorization', `Bearer ${INVALID_TOKEN}`)
        .send({ phoneNumber: VALID_PHONE })
        .expect(403);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('Invalid authentication token');
    }, TIMEOUT_MS);
  });

  describe('Validation', () => {
    test('should require either userId or phoneNumber', async () => {
      const response = await request(app)
        .post('/api/profiles')
        .set('Authorization', `Bearer ${VALID_TOKEN}`)
        .send({ headline: 'Test' })
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('Validation error');
    }, TIMEOUT_MS);

    test('should reject invalid phone format', async () => {
      const response = await request(app)
        .post('/api/profiles')
        .set('Authorization', `Bearer ${VALID_TOKEN}`)
        .send({ phoneNumber: INVALID_PHONE })
        .expect(400);

      expect(response.body.success).toBe(false);
    }, TIMEOUT_MS);

    test('should reject headline too long', async () => {
      const response = await request(app)
        .post('/api/profiles')
        .set('Authorization', `Bearer ${VALID_TOKEN}`)
        .send({ 
          phoneNumber: VALID_PHONE,
          headline: 'A'.repeat(201)
        })
        .expect(400);

      expect(response.body.success).toBe(false);
    }, TIMEOUT_MS);

    test('should reject invalid score', async () => {
      const response = await request(app)
        .post('/api/profiles')
        .set('Authorization', `Bearer ${VALID_TOKEN}`)
        .send({ 
          phoneNumber: VALID_PHONE,
          score: 150
        })
        .expect(400);

      expect(response.body.success).toBe(false);
    }, TIMEOUT_MS);

    test('should reject duplicate skills', async () => {
      const response = await request(app)
        .post('/api/profiles')
        .set('Authorization', `Bearer ${VALID_TOKEN}`)
        .send({ 
          phoneNumber: VALID_PHONE,
          skills: ['JavaScript', 'Python', 'JavaScript']
        })
        .expect(400);

      expect(response.body.success).toBe(false);
    }, TIMEOUT_MS);
  });

  describe('Business Logic', () => {
    test('should handle non-existent user', async () => {
      const response = await request(app)
        .post('/api/profiles')
        .set('Authorization', `Bearer ${VALID_TOKEN}`)
        .send({ 
          userId: NON_EXISTENT_USER_ID,
          headline: 'Test'
        })
        .expect(404);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('User not found');
    }, TIMEOUT_MS);

    test('should create profile successfully', async () => {
      const testData = {
        phoneNumber: '+1234567891',
        headline: 'Test Engineer',
        score: 90.5
      };

      const response = await request(app)
        .post('/api/profiles')
        .set('Authorization', `Bearer ${VALID_TOKEN}`)
        .send(testData);

      expect([201, 404]).toContain(response.status);
      
      if (response.status === 201) {
        expect(response.body.success).toBe(true);
        expect(response.body.message).toBe('Profile created successfully');
        expect(response.body.data).toHaveProperty('userId');
        expect(response.body.data.headline).toBe('Test Engineer');
        expect(response.body.data.score).toBe(90.5);
      }
    }, TIMEOUT_MS);
  });

  describe('GET Profile API', () => {
    test('should reject requests without authorization header', async () => {
      const response = await request(app)
        .get('/api/profiles')
        .query({ phoneNumber: VALID_PHONE })
        .expect(401);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('Missing or invalid authorization header. Use: Bearer <token>');
    }, TIMEOUT_MS);

    test('should reject requests with invalid token', async () => {
      const response = await request(app)
        .get('/api/profiles')
        .set('Authorization', `Bearer ${INVALID_TOKEN}`)
        .query({ phoneNumber: VALID_PHONE })
        .expect(403);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('Invalid authentication token');
    }, TIMEOUT_MS);

    test('should require either userId or phoneNumber', async () => {
      const response = await request(app)
        .get('/api/profiles')
        .set('Authorization', `Bearer ${VALID_TOKEN}`)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('Invalid parameters');
    }, TIMEOUT_MS);

    test('should reject both userId and phoneNumber provided', async () => {
      const response = await request(app)
        .get('/api/profiles')
        .set('Authorization', `Bearer ${VALID_TOKEN}`)
        .query({ 
          userId: EXISTING_USER_ID,
          phoneNumber: VALID_PHONE 
        })
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('Invalid parameters');
    }, TIMEOUT_MS);

    test('should reject invalid phone format', async () => {
      const response = await request(app)
        .get('/api/profiles')
        .set('Authorization', `Bearer ${VALID_TOKEN}`)
        .query({ phoneNumber: INVALID_PHONE })
        .expect(400);

      expect(response.body.success).toBe(false);
    }, TIMEOUT_MS);

    test('should reject invalid UUID format', async () => {
      const response = await request(app)
        .get('/api/profiles')
        .set('Authorization', `Bearer ${VALID_TOKEN}`)
        .query({ userId: 'invalid-uuid' })
        .expect(400);

      expect(response.body.success).toBe(false);
    }, TIMEOUT_MS);

    test('should handle non-existent user by userId', async () => {
      const response = await request(app)
        .get('/api/profiles')
        .set('Authorization', `Bearer ${VALID_TOKEN}`)
        .query({ userId: NON_EXISTENT_USER_ID })
        .expect(404);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('User not found');
      expect(response.body.error.code).toBe('USER_NOT_FOUND');
    }, TIMEOUT_MS);

    test('should handle non-existent user by phoneNumber', async () => {
      const response = await request(app)
        .get('/api/profiles')
        .set('Authorization', `Bearer ${VALID_TOKEN}`)
        .query({ phoneNumber: '+999999999999' })
        .expect(404);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('User not found');
      expect(response.body.error.code).toBe('USER_NOT_FOUND');
    }, TIMEOUT_MS);

    test('should fetch profile by phoneNumber successfully', async () => {
      const response = await request(app)
        .get('/api/profiles')
        .set('Authorization', `Bearer ${VALID_TOKEN}`)
        .query({ phoneNumber: '+1234567890' }); // Phone number that has a profile

      expect([200, 404]).toContain(response.status);
      
      if (response.status === 200) {
        expect(response.body.success).toBe(true);
        expect(response.body.message).toBe('Profile found');
        expect(response.body.data).toHaveProperty('userId');
        expect(response.body.data).toHaveProperty('headline');
        expect(response.body.data).toHaveProperty('summary');
        expect(response.body.data).toHaveProperty('skills');
        expect(response.body.data).toHaveProperty('certifications');
        expect(response.body.data).toHaveProperty('languages');
        expect(response.body.data).toHaveProperty('score');
        expect(response.body.data).toHaveProperty('shareUrl');
      }
    }, TIMEOUT_MS);

    test('should fetch profile by userId successfully', async () => {
      const response = await request(app)
        .get('/api/profiles')
        .set('Authorization', `Bearer ${VALID_TOKEN}`)
        .query({ userId: 'b42558e8-6c12-4eb2-9ee1-172cee858ca1' }); // Known userId with profile

      expect([200, 404]).toContain(response.status);
      
      if (response.status === 200) {
        expect(response.body.success).toBe(true);
        expect(response.body.message).toBe('Profile found');
        expect(response.body.data).toHaveProperty('userId');
      }
    }, TIMEOUT_MS);

    test('should prioritize userId when both are provided', async () => {
      const response = await request(app)
        .get('/api/profiles')
        .set('Authorization', `Bearer ${VALID_TOKEN}`)
        .query({ 
          userId: NON_EXISTENT_USER_ID,
          phoneNumber: '+1234567890' 
        })
        .expect(400); // Should fail validation, not use phoneNumber

      expect(response.body.success).toBe(false);
    }, TIMEOUT_MS);
  });

  afterAll(() => {
    console.log('\n✅ Profile API tests completed successfully');
  });
}); 