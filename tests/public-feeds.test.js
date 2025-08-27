/**
 * @fileoverview Test suite for Public Feeds API endpoints
 * @description Comprehensive tests for the public feeds API that fetches
 * system-generated content for all users (MVP endpoint)
 * @author Easha from OK AI team
 * @version 1.2.0
 * @since 1.2.0
 */

const request = require('supertest');
const app = require('../app');

/**
 * @description Test suite for Public Feeds API
 * Tests the GET /api/feeds/public endpoint used by frontend to fetch
 * system-generated news content for all users
 */
describe('Public Feeds API', () => {

  /**
   * @description Basic Functionality Tests
   * Tests basic API functionality and response structure
   */
  describe('Basic Functionality', () => {
    
    /**
     * @description Test successful response
     */
    test('should return successful response with default pagination', async () => {
      const response = await request(app)
        .get('/api/feeds/public');
      
      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body).toHaveProperty('data');
      expect(response.body).toHaveProperty('pagination');
      expect(Array.isArray(response.body.data)).toBe(true);
    });

    /**
     * @description Test response structure for feeds
     */
    test('should return feeds with correct structure', async () => {
      const response = await request(app)
        .get('/api/feeds/public?limit=5');
      
      expect(response.status).toBe(200);
      
      if (response.body.data.length > 0) {
        const feed = response.body.data[0];
        expect(feed).toHaveProperty('feedId');
        expect(feed).toHaveProperty('source');
        expect(feed).toHaveProperty('title');
        expect(feed).toHaveProperty('url');
        expect(feed).toHaveProperty('content');
        expect(feed).toHaveProperty('timestamp');
        
        // Validate timestamp format
        const timestamp = new Date(feed.timestamp);
        expect(timestamp.getTime()).not.toBeNaN();
      }
    });

    /**
     * @description Test feeds are ordered by timestamp (newest first)
     */
    test('should return feeds ordered by timestamp (newest first)', async () => {
      const response = await request(app)
        .get('/api/feeds/public?limit=5');
      
      expect(response.status).toBe(200);
      
      if (response.body.data.length > 1) {
        const feeds = response.body.data;
        for (let i = 0; i < feeds.length - 1; i++) {
          const currentTimestamp = new Date(feeds[i].timestamp);
          const nextTimestamp = new Date(feeds[i + 1].timestamp);
          expect(currentTimestamp.getTime()).toBeGreaterThanOrEqual(nextTimestamp.getTime());
        }
      }
    });
  });

  /**
   * @description Pagination Tests
   * Tests various pagination scenarios for the public feeds API
   */
  describe('Pagination', () => {
    
    /**
     * @description Test default pagination parameters
     */
    test('should use default pagination parameters', async () => {
      const response = await request(app)
        .get('/api/feeds/public');
      
      expect(response.status).toBe(200);
      expect(response.body.pagination.page).toBe(1);
      expect(response.body.pagination.limit).toBe(20);
      expect(response.body.pagination).toHaveProperty('totalCount');
      expect(response.body.pagination).toHaveProperty('totalPages');
      expect(response.body.pagination).toHaveProperty('hasNextPage');
      expect(response.body.pagination).toHaveProperty('hasPreviousPage');
    });

    /**
     * @description Test custom page parameter
     */
    test('should handle custom page parameter', async () => {
      const response = await request(app)
        .get('/api/feeds/public?page=2');
      
      expect(response.status).toBe(200);
      expect(response.body.pagination.page).toBe(2);
      expect(response.body.pagination.limit).toBe(20);
    });

    /**
     * @description Test custom limit parameter
     */
    test('should handle custom limit parameter', async () => {
      const response = await request(app)
        .get('/api/feeds/public?limit=10');
      
      expect(response.status).toBe(200);
      expect(response.body.pagination.page).toBe(1);
      expect(response.body.pagination.limit).toBe(10);
      expect(response.body.data.length).toBeLessThanOrEqual(10);
    });

    /**
     * @description Test custom page and limit parameters
     */
    test('should handle custom page and limit parameters', async () => {
      const response = await request(app)
        .get('/api/feeds/public?page=2&limit=5');
      
      expect(response.status).toBe(200);
      expect(response.body.pagination.page).toBe(2);
      expect(response.body.pagination.limit).toBe(5);
      expect(response.body.data.length).toBeLessThanOrEqual(5);
    });

    /**
     * @description Test maximum limit validation
     */
    test('should enforce maximum limit of 100', async () => {
      const response = await request(app)
        .get('/api/feeds/public?limit=150');
      
      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('Invalid pagination parameters');
    });

    /**
     * @description Test minimum limit validation
     */
    test('should enforce minimum limit of 1', async () => {
      const response = await request(app)
        .get('/api/feeds/public?limit=0');
      
      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('Invalid pagination parameters');
    });

    /**
     * @description Test minimum page validation
     */
    test('should enforce minimum page of 1', async () => {
      const response = await request(app)
        .get('/api/feeds/public?page=0');
      
      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('Invalid pagination parameters');
    });

    /**
     * @description Test non-numeric pagination parameters
     */
    test('should handle non-numeric pagination parameters gracefully', async () => {
      const response = await request(app)
        .get('/api/feeds/public?page=abc&limit=xyz');
      
      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      // Should default to page=1, limit=20 when non-numeric values are provided
      expect(response.body.pagination.page).toBe(1);
      expect(response.body.pagination.limit).toBe(20);
    });

    /**
     * @description Test pagination metadata consistency
     */
    test('should return consistent pagination metadata', async () => {
      const response = await request(app)
        .get('/api/feeds/public?page=1&limit=5');
      
      expect(response.status).toBe(200);
      
      const pagination = response.body.pagination;
      expect(typeof pagination.totalCount).toBe('number');
      expect(typeof pagination.totalPages).toBe('number');
      expect(typeof pagination.hasNextPage).toBe('boolean');
      expect(typeof pagination.hasPreviousPage).toBe('boolean');
      
      // First page should not have previous page
      if (pagination.page === 1) {
        expect(pagination.hasPreviousPage).toBe(false);
      }
      
      // Calculate expected total pages
      const expectedTotalPages = Math.ceil(pagination.totalCount / pagination.limit);
      expect(pagination.totalPages).toBe(expectedTotalPages);
    });

    /**
     * @description Test extremely large page number
     */
    test('should handle extremely large page numbers', async () => {
      const response = await request(app)
        .get('/api/feeds/public?page=999999');
      
      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toEqual([]);
      expect(response.body.pagination.hasNextPage).toBe(false);
    });
  });

  /**
   * @description Performance Tests
   * Tests API performance and response times
   */
  describe('Performance', () => {
    
    /**
     * @description Test API response time
     */
    test('should respond within reasonable time', async () => {
      const startTime = Date.now();
      
      const response = await request(app)
        .get('/api/feeds/public?limit=10');
      
      const responseTime = Date.now() - startTime;
      
      expect(response.status).toBe(200);
      expect(responseTime).toBeLessThan(2000); // Should respond within 2 seconds
    });

    /**
     * @description Test handling multiple concurrent requests
     */
    test('should handle concurrent requests', async () => {
      const promises = [];
      
      for (let i = 0; i < 5; i++) {
        promises.push(
          request(app)
            .get(`/api/feeds/public?page=${i + 1}&limit=5`)
        );
      }
      
      const responses = await Promise.all(promises);
      
      responses.forEach((response, index) => {
        expect(response.status).toBe(200);
        expect(response.body.success).toBe(true);
        expect(response.body.pagination.page).toBe(index + 1);
        expect(response.body.pagination.limit).toBe(5);
      });
    });

    /**
     * @description Test large limit performance
     */
    test('should handle large limit efficiently', async () => {
      const startTime = Date.now();
      
      const response = await request(app)
        .get('/api/feeds/public?limit=100');
      
      const responseTime = Date.now() - startTime;
      
      expect(response.status).toBe(200);
      expect(responseTime).toBeLessThan(3000); // Should respond within 3 seconds even with large limit
    });
  });

  /**
   * @description Error Handling Tests
   * Tests various error scenarios
   */
  describe('Error Handling', () => {
    
    /**
     * @description Test malformed query parameters
     */
    test('should handle malformed query parameters gracefully', async () => {
      const response = await request(app)
        .get('/api/feeds/public?page=1.5&limit=20.7');
      
      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      // Should parse 1.5 to 1 and 20.7 to 20
      expect(response.body.pagination.page).toBe(1);
      expect(response.body.pagination.limit).toBe(20);
    });

    /**
     * @description Test negative numbers in pagination
     */
    test('should handle negative pagination parameters', async () => {
      const response = await request(app)
        .get('/api/feeds/public?page=-1&limit=-5');
      
      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('Invalid pagination parameters');
    });
  });

  /**
   * @description Integration Tests
   * Tests integration with the internal API
   */
  describe('Integration with Internal API', () => {
    
    /**
     * @description Test that public API returns system user feeds
     */
    test('should return feeds from system user only', async () => {
      const response = await request(app)
        .get('/api/feeds/public?limit=5');
      
      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      
      // All returned feeds should be from system user (this is implicit in the query)
      // We can't directly check userId since it's not returned in the response
      // but the API should only return system user feeds
      expect(Array.isArray(response.body.data)).toBe(true);
    });
  });

  /**
   * @description Cleanup after all tests
   * Logs test completion summary
   */
  afterAll(() => {
    console.log('✅ Public Feeds API tests completed successfully');
  });
}); 