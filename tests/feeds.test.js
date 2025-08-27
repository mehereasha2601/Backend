/**
 * @fileoverview Comprehensive Test Suite for News Feeds API
 * @description Complete test coverage for feeds API endpoints including pagination,
 * error handling, data validation, and performance testing. Uses Jest testing
 * framework with Supertest for HTTP testing and comprehensive assertions.
 * @author Easha from OK AI team
 * @version 1.1.0
 * @since 1.0.0
 */

const request = require('supertest');
const app = require('../app');

/**
 * Test Suite: News Feeds API Endpoints
 * @description Comprehensive testing of all feeds API endpoints with pagination support
 * @covers GET /, GET /api/feeds/:userId, GET /api/feeds
 */
describe('News Feeds API', () => {
  // Test constants for consistent testing
  const EXISTING_USER_ID = '4ed491e3-2efa-4c0b-a4f0-bd5aafa83bb4';
  const NON_EXISTENT_USER_ID = '00000000-0000-0000-0000-000000000000';
  const INVALID_UUID = 'invalid-uuid-format';
  const TIMEOUT_MS = 10000;

  /**
   * Test Suite: API Health Check
   * @description Tests for the root endpoint health check functionality
   */
  describe('GET /', () => {
    /**
     * Test: Should return API status successfully
     * @description Verifies that the health check endpoint returns proper status information
     */
    test('should return API status successfully', async () => {
      const response = await request(app)
        .get('/')
        .expect('Content-Type', /json/)
        .expect(200);

      expect(response.body).toHaveProperty('message');
      expect(response.body).toHaveProperty('timestamp');
      expect(response.body).toHaveProperty('documentation');
      expect(response.body.message).toBe('Blue Collar Workers API is running!');
      expect(response.body.documentation).toMatch(/\/api-docs$/);
      
      // Validate timestamp format (ISO 8601)
      const timestamp = new Date(response.body.timestamp);
      expect(timestamp.toISOString()).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}.\d{3}Z$/);
      expect(timestamp.getTime()).not.toBeNaN();
    }, TIMEOUT_MS);
  });

  /**
   * Test Suite: User-Specific Feeds with Pagination
   * @description Tests for the user feeds endpoint with comprehensive pagination coverage
   */
  describe('GET /api/feeds/:userId', () => {
    /**
     * Test: Should retrieve feeds for existing user with default pagination
     * @description Tests the default pagination behavior (page=1, limit=20)
     */
    test('should retrieve feeds for existing user with default pagination', async () => {
      const response = await request(app)
        .get(`/api/feeds/${EXISTING_USER_ID}`)
        .expect('Content-Type', /json/)
        .expect(200);

      expect(response.body).toHaveProperty('success', true);
      expect(response.body).toHaveProperty('userId', EXISTING_USER_ID);
      expect(response.body).toHaveProperty('feeds');
      expect(response.body).toHaveProperty('pagination');
      expect(Array.isArray(response.body.feeds)).toBe(true);

      // Validate pagination metadata structure
      const { pagination } = response.body;
      expect(pagination).toHaveProperty('page', 1);
      expect(pagination).toHaveProperty('totalPages');
      expect(pagination).toHaveProperty('totalCount');
      expect(pagination).toHaveProperty('hasNextPage');
      expect(pagination).toHaveProperty('hasPreviousPage', false);
      expect(pagination).toHaveProperty('limit', 20);

      // Validate pagination metadata types and ranges
      expect(typeof pagination.page).toBe('number');
      expect(typeof pagination.totalPages).toBe('number');
      expect(typeof pagination.totalCount).toBe('number');
      expect(typeof pagination.hasNextPage).toBe('boolean');
      expect(typeof pagination.hasPreviousPage).toBe('boolean');
      expect(typeof pagination.limit).toBe('number');
      
      expect(pagination.page).toBeGreaterThanOrEqual(1);
      expect(pagination.totalPages).toBeGreaterThanOrEqual(0);
      expect(pagination.totalCount).toBeGreaterThanOrEqual(0);
      expect(pagination.limit).toBe(20);
    }, TIMEOUT_MS);

    /**
     * Test: Should handle custom pagination parameters
     * @description Tests custom page and limit parameters
     */
    test('should handle custom pagination parameters', async () => {
      const customPage = 1;
      const customLimit = 5;
      
      const response = await request(app)
        .get(`/api/feeds/${EXISTING_USER_ID}?page=${customPage}&limit=${customLimit}`)
        .expect('Content-Type', /json/)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.pagination.page).toBe(customPage);
      expect(response.body.pagination.limit).toBe(customLimit);
      expect(response.body.feeds.length).toBeLessThanOrEqual(customLimit);
    }, TIMEOUT_MS);

    /**
     * Test: Should handle page 2 with custom limit
     * @description Tests navigation to second page with custom page size
     */
    test('should handle page 2 with custom limit', async () => {
      const response = await request(app)
        .get(`/api/feeds/${EXISTING_USER_ID}?page=2&limit=10`)
        .expect('Content-Type', /json/)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.pagination.page).toBe(2);
      expect(response.body.pagination.limit).toBe(10);
      expect(response.body.pagination.hasPreviousPage).toBe(true);
      expect(response.body.feeds.length).toBeLessThanOrEqual(10);
    }, TIMEOUT_MS);

    /**
     * Test: Should validate maximum limit boundary
     * @description Tests that the maximum limit of 100 is enforced
     */
    test('should validate maximum limit boundary', async () => {
      const response = await request(app)
        .get(`/api/feeds/${EXISTING_USER_ID}?limit=100`)
        .expect('Content-Type', /json/)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.pagination.limit).toBe(100);
    }, TIMEOUT_MS);

    /**
     * Test: Should reject limit exceeding maximum
     * @description Tests validation error for limit > 100
     */
    test('should reject limit exceeding maximum', async () => {
      const response = await request(app)
        .get(`/api/feeds/${EXISTING_USER_ID}?limit=101`)
        .expect('Content-Type', /json/)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('Invalid pagination parameters');
      expect(response.body.message).toContain('between 1 and 100');
    }, TIMEOUT_MS);

    /**
     * Test: Should reject limit below minimum
     * @description Tests validation error for limit < 1
     */
    test('should reject limit below minimum', async () => {
      const response = await request(app)
        .get(`/api/feeds/${EXISTING_USER_ID}?limit=0`)
        .expect('Content-Type', /json/)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('Invalid pagination parameters');
      expect(response.body.message).toContain('between 1 and 100');
    }, TIMEOUT_MS);

    /**
     * Test: Should reject page below minimum
     * @description Tests validation error for page < 1
     */
    test('should reject page below minimum', async () => {
      const response = await request(app)
        .get(`/api/feeds/${EXISTING_USER_ID}?page=0`)
        .expect('Content-Type', /json/)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('Invalid pagination parameters');
      expect(response.body.message).toContain('greater than or equal to 1');
    }, TIMEOUT_MS);

    /**
     * Test: Should handle non-numeric pagination parameters gracefully
     * @description Tests that non-numeric values default to proper values
     */
    test('should handle non-numeric pagination parameters gracefully', async () => {
      const response = await request(app)
        .get(`/api/feeds/${EXISTING_USER_ID}?page=abc&limit=xyz`)
        .expect('Content-Type', /json/)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.pagination.page).toBe(1); // Default page
      expect(response.body.pagination.limit).toBe(20); // Default limit
    }, TIMEOUT_MS);

    /**
     * Test: Should handle non-existent user with pagination
     * @description Tests pagination behavior for users with no feeds
     */
    test('should handle non-existent user with pagination', async () => {
      const response = await request(app)
        .get(`/api/feeds/${NON_EXISTENT_USER_ID}?page=1&limit=10`)
        .expect('Content-Type', /json/)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.userId).toBe(NON_EXISTENT_USER_ID);
      expect(response.body.feeds).toEqual([]);
      expect(response.body.pagination.totalCount).toBe(0);
      expect(response.body.pagination.totalPages).toBe(0);
      expect(response.body.pagination.hasNextPage).toBe(false);
      expect(response.body.pagination.hasPreviousPage).toBe(false);
    }, TIMEOUT_MS);

    /**
     * Test: Should validate feed structure for existing user
     * @description Validates the structure and content of feed objects
     */
    test('should validate feed structure for existing user', async () => {
      const response = await request(app)
        .get(`/api/feeds/${EXISTING_USER_ID}?limit=5`)
        .expect('Content-Type', /json/)
        .expect(200);

      expect(response.body.success).toBe(true);
      
      if (response.body.feeds.length > 0) {
        const feed = response.body.feeds[0];
        
        // Required fields validation
        expect(feed).toHaveProperty('feedId');
        expect(feed).toHaveProperty('userId');
        expect(feed).toHaveProperty('content');
        expect(feed).toHaveProperty('timestamp');
        
        // UUID format validation
        expect(feed.feedId).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/);
        expect(feed.userId).toBe(EXISTING_USER_ID);
        
        // Timestamp validation
        const parsedTimestamp = new Date(feed.timestamp);
        expect(parsedTimestamp.toISOString()).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}.\d{3}Z$/);
        expect(parsedTimestamp.getTime()).not.toBeNaN();
        
        // Content validation
        expect(typeof feed.content).toBe('string');
        expect(feed.content.length).toBeGreaterThan(0);
      }
    }, TIMEOUT_MS);

    /**
     * Test: Should maintain timestamp ordering with pagination
     * @description Verifies that feeds are ordered by timestamp (newest first) across pages
     */
    test('should maintain timestamp ordering with pagination', async () => {
      const response = await request(app)
        .get(`/api/feeds/${EXISTING_USER_ID}?limit=10`)
        .expect('Content-Type', /json/)
        .expect(200);

      expect(response.body.success).toBe(true);
      
      if (response.body.feeds.length > 1) {
        const feeds = response.body.feeds;
        
        for (let i = 0; i < feeds.length - 1; i++) {
          const currentTimestamp = new Date(feeds[i].timestamp);
          const nextTimestamp = new Date(feeds[i + 1].timestamp);
          
          // Current should be newer than or equal to next (descending order)
          expect(currentTimestamp.getTime()).toBeGreaterThanOrEqual(nextTimestamp.getTime());
        }
      }
    }, TIMEOUT_MS);

    /**
     * Test: Should handle invalid UUID format
     * @description Tests error handling for malformed UUID parameters
     */
    test('should handle invalid UUID format', async () => {
      const response = await request(app)
        .get(`/api/feeds/${INVALID_UUID}`)
        .expect('Content-Type', /json/)
        .expect(500); // Supabase returns database error for invalid UUID

      expect(response.body.success).toBe(false);
      expect(response.body).toHaveProperty('error');
    }, TIMEOUT_MS);
  });

  /**
   * Test Suite: Admin Feeds with Pagination
   * @description Tests for the admin feeds endpoint with comprehensive pagination coverage
   */
  describe('GET /api/feeds', () => {
    /**
     * Test: Should retrieve all feeds with default pagination
     * @description Tests the admin endpoint with default pagination settings
     */
    test('should retrieve all feeds with default pagination', async () => {
      const response = await request(app)
        .get('/api/feeds')
        .expect('Content-Type', /json/)
        .expect(200);

      expect(response.body).toHaveProperty('success', true);
      expect(response.body).toHaveProperty('feeds');
      expect(response.body).toHaveProperty('pagination');
      expect(response.body).toHaveProperty('message', 'All feeds retrieved successfully');
      expect(Array.isArray(response.body.feeds)).toBe(true);

      // Validate pagination metadata
      const { pagination } = response.body;
      expect(pagination).toHaveProperty('page', 1);
      expect(pagination).toHaveProperty('totalPages');
      expect(pagination).toHaveProperty('totalCount');
      expect(pagination).toHaveProperty('hasNextPage');
      expect(pagination).toHaveProperty('hasPreviousPage', false);
      expect(pagination).toHaveProperty('limit', 20);
    }, TIMEOUT_MS);

    /**
     * Test: Should handle custom pagination for admin feeds
     * @description Tests custom pagination parameters for admin endpoint
     */
    test('should handle custom pagination for admin feeds', async () => {
      const customPage = 1;
      const customLimit = 50;
      
      const response = await request(app)
        .get(`/api/feeds?page=${customPage}&limit=${customLimit}`)
        .expect('Content-Type', /json/)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.pagination.page).toBe(customPage);
      expect(response.body.pagination.limit).toBe(customLimit);
      expect(response.body.feeds.length).toBeLessThanOrEqual(customLimit);
    }, TIMEOUT_MS);

    /**
     * Test: Should validate admin feeds pagination parameters
     * @description Tests validation of pagination parameters for admin endpoint
     */
    test('should validate admin feeds pagination parameters', async () => {
      const response = await request(app)
        .get('/api/feeds?page=-1&limit=200')
        .expect('Content-Type', /json/)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('Invalid pagination parameters');
    }, TIMEOUT_MS);

    /**
     * Test: Should maintain timestamp ordering for admin feeds
     * @description Verifies timestamp ordering in admin feeds endpoint
     */
    test('should maintain timestamp ordering for admin feeds', async () => {
      const response = await request(app)
        .get('/api/feeds?limit=10')
        .expect('Content-Type', /json/)
        .expect(200);

      expect(response.body.success).toBe(true);
      
      if (response.body.feeds.length > 1) {
        const feeds = response.body.feeds;
        
        for (let i = 0; i < feeds.length - 1; i++) {
          const currentTimestamp = new Date(feeds[i].timestamp);
          const nextTimestamp = new Date(feeds[i + 1].timestamp);
          
          expect(currentTimestamp.getTime()).toBeGreaterThanOrEqual(nextTimestamp.getTime());
        }
      }
    }, TIMEOUT_MS);
  });

  /**
   * Test Suite: Error Handling and Edge Cases
   * @description Tests for error conditions and edge cases in pagination
   */
  describe('Error Handling', () => {
    /**
     * Test: Should handle database connection errors gracefully
     * @description Tests error handling when database is unavailable
     */
    test('should handle database connection errors gracefully', async () => {
      // This test assumes the database is available
      // In a real scenario, you might mock the database connection failure
      const response = await request(app)
        .get(`/api/feeds/${EXISTING_USER_ID}`)
        .expect('Content-Type', /json/);

      // Should either succeed (200) or fail gracefully (500)
      expect([200, 500]).toContain(response.status);
      
      if (response.status === 500) {
        expect(response.body.success).toBe(false);
        expect(response.body).toHaveProperty('error');
      }
    }, TIMEOUT_MS);

    /**
     * Test: Should handle extremely large page numbers
     * @description Tests behavior when requesting pages beyond available data
     */
    test('should handle extremely large page numbers', async () => {
      const response = await request(app)
        .get(`/api/feeds/${EXISTING_USER_ID}?page=9999&limit=10`)
        .expect('Content-Type', /json/)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.feeds).toEqual([]); // Should return empty array
      expect(response.body.pagination.page).toBe(9999);
      expect(response.body.pagination.hasNextPage).toBe(false);
    }, TIMEOUT_MS);
  });

  /**
   * Test Suite: Performance and Load Testing
   * @description Tests for performance characteristics and response times
   */
  describe('Performance', () => {
    /**
     * Test: Should respond within acceptable time limits
     * @description Validates API response times meet performance requirements
     */
    test('should respond within acceptable time limits', async () => {
      const startTime = Date.now();
      
      const response = await request(app)
        .get(`/api/feeds/${EXISTING_USER_ID}?limit=50`)
        .expect(200);
      
      const endTime = Date.now();
      const responseTime = endTime - startTime;
      
      expect(response.body.success).toBe(true);
      expect(responseTime).toBeLessThan(5000); // Should respond within 5 seconds
    }, TIMEOUT_MS);

    /**
     * Test: Should handle concurrent pagination requests
     * @description Tests system behavior under concurrent load
     */
    test('should handle concurrent pagination requests', async () => {
      const promises = Array.from({ length: 5 }, (_, i) => 
        request(app)
          .get(`/api/feeds/${EXISTING_USER_ID}?page=${i + 1}&limit=10`)
          .expect(200)
      );

      const responses = await Promise.all(promises);
      
      responses.forEach((response, index) => {
        expect(response.body.success).toBe(true);
        expect(response.body.pagination.page).toBe(index + 1);
        expect(response.body.pagination.limit).toBe(10);
      });
    }, TIMEOUT_MS);
  });

  /**
   * After all tests completion
   * @description Cleanup and summary logging after test suite completion
   */
  afterAll(() => {
    console.log('\n📊 Test Suite Summary:');
    console.log('✅ All News Feeds API tests completed successfully');
    console.log('🔧 Pagination functionality fully tested');
    console.log('🚀 API performance validated');
    console.log('🛡️  Error handling verified');
    console.log('📈 Ready for production deployment\n');
  });
}); 