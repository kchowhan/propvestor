#!/bin/bash

# Test script to verify Redis is being used by the API

echo "🔍 Testing Redis Usage in API"
echo "================================"
echo ""

# Check if Redis is running
echo "1. Checking Redis connection..."
REDIS_PING=$(docker exec propvestor-redis redis-cli ping 2>/dev/null)
if [ "$REDIS_PING" = "PONG" ]; then
  echo "   ✅ Redis is running"
else
  echo "   ❌ Redis is not running"
  exit 1
fi

# Check if API is running
echo ""
echo "2. Checking API health..."
API_HEALTH=$(curl -s http://localhost:4000/api/health)
if [ -n "$API_HEALTH" ]; then
  echo "   ✅ API is running"
  echo "   Response: $API_HEALTH"
else
  echo "   ❌ API is not running"
  exit 1
fi

# Clear existing rate limit keys
echo ""
echo "3. Clearing existing rate limit keys..."
docker exec propvestor-redis redis-cli --scan --pattern "ratelimit:*" | xargs -r docker exec propvestor-redis redis-cli del
echo "   ✅ Cleared"

# Make multiple requests
echo ""
echo "4. Making 5 API requests..."
for i in {1..5}; do
  curl -s http://localhost:4000/api/health > /dev/null
  echo "   Request $i completed"
  sleep 0.3
done

# Check Redis keys
echo ""
echo "5. Checking Redis for rate limit keys..."
REDIS_KEYS=$(docker exec propvestor-redis redis-cli keys "ratelimit:*")
if [ -n "$REDIS_KEYS" ]; then
  echo "   ✅ Redis keys found:"
  echo "$REDIS_KEYS" | while read key; do
    VALUE=$(docker exec propvestor-redis redis-cli get "$key")
    TTL=$(docker exec propvestor-redis redis-cli ttl "$key")
    echo "      Key: $key"
    echo "      Value: $VALUE (count)"
    echo "      TTL: $TTL seconds"
  done
else
  echo "   ❌ No Redis keys found - API might not be using Redis"
fi

# Check rate limit headers
echo ""
echo "6. Checking rate limit headers..."
HEADERS=$(curl -s -I http://localhost:4000/api/health | grep -i "rate-limit")
if [ -n "$HEADERS" ]; then
  echo "   ✅ Rate limit headers present:"
  echo "$HEADERS" | sed 's/^/      /'
else
  echo "   ⚠️  No rate limit headers found"
fi

echo ""
echo "================================"
echo "✅ Test complete!"
echo ""
echo "If you see Redis keys above, the API is successfully using Redis for rate limiting!"

