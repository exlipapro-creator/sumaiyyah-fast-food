# Sumaiyyah Fast Food Operations & Render Production Runbook

## 1. Production Architecture Overview
- **Hosting Platform**: Render Web Service (Docker runtime, single-instance)
- **Database**: SQLite with Write-Ahead Logging (WAL) enabled (`/data/app.db`)
- **Media Uploads**: Persistent directory (`/data/uploads`)
- **Persistent Disk**: Render Disk mounted at `/data` (10 GB+)
- **Process Orchestration**: Next.js Standalone via `scripts/start.mjs` binding dynamically to `PORT` on `0.0.0.0`
- **Health Check**: `GET /api/health` verifying DB query execution and `/data` path responsiveness.

---

## 2. Environment Configuration
See [.env.example](.env.example) for the full variable specification.

| Variable | Recommended Production Value | Description |
|---|---|---|
| `PORT` | Set dynamically by Render | Port the application listens on |
| `NODE_ENV` | `production` | Enables production optimizations |
| `DROIDBOT_DB_PATH` | `/data/app.db` | Path to persistent SQLite database |
| `DROIDBOT_UPLOADS_PATH` | `/data/uploads` | Path to persistent upload storage |
| `DROIDBOT_COOKIE_SECURE` | `true` | Enforces HTTPS-only cookies |
| `DROIDBOT_SESSION_SECRET` | 64+ char random hex | Persistent HMAC session secret |
| `INITIAL_MANAGER_EMAIL` | e.g. `manager@sumaiyyah.co.tz` | Initial bootstrap manager email |
| `INITIAL_MANAGER_PASSWORD` | Strong password (8+ chars) | Initial bootstrap manager password |
| `INITIAL_MANAGER_NAME` | `Operations Manager` | Initial bootstrap manager name |

---

## 3. Production Manager Account Bootstrap
1. When booting a fresh production database with 0 users, the system inspects `INITIAL_MANAGER_EMAIL` and `INITIAL_MANAGER_PASSWORD`.
2. It automatically creates an initial active manager user with bcrypt password hashing.
3. Once created, subsequent boots will never overwrite or recreate accounts.
4. If zero users exist and no bootstrap credentials are provided, the server starts safely without default accounts and logs a clear setup warning.

---

## 4. Production Backup & Recovery Procedures

### 4.1 Safe SQLite Online Backup (WAL-Consistent)
Naïve file copying (`cp /data/app.db ...`) while SQLite is active can cause corrupted backups if transactions are in the WAL file (`app.db-wal`). Always use SQLite's native backup API:

```bash
# 1. Create a timestamped backup directory
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
mkdir -p /data/backups

# 2. Run atomic, WAL-consistent SQLite backup
sqlite3 /data/app.db ".backup '/data/backups/sumaiyyah_${TIMESTAMP}.db'"

# 3. Archive uploaded image files
tar -czf "/data/backups/uploads_${TIMESTAMP}.tar.gz" -C /data uploads

# 4. Verify integrity of the generated backup
sqlite3 "/data/backups/sumaiyyah_${TIMESTAMP}.db" "PRAGMA integrity_check;"
# Expected output: ok
```

### 4.2 Off-Site Backup Sync
Periodically sync the `/data/backups` directory to secure cloud object storage (e.g. AWS S3, Google Cloud Storage, or Backblaze B2):
```bash
# Example with AWS S3 CLI or Rclone:
# rclone copy /data/backups remote:sumaiyyah-backups/ --max-age 24h
```

### 4.3 Disaster Recovery / Restore Verification
To restore the platform to a verified snapshot:
1. Stop the application container / pause the web service.
2. Back up any existing files in `/data` as a precaution:
   ```bash
   mv /data/app.db /data/app.db.corrupt.$(date +%s) || true
   ```
3. Copy the backup file into place:
   ```bash
   cp /data/backups/sumaiyyah_YYYYMMDD_HHMMSS.db /data/app.db
   ```
4. Restore uploads if needed:
   ```bash
   tar -xzf /data/backups/uploads_YYYYMMDD_HHMMSS.tar.gz -C /data/
   ```
5. Remove any leftover `-wal` or `-shm` files to force clean startup:
   ```bash
   rm -f /data/app.db-wal /data/app.db-shm
   ```
6. Run integrity check:
   ```bash
   sqlite3 /data/app.db "PRAGMA integrity_check;"
   # Must return "ok"
   ```
7. Restart the service and verify `GET /api/health`.

---

## 5. Post-Deployment Verification Suite

Run this checklist immediately following any deployment to Render:

### Infrastructure & Health
- [ ] Docker image builds cleanly.
- [ ] Render reports service healthy (`GET /api/health` returns HTTP 200 `{"status":"ok","database":"ok"}`).
- [ ] Session cookies include `HttpOnly`, `Secure`, and `SameSite=Lax`.

### Core Operational Flows
- [ ] **Customer Ordering**: Browse menu $\rightarrow$ Add customized item $\rightarrow$ Checkout $\rightarrow$ Order created with auto-stock deduction $\rightarrow$ Live tracking displays status.
- [ ] **POS Operations**: Cashier/Manager logs in $\rightarrow$ Select items $\rightarrow$ Process cash/mobile/card $\rightarrow$ Stock deducted $\rightarrow$ Receipt generated $\rightarrow$ Reports updated.
- [ ] **Order Voiding**: Void order with reason $\rightarrow$ Stock restored to inventory $\rightarrow$ Audit trail logged.
- [ ] **Corporate Catering**: Corporate account logins $\rightarrow$ Enforce package minimums $\rightarrow$ Schedule delivery $\rightarrow$ Cutoff validation $\rightarrow$ Invoicing eligibility enforced $\rightarrow$ Tenant isolation verified.
- [ ] **Persistence**: Container restart preserves `orders`, `users`, `corporate_accounts`, `restaurant_settings`, and `/data/uploads`.
