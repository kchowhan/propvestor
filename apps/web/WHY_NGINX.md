# Why Nginx? (It's Optional!)

## Short Answer

**Nginx is NOT required.** It's just one option for serving static files. The frontend builds to static files (HTML, CSS, JS) that can be served by many different methods.

## Why Nginx is Used in the Dockerfile

The `Dockerfile` uses nginx because:
1. **Efficient**: Nginx is very fast at serving static files
2. **Lightweight**: Small Docker image size
3. **Production-ready**: Used by many production deployments
4. **Features**: Built-in compression, caching, security headers

## Alternatives (No Nginx Needed)

### 1. Static Hosting Platforms (Recommended)
These platforms handle everything - no server needed:
- **Vercel** - Just connect your repo
- **Netlify** - Deploy the `dist` folder
- **Cloudflare Pages** - Connect repo, auto-deploy
- **GitHub Pages** - Free hosting for public repos

**Advantages**:
- Zero server management
- Automatic HTTPS
- Global CDN
- Free tier available
- Easy CI/CD integration

### 2. Simple Node.js Server
Use the `serve` package or Express static middleware:

```bash
# Option 1: Using 'serve' package
npm install -g serve
serve -s dist -l 3000

# Option 2: Using Express (if you want more control)
# Create a simple server.js:
const express = require('express');
const path = require('path');
const app = express();
app.use(express.static(path.join(__dirname, 'dist')));
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'dist', 'index.html'));
});
app.listen(3000);
```

**See `Dockerfile.simple`** for a Docker version using `serve`.

### 3. Other Web Servers
- **Apache** - Traditional web server
- **Caddy** - Modern web server with automatic HTTPS
- **Traefik** - Reverse proxy with automatic HTTPS

### 4. CDN + Object Storage
- **AWS S3 + CloudFront**
- **Google Cloud Storage + CDN**
- **Azure Blob Storage + CDN**

## When to Use Nginx

Use nginx if:
- You're self-hosting on a VPS/server
- You want fine-grained control over caching, compression, headers
- You're already using nginx for other services
- You need advanced routing/rewrite rules

## When NOT to Use Nginx

Skip nginx if:
- You're using a static hosting platform (Vercel, Netlify, etc.)
- You want the simplest possible setup
- You're deploying to a platform that handles serving (most PaaS)

## Comparison

| Method | Complexity | Performance | Cost | Best For |
|--------|-----------|-------------|------|----------|
| Static Hosting (Vercel/Netlify) | ⭐ Easy | ⭐⭐⭐ Excellent | Free tier | Most projects |
| Nginx | ⭐⭐ Medium | ⭐⭐⭐ Excellent | Server cost | Self-hosting |
| Simple Node.js Server | ⭐ Easy | ⭐⭐ Good | Server cost | Quick deployments |
| CDN + S3 | ⭐⭐ Medium | ⭐⭐⭐ Excellent | Pay per use | Large scale |

## Recommendation

**For most users**: Use a static hosting platform like Vercel or Netlify. They're free, fast, and require zero server management.

**For self-hosting**: Use nginx if you want production-grade features, or the simple Node.js server (`Dockerfile.simple`) if you want something simpler.

## Changing the Dockerfile

If you want to use the simple Node.js server instead of nginx:

```bash
# Use the simple Dockerfile
docker build -f apps/web/Dockerfile.simple --build-arg VITE_API_URL=https://api.yourdomain.com/api -t propvestor-web .
docker run -p 3000:3000 propvestor-web
```

Or modify `docker-compose.yml` to use `Dockerfile.simple` instead of `Dockerfile`.

