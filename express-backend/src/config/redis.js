const IORedis = require('ioredis');
require('dotenv').config();

const createRedisConnection = () => {
  const redisUrl = process.env.REDIS_URL || 'redis://127.0.0.1:6379';

  const connection = new IORedis(redisUrl, {
    maxRetriesPerRequest: null, // Required by BullMQ
    retryStrategy(times) {
      // In development or when Redis is offline, fail gracefully after 3 attempts instead of retrying indefinitely
      const isProd = process.env.NODE_ENV === 'production' || process.env.ENVIRONMENT === 'production';
      const maxRetries = isProd ? 10 : 3;
      
      if (times >= maxRetries) {
        console.warn(`⚠️ [Redis Warning] Could not connect to Redis at ${redisUrl} after ${times} attempts. Stopping automatic retries. Background queue processing will be unavailable.`);
        return null; // Return null to stop further retries and allow Express to continue running without crashing
      }
      return Math.min(times * 200, 2000);
    }
  });

  // Attach error listener to prevent unhandled EventEmitter error crashes in Node.js when Redis is offline
  connection.on('error', (err) => {
    if (err.code === 'ECONNREFUSED' || err.code === 'ENOTFOUND' || err.code === 'ERR_CANCELED') {
      // Silently handle connection errors; retryStrategy already reports the warning
    } else {
      console.error('[Redis Connection Error]', err.message);
    }
  });

  return connection;
};

module.exports = { createRedisConnection };
