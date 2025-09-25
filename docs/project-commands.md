# Project Commands and Scripts

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

## Tests

- \`npm test\` - Runs Jest test suite once and exits
- \`npm run test:db\` - Runs the database test script
- \`npm run test:watch\` - Runs Jest tests in watch mode, re-running tests when files change
- \`npm run test:coverage\` - Generates code coverage reports showing testing completeness
- - \`npm run test:ci\` - Optimized for continuous integration with coverage and no interactivity
