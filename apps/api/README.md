# API Notes

## Statelessness Guardrails

The API is designed for multi-instance deployments. Avoid in-process caches or Maps for shared state.
Use external stores (Redis, database, CDN) for anything that must persist across requests or instances.

## Local Development

See the root `README.md` for setup and run instructions.
