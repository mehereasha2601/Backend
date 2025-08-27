/**
 * @fileoverview Blue Collar Workers API - Express Application
 * @description Main application file containing Express server configuration,
 * middleware setup, database connection, API routes, and Swagger documentation.
 * Implements RESTful API endpoints for blue-collar worker platform with
 * comprehensive error handling, CORS support, and interactive API documentation.
 * @author Easha from OK AI team
 * @version 1.2.0
 * @since 1.0.0
 * @note Test comment added to verify git commit functionality
 */

// Import required packages
const express = require('express');

const express2 = require('express');
const cors = require('cors');
const { createClient } = require('@supabase/supabase-js');

const swaggerUi = require('swagger-ui-express');
const swaggerJSDoc = require('swagger-jsdoc');
const YAML = require('yamljs');
const path = require('path');
const { URL } = require('url');
require('dotenv').config();

/**
 * Express application instance
 * @type {express.Application}
 */
const app = express();

/**
 * Middleware setup
 * Configures CORS and JSON parsing for the Express application
 */
app.use(cors()); // Allow cross-origin requests from any origin
app.use(express.json()); // Parse JSON request bodies with size limit

/**
 * Supabase client instance
 * @type {SupabaseClient}
 * @description Configured with environment variables for database operations
 */
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_ANON_KEY
);

/**
 * System configuration constants
 * @description Constants for system user and internal API authentication
 */
const SYSTEM_USER_ID = process.env.SYSTEM_USER_ID || 'b42558e8-6c12-4eb2-9ee1-172cee858ca1';
const INTERNAL_API_TOKEN = process.env.INTERNAL_API_TOKEN || 'your-secret-token-here';

/**
 * Utility Functions
 */

/**
 * Extract domain from URL for source field
 * @param {string} url - The article URL
 * @returns {string} - The domain name (e.g., 'tmz.com', 'cnn.com')
 */
function extractDomainFromUrl(url) {
  try {
    const urlObj = new URL(url);
    return urlObj.hostname.replace('www.', '');
  } catch (error) {
    return 'unknown-source';
  }
}

/**
 * Authentication middleware for internal API
 * @param {express.Request} req - Express request object
 * @param {express.Response} res - Express response object
 * @param {express.NextFunction} next - Express next function
 */
function authenticateInternalAPI(req, res, next) {
  const authHeader = req.headers.authorization;
  
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({
      success: false,
      error: 'Missing or invalid authorization header. Use: Bearer <token>'
    });
  }
  
  const token = authHeader.substring(7); // Remove 'Bearer ' prefix
  
  if (token !== INTERNAL_API_TOKEN) {
    return res.status(403).json({
      success: false,
      error: 'Invalid authentication token'
    });
  }
  
  next();
}

/**
 * Swagger/OpenAPI Documentation Setup
 * @description Loads the OpenAPI specification and configures Swagger UI
 */
const swaggerDocument = YAML.load(path.join(__dirname, 'swagger.yaml'));

// Swagger UI options
const swaggerOptions = {
  explorer: true,
  swaggerOptions: {
    validatorUrl: null, // Disable validator
    tryItOutEnabled: true,
  },
  customCss: `
    .swagger-ui .topbar { display: none }
    .swagger-ui .info { margin: 20px 0 }
    .swagger-ui .info .title { color: #2563eb }
  `,
  customSiteTitle: "Blue Collar Workers API - Documentation"
};

/**
 * Swagger API Documentation
 * @route GET /api-docs
 * @description Interactive API documentation using Swagger UI
 * @access Public
 */
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerDocument, swaggerOptions));

/**
 * API Documentation JSON
 * @route GET /api-docs.json
 * @description Returns the OpenAPI specification in JSON format
 * @access Public
 */
app.get('/api-docs.json', (req, res) => {
  res.setHeader('Content-Type', 'application/json');
  res.send(swaggerDocument);
});

/**
 * Health Check Endpoint
 * @route GET /
 * @description Returns API status and current timestamp for monitoring
 * @access Public
 * @returns {Object} 200 - API status information
 * @returns {string} 200.message - Status message
 * @returns {string} 200.timestamp - Current ISO timestamp
 * @example
 * GET /
 * Response: {
 *   "message": "Blue Collar Workers API is running!",
 *   "timestamp": "2025-08-26T17:30:45.123Z"
 * }
 */
app.get('/', (req, res) => {
  try {
    res.json({ 
      message: 'Blue Collar Workers API is running!',
      timestamp: new Date().toISOString(),
      documentation: `${req.protocol}://${req.get('host')}/api-docs`
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      details: error.message
    });
  }
});

/**
 * Validates and sanitizes pagination parameters
 * @param {Object} query - Request query parameters
 * @param {string|number} query.page - Page number (1-based)
 * @param {string|number} query.limit - Items per page
 * @returns {Object} Validated pagination parameters
 * @throws {Error} When pagination parameters are invalid
 * @example
 * const pagination = validatePagination({ page: '2', limit: '10' });
 * // Returns: { page: 2, limit: 10, offset: 10 }
 */
function validatePagination(query) {
  // Default pagination values
  const DEFAULT_PAGE = 1;
  const DEFAULT_LIMIT = 20;
  const MAX_LIMIT = 100;
  const MIN_LIMIT = 1;
  const MIN_PAGE = 1;

  // Parse values with explicit handling for zero and invalid values
  let page = query.page !== undefined ? parseInt(query.page) : DEFAULT_PAGE;
  let limit = query.limit !== undefined ? parseInt(query.limit) : DEFAULT_LIMIT;

  // Handle NaN values (invalid input)
  if (isNaN(page)) {
    page = DEFAULT_PAGE;
  }
  if (isNaN(limit)) {
    limit = DEFAULT_LIMIT;
  }

  // Validate page parameter
  if (page < MIN_PAGE) {
    throw new Error(`Page must be greater than or equal to ${MIN_PAGE}`);
  }

  // Validate limit parameter
  if (limit < MIN_LIMIT || limit > MAX_LIMIT) {
    throw new Error(`Limit must be between ${MIN_LIMIT} and ${MAX_LIMIT}`);
  }

  // Calculate offset for database query
  const offset = (page - 1) * limit;

  return {
    page,
    limit,
    offset
  };
}

/**
 * Calculates pagination metadata for API responses
 * @param {number} totalCount - Total number of records
 * @param {number} page - Current page number
 * @param {number} limit - Items per page
 * @returns {Object} Pagination metadata
 * @example
 * const meta = calculatePaginationMeta(150, 2, 20);
 * // Returns: { page: 2, totalPages: 8, totalCount: 150, hasNextPage: true, hasPreviousPage: true }
 */
function calculatePaginationMeta(totalCount, page, limit) {
  const totalPages = Math.ceil(totalCount / limit);
  const hasNextPage = page < totalPages;
  const hasPreviousPage = page > 1;

  return {
    page: page,
    totalPages,
    totalCount,
    hasNextPage,
    hasPreviousPage,
    limit
  };
}

/**
 * GET /api/feeds/:userId - Retrieve paginated feeds for a specific user
 * @route GET /api/feeds/:userId
 * @param {string} userId - UUID of the user to fetch feeds for
 * @param {number} [page=1] - Page number (1-based indexing)
 * @param {number} [limit=20] - Number of items per page (max 100)
 * @returns {Object} JSON response with user's feeds and pagination metadata
 * @throws {400} Bad Request - Invalid userId format or pagination parameters
 * @throws {500} Internal Server Error - Database connection or query issues
 * @access Public
 * @example
 * GET /api/feeds/550e8400-e29b-41d4-a716-446655440000?page=2&limit=10
 * Response: {
 *   "success": true,
 *   "userId": "550e8400-e29b-41d4-a716-446655440000",
 *   "feeds": [...],
 *   "pagination": {
 *     "currentPage": 2,
 *     "totalPages": 5,
 *     "totalCount": 47,
 *     "hasNextPage": true,
 *     "hasPreviousPage": true,
 *     "limit": 10
 *   }
 * }
 */

/**
 * @route GET /api/feeds/public
 * @description Get public news feeds (MVP endpoint for all users)
 * @summary Retrieve public news feeds with pagination
 * @tags Public Feeds
 * @param {number} [page=1] - Page number for pagination
 * @param {number} [limit=20] - Number of feeds per page (max 100)
 * @returns {object} 200 - Success response with paginated feeds data
 * @returns {object} 400 - Invalid pagination parameters
 * @returns {object} 500 - Server error
 * @example
 * // GET /api/feeds/public?page=1&limit=20
 * {
 *   "success": true,
 *   "data": [
 *     {
 *       "feedId": "uuid",
 *       "title": "Celebrity News Update",
 *       "source": "tmz.com",
 *       "url": "https://tmz.com/article",
 *       "content": "Article summary...",
 *       "timestamp": "2025-01-26T10:30:00.000Z"
 *     }
 *   ],
 *   "pagination": {
 *     "page": 1,
 *     "limit": 20,
 *     "totalCount": 45,
 *     "totalPages": 3,
 *     "hasNextPage": true,
 *     "hasPreviousPage": false
 *   }
 * }
 */
app.get('/api/feeds/public', async (req, res) => {
  try {
    console.log('Fetching public feeds from system user...');

    // Validate pagination parameters
    let pagination;
    try {
      pagination = validatePagination(req.query);
    } catch (validationError) {
      return res.status(400).json({
        success: false,
        error: 'Invalid pagination parameters',
        message: validationError.message,
        details: 'Please check your page and limit parameters'
      });
    }

    // Get total count for pagination metadata (from system user only)
    const { count: totalCountResult, error: countError } = await supabase
      .from('Feeds')
      .select('*', { count: 'exact', head: true })
      .eq('userId', SYSTEM_USER_ID);

    if (countError) {
      console.error('Database count error:', countError);
      return res.status(500).json({
        success: false,
        error: 'Failed to count feeds',
        message: 'Database error occurred while counting feeds'
      });
    }

    const totalCount = totalCountResult || 0;

    // Calculate pagination metadata
    const paginationMeta = calculatePaginationMeta(totalCount, pagination.page, pagination.limit);

    // Fetch paginated feeds from system user only, ordered by timestamp (newest first)
    const { data: feeds, error: fetchError } = await supabase
      .from('Feeds')
      .select('feedId, source, title, url, content, timestamp')
      .eq('userId', SYSTEM_USER_ID)
      .order('timestamp', { ascending: false })
      .range(pagination.offset, pagination.offset + pagination.limit - 1);

    if (fetchError) {
      console.error('Database fetch error:', fetchError);
      return res.status(500).json({
        success: false,
        error: 'Failed to fetch feeds',
        message: 'Database error occurred while fetching feeds'
      });
    }

    // Return successful response with feeds and pagination metadata
    res.json({
      success: true,
      data: feeds || [],
      pagination: paginationMeta
    });

  } catch (error) {
    console.error('Public feeds API error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      message: 'An unexpected error occurred while processing your request',
      details: error.message
    });
  }
});

app.get('/api/feeds/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    console.log(`Fetching feeds for user: ${userId}`);

    // Validate pagination parameters
    let pagination;
    try {
      pagination = validatePagination(req.query);
    } catch (validationError) {
      return res.status(400).json({
        success: false,
        error: 'Invalid pagination parameters',
        message: validationError.message,
        details: 'Please check your page and limit parameters'
      });
    }

    // Get total count for pagination metadata
    const { count: totalCountResult, error: countError } = await supabase
      .from('Feeds')
      .select('*', { count: 'exact', head: true })
      .eq('userId', userId);

    if (countError) {
      console.error('Database count error:', countError);
      return res.status(500).json({
        success: false,
        error: 'Database query failed',
        message: 'Unable to retrieve feed count',
        details: countError.message
      });
    }

    const totalCount = totalCountResult || 0;

    // Fetch paginated feeds
    const { data: feeds, error } = await supabase
      .from('Feeds')
      .select('*')
      .eq('userId', userId)
      .order('timestamp', { ascending: false })
      .range(pagination.offset, pagination.offset + pagination.limit - 1);

    if (error) {
      console.error('Database query error:', error);
      return res.status(500).json({
        success: false,
        error: 'Database query failed',
        message: 'Unable to retrieve user feeds',
        details: error.message
      });
    }

    // Calculate pagination metadata
    const paginationMeta = calculatePaginationMeta(totalCount, pagination.page, pagination.limit);

    // Return successful response with pagination
    res.json({
      success: true,
      userId,
      feeds: feeds || [],
      pagination: paginationMeta
    });

  } catch (error) {
    console.error('Server error in /api/feeds/:userId:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      message: 'An unexpected error occurred while processing your request',
      details: error.message
    });
  }
});

/**
 * GET /api/feeds - Retrieve paginated feeds for all users (admin endpoint)
 * @route GET /api/feeds
 * @param {number} [page=1] - Page number (1-based indexing)
 * @param {number} [limit=20] - Number of items per page (max 100)
 * @returns {Object} JSON response with all feeds and pagination metadata
 * @throws {400} Bad Request - Invalid pagination parameters
 * @throws {500} Internal Server Error - Database connection or query issues
 * @access Admin
 * @example
 * GET /api/feeds?page=1&limit=50
 * Response: {
 *   "success": true,
 *   "feeds": [...],
 *   "pagination": {
 *     "currentPage": 1,
 *     "totalPages": 3,
 *     "totalCount": 125,
 *     "hasNextPage": true,
 *     "hasPreviousPage": false,
 *     "limit": 50
 *   },
 *   "message": "All feeds retrieved successfully"
 * }
 */
app.get('/api/feeds', async (req, res) => {
  try {
    console.log('Fetching all feeds from database...');

    // Validate pagination parameters
    let pagination;
    try {
      pagination = validatePagination(req.query);
    } catch (validationError) {
      return res.status(400).json({
        success: false,
        error: 'Invalid pagination parameters',
        message: validationError.message,
        details: 'Please check your page and limit parameters'
      });
    }

    // Get total count for pagination metadata
    const { count: totalCountResult, error: countError } = await supabase
      .from('Feeds')
      .select('*', { count: 'exact', head: true });

    if (countError) {
      console.error('Database count error:', countError);
      return res.status(500).json({
        success: false,
        error: 'Database query failed',
        message: 'Unable to retrieve feed count',
        details: countError.message
      });
    }

    const totalCount = totalCountResult || 0;

    // Fetch paginated feeds
    const { data: feeds, error } = await supabase
      .from('Feeds')
      .select('*')
      .order('timestamp', { ascending: false })
      .range(pagination.offset, pagination.offset + pagination.limit - 1);

    if (error) {
      console.error('Database query error:', error);
      return res.status(500).json({
        success: false,
        error: 'Database query failed',
        message: 'Unable to retrieve feeds',
        details: error.message
      });
    }

    // Calculate pagination metadata
    const paginationMeta = calculatePaginationMeta(totalCount, pagination.page, pagination.limit);

    // Return successful response with pagination
    res.json({
      success: true,
      feeds: feeds || [],
      pagination: paginationMeta,
      message: 'All feeds retrieved successfully'
    });

  } catch (error) {
    console.error('Server error in /api/feeds:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      message: 'An unexpected error occurred while processing your request',
      details: error.message
    });
  }
});



/**
 * @route POST /api/internal/feeds
 * @description Internal API endpoint for content ingestion from external scripts
 * @summary Create a new feed entry (Internal API)
 * @tags Internal API
 * @security BearerAuth
 * @param {object} req.body - Feed data
 * @param {string} req.body.title - Article title (required)
 * @param {string} req.body.summary - Article summary/content (required)
 * @param {string} req.body.category - Article category (required)
 * @param {string} req.body.url - Original article URL (required)
 * @returns {object} 201 - Success response with created feed data
 * @returns {object} 400 - Validation error
 * @returns {object} 401 - Authentication error
 * @returns {object} 403 - Authorization error
 * @returns {object} 500 - Server error
 * @example
 * // Request body:
 * {
 *   "title": "Celebrity News Update",
 *   "summary": "AI-generated summary of the article...",
 *   "category": "Celebrities",
 *   "url": "https://tmz.com/article-url"
 * }
 * 
 * // Response:
 * {
 *   "success": true,
 *   "message": "Feed created successfully",
 *   "data": {
 *     "feedId": "uuid",
 *     "title": "Celebrity News Update",
 *     "source": "tmz.com",
 *     "timestamp": "2025-01-26T10:30:00.000Z"
 *   }
 * }
 */
app.post('/api/internal/feeds', authenticateInternalAPI, async (req, res) => {
  try {
    const { title, summary, category, url } = req.body;

    // Validate required fields
    if (!title || !summary || !category || !url) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields',
        required: ['title', 'summary', 'category', 'url'],
        received: Object.keys(req.body)
      });
    }

    // Validate field lengths for performance
    if (title.length > 500) {
      return res.status(400).json({
        success: false,
        error: 'Title too long (max 500 characters)',
        length: title.length
      });
    }

    if (summary.length > 10000) {
      return res.status(400).json({
        success: false,
        error: 'Summary too long (max 10,000 characters)',
        length: summary.length
      });
    }

    // Extract domain from URL for source field
    const source = extractDomainFromUrl(url);

    // Prepare feed data for database insertion
    const feedData = {
      userId: SYSTEM_USER_ID,
      source: source,
      title: title.trim(),
      url: url.trim(),
      content: summary.trim(),
      imageFirebaseUrl: null, // Will be added in future versions
      timestamp: new Date().toISOString()
    };

    // Insert into database
    const { data, error } = await supabase
      .from('Feeds')
      .insert([feedData])
      .select('feedId, title, source, timestamp')
      .single();

    if (error) {
      console.error('Database insertion error:', error);
      
      // Handle specific database constraint errors
      if (error.code === '23503') {
        return res.status(400).json({
          success: false,
          error: 'Invalid user reference',
          message: `User ID ${SYSTEM_USER_ID} does not exist in the Users table`,
          details: error.message
        });
      }
      
      return res.status(500).json({
        success: false,
        error: 'Failed to create feed entry',
        message: 'Database error occurred while inserting the feed',
        details: error.message
      });
    }

    // Return success response with minimal data for speed
    res.status(201).json({
      success: true,
      message: 'Feed created successfully',
      data: {
        feedId: data.feedId,
        title: data.title,
        source: data.source,
        timestamp: data.timestamp
      }
    });

    // Log successful creation for monitoring
    console.log(`✅ Feed created: ${data.feedId} from ${source}`);

  } catch (error) {
    console.error('Internal API error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      message: 'An unexpected error occurred while processing the request'
    });
  }
});

/**
 * Export the Express application for use in server.js and tests
 * @module app
 */
module.exports = app; 