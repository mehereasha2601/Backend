# Frontend Integration Guide

**Author:** Easha from OK AI team  
**Version:** 1.1.0  
**Last Updated:** August 26, 2025

## Quick Start

### 🚀 Interactive API Explorer
**Swagger UI**: http://localhost:3000/api-docs  
Try all endpoints directly in your browser with real data!

### 📡 Base URL
```javascript
const API_BASE_URL = 'http://localhost:3000';
```

## Available Endpoints

### 1. Health Check
- **GET** `/` - API status and information

### 2. User Feeds (Paginated)
- **GET** `/api/feeds/:userId` - Get paginated feeds for a specific user
- **Query Parameters**: 
  - `page` (integer, default: 1) - Page number
  - `limit` (integer, default: 20, max: 100) - Items per page

### 3. Admin Feeds (Paginated)
- **GET** `/api/feeds` - Get all feeds with pagination (admin)
- **Query Parameters**: Same as user feeds

## Pagination Implementation Guide

### Understanding Pagination Response
```json
{
  "success": true,
  "userId": "user-uuid",
  "feeds": [...],
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

## Frontend Integration Examples

### React/Next.js Implementation

#### 1. Basic Feed Component with Pagination
```jsx
import React, { useState, useEffect } from 'react';

const FeedComponent = ({ userId }) => {
  const [feeds, setFeeds] = useState([]);
  const [pagination, setPagination] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const fetchFeeds = async (page = 1, limit = 20) => {
    setLoading(true);
    setError(null);
    
    try {
      const response = await fetch(
        `http://localhost:3000/api/feeds/${userId}?page=${page}&limit=${limit}`
      );
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const data = await response.json();
      
      if (data.success) {
        setFeeds(data.feeds);
        setPagination(data.pagination);
      } else {
        setError(data.message || 'Failed to fetch feeds');
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (userId) {
      fetchFeeds();
    }
  }, [userId]);

  const handlePageChange = (newPage) => {
    fetchFeeds(newPage, pagination?.limit || 20);
  };

  const handleLimitChange = (newLimit) => {
    fetchFeeds(1, newLimit);
  };

  if (loading) return <div className="loading">Loading feeds...</div>;
  if (error) return <div className="error">Error: {error}</div>;

  return (
    <div className="feed-container">
      {/* Feed Items */}
      <div className="feeds-list">
        {feeds.map((feed) => (
          <div key={feed.feedId} className="feed-item">
            <h3>{feed.title}</h3>
            <p>{feed.content}</p>
            <div className="feed-meta">
              <span>Source: {feed.source}</span>
              <span>Date: {new Date(feed.timestamp).toLocaleDateString()}</span>
            </div>
          </div>
        ))}
      </div>

      {/* Pagination Controls */}
      {pagination && (
        <div className="pagination-controls">
          <button 
            onClick={() => handlePageChange(pagination.currentPage - 1)}
            disabled={!pagination.hasPreviousPage}
          >
            Previous
          </button>
          
          <span>
            Page {pagination.currentPage} of {pagination.totalPages}
            ({pagination.totalCount} total items)
          </span>
          
          <button 
            onClick={() => handlePageChange(pagination.currentPage + 1)}
            disabled={!pagination.hasNextPage}
          >
            Next
          </button>
          
          {/* Page Size Selector */}
          <select 
            value={pagination.limit} 
            onChange={(e) => handleLimitChange(Number(e.target.value))}
          >
            <option value={10}>10 per page</option>
            <option value={20}>20 per page</option>
            <option value={50}>50 per page</option>
            <option value={100}>100 per page</option>
          </select>
        </div>
      )}
    </div>
  );
};

export default FeedComponent;
```

#### 2. Infinite Scroll Implementation
```jsx
import React, { useState, useEffect, useCallback } from 'react';
import { useInfiniteQuery } from 'react-query';

const InfiniteScrollFeeds = ({ userId }) => {
  const fetchFeeds = async ({ pageParam = 1 }) => {
    const response = await fetch(
      `http://localhost:3000/api/feeds/${userId}?page=${pageParam}&limit=20`
    );
    
    if (!response.ok) {
      throw new Error('Failed to fetch feeds');
    }
    
    return response.json();
  };

  const {
    data,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    isLoading,
    error,
  } = useInfiniteQuery(
    ['feeds', userId],
    fetchFeeds,
    {
      getNextPageParam: (lastPage) => {
        return lastPage.pagination.hasNextPage 
          ? lastPage.pagination.currentPage + 1 
          : undefined;
      },
    }
  );

  // Intersection Observer for infinite scroll
  const observerRef = useCallback(
    (node) => {
      if (isFetchingNextPage) return;
      
      const observer = new IntersectionObserver((entries) => {
        if (entries[0].isIntersecting && hasNextPage) {
          fetchNextPage();
        }
      });
      
      if (node) observer.observe(node);
      
      return () => observer.disconnect();
    },
    [isFetchingNextPage, hasNextPage, fetchNextPage]
  );

  if (isLoading) return <div>Loading...</div>;
  if (error) return <div>Error: {error.message}</div>;

  const allFeeds = data?.pages.flatMap(page => page.feeds) || [];

  return (
    <div className="infinite-scroll-container">
      {allFeeds.map((feed, index) => (
        <div 
          key={feed.feedId} 
          className="feed-item"
          ref={index === allFeeds.length - 1 ? observerRef : null}
        >
          <h3>{feed.title}</h3>
          <p>{feed.content}</p>
          <div className="feed-meta">
            <span>{feed.source}</span>
            <span>{new Date(feed.timestamp).toLocaleDateString()}</span>
          </div>
        </div>
      ))}
      
      {isFetchingNextPage && (
        <div className="loading-more">Loading more...</div>
      )}
      
      {!hasNextPage && allFeeds.length > 0 && (
        <div className="end-message">No more feeds to load</div>
      )}
    </div>
  );
};

export default InfiniteScrollFeeds;
```

#### 3. Advanced Pagination Hook
```jsx
import { useState, useEffect, useCallback } from 'react';

export const usePaginatedFeeds = (userId, initialLimit = 20) => {
  const [feeds, setFeeds] = useState([]);
  const [pagination, setPagination] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const fetchFeeds = useCallback(async (page = 1, limit = initialLimit) => {
    if (!userId) return;
    
    setLoading(true);
    setError(null);

    try {
      const response = await fetch(
        `http://localhost:3000/api/feeds/${userId}?page=${page}&limit=${limit}`
      );
      
      const data = await response.json();
      
      if (data.success) {
        setFeeds(data.feeds);
        setPagination(data.pagination);
      } else {
        setError(data.message);
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [userId, initialLimit]);

  const goToPage = useCallback((page) => {
    fetchFeeds(page, pagination?.limit || initialLimit);
  }, [fetchFeeds, pagination?.limit, initialLimit]);

  const changePageSize = useCallback((newLimit) => {
    fetchFeeds(1, newLimit);
  }, [fetchFeeds]);

  const refresh = useCallback(() => {
    fetchFeeds(pagination?.currentPage || 1, pagination?.limit || initialLimit);
  }, [fetchFeeds, pagination?.currentPage, pagination?.limit, initialLimit]);

  useEffect(() => {
    fetchFeeds();
  }, [fetchFeeds]);

  return {
    feeds,
    pagination,
    loading,
    error,
    goToPage,
    changePageSize,
    refresh,
    hasNextPage: pagination?.hasNextPage || false,
    hasPreviousPage: pagination?.hasPreviousPage || false,
  };
};
```

### Vanilla JavaScript Implementation

#### 1. Basic Pagination with Vanilla JS
```html
<!DOCTYPE html>
<html>
<head>
    <title>Feed Pagination Example</title>
    <style>
        .feed-item { 
            border: 1px solid #ddd; 
            margin: 10px; 
            padding: 15px; 
            border-radius: 5px; 
        }
        .pagination { 
            display: flex; 
            gap: 10px; 
            align-items: center; 
            margin: 20px 0; 
        }
        .loading { 
            text-align: center; 
            padding: 20px; 
        }
        .error { 
            color: red; 
            text-align: center; 
            padding: 20px; 
        }
    </style>
</head>
<body>
    <div id="app">
        <h1>User Feeds</h1>
        <div id="feeds-container"></div>
        <div id="pagination-container"></div>
    </div>

    <script>
        class FeedPagination {
            constructor(userId, containerId, paginationId) {
                this.userId = userId;
                this.container = document.getElementById(containerId);
                this.paginationContainer = document.getElementById(paginationId);
                this.currentPage = 1;
                this.pageSize = 20;
                this.pagination = null;
                
                this.init();
            }

            async init() {
                await this.fetchFeeds();
            }

            async fetchFeeds(page = 1, limit = 20) {
                try {
                    this.showLoading();
                    
                    const response = await fetch(
                        `http://localhost:3000/api/feeds/${this.userId}?page=${page}&limit=${limit}`
                    );
                    
                    const data = await response.json();
                    
                    if (data.success) {
                        this.renderFeeds(data.feeds);
                        this.pagination = data.pagination;
                        this.renderPagination();
                    } else {
                        this.showError(data.message);
                    }
                } catch (error) {
                    this.showError(error.message);
                }
            }

            renderFeeds(feeds) {
                if (feeds.length === 0) {
                    this.container.innerHTML = '<p>No feeds available</p>';
                    return;
                }

                const feedsHTML = feeds.map(feed => `
                    <div class="feed-item">
                        <h3>${feed.title || 'Untitled'}</h3>
                        <p>${feed.content}</p>
                        <div class="feed-meta">
                            <span>Source: ${feed.source || 'Unknown'}</span>
                            <span>Date: ${new Date(feed.timestamp).toLocaleDateString()}</span>
                        </div>
                    </div>
                `).join('');

                this.container.innerHTML = feedsHTML;
            }

            renderPagination() {
                if (!this.pagination) return;

                const { currentPage, totalPages, hasNextPage, hasPreviousPage, totalCount, limit } = this.pagination;

                this.paginationContainer.innerHTML = `
                    <div class="pagination">
                        <button 
                            onclick="feedPagination.goToPage(${currentPage - 1})"
                            ${!hasPreviousPage ? 'disabled' : ''}
                        >
                            Previous
                        </button>
                        
                        <span>Page ${currentPage} of ${totalPages} (${totalCount} total)</span>
                        
                        <button 
                            onclick="feedPagination.goToPage(${currentPage + 1})"
                            ${!hasNextPage ? 'disabled' : ''}
                        >
                            Next
                        </button>
                        
                        <select onchange="feedPagination.changePageSize(this.value)">
                            <option value="10" ${limit === 10 ? 'selected' : ''}>10 per page</option>
                            <option value="20" ${limit === 20 ? 'selected' : ''}>20 per page</option>
                            <option value="50" ${limit === 50 ? 'selected' : ''}>50 per page</option>
                        </select>
                    </div>
                `;
            }

            async goToPage(page) {
                await this.fetchFeeds(page, this.pagination?.limit || 20);
            }

            async changePageSize(newLimit) {
                await this.fetchFeeds(1, parseInt(newLimit));
            }

            showLoading() {
                this.container.innerHTML = '<div class="loading">Loading feeds...</div>';
                this.paginationContainer.innerHTML = '';
            }

            showError(message) {
                this.container.innerHTML = `<div class="error">Error: ${message}</div>`;
                this.paginationContainer.innerHTML = '';
            }
        }

        // Initialize the pagination
        const feedPagination = new FeedPagination(
            '4ed491e3-2efa-4c0b-a4f0-bd5aafa83bb4', 
            'feeds-container', 
            'pagination-container'
        );
    </script>
</body>
</html>
```

### React Native Implementation

#### 1. Feed List with Pagination
```jsx
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  StyleSheet,
  Alert,
} from 'react-native';

const FeedScreen = ({ userId }) => {
  const [feeds, setFeeds] = useState([]);
  const [pagination, setPagination] = useState(null);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const fetchFeeds = async (page = 1, limit = 20, append = false) => {
    if (page === 1) setLoading(true);
    
    try {
      const response = await fetch(
        `http://localhost:3000/api/feeds/${userId}?page=${page}&limit=${limit}`
      );
      
      const data = await response.json();
      
      if (data.success) {
        if (append) {
          setFeeds(prev => [...prev, ...data.feeds]);
        } else {
          setFeeds(data.feeds);
        }
        setPagination(data.pagination);
      } else {
        Alert.alert('Error', data.message);
      }
    } catch (error) {
      Alert.alert('Error', error.message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    if (userId) {
      fetchFeeds();
    }
  }, [userId]);

  const handleLoadMore = () => {
    if (pagination?.hasNextPage && !loading) {
      fetchFeeds(pagination.currentPage + 1, pagination.limit, true);
    }
  };

  const handleRefresh = () => {
    setRefreshing(true);
    fetchFeeds(1, pagination?.limit || 20);
  };

  const renderFeedItem = ({ item }) => (
    <View style={styles.feedItem}>
      <Text style={styles.feedTitle}>{item.title || 'Untitled'}</Text>
      <Text style={styles.feedContent}>{item.content}</Text>
      <View style={styles.feedMeta}>
        <Text style={styles.feedSource}>Source: {item.source || 'Unknown'}</Text>
        <Text style={styles.feedDate}>
          {new Date(item.timestamp).toLocaleDateString()}
        </Text>
      </View>
    </View>
  );

  const renderFooter = () => {
    if (!pagination?.hasNextPage) {
      return (
        <View style={styles.footer}>
          <Text style={styles.footerText}>No more feeds to load</Text>
        </View>
      );
    }

    return (
      <View style={styles.footer}>
        <ActivityIndicator size="small" color="#0000ff" />
        <Text style={styles.footerText}>Loading more...</Text>
      </View>
    );
  };

  if (loading && feeds.length === 0) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#0000ff" />
        <Text>Loading feeds...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <FlatList
        data={feeds}
        renderItem={renderFeedItem}
        keyExtractor={(item) => item.feedId}
        onEndReached={handleLoadMore}
        onEndReachedThreshold={0.5}
        refreshing={refreshing}
        onRefresh={handleRefresh}
        ListFooterComponent={renderFooter}
        showsVerticalScrollIndicator={false}
      />
      
      {pagination && (
        <View style={styles.paginationInfo}>
          <Text style={styles.paginationText}>
            Page {pagination.currentPage} of {pagination.totalPages} 
            ({pagination.totalCount} total feeds)
          </Text>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  feedItem: {
    backgroundColor: 'white',
    margin: 10,
    padding: 15,
    borderRadius: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  feedTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  feedContent: {
    fontSize: 16,
    marginBottom: 10,
    lineHeight: 22,
  },
  feedMeta: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  feedSource: {
    fontSize: 12,
    color: '#666',
  },
  feedDate: {
    fontSize: 12,
    color: '#666',
  },
  footer: {
    padding: 20,
    alignItems: 'center',
  },
  footerText: {
    marginTop: 10,
    fontSize: 14,
    color: '#666',
  },
  paginationInfo: {
    padding: 10,
    backgroundColor: 'white',
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: '#eee',
  },
  paginationText: {
    fontSize: 12,
    color: '#666',
  },
});

export default FeedScreen;
```

## Testing Integration

### Test Your Integration
```javascript
// Test function to verify API connectivity
const testApiIntegration = async () => {
  try {
    // Test health check
    const healthResponse = await fetch('http://localhost:3000/');
    const healthData = await healthResponse.json();
    console.log('✅ Health check:', healthData.message);
    
    // Test user feeds with pagination
    const feedsResponse = await fetch(
      'http://localhost:3000/api/feeds/4ed491e3-2efa-4c0b-a4f0-bd5aafa83bb4?limit=5'
    );
    const feedsData = await feedsResponse.json();
    
    if (feedsData.success) {
      console.log('✅ Feeds API working');
      console.log(`📊 Pagination: ${feedsData.pagination.currentPage}/${feedsData.pagination.totalPages}`);
      console.log(`📝 ${feedsData.feeds.length} feeds loaded`);
    } else {
      console.error('❌ Feeds API error:', feedsData.message);
    }
  } catch (error) {
    console.error('❌ Integration test failed:', error.message);
  }
};

// Run the test
testApiIntegration();
```

## Error Handling Best Practices

### 1. Comprehensive Error Handler
```javascript
const handleApiError = (error, response = null) => {
  console.error('API Error:', error);
  
  // Network errors
  if (!response) {
    return {
      type: 'network',
      message: 'Unable to connect to the server. Please check your internet connection.',
      userMessage: 'Connection error. Please try again.'
    };
  }
  
  // HTTP status errors
  switch (response.status) {
    case 400:
      return {
        type: 'validation',
        message: 'Invalid request parameters',
        userMessage: 'Please check your request and try again.'
      };
    case 500:
      return {
        type: 'server',
        message: 'Server error occurred',
        userMessage: 'Something went wrong. Please try again later.'
      };
    default:
      return {
        type: 'unknown',
        message: `HTTP ${response.status}`,
        userMessage: 'An unexpected error occurred.'
      };
  }
};
```

### 2. Retry Logic for Pagination
```javascript
const fetchWithRetry = async (url, options = {}, maxRetries = 3) => {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      const response = await fetch(url, options);
      
      if (response.ok) {
        return await response.json();
      }
      
      if (response.status >= 400 && response.status < 500) {
        // Client error, don't retry
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      
      if (attempt === maxRetries) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      
      // Wait before retry (exponential backoff)
      await new Promise(resolve => setTimeout(resolve, Math.pow(2, attempt) * 1000));
      
    } catch (error) {
      if (attempt === maxRetries) {
        throw error;
      }
      
      // Wait before retry
      await new Promise(resolve => setTimeout(resolve, Math.pow(2, attempt) * 1000));
    }
  }
};
```

## Performance Optimization Tips

### 1. Efficient Pagination Strategies
```javascript
// Strategy 1: Cache pagination metadata
const paginationCache = new Map();

const getCachedPagination = (userId, page, limit) => {
  const key = `${userId}-${page}-${limit}`;
  return paginationCache.get(key);
};

const setCachedPagination = (userId, page, limit, data) => {
  const key = `${userId}-${page}-${limit}`;
  paginationCache.set(key, { ...data, timestamp: Date.now() });
};

// Strategy 2: Preload next page
const preloadNextPage = async (userId, currentPage, limit) => {
  const nextPage = currentPage + 1;
  try {
    await fetch(`http://localhost:3000/api/feeds/${userId}?page=${nextPage}&limit=${limit}`);
  } catch (error) {
    // Silent fail for preloading
    console.log('Preload failed:', error.message);
  }
};

// Strategy 3: Virtual scrolling for large datasets
const VirtualizedFeedList = ({ feeds, onLoadMore }) => {
  // Implementation depends on your virtual scrolling library
  // Example with react-window or react-virtualized
};
```

### 2. Optimized Data Fetching
```javascript
// Debounced search with pagination
const useDebouncedFeedSearch = (userId, searchTerm, delay = 300) => {
  const [debouncedTerm, setDebouncedTerm] = useState(searchTerm);

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedTerm(searchTerm);
    }, delay);

    return () => {
      clearTimeout(handler);
    };
  }, [searchTerm, delay]);

  return debouncedTerm;
};
```

## Real-time Updates (Future)

### Preparing for WebSocket Integration
```javascript
// Future WebSocket integration example
const useRealtimeFeeds = (userId) => {
  const [feeds, setFeeds] = useState([]);
  
  useEffect(() => {
    // WebSocket connection (future implementation)
    const ws = new WebSocket(`ws://localhost:3000/feeds/${userId}`);
    
    ws.onmessage = (event) => {
      const newFeed = JSON.parse(event.data);
      setFeeds(prev => [newFeed, ...prev]);
    };
    
    return () => ws.close();
  }, [userId]);
  
  return feeds;
};
```

## Development Tips

### 1. Environment Configuration
```javascript
// config.js
const config = {
  development: {
    apiUrl: 'http://localhost:3000',
    timeout: 10000,
    retries: 3
  },
  production: {
    apiUrl: 'https://your-api.com',
    timeout: 5000,
    retries: 2
  }
};

export default config[process.env.NODE_ENV || 'development'];
```

### 2. API Client Class
```javascript
class ApiClient {
  constructor(baseUrl) {
    this.baseUrl = baseUrl;
  }

  async request(endpoint, options = {}) {
    const url = `${this.baseUrl}${endpoint}`;
    const response = await fetch(url, {
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
      ...options,
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    return response.json();
  }

  async getUserFeeds(userId, page = 1, limit = 20) {
    return this.request(`/api/feeds/${userId}?page=${page}&limit=${limit}`);
  }

  async getAllFeeds(page = 1, limit = 20) {
    return this.request(`/api/feeds?page=${page}&limit=${limit}`);
  }

  async healthCheck() {
    return this.request('/');
  }
}

// Usage
const apiClient = new ApiClient('http://localhost:3000');
```

## Support and Resources

### 🔗 Useful Links
- **API Documentation**: http://localhost:3000/api-docs
- **GitHub Repository**: https://github.com/your-org/blue-collar-backend
- **Issue Tracker**: https://github.com/your-org/blue-collar-backend/issues

### 💬 Getting Help
- **Technical Support**: support@bluecollarapi.com
- **Community Discord**: [Join our Discord](#)
- **Stack Overflow**: Tag your questions with `blue-collar-api`

### 📚 Additional Resources
- [React Query Documentation](https://react-query.tanstack.com/)
- [React Native FlatList Guide](https://reactnative.dev/docs/flatlist)
- [Intersection Observer API](https://developer.mozilla.org/en-US/docs/Web/API/Intersection_Observer_API)

---

**Happy coding! 🚀**  
*This guide is updated regularly. Check back for new examples and best practices.* 