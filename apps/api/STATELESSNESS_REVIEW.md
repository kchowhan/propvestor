# API Statelessness Review

This document confirms that the API is **fully stateless** and can run across multiple instances in production.

## ✅ Stateless Components

### 1. **Authentication & Sessions**
- **Status**: ✅ Stateless
- **Implementation**: JWT tokens stored in cookies (`pv_session`, `pv_homeowner_session`)
- **Details**: 
  - No server-side session storage
  - Tokens are stateless and can be validated by any instance
  - No session affinity required

### 2. **Rate Limiting**
- **Status**: ✅ Stateless (with Redis)
- **Implementation**: 
  - Primary: Redis-backed rate limiting for multi-instance support
  - Fallback: In-memory Map (only when Redis unavailable)
- **Details**:
  - Rate limit counters stored in Redis with TTL
  - All instances share the same rate limit state
  - Graceful fallback to in-memory when Redis unavailable

### 3. **Subscription Limit Cache**
- **Status**: ✅ Stateless (with Redis) - **FIXED**
- **Implementation**: 
  - Primary: Redis cache for subscription limits
  - Fallback: In-memory Map (only when Redis unavailable)
- **Details**:
  - Cache key: `subscription-limits:org:{organizationId}`
  - TTL: 60 seconds
  - All instances share the same cache
  - Automatically expires in Redis

### 4. **File Storage**
- **Status**: ✅ Stateless
- **Implementation**: Google Cloud Storage (GCS)
- **Details**:
  - All files uploaded to external storage (GCS)
  - Temporary files written to `os.tmpdir()` and immediately deleted after upload
  - No persistent local file storage
  - Each instance can access files via GCS

### 5. **Database**
- **Status**: ✅ Stateless
- **Implementation**: PostgreSQL (Cloud SQL)
- **Details**:
  - All persistent data in external database
  - No in-memory database state
  - All instances connect to the same database

### 6. **No WebSockets**
- **Status**: ✅ Stateless
- **Details**: No WebSocket connections that would require sticky sessions

## 🔧 Changes Made

### Fixed: Subscription Limit Cache
**Problem**: Subscription limits were cached in an in-memory `Map`, causing:
- Each instance to have its own cache
- Cache inconsistencies across instances
- Stale data when subscriptions updated

**Solution**: Moved cache to Redis:
- Cache key: `subscription-limits:org:{organizationId}`
- TTL: 60 seconds
- Automatic expiration
- Shared across all instances

**Files Modified**:
- `apps/api/src/middleware/rate-limit.ts`
  - Updated `getRateLimitForOrganization()` to use Redis
  - Updated `clearSubscriptionLimitCache()` to clear Redis keys
  - Updated cleanup functions to be async

## 📋 Statelessness Checklist

- [x] No in-memory state storage (except fallbacks when Redis unavailable)
- [x] No file system writes (except temporary files that are immediately deleted)
- [x] No session storage in memory
- [x] Rate limiting uses Redis (with in-memory fallback)
- [x] Caching uses Redis (with in-memory fallback)
- [x] All persistent data in external storage (database, GCS)
- [x] No WebSocket connections
- [x] No singleton patterns that store state
- [x] No global variables that store request/state data

## 🚀 Production Deployment

The API is ready for multi-instance deployment:

1. **Enable Redis**: Set `REDIS_URL` environment variable
2. **Deploy Multiple Instances**: Cloud Run will automatically distribute traffic
3. **No Sticky Sessions Required**: All instances are identical and stateless
4. **Shared State**: Redis provides shared state for rate limiting and caching

## ⚠️ Fallback Behavior

When Redis is unavailable:
- Rate limiting falls back to in-memory storage (per-instance)
- Subscription limit cache falls back to in-memory storage (per-instance)
- **Note**: In production, Redis should always be available. Fallback is for development/testing.

## 📝 Notes

- The in-memory fallbacks are acceptable for development but should not be used in production
- All instances should connect to the same Redis instance for proper statelessness
- Temporary files in `os.tmpdir()` are safe as they're immediately deleted after upload to GCS

