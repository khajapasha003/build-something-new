# PreLaunchQA scan worker

The checking engine. It runs on its own Linux server (not inside the web app,
which has no browser), asks the app for the next queued check, opens the site
in a real Chromium browser, and sends back findings with evidence.

## How it talks to the app

Three signed endpoints on the app:

| Endpoint                           | Purpose                              |
| ---------------------------------- | ------------------------------------ |
| `POST /api/public/worker/claim`    | Take the oldest queued check         |
| `POST /api/public/worker/progress` | Report progress (0-99) while working |
| `POST /api/public/worker/result`   | Send findings and finish the check   |

Every request carries `x-plq-timestamp` (unix seconds) and `x-plq-signature`
= HMAC-SHA256 of `"<timestamp>.<raw json body>"` using `WORKER_SHARED_SECRET`.
Requests older than 5 minutes are rejected.

The app drops any finding whose `evidence` object is empty. Never report
something you did not observe on the page.

## Run it locally

```bash
cd worker
cp .env.example .env     # fill in PLQ_API_BASE and WORKER_SHARED_SECRET
npm install              # also downloads Chromium
node --env-file=.env src/index.mjs
```

Single pass (useful for testing): `RUN_ONCE=1 node --env-file=.env src/index.mjs`

## Run it on AWS Lightsail (ap-south-1)

1. Create an Ubuntu 22.04 instance, 2 GB RAM or larger.
2. Install Node 20 and the app:

```bash
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt-get install -y nodejs git
git clone <your worker repo> /opt/plq-worker
cd /opt/plq-worker/worker && npm install
```

3. Put the settings in `/opt/plq-worker/worker/.env` (same keys as
   `.env.example`). Keep the file readable only by root: `chmod 600 .env`.
4. Install the service and start it:

```bash
sudo cp deploy/prelaunchqa-worker.service /etc/systemd/system/
sudo systemctl daemon-reload
sudo systemctl enable --now prelaunchqa-worker
journalctl -u prelaunchqa-worker -f
```

No inbound ports are needed — the worker only makes outbound calls.

## Checks it runs today

Page response status, browser console errors, failed requests on the page,
page title, search description, mobile viewport setting, page language,
images without alternative text, form fields without labels, insecure
(`http://`) items on a secure page, and links that go nowhere.

Each check reports `bug`, `needs_review`, or `passed`, always with the
evidence it was based on.
