# netlify-site1

An Express.js + Netlify server hosting a collection of tools and API endpoints. Deployed to `site1.bhenning.com`.

## Tech Stack

- Node.js / Express
- Axios for external API calls
- Netlify Functions (serverless)
- Docker / Nginx for local/self-hosted runs

## API Endpoints

| Endpoint | Description |
|----------|-------------|
| `/api/cat-facts` | Random cat facts |
| `/api/board` | Board/scoreboard data |
| `/api/hockey` | Hockey scores |
| `/api/huskies` | SCSU Huskies scores |
| `/api/baseball` | Baseball scores |
| `/api/config` | HUMAN captcha public config |
| `/api/submit` | HUMAN captcha form submit (POST) |
| `/api/enforce-debug` | HUMAN Enforce API debug preview |

## Tools

Static tool pages are served from `public/tool1` through `public/tool13`.

**captcha-on** — HUMAN Security press-and-hold iframe challenge demo at `/captcha-on/`. Requires `HUMAN_APP_ID` and `ENFORCER_AUTH_TOKEN` (see `.env.example`). Set the same variables in the Netlify site dashboard for production.

## Setup

```bash
npm install
```

## Running

```bash
./run.sh
```

Or with Docker:

```bash
docker-compose up
```

## Deployment

Deploys to Netlify via `netlify.toml`.
