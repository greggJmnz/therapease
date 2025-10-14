#!/bin/bash

echo "🚀 Deploying TherapEase to DigitalOcean..."

# Check if .do directory exists
if [ ! -d ".do" ]; then
    echo "Creating .do directory..."
    mkdir .do
fi

# Check if app.yaml exists
if [ ! -f ".do/app.yaml" ]; then
    echo "❌ .do/app.yaml not found. Please create it first."
    exit 1
fi

# Check if git is initialized
if [ ! -d ".git" ]; then
    echo "Initializing git repository..."
    git init
    git add .
    git commit -m "Initial commit for DigitalOcean deployment"
fi

# Check if remote origin exists
if ! git remote get-url origin > /dev/null 2>&1; then
    echo "Please add your GitHub repository as origin:"
    echo "git remote add origin https://github.com/your-username/therapease.git"
    exit 1
fi

# Generate environment variables if not already done
if [ ! -f "env-vars-generated.txt" ]; then
    echo "Generating environment variables..."
    node generate-env-vars.js > env-vars-generated.txt
    echo "✅ Environment variables generated and saved to env-vars-generated.txt"
fi

# Push to GitHub
echo "Pushing to GitHub..."
git add .
git commit -m "Deploy to DigitalOcean - $(date)"
git push origin main

echo "✅ Code pushed to GitHub!"
echo ""
echo "Next steps:"
echo "1. Go to https://cloud.digitalocean.com/apps"
echo "2. Click 'Create App'"
echo "3. Connect your GitHub repository"
echo "4. DigitalOcean will auto-detect the .do/app.yaml configuration"
echo "5. Set the environment variables in the app settings (see env-vars-generated.txt)"
echo "6. Deploy!"
echo ""
echo "📋 Environment variables to set in DigitalOcean App Platform:"
echo "   (Check env-vars-generated.txt for the actual values)"
echo ""
echo "🔗 Your app URLs will be:"
echo "   - Frontend: https://therapease-frontend.ondigitalocean.app"
echo "   - API: https://therapease-api.ondigitalocean.app"
echo "   - Public Website: https://therapease-public.ondigitalocean.app"
