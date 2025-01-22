# Change Log

All notable changes to the "Repomix Runner" extension will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.0.14] - 2025-01-22

### Added

- File extension handling for output paths in config merging
- New tests for filepath resolution

### Changed

- Modified ignore and include pattern logic from cumulative to overriding behavior between Repomix config (priority) and VSCode config.
- Enhanced config merging logic

## [0.0.13] - 2025-01-20

### Fixed

- Fixed support for repomix.config.json with comments
- Use repomix@latest to be sure to use the latest version of Repomix.

## [0.0.3] - 2024-01-31

### Added

- New setting `repomixRunner.copyMode` to choose between copying file or content
- Progress notifications during Repomix execution
- Support for copying files directly (macOS only)

### Changed

- Improved error handling and user feedback
- Better cleanup of temporary files
- Enhanced test coverage for clipboard operations

## [0.0.2] - 2024-01-30

- Initial release on VS Code Marketplace

## [0.0.1] - 2024-01-30

- Private beta release
