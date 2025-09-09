#!/bin/bash

# Deploy Chatbot UI to GitHub
# Usage: ./deploy-to-github.sh <repository-name>

REPO_NAME=${1:-chatbot-ui}
COMMIT_MESSAGE="Initial commit: Chatbot UI with webhook integration"

echo "🚀 Deploying Chatbot UI to GitHub..."
echo "Repository name: $REPO_NAME"

# Initialize git if not already initialized
if [ ! -d ".git" ]; then
    echo "📁 Initializing git repository..."
    git init
fi

# Add all files
echo "📝 Adding files..."
git add .

# Create .gitignore if it doesn't exist
if [ ! -f ".gitignore" ]; then
    echo "📋 Creating .gitignore..."
    cat > .gitignore << EOF
# Dependencies
node_modules/
npm-debug.log*

# Environment variables
.env
.env.local
.env.development.local
.env.test.local
.env.production.local

# IDE files
.vscode/
.idea/
*.swp
*.swo

# OS files
.DS_Store
Thumbs.db

# Logs
*.log

# Build outputs
dist/
build/
EOF
    git add .gitignore
fi

# Commit changes
echo "💾 Committing changes..."
git commit -m "$COMMIT_MESSAGE"

# Add GitHub remote (you'll need to create the repo on GitHub first)
echo "🔗 Adding GitHub remote..."
echo "Make sure you've created the repository '$REPO_NAME' on GitHub first!"
git remote add origin https://github.com/$(git config user.name)/$REPO_NAME.git

# Push to GitHub
echo "⬆️ Pushing to GitHub..."
git branch -M main
git push -u origin main

echo "✅ Successfully deployed to: https://github.com/$(git config user.name)/$REPO_NAME"
echo "🌐 GitHub Pages URL (if enabled): https://$(git config user.name).github.io/$REPO_NAME"
