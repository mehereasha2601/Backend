# Blue Collar Workers API Documentation

**Author:** Easha from OK AI team  
**Version:** 1.1.0  
**Last Updated:** August 26, 2025

## Overview

The Blue Collar Workers API provides RESTful endpoints for managing and retrieving personalized news feeds for blue-collar workers. Built with Node.js, Express, and Supabase for scalable, cost-effective operations.

### Key Features
- **Paginated News Feeds**: Efficient content delivery with customizable pagination
- **User-Specific Content**: Personalized feeds based on user preferences  
- **Admin Management**: Administrative endpoints for content oversight
- **Real-time Ready**: Architecture prepared for real-time features
- **Mobile-First**: Optimized for mobile application integration

### Base URL
- **Development**: `http://localhost:3000`
- **Production**: `https://your-production-url.com`

### Interactive Documentation
- **Swagger UI**: `http://localhost:3000/api-docs`
- **OpenAPI Spec**: `http://localhost:3000/api-docs.json`

## Authentication

Currently, no authentication is required for development purposes. JWT-based authentication will be implemented in future versions.

⚠️ **Security Note**: In production, the admin endpoints should be protected with proper authentication and authorization.

## Pagination

All list endpoints support pagination using query parameters for efficient data loading and improved performance:

### Pagination Parameters
| Parameter | Type | Default | Range | Description |
|-----------|------|---------|-------|-------------|
| `page` | integer | 1 | ≥ 1 | Page number (1-based indexing) |
| `limit` | integer | 20 | 1-100 | Number of items per page |

### Pagination Response Format
```json
{
  "success": true,
  "data": [...],
  "pagination": {
    "currentPage": 2,
    "totalPages": 5,
    "totalCount": 87,
    "hasNextPage": true,
    "hasPreviousPage": true,
    "limit": 20
  }
}
```

### Pagination Best Practices
1. **Start with Default**: Use default pagination for initial requests
2. **Optimize Page Size**: Choose appropriate `limit` based on your UI needs
3. **Handle Empty Results**: Always check for empty arrays in responses
4. **Cache Efficiently**: Cache pagination metadata to reduce API calls
5. **Error Handling**: Handle pagination validation errors gracefully

## Endpoints

### 1. Health Check

**GET** `/`

Returns API status and basic information.

#### Response
```json
{
  "message": "Blue Collar Workers API is running!",
  "timestamp": "2025-08-26T15:30:45.123Z",
  "documentation": "http://localhost:3000/api-docs"
}
```

#### Example Usage
```bash
curl -X GET http://localhost:3000/
```

---

### 2. Get User-Specific Feeds (Paginated)

**GET** `/api/feeds/:userId`

Retrieves paginated news feeds for a specific user, ordered by timestamp (newest first).

#### Parameters
| Parameter | Location | Type | Required | Description |
|-----------|----------|------|----------|-------------|
| `userId` | path | UUID | ✅ | User's unique identifier |
| `page` | query | integer | ❌ | Page number (default: 1) |
| `limit` | query | integer | ❌ | Items per page (default: 20, max: 100) |

#### Response Format
```json
{
  "success": true,
  "userId": "4ed491e3-2efa-4c0b-a4f0-bd5aafa83bb4",
  "feeds": [
    {
      "feedId": "b42558e8-6c12-4eb2-9ee1-172cee858ca1",
      "userId": "4ed491e3-2efa-4c0b-a4f0-bd5aafa83bb4",
      "source": "JobBoard",
      "title": "Construction Worker Needed",
      "url": "https://example.com/job/123",
      "imageFirebaseUrl": "https://firebase.com/image.jpg",
      "timestamp": "2025-08-26T15:30:45.123Z",
      "content": "Latest job opportunity in construction sector",
      "category": "Jobs"
    }
  ],
  "pagination": {
    "currentPage": 1,
    "totalPages": 5,
    "totalCount": 87,
    "hasNextPage": true,
    "hasPreviousPage": false,
    "limit": 20
  }
}
```

#### Example Usage

**Default Pagination (First 20 items):**
```bash
curl -X GET http://localhost:3000/api/feeds/4ed491e3-2efa-4c0b-a4f0-bd5aafa83bb4
```

**Custom Page Size:**
```bash
curl -X GET "http://localhost:3000/api/feeds/4ed491e3-2efa-4c0b-a4f0-bd5aafa83bb4?limit=10"
```

**Specific Page:**
```bash
curl -X GET "http://localhost:3000/api/feeds/4ed491e3-2efa-4c0b-a4f0-bd5aafa83bb4?page=3&limit=15"
```

**Large Page Size (Maximum):**
```bash
curl -X GET "http://localhost:3000/api/feeds/4ed491e3-2efa-4c0b-a4f0-bd5aafa83bb4?limit=100"
```

#### Error Responses

**Invalid Pagination Parameters (400):**
```json
{
  "success": false,
  "error": "Invalid pagination parameters",
  "message": "Limit must be between 1 and 100",
  "details": "Please check your page and limit parameters"
}
```

**Server Error (500):**
```json
{
  "success": false,
  "error": "Database query failed",
  "message": "Unable to retrieve user feeds",
  "details": "Connection timeout"
}
```

---

### 3. Get All Feeds (Admin Endpoint - Paginated)

**GET** `/api/feeds`

Retrieves paginated feeds from all users. This is an administrative endpoint that should be restricted in production.

#### Parameters
| Parameter | Location | Type | Required | Description |
|-----------|----------|------|----------|-------------|
| `page` | query | integer | ❌ | Page number (default: 1) |
| `limit` | query | integer | ❌ | Items per page (default: 20, max: 100) |

#### Response Format
```json
{
  "success": true,
  "feeds": [
    {
      "feedId": "b42558e8-6c12-4eb2-9ee1-172cee858ca1",
      "userId": "4ed491e3-2efa-4c0b-a4f0-bd5aafa83bb4",
      "source": "JobBoard",
      "title": "Construction Worker Needed",
      "url": "https://example.com/job/123",
      "imageFirebaseUrl": "https://firebase.com/image.jpg",
      "timestamp": "2025-08-26T15:30:45.123Z",
      "content": "Latest job opportunity in construction",
      "category": "Jobs"
    },
    {
      "feedId": "c53669f9-7d23-5fc3-a827-557766551ba2",
      "userId": "550e8400-e29b-41d4-a716-446655440000",
      "source": "NewsOutlet",
      "title": "Industry Update",
      "url": "https://news.example.com/update",
      "imageFirebaseUrl": null,
      "timestamp": "2025-08-26T14:20:30.789Z",
      "content": "Latest updates from the construction industry",
      "category": "News"
    }
  ],
  "pagination": {
    "currentPage": 1,
    "totalPages": 8,
    "totalCount": 387,
    "hasNextPage": true,
    "hasPreviousPage": false,
    "limit": 50
  },
  "message": "All feeds retrieved successfully"
}
```

#### Example Usage

**Default Admin View:**
```bash
curl -X GET http://localhost:3000/api/feeds
```

**Large Page for Admin Dashboard:**
```bash
curl -X GET "http://localhost:3000/api/feeds?limit=50"
```

**Navigate Admin Pages:**
```bash
curl -X GET "http://localhost:3000/api/feeds?page=2&limit=25"
```

## Data Models

### Feed Object
```json
{
  "feedId": "string (UUID)",
  "userId": "string (UUID)",
  "source": "string|null",
  "title": "string|null",
  "url": "string|null",
  "imageFirebaseUrl": "string|null",
  "timestamp": "string (ISO 8601)",
  "content": "string",
  "category": "string|null"
}
```

### Pagination Metadata
```json
{
  "currentPage": "integer (≥1)",
  "totalPages": "integer (≥0)",
  "totalCount": "integer (≥0)",
  "hasNextPage": "boolean",
  "hasPreviousPage": "boolean",
  "limit": "integer (1-100)"
}
```

## Error Handling

All endpoints return consistent error responses:

```json
{
  "success": false,
  "error": "High-level error category",
  "message": "User-friendly error message",
  "details": "Technical details for debugging"
}
```

### Common HTTP Status Codes
- **200 OK**: Request successful
- **400 Bad Request**: Invalid parameters or request format
- **500 Internal Server Error**: Server or database error

### Pagination-Specific Errors
- **Invalid page number**: Page must be ≥ 1
- **Invalid limit**: Limit must be between 1 and 100
- **Page beyond range**: Returns empty array with correct pagination metadata

## Rate Limiting

Currently, no rate limiting is implemented for development. Production deployment will include:
- **User Tier Based**: Different limits based on user subscription
- **Endpoint Specific**: Higher limits for read operations
- **Burst Allowance**: Short-term burst capacity for peak usage

## Performance Optimization

### Recommended Practices
1. **Use Appropriate Page Sizes**: Balance between performance and user experience
2. **Cache Pagination Metadata**: Store total counts to avoid repeated count queries
3. **Implement Client-Side Caching**: Cache feed data to reduce API calls
4. **Use ETags**: Implement conditional requests for unchanged data (future)
5. **Monitor Response Times**: Track API performance for optimization

### Performance Targets
- **Response Time**: < 500ms for paginated requests
- **Throughput**: 100+ requests/second sustained
- **Availability**: 99.9% uptime target
- **Concurrent Users**: 50+ simultaneous users supported

## Examples and Use Cases

### Mobile App Feed Loading
```javascript
// Load initial feed page
const loadInitialFeed = async (userId) => {
  const response = await fetch(`/api/feeds/${userId}?limit=20`);
  const data = await response.json();
  return data;
};

// Load more feeds (infinite scroll)
const loadMoreFeeds = async (userId, currentPage) => {
  const nextPage = currentPage + 1;
  const response = await fetch(`/api/feeds/${userId}?page=${nextPage}&limit=20`);
  const data = await response.json();
  return data;
};
```

### Admin Dashboard Pagination
```javascript
// Admin dashboard with table pagination
const loadAdminFeeds = async (page = 1, limit = 50) => {
  const response = await fetch(`/api/feeds?page=${page}&limit=${limit}`);
  const data = await response.json();
  
  return {
    feeds: data.feeds,
    pagination: data.pagination
  };
};
```

### Efficient Data Loading
```javascript
// Check if more data is available before loading
const hasMoreData = (pagination) => {
  return pagination.hasNextPage;
};

// Calculate total pages for pagination UI
const getTotalPages = (pagination) => {
  return pagination.totalPages;
};
```

## Testing

Run the comprehensive test suite to verify all pagination functionality:

```bash
# Run all tests
npm test

# Run with coverage report
npm run test:coverage

# Run in watch mode for development
npm run test:watch
```

### Test Coverage
- ✅ Default pagination behavior
- ✅ Custom page and limit parameters
- ✅ Boundary condition validation
- ✅ Invalid parameter handling
- ✅ Empty result scenarios
- ✅ Performance benchmarks
- ✅ Concurrent request handling

## Migration Guide

### From v1.0 to v1.1 (Pagination)
The API maintains backward compatibility. Existing requests without pagination parameters will use default values:
- `page=1` (first page)
- `limit=20` (20 items per page)

### Response Format Changes
- Added `pagination` object to all list responses
- Removed `count` field (replaced by `pagination.totalCount`)
- Enhanced error messages for validation

## Support and Resources

- **Interactive Documentation**: http://localhost:3000/api-docs
- **GitHub Repository**: https://github.com/your-org/blue-collar-backend
- **Issue Tracker**: https://github.com/your-org/blue-collar-backend/issues
- **Technical Support**: support@bluecollarapi.com

---

*This documentation is automatically updated with each API version. For the most current information, always refer to the interactive Swagger documentation.* 