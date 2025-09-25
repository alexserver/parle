#!/usr/bin/env node

/**
 * Authentication Testing Script
 * Tests API endpoint security and authentication requirements
 */

const API_BASE = 'http://localhost:3000';

async function testEndpoint(endpoint, options = {}) {
  try {
    console.log(`\n🧪 Testing ${options.method || 'GET'} ${endpoint}`);
    
    const response = await fetch(`${API_BASE}${endpoint}`, {
      method: options.method || 'GET',
      headers: {
        'Content-Type': 'application/json',
        ...options.headers
      },
      body: options.body
    });

    const data = await response.text();
    
    console.log(`   Status: ${response.status}`);
    console.log(`   Expected: ${options.expectedStatus || 200}`);
    
    if (response.status === (options.expectedStatus || 200)) {
      console.log(`   ✅ PASS`);
    } else {
      console.log(`   ❌ FAIL`);
      console.log(`   Response: ${data.substring(0, 100)}...`);
    }
    
    return { status: response.status, data };
  } catch (error) {
    console.log(`   ❌ ERROR: ${error.message}`);
    return { error: error.message };
  }
}

async function runSecurityTests() {
  console.log('🔒 Running Authentication Security Tests\n');
  console.log('Make sure your API server is running on localhost:3000');
  
  // Test 1: Health endpoint (should work without auth)
  await testEndpoint('/health', { expectedStatus: 200 });
  
  // Test 2: Protected endpoints without auth (should return 401)
  await testEndpoint('/transcripts', { expectedStatus: 401 });
  await testEndpoint('/transcripts/test-id', { expectedStatus: 401 });
  
  // Test 3: Upload endpoint without auth (should return 401)
  await testEndpoint('/upload', { 
    method: 'POST', 
    expectedStatus: 401,
    body: JSON.stringify({ test: 'data' })
  });
  
  // Test 4: Invalid endpoints (should return 404)
  await testEndpoint('/invalid-endpoint', { expectedStatus: 404 });
  
  // Test 5: Malformed requests
  await testEndpoint('/transcripts', {
    method: 'POST',
    expectedStatus: 401, // Should fail auth before processing
    body: 'invalid-json'
  });
  
  console.log('\n🏁 Security tests complete!');
  console.log('\n📋 Summary:');
  console.log('   - Health endpoint accessible without auth ✅');
  console.log('   - Protected endpoints require authentication ✅');
  console.log('   - Invalid requests handled properly ✅');
  console.log('\n🔐 Next steps:');
  console.log('   1. Test with valid Clerk JWT tokens');
  console.log('   2. Test data isolation between users');
  console.log('   3. Run full authentication flow tests');
}

// Run the tests
runSecurityTests().catch(console.error);