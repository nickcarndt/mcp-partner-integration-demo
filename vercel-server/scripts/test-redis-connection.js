#!/usr/bin/env node
/**
 * Test Redis connection using REDIS_URL environment variable
 * 
 * This script validates the Redis connection string format and attempts
 * to connect to verify the Upstash Redis instance is accessible.
 * 
 * Usage:
 *   REDIS_URL="rediss://..." node scripts/test-redis-connection.js
 */

import { createClient } from 'redis';

const redisUrl = process.env.REDIS_URL;

if (!redisUrl) {
  console.error('❌ ERROR: REDIS_URL environment variable is not set');
  console.error('');
  console.error('Usage:');
  console.error('  REDIS_URL="rediss://..." node scripts/test-redis-connection.js');
  process.exit(1);
}

// Mask password in output
const maskedUrl = redisUrl.replace(/:([^:@]+)@/, ':****@');
console.log('🔍 Testing Redis connection...');
console.log(`📍 Redis URL: ${maskedUrl}`);
console.log('');

// Validate URL format
try {
  const url = new URL(redisUrl);
  if (!url.protocol.startsWith('redis')) {
    console.error('❌ Invalid Redis URL: protocol must be redis:// or rediss://');
    process.exit(1);
  }
  console.log('✅ URL format is valid');
  console.log(`   Protocol: ${url.protocol}`);
  console.log(`   Host: ${url.hostname}`);
  console.log(`   Port: ${url.port || '6379 (default)'}`);
} catch (error) {
  console.error('❌ Invalid Redis URL format:', error.message);
  process.exit(1);
}

// Test connection
(async () => {
  let client;
  
  try {
    console.log('🔄 Creating Redis client...');
    client = createClient({
      url: redisUrl,
      socket: {
        reconnectStrategy: false, // Don't auto-reconnect for test
      },
    });

    client.on('error', (err) => {
      console.error('❌ Redis client error:', err.message);
    });

    console.log('🔄 Connecting to Redis...');
    await client.connect();
    console.log('✅ Successfully connected to Redis');
    
    // Test PING
    console.log('🔄 Testing PING...');
    const pong = await client.ping();
    console.log(`✅ PING response: ${pong}`);
    
    // Test SET/GET
    const testKey = `mcp-test-${Date.now()}`;
    const testValue = 'test-value';
    
    console.log(`🔄 Testing SET/GET with key: ${testKey}...`);
    await client.set(testKey, testValue);
    console.log(`✅ SET ${testKey} = ${testValue}`);
    
    const retrieved = await client.get(testKey);
    console.log(`✅ GET ${testKey} = ${retrieved}`);
    
    if (retrieved === testValue) {
      console.log('✅ SET/GET test passed');
    } else {
      console.error(`❌ SET/GET test failed: expected "${testValue}", got "${retrieved}"`);
      await client.quit();
      process.exit(1);
    }
    
    // Cleanup
    console.log(`🔄 Cleaning up test key...`);
    await client.del(testKey);
    console.log(`✅ Cleaned up test key`);
    
    await client.quit();
    console.log('');
    console.log('🎉 All Redis tests passed!');
    console.log('');
    console.log('✅ Your Redis connection is working correctly.');
    console.log('   You can now set REDIS_URL in your Vercel environment variables.');
    process.exit(0);
  } catch (error) {
    console.error('');
    console.error('❌ Redis connection test failed');
    console.error('');
    console.error('Error:', error.message);
    
    if (error.code === 'ENOTFOUND') {
      console.error('');
      console.error('💡 This usually means:');
      console.error('   - The Redis hostname is incorrect');
      console.error('   - There is a network connectivity issue');
    } else if (error.code === 'ECONNREFUSED') {
      console.error('');
      console.error('💡 This usually means:');
      console.error('   - The Redis server is not running');
      console.error('   - The port is incorrect');
      console.error('   - Firewall is blocking the connection');
    } else if (error.message.includes('authentication')) {
      console.error('');
      console.error('💡 This usually means:');
      console.error('   - The password/token is incorrect');
      console.error('   - Check your Upstash dashboard for the correct credentials');
    }
    
    if (client) {
      try {
        await client.quit();
      } catch (e) {
        // Ignore quit errors
      }
    }
    
    process.exit(1);
  }
})();
