import { handler } from './netlify/functions/api.js';

// Test 1: GET /api/dashboard (should work without auth if NO_AUTH is set)
console.log('=== TEST 1: GET /api/dashboard ===');
const event1 = {
    httpMethod: 'GET',
    path: '/api/dashboard',
    headers: { 'content-type': 'application/json' },
    queryStringParameters: {},
    body: null
};

try {
    const r = await handler(event1, {});
    console.log('STATUS:', r.statusCode);
    if (r.body) {
        const body = JSON.parse(r.body);
        console.log('BODY:', JSON.stringify(body).substring(0, 500));
    }
} catch (e) {
    console.error('CRASH:', e.message);
    if (e.stack) console.error(e.stack.substring(0, 800));
}

// Test 2: GET /api/companies (should work without auth)
console.log('\n=== TEST 2: GET /api/companies ===');
const event2 = {
    httpMethod: 'GET',
    path: '/api/companies',
    headers: { 'content-type': 'application/json' },
    queryStringParameters: {},
    body: null
};

try {
    const r = await handler(event2, {});
    console.log('STATUS:', r.statusCode);
    if (r.body) {
        const body = JSON.parse(r.body);
        console.log('BODY:', JSON.stringify(body).substring(0, 500));
    }
} catch (e) {
    console.error('CRASH:', e.message);
    if (e.stack) console.error(e.stack.substring(0, 800));
}

// Test 3: POST /api/companies (should work without auth)
console.log('\n=== TEST 3: POST /api/companies ===');
const event3 = {
    httpMethod: 'POST',
    path: '/api/companies',
    headers: { 'content-type': 'application/json' },
    queryStringParameters: {},
    body: JSON.stringify({ name: 'TestCo', industry: 'Telecom', website: 'https://testco.com' })
};

try {
    const r = await handler(event3, {});
    console.log('STATUS:', r.statusCode);
    if (r.body) {
        const body = JSON.parse(r.body);
        console.log('BODY:', JSON.stringify(body).substring(0, 500));
    }
} catch (e) {
    console.error('CRASH:', e.message);
    if (e.stack) console.error(e.stack.substring(0, 800));
}
