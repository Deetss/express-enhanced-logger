# Release Management Guide

This document outlines the release process for `express-enhanced-logger` package.

## 📋 Quick Release Commands

### Patch Release (Bug fixes: 1.0.0 → 1.0.1)
```bash
npm run release:patch
```

### Minor Release (New features: 1.0.0 → 1.1.0)
```bash
npm run release:minor
```

### Major Release (Breaking changes: 1.0.0 → 2.0.0)
```bash
npm run release:major
```

### Pre-release Versions
```bash
# Beta version (1.0.0 → 1.0.1-beta.0)
npm run release:beta

# Alpha version (1.0.0 → 1.0.1-alpha.0)
npm run release:alpha
```

## 🔄 Semantic Versioning

We follow [Semantic Versioning (SemVer)](https://semver.org/):

- **MAJOR** version when you make incompatible API changes
- **MINOR** version when you add functionality in a backwards compatible manner
- **PATCH** version when you make backwards compatible bug fixes

### Examples:

| Change Type | Version | Example |
|-------------|---------|---------|
| Bug fix | `1.0.0` → `1.0.1` | Fix SQL query formatting issue |
| New feature | `1.0.0` → `1.1.0` | Add new configuration option |
| Breaking change | `1.0.0` → `2.0.0` | Change required function signature |

## 📝 Release Process

### 1. Pre-Release Checklist

- [ ] All tests pass (`npm test`)
- [ ] Code builds without errors (`npm run build`)
- [ ] README is updated with new features
- [ ] CHANGELOG.md is updated (see below)
- [ ] Version bump is appropriate for changes
- [ ] All dependencies are up to date

### 2. Create Release

```bash
# For patch releases (most common)
npm run release:patch

# The script will:
# 1. Run build
# 2. Bump version in package.json
# 3. Create git tag
# 4. Push to GitHub
# 5. Publish to npm
```

### 3. Post-Release

- [ ] Verify package is published on [npm](https://www.npmjs.com/package/express-enhanced-logger)
- [ ] Check that GitHub release is created
- [ ] Update dependent projects to use new version
- [ ] Announce release (if significant)

## 📋 Manual Release Process

If you need more control over the release:

### Step 1: Update Version
```bash
# Check current version
npm version --no-git-tag-version

# Bump version (choose one)
npm version patch --no-git-tag-version  # 1.0.0 → 1.0.1
npm version minor --no-git-tag-version  # 1.0.0 → 1.1.0
npm version major --no-git-tag-version  # 1.0.0 → 2.0.0
```

### Step 2: Update Changelog
```bash
# Add entry to CHANGELOG.md (see format below)
```

### Step 3: Commit and Tag
```bash
git add .
git commit -m "chore: release v$(node -p "require('./package.json').version")"
git tag "v$(node -p "require('./package.json').version")"
```

### Step 4: Build and Publish
```bash
npm run build
npm publish
```

### Step 5: Push Changes
```bash
git push origin main
git push origin --tags
```

## 📝 Changelog Format

Keep CHANGELOG.md updated with this format:

```markdown
# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added
- New features that have been added

### Changed
- Changes in existing functionality

### Deprecated
- Soon-to-be removed features

### Removed
- Features that have been removed

### Fixed
- Bug fixes

### Security
- Vulnerability fixes

## [1.1.0] - 2025-11-16

### Added
- New configuration option for custom log formatting
- Support for multiple logger instances

### Fixed
- Memory leak in log truncation function

## [1.0.0] - 2025-11-16

### Added
- Initial release
- Express middleware for request logging
- Prisma SQL query formatting
- Performance monitoring
- Configurable log levels and output
```

## 🚀 Automated Releases with GitHub Actions

For fully automated releases, we have GitHub Actions set up:

### Automatic Patch Releases
Push to `main` branch with commit message starting with `fix:` triggers patch release.

### Automatic Minor Releases  
Push to `main` branch with commit message starting with `feat:` triggers minor release.

### Manual Major Releases
Use the GitHub UI to create a release with tag `v2.0.0` etc.

## 🔧 Troubleshooting

### Common Issues

**"npm ERR! 403 Forbidden"**
- Make sure you're logged in: `npm login`
- Check if you have publish rights to the package

**"Version already exists"**
- Check current version: `npm view express-enhanced-logger version`
- Bump version appropriately

**"Git working directory not clean"**
- Commit or stash changes before releasing
- Use `git status` to check

**"Tests failed"**
- Fix failing tests before releasing
- Run `npm test` to verify

### Emergency Patches

If you need to patch an older version:

```bash
# Check out the tag you want to patch
git checkout v1.0.0

# Create a branch
git checkout -b hotfix/v1.0.1

# Make your fixes
# ... edit files ...

# Release the patch
npm version patch
npm publish

# Push the changes
git push origin hotfix/v1.0.1
git push origin --tags
```

## 📊 Release Analytics

Track your releases:

- **npm downloads**: https://npm-stat.com/charts.html?package=express-enhanced-logger
- **GitHub releases**: Check the releases tab on GitHub
- **Dependents**: See who's using your package on GitHub

## 🎯 Best Practices

1. **Always test before releasing**
2. **Use descriptive commit messages**
3. **Keep changelog up to date**
4. **Don't skip versions** (1.0.0 → 1.0.1, not 1.0.0 → 1.0.3)
5. **Use pre-releases for experimental features**
6. **Tag releases for easy rollback**
7. **Document breaking changes clearly**

## 📞 Support

If you need help with releases:
1. Check this documentation
2. Look at previous releases on GitHub
3. Check npm package page for published versions
4. Review git tags: `git tag --list`