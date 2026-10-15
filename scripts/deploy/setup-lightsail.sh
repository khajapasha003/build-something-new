#!/usr/bin/env bash
set -euo pipefail

echo "=========================================="
echo "PreLaunchQA Worker Installer for Lightsail"
echo "=========================================="

# 1. Update packages and install Node 20 & Git
echo "[1/5] Updating packages and installing Node.js 20 & Git..."
sudo apt-get update -y
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt-get install -y nodejs git

echo "Node version: $(node -v)"
echo "NPM version: $(npm -v)"

# 2. Clone or update repository
echo "[2/5] Setting up worker code in /opt/plq-worker..."
if [ -d "/opt/plq-worker/.git" ]; then
    echo "Updating existing repository..."
    cd /opt/plq-worker
    sudo git fetch origin main
    sudo git reset --hard origin/main
else
    sudo rm -rf /opt/plq-worker
    sudo git clone https://github.com/khajapasha003/build-something-new.git /opt/plq-worker
fi

cd /opt/plq-worker/worker

# 3. Install dependencies & Playwright Chromium
echo "[3/5] Installing npm dependencies and Playwright Chromium..."
sudo npm install

# 4. Configure .env file
echo "[4/5] Configuring environment variables..."
sudo tee /opt/plq-worker/worker/.env > /dev/null << 'EOF'
PLQ_API_BASE=https://prelaunchqa.com
WORKER_SHARED_SECRET=311606f4085d47d6b8cdd40793365d04d1f41435380644c8bd42a59dff2fc057
WORKER_ID=lightsail-worker-1
POLL_INTERVAL_SECONDS=10
EOF

sudo chmod 600 /opt/plq-worker/worker/.env
sudo chown -R ubuntu:ubuntu /opt/plq-worker

# 5. Setup and start systemd service
echo "[5/5] Enabling and starting prelaunchqa-worker systemd service..."
sudo cp /opt/plq-worker/worker/deploy/prelaunchqa-worker.service /etc/systemd/system/
sudo systemctl daemon-reload
sudo systemctl enable --now prelaunchqa-worker

echo "=========================================="
echo "PreLaunchQA Worker Installed Successfully!"
echo "=========================================="
sudo systemctl status prelaunchqa-worker --no-pager

echo ""
echo "Worker is now running live and polling prelaunchqa.com for scan jobs."
echo "View live logs anytime with: sudo journalctl -u prelaunchqa-worker -f"
