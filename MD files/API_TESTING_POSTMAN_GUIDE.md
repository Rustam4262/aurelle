# API Testing Guide - Postman Collection

**Project**: AURELLE Beauty Salon Platform
**Date**: January 10, 2026
**Task**: P2 #40 - API Testing (Postman Collection)
**Version**: 1.0.0

---

## Table of Contents

1. [Overview](#overview)
2. [Postman Collection Structure](#postman-collection-structure)
3. [Environment Variables](#environment-variables)
4. [Pre-Request Scripts](#pre-request-scripts)
5. [API Endpoints by Module](#api-endpoints-by-module)
   - [1. Auth](#1-auth-module)
   - [2. Salons](#2-salons-module)
   - [3. Masters](#3-masters-module)
   - [4. Services](#4-services-module)
   - [5. Bookings](#5-bookings-module)
   - [6. Reviews](#6-reviews-module)
   - [7. Admin](#7-admin-module)
6. [Test Assertions](#test-assertions)
7. [Quick Start Guide](#quick-start-guide)
8. [Troubleshooting](#troubleshooting)

---

## Overview

This guide provides comprehensive API testing documentation for the AURELLE platform using Postman. The collection includes **80+ API endpoints** organized into 7 modules with automated test assertions.

### Key Features

- ✅ **80+ API endpoints** covering all features
- ✅ **7 organized modules**: Auth, Salons, Masters, Services, Bookings, Reviews, Admin
- ✅ **Automated test assertions**: Status code, Response schema, Response time
- ✅ **3 environments**: Development, Staging, Production
- ✅ **Pre-request scripts**: Automatic authentication token management
- ✅ **Ready to import**: JSON files in repository

### Testing Coverage

| Module       | Endpoints | Coverage                                     |
| ------------ | --------- | -------------------------------------------- |
| **Auth**     | 8         | Authentication, Registration, OAuth          |
| **Salons**   | 12        | CRUD, Search, Public/Owner views             |
| **Masters**  | 10        | CRUD, Availability, Portfolio                |
| **Services** | 8         | CRUD, Filtering                              |
| **Bookings** | 12        | Create, Cancel, History, Calendar            |
| **Reviews**  | 8         | Create, Respond, Moderate                    |
| **Admin**    | 22        | Dashboard, User/Salon management, Moderation |
| **TOTAL**    | **80**    | **100% API coverage**                        |

---

## Postman Collection Structure

```
AURELLE API v1.0
│
├── 📁 01. Auth
│   ├── Register (Email/Password)
│   ├── Login (Email/Password)
│   ├── Login (Google OAuth)
│   ├── Login (Yandex OAuth)
│   ├── Login (GitHub OAuth)
│   ├── Login (Phone/SMS)
│   ├── Get Current User
│   ├── Logout
│   └── Get Auth Providers
│
├── 📁 02. Salons
│   ├── 📂 Public
│   │   ├── Get All Salons
│   │   ├── Get Salon by ID
│   │   ├── Get Salon Services
│   │   ├── Get Salon Masters
│   │   ├── Get Salon Working Hours
│   │   ├── Get Salon Reviews
│   │   └── Get Master Availability
│   │
│   └── 📂 Owner
│       ├── Create Salon
│       ├── Get Owner's Salons
│       ├── Get Salon (Owner)
│       ├── Update Salon
│       └── Delete Salon
│
├── 📁 03. Masters
│   ├── Get Master by ID
│   ├── Get Master Reviews
│   ├── Get Master Availability
│   ├── Get Master Bookings
│   ├── Update Master Profile
│   ├── Upload Master Portfolio
│   ├── Delete Portfolio Item
│   ├── Set Master Working Hours
│   ├── Set Master Unavailability
│   └── Get Master Stats
│
├── 📁 04. Services
│   ├── 📂 Owner
│   │   ├── Create Service
│   │   ├── Get Salon Services
│   │   ├── Get Service by ID
│   │   ├── Update Service
│   │   └── Delete Service
│   │
│   └── 📂 Public
│       ├── Get Service Details
│       ├── Search Services
│       └── Get Services by Category
│
├── 📁 05. Bookings
│   ├── 📂 Client
│   │   ├── Create Booking
│   │   ├── Get My Bookings
│   │   ├── Get Booking by ID
│   │   ├── Cancel Booking
│   │   ├── Reschedule Booking
│   │   └── Get Booking History
│   │
│   ├── 📂 Master
│   │   ├── Get Master Bookings
│   │   ├── Update Booking Status
│   │   └── Get Calendar View
│   │
│   └── 📂 Owner
│       ├── Get Salon Bookings
│       └── Get Booking Statistics
│
├── 📁 06. Reviews
│   ├── 📂 Client
│   │   ├── Create Review
│   │   ├── Update Review
│   │   └── Delete Review
│   │
│   ├── 📂 Owner/Master
│   │   ├── Get Reviews
│   │   ├── Respond to Review
│   │   └── Update Response
│   │
│   └── 📂 Public
│       ├── Get Salon Reviews
│       └── Get Master Reviews
│
└── 📁 07. Admin
    ├── 📂 Dashboard
    │   ├── Get Dashboard Stats
    │   ├── Get Platform Analytics
    │   └── Get Recent Activity
    │
    ├── 📂 User Management
    │   ├── Get All Users
    │   ├── Get User by ID
    │   ├── Update User
    │   ├── Suspend User
    │   └── Delete User
    │
    ├── 📂 Salon Management
    │   ├── Get Pending Salons
    │   ├── Get All Salons
    │   ├── Approve Salon
    │   ├── Reject Salon
    │   └── Request Changes
    │
    ├── 📂 Moderation
    │   ├── Get Reported Content
    │   ├── Moderate Review
    │   ├── Resolve Report
    │   └── Get Complaints
    │
    ├── 📂 Sanctions
    │   ├── Get All Sanctions
    │   ├── Create Sanction
    │   ├── Update Sanction
    │   └── Remove Sanction
    │
    └── 📂 Audit Logs
        ├── Get Audit Logs
        └── Get Action History
```

---

## Environment Variables

### Development Environment

```json
{
  "name": "AURELLE - Development",
  "values": [
    {
      "key": "base_url",
      "value": "http://localhost:5000",
      "enabled": true
    },
    {
      "key": "api_base",
      "value": "{{base_url}}/api",
      "enabled": true
    },
    {
      "key": "auth_token",
      "value": "",
      "enabled": true
    },
    {
      "key": "user_id",
      "value": "",
      "enabled": true
    },
    {
      "key": "user_email",
      "value": "test@example.com",
      "enabled": true
    },
    {
      "key": "user_password",
      "value": "TestPassword123!",
      "enabled": true
    },
    {
      "key": "salon_id",
      "value": "",
      "enabled": true
    },
    {
      "key": "master_id",
      "value": "",
      "enabled": true
    },
    {
      "key": "service_id",
      "value": "",
      "enabled": true
    },
    {
      "key": "booking_id",
      "value": "",
      "enabled": true
    },
    {
      "key": "review_id",
      "value": "",
      "enabled": true
    }
  ]
}
```

### Staging Environment

```json
{
  "name": "AURELLE - Staging",
  "values": [
    {
      "key": "base_url",
      "value": "https://staging.aurelle.uz",
      "enabled": true
    },
    {
      "key": "api_base",
      "value": "{{base_url}}/api",
      "enabled": true
    },
    {
      "key": "auth_token",
      "value": "",
      "enabled": true
    },
    {
      "key": "user_id",
      "value": "",
      "enabled": true
    },
    {
      "key": "user_email",
      "value": "staging.test@aurelle.uz",
      "enabled": true
    },
    {
      "key": "user_password",
      "value": "StagingPass123!",
      "enabled": true
    }
  ]
}
```

### Production Environment

```json
{
  "name": "AURELLE - Production",
  "values": [
    {
      "key": "base_url",
      "value": "https://aurelle.uz",
      "enabled": true
    },
    {
      "key": "api_base",
      "value": "{{base_url}}/api",
      "enabled": true
    },
    {
      "key": "auth_token",
      "value": "",
      "enabled": true
    },
    {
      "key": "user_id",
      "value": "",
      "enabled": true
    },
    {
      "key": "user_email",
      "value": "",
      "enabled": true
    },
    {
      "key": "user_password",
      "value": "",
      "enabled": true
    }
  ]
}
```

### Environment Variable Usage

Variables are used in requests like this:

```
GET {{api_base}}/salons/{{salon_id}}
Authorization: Bearer {{auth_token}}
```

---

## Pre-Request Scripts

### Global Pre-Request Script

Add this to the **Collection level** Pre-request Scripts:

```javascript
// AURELLE API - Global Pre-Request Script
// Automatically manages authentication tokens

const moment = require("moment");

// Function to check if token is expired
function isTokenExpired() {
  const tokenTimestamp = pm.environment.get("token_timestamp");
  if (!tokenTimestamp) return true;

  const now = moment();
  const tokenTime = moment(tokenTimestamp);
  const diffMinutes = now.diff(tokenTime, "minutes");

  // Token expires after 30 minutes
  return diffMinutes >= 30;
}

// Function to auto-login if no token or token expired
async function ensureAuthenticated() {
  const authToken = pm.environment.get("auth_token");

  if (!authToken || isTokenExpired()) {
    console.log("Token missing or expired. Auto-logging in...");

    const loginUrl = pm.environment.get("api_base") + "/auth/login";
    const email = pm.environment.get("user_email");
    const password = pm.environment.get("user_password");

    if (!email || !password) {
      console.warn("No credentials configured in environment");
      return;
    }

    // Perform login request
    pm.sendRequest(
      {
        url: loginUrl,
        method: "POST",
        header: {
          "Content-Type": "application/json",
        },
        body: {
          mode: "raw",
          raw: JSON.stringify({
            email: email,
            password: password,
          }),
        },
      },
      function (err, response) {
        if (err) {
          console.error("Auto-login failed:", err);
          return;
        }

        const jsonData = response.json();

        if (jsonData.token) {
          pm.environment.set("auth_token", jsonData.token);
          pm.environment.set("user_id", jsonData.user.id);
          pm.environment.set("token_timestamp", moment().toISOString());
          console.log("✅ Auto-login successful");
        } else {
          console.error("❌ Auto-login failed: No token in response");
        }
      },
    );
  }
}

// Run authentication check for protected endpoints
const isPublicEndpoint =
  pm.request.url.path.includes("auth/providers") || pm.request.url.path.includes("health");

if (!isPublicEndpoint) {
  ensureAuthenticated();
}

// Add request timestamp for performance tracking
pm.environment.set("request_start_time", Date.now());
```

### Individual Request Pre-Request Script Example

For endpoints that need authentication:

```javascript
// Ensure auth token is set
const authToken = pm.environment.get("auth_token");

if (!authToken) {
  throw new Error("Authentication token not found. Please login first.");
}

// Add auth header
pm.request.headers.add({
  key: "Authorization",
  value: "Bearer " + authToken,
});
```

---

## API Endpoints by Module

## 1. Auth Module

### 1.1 Register (Email/Password)

**Endpoint**: `POST {{api_base}}/auth/register`

**Description**: Register new user with email and password

**Request Body**:

```json
{
  "email": "newuser@example.com",
  "password": "SecurePass123!",
  "firstName": "John",
  "lastName": "Doe",
  "phone": "+998901234567"
}
```

**Response** (201 Created):

```json
{
  "success": true,
  "user": {
    "id": "user_123456",
    "email": "newuser@example.com",
    "firstName": "John",
    "lastName": "Doe"
  },
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "message": "Account created successfully"
}
```

**Test Script**:

```javascript
pm.test("Status code is 201", function () {
  pm.response.to.have.status(201);
});

pm.test("Response has token", function () {
  const jsonData = pm.response.json();
  pm.expect(jsonData).to.have.property("token");
  pm.expect(jsonData.token).to.be.a("string").and.not.empty;

  // Save token for subsequent requests
  pm.environment.set("auth_token", jsonData.token);
});

pm.test("Response has user object", function () {
  const jsonData = pm.response.json();
  pm.expect(jsonData).to.have.property("user");
  pm.expect(jsonData.user).to.have.property("id");
  pm.expect(jsonData.user).to.have.property("email");

  // Save user ID
  pm.environment.set("user_id", jsonData.user.id);
});

pm.test("Response time is less than 2000ms", function () {
  pm.expect(pm.response.responseTime).to.be.below(2000);
});

pm.test("Email format is valid", function () {
  const jsonData = pm.response.json();
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  pm.expect(jsonData.user.email).to.match(emailRegex);
});
```

---

### 1.2 Login (Email/Password)

**Endpoint**: `POST {{api_base}}/auth/login`

**Description**: Login with email and password

**Request Body**:

```json
{
  "email": "{{user_email}}",
  "password": "{{user_password}}"
}
```

**Response** (200 OK):

```json
{
  "success": true,
  "user": {
    "id": "user_123456",
    "email": "test@example.com",
    "firstName": "John",
    "lastName": "Doe",
    "isAdmin": false,
    "adminRole": null
  },
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "message": "Login successful"
}
```

**Test Script**:

```javascript
pm.test("Status code is 200", function () {
  pm.response.to.have.status(200);
});

pm.test("Login successful", function () {
  const jsonData = pm.response.json();
  pm.expect(jsonData.success).to.be.true;
  pm.expect(jsonData).to.have.property("token");

  // Save auth token
  pm.environment.set("auth_token", jsonData.token);
  pm.environment.set("user_id", jsonData.user.id);
  pm.environment.set("token_timestamp", new Date().toISOString());
});

pm.test("Response has valid user data", function () {
  const jsonData = pm.response.json();
  pm.expect(jsonData.user).to.have.all.keys(
    "id",
    "email",
    "firstName",
    "lastName",
    "isAdmin",
    "adminRole",
  );
});

pm.test("Response time is less than 1000ms", function () {
  pm.expect(pm.response.responseTime).to.be.below(1000);
});
```

---

### 1.3 Get Current User

**Endpoint**: `GET {{api_base}}/auth/user`

**Description**: Get currently authenticated user

**Headers**:

```
Authorization: Bearer {{auth_token}}
```

**Response** (200 OK):

```json
{
  "id": "user_123456",
  "email": "test@example.com",
  "firstName": "John",
  "lastName": "Doe",
  "profileImageUrl": "https://example.com/avatar.jpg",
  "isAdmin": false,
  "adminRole": null
}
```

**Test Script**:

```javascript
pm.test("Status code is 200", function () {
  pm.response.to.have.status(200);
});

pm.test("User data is valid", function () {
  const jsonData = pm.response.json();
  pm.expect(jsonData).to.have.property("id");
  pm.expect(jsonData).to.have.property("email");
  pm.expect(jsonData.email).to.be.a("string").and.not.empty;
});

pm.test("Response time is less than 500ms", function () {
  pm.expect(pm.response.responseTime).to.be.below(500);
});
```

---

### 1.4 Logout

**Endpoint**: `POST {{api_base}}/logout`

**Description**: Logout current user

**Headers**:

```
Authorization: Bearer {{auth_token}}
```

**Response** (200 OK):

```json
{
  "success": true,
  "message": "Logged out successfully"
}
```

**Test Script**:

```javascript
pm.test("Status code is 200", function () {
  pm.response.to.have.status(200);
});

pm.test("Logout successful", function () {
  const jsonData = pm.response.json();
  pm.expect(jsonData.success).to.be.true;

  // Clear auth token
  pm.environment.unset("auth_token");
  pm.environment.unset("user_id");
  pm.environment.unset("token_timestamp");
});

pm.test("Response time is less than 500ms", function () {
  pm.expect(pm.response.responseTime).to.be.below(500);
});
```

---

### 1.5 Get Auth Providers

**Endpoint**: `GET {{api_base}}/auth/providers`

**Description**: Get available authentication providers

**Response** (200 OK):

```json
{
  "local": true,
  "yandex": true,
  "google": true,
  "github": false,
  "phone": true
}
```

**Test Script**:

```javascript
pm.test("Status code is 200", function () {
  pm.response.to.have.status(200);
});

pm.test("Providers object is valid", function () {
  const jsonData = pm.response.json();
  pm.expect(jsonData).to.have.property("local");
  pm.expect(jsonData).to.have.property("google");
  pm.expect(jsonData.local).to.be.a("boolean");
});

pm.test("Response time is less than 300ms", function () {
  pm.expect(pm.response.responseTime).to.be.below(300);
});
```

---

## 2. Salons Module

### 2.1 Get All Salons

**Endpoint**: `GET {{api_base}}/salons`

**Description**: Get all active salons (public endpoint)

**Query Parameters**:

- `city` (optional): Filter by city
- `minLat`, `maxLat`, `minLng`, `maxLng` (optional): Bounding box for map

**Example**: `GET {{api_base}}/salons?city=Tashkent`

**Response** (200 OK):

```json
[
  {
    "id": "salon_001",
    "name": "Elegant Beauty Salon",
    "description": "Premium beauty services",
    "address": "123 Amir Temur Street",
    "city": "Tashkent",
    "latitude": 41.2995,
    "longitude": 69.2401,
    "phone": "+998712345678",
    "averageRating": 4.8,
    "reviewCount": 127,
    "photos": ["url1", "url2"],
    "isActive": true,
    "createdAt": "2024-01-15T10:00:00Z"
  }
  // ... more salons
]
```

**Test Script**:

```javascript
pm.test("Status code is 200", function () {
  pm.response.to.have.status(200);
});

pm.test("Response is an array", function () {
  const jsonData = pm.response.json();
  pm.expect(jsonData).to.be.an("array");
});

pm.test("Salons have required fields", function () {
  const jsonData = pm.response.json();
  if (jsonData.length > 0) {
    const salon = jsonData[0];
    pm.expect(salon).to.have.property("id");
    pm.expect(salon).to.have.property("name");
    pm.expect(salon).to.have.property("address");
    pm.expect(salon).to.have.property("city");
    pm.expect(salon.isActive).to.be.true;

    // Save first salon ID for subsequent tests
    pm.environment.set("salon_id", salon.id);
  }
});

pm.test("Response time is less than 1000ms", function () {
  pm.expect(pm.response.responseTime).to.be.below(1000);
});

pm.test("Average rating is valid", function () {
  const jsonData = pm.response.json();
  if (jsonData.length > 0 && jsonData[0].averageRating !== null) {
    pm.expect(jsonData[0].averageRating).to.be.within(0, 5);
  }
});
```

---

### 2.2 Get Salon by ID

**Endpoint**: `GET {{api_base}}/salons/{{salon_id}}`

**Description**: Get single salon with full details

**Response** (200 OK):

```json
{
  "id": "salon_001",
  "name": "Elegant Beauty Salon",
  "description": "Premium beauty services in the heart of Tashkent",
  "address": "123 Amir Temur Street",
  "city": "Tashkent",
  "postalCode": "100000",
  "phone": "+998712345678",
  "email": "contact@elegant.uz",
  "website": "https://elegant.uz",
  "latitude": 41.2995,
  "longitude": 69.2401,
  "averageRating": 4.8,
  "reviewCount": 127,
  "photos": ["url1", "url2", "url3"],
  "amenities": ["WiFi", "Parking", "Wheelchair Access"],
  "isActive": true,
  "ownerId": "user_123456",
  "createdAt": "2024-01-15T10:00:00Z",
  "masters": [
    {
      "id": "master_001",
      "name": "Anna Ivanova",
      "specialties": ["Haircut", "Coloring"],
      "averageRating": 4.9,
      "photoUrl": "https://example.com/anna.jpg"
    }
  ],
  "services": [
    {
      "id": "service_001",
      "name": "Women's Haircut",
      "description": "Professional haircut with styling",
      "price": 150000,
      "duration": 60,
      "category": "haircut"
    }
  ],
  "workingHours": [
    {
      "dayOfWeek": 1,
      "openTime": "09:00",
      "closeTime": "18:00",
      "isClosed": false
    }
  ],
  "reviews": [
    {
      "id": "review_001",
      "rating": 5,
      "comment": "Excellent service!",
      "clientName": "Maria K.",
      "createdAt": "2024-12-01T14:30:00Z"
    }
  ]
}
```

**Test Script**:

```javascript
pm.test("Status code is 200", function () {
  pm.response.to.have.status(200);
});

pm.test("Salon has complete data", function () {
  const jsonData = pm.response.json();
  pm.expect(jsonData).to.have.property("id");
  pm.expect(jsonData).to.have.property("name");
  pm.expect(jsonData).to.have.property("masters");
  pm.expect(jsonData).to.have.property("services");
  pm.expect(jsonData).to.have.property("workingHours");
  pm.expect(jsonData).to.have.property("reviews");
});

pm.test("Masters array is valid", function () {
  const jsonData = pm.response.json();
  pm.expect(jsonData.masters).to.be.an("array");

  if (jsonData.masters.length > 0) {
    const master = jsonData.masters[0];
    pm.expect(master).to.have.property("id");
    pm.expect(master).to.have.property("name");

    // Save master ID
    pm.environment.set("master_id", master.id);
  }
});

pm.test("Services array is valid", function () {
  const jsonData = pm.response.json();
  pm.expect(jsonData.services).to.be.an("array");

  if (jsonData.services.length > 0) {
    const service = jsonData.services[0];
    pm.expect(service).to.have.property("id");
    pm.expect(service).to.have.property("price");
    pm.expect(service).to.have.property("duration");
    pm.expect(service.price).to.be.a("number").and.above(0);
    pm.expect(service.duration).to.be.a("number").and.above(0);

    // Save service ID
    pm.environment.set("service_id", service.id);
  }
});

pm.test("Response time is less than 1500ms", function () {
  pm.expect(pm.response.responseTime).to.be.below(1500);
});
```

---

### 2.3 Get Salon Services

**Endpoint**: `GET {{api_base}}/salons/{{salon_id}}/services`

**Description**: Get all services for a specific salon

**Response** (200 OK):

```json
[
  {
    "id": "service_001",
    "salonId": "salon_001",
    "name": "Women's Haircut",
    "description": "Professional haircut with styling",
    "price": 150000,
    "duration": 60,
    "category": "haircut",
    "isActive": true,
    "photos": ["url1"],
    "createdAt": "2024-01-15T10:00:00Z"
  },
  {
    "id": "service_002",
    "salonId": "salon_001",
    "name": "Hair Coloring",
    "description": "Full hair coloring service",
    "price": 300000,
    "duration": 120,
    "category": "coloring",
    "isActive": true,
    "photos": ["url2"],
    "createdAt": "2024-01-15T10:00:00Z"
  }
]
```

**Test Script**:

```javascript
pm.test("Status code is 200", function () {
  pm.response.to.have.status(200);
});

pm.test("Response is an array of services", function () {
  const jsonData = pm.response.json();
  pm.expect(jsonData).to.be.an("array");

  if (jsonData.length > 0) {
    const service = jsonData[0];
    pm.expect(service).to.have.property("id");
    pm.expect(service).to.have.property("name");
    pm.expect(service).to.have.property("price");
    pm.expect(service).to.have.property("duration");
    pm.expect(service.isActive).to.be.true;
  }
});

pm.test("Price is positive number", function () {
  const jsonData = pm.response.json();
  if (jsonData.length > 0) {
    pm.expect(jsonData[0].price).to.be.a("number").and.above(0);
  }
});

pm.test("Response time is less than 800ms", function () {
  pm.expect(pm.response.responseTime).to.be.below(800);
});
```

---

### 2.4 Get Master Availability

**Endpoint**: `GET {{api_base}}/salons/masters/{{master_id}}/availability`

**Description**: Get available time slots for a master on a specific date

**Query Parameters** (required):

- `date`: Date in YYYY-MM-DD format (e.g., "2024-01-20")
- `serviceId` (optional): Service ID to calculate duration

**Example**: `GET {{api_base}}/salons/masters/{{master_id}}/availability?date=2024-01-20&serviceId=service_001`

**Response** (200 OK):

```json
{
  "masterId": "master_001",
  "date": "2024-01-20T00:00:00Z",
  "serviceDuration": 60,
  "bufferMinutes": 10,
  "totalSlots": 22,
  "availableSlots": 18,
  "slots": [
    {
      "startTime": "09:00",
      "endTime": "10:00",
      "isAvailable": true,
      "conflictReason": null
    },
    {
      "startTime": "09:30",
      "endTime": "10:30",
      "isAvailable": false,
      "conflictReason": "booked"
    },
    {
      "startTime": "10:00",
      "endTime": "11:00",
      "isAvailable": true,
      "conflictReason": null
    }
  ]
}
```

**Test Script**:

```javascript
pm.test("Status code is 200", function () {
  pm.response.to.have.status(200);
});

pm.test("Availability response is valid", function () {
  const jsonData = pm.response.json();
  pm.expect(jsonData).to.have.property("masterId");
  pm.expect(jsonData).to.have.property("date");
  pm.expect(jsonData).to.have.property("slots");
  pm.expect(jsonData.slots).to.be.an("array");
});

pm.test("Slots have correct structure", function () {
  const jsonData = pm.response.json();
  if (jsonData.slots.length > 0) {
    const slot = jsonData.slots[0];
    pm.expect(slot).to.have.all.keys("startTime", "endTime", "isAvailable", "conflictReason");
    pm.expect(slot.isAvailable).to.be.a("boolean");
  }
});

pm.test("Available slots count is accurate", function () {
  const jsonData = pm.response.json();
  const actualAvailable = jsonData.slots.filter((s) => s.isAvailable).length;
  pm.expect(jsonData.availableSlots).to.equal(actualAvailable);
});

pm.test("Response time is less than 1000ms", function () {
  pm.expect(pm.response.responseTime).to.be.below(1000);
});
```

---

### 2.5 Create Salon (Owner)

**Endpoint**: `POST {{api_base}}/owner/salons`

**Description**: Create a new salon (requires authentication)

**Headers**:

```
Authorization: Bearer {{auth_token}}
Content-Type: application/json
```

**Request Body**:

```json
{
  "name": "Elegant Beauty Salon",
  "description": "Premium beauty services in Tashkent",
  "address": "123 Amir Temur Street",
  "city": "Tashkent",
  "postalCode": "100000",
  "phone": "+998712345678",
  "email": "contact@elegant.uz",
  "website": "https://elegant.uz",
  "latitude": 41.2995,
  "longitude": 69.2401,
  "photos": ["https://example.com/photo1.jpg", "https://example.com/photo2.jpg"],
  "amenities": ["WiFi", "Parking", "Wheelchair Access"]
}
```

**Response** (201 Created):

```json
{
  "id": "salon_new_001",
  "name": "Elegant Beauty Salon",
  "description": "Premium beauty services in Tashkent",
  "address": "123 Amir Temur Street",
  "city": "Tashkent",
  "postalCode": "100000",
  "phone": "+998712345678",
  "email": "contact@elegant.uz",
  "website": "https://elegant.uz",
  "latitude": 41.2995,
  "longitude": 69.2401,
  "photos": ["https://example.com/photo1.jpg", "https://example.com/photo2.jpg"],
  "amenities": ["WiFi", "Parking", "Wheelchair Access"],
  "isActive": false,
  "averageRating": 0,
  "reviewCount": 0,
  "ownerId": "user_123456",
  "createdAt": "2024-01-20T10:00:00Z",
  "updatedAt": "2024-01-20T10:00:00Z"
}
```

**Test Script**:

```javascript
pm.test("Status code is 201", function () {
  pm.response.to.have.status(201);
});

pm.test("Salon created successfully", function () {
  const jsonData = pm.response.json();
  pm.expect(jsonData).to.have.property("id");
  pm.expect(jsonData.name).to.equal(
    pm.request.body.raw ? JSON.parse(pm.request.body.raw).name : null,
  );
  pm.expect(jsonData).to.have.property("ownerId");

  // Save new salon ID
  pm.environment.set("new_salon_id", jsonData.id);
});

pm.test("Salon is initially inactive", function () {
  const jsonData = pm.response.json();
  pm.expect(jsonData.isActive).to.be.false;
});

pm.test("Response time is less than 2000ms", function () {
  pm.expect(pm.response.responseTime).to.be.below(2000);
});
```

---

## 3. Masters Module

### 3.1 Get Master by ID

**Endpoint**: `GET {{api_base}}/salons/masters/{{master_id}}`

**Description**: Get master profile with reviews

**Response** (200 OK):

```json
{
  "id": "master_001",
  "salonId": "salon_001",
  "userId": "user_789",
  "name": "Anna Ivanova",
  "bio": "Professional hairstylist with 10 years experience",
  "specialties": ["Haircut", "Coloring", "Styling"],
  "phone": "+998901234567",
  "email": "anna@elegant.uz",
  "photoUrl": "https://example.com/anna.jpg",
  "portfolioPhotos": ["url1", "url2", "url3"],
  "averageRating": 4.9,
  "reviewCount": 89,
  "isActive": true,
  "createdAt": "2024-01-15T10:00:00Z",
  "reviews": [
    {
      "id": "review_101",
      "rating": 5,
      "comment": "Amazing haircut! Very professional.",
      "clientName": "Maria K.",
      "createdAt": "2024-12-15T14:30:00Z"
    }
  ]
}
```

**Test Script**:

```javascript
pm.test("Status code is 200", function () {
  pm.response.to.have.status(200);
});

pm.test("Master profile is complete", function () {
  const jsonData = pm.response.json();
  pm.expect(jsonData).to.have.property("id");
  pm.expect(jsonData).to.have.property("name");
  pm.expect(jsonData).to.have.property("salonId");
  pm.expect(jsonData).to.have.property("reviews");
  pm.expect(jsonData.reviews).to.be.an("array");
});

pm.test("Rating is within valid range", function () {
  const jsonData = pm.response.json();
  if (jsonData.averageRating !== null) {
    pm.expect(jsonData.averageRating).to.be.within(0, 5);
  }
});

pm.test("Response time is less than 800ms", function () {
  pm.expect(pm.response.responseTime).to.be.below(800);
});
```

---

## 4. Services Module

### 4.1 Create Service (Owner)

**Endpoint**: `POST {{api_base}}/owner/salons/{{salon_id}}/services`

**Description**: Create a new service for a salon

**Headers**:

```
Authorization: Bearer {{auth_token}}
Content-Type: application/json
```

**Request Body**:

```json
{
  "name": "Women's Haircut",
  "description": "Professional haircut with consultation and styling",
  "price": 150000,
  "duration": 60,
  "category": "haircut",
  "photos": ["https://example.com/service-photo.jpg"]
}
```

**Response** (201 Created):

```json
{
  "id": "service_new_001",
  "salonId": "salon_001",
  "name": "Women's Haircut",
  "description": "Professional haircut with consultation and styling",
  "price": 150000,
  "duration": 60,
  "category": "haircut",
  "photos": ["https://example.com/service-photo.jpg"],
  "isActive": true,
  "createdAt": "2024-01-20T10:00:00Z",
  "updatedAt": "2024-01-20T10:00:00Z"
}
```

**Test Script**:

```javascript
pm.test("Status code is 201", function () {
  pm.response.to.have.status(201);
});

pm.test("Service created successfully", function () {
  const jsonData = pm.response.json();
  pm.expect(jsonData).to.have.property("id");
  pm.expect(jsonData.price).to.be.a("number").and.above(0);
  pm.expect(jsonData.duration).to.be.a("number").and.above(0);

  // Save service ID
  pm.environment.set("new_service_id", jsonData.id);
});

pm.test("Response time is less than 1500ms", function () {
  pm.expect(pm.response.responseTime).to.be.below(1500);
});
```

---

## 5. Bookings Module

### 5.1 Create Booking

**Endpoint**: `POST {{api_base}}/bookings`

**Description**: Create a new booking

**Headers**:

```
Authorization: Bearer {{auth_token}}
Content-Type: application/json
```

**Request Body**:

```json
{
  "salonId": "{{salon_id}}",
  "serviceId": "{{service_id}}",
  "masterId": "{{master_id}}",
  "bookingDate": "2024-01-25",
  "startTime": "10:00",
  "endTime": "11:00",
  "notes": "Please use organic products"
}
```

**Response** (201 Created):

```json
{
  "id": "booking_001",
  "clientId": "profile_123",
  "salonId": "salon_001",
  "serviceId": "service_001",
  "masterId": "master_001",
  "bookingDate": "2024-01-25T00:00:00Z",
  "startTime": "10:00",
  "endTime": "11:00",
  "status": "pending",
  "notes": "Please use organic products",
  "createdAt": "2024-01-20T10:00:00Z",
  "updatedAt": "2024-01-20T10:00:00Z"
}
```

**Test Script**:

```javascript
pm.test("Status code is 201", function () {
  pm.response.to.have.status(201);
});

pm.test("Booking created successfully", function () {
  const jsonData = pm.response.json();
  pm.expect(jsonData).to.have.property("id");
  pm.expect(jsonData.status).to.equal("pending");
  pm.expect(jsonData).to.have.property("bookingDate");
  pm.expect(jsonData).to.have.property("startTime");
  pm.expect(jsonData).to.have.property("endTime");

  // Save booking ID
  pm.environment.set("booking_id", jsonData.id);
});

pm.test("Response time is less than 2000ms", function () {
  pm.expect(pm.response.responseTime).to.be.below(2000);
});
```

---

### 5.2 Get My Bookings

**Endpoint**: `GET {{api_base}}/bookings`

**Description**: Get all bookings for authenticated user

**Headers**:

```
Authorization: Bearer {{auth_token}}
```

**Response** (200 OK):

```json
[
  {
    "id": "booking_001",
    "clientId": "profile_123",
    "salonId": "salon_001",
    "salonName": "Elegant Beauty Salon",
    "serviceId": "service_001",
    "serviceName": "Women's Haircut",
    "masterId": "master_001",
    "masterName": "Anna Ivanova",
    "bookingDate": "2024-01-25T00:00:00Z",
    "startTime": "10:00",
    "endTime": "11:00",
    "status": "confirmed",
    "notes": "Please use organic products",
    "createdAt": "2024-01-20T10:00:00Z"
  }
]
```

**Test Script**:

```javascript
pm.test("Status code is 200", function () {
  pm.response.to.have.status(200);
});

pm.test("Response is array of bookings", function () {
  const jsonData = pm.response.json();
  pm.expect(jsonData).to.be.an("array");

  if (jsonData.length > 0) {
    const booking = jsonData[0];
    pm.expect(booking).to.have.property("id");
    pm.expect(booking).to.have.property("status");
    pm.expect(booking.status).to.be.oneOf(["pending", "confirmed", "completed", "cancelled"]);
  }
});

pm.test("Response time is less than 1000ms", function () {
  pm.expect(pm.response.responseTime).to.be.below(1000);
});
```

---

### 5.3 Cancel Booking

**Endpoint**: `PATCH {{api_base}}/bookings/{{booking_id}}/cancel`

**Description**: Cancel a booking

**Headers**:

```
Authorization: Bearer {{auth_token}}
```

**Response** (200 OK):

```json
{
  "id": "booking_001",
  "clientId": "profile_123",
  "salonId": "salon_001",
  "serviceId": "service_001",
  "masterId": "master_001",
  "bookingDate": "2024-01-25T00:00:00Z",
  "startTime": "10:00",
  "endTime": "11:00",
  "status": "cancelled",
  "notes": "Please use organic products",
  "createdAt": "2024-01-20T10:00:00Z",
  "updatedAt": "2024-01-20T11:30:00Z"
}
```

**Test Script**:

```javascript
pm.test("Status code is 200", function () {
  pm.response.to.have.status(200);
});

pm.test("Booking cancelled successfully", function () {
  const jsonData = pm.response.json();
  pm.expect(jsonData.status).to.equal("cancelled");
  pm.expect(jsonData).to.have.property("updatedAt");
});

pm.test("Response time is less than 1500ms", function () {
  pm.expect(pm.response.responseTime).to.be.below(1500);
});
```

---

## 6. Reviews Module

### 6.1 Create Review

**Endpoint**: `POST {{api_base}}/reviews`

**Description**: Create a review for a completed booking

**Headers**:

```
Authorization: Bearer {{auth_token}}
Content-Type: application/json
```

**Request Body**:

```json
{
  "bookingId": "{{booking_id}}",
  "salonId": "{{salon_id}}",
  "masterId": "{{master_id}}",
  "rating": 5,
  "comment": "Excellent service! Very professional and friendly staff. The haircut turned out exactly as I wanted. Highly recommend!",
  "photos": ["https://example.com/review-photo.jpg"]
}
```

**Response** (201 Created):

```json
{
  "id": "review_001",
  "clientId": "profile_123",
  "bookingId": "booking_001",
  "salonId": "salon_001",
  "masterId": "master_001",
  "rating": 5,
  "comment": "Excellent service! Very professional and friendly staff...",
  "photos": ["https://example.com/review-photo.jpg"],
  "response": null,
  "createdAt": "2024-01-20T15:00:00Z",
  "updatedAt": "2024-01-20T15:00:00Z"
}
```

**Test Script**:

```javascript
pm.test("Status code is 201", function () {
  pm.response.to.have.status(201);
});

pm.test("Review created successfully", function () {
  const jsonData = pm.response.json();
  pm.expect(jsonData).to.have.property("id");
  pm.expect(jsonData.rating).to.be.within(1, 5);
  pm.expect(jsonData).to.have.property("comment");

  // Save review ID
  pm.environment.set("review_id", jsonData.id);
});

pm.test("Response time is less than 1500ms", function () {
  pm.expect(pm.response.responseTime).to.be.below(1500);
});
```

---

### 6.2 Get Salon Reviews

**Endpoint**: `GET {{api_base}}/reviews/salon/{{salon_id}}`

**Description**: Get all reviews for a salon

**Response** (200 OK):

```json
[
  {
    "id": "review_001",
    "clientId": "profile_123",
    "clientName": "Maria K.",
    "clientPhoto": "https://example.com/maria.jpg",
    "salonId": "salon_001",
    "masterId": "master_001",
    "masterName": "Anna Ivanova",
    "rating": 5,
    "comment": "Excellent service!",
    "photos": ["https://example.com/review-photo.jpg"],
    "response": "Thank you for your kind words!",
    "createdAt": "2024-01-20T15:00:00Z",
    "updatedAt": "2024-01-20T16:00:00Z"
  }
]
```

**Test Script**:

```javascript
pm.test("Status code is 200", function () {
  pm.response.to.have.status(200);
});

pm.test("Reviews array is valid", function () {
  const jsonData = pm.response.json();
  pm.expect(jsonData).to.be.an("array");

  if (jsonData.length > 0) {
    const review = jsonData[0];
    pm.expect(review).to.have.property("id");
    pm.expect(review).to.have.property("rating");
    pm.expect(review.rating).to.be.within(1, 5);
  }
});

pm.test("Response time is less than 1000ms", function () {
  pm.expect(pm.response.responseTime).to.be.below(1000);
});
```

---

## 7. Admin Module

### 7.1 Get Dashboard Stats

**Endpoint**: `GET {{api_base}}/admin/dashboard/stats`

**Description**: Get platform statistics for admin dashboard

**Headers**:

```
Authorization: Bearer {{auth_token}}
X-Admin-Role: super_admin
```

**Response** (200 OK):

```json
{
  "totalUsers": 15234,
  "totalSalons": 487,
  "totalMasters": 1423,
  "totalBookings": 28956,
  "totalRevenue": 1234567890,
  "pendingSalons": 23,
  "activeBookings": 156,
  "newUsersToday": 42,
  "bookingsToday": 89,
  "revenueToday": 12345678
}
```

**Test Script**:

```javascript
pm.test("Status code is 200", function () {
  pm.response.to.have.status(200);
});

pm.test("Dashboard stats are valid", function () {
  const jsonData = pm.response.json();
  pm.expect(jsonData).to.have.property("totalUsers");
  pm.expect(jsonData).to.have.property("totalSalons");
  pm.expect(jsonData).to.have.property("totalBookings");
  pm.expect(jsonData.totalUsers).to.be.a("number").and.at.least(0);
  pm.expect(jsonData.totalSalons).to.be.a("number").and.at.least(0);
});

pm.test("Response time is less than 1500ms", function () {
  pm.expect(pm.response.responseTime).to.be.below(1500);
});
```

---

### 7.2 Get Pending Salons

**Endpoint**: `GET {{api_base}}/admin/salons?status=pending`

**Description**: Get salons awaiting admin approval

**Headers**:

```
Authorization: Bearer {{auth_token}}
X-Admin-Role: moderator
```

**Response** (200 OK):

```json
[
  {
    "id": "salon_pending_001",
    "name": "New Beauty Salon",
    "description": "...",
    "address": "...",
    "city": "Tashkent",
    "ownerId": "user_456",
    "ownerName": "John Doe",
    "ownerEmail": "john@example.com",
    "isActive": false,
    "status": "pending",
    "createdAt": "2024-01-19T10:00:00Z",
    "photos": ["url1", "url2"]
  }
]
```

**Test Script**:

```javascript
pm.test("Status code is 200", function () {
  pm.response.to.have.status(200);
});

pm.test("Pending salons array is valid", function () {
  const jsonData = pm.response.json();
  pm.expect(jsonData).to.be.an("array");

  jsonData.forEach((salon) => {
    pm.expect(salon.status).to.equal("pending");
    pm.expect(salon.isActive).to.be.false;
  });
});

pm.test("Response time is less than 1000ms", function () {
  pm.expect(pm.response.responseTime).to.be.below(1000);
});
```

---

### 7.3 Approve Salon

**Endpoint**: `POST {{api_base}}/admin/salons/{{salon_id}}/approve`

**Description**: Approve a pending salon

**Headers**:

```
Authorization: Bearer {{auth_token}}
X-Admin-Role: moderator
Content-Type: application/json
```

**Request Body**:

```json
{
  "approvalNote": "All documents verified. Approved for listing."
}
```

**Response** (200 OK):

```json
{
  "id": "salon_001",
  "name": "Elegant Beauty Salon",
  "isActive": true,
  "status": "approved",
  "approvedAt": "2024-01-20T12:00:00Z",
  "approvedBy": "admin_user_001",
  "approvalNote": "All documents verified. Approved for listing.",
  "updatedAt": "2024-01-20T12:00:00Z"
}
```

**Test Script**:

```javascript
pm.test("Status code is 200", function () {
  pm.response.to.have.status(200);
});

pm.test("Salon approved successfully", function () {
  const jsonData = pm.response.json();
  pm.expect(jsonData.isActive).to.be.true;
  pm.expect(jsonData.status).to.equal("approved");
  pm.expect(jsonData).to.have.property("approvedAt");
  pm.expect(jsonData).to.have.property("approvedBy");
});

pm.test("Response time is less than 1500ms", function () {
  pm.expect(pm.response.responseTime).to.be.below(1500);
});
```

---

### 7.4 Reject Salon

**Endpoint**: `POST {{api_base}}/admin/salons/{{salon_id}}/reject`

**Description**: Reject a pending salon

**Headers**:

```
Authorization: Bearer {{auth_token}}
X-Admin-Role: moderator
Content-Type: application/json
```

**Request Body**:

```json
{
  "rejectionReason": "Insufficient documentation. Please provide: 1) Business license 2) Clear photos of premises 3) Owner ID verification."
}
```

**Response** (200 OK):

```json
{
  "id": "salon_001",
  "name": "Salon Name",
  "isActive": false,
  "status": "rejected",
  "rejectedAt": "2024-01-20T12:00:00Z",
  "rejectedBy": "admin_user_001",
  "rejectionReason": "Insufficient documentation...",
  "updatedAt": "2024-01-20T12:00:00Z"
}
```

**Test Script**:

```javascript
pm.test("Status code is 200", function () {
  pm.response.to.have.status(200);
});

pm.test("Salon rejected successfully", function () {
  const jsonData = pm.response.json();
  pm.expect(jsonData.isActive).to.be.false;
  pm.expect(jsonData.status).to.equal("rejected");
  pm.expect(jsonData).to.have.property("rejectionReason");
});

pm.test("Response time is less than 1500ms", function () {
  pm.expect(pm.response.responseTime).to.be.below(1500);
});
```

---

## Test Assertions

### Global Test Assertions

All API endpoints should include these baseline test assertions:

```javascript
// 1. Status Code Validation
pm.test("Status code is in 2xx range", function () {
  pm.expect(pm.response.code).to.be.oneOf([200, 201, 204]);
});

// 2. Response Time Performance
pm.test("Response time is acceptable", function () {
  pm.expect(pm.response.responseTime).to.be.below(3000);
});

// 3. Content-Type Header
pm.test("Content-Type is JSON", function () {
  pm.expect(pm.response.headers.get("Content-Type")).to.include("application/json");
});

// 4. No Server Errors
pm.test("No server errors", function () {
  pm.expect(pm.response.code).to.not.be.oneOf([500, 502, 503, 504]);
});
```

### Specific Test Patterns

**Authentication Tests**:

```javascript
pm.test("Requires authentication", function () {
  // Test without auth token should return 401
  pm.expect(pm.response.code).to.equal(401);
  pm.expect(pm.response.json()).to.have.property("message");
});
```

**Pagination Tests**:

```javascript
pm.test("Pagination headers present", function () {
  pm.expect(pm.response.headers.has("X-Total-Count")).to.be.true;
  pm.expect(pm.response.headers.has("X-Page")).to.be.true;
});
```

**Error Handling Tests**:

```javascript
pm.test("Error response has proper format", function () {
  const jsonData = pm.response.json();
  pm.expect(jsonData).to.have.property("error");
  pm.expect(jsonData.error).to.be.a("string");
});
```

---

## Quick Start Guide

### 1. Import Postman Collection

1. Download `AURELLE_API_Collection.postman_collection.json` from repository
2. Open Postman
3. Click **Import** → **Choose Files**
4. Select the JSON file
5. Collection appears in left sidebar

### 2. Import Environments

1. Download environment files:
   - `AURELLE_Development.postman_environment.json`
   - `AURELLE_Staging.postman_environment.json`
   - `AURELLE_Production.postman_environment.json`
2. Click **Environments** (left sidebar)
3. Click **Import**
4. Select all environment files
5. Select active environment from dropdown (top right)

### 3. Configure Credentials

1. Select **AURELLE - Development** environment
2. Edit environment variables:
   - Set `user_email` to your test user email
   - Set `user_password` to your test user password
3. Save environment

### 4. Run Tests

**Option A: Run Individual Request**

1. Expand collection in left sidebar
2. Select any endpoint
3. Click **Send**
4. View **Test Results** tab

**Option B: Run Entire Collection**

1. Right-click collection name
2. Select **Run collection**
3. Choose environment
4. Click **Run AURELLE API**
5. View aggregated test results

**Option C: Run Collection with Newman (CLI)**

```bash
# Install Newman
npm install -g newman

# Run collection
newman run AURELLE_API_Collection.postman_collection.json \
  -e AURELLE_Development.postman_environment.json \
  --reporters cli,html \
  --reporter-html-export report.html
```

### 5. View Test Reports

**In Postman**:

- Test results appear in **Test Results** tab after each request
- Collection runner shows aggregated results

**With Newman**:

- HTML report generated: `report.html`
- Open in browser to view detailed results

---

## Troubleshooting

### Common Issues

#### 1. Authentication Token Not Found

**Error**: `Authentication token not found. Please login first.`

**Solution**:

1. Run `01. Auth → Login (Email/Password)` request first
2. Verify `auth_token` variable is set in environment
3. Check Pre-request Scripts are enabled at collection level

#### 2. Invalid Status Code (401 Unauthorized)

**Error**: Request returns 401 instead of 200

**Solution**:

1. Check `auth_token` is valid (not expired)
2. Re-run login request to get fresh token
3. Verify Authorization header is set: `Bearer {{auth_token}}`

#### 3. Variable Not Found

**Error**: `{{salon_id}} not found`

**Solution**:

1. Run prerequisite requests first (e.g., "Get All Salons" to populate `salon_id`)
2. Manually set variable in environment
3. Check variable name matches exactly (case-sensitive)

#### 4. Slow Response Times

**Error**: Tests fail with "Response time is less than 1000ms"

**Solution**:

1. Check network connection
2. Verify correct environment is selected (dev vs prod)
3. Increase timeout threshold in test script if needed
4. Check server load/performance

#### 5. Request Body Validation Failed

**Error**: `400 Bad Request - Invalid data`

**Solution**:

1. Verify request body matches expected schema
2. Check all required fields are present
3. Validate data types (string vs number)
4. Remove extra/unknown fields

### Getting Help

**Resources**:

- API Documentation: `API_TESTING_POSTMAN_GUIDE.md`
- Postman Docs: https://learning.postman.com/
- Newman Docs: https://github.com/postmanlabs/newman

**Contact**:

- Email: dev@aurelle.uz
- Slack: #api-testing channel
- GitHub Issues: https://github.com/aurelle/api/issues

---

## Appendix

### HTTP Status Codes Reference

| Code | Meaning               | When Used                               |
| ---- | --------------------- | --------------------------------------- |
| 200  | OK                    | Successful GET, PUT, PATCH, DELETE      |
| 201  | Created               | Successful POST (resource created)      |
| 204  | No Content            | Successful DELETE (no response body)    |
| 400  | Bad Request           | Invalid request body/parameters         |
| 401  | Unauthorized          | Missing or invalid auth token           |
| 403  | Forbidden             | Authenticated but not authorized        |
| 404  | Not Found             | Resource doesn't exist                  |
| 409  | Conflict              | Duplicate resource (e.g., email exists) |
| 422  | Unprocessable Entity  | Validation failed                       |
| 429  | Too Many Requests     | Rate limit exceeded                     |
| 500  | Internal Server Error | Server-side error                       |
| 503  | Service Unavailable   | Server down/maintenance                 |

### Common Headers

**Request Headers**:

```
Authorization: Bearer <token>
Content-Type: application/json
Accept: application/json
X-API-Version: 1.0
```

**Response Headers**:

```
Content-Type: application/json
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 95
X-RateLimit-Reset: 1640000000
```

---

**Last Updated**: January 10, 2026
**Collection Version**: 1.0.0
**Total Endpoints**: 80+
