<img width="120" height="120" alt="AcidMonitorr" src="https://github.com/user-attachments/assets/28ef22f6-0981-4047-aaf8-b56e571a83da" />

# AcidMonitorr

[![License](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE) ![Rust](https://img.shields.io/badge/Rust-000000?style=flat&logo=rust&logoColor=white) ![Tauri](https://img.shields.io/badge/Tauri-24C8D8?style=flat&logo=tauri&logoColor=white) ![Docker](https://img.shields.io/badge/Docker-2496ED?style=flat&logo=docker&logoColor=white) [![Release](https://img.shields.io/github/v/release/infinition/AcidMonitorr?style=flat)](https://github.com/infinition/AcidMonitorr/releases) [![Buy Me a Coffee](https://img.shields.io/badge/Buy%20Me%20a%20Coffee-ffdd00?style=flat&logo=buy-me-a-coffee&logoColor=black)](https://buymeacoffee.com/infinition)

A hybrid media monitor that runs either as a native desktop app (Tauri) or a headless Docker container on a Synology NAS or home server. Same Rust core, two deployment targets.

<img width="842" height="622" alt="AcidMonitorr interface" src="https://github.com/user-attachments/assets/21c61456-0036-4d07-99a6-b52a0b9aad3b" />

---

## Desktop (Tauri)

```bash
npm run tauri build
./target/release/acidmonitorr.exe
```

Config lives at `~/.acidmonitorr/config.json`.

---

## Docker (Synology / server)

```yaml
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

```bash
docker compose up -d       # start
docker compose down        # stop
docker compose logs -f     # logs
docker compose pull && docker compose up -d  # update
```

---

## Architecture

- Shared Rust logic between Tauri (WebView) and Axum (web server).
- Frontend: Tailwind JIT + Vanilla JS.
- Storage mode switches automatically based on the `ACID_SERVER` env var.
- CI/CD: push to `master` builds and pushes to GHCR. A `v*` tag creates a `.exe` GitHub Release.

---

## Star History

<a href="https://www.star-history.com/?repos=infinition%2FAcidMonitorr&type=date&legend=top-left">
 <picture>
   <source media="(prefers-color-scheme: dark)" srcset="https://api.star-history.com/chart?repos=infinition/AcidMonitorr&type=date&theme=dark&legend=top-left" />
   <source media="(prefers-color-scheme: light)" srcset="https://api.star-history.com/chart?repos=infinition/AcidMonitorr&type=date&legend=top-left" />
   <img alt="Star History Chart" src="https://api.star-history.com/chart?repos=infinition/AcidMonitorr&type=date&legend=top-left" />
 </picture>
</a>

---

## License

MIT. See [LICENSE](LICENSE).
