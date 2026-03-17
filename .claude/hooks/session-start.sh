#!/bin/bash
set -euo pipefail

# Only run in remote (Claude Code on the web) environments
if [ "${CLAUDE_CODE_REMOTE:-}" != "true" ]; then
  exit 0
fi

PROJECT_DIR="$CLAUDE_PROJECT_DIR/Generic-ERP-Front-End"

echo "Installing npm dependencies..."
cd "$PROJECT_DIR"
npm install

echo "Session start complete."
