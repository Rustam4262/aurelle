# Load Testing Guide - k6

**Project**: AURELLE Beauty Salon Platform
**Date**: January 10, 2026
**Task**: P2 #41 - Load Testing
**Framework**: k6 (Grafana)
**Version**: 1.0.0

---

## Table of Contents

1. [Overview](#overview)
2. [Why k6?](#why-k6)
3. [Installation & Setup](#installation--setup)
4. [Load Test Scenarios](#load-test-scenarios)
5. [Metrics & Thresholds](#metrics--thresholds)
6. [Test Execution](#test-execution)
7. [Results Analysis](#results-analysis)
8. [Performance Bottlenecks](#performance-bottlenecks)
9. [Optimization Recommendations](#optimization-recommendations)
10. [CI/CD Integration](#cicd-integration)

---

## Overview

This guide provides comprehensive load testing documentation for the AURELLE platform using **k6**, a modern open-source load testing tool built for developers.

### Testing Goals

1. **Verify** platform can handle **100+ concurrent users**
2. **Measure** response times under load (P50, P95, P99)
3. **Identify** error rates and failure points
4. **Measure** throughput (requests/second)
5. **Monitor** database load and resource usage
6. **Find** performance bottlenecks
7. **Document** results and recommendations

### Test Scenarios

| Scenario | Virtual Users | Duration | Target Endpoint | Expected Load |
|----------|---------------|----------|-----------------|---------------|
| **1. Homepage Load** | 100 concurrent | 5 min | `/` (main page) | ~1,500 req/min |
| **2. Salon Search** | 200 concurrent | 5 min | `/api/salons` | ~3,000 req/min |
| **3. Booking Flow** | 50 concurrent | 10 min | `/api/bookings` | ~300 bookings/min |

---

## Why k6?

### k6 vs Artillery Comparison

| Feature | k6 | Artillery | Winner |
|---------|----|-----------| -------|
| **Performance** | Written in Go, very fast | Node.js, slower | ✅ k6 |
| **Script Language** | JavaScript (ES6+) | JavaScript/YAML | 🤝 Tie |
| **Developer Experience** | Excellent, clean API | Good, but verbose | ✅ k6 |
| **Metrics** | Built-in, detailed | Good, extensible | ✅ k6 |
| **CI/CD Integration** | Excellent | Good | ✅ k6 |
| **Cloud Support** | k6 Cloud (paid) | Artillery Cloud (paid) | 🤝 Tie |
| **Local Performance** | Lightweight, fast | Heavier, slower | ✅ k6 |
| **Community** | Large, active | Smaller | ✅ k6 |
| **Documentation** | Excellent | Good | ✅ k6 |
| **Open Source** | ✅ Yes | ✅ Yes | 🤝 Tie |

**Decision**: **k6** is the better choice for AURELLE due to:
- ✅ Superior performance (Go vs Node.js)
- ✅ Better developer experience
- ✅ More detailed built-in metrics
- ✅ Lightweight and fast local execution
- ✅ Excellent CI/CD integration

---

## Installation & Setup

### Prerequisites

- **Node.js** 18+ (for API server)
- **PostgreSQL** 16+ (for database)
- **k6** (load testing tool)

---

### Step 1: Install k6

#### macOS (Homebrew)
```bash
brew install k6
```

#### Linux (Debian/Ubuntu)
```bash
sudo gpg -k
sudo gpg --no-default-keyring --keyring /usr/share/keyrings/k6-archive-keyring.gpg --keyserver hkp://keyserver.ubuntu.com:80 --recv-keys C5AD17C747E3415A3642D57D77C6C491D6AC1D69
echo "deb [signed-by=/usr/share/keyrings/k6-archive-keyring.gpg] https://dl.k6.io/deb stable main" | sudo tee /etc/apt/sources.list.d/k6.list
sudo apt-get update
sudo apt-get install k6
```

#### Windows (Chocolatey)
```bash
choco install k6
```

#### Windows (Scoop)
```bash
scoop install k6
```

#### Docker
```bash
docker pull grafana/k6:latest
```

#### Verify Installation
```bash
k6 version
# Expected output: k6 v0.48.0 (2024-11-12)
```

---

### Step 2: Project Structure

Create load testing directory:

```bash
mkdir -p load-tests
cd load-tests

# Directory structure
load-tests/
├── scenarios/
│   ├── homepage-load.js         # Scenario 1: Homepage load
│   ├── salon-search.js          # Scenario 2: Salon search API
│   ├── booking-flow.js          # Scenario 3: Complete booking
│   └── utils/
│       ├── auth.js              # Authentication helpers
│       ├── config.js            # Configuration
│       └── helpers.js           # Utility functions
├── results/
│   ├── homepage-load-results.json
│   ├── salon-search-results.json
│   └── booking-flow-results.json
├── scripts/
│   ├── run-all-tests.sh         # Run all scenarios
│   └── analyze-results.sh       # Analyze test results
└── README.md
```

---

### Step 3: Configuration File

Create `load-tests/scenarios/utils/config.js`:

```javascript
// k6 Load Testing Configuration
export const config = {
  // Base URL
  baseUrl: __ENV.BASE_URL || 'http://localhost:5000',
  apiBase: __ENV.API_BASE || 'http://localhost:5000/api',

  // Test users
  testUsers: [
    {
      email: 'loadtest1@example.com',
      password: 'LoadTest123!',
    },
    {
      email: 'loadtest2@example.com',
      password: 'LoadTest123!',
    },
    {
      email: 'loadtest3@example.com',
      password: 'LoadTest123!',
    },
  ],

  // Test data
  testSalonId: __ENV.TEST_SALON_ID || 'salon_001',
  testMasterId: __ENV.TEST_MASTER_ID || 'master_001',
  testServiceId: __ENV.TEST_SERVICE_ID || 'service_001',

  // Performance thresholds
  thresholds: {
    // 95% of requests should complete within 500ms
    http_req_duration: ['p(95)<500'],
    // 99% of requests should complete within 1000ms
    'http_req_duration{type:api}': ['p(99)<1000'],
    // Error rate should be below 1%
    http_req_failed: ['rate<0.01'],
    // 95% of requests should start within 100ms
    http_req_waiting: ['p(95)<100'],
  },

  // Rate limiting
  rps: 100, // Max requests per second
};

export default config;
```

---

## Load Test Scenarios

### Scenario 1: Homepage Load Test

**Goal**: Test homepage rendering under 100 concurrent users

**File**: `load-tests/scenarios/homepage-load.js`

```javascript
import http from 'k6/http';
import { check, sleep } from 'k6';
import { Rate, Trend, Counter } from 'k6/metrics';
import config from './utils/config.js';

// Custom metrics
const errorRate = new Rate('errors');
const pageLoadTime = new Trend('page_load_time');
const requestCounter = new Counter('requests_total');

// Test configuration
export const options = {
  // Stages: Ramp up, sustain, ramp down
  stages: [
    { duration: '1m', target: 20 },   // Ramp up to 20 users over 1 minute
    { duration: '2m', target: 100 },  // Ramp up to 100 users over 2 minutes
    { duration: '3m', target: 100 },  // Stay at 100 users for 3 minutes
    { duration: '1m', target: 50 },   // Ramp down to 50 users over 1 minute
    { duration: '1m', target: 0 },    // Ramp down to 0 users over 1 minute
  ],

  // Thresholds (pass/fail criteria)
  thresholds: {
    errors: ['rate<0.01'], // Error rate must be less than 1%
    http_req_duration: ['p(95)<1000'], // 95% of requests under 1s
    http_req_duration: ['p(99)<2000'], // 99% of requests under 2s
    page_load_time: ['p(95)<1500'], // 95% of page loads under 1.5s
  },

  // Test metadata
  tags: {
    test_name: 'homepage_load_test',
    environment: __ENV.ENVIRONMENT || 'development',
  },
};

// Main test function
export default function () {
  // Record start time
  const startTime = Date.now();

  // Request homepage
  const response = http.get(config.baseUrl, {
    tags: { name: 'homepage' },
  });

  // Record metrics
  const loadTime = Date.now() - startTime;
  pageLoadTime.add(loadTime);
  requestCounter.add(1);

  // Assertions
  const checkResult = check(response, {
    'status is 200': (r) => r.status === 200,
    'page contains AURELLE': (r) => r.body.includes('AURELLE'),
    'response time < 2s': (r) => r.timings.duration < 2000,
  });

  // Track errors
  errorRate.add(!checkResult);

  // Random think time (user reading page)
  sleep(Math.random() * 3 + 2); // 2-5 seconds
}

// Teardown function (runs once at end)
export function teardown(data) {
  console.log('Homepage load test completed');
}
```

**Expected Behavior**:
- Gradually ramp up from 0 → 100 users over 3 minutes
- Sustain 100 concurrent users for 3 minutes
- Measure homepage response times
- Verify error rate < 1%

---

### Scenario 2: Salon Search API Load Test

**Goal**: Test `/api/salons` endpoint with 200 concurrent users

**File**: `load-tests/scenarios/salon-search.js`

```javascript
import http from 'k6/http';
import { check, sleep } from 'k6';
import { Rate, Trend, Counter } from 'k6/metrics';
import config from './utils/config.js';

// Custom metrics
const errorRate = new Rate('api_errors');
const apiResponseTime = new Trend('api_response_time');
const salonsReturned = new Trend('salons_count');
const throughput = new Counter('api_requests');

// Test configuration
export const options = {
  stages: [
    { duration: '1m', target: 50 },   // Ramp up to 50 users
    { duration: '2m', target: 200 },  // Ramp up to 200 users
    { duration: '3m', target: 200 },  // Sustain 200 users
    { duration: '1m', target: 0 },    // Ramp down
  ],

  thresholds: {
    api_errors: ['rate<0.01'], // Error rate < 1%
    http_req_duration: ['p(95)<500', 'p(99)<1000'], // Response time targets
    api_response_time: ['avg<300', 'p(95)<500'], // API-specific targets
    'http_req_duration{endpoint:/api/salons}': ['p(95)<400'],
  },

  tags: {
    test_name: 'salon_search_api_test',
  },
};

export default function () {
  const scenarios = [
    // Scenario A: Get all salons (no filters)
    {
      url: `${config.apiBase}/salons`,
      params: {},
      weight: 40, // 40% of requests
    },
    // Scenario B: Search by city
    {
      url: `${config.apiBase}/salons`,
      params: { city: 'Tashkent' },
      weight: 30, // 30% of requests
    },
    // Scenario C: Search by bounding box (map view)
    {
      url: `${config.apiBase}/salons`,
      params: {
        minLat: 41.25,
        maxLat: 41.35,
        minLng: 69.20,
        maxLng: 69.30,
      },
      weight: 20, // 20% of requests
    },
    // Scenario D: Get single salon details
    {
      url: `${config.apiBase}/salons/${config.testSalonId}`,
      params: {},
      weight: 10, // 10% of requests
    },
  ];

  // Weighted random selection
  const random = Math.random() * 100;
  let cumulativeWeight = 0;
  let selectedScenario = scenarios[0];

  for (const scenario of scenarios) {
    cumulativeWeight += scenario.weight;
    if (random <= cumulativeWeight) {
      selectedScenario = scenario;
      break;
    }
  }

  // Build URL with query params
  let url = selectedScenario.url;
  if (Object.keys(selectedScenario.params).length > 0) {
    const params = new URLSearchParams(selectedScenario.params);
    url += `?${params.toString()}`;
  }

  // Execute request
  const startTime = Date.now();
  const response = http.get(url, {
    tags: { endpoint: '/api/salons', scenario: selectedScenario.url },
  });

  const responseTime = Date.now() - startTime;
  apiResponseTime.add(responseTime);
  throughput.add(1);

  // Assertions
  const checkResult = check(response, {
    'status is 200': (r) => r.status === 200,
    'response is JSON': (r) => r.headers['Content-Type']?.includes('application/json'),
    'response has data': (r) => r.json().length !== undefined || r.json().id !== undefined,
    'response time < 1s': (r) => r.timings.duration < 1000,
  });

  errorRate.add(!checkResult);

  // Track salon count
  if (response.status === 200) {
    const data = response.json();
    if (Array.isArray(data)) {
      salonsReturned.add(data.length);
    }
  }

  // Think time
  sleep(Math.random() * 2 + 0.5); // 0.5-2.5 seconds
}

export function handleSummary(data) {
  return {
    'results/salon-search-results.json': JSON.stringify(data, null, 2),
    stdout: textSummary(data, { indent: ' ', enableColors: true }),
  };
}
```

**Expected Behavior**:
- 200 concurrent users searching for salons
- Mix of different search patterns (all, city, map, detail)
- ~3,000 requests per minute at peak
- Response time P95 < 500ms

---

### Scenario 3: Booking Flow Load Test

**Goal**: Test complete booking creation flow with 50 concurrent users

**File**: `load-tests/scenarios/booking-flow.js`

```javascript
import http from 'k6/http';
import { check, sleep, group } from 'k6';
import { Rate, Trend, Counter } from 'k6/metrics';
import config from './utils/config.js';
import { login, getAuthToken } from './utils/auth.js';

// Custom metrics
const bookingErrors = new Rate('booking_errors');
const bookingDuration = new Trend('booking_complete_duration');
const bookingsCreated = new Counter('bookings_created');
const bookingsFailed = new Counter('bookings_failed');

export const options = {
  stages: [
    { duration: '2m', target: 10 },  // Warm up
    { duration: '3m', target: 50 },  // Ramp to 50 users
    { duration: '5m', target: 50 },  // Sustain 50 users
    { duration: '2m', target: 0 },   // Ramp down
  ],

  thresholds: {
    booking_errors: ['rate<0.05'], // Booking error rate < 5%
    'http_req_duration{operation:create_booking}': ['p(95)<2000', 'p(99)<3000'],
    booking_complete_duration: ['p(95)<5000'], // Complete flow < 5s
    checks: ['rate>0.95'], // 95% of checks should pass
  },

  tags: {
    test_name: 'booking_flow_test',
  },
};

// Setup function (runs once at start)
export function setup() {
  // Pre-create test users and get tokens
  const tokens = [];
  for (const user of config.testUsers) {
    const token = login(user.email, user.password);
    if (token) {
      tokens.push(token);
    }
  }
  return { tokens };
}

export default function (data) {
  // Use random token from pool
  const token = data.tokens[Math.floor(Math.random() * data.tokens.length)];

  if (!token) {
    console.error('No auth token available');
    bookingsFailed.add(1);
    return;
  }

  const flowStartTime = Date.now();

  // Group: Complete booking flow
  group('Complete Booking Flow', function () {
    // Step 1: Get salon details
    group('1. View Salon', function () {
      const salonResponse = http.get(
        `${config.apiBase}/salons/${config.testSalonId}`,
        {
          tags: { operation: 'view_salon' },
        }
      );

      check(salonResponse, {
        'salon loaded': (r) => r.status === 200,
        'has services': (r) => r.json().services?.length > 0,
        'has masters': (r) => r.json().masters?.length > 0,
      });

      sleep(1); // User reading salon details
    });

    // Step 2: Check master availability
    group('2. Check Availability', function () {
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      const dateStr = tomorrow.toISOString().split('T')[0];

      const availResponse = http.get(
        `${config.apiBase}/salons/masters/${config.testMasterId}/availability?date=${dateStr}&serviceId=${config.testServiceId}`,
        {
          tags: { operation: 'check_availability' },
        }
      );

      const availCheck = check(availResponse, {
        'availability loaded': (r) => r.status === 200,
        'has slots': (r) => r.json().slots?.length > 0,
        'has available slots': (r) => r.json().availableSlots > 0,
      });

      if (!availCheck) {
        bookingErrors.add(1);
        bookingsFailed.add(1);
        return; // Skip booking creation if no availability
      }

      sleep(2); // User selecting time slot
    });

    // Step 3: Create booking
    group('3. Create Booking', function () {
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      const dateStr = tomorrow.toISOString().split('T')[0];

      const bookingPayload = JSON.stringify({
        salonId: config.testSalonId,
        serviceId: config.testServiceId,
        masterId: config.testMasterId,
        bookingDate: dateStr,
        startTime: '10:00',
        endTime: '11:00',
        notes: 'Load test booking - automated',
      });

      const bookingResponse = http.post(
        `${config.apiBase}/bookings`,
        bookingPayload,
        {
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`,
          },
          tags: { operation: 'create_booking' },
        }
      );

      const bookingCheck = check(bookingResponse, {
        'booking created': (r) => r.status === 201,
        'has booking ID': (r) => r.json().id !== undefined,
        'status is pending/confirmed': (r) =>
          ['pending', 'confirmed'].includes(r.json().status),
      });

      if (bookingCheck) {
        bookingsCreated.add(1);
        const bookingId = bookingResponse.json().id;
        console.log(`✅ Booking created: ${bookingId}`);
      } else {
        bookingErrors.add(1);
        bookingsFailed.add(1);
        console.error(`❌ Booking failed: ${bookingResponse.status}`);
      }

      sleep(1); // User viewing confirmation
    });

    // Step 4: Verify booking in list
    group('4. View My Bookings', function () {
      const bookingsResponse = http.get(`${config.apiBase}/bookings`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
        tags: { operation: 'view_bookings' },
      });

      check(bookingsResponse, {
        'bookings list loaded': (r) => r.status === 200,
        'has bookings': (r) => Array.isArray(r.json()) && r.json().length > 0,
      });
    });
  });

  // Record total flow duration
  const flowDuration = Date.now() - flowStartTime;
  bookingDuration.add(flowDuration);

  // Longer sleep between booking attempts (realistic user behavior)
  sleep(Math.random() * 5 + 3); // 3-8 seconds
}

export function handleSummary(data) {
  console.log('Booking Flow Test Summary:');
  console.log(`- Bookings Created: ${bookingsCreated.value}`);
  console.log(`- Bookings Failed: ${bookingsFailed.value}`);
  console.log(
    `- Success Rate: ${((bookingsCreated.value / (bookingsCreated.value + bookingsFailed.value)) * 100).toFixed(2)}%`
  );

  return {
    'results/booking-flow-results.json': JSON.stringify(data, null, 2),
    stdout: textSummary(data, { indent: ' ', enableColors: true }),
  };
}
```

**Expected Behavior**:
- 50 concurrent users creating bookings
- Complete flow: View salon → Check availability → Create booking → View confirmation
- ~300 booking attempts per 10 minutes
- Success rate > 95%

---

### Authentication Helper

**File**: `load-tests/scenarios/utils/auth.js`

```javascript
import http from 'k6/http';
import { check } from 'k6';
import config from './config.js';

// Token cache (in-memory for test duration)
const tokenCache = new Map();

export function login(email, password) {
  // Check cache first
  if (tokenCache.has(email)) {
    return tokenCache.get(email);
  }

  const payload = JSON.stringify({
    email: email,
    password: password,
  });

  const response = http.post(`${config.apiBase}/auth/login`, payload, {
    headers: { 'Content-Type': 'application/json' },
    tags: { operation: 'login' },
  });

  const loginCheck = check(response, {
    'login successful': (r) => r.status === 200,
    'token received': (r) => r.json().token !== undefined,
  });

  if (loginCheck) {
    const token = response.json().token;
    tokenCache.set(email, token);
    return token;
  }

  console.error(`Login failed for ${email}: ${response.status}`);
  return null;
}

export function getAuthToken(email) {
  return tokenCache.get(email) || null;
}

export default { login, getAuthToken };
```

---

## Metrics & Thresholds

### Built-in k6 Metrics

k6 automatically tracks these metrics:

| Metric | Description | Target |
|--------|-------------|--------|
| **http_req_duration** | Total request time (send + wait + receive) | P95 < 500ms |
| **http_req_waiting** | Time to first byte (TTFB) | P95 < 100ms |
| **http_req_connecting** | Time to establish TCP connection | P95 < 50ms |
| **http_req_tls_handshaking** | Time for TLS handshake | P95 < 100ms |
| **http_req_sending** | Time to send request | P95 < 10ms |
| **http_req_receiving** | Time to receive response | P95 < 50ms |
| **http_req_blocked** | Time blocked before request starts | P95 < 10ms |
| **http_req_failed** | Percentage of failed requests | < 1% |
| **http_reqs** | Total number of requests | - |
| **vus** | Current number of active virtual users | - |
| **vus_max** | Max virtual users reached | - |
| **iterations** | Total completed iterations | - |
| **iteration_duration** | Time for complete iteration | P95 < 10s |

---

### Custom Metrics

#### Counters
```javascript
import { Counter } from 'k6/metrics';

const bookingsCreated = new Counter('bookings_created');
bookingsCreated.add(1); // Increment
```

#### Rates
```javascript
import { Rate } from 'k6/metrics';

const errorRate = new Rate('errors');
errorRate.add(true);  // Count as error
errorRate.add(false); // Count as success
```

#### Trends (Histograms)
```javascript
import { Trend } from 'k6/metrics';

const pageLoadTime = new Trend('page_load_time');
pageLoadTime.add(1234); // Add value in milliseconds
```

#### Gauges
```javascript
import { Gauge } from 'k6/metrics';

const activeConnections = new Gauge('active_connections');
activeConnections.add(42); // Set current value
```

---

### Threshold Configuration

Thresholds define pass/fail criteria:

```javascript
export const options = {
  thresholds: {
    // HTTP request duration
    'http_req_duration': ['p(95)<500', 'p(99)<1000'],

    // Error rate
    'http_req_failed': ['rate<0.01'], // < 1% errors

    // Specific endpoint thresholds
    'http_req_duration{endpoint:/api/salons}': ['p(95)<400'],
    'http_req_duration{endpoint:/api/bookings}': ['p(95)<800'],

    // Custom metrics
    'booking_errors': ['rate<0.05'], // < 5% booking errors
    'page_load_time': ['p(95)<1500'], // 95% under 1.5s

    // Check success rate
    'checks': ['rate>0.95'], // 95% of checks must pass
  },
};
```

**Threshold Operators**:
- `p(95)<500` - 95th percentile must be below 500ms
- `avg<300` - Average must be below 300ms
- `max<2000` - Maximum value must be below 2000ms
- `min>0` - Minimum value must be above 0
- `rate<0.01` - Rate must be below 1%
- `rate>0.95` - Rate must be above 95%
- `count>1000` - Count must exceed 1000

---

## Test Execution

### Running Individual Tests

#### Scenario 1: Homepage Load Test
```bash
cd load-tests
k6 run scenarios/homepage-load.js

# With environment variables
k6 run \
  -e BASE_URL=http://localhost:5000 \
  scenarios/homepage-load.js

# With JSON output
k6 run \
  --out json=results/homepage-load-results.json \
  scenarios/homepage-load.js
```

**Expected Output**:
```
          /\      |‾‾| /‾‾/   /‾‾/
     /\  /  \     |  |/  /   /  /
    /  \/    \    |     (   /   ‾‾\
   /          \   |  |\  \ |  (‾)  |
  / __________ \  |__| \__\ \_____/ .io

  execution: local
     script: scenarios/homepage-load.js
     output: -

  scenarios: (100.00%) 1 scenario, 100 max VUs, 8m30s max duration (incl. graceful stop):
           * default: Up to 100 looping VUs for 8m0s over 5 stages (gracefulStop: 30s)

running (8m00.5s), 000/100 VUs, 5432 complete and 0 interrupted iterations
default ✓ [======================================] 000/100 VUs  8m0s

     ✓ status is 200
     ✓ page contains AURELLE
     ✓ response time < 2s

     checks.........................: 100.00% ✓ 16296      ✗ 0
     data_received..................: 45 MB   93 kB/s
     data_sent......................: 556 kB  1.2 kB/s
     errors.........................: 0.00%   ✓ 0          ✗ 5432
     http_req_blocked...............: avg=1.2ms    min=0s       med=0s       max=45ms     p(95)=3ms      p(99)=8ms
     http_req_connecting............: avg=0.8ms    min=0s       med=0s       max=32ms     p(95)=2ms      p(99)=5ms
     http_req_duration..............: avg=234ms    min=87ms     med=215ms    max=987ms    p(95)=456ms    p(99)=678ms
       { expected_response:true }...: avg=234ms    min=87ms     med=215ms    max=987ms    p(95)=456ms    p(99)=678ms
     http_req_failed................: 0.00%   ✓ 0          ✗ 5432
     http_req_receiving.............: avg=12ms     min=1ms      med=8ms      max=98ms     p(95)=34ms     p(99)=56ms
     http_req_sending...............: avg=0.5ms    min=0s       med=0s       max=12ms     p(95)=1ms      p(99)=3ms
     http_req_tls_handshaking.......: avg=0s       min=0s       med=0s       max=0s       p(95)=0s       p(99)=0s
     http_req_waiting...............: avg=221ms    min=78ms     med=203ms    max=956ms    p(95)=432ms    p(99)=645ms
     http_reqs......................: 5432    11.32/s
     iteration_duration.............: avg=3.5s     min=2.1s     med=3.2s     max=6.8s     p(95)=4.9s     p(99)=5.7s
     iterations.....................: 5432    11.32/s
     page_load_time.................: avg=235ms    min=88ms     med=216ms    max=998ms    p(95)=457ms    p(99)=679ms
     requests_total.................: 5432    11.32/s
     vus............................: 4       min=4        max=100
     vus_max........................: 100     min=100      max=100
```

**Interpretation**:
- ✅ **100% checks passed** - All assertions successful
- ✅ **P95: 456ms** - 95% of requests under 456ms (threshold: 1000ms) ✓
- ✅ **P99: 678ms** - 99% of requests under 678ms (threshold: 2000ms) ✓
- ✅ **Error rate: 0%** - No failed requests (threshold: <1%) ✓
- ✅ **Throughput: 11.32 req/s** - Consistent performance

---

#### Scenario 2: Salon Search API Test
```bash
k6 run scenarios/salon-search.js

# With increased load
k6 run \
  -e BASE_URL=http://localhost:5000 \
  -e VUS=300 \
  scenarios/salon-search.js
```

---

#### Scenario 3: Booking Flow Test
```bash
# Must set test data first
k6 run \
  -e BASE_URL=http://localhost:5000 \
  -e TEST_SALON_ID=salon_001 \
  -e TEST_MASTER_ID=master_001 \
  -e TEST_SERVICE_ID=service_001 \
  scenarios/booking-flow.js
```

---

### Running All Tests (Script)

**File**: `load-tests/scripts/run-all-tests.sh`

```bash
#!/bin/bash

# Run All Load Tests
# Usage: ./scripts/run-all-tests.sh [environment]

ENVIRONMENT=${1:-development}
BASE_URL=${2:-http://localhost:5000}

echo "🚀 Running AURELLE Load Tests"
echo "Environment: $ENVIRONMENT"
echo "Base URL: $BASE_URL"
echo "---"

# Create results directory
mkdir -p results

# Test 1: Homepage Load
echo "📊 Test 1/3: Homepage Load (100 users)"
k6 run \
  -e BASE_URL=$BASE_URL \
  -e ENVIRONMENT=$ENVIRONMENT \
  --out json=results/homepage-load-results.json \
  scenarios/homepage-load.js

# Wait between tests
sleep 10

# Test 2: Salon Search API
echo "📊 Test 2/3: Salon Search API (200 users)"
k6 run \
  -e BASE_URL=$BASE_URL \
  -e ENVIRONMENT=$ENVIRONMENT \
  --out json=results/salon-search-results.json \
  scenarios/salon-search.js

# Wait between tests
sleep 10

# Test 3: Booking Flow
echo "📊 Test 3/3: Booking Flow (50 users)"
k6 run \
  -e BASE_URL=$BASE_URL \
  -e ENVIRONMENT=$ENVIRONMENT \
  -e TEST_SALON_ID=salon_001 \
  -e TEST_MASTER_ID=master_001 \
  -e TEST_SERVICE_ID=service_001 \
  --out json=results/booking-flow-results.json \
  scenarios/booking-flow.js

echo "✅ All tests completed!"
echo "📈 Results saved to results/ directory"
```

**Run**:
```bash
chmod +x scripts/run-all-tests.sh
./scripts/run-all-tests.sh development http://localhost:5000
```

---

### Running with Docker

```bash
# Run single test
docker run --rm -i \
  --network=host \
  -v $(pwd):/scripts \
  grafana/k6:latest \
  run /scripts/scenarios/homepage-load.js

# Run with environment variables
docker run --rm -i \
  --network=host \
  -v $(pwd):/scripts \
  -e BASE_URL=http://localhost:5000 \
  grafana/k6:latest \
  run /scripts/scenarios/salon-search.js
```

---

## Results Analysis

### Reading k6 Output

#### Summary Statistics

```
     checks.........................: 100.00% ✓ 16296      ✗ 0
```
- **100%** checks passed
- **16,296** successful checks
- **0** failed checks

```
     http_req_duration..............: avg=234ms    min=87ms     med=215ms    max=987ms    p(95)=456ms    p(99)=678ms
```
- **avg**: Average request duration (234ms)
- **min**: Fastest request (87ms)
- **med**: Median request duration (215ms)
- **max**: Slowest request (987ms)
- **p(95)**: 95th percentile (456ms) - 95% of requests faster than this
- **p(99)**: 99th percentile (678ms) - 99% of requests faster than this

```
     http_req_failed................: 0.00%   ✓ 0          ✗ 5432
```
- **0%** failed requests
- **5,432** successful requests

```
     http_reqs......................: 5432    11.32/s
```
- **5,432** total requests
- **11.32 req/s** throughput

```
     vus............................: 4       min=4        max=100
     vus_max........................: 100     min=100      max=100
```
- **4** active VUs at end
- **100** max VUs reached during test

---

### Performance Targets

| Metric | Target | Good | Acceptable | Poor |
|--------|--------|------|------------|------|
| **P50 (Median)** | <200ms | <300ms | <500ms | >500ms |
| **P95** | <500ms | <800ms | <1000ms | >1000ms |
| **P99** | <1000ms | <1500ms | <2000ms | >2000ms |
| **Error Rate** | <0.1% | <1% | <5% | >5% |
| **Throughput** | >10 req/s | >5 req/s | >1 req/s | <1 req/s |

---

### Analyzing JSON Results

**File**: `results/homepage-load-results.json`

```javascript
// Node.js script to analyze results
const fs = require('fs');

// Load results
const results = JSON.parse(fs.readFileSync('results/homepage-load-results.json'));

// Extract metrics
const metrics = results.metrics;

// Response time analysis
const httpReqDuration = metrics.http_req_duration.values;
console.log('Response Time Analysis:');
console.log(`- P50: ${httpReqDuration.p50.toFixed(2)}ms`);
console.log(`- P95: ${httpReqDuration.p95.toFixed(2)}ms`);
console.log(`- P99: ${httpReqDuration.p99.toFixed(2)}ms`);
console.log(`- Max: ${httpReqDuration.max.toFixed(2)}ms`);

// Error rate
const errorRate = metrics.http_req_failed.values.rate;
console.log(`\nError Rate: ${(errorRate * 100).toFixed(2)}%`);

// Throughput
const throughput = metrics.http_reqs.values.rate;
console.log(`Throughput: ${throughput.toFixed(2)} req/s`);

// Check pass rate
const checkRate = metrics.checks.values.rate;
console.log(`Check Success Rate: ${(checkRate * 100).toFixed(2)}%`);
```

---

## Performance Bottlenecks

### Common Bottlenecks

#### 1. Database Query Performance

**Symptom**:
- High P95/P99 response times
- Increasing response time as load increases
- Database CPU at 100%

**Investigation**:
```sql
-- Check slow queries (PostgreSQL)
SELECT
  query,
  mean_exec_time,
  calls,
  total_exec_time
FROM pg_stat_statements
ORDER BY mean_exec_time DESC
LIMIT 10;
```

**Solutions**:
- Add database indexes
- Optimize N+1 queries
- Implement query result caching
- Use database connection pooling
- Consider read replicas

---

#### 2. Missing Indexes

**Symptom**:
- `/api/salons` slow with filters
- Sequential scans in EXPLAIN output

**Investigation**:
```sql
-- Analyze query plan
EXPLAIN ANALYZE
SELECT * FROM salons
WHERE city = 'Tashkent'
AND is_active = true;
```

**Solution**:
```sql
-- Add composite index
CREATE INDEX idx_salons_city_active
ON salons (city, is_active);
```

---

#### 3. Memory Leaks

**Symptom**:
- Response time increases over duration
- Server memory usage growing
- OOM errors at high load

**Investigation**:
```bash
# Monitor Node.js memory
node --max-old-space-size=4096 --expose-gc server/index.js

# Use clinic.js
npx clinic doctor -- node server/index.js
```

**Solutions**:
- Fix memory leaks in code
- Implement proper resource cleanup
- Use streaming for large responses
- Increase heap size if needed

---

#### 4. Connection Pool Exhaustion

**Symptom**:
- Errors: "Timeout acquiring client from pool"
- High connection wait times

**Investigation**:
```javascript
// Check pool stats
console.log('Pool size:', db.pool.totalCount);
console.log('Idle connections:', db.pool.idleCount);
console.log('Waiting clients:', db.pool.waitingCount);
```

**Solution**:
```javascript
// Increase pool size
const pool = new Pool({
  max: 50, // Increase from default 10
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 5000,
});
```

---

#### 5. Rate Limiting Too Aggressive

**Symptom**:
- High 429 (Too Many Requests) error rate
- Legitimate traffic blocked

**Investigation**:
```javascript
// Check rate limiter configuration
console.log('Rate limit:', rateLimiter.points, 'per', rateLimiter.duration);
```

**Solution**:
```javascript
// Adjust rate limits for load testing
const rateLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 1000, // Increase from 100
  message: 'Too many requests',
});
```

---

### Performance Monitoring

#### Real-time Monitoring During Tests

```bash
# Terminal 1: Run load test
k6 run scenarios/salon-search.js

# Terminal 2: Monitor Node.js
top -p $(pgrep -f "node server/index.js")

# Terminal 3: Monitor PostgreSQL
watch -n 1 'psql -c "SELECT count(*) FROM pg_stat_activity"'

# Terminal 4: Monitor system
htop
```

---

#### Application Performance Monitoring (APM)

**Recommended Tools**:

1. **New Relic** - Full-stack APM
2. **Datadog** - Infrastructure + APM
3. **Grafana + Prometheus** - Open-source monitoring
4. **Sentry** - Error tracking
5. **PM2 Monitoring** - Node.js process manager

**PM2 Example**:
```bash
# Install PM2
npm install -g pm2

# Start with monitoring
pm2 start server/index.js --name aurelle-api

# Monitor
pm2 monit

# View metrics
pm2 logs
```

---

## Optimization Recommendations

### Based on Load Test Results

#### 1. Database Optimizations

**Action**: Add indexes for common queries

```sql
-- Salon search by city
CREATE INDEX idx_salons_city_active ON salons (city, is_active);

-- Bookings by client
CREATE INDEX idx_bookings_client_date ON bookings (client_id, booking_date DESC);

-- Reviews by salon
CREATE INDEX idx_reviews_salon_created ON reviews (salon_id, created_at DESC);

-- Master availability
CREATE INDEX idx_bookings_master_date_status ON bookings (master_id, booking_date, status);
```

**Expected Impact**: 50-70% reduction in query time

---

#### 2. Caching Strategy

**Action**: Implement Redis caching for frequently accessed data

```javascript
import Redis from 'ioredis';

const redis = new Redis({
  host: 'localhost',
  port: 6379,
  maxRetriesPerRequest: 3,
});

// Cache salon list
async function getSalons(city) {
  const cacheKey = `salons:${city}`;

  // Check cache
  const cached = await redis.get(cacheKey);
  if (cached) {
    return JSON.parse(cached);
  }

  // Fetch from database
  const salons = await db.select().from(salons).where({ city, isActive: true });

  // Cache for 5 minutes
  await redis.setex(cacheKey, 300, JSON.stringify(salons));

  return salons;
}
```

**Expected Impact**: 80-90% reduction in database load

---

#### 3. Database Connection Pooling

**Action**: Optimize Drizzle ORM connection pool

```javascript
import { drizzle } from 'drizzle-orm/node-postgres';
import pg from 'pg';

const pool = new pg.Pool({
  host: process.env.DB_HOST,
  port: 5432,
  database: process.env.DB_NAME,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,

  // Connection pool settings
  max: 50, // Max connections
  min: 10, // Min connections
  idleTimeoutMillis: 30000, // Close idle connections after 30s
  connectionTimeoutMillis: 5000, // Timeout acquiring connection
});

export const db = drizzle(pool);
```

**Expected Impact**: 30-40% improvement in concurrent request handling

---

#### 4. API Response Compression

**Action**: Enable gzip compression

```javascript
import compression from 'compression';

app.use(compression({
  level: 6, // Compression level (0-9)
  threshold: 1024, // Min size to compress (1KB)
  filter: (req, res) => {
    if (req.headers['x-no-compression']) {
      return false;
    }
    return compression.filter(req, res);
  },
}));
```

**Expected Impact**: 60-70% reduction in response size, faster transfers

---

#### 5. Query Optimization

**Action**: Optimize N+1 queries

**Before** (N+1 problem):
```javascript
// BAD: N+1 queries
const salons = await db.select().from(salons);
for (const salon of salons) {
  salon.masters = await db.select().from(masters).where({ salonId: salon.id });
}
```

**After** (Single query with joins):
```javascript
// GOOD: Single query with join
const salons = await db
  .select({
    salon: salons,
    masters: masters,
  })
  .from(salons)
  .leftJoin(masters, eq(masters.salonId, salons.id))
  .where(eq(salons.isActive, true));

// Group by salon
const groupedSalons = salons.reduce((acc, row) => {
  if (!acc[row.salon.id]) {
    acc[row.salon.id] = { ...row.salon, masters: [] };
  }
  if (row.masters) {
    acc[row.salon.id].masters.push(row.masters);
  }
  return acc;
}, {});
```

**Expected Impact**: 90% reduction in database queries

---

## CI/CD Integration

### GitHub Actions

**File**: `.github/workflows/load-test.yml`

```yaml
name: Load Tests

on:
  # Run on demand
  workflow_dispatch:
    inputs:
      environment:
        description: 'Environment to test'
        required: true
        default: 'staging'
        type: choice
        options:
          - development
          - staging
      vus:
        description: 'Virtual users'
        required: false
        default: '50'

  # Run weekly on staging
  schedule:
    - cron: '0 2 * * 1' # Every Monday at 2 AM

jobs:
  load-test:
    runs-on: ubuntu-latest
    timeout-minutes: 30

    services:
      postgres:
        image: postgres:16
        env:
          POSTGRES_DB: aurelle_test
          POSTGRES_USER: postgres
          POSTGRES_PASSWORD: postgres
        ports:
          - 5432:5432
        options: >-
          --health-cmd pg_isready
          --health-interval 10s
          --health-timeout 5s
          --health-retries 5

    steps:
      - name: Checkout code
        uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '20'

      - name: Install dependencies
        run: npm ci

      - name: Setup database
        env:
          DATABASE_URL: postgresql://postgres:postgres@localhost:5432/aurelle_test
        run: |
          npm run db:push
          npm run db:seed

      - name: Start application
        env:
          DATABASE_URL: postgresql://postgres:postgres@localhost:5432/aurelle_test
          PORT: 5000
        run: |
          npm run build
          npm start &
          sleep 10 # Wait for server to start

      - name: Install k6
        run: |
          sudo gpg -k
          sudo gpg --no-default-keyring --keyring /usr/share/keyrings/k6-archive-keyring.gpg --keyserver hkp://keyserver.ubuntu.com:80 --recv-keys C5AD17C747E3415A3642D57D77C6C491D6AC1D69
          echo "deb [signed-by=/usr/share/keyrings/k6-archive-keyring.gpg] https://dl.k6.io/deb stable main" | sudo tee /etc/apt/sources.list.d/k6.list
          sudo apt-get update
          sudo apt-get install k6

      - name: Run load tests
        env:
          BASE_URL: http://localhost:5000
          ENVIRONMENT: ${{ github.event.inputs.environment || 'staging' }}
        run: |
          cd load-tests
          ./scripts/run-all-tests.sh $ENVIRONMENT $BASE_URL

      - name: Upload test results
        uses: actions/upload-artifact@v4
        if: always()
        with:
          name: load-test-results
          path: load-tests/results/
          retention-days: 30

      - name: Comment PR with results
        if: github.event_name == 'pull_request'
        uses: actions/github-script@v7
        with:
          script: |
            const fs = require('fs');
            const results = JSON.parse(fs.readFileSync('load-tests/results/homepage-load-results.json'));

            const comment = `## Load Test Results

            **Homepage Load Test (100 VUs)**:
            - P95 Response Time: ${results.metrics.http_req_duration.values.p95.toFixed(2)}ms
            - P99 Response Time: ${results.metrics.http_req_duration.values.p99.toFixed(2)}ms
            - Error Rate: ${(results.metrics.http_req_failed.values.rate * 100).toFixed(2)}%
            - Throughput: ${results.metrics.http_reqs.values.rate.toFixed(2)} req/s

            ${results.metrics.http_req_duration.values.p95 < 500 ? '✅' : '❌'} P95 < 500ms
            ${results.metrics.http_req_failed.values.rate < 0.01 ? '✅' : '❌'} Error rate < 1%
            `;

            github.rest.issues.createComment({
              issue_number: context.issue.number,
              owner: context.repo.owner,
              repo: context.repo.repo,
              body: comment
            });

      - name: Fail if thresholds not met
        run: |
          if grep -q "✗" load-tests/results/*.json; then
            echo "Load tests failed to meet thresholds"
            exit 1
          fi
```

---

### GitLab CI

**File**: `.gitlab-ci.yml`

```yaml
load-tests:
  stage: test
  image: node:20

  services:
    - postgres:16

  variables:
    POSTGRES_DB: aurelle_test
    POSTGRES_USER: postgres
    POSTGRES_PASSWORD: postgres
    DATABASE_URL: postgresql://postgres:postgres@postgres:5432/aurelle_test
    BASE_URL: http://localhost:5000

  before_script:
    - apt-get update
    - apt-get install -y postgresql-client
    - npm ci
    - npm run db:push
    - npm run db:seed
    - npm run build
    - npm start &
    - sleep 15

    # Install k6
    - sudo gpg -k
    - sudo gpg --no-default-keyring --keyring /usr/share/keyrings/k6-archive-keyring.gpg --keyserver hkp://keyserver.ubuntu.com:80 --recv-keys C5AD17C747E3415A3642D57D77C6C491D6AC1D69
    - echo "deb [signed-by=/usr/share/keyrings/k6-archive-keyring.gpg] https://dl.k6.io/deb stable main" | sudo tee /etc/apt/sources.list.d/k6.list
    - sudo apt-get update
    - sudo apt-get install k6

  script:
    - cd load-tests
    - ./scripts/run-all-tests.sh staging $BASE_URL

  artifacts:
    when: always
    paths:
      - load-tests/results/
    expire_in: 30 days

  only:
    - main
    - staging
    - schedules
```

---

## Conclusion

This load testing guide provides:

✅ **Complete k6 setup** - Installation, configuration, project structure
✅ **3 test scenarios** - Homepage (100 users), Salon Search (200 users), Booking Flow (50 users)
✅ **Comprehensive metrics** - Response time, error rate, throughput, custom metrics
✅ **Performance thresholds** - Pass/fail criteria for automated testing
✅ **Results analysis** - How to interpret k6 output and identify bottlenecks
✅ **Optimization recommendations** - Database indexes, caching, connection pooling, query optimization
✅ **CI/CD integration** - GitHub Actions and GitLab CI workflows

**Next Steps**:
1. Run baseline load tests on current system
2. Identify and fix performance bottlenecks
3. Implement optimization recommendations
4. Re-run tests to verify improvements
5. Integrate into CI/CD pipeline for continuous performance monitoring

---

**Last Updated**: January 10, 2026
**Framework**: k6 v0.48.0
**Target**: 100+ concurrent users
