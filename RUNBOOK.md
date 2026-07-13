# Sumaiyyah Fast Food POS — Runbook

## Prerequisites
- Node.js 22+
- npm

## Install
```bash
cd app
npm install
```

## Development
```bash
npm run dev
# Runs on http://localhost:3000 by default
```

## Build
```bash
npm run build
```

## Start (Production)
```bash
PORT=3000 npm start
# Or with custom port:
PORT=8080 npm start
```

## Environment Variables
See [.env.example](.env.example) for a copyable template.

| Variable | Default | Description |
|---|---|---|
| `PORT` | 3000 | HTTP port to listen on |
| `DROIDBOT_DB_PATH` | `./data/app.db` | Path to SQLite database file |
| `DROIDBOT_UPLOADS_PATH` | `./data/uploads` | Directory for uploaded menu-item images |
| `DROIDBOT_SESSION_SECRET` | dev fallback string | JWT signing secret — change in production! |
| `DROIDBOT_COOKIE_SECURE` | unset | Set to `true` to mark the session cookie `Secure` (requires HTTPS) |

## Default Seeded Accounts
| Email | Password | Role |
|---|---|---|
| manager@sumaiyyah.test | Manager123! | Manager |
| cashier@sumaiyyah.test | Cashier123! | Cashier |

## Run API Tests
```bash
# Start the server first
PORT=3001 npm start &

# Run tests
DROIDBOT_TEST_URL=http://localhost:3001 npm test
```

## Docker
```bash
# Build
docker build -t sumaiyyah-pos .

# Run (creates a volume for the SQLite DB)
docker run -p 3000:3000 -v sumaiyyah-data:/data sumaiyyah-pos
```
