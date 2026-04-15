# World Zero — Deployment & Infrastructure

## 13. Media Handling

**v1 — Local filesystem:**
- Files saved to `/media/{character_id}/{submission_id}/`
- FastAPI serves via static file mount
- Store relative path in DB

**v2 — Cloud (migration path):**
- Swap write logic for S3/Cloudinary upload
- `file_path` becomes a full URL
- No schema changes required (by design)

---

## 16. Build Order (Recommended)

1. **Docker + DB + Alembic** — PostgreSQL, all models migrated, `game_config.py` written and reviewed
2. **CI scaffold** — GitHub Actions wired up; empty test suite passes before any real code
3. **Auth** — Google OAuth → JWT, Account + OAuthProvider, `/auth/me`
4. **Character creation** — CRUD, level-gate enforcement, unit tests
5. **Roles + Admin scaffolding** — Role/AccountRole, admin middleware
6. **Tasks API + seed data** — real tasks to develop against
7. **CharacterTask signup** — signup/drop, era-driven max cap, unit + integration tests
8. **Submissions API** — create, edit, media upload, flag
9. **Votes API** — cast, update, budget deduction, anti-self-vote, score + level-up trigger
10. **Frontend: Feed + Task Detail**
11. **Frontend: Submit Proof**
12. **Frontend: Character Profile + Leaderboard**
13. **Relationships + Messages**
14. **Admin views** — task approval, flagged queue, Era reset
15. **Polish** — mobile, loading states, error handling

---

## 17. Out of Scope (v1)

- Faction multiplier enforcement (FactionConfig values present; application deferred)
- Task Vision (Journeymen), Double Dipper (Analog)
- Cloud media storage
- Email notifications
- Native mobile apps
- Random Events system
- Villain faction

---

## 18. Deployment Architecture

### Overview

```
Browser → worldzero.org (GoDaddy DNS)
  → Render (handles HTTPS/SSL automatically)
    → React build   (static site, served as CDN)
    → FastAPI app   (web service, Docker container)
    → PostgreSQL    (Render managed database)
    → /media        (Render persistent disk, v1)
```

### Platform: Render

**Render services required:**

| Service | Render Type | Notes |
|---|---|---|
| FastAPI backend | Web Service (Docker) | Runs from `/backend`, exposes port 8000 |
| React frontend | Static Site | Built from `/frontend`, served via Render CDN |
| PostgreSQL | Managed Database | Render Postgres add-on; automatic backups |
| Media storage | Persistent Disk | Mounted at `/media` on the backend service (v1) |

### Environment Variables (Production)

```
SECRET_KEY=<random 64-char string>
ENVIRONMENT=production
DATABASE_URL=<provided by Render Postgres>
GOOGLE_CLIENT_ID=<from Google Cloud Console>
GOOGLE_CLIENT_SECRET=<from Google Cloud Console>
GOOGLE_REDIRECT_URI=https://worldzero.org/auth/google/callback
MEDIA_ROOT=/media
MEDIA_BASE_URL=https://worldzero.org/media
```

`config.py` reads all of these via `os.environ`. The app fails to start if any required variable is missing.

### render.yaml

```yaml
services:
  - type: web
    name: worldzero-backend
    runtime: docker
    dockerfilePath: ./backend/Dockerfile
    envVars:
      - key: DATABASE_URL
        fromDatabase:
          name: worldzero-db
          property: connectionString
    disk:
      name: media
      mountPath: /media
      sizeGB: 10
    startCommand: "alembic upgrade head && uvicorn main:app --host 0.0.0.0 --port 8000"

  - type: static
    name: worldzero-frontend
    buildCommand: npm run build
    staticPublishPath: ./frontend/build
    routes:
      - type: rewrite
        source: /*
        destination: /index.html

databases:
  - name: worldzero-db
    databaseName: worldzero
    plan: starter
```

### Production Dockerfile (backend)

```dockerfile
FROM python:3.12-slim
WORKDIR /app
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt
COPY . .
EXPOSE 8000
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"]
```

### Continuous Deployment

```
git push origin main
  → GitHub Actions: run tests + coverage check
    → (if passing) Render: pull new image, run alembic upgrade head, restart service
```

### Google OAuth: Production Setup

1. Go to Google Cloud Console → APIs & Services → Credentials
2. Edit your OAuth 2.0 Client ID
3. Add to **Authorised JavaScript origins:** `https://worldzero.org`
4. Add to **Authorised redirect URIs:** `https://worldzero.org/auth/google/callback`
5. Update `GOOGLE_REDIRECT_URI` on Render to match

### Pre-Launch Checklist

- [ ] `ENVIRONMENT=production` set on Render
- [ ] `SECRET_KEY` is a fresh random value (not the dev key)
- [ ] Google OAuth redirect URI updated for production domain
- [ ] Custom domain verified in Render + DNS records set in GoDaddy
- [ ] SSL certificate provisioned (Render does this automatically)
- [ ] Database backups enabled on Render Postgres dashboard
- [ ] Run `alembic upgrade head` confirmed in deploy logs
- [ ] Smoke test: create account, create character, sign up for a task, submit praxis, cast a vote

### Scaling Path

| Concern | Solution |
|---|---|
| Media storage filling up | Migrate to S3/Cloudinary (v2 — no schema changes required) |
| DB query slowness | Upgrade Render Postgres plan; add indexes via Alembic migration |
| Backend memory/CPU | Upgrade Render web service plan or enable horizontal scaling |
| Global latency | Add Cloudflare as CDN in front of Render (free tier, 5-minute setup) |
