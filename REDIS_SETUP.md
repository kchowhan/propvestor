# Redis Setup (Planned Integration)

This project is adding Redis for shared rate limiting and other cross-instance state. The application code does not yet use Redis, but the environment and Docker setup are ready.

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

The root `docker-compose.yml` now includes a `redis` service and wires `REDIS_URL` into the API container:

```
REDIS_URL=redis://redis:6379
```

## Production

Use a managed Redis service and set `REDIS_URL` to the provider connection string. Recommended settings:

- Enable TLS where supported
- Use a dedicated database/namespace per environment
- Set connection limits appropriate for API instance counts

## Next Step in Code (Not Implemented Yet)

- Replace in-memory rate limiting stores with Redis-based storage
- Ensure all custom rate limiters share the same store
