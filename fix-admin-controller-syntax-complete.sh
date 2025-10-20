#!/bin/bash

echo "🔧 Fixing Admin Controller Syntax Errors..."

# Navigate to the server directory
cd /root/therapease/therapease/server

# Backup the current admin controller
echo "[INFO] Creating backup of adminController.js..."
cp controllers/adminController.js controllers/adminController.js.backup.$(date +%Y%m%d_%H%M%S)

# Fix the malformed map functions
echo "[INFO] Fixing malformed map functions..."

# Fix getTherapists method (line 1483)
sed -i '1483s/const formattedTherapists = therapists.map/const formattedTherapists = therapists.map(therapist => ({/' controllers/adminController.js

# Fix getAvailableTherapists method (line 1891)
sed -i '1891s/const formattedTherapists = filteredTherapists.map/const formattedTherapists = filteredTherapists.map(therapist => ({/' controllers/adminController.js

# Fix getAllUsers method (line 1603)
sed -i '1603s/const formattedUsers = users.map/const formattedUsers = users.map(user => ({/' controllers/adminController.js

# Fix getPatientsWithAssignments method (line 3106)
sed -i '3106s/const formattedPatients = patientsWithAssignments.map/const formattedPatients = patientsWithAssignments.map(patient => ({/' controllers/adminController.js

# Fix missing closing parentheses and semicolons
echo "[INFO] Fixing missing closing parentheses and semicolons..."

# Fix getTherapists method closing
sed -i '1511s/;/});/' controllers/adminController.js

# Fix getAvailableTherapists method closing
sed -i '1904s/;/});/' controllers/adminController.js

# Fix getAllUsers method closing
sed -i '1643s/;/});/' controllers/adminController.js

# Fix getPatientsWithAssignments method closing
sed -i '3128s/;/});/' controllers/adminController.js

# Fix missing semicolons at end of functions
echo "[INFO] Fixing missing semicolons..."

# Fix getUsers method
sed -i '344s/;/};/' controllers/adminController.js

# Fix getTherapists method
sed -i '1525s/;/};/' controllers/adminController.js

# Fix getAvailableTherapists method
sed -i '1918s/;/};/' controllers/adminController.js

# Fix getAllUsers method
sed -i '1659s/;/};/' controllers/adminController.js

# Fix getPatientsWithAssignments method
sed -i '3145s/;/};/' controllers/adminController.js

# Fix getUserById method
sed -i '442s/;/};/' controllers/adminController.js

# Fix getPatientTherapists method
sed -i '3039s/;/};/' controllers/adminController.js

# Fix createUser method
sed -i '3356s/;/};/' controllers/adminController.js

echo "[INFO] Syntax fixes applied successfully!"

# Restart the API server
echo "[INFO] Restarting API server..."
/usr/local/bin/pm2 restart therapease-api

# Wait for server to start
sleep 5

# Test the endpoints
echo "[INFO] Testing admin endpoints..."

# Test therapists endpoint
echo "[INFO] Testing /api/admin/therapists..."
THERAPISTS_RESPONSE=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:5000/api/admin/therapists)
if [ "$THERAPISTS_RESPONSE" = "200" ]; then
    echo "✅ Therapists endpoint: HTTP $THERAPISTS_RESPONSE"
else
    echo "❌ Therapists endpoint: HTTP $THERAPISTS_RESPONSE"
fi

# Test patients endpoint
echo "[INFO] Testing /api/admin/patients..."
PATIENTS_RESPONSE=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:5000/api/admin/patients)
if [ "$PATIENTS_RESPONSE" = "200" ]; then
    echo "✅ Patients endpoint: HTTP $PATIENTS_RESPONSE"
else
    echo "❌ Patients endpoint: HTTP $PATIENTS_RESPONSE"
fi

# Test notifications endpoint
echo "[INFO] Testing /api/admin/notifications..."
NOTIFICATIONS_RESPONSE=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:5000/api/admin/notifications)
if [ "$NOTIFICATIONS_RESPONSE" = "200" ]; then
    echo "✅ Notifications endpoint: HTTP $NOTIFICATIONS_RESPONSE"
else
    echo "❌ Notifications endpoint: HTTP $NOTIFICATIONS_RESPONSE"
fi

echo "[INFO] Admin controller syntax fix complete!"
echo "[INFO] Check PM2 logs if any endpoints still fail:"
echo "       /usr/local/bin/pm2 logs therapease-api --lines 20"
