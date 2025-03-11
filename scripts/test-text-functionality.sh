#!/bin/bash

# Create the scripts directory if it doesn't exist
mkdir -p scripts

# Change to the project root directory
cd "$(dirname "$0")/.."

echo "===== Setting up test environment ====="

# Create test directories
mkdir -p test-images
mkdir -p test-output

echo "===== Compiling TypeScript scripts ====="
npx tsc --skipLibCheck scripts/download-test-images.ts --outDir dist-scripts --esModuleInterop true --module commonjs
npx tsc --skipLibCheck scripts/test-text-overlay.ts --outDir dist-scripts --esModuleInterop true --module commonjs

echo "===== Downloading test images ====="
node dist-scripts/download-test-images.js

echo ""
echo "===== IMPORTANT ====="
echo "Please replace the placeholder files in the test-images directory with the actual images."
echo "Then press Enter to continue with the text overlay test..."
read -p ""

echo "===== Running text overlay test ====="
node dist-scripts/test-text-overlay.js

echo ""
echo "===== Test completed ====="
echo "Check the test-output directory for the results." 