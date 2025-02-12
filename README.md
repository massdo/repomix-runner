<div align="center">
  <img src="assets/repomix-logo.png" alt="Repomix" width="200" height="auto" />
</div>

# Repomix Runner

[![Version](https://img.shields.io/visual-studio-marketplace/v/DorianMassoulier.repomix-runner)](https://marketplace.visualstudio.com/items?itemName=DorianMassoulier.repomix-runner)
[![Installs](https://img.shields.io/visual-studio-marketplace/i/DorianMassoulier.repomix-runner)](https://marketplace.visualstudio.com/items?itemName=DorianMassoulier.repomix-runner)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

Repomix Runner is a VSCode extension that allows you to easily bundle files into a single output for AI processing. It uses the [Repomix](https://github.com/yamadashy/repomix) tool.

## ✨ Features

- 📁 Pack your selection of files into a single output for AI processing.
- 📦 Create reusable bundles for parts of your project you frequently package.
- 📎 Two copy modes for clipboard: content or file. -> you can paste a whole file not just content.
- 🗑️ Optional output file cleanup. -> But you still have it in clipboard! 😀
- 🛠️ Easy settings in vscode and/or support a repomix.config.json file.

## 📖 Usage

With the **_REPOMIX_** custom view, all is in one place 🎉 :

(keep in mind the output-file is also in your clipboard).

https://github.com/user-attachments/assets/d092ca93-c2c4-4475-a622-6359a49506b1

<div align="center">
  <video src="https://massdo.github.io/repomix-runner/assets/repomix-demo.mp4" type="video/mp4" controls controlsList="nodownload" allowfullscreen>
    Your browser does not support the video tag.
  </video>
</div>

Or you can use the commands ⬇️

## ⚙️ Commands

Open the palette with `Cmd+Shift+P` or `Ctrl+Shift+P` then:

- `Repomix Run` to run repomix on the root folder of your project
- `Repomix Run On Open Files` to run repomix on the open files
- `Repomix Run On Selection` to run repomix on the selected files or directories
- `Repomix Run Bundle` to select a bundle to run
- `Repomix Manage Bundles` to edit or delete your bundles
- `Repomix Settings` for a quick access to the settings
- `Repomix Output` to open the repomix output channel

## 🚀 Installation

1. Open VS Code
2. Press `Cmd+P` (macOS) or `Ctrl+P` (Windows/Linux)
3. Type `ext install DorianMassoulier.repomix-runner`
4. Press Enter

## 🛠️ Configuration

- The extension support the repomix.config.json file in your project root folder, it will **_override_** the settings in the extension. Except for the runner settings.

## 📋 Requirements

- VS Code 1.93.0 or higher
- Node.js and npm installed (for `npx`)
- macOS for file copy mode
- xclip installed for file copy mode on linux

## ⚠️ Known Issues

- File copy mode is only available on macOS and linux (you need to install xclip for file copy mode on linux)

## 🤝 Contributing

Any feedback, issue or feature request is much appreciated !

## 📝 License

This project is licensed under the MIT License - see the [LICENSE.md](LICENSE.md) file for details.

---
