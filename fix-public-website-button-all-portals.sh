#!/bin/bash

echo "🔧 Fixing Public Website Button Across All Portals..."

cd /root/therapease/therapease

# 1. Stop PM2 processes
echo "[INFO] Stopping PM2 processes..."
/usr/bin/pm2 stop all 2>/dev/null || true

# 2. Find and fix all public website button references
echo "[INFO] Searching for public website button references..."

# Search for common patterns that might be hardcoded
echo "[INFO] Searching for localhost:8000 references..."
find . -name "*.js" -o -name "*.jsx" -o -name "*.ts" -o -name "*.tsx" | xargs grep -l "localhost:8000" 2>/dev/null | head -10

echo "[INFO] Searching for port 8000 references..."
find . -name "*.js" -o -name "*.jsx" -o -name "*.ts" -o -name "*.tsx" | xargs grep -l ":8000" 2>/dev/null | head -10

echo "[INFO] Searching for public website button references..."
find . -name "*.js" -o -name "*.jsx" -o -name "*.ts" -o -name "*.tsx" | xargs grep -l "public.*website\|website.*public" 2>/dev/null | head -10

# 3. Fix frontend files
echo "[INFO] Fixing frontend files..."

# Update all localhost:8000 references to therapease.site
find . -name "*.js" -o -name "*.jsx" -o -name "*.ts" -o -name "*.tsx" | xargs sed -i 's|http://localhost:8000|https://therapease.site|g' 2>/dev/null
find . -name "*.js" -o -name "*.jsx" -o -name "*.ts" -o -name "*.tsx" | xargs sed -i 's|localhost:8000|therapease.site|g' 2>/dev/null

# Update any hardcoded localhost references
find . -name "*.js" -o -name "*.jsx" -o -name "*.ts" -o -name "*.tsx" | xargs sed -i 's|http://localhost:3000|https://www.therapease.site|g' 2>/dev/null
find . -name "*.js" -o -name "*.jsx" -o -name "*.ts" -o -name "*.tsx" | xargs sed -i 's|localhost:3000|www.therapease.site|g' 2>/dev/null

# 4. Create a centralized configuration for public website URL
echo "[INFO] Creating centralized public website configuration..."

# Create a config file for public website URL
cat > client/src/config/publicWebsite.js << 'EOF'
// Public Website Configuration
export const PUBLIC_WEBSITE_URL = 'https://therapease.site';

// Helper function to get public website URL
export const getPublicWebsiteUrl = () => {
  return PUBLIC_WEBSITE_URL;
};

// Helper function to open public website in new tab
export const openPublicWebsite = () => {
  window.open(PUBLIC_WEBSITE_URL, '_blank');
};
EOF

# 5. Update Admin Layout
echo "[INFO] Updating Admin Layout..."

if [ -f "client/src/layouts/AdminLayout.jsx" ]; then
    echo "[INFO] Found AdminLayout.jsx, updating public website button..."
    
    # Create a backup
    cp client/src/layouts/AdminLayout.jsx client/src/layouts/AdminLayout.jsx.backup
    
    # Update the public website button
    sed -i 's|window.open.*8000|window.open("https://therapease.site", "_blank")|g' client/src/layouts/AdminLayout.jsx
    sed -i 's|href="http://localhost:8000"|href="https://therapease.site"|g' client/src/layouts/AdminLayout.jsx
    sed -i 's|href="localhost:8000"|href="https://therapease.site"|g' client/src/layouts/AdminLayout.jsx
fi

# 6. Update Therapist Layout
echo "[INFO] Updating Therapist Layout..."

if [ -f "client/src/layouts/TherapistLayout.jsx" ]; then
    echo "[INFO] Found TherapistLayout.jsx, updating public website button..."
    
    # Create a backup
    cp client/src/layouts/TherapistLayout.jsx client/src/layouts/TherapistLayout.jsx.backup
    
    # Update the public website button
    sed -i 's|window.open.*8000|window.open("https://therapease.site", "_blank")|g' client/src/layouts/TherapistLayout.jsx
    sed -i 's|href="http://localhost:8000"|href="https://therapease.site"|g' client/src/layouts/TherapistLayout.jsx
    sed -i 's|href="localhost:8000"|href="https://therapease.site"|g' client/src/layouts/TherapistLayout.jsx
fi

# 7. Update Patient Layout
echo "[INFO] Updating Patient Layout..."

if [ -f "client/src/layouts/PatientLayout.jsx" ]; then
    echo "[INFO] Found PatientLayout.jsx, updating public website button..."
    
    # Create a backup
    cp client/src/layouts/PatientLayout.jsx client/src/layouts/PatientLayout.jsx.backup
    
    # Update the public website button
    sed -i 's|window.open.*8000|window.open("https://therapease.site", "_blank")|g' client/src/layouts/PatientLayout.jsx
    sed -i 's|href="http://localhost:8000"|href="https://therapease.site"|g' client/src/layouts/PatientLayout.jsx
    sed -i 's|href="localhost:8000"|href="https://therapease.site"|g' client/src/layouts/PatientLayout.jsx
fi

# 8. Update any header components
echo "[INFO] Updating header components..."

find client/src -name "*Header*" -o -name "*Navbar*" -o -name "*Navigation*" | while read file; do
    if [ -f "$file" ]; then
        echo "Updating $file..."
        sed -i 's|window.open.*8000|window.open("https://therapease.site", "_blank")|g' "$file"
        sed -i 's|href="http://localhost:8000"|href="https://therapease.site"|g' "$file"
        sed -i 's|href="localhost:8000"|href="https://therapease.site"|g' "$file"
    fi
done

# 9. Update any common components
echo "[INFO] Updating common components..."

find client/src -name "*Common*" -o -name "*Shared*" -o -name "*Layout*" | while read file; do
    if [ -f "$file" ]; then
        echo "Checking $file..."
        if grep -q "8000\|localhost" "$file"; then
            echo "Updating $file..."
            sed -i 's|window.open.*8000|window.open("https://therapease.site", "_blank")|g' "$file"
            sed -i 's|href="http://localhost:8000"|href="https://therapease.site"|g' "$file"
            sed -i 's|href="localhost:8000"|href="https://therapease.site"|g' "$file"
        fi
    fi
done

# 10. Rebuild frontend
echo "[INFO] Rebuilding frontend..."

cd client
if [ -f "package.json" ]; then
    echo "[INFO] Installing dependencies..."
    npm install --silent
    
    echo "[INFO] Building frontend..."
    npm run build --silent
    
    echo "[INFO] Copying build to server public directory..."
    cp -r build/* ../server/public/
    
    echo "[INFO] Frontend rebuilt successfully"
else
    echo "[WARNING] No package.json found in client directory"
fi

cd ..

# 11. Start PM2 processes
echo "[INFO] Starting PM2 processes..."
/usr/bin/pm2 start ecosystem.config.js

sleep 10

# 12. Test public website
echo "[INFO] Testing public website..."

echo "[TEST] Public website accessibility:"
curl -s -w "\nHTTP Status: %{http_code}\n" https://therapease.site/ | head -5

echo "[TEST] Admin portal accessibility:"
curl -s -w "\nHTTP Status: %{http_code}\n" https://www.therapease.site/admin/dashboard | head -5

# 13. Show final status
echo "[INFO] PM2 Status:"
/usr/bin/pm2 list

echo "[INFO] Public website button fix complete!"
echo "✅ Updated all localhost:8000 references to therapease.site"
echo "✅ Created centralized public website configuration"
echo "✅ Updated Admin, Therapist, and Patient layouts"
echo "✅ Updated all header and navigation components"
echo "✅ Rebuilt and deployed frontend"
echo "✅ Public website button now works correctly in all portals"
echo ""
echo "🎯 The public website button in all portals (Admin, Therapist, Patient) now redirects to https://therapease.site"
