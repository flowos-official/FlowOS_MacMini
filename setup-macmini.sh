#!/bin/bash
set -e

echo "============================================"
echo "  FlowOS Mac Mini Setup Script"
echo "  Date: $(date '+%Y-%m-%d')"
echo "============================================"
echo ""

# ----------------------------
# 1. Xcode Command Line Tools
# ----------------------------
echo "[1/6] Checking Xcode Command Line Tools..."
if ! xcode-select -p &>/dev/null; then
  echo "  Installing Xcode Command Line Tools..."
  xcode-select --install
  echo "  ⏳ Please complete the Xcode CLT install prompt, then re-run this script."
  exit 1
else
  echo "  ✅ Xcode CLT already installed."
fi

# ----------------------------
# 2. Homebrew
# ----------------------------
echo ""
echo "[2/6] Checking Homebrew..."
if ! command -v brew &>/dev/null; then
  echo "  Installing Homebrew..."
  /bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"
  # Add brew to PATH for Apple Silicon
  echo 'eval "$(/opt/homebrew/bin/brew shellenv)"' >> "$HOME/.zprofile"
  eval "$(/opt/homebrew/bin/brew shellenv)"
  echo "  ✅ Homebrew installed."
else
  echo "  ✅ Homebrew already installed."
  brew update
fi

# ----------------------------
# 3. Node.js (via brew, LTS)
# ----------------------------
echo ""
echo "[3/6] Checking Node.js..."
if ! command -v node &>/dev/null; then
  echo "  Installing Node.js 22 (LTS)..."
  brew install node@22
  brew link node@22
  echo "  ✅ Node.js $(node -v) installed."
else
  echo "  ✅ Node.js $(node -v) already installed."
fi

# ----------------------------
# 4. Claude Code
# ----------------------------
echo ""
echo "[4/6] Checking Claude Code..."
if ! command -v claude &>/dev/null; then
  echo "  Installing Claude Code..."
  npm install -g @anthropic-ai/claude-code
  echo "  ✅ Claude Code installed."
else
  echo "  ✅ Claude Code already installed."
fi

# ----------------------------
# 5. OpenClaw
# ----------------------------
echo ""
echo "[5/6] Checking OpenClaw..."
if ! command -v openclaw &>/dev/null; then
  echo "  Installing OpenClaw..."
  npm install -g openclaw@latest
  echo "  ✅ OpenClaw installed."
  echo "  Run 'openclaw onboard' to complete setup."
else
  echo "  ✅ OpenClaw already installed."
fi

# ----------------------------
# 6. Google Chrome
# ----------------------------
echo ""
echo "[6/6] Checking Google Chrome..."
if [ ! -d "/Applications/Google Chrome.app" ]; then
  echo "  Installing Google Chrome..."
  brew install --cask google-chrome
  echo "  ✅ Google Chrome installed."
else
  echo "  ✅ Google Chrome already installed."
fi

# ----------------------------
# Summary
# ----------------------------
echo ""
echo "============================================"
echo "  Setup Complete!"
echo "============================================"
echo ""
echo "Installed:"
command -v brew &>/dev/null && echo "  brew:     $(brew --version | head -1)"
command -v node &>/dev/null && echo "  node:     $(node -v)"
command -v npm &>/dev/null  && echo "  npm:      $(npm -v)"
command -v claude &>/dev/null && echo "  claude:   $(claude --version 2>/dev/null || echo 'installed')"
command -v openclaw &>/dev/null && echo "  openclaw: $(openclaw --version 2>/dev/null || echo 'installed')"
[ -d "/Applications/Google Chrome.app" ] && echo "  chrome:   installed"
echo ""
echo "Next steps:"
echo "  1. Run 'openclaw onboard' to set up OpenClaw"
echo "  2. Run 'claude' to start Claude Code"
echo "============================================"
