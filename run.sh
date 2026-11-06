#!/usr/bin/env bash
# Launch script for Student Project Idea Recommender System

cd "$(dirname "$0")"

echo "=========================================================="
echo " Starting Student Project Idea Recommender System"
echo "=========================================================="

# Check Python 3
if ! command -v python3 &> /dev/null; then
    echo "Error: python3 is not installed or not in PATH."
    exit 1
fi

# Initialize database if needed
python3 -c "import database; database.init_db()"

# Start server
PORT=${1:-8000}
echo "Server starting at http://localhost:$PORT"
python3 app.py
