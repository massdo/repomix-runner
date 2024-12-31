# Repomix Runner

[![Version](https://img.shields.io/visual-studio-marketplace/v/DorianMassoulier.repomix-runner)](https://marketplace.visualstudio.com/items?itemName=DorianMassoulier.repomix-runner)
[![Installs](https://img.shields.io/visual-studio-marketplace/i/DorianMassoulier.repomix-runner)](https://marketplace.visualstudio.com/items?itemName=DorianMassoulier.repomix-runner)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

> Run Repomix directly from VS Code and get the output in your clipboard.

Repomix Runner is a VS Code extension that streamlines your workflow by allowing you to execute Repomix commands directly from the VS Code file explorer. The output is automatically copied to your clipboard, eliminating the need to manually manage output files.

## ✨ Features

- 🖱️ Run Repomix from the context menu
- 📋 Automatic clipboard integration
- 🔄 Two copy modes: file or content
- 🗑️ Optional output file cleanup
- 📊 Progress notifications
- 🍎 Native macOS support

## 📋 Requirements

- VS Code 1.93.0 or higher
- Node.js and npm installed (for `npx`)
- macOS for file copy mode

## 🚀 Installation

1. Open VS Code
2. Press `Cmd+P` (macOS) or `Ctrl+P` (Windows/Linux)
3. Type `ext install DorianMassoulier.repomix-runner`
4. Press Enter

## 🛠️ Configuration

This extension can be customized through VS Code settings:

| Setting                        | Description                     | Default |
| ------------------------------ | ------------------------------- | ------- |
| `repomixRunner.keepOutputFile` | Keep output file after copying  | `false` |
| `repomixRunner.copyMode`       | Copy mode (`content` or `file`) | `file`  |

## 📖 Usage

1. Right-click on any folder in VS Code's explorer
2. Select "Run Repomix" from the context menu
3. Wait for the progress notification
4. Use the output from your clipboard

## ⚠️ Known Issues

- File copy mode is only available on macOS

## 🤝 Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📝 License

This project is licensed under the MIT License - see the [LICENSE.md](LICENSE.md) file for details.

## 👏 Acknowledgments

- [Repomix](https://github.com/your-repomix-link) for the core functionality
- VS Code Extension API documentation
- The VS Code community

---

**Note**: This extension is not affiliated with or endorsed by Repomix.
