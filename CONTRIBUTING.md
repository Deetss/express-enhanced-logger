# Contributing to express-enhanced-logger

Thank you for your interest in contributing! This guide will help you get started with development, testing, and submitting contributions.

## 📋 Table of Contents

- [Getting Started](#-getting-started)
- [Development Workflow](#-development-workflow)
- [Testing](#-testing)
- [Code Standards](#-code-standards)
- [Submitting Changes](#-submitting-changes)
- [Release Process](#-release-process)

## 🚀 Getting Started

### Prerequisites

- Node.js >= 18.0.0
- npm >= 9.0.0
- Git

### Initial Setup

```bash
# Clone the repository
git clone https://github.com/Deetss/express-enhanced-logger.git
cd express-enhanced-logger

# Install dependencies
npm install

# Build the project
npm run build

# Run tests
npm test
```

## 📁 Project Structure

```text
express-enhanced-logger/
├── src/                    # TypeScript source files
│   ├── index.ts           # Main exports and convenience functions
│   ├── logger.ts          # Core EnhancedLogger class
│   ├── types.ts           # TypeScript interfaces and types
│   ├── utils.ts           # Utility functions (colors, formatting, truncation)
│   └── sqlFormatter.ts    # SQL query formatting with smart truncation
├── tests/                 # Test files
│   ├── logger.unit.test.ts      # Logger class tests (38 tests)
│   ├── utils.unit.test.ts       # Utils tests (51 tests)
│   ├── sqlFormatter.unit.test.ts # SQL formatter tests (45 tests)
│   ├── sql-truncation.test.js   # Integration tests for SQL (11 tests)
│   └── integration.test.js      # General integration tests (3 tests)
├── dist/                  # Compiled JavaScript (generated)
├── logs/                  # Log files (generated, gitignored)
├── coverage/              # Test coverage reports (generated)
├── .github/               # GitHub Actions workflows
├── package.json           # Package configuration
├── tsconfig.json          # TypeScript configuration
├── eslint.config.js       # ESLint configuration
├── jest.config.js         # Jest test configuration (in package.json)
├── CHANGELOG.md           # Release notes and version history
├── CONTRIBUTING.md        # This file
├── README.md              # Main documentation
└── LICENSE                # MIT License
```

## � Development Workflow

### Watch Mode

For active development, use watch mode to automatically rebuild on file changes:

```bash
npm run dev
```

This runs TypeScript compiler in watch mode. Changes to `src/**/*.ts` files will automatically trigger a rebuild.

### Making Changes

1. Create a feature branch from `main`:

   ```bash
   git checkout -b feature/your-feature-name
   # or
   git checkout -b fix/bug-description
   ```

2. Make your changes in the `src/` directory

3. Add tests for new functionality in `tests/`

4. Run tests to ensure nothing broke:

   ```bash
   npm test
   ```

5. Build and check for TypeScript errors:

   ```bash
   npm run build
   npm run type-check
   ```

6. Lint and format your code:

   ```bash
   npm run lint
   npm run format
   ```

## 🧪 Testing

We use Jest with TypeScript support for testing. The project currently has **86% test coverage** with **201 passing tests**.

### Running Tests

```bash
# Run all tests
npm test

# Run tests in watch mode (auto-rerun on file changes)
npm run test:watch

# Run tests with coverage report
npm run test:coverage
```

### Test Structure

- **Unit Tests** (`.test.ts`): Test individual functions and classes in isolation
- **Integration Tests** (`.test.js`): Test how components work together

### Writing Tests

1. Create test files alongside the source:
   - `src/logger.ts` → `tests/logger.unit.test.ts`
   - Use descriptive test names
   - Mock external dependencies (chalk, fs, etc.)

2. Follow existing test patterns:

   ```typescript
   describe('Feature Name', () => {
     it('should do something specific', () => {
       // Arrange
       const input = 'test';
      
       // Act
       const result = functionUnderTest(input);
      
       // Assert
       expect(result).toBe('expected');
     });
   });
   ```

3. Aim for high coverage:
   - Test happy paths
   - Test edge cases
   - Test error handling
   - Test with various configurations

### Current Coverage

```text
File             | % Stmts | % Branch | % Funcs | % Lines
-----------------|---------|----------|---------|--------
All files        |   81.17 |    65.09 |      90 |   79.66
 logger.ts       |   48.48 |     22.1 |   66.66 |   48.97
 sqlFormatter.ts |   92.12 |    84.88 |     100 |    91.8
 utils.ts        |     100 |    97.29 |     100 |     100
```

## 🔧 Code Standards

### TypeScript

- Use strict TypeScript configuration
- Provide comprehensive type definitions
- Export interfaces for public APIs
- Use proper JSDoc comments for public methods

### Coding Style

- Use meaningful variable and function names
- Keep functions small and focused
- Prefer composition over inheritance
- Handle errors gracefully with proper logging

### Commit Messages

Follow [Conventional Commits](https://www.conventionalcommits.org/) format:

```text
<type>(<scope>): <subject>

<body>

<footer>
```

**Types:**

- `feat`: New feature
- `fix`: Bug fix
- `docs`: Documentation changes
- `style`: Code style changes (formatting, no logic changes)
- `refactor`: Code refactoring
- `test`: Adding or updating tests
- `chore`: Maintenance tasks, dependency updates
- `perf`: Performance improvements
- `ci`: CI/CD changes

**Examples:**

```text
feat(sql): add smart truncation for large IN clauses
fix(logger): resolve memory leak in request middleware
docs(readme): update installation instructions
test(utils): add tests for truncation edge cases
chore(deps): upgrade winston to v3.17.0
```

## 📥 Submitting Changes

### Pull Request Process

1. **Fork the repository** and create your branch from `main`

2. **Make your changes** following the code standards

3. **Add tests** for any new functionality

4. **Update documentation** if needed:
   - Update README.md for user-facing changes
   - Update CONTRIBUTING.md for dev-facing changes
   - Add JSDoc comments to new public APIs
   - Update CHANGELOG.md for significant changes

5. **Ensure all checks pass**:

   ```bash
   npm run preversion  # Runs type-check, lint, build, and test
   ```

6. **Create a Pull Request** with:
   - Clear title following conventional commits format
   - Description of what changed and why
   - Reference to any related issues
   - Screenshots/examples if applicable

### Code Review Checklist

Before requesting review, ensure:

- [ ] Code follows project style guidelines
- [ ] All tests pass (`npm test`)
- [ ] Test coverage hasn't decreased
- [ ] TypeScript compilation succeeds (`npm run type-check`)
- [ ] Code is linted (`npm run lint`)
- [ ] Code is formatted (`npm run format`)
- [ ] Documentation is updated
- [ ] Commit messages follow conventional format
- [ ] No breaking changes without major version bump discussion
- [ ] All public APIs have TypeScript types and JSDoc comments

## 🚀 Release Process

Releases are handled through semantic versioning and automated via GitHub Actions.

### Version Bumping

```bash
# Patch version (bug fixes): 2.2.0 → 2.2.1
npm version patch

# Minor version (new features): 2.2.0 → 2.3.0
npm version minor

# Major version (breaking changes): 2.2.0 → 3.0.0
npm version major
```

The `preversion` script runs automatically to ensure quality before bumping.

### Publishing

Publishing is automated via GitHub Actions when you push a version tag:

```bash
# After npm version, push with tags
git push origin main --tags
```

Manual publishing (if needed):

```bash
npm run build
npm publish
```

## 🐛 Debugging

### Local Development and Testing

Link the package locally to test in another project:

```bash
# In express-enhanced-logger directory
npm link

# In your test project
npm link express-enhanced-logger

# Now you can import and test your changes
import { createLogger } from 'express-enhanced-logger';

# When done testing, unlink
cd your-test-project
npm unlink express-enhanced-logger

cd express-enhanced-logger
npm unlink
```

### Common Issues

#### TypeScript Compilation Errors

```bash
# Check for TypeScript errors without emitting files
npm run type-check

# Check specific file
npx tsc --noEmit src/logger.ts

# Clean and rebuild
npm run clean
npm run build
```

#### Build Problems

```bash
# Remove all generated files and reinstall
npm run clean
rm -rf node_modules package-lock.json
npm install
npm run build
```

#### Test Failures

```bash
# Run tests with verbose output
npm test -- --verbose

# Run specific test file
npm test -- logger.unit.test

# Run tests in watch mode for debugging
npm run test:watch
```

#### Import/Export Issues

- Verify `dist/index.d.ts` has proper type exports
- Check `package.json` exports field is correct
- Ensure all dependencies are in the correct section (dependencies vs devDependencies vs peerDependencies)

## 📊 Performance Considerations

### Bundle Size

Keep the package lightweight:

```bash
# Check dist folder size
du -sh dist/

# Analyze what's in the build
ls -lh dist/
```

Target: Keep total package size under 100KB (excluding node_modules)

### Memory Efficiency

- Test with large log volumes (1000+ requests)
- Monitor for memory leaks using Node.js profiler
- Profile truncation functions with large data structures
- Use `process.memoryUsage()` to track heap usage

### Performance Testing

```typescript
// Example performance test
const logger = createLogger();
const startTime = performance.now();

for (let i = 0; i < 1000; i++) {
  logger.info('Test message', { iteration: i, data: { /* large object */ } });
}

const duration = performance.now() - startTime;
console.log(`1000 logs took ${duration}ms`);
```

## 🔐 Security Guidelines

### Dependency Security

```bash
# Check for vulnerabilities
npm audit

# Fix automatically if possible
npm audit fix

# Update dependencies
npm update
```

### Code Security Best Practices

- **Never log sensitive data**: passwords, tokens, credit cards, PII
- **Sanitize all inputs**: Prevent log injection attacks
- **Validate configurations**: Ensure user-provided config is safe
- **Use TypeScript**: Type safety prevents many security issues
- **Keep dependencies updated**: Regular security patches

### Security Checklist

- [ ] No sensitive data in logs
- [ ] Input validation for all config options
- [ ] No eval() or Function() constructors
- [ ] Dependencies are up to date
- [ ] No known vulnerabilities (npm audit)

## 📞 Getting Help

- **Questions?** [Open a Discussion](https://github.com/Deetss/express-enhanced-logger/discussions)
- **Bug Reports:** [Create an Issue](https://github.com/Deetss/express-enhanced-logger/issues)
- **Feature Requests:** [Create an Issue](https://github.com/Deetss/express-enhanced-logger/issues)
- **Security Issues:** Email security concerns privately

## 🎯 Development Tips

### Useful VSCode Extensions

- **ESLint** - Real-time linting
- **Prettier** - Code formatting
- **Jest** - Test runner integration
- **TypeScript** - Enhanced TS support
- **Error Lens** - Inline error display

### Git Hooks (Recommended)

Consider setting up pre-commit hooks with Husky:

```bash
# Install husky
npm install --save-dev husky

# Setup hooks
npx husky install

# Add pre-commit hook
npx husky add .husky/pre-commit "npm run lint && npm test"
```

### Helpful Commands

```bash
# Watch TypeScript compilation
npm run dev

# Watch tests
npm run test:watch

# Full quality check (runs before version bump)
npm run preversion

# Format all files
npm run format

# Check formatting without changing files
npm run format:check
```

## 🙏 Thank You

Thank you for contributing to express-enhanced-logger! Your time and effort help make this project better for everyone.

---

**Happy Coding!** 🚀
