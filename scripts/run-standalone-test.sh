#!/bin/bash

# Change to the project root directory
cd "$(dirname "$0")/.."

echo "===== Setting up test environment ====="

# Create test directories
mkdir -p test-images
mkdir -p test-output

echo "===== IMPORTANT ====="
echo "Please place your test images in the test-images directory with the following names:"
echo "- 0c67054a-92ec-4cce-8af8-f6532938bb03_preview.png"
echo "- 310ed933-c38d-45a6-a929-8bbd41ae41df_preview.png"
echo "- 995f1511-0560-4b4f-982c-1d69a9fa9709_preview.png"
echo ""
echo "Press Enter when you're ready to continue..."
read -p ""

echo "===== Running standalone text overlay test ====="
node scripts/standalone-text-test.js

echo ""
echo "===== Test completed ====="
echo "Check the test-output directory for the results." 