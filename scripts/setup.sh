#!/bin/bash
echo "🔧 Setting up DevMart Pro development environment..."

# Install dependencies
echo "📦 Installing dependencies..."
npm install

# Install VS Code extensions (if VS Code is available)
if command -v code &> /dev/null; then
    echo "🔌 Installing recommended VS Code extensions..."
    code --install-extension bradlc.vscode-tailwindcss
    code --install-extension esbenp.prettier-vscode
    code --install-extension dbaeumer.vscode-eslint
    code --install-extension ms-vscode.vscode-typescript-next
fi

# Initialize Husky
echo "🐶 Setting up Git hooks..."
npx husky install

echo "✅ Setup complete! Run 'npm run dev' to start development."