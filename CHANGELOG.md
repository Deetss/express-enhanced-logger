# [2.6.0](https://github.com/Deetss/express-enhanced-logger/compare/v2.5.0...v2.6.0) (2025-11-21)


### Features

* Add comprehensive unit tests for `EnhancedLogger` and remove `enableSqlFormatting` and `enablePrismaIntegration` configuration options. ([677bb19](https://github.com/Deetss/express-enhanced-logger/commit/677bb199892ff159bd7d63940f6f6afc4a7d82f6))

# [2.5.0](https://github.com/Deetss/express-enhanced-logger/compare/v2.4.1...v2.5.0) (2025-11-17)


### Features

* add Rails-style logging support and dual module system for enhanced logger ([8c5df6f](https://github.com/Deetss/express-enhanced-logger/commit/8c5df6fe9499288fc59ad440788ade59f18bc840))

## [2.4.1](https://github.com/Deetss/express-enhanced-logger/compare/v2.4.0...v2.4.1) (2025-11-17)


### Bug Fixes

* truncate query and params in slow query logging for better readability ([88c44a8](https://github.com/Deetss/express-enhanced-logger/commit/88c44a8735936e7eb93a56dfe8788a5607344982))

# [2.4.0](https://github.com/Deetss/express-enhanced-logger/compare/v2.3.2...v2.4.0) (2025-11-17)


### Features

* add Prisma integration with logging setup and enhance logger configuration ([25b8e23](https://github.com/Deetss/express-enhanced-logger/commit/25b8e239c52add32a4503bea2866de58824b241f))

## [2.3.2](https://github.com/Deetss/express-enhanced-logger/compare/v2.3.1...v2.3.2) (2025-11-17)


### Bug Fixes

* update README and logger to clarify Prisma integration requirements and improve SQL query truncation handling ([51b1b95](https://github.com/Deetss/express-enhanced-logger/commit/51b1b9570422002f271a11c1555d90e5c785fec3))

## [2.3.1](https://github.com/Deetss/express-enhanced-logger/compare/v2.3.0...v2.3.1) (2025-11-17)


### Bug Fixes

* refactor smartTruncateQuery to truncate all large IN clauses in SQL queries ([3cf1271](https://github.com/Deetss/express-enhanced-logger/commit/3cf12714c8994e94a148dfcaf117e8f15b175c75))

# [2.3.0](https://github.com/Deetss/express-enhanced-logger/compare/v2.2.0...v2.3.0) (2025-11-17)


### Bug Fixes

* remove NPM_TOKEN requirement and update repository URL in release configuration ([5b86be3](https://github.com/Deetss/express-enhanced-logger/commit/5b86be33649b0953de18443b18c4d00956bd4061))
* remove unused NPM_TOKEN from semantic release step ([211a93c](https://github.com/Deetss/express-enhanced-logger/commit/211a93ccda6ea2d69747b17ee7de18a0ac05de73))
* update Node.js version in CI/CD workflow to 22.x ([d4ef8d3](https://github.com/Deetss/express-enhanced-logger/commit/d4ef8d3e687fa45c2cba029d1d665647bf1b0bf8))
* update Node.js version in CI/CD workflow to 23.x ([8f0d9ef](https://github.com/Deetss/express-enhanced-logger/commit/8f0d9ef1e55c65058b89fdfb176ed6397f6cba50))


### Features

* enable npm provenance in release configuration and remove unused registry URL ([785a2d8](https://github.com/Deetss/express-enhanced-logger/commit/785a2d86c147024a7c46e61a36407fc59a951364))
* enhance semantic release workflow to include npm publish and provenance ([ab0b598](https://github.com/Deetss/express-enhanced-logger/commit/ab0b59855148af0439563ac5c6b05a81c97b6c1b))

# [2.2.0](https://github.com/Deetss/express-enhanced-logger/compare/v2.1.0...v2.2.0) (2025-11-17)


### Bug Fixes

* update release configuration to include NPM_TOKEN and streamline npm plugin setup ([273f95f](https://github.com/Deetss/express-enhanced-logger/commit/273f95fcf965d99b949013773c911454c59c3ebc))


### Features

* update release workflow to use semantic-release for versioning and changelog generation ([315fc71](https://github.com/Deetss/express-enhanced-logger/commit/315fc71b75896991048dcc2da344bb57861fe48d))

# [2.1.0](https://github.com/Deetss/express-enhanced-logger/compare/v2.0.0...v2.1.0) (2025-11-17)

### Features

- Enhance project structure and tooling ([f7493da](https://github.com/Deetss/express-enhanced-logger/commit/f7493daee1b3ddfb7320cce5df6976488daadd95))

# [2.0.0](https://github.com/Deetss/express-enhanced-logger/compare/v1.0.0...v2.0.0) (2025-11-17)

### Features

- add semantic-release for automated versioning and CI/CD ([7ad0db2](https://github.com/Deetss/express-enhanced-logger/commit/7ad0db211806fcb1b3b7ee7f86c427ac1e0881e5))

### BREAKING CHANGES

- Removed manual release scripts (release:patch, release:minor, etc.)

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
