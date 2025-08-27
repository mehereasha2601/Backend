/**
 * @fileoverview Blue Collar Workers API - Server entry point
 * @description Starts the Express server and handles graceful shutdown
 * @author Easha from OK AI team
 * @version 1.0.0
 * @since 2025-08-26
 */

// Import the Express application
const app = require('./app');

/**
 * Server configuration
 * @constant {number} PORT - Server port from environment or default 3000
 */
const PORT = process.env.PORT || 3000;

/**
 * Start the HTTP server
 * @description Starts the Express server on the specified port with logging
 */
const server = app.listen(PORT, () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
  console.log(`📰 News Feed API: http://localhost:${PORT}/api/feeds/:userId`);
  console.log(`📊 Health Check: http://localhost:${PORT}/`);
  console.log(`🧪 Run tests: npm test`);
  console.log('---');
  console.log('✅ Server started successfully');
});

/**
 * Graceful shutdown handling
 * @description Handles SIGTERM and SIGINT signals for clean server shutdown
 */
const gracefulShutdown = (signal) => {
  console.log(`\n🛑 Received ${signal}. Starting graceful shutdown...`);
  
  server.close((err) => {
    if (err) {
      console.error('❌ Error during server shutdown:', err);
      process.exit(1);
    }
    
    console.log('✅ Server closed successfully');
    console.log('👋 Goodbye!');
    process.exit(0);
  });
  
  // Force close after 10 seconds
  setTimeout(() => {
    console.error('⏰ Forced shutdown after timeout');
    process.exit(1);
  }, 10000);
};

// Listen for shutdown signals
process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

/**
 * Handle uncaught exceptions
 * @description Logs uncaught exceptions and exits gracefully
 */
process.on('uncaughtException', (err) => {
  console.error('💥 Uncaught Exception:', err);
  console.error('Stack:', err.stack);
  process.exit(1);
});

/**
 * Handle unhandled promise rejections
 * @description Logs unhandled promise rejections and exits gracefully
 */
process.on('unhandledRejection', (reason, promise) => {
  console.error('💥 Unhandled Rejection at:', promise);
  console.error('Reason:', reason);
  process.exit(1);
}); 