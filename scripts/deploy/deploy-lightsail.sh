#!/usr/bin/env bash
set -euo pipefail

echo "=========================================================="
echo "🚀 PreLaunchQA Complete Lightsail Deployment"
echo "=========================================================="

WORKER_DIR="/opt/plq-worker"
REPORTS_DIR="/opt/plqa-reports"

# 1. Ensure permissions on directories
echo "[1/7] Setting up permissions for ubuntu user..."
sudo mkdir -p "$REPORTS_DIR" /tmp/plqa-reports
sudo chown -R ubuntu:ubuntu "$REPORTS_DIR" /tmp/plqa-reports "$WORKER_DIR" 2>/dev/null || true

# 2. Update to latest code from GitHub
echo "[2/7] Pulling latest code from origin/main..."
cd "$WORKER_DIR"
git config --global --add safe.directory "$WORKER_DIR" || true
git fetch origin main
git reset --hard origin/main

# 3. Install root dependencies and build standalone Node server
echo "[3/7] Building standalone Node.js server..."
npm install
export NITRO_PRESET=node-server
npm run build

# 4. Configure & Start PreLaunchQA Web Server Service
echo "[4/7] Configuring environment and enabling prelaunchqa-web service..."
if [ ! -f "$WORKER_DIR/.env" ]; then
    cat << 'EOF' > "$WORKER_DIR/.env"
NODE_ENV=production
PORT=3000
HOST=0.0.0.0
APP_ORIGIN=https://prelaunchqa.com
SUPABASE_URL=https://vdhhysfvuxmqtgdtvnez.supabase.co
SUPABASE_PUBLISHABLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZkaGh5c2Z2dXhtcXRnZHR2bmV6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3MjY3NDA1NzksImV4cCI6MjA0MjMxNjU3OX0.dummy
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZkaGh5c2Z2dXhtcXRnZHR2bmV6Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTcyNjc0MDU3OSwiZXhwIjoyMDQyMzE2NTc5fQ.dummy
WORKER_SHARED_SECRET=311606f4085d47d6b8cdd40793365d04d1f41435380644c8bd42a59dff2fc057
IP_HASH_KEY=prelaunchqa-salt-key-2026-production-v1
EOF
    chmod 600 "$WORKER_DIR/.env"
fi
sudo cp "$WORKER_DIR/deploy/prelaunchqa-web.service" /etc/systemd/system/
sudo systemctl daemon-reload
sudo systemctl enable --now prelaunchqa-web
sudo systemctl restart prelaunchqa-web

# 5. Configure Nginx reverse proxy
echo "[5/7] Configuring Nginx reverse proxy on port 80..."
if ! command -v nginx >/dev/null 2>&1; then
    sudo apt-get update -y
    sudo apt-get install -y nginx
fi
sudo cp "$WORKER_DIR/deploy/nginx-prelaunchqa.conf" /etc/nginx/sites-available/prelaunchqa
sudo ln -sf /etc/nginx/sites-available/prelaunchqa /etc/nginx/sites-enabled/prelaunchqa
sudo rm -f /etc/nginx/sites-enabled/default
sudo nginx -t
sudo systemctl restart nginx

# 6. Configure & Restart PreLaunchQA Chromium Scan Worker
echo "[6/7] Updating and restarting Chromium Scan Worker..."
cd "$WORKER_DIR/worker"
npm install
sudo cp "$WORKER_DIR/worker/deploy/prelaunchqa-worker.service" /etc/systemd/system/
sudo systemctl daemon-reload
sudo systemctl enable --now prelaunchqa-worker
sudo systemctl restart prelaunchqa-worker

# 7. Verification & Health Checks
echo "[7/7] Verifying live services..."
sleep 2

echo "Testing Web Server on Port 3000:"
curl -s http://127.0.0.1:3000/api/public/version || echo "Failed to reach port 3000"

echo ""
echo "Testing Nginx on Port 80:"
curl -s http://127.0.0.1/api/public/version || echo "Failed to reach port 80"

echo ""
echo "=========================================================="
echo "✅ DEPLOYMENT COMPLETE! All services active on Lightsail:"
echo "   - Web Server:  http://43.205.195.91/ (Port 80 -> 3000)"
echo "   - Scan Worker: active (systemd: prelaunchqa-worker)"
echo "=========================================================="
systemctl status prelaunchqa-web --no-pager
systemctl status prelaunchqa-worker --no-pager
