#!/bin/bash

echo "🧪 Running Frontend Tests for LLM Tournament Widget..."
echo "=" * 50

# Check if we're in the frontend directory
if [ ! -f "package.json" ]; then
    echo "❌ Error: This script must be run from the frontend directory"
    echo "   Please run: cd frontend && ./run_tests.sh"
    exit 1
fi

# Check if node_modules exists
if [ ! -d "node_modules" ]; then
    echo "📦 Installing dependencies..."
    npm install
fi

# Run tests with coverage
echo "🚀 Starting tests..."
npm test -- --coverage --watchAll=false --verbose

echo ""
echo "🎉 Frontend tests completed!"
echo "📁 Coverage report generated in coverage/ directory"
