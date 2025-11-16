#!/bin/bash

echo "==============================================="
echo "  AI Mentor - Starting Backend Server"
echo "==============================================="
echo ""

# Check if venv exists
if [ ! -d "venv" ]; then
    echo "ERROR: Virtual environment not found!"
    echo "Please run: python -m venv venv"
    echo "Then install dependencies: pip install -r backend/requirements.txt"
    exit 1
fi

# Activate virtual environment
echo "Activating virtual environment..."
source venv/bin/activate

# Check for .env file
if [ ! -f "backend/.env" ]; then
    echo "WARNING: backend/.env file not found!"
    echo "Please create it with your OPENAI_API_KEY"
    echo ""
    echo "Example:"
    echo "OPENAI_API_KEY=sk-your-key-here"
    echo ""
    read -p "Press enter to continue anyway..."
fi

# Start backend
echo ""
echo "Starting FastAPI server..."
echo "Backend will be available at: http://localhost:8000"
echo "API Documentation: http://localhost:8000/docs"
echo ""
echo "Press Ctrl+C to stop the server"
echo ""

uvicorn backend.app:app --reload

