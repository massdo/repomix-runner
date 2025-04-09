# Repomix Runner <img valign="middle" alt="Repomix logo" width="40" src="assets/repomix-logo.png" />

You can support this project by giving a star on GitHub ! ⭐️ 🔭 🙏

[![GitHub](https://img.shields.io/github/stars/massdo/repomix-runner?style=social)](https://github.com/massdo/repomix-runner)
[![Version](https://img.shields.io/visual-studio-marketplace/v/DorianMassoulier.repomix-runner)](https://marketplace.visualstudio.com/items?itemName=DorianMassoulier.repomix-runner)
[![Installs](https://img.shields.io/visual-studio-marketplace/i/DorianMassoulier.repomix-runner)](https://marketplace.visualstudio.com/items?itemName=DorianMassoulier.repomix-runner)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

<!-- [![Twitter](https://img.shields.io/twitter/follow/DorianMass49637
)](https://twitter.com/DorianMass49637) -->

Repomix Runner is a VSCode extension that allows you to easily bundle files into a single output for AI processing. It uses the great [Repomix](https://github.com/yamadashy/repomix) tool.

## ✨ Features

- 📁 Pack your selection of files into a single output for AI processing.
- 📦 Create reusable bundles for parts of your project you frequently package.
- 📎 Two copy modes for clipboard: content or file. -> you can paste a whole file not just content.
- 🗑️ Optional output file cleanup. -> But you still have it in clipboard! 😀
- 🛠️ Easy settings in vscode and/or support a repomix.config.json file.

## 📖 Usage

With the **_REPOMIX_** custom view, all is in one place 🎉 :

(keep in mind the output-file is also in your clipboard).

### ⬇️ - Run Repomix on selection

https://github.com/user-attachments/assets/21272ff9-0bf1-48dc-a583-34355bb35ced

<div align="center">
  <video src="https://massdo.github.io/repomix-runner/assets/run-on-selection.mp4" type="video/mp4" controls controlsList="nodownload" allowfullscreen>
    Your browser does not support the video tag.
  </video>
</div>

### ⬇️ - Create a bundle with custom config

https://github.com/user-attachments/assets/134e7fdf-1e98-429f-b16c-a76e99dc761f

<div align="center">
  <video src="https://massdo.github.io/repomix-runner/assets/create-bundle.mp4" type="video/mp4" controls controlsList="nodownload" allowfullscreen>
    Your browser does not support the video tag.
  </video>
</div>

## ⚙️ Commands

Open the palette with `Cmd+Shift+P` or `Ctrl+Shift+P` then:

- `Repomix Run` to run repomix on the root folder of your project
- `Repomix Run On Open Files` to run repomix on the open files in the workspace
- `Repomix Create New Bundle` to create a new bundle
- `Repomix Run Bundle` to select a bundle to run
- `Repomix Edit Bundle` to edit bundle name, config file, description and tags
- `Repomix Refresh Bundles` to refresh the bundles list if you mannually change the .repomix/bundles.json file
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
