#!/bin/bash
set -e

# The published package is the CommonJS build in dist-cjs/.
# The ESM build in dist/ is only used by the integration tests.

echo "🔨 Building ES modules..."
tsc

echo "🔨 Building CommonJS..."
tsc -p tsconfig.cjs.json

echo "✅ Build complete."
