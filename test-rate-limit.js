#!/usr/bin/env node

/**
 * Test script to verify global rate limiting
 * This will make multiple requests to the chat API to test our rate limiting
 */

const makeRequest = async (requestNumber) => {
  const startTime = Date.now();

  try {
    console.log(`\n🚀 Making request ${requestNumber} at ${new Date().toISOString()}`);

    const response = await fetch('http://localhost:3000/api/chat', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        // Add a dummy authorization header for testing
        'Cookie': 'next-auth.session-token=dummy-token-for-testing'
      },
      body: JSON.stringify({
        messages: [
          {
            id: `test-${requestNumber}`,
            role: 'user',
            content: `Test message ${requestNumber} - what is 2+2?`
          }
        ],
        chatId: `test-chat-${requestNumber}`,
        isNewChat: true
      })
    });

    const endTime = Date.now();
    const duration = endTime - startTime;

    console.log(`📊 Request ${requestNumber} completed:`);
    console.log(`   Status: ${response.status} ${response.statusText}`);
    console.log(`   Duration: ${duration}ms`);

    // Log rate limit headers if present
    const rateLimitHeaders = {};
    for (const [key, value] of response.headers.entries()) {
      if (key.toLowerCase().includes('rate-limit')) {
        rateLimitHeaders[key] = value;
      }
    }

    if (Object.keys(rateLimitHeaders).length > 0) {
      console.log(`   Rate Limit Headers:`, rateLimitHeaders);
    }

    if (!response.ok) {
      const errorText = await response.text();
      console.log(`   Error Response: ${errorText}`);
    }

    return {
      requestNumber,
      status: response.status,
      duration,
      rateLimitHeaders,
      success: response.ok
    };

  } catch (error) {
    const endTime = Date.now();
    const duration = endTime - startTime;

    console.log(`❌ Request ${requestNumber} failed:`);
    console.log(`   Error: ${error.message}`);
    console.log(`   Duration: ${duration}ms`);

    return {
      requestNumber,
      status: 'ERROR',
      duration,
      error: error.message,
      success: false
    };
  }
};

const testRateLimit = async () => {
  console.log('🧪 Testing Global Rate Limiting');
  console.log('Configuration: 1 request per 5 seconds');
  console.log('Expected behavior: First request succeeds, second request waits ~5 seconds');
  console.log('=' .repeat(80));

  const results = [];

  // Make 3 requests in quick succession
  for (let i = 1; i <= 3; i++) {
    const result = await makeRequest(i);
    results.push(result);

    // Small delay between requests to avoid overwhelming the server
    if (i < 3) {
      await new Promise(resolve => setTimeout(resolve, 100));
    }
  }

  console.log('\n📈 Summary:');
  console.log('=' .repeat(80));

  results.forEach(result => {
    const statusIcon = result.success ? '✅' : '❌';
    console.log(`${statusIcon} Request ${result.requestNumber}: ${result.status} (${result.duration}ms)`);
  });

  // Check if rate limiting worked
  const longDurationRequests = results.filter(r => r.duration > 4000);

  console.log('\n🔍 Analysis:');
  if (longDurationRequests.length > 0) {
    console.log('✅ Rate limiting appears to be working!');
    console.log(`   Found ${longDurationRequests.length} request(s) with duration > 4 seconds`);
    longDurationRequests.forEach(r => {
      console.log(`   - Request ${r.requestNumber}: ${r.duration}ms`);
    });
  } else {
    console.log('⚠️  Rate limiting may not be working as expected');
    console.log('   All requests completed quickly (< 4 seconds)');
  }
};

// Run the test
testRateLimit().catch(console.error);
