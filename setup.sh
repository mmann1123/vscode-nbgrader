#!/bin/bash

echo "================================================"
echo "  nbgrader for VS Code - Setup Script"
echo "================================================"
echo ""

# Check for Node.js
if ! command -v node &> /dev/null; then
    echo "❌ Node.js is not installed"
    echo "   Please install Node.js from https://nodejs.org/"
    exit 1
fi

echo "✅ Node.js found: $(node --version)"

# Check for npm
if ! command -v npm &> /dev/null; then
    echo "❌ npm is not installed"
    exit 1
fi

echo "✅ npm found: $(npm --version)"

# Install dependencies
echo ""
echo "📦 Installing dependencies..."
npm install

if [ $? -ne 0 ]; then
    echo "❌ Failed to install dependencies"
    exit 1
fi

echo "✅ Dependencies installed"

# Compile TypeScript
echo ""
echo "🔨 Compiling TypeScript..."
npm run compile

if [ $? -ne 0 ]; then
    echo "❌ Compilation failed"
    exit 1
fi

echo "✅ TypeScript compiled successfully"

# Print next steps
echo ""
echo "================================================"
echo "  ✨ Setup Complete!"
echo "================================================"
echo ""
echo "Next steps:"
echo ""
echo "1. Open this folder in VS Code:"
echo "   code ."
echo ""
echo "2. Press F5 to launch Extension Development Host"
echo ""
echo "3. In the new window, open a .ipynb file"
echo ""
echo "4. Click the tag icon in any cell toolbar"
echo ""
echo "5. See QUICKSTART.md for detailed usage"
echo ""
echo "Optional: Package extension for distribution:"
echo "   npm install -g @vscode/vsce"
echo "   vsce package"
echo ""
