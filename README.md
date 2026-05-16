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

## Tools

Static tool pages are served from `public/tool1` through `public/tool13`.

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
