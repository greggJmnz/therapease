#!/bin/bash

echo "🎯 TherapEase EADDRINUSE Fix Script"
echo "==================================="

# 1. Check for processes using port 5000
echo "1. 🔍 Checking for processes using port 5000..."
PID=$(lsof -t -i :5000)

if [ -z "$PID" ]; then
    echo "   ✅ No process found using port 5000. Skipping kill."
else
    # 2. Kill the identified process(es)
    echo "   ❌ Process(es) found with PID(s): $PID"
    echo "2. 💀 Attempting to kill process(es) $PID..."
    
    # Use 'kill -9' for a forceful kill, which is often necessary when a process is hung or not responding to a regular kill.
    # Note: Using kill -9 should be a last resort, but is appropriate here to ensure a clean test run.
    kill -9 $PID
    
    # 3. Verify the process is killed
    sleep 1 # Give the system a moment to clear the port
    VERIFY_PID=$(lsof -t -i :5000)
    
    if [ -z "$VERIFY_PID" ]; then
        echo "   ✅ Successfully killed process(es) $PID."
    else
        echo "   ⚠️ Warning: Failed to kill process(es) $PID. Port 5000 might still be in use."
    fi
fi

echo "3. 🔄 Re-running the server fix script to test a clean start..."
# The original step 2 in your workflow:
node final-websocket-and-admin-fix.js

echo ""
echo "4. 🧪 Re-running the endpoint tests..."
# The original step 3 in your workflow:
node test-all-endpoints.js

echo ""
echo "💡 EADDRINUSE Fix Script Complete."
