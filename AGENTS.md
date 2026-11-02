# AGENTS.md

Personal homepage served by GitHub Pages from the root of `master`. No build
step: `index.html` and `chat.js` are what ships. Keep `.nojekyll`.

## Things that must stay in sync

- **Bio facts** appear twice: the visible text in `index.html` and
  `SYSTEM_PROMPT` in `chat.js`. When a fact changes (role, numbers, projects),
  update both or the chat twin contradicts the page.
- **Worker URL**: `API_URL` in `chat.js` must point at the deployed worker's
  `/chat` route, and `SITE_ORIGIN` in `worker/worker.js` must be the site
  origin. Origin checks are exact matches; keep them that way.

## Chat worker

`worker/` is a Cloudflare Worker that proxies Gemini and rate-limits per IP. It
deploys separately from the site: `cd worker && wrangler deploy`. The Gemini key
is a worker secret (`wrangler secret put GEMINI_API_KEY`). Never put an API key
in `chat.js` or anywhere else in the repo.

## Out of scope

Ebooks live in the `gengwg/ebooks` repo (served at `/ebooks`), not here.

## Checking a change

There are no tests. Serve the repo over localhost (any port; opening the file
directly sends `Origin: null`, which the worker refuses):

    uv run python -m http.server 8000

Then load http://localhost:8000, check the page renders, and send one chat
message. For worker changes, run `wrangler dev` in `worker/` and curl it with
different `Origin` headers before deploying.
