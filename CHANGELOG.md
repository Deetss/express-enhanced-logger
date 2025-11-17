# [2.0.0](https://github.com/Deetss/express-enhanced-logger/compare/v1.0.0...v2.0.0) (2025-11-17)


### Features

* add semantic-release for automated versioning and CI/CD ([7ad0db2](https://github.com/Deetss/express-enhanced-logger/commit/7ad0db211806fcb1b3b7ee7f86c427ac1e0881e5))


### BREAKING CHANGES

* Removed manual release scripts (release:patch, release:minor, etc.)

# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added
- Nothing yet

### Changed
- Nothing yet

### Fixed
- Nothing yet

## [1.0.0] - 2025-11-16

### Added
- Initial release of express-enhanced-logger
- Express middleware for comprehensive request logging
- Prisma SQL query formatting with parameter substitution
- Performance monitoring with configurable thresholds
- Configurable log levels (error, warn, info, debug, query)
- Colored console output with syntax highlighting
- File logging with automatic rotation and compression
- Memory usage tracking and warnings
- Slow request detection and logging
- Truncation of large objects and arrays in logs
- TypeScript support with full type definitions
- Optional Prisma integration that can be enabled/disabled
- Customizable user extraction from requests
- Support for custom metadata in logs
- Request ID tracking through request lifecycle
- Configurable SQL query formatting
- Winston-based logging with daily rotate file support

### Changed
- Nothing (initial release)

### Fixed
- Nothing (initial release)

### Security
- Nothing (initial release)
