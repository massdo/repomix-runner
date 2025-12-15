# VS Code Extension Debugging Guide

## Debugging Commands

### Build the Extension
```bash
npm run compile          # Compile once
npm run watch           # Compile in watch mode
```

### Package the Extension
```bash
npm run package:vsix    # Create .vsix file
```

### Debugging in VS Code
1. Open the "Run and Debug" panel (Ctrl+Shift+D)
2. Select "Run Extension" configuration
3. Press F5 to start debugging
4. A new VS Code window will open with your extension loaded

## Debugging Best Practices

### 1. Breakpoint Issues
- Ensure your code is compiled (`npm run compile`)
- Check that `outFiles` in launch.json matches your build output
- Use source maps for TypeScript debugging

### 2. Console Debugging
- Use `console.log()` for quick debugging
- Check "Developer: Toggle Developer Tools" for browser-like console
- View extension output in the Output panel (select your extension from dropdown)

### 3. Extension Not Loading
- Verify activation events in package.json
- Check the Extension Development Host console for errors
- Use `Developer: Reload Window` command

### 4. Common Issues
- Clear extension host cache if debugging fails
- Ensure all dependencies are installed (`npm install`)
- Check for errors in the Problems panel

### 5. Testing
- Use `Developer: Show Running Extensions` to verify your extension is loaded
- Test commands via Command Palette (Ctrl+Shift+P)
- Check views in the Explorer sidebar