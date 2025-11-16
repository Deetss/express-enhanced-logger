# Development Guide

## 🚀 Quick Start

```bash
# Clone the repository
git clone https://github.com/dylandietz/express-enhanced-logger.git
cd express-enhanced-logger

# Install dependencies
npm install

# Start development mode (watch for changes)
npm run dev

# Build the package
npm run build
```

## 📁 Project Structure

```
express-enhanced-logger/
├── src/                    # Source TypeScript files
│   ├── index.ts           # Main exports
│   ├── logger.ts          # Core logger class
│   ├── types.ts           # TypeScript interfaces
│   ├── utils.ts           # Utility functions
│   └── sqlFormatter.ts    # SQL formatting (Prisma integration)
├── dist/                  # Compiled JavaScript (generated)
├── .github/               # GitHub Actions workflows
├── docs/                  # Additional documentation
├── package.json           # Package configuration
├── tsconfig.json          # TypeScript configuration
├── CHANGELOG.md           # Release notes
├── RELEASE.md            # Release process guide
└── README.md             # Main documentation
```

## 🛠️ Development Scripts

| Script | Description |
|--------|-------------|
| `npm run build` | Compile TypeScript to JavaScript |
| `npm run dev` | Watch mode - recompile on file changes |
| `npm run clean` | Remove dist/ folder |
| `npm test` | Run tests (when implemented) |
| `npm run release:patch` | Release patch version |
| `npm run release:minor` | Release minor version |
| `npm run release:major` | Release major version |

## 🧪 Testing

Currently using basic TypeScript compilation as tests. Future improvements:

```bash
# Install test dependencies (future)
npm install --save-dev jest @types/jest ts-jest

# Run tests (future)
npm test

# Run tests in watch mode (future)
npm run test:watch

# Run tests with coverage (future)
npm run test:coverage
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
Follow [Conventional Commits](https://www.conventionalcommits.org/):

```
feat: add new configuration option
fix: resolve memory leak in truncation
docs: update README with new examples
chore: bump dependencies
breaking: change required function signature
```

## 📦 Publishing Workflow

### 1. Development
```bash
# Make changes
git add .
git commit -m "feat: add new feature"

# Test locally
npm run build
npm test
```

### 2. Version Bump
```bash
# For patch (bug fixes)
npm version patch

# For minor (new features)
npm version minor

# For major (breaking changes) 
npm version major
```

### 3. Release
```bash
# Manual release
npm run release:patch

# Or push to main and let GitHub Actions handle it
git push origin main
```

## 🤝 Contributing

### Pull Request Process

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/new-feature`
3. Make your changes
4. Add tests if applicable
5. Update documentation
6. Commit using conventional commit format
7. Push to your fork
8. Create a Pull Request

### Code Review Checklist

- [ ] Code follows project style guidelines
- [ ] Tests pass (when implemented)
- [ ] Documentation is updated
- [ ] CHANGELOG.md is updated for significant changes
- [ ] Commit messages follow conventional format
- [ ] No breaking changes without major version bump
- [ ] TypeScript compilation succeeds
- [ ] All exports are properly typed

## 🐛 Debugging

### Local Development
```bash
# Link package locally for testing
npm link

# In another project
npm link express-enhanced-logger

# Test the changes
# ... use the logger in your test project ...

# Unlink when done
npm unlink express-enhanced-logger
```

### Common Issues

**TypeScript Errors**
```bash
# Check TypeScript compilation
npx tsc --noEmit

# Check specific file
npx tsc --noEmit src/logger.ts
```

**Build Issues**
```bash
# Clean and rebuild
npm run clean
npm run build
```

**Import Issues**
- Check `dist/index.d.ts` for proper type exports
- Verify `package.json` exports field
- Ensure all dependencies are listed correctly

## 📊 Performance Monitoring

### Bundle Size
Keep the package lightweight:
- Monitor `dist/` folder size
- Use dynamic imports for optional features
- Minimize dependencies

### Memory Usage
- Test with large log volumes
- Monitor for memory leaks in truncation functions
- Profile performance with realistic data

## 🔐 Security

### Dependency Security
```bash
# Check for vulnerabilities
npm audit

# Fix automatically if possible
npm audit fix

# Update dependencies
npm update
```

### Code Security
- Sanitize all log inputs
- Avoid logging sensitive information
- Implement proper error handling
- Use TypeScript for type safety

## 📞 Support

- **Issues**: [GitHub Issues](https://github.com/dylandietz/express-enhanced-logger/issues)
- **Documentation**: README.md and source code comments
- **Examples**: See README.md usage examples
- **Releases**: [GitHub Releases](https://github.com/dylandietz/express-enhanced-logger/releases)