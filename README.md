<div align="center">
  <img src="https://raw.githubusercontent.com/massdo/repomix-runner/main/assets/repomix-logo.png" alt="Repomix" width="200" height="auto" />
</div>

# Repomix Runner

[![Version](https://img.shields.io/visual-studio-marketplace/v/DorianMassoulier.repomix-runner)](https://marketplace.visualstudio.com/items?itemName=DorianMassoulier.repomix-runner)
[![Installs](https://img.shields.io/visual-studio-marketplace/i/DorianMassoulier.repomix-runner)](https://marketplace.visualstudio.com/items?itemName=DorianMassoulier.repomix-runner)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

Repomix Runner is a VS Code extension that runs the [Repomix](https://github.com/yamadashy/repomix) command line tool.

## ✨ Features

- 📁 Run Repomix on any folder easily.
- 🗑️ Optional output file cleanup. -> But you still have it in clipboard.
- 🔄 Two copy modes: content or file. -> you can paste a whole file not just content.
- 🛠️ easy settings in vscode and/or support a repomix.config.json file.

## 📖 Usage

<div align="left">
  <img src="https://raw.githubusercontent.com/massdo/repomix-runner/main/assets/demo.png" alt="Repomix" width="auto" height="400" />
</div>

To pack the whole project, click on the square icon <img src="https://raw.githubusercontent.com/massdo/repomix-runner/main/assets/repomix-logo.png" alt="Repomix" width="20" height="auto" /> or run the `Repomix Run` command.

To pack a specific folder:

1. 📁 Right-click on any folder in VS Code's explorer
2. Select "Run Repomix" from the context menu
3. if you have selected "target as ouput" setting the output file will be in the targetted folder.

## ⚙️ Commands

Open the palette with `Cmd+Shift+P` or `Ctrl+Shift+P` then:

- `Repomix Run` to run repomix on the root folder of your project
- `Repomix Settings` for a quick access to the settings

## 🚀 Installation

1. Open VS Code
2. Press `Cmd+P` (macOS) or `Ctrl+P` (Windows/Linux)
3. Type `ext install DorianMassoulier.repomix-runner`
4. Press Enter

## 🛠️ Configuration

We added 3 new Runner settings on top of repomix settings (output, include, ignore, security)

#### Runner settings

<div align="left">
  <img src="https://raw.githubusercontent.com/massdo/repomix-runner/main/assets/runner-settings.png" alt="Repomix" width="800" height="auto" />
</div>

#### Ouput settings

<div align="left">
  <img src="https://raw.githubusercontent.com/massdo/repomix-runner/main/assets/output-settings.png" alt="Repomix" width="800" height="auto"/>
</div>

#### Include settings

<div align="left">
  <img src="https://raw.githubusercontent.com/massdo/repomix-runner/main/assets/include-settings.png" alt="Repomix" width="800" height="auto" />
</div>

#### Ignore settings

<div align="left">
  <img src="https://raw.githubusercontent.com/massdo/repomix-runner/main/assets/ignore-settings.png" alt="Repomix" width="800" height="auto" />
</div>

#### Security settings

<div align="left">
  <img src="https://raw.githubusercontent.com/massdo/repomix-runner/main/assets/security-settings.png" alt="Repomix" width="800" height="auto" />
</div>

- you can also add a repomix.config.json file in your project root folder, it will **_override_** the settings in the extension. Except for the runner settings.

## 📋 Requirements

- VS Code 1.93.0 or higher
- Node.js and npm installed (for `npx`)
- macOS for file copy mode

## ⚠️ Known Issues

- File copy mode is only available on macOS
- Need to support the last repomix settings (tokenCount, headerText,..)

## 🤝 Contributing

Any feedback, issue or feature request is much appreciated !

## 📝 License

This project is licensed under the MIT License - see the [LICENSE.md](LICENSE.md) file for details.

---

**Note**: This extension is not affiliated with or endorsed by Repomix.
