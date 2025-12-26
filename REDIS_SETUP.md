# Redis Setup

This project uses Redis for shared rate limiting and other cross-instance state. The environment and Docker setup are ready, and Redis is integrated into the Google Cloud deployment.

## Local Development (Docker Compose)

Start Redis alongside the API and Postgres:

```bash
docker compose up -d redis
```

The default connection string:

```bash
REDIS_URL=redis://localhost:6379
```

## Docker Compose Service

The root `docker-compose.yml` includes a `redis` service and wires `REDIS_URL` into the API container:

```
REDIS_URL=redis://redis:6379
```

## Production - Google Cloud Memorystore

For production deployments on Google Cloud Platform, use **Google Cloud Memorystore for Redis**.

### Setup Steps

1. **Enable Required APIs:**
   ```bash
   gcloud services enable redis.googleapis.com vpcaccess.googleapis.com
   ```

2. **Create VPC Connector:**
   ```bash
   gcloud compute networks vpc-access connectors create propvestor-connector \
     --region=us-central1 \
     --subnet-project=$PROJECT_ID \
     --subnet=default \
     --min-instances=2 \
     --max-instances=3 \
     --machine-type=e2-micro
   ```

3. **Create Redis Instance:**
   
   **For Development/Testing (Basic tier):**
   ```bash
   gcloud redis instances create propvestor-redis \
     --size=1 \
     --region=us-central1 \
     --network=default \
     --redis-version=redis_7_0 \
     --tier=basic
   ```
   
   **For Production (Standard tier with replication):**
   ```bash
   gcloud redis instances create propvestor-redis \
     --size=5 \
     --region=us-central1 \
     --network=default \
     --redis-version=redis_7_0 \
     --tier=standard \
     --replica-count=1
   ```

4. **Get Connection Details:**
   ```bash
   REDIS_HOST=$(gcloud redis instances describe propvestor-redis \
     --region=us-central1 \
     --format="value(host)")
   REDIS_PORT=$(gcloud redis instances describe propvestor-redis \
     --region=us-central1 \
     --format="value(port)")
   ```

5. **Store Redis URL in Secret Manager:**
   ```bash
   echo -n "redis://${REDIS_HOST}:${REDIS_PORT}" | gcloud secrets create redis-url \
     --data-file=- \
     --replication-policy="automatic"
   ```

6. **Grant Service Account Access:**
   ```bash
   gcloud secrets add-iam-policy-binding redis-url \
     --member="serviceAccount:propvestor-backend@${PROJECT_ID}.iam.gserviceaccount.com" \
     --role="roles/secretmanager.secretAccessor"
   ```

### Connection String Format

The Redis URL format for Memorystore is:
```
redis://<private-ip>:<port>
```

For example: `redis://10.0.0.3:6379`

**Important Notes:**
- Memorystore Redis instances use private IP addresses within your VPC
- Cloud Run services must use a VPC connector to access Memorystore
- No authentication is required for Memorystore (it's protected by VPC)
- The VPC connector is configured in `cloudbuild-backend.yaml` with `--vpc-connector` and `--vpc-egress=all-traffic`

### Tier Recommendations

- **Basic Tier**: Single node, no replication
  - Suitable for: Development, testing, low-traffic production
  - Cost: ~$30-50/month for 1GB
  - Use case: Rate limiting, simple caching

- **Standard Tier**: High availability with replication
  - Suitable for: Production workloads
  - Cost: ~$100-200/month for 5GB
  - Use case: Critical rate limiting, session storage, distributed caching

### Alternative: External Redis Providers

If not using Google Cloud Memorystore, you can use other managed Redis services:

- **Redis Cloud** (Redis Labs)
- **AWS ElastiCache** (if using AWS)
- **Azure Cache for Redis** (if using Azure)
- **DigitalOcean Managed Redis**
- **Heroku Redis**

For external providers:
- Enable TLS where supported
- Use a dedicated database/namespace per environment
- Set connection limits appropriate for API instance counts
- Store the connection string in Secret Manager as `redis-url`

## Environment Configuration

The `REDIS_URL` environment variable is configured in:
- `apps/api/src/config/env.ts` - Added to environment schema
- `cloudbuild-backend.yaml` - Loaded from Secret Manager as `redis-url:latest`
- `docker-compose.yml` - Set to `redis://redis:6379` for local development

## Code Integration

The application code uses Redis when `REDIS_URL` is configured. Current status:

- ✅ Environment variable `REDIS_URL` configured
- ✅ Docker Compose setup complete
- ✅ Google Cloud deployment configured
- ✅ Rate limiting uses Redis when available (falls back to memory otherwise)
- ⏳ Session storage migration to Redis (planned)

## Next Steps in Code

- Implement Redis-based session storage for stateless scaling
- Add Redis connection pooling and error handling improvements
- Implement Redis health checks

## Troubleshooting

### Connection Issues

**Error: "Connection refused"**
- Verify VPC connector is created and running
- Check that Cloud Run service has `--vpc-connector` configured
- Verify Redis instance is in the same region and network

**Error: "Timeout connecting to Redis"**
- Check VPC connector status: `gcloud compute networks vpc-access connectors describe propvestor-connector --region=us-central1`
- Verify Redis instance is running: `gcloud redis instances describe propvestor-redis --region=us-central1`
- Check firewall rules allow traffic between VPC connector and Redis

**Error: "Secret not found"**
- Verify `redis-url` secret exists: `gcloud secrets describe redis-url`
- Check service account has Secret Manager access: `gcloud secrets get-iam-policy redis-url`

### Performance Issues

- Monitor Redis memory usage: `gcloud redis instances describe propvestor-redis --region=us-central1`
- Scale up instance size if needed: `gcloud redis instances update propvestor-redis --size=5 --region=us-central1`
- Consider upgrading to Standard tier for production workloads
