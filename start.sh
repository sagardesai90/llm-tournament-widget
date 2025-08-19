#!/bin/bash

echo "🚀 Starting LLM Tournament Widget..."

# Check if .env file exists in backend
if [ ! -f "backend/.env" ]; then
    echo "⚠️  Warning: backend/.env file not found!"
    echo "   Please create backend/.env with your OpenAI API key:"
    echo "   OPENAI_API_KEY=your_actual_api_key_here"
    echo ""
fi

# Start backend
echo "🐍 Starting backend server..."
cd backend
if [ -d "venv" ]; then
    source venv/bin/activate
else
    echo "📦 Creating virtual environment..."
    python3 -m venv venv
    source venv/bin/activate
    echo "📥 Installing dependencies..."
    pip install -r requirements.txt
fi

echo "🚀 Backend starting on http://localhost:8000"
python3 main.py &
BACKEND_PID=$!

# Wait a moment for backend to start
sleep 3

# Start frontend
echo "⚛️  Starting frontend..."
cd ../frontend
if [ ! -d "node_modules" ]; then
    echo "📥 Installing frontend dependencies..."
    npm install
fi

echo "🚀 Frontend starting on http://localhost:3000"
npm start &
FRONTEND_PID=$!

echo ""
echo "🎉 Both services are starting up!"
echo "   Backend: http://localhost:8000"
echo "   Frontend: http://localhost:3000"
echo ""
echo "Press Ctrl+C to stop both services"

# Wait for user to stop
trap "echo '🛑 Stopping services...'; kill $BACKEND_PID $FRONTEND_PID; exit" INT
wait
