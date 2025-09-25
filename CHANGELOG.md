# Change Log

All notable changes to the "Repomix Runner" extension will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.5.0] - 2025-09-25

### Added

- **JSON Output Format**: New `json` option added to output format settings


## [0.4.3] - 2025-07-24

### Fixed

- Fixed unnecessary `.repomix` folder creation at extension activation
- Fixed bundle name as output name feature when no config file exists
- Fixed JSON config parsing issues with URLs containing double slashes
- Fixed extension crash when bundle config files are manually deleted

### Changed

- Default output format changed from plain text to XML
- Default output file extension changed from `.txt` to `.xml`

### Thanks

- [@DanielePessina ](https://github.com/DanielePessina)
- [@danielraffel](https://github.com/danielraffel)
- [@mihailmariusiondev](https://github.com/mihailmariusiondev)

## [0.4.2] - 2025-04-21

### Changed

- Bundle config inherits from VSCode config and repomix.config.json (priority goes to repomix.config.json)

## [0.4.1] - 2025-04-09

### Changed

- Ignore the demo video in package

## [0.4.0] - 2025-04-09

### Added

- Update bundle UI to integrate it with the VSCode Explorer.
- Add File decoration 📦 to find easilly you bundle files in the explorer.
- You can now create a config per bundle with one click!

## [0.3.3] - 2025-03-21

### Changed

- Update bundle name regex to use bundle name as output dir path.

## [0.3.2] - 2025-03-14

### Changed

- Fix runRepomixOnOpenFiles command on Windows.

## [0.3.1] - 2025-02-28

### Changed

- 📦 Bundle the extension with esbuild to reduce its size.

## [0.3.0] - 2025-02-24

### Added

- 📦 New optional feature: Use bundle name as output file name.
- 🗑️ New context menu command to remove bundle items.
- 📁 Improved UI: Bundle icon changes to a folder when a directory is added.

## [0.2.0] - 2025-02-16

### Added

- 🧠 New `compress` option to intelligently extract essential code (function and class signatures) to reduce token count.

## [0.1.0] - 2025-02-13

### Added

- New repomix view in explorer to regroup all repomix related commands and UI.
- Added a new bundle feature: create and manage custom bundles to package frequently some parts of the app. (special thanks to [@hbnordin2](https://github.com/hbnordin2) for this!).
- Added a new feature: run repomix on selection of files and/or folders.
- Reduce extension size by updating packaging assets.
- New readme with demo video.
- Change the versioning to Semantic Versioning.

### Contributors

- [@hbnordin2](https://github.com/hbnordin2)
- [@GebruikerR](https://github.com/GebruikerR)

## [0.0.17] - 2025-01-31

### Added

- New command **"Repomix Run On Open Files"** to run Repomix only on currently open files.
- Added a new **files icon** in the explorer title for the **"Repomix Run On Open Files"** command.
- Added a friendly notification when no files are open.

**Note:** Open files are passed via the `--include` flag to Repomix. If any **ignore patterns** match the open files, they will still be ignored.

## [0.0.16] - 2025-01-28

### Changed

- Add new supported Repomix config options
  - output.parsableStyle
  - output.headerText
  - output.instructionFilePath
  - output.includeEmptyDirectories
  - ignore.useGitignore
  - tokenCount.encoding

## [0.0.15] - 2025-01-23

### Changed

- Replaced 'strip-json-comments' library with a native implementation to fix import issues in Cursor editor

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
