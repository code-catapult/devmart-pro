# Test Code Quality and Setup

## Test linting (from apps/web directory)

cd apps/web
npm run lint

## Test formatting (from root directory)

cd ../..
npm run format

## Available Scripts

**⚠️ Important: Script Execution Locations**

**Root Directory Scripts** (run from project root):

- \`npm run format\` - Format code with Prettier (all files)
- \`npm run dev\` - Start all development servers via Turbo
- \`npm run build\` - Build all packages via Turbo
- \`npm run lint\` - Lint all packages via Turbo

**App-Specific Scripts** (run from \`apps/web/\`):

- \`npm run dev\` - Start Next.js development server only
- \`npm run build\` - Build Next.js app only
- \`npm run lint\` - Lint Next.js app only
- \`npm run type-check\` - TypeScript checking for Next.js app
- \`npm test\` - Run Jest tests for Next.js app
