#!/bin/bash

# Build ES modules
echo "🔨 Building ES modules..."
tsc

# Build CommonJS
echo "🔨 Building CommonJS..."
tsc -p tsconfig.cjs.json

# Copy CommonJS build to dist with .cjs extension
echo "📦 Creating CommonJS .cjs files..."
cp dist-cjs/index.js dist/index.cjs
cp dist-cjs/logger.js dist/logger.cjs
cp dist-cjs/utils.js dist/utils.cjs
cp dist-cjs/sqlFormatter.js dist/sqlFormatter.cjs
cp dist-cjs/controllerHelpers.js dist/controllerHelpers.cjs

# Clean up temporary CommonJS dist folder
echo "🧹 Cleaning up..."
rm -rf dist-cjs

echo "✅ Dual build complete! ES modules and CommonJS ready."
