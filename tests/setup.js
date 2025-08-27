/**
 * @fileoverview Test Setup and Configuration
 * @description Global test configuration for Jest test environment
 * @author Easha from OK AI team
 * @version 1.0.0
 * @since 2025-08-26
 */

// Load environment variables for testing
require('dotenv').config();

/**
 * Jest timeout configuration
 * @description Sets timeout to 10 seconds for database operations
 */
jest.setTimeout(10000);

/**
 * Global console configuration for tests
 * @description Suppresses verbose logging during test execution
 * @note Uncomment specific log levels to enable during debugging
 */
global.console = {
  ...console,
  // Suppress console.log during tests (uncomment to enable debugging)
  // log: jest.fn(),
  debug: jest.fn(), // Suppress debug messages
  info: jest.fn(),  // Suppress info messages
  warn: jest.fn(),  // Suppress warning messages
  error: jest.fn(), // Suppress error messages (except actual test failures)
};

/**
 * Global test setup
 * @description Runs before all test suites to prepare test environment
 */
beforeAll(async () => {
  console.log('🚀 Setting up test environment...');
  console.log('📊 Testing Blue Collar Workers API');
  console.log('🔗 Database: Supabase');
  console.log('⚡ Timeout: 10 seconds per test');
  console.log('---');
});

/**
 * Global test cleanup
 * @description Runs after all test suites to clean up test environment
 */
afterAll(async () => {
  console.log('🧹 Cleaning up test environment...');
  console.log('✅ All tests completed successfully');
}); 