<img width="120" height="120" alt="128x128@2x" src="https://github.com/user-attachments/assets/28ef22f6-0981-4047-aaf8-b56e571a83da" />

# AcidMonitorr

> Hybrid Desktop & Docker Media Monitor.

<img width="842" height="622" alt="image" src="https://github.com/user-attachments/assets/21c61456-0036-4d07-99a6-b52a0b9aad3b" />


## ⚡ Quick Start (Desktop)
- Build: `npm run tauri build`
- Run: `./target/release/acidmonitorr.exe`
- Config: `~/.acidmonitorr/config.json`

## 🐳 Docker (Synology/Server)
```yaml
# docker-compose.yml
services:
  acidmonitorr:
    image: ghcr.io/infinition/acidmonitorr:latest
    container_name: acidmonitorr
    restart: unless-stopped
    ports:
      - "3000:3000"
    volumes:
      - /volume1/docker/acidmonitorr/data:/app/data
    environment:
      - ACID_SERVER=1
      - ACID_CONFIG_DIR=/app/data
```

### 💻 Docker Ops
- **Up**: `docker-compose up -d`
- **Down**: `docker-compose down`
- **Logs**: `docker-compose logs -f`
- **Update**: `docker-compose pull && docker-compose up -d`

## 🛠️ Dev Notes
- **Hybrid Core**: Shared Rust logic between Tauri (WebView) and Axum (Web Server).
- **Frontend**: Tailwind JIT + Vanilla JS.
- **Persistence**: Auto-switches based on `ACID_SERVER` env var.
- **CI/CD**: 
  - `master` push -> Docker GHCR build (`infinition/acidmonitorr`).
  - `v*` tag -> `.exe` GitHub Release.

---
*Stay Acid. @infinition*
