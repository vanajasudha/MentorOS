#!/bin/bash

echo "==============================================="
echo "  AI Mentor - Starting Frontend"
echo "==============================================="
echo ""

# Check if node_modules exists
if [ ! -d "frontend/node_modules" ]; then
    echo "ERROR: node_modules not found!"
    echo "Please run: cd frontend && npm install"
    exit 1
fi

# Navigate to frontend and start
cd frontend

echo "Starting Vite development server..."
echo "Frontend will be available at: http://localhost:3000"
echo ""
echo "Press Ctrl+C to stop the server"
echo ""

npm run dev

