// import * as assert from 'assert';
// import * as vscode from 'vscode';
// import * as path from 'path';
// import * as fs from 'fs/promises';
// import { setTimeout } from 'timers/promises';
// import { exec } from 'child_process';
// import { createHash } from 'crypto';

// interface TestParams {
//   keepOutputFile: boolean;
//   copyMode: 'content' | 'file';
// }

// // <==== Simple file read (with timeout)
// async function waitForFile(filePath: string, timeout = 5000): Promise<string> {
//   const startTime = Date.now();

//   while (Date.now() - startTime < timeout) {
//     try {
//       return await fs.readFile(filePath, 'utf8');
//     } catch {
//       await setTimeout(100);
//     }
//   }

//   throw new Error(`Timeout: File ${filePath} was not generated within ${timeout}ms`);
// }

// // <==== File existence check
// async function fileExists(filePath: string): Promise<boolean> {
//   try {
//     await fs.access(filePath);
//     return true;
//   } catch {
//     return false;
//   }
// }

// // <==== Loop reading clipboard until obtaining a file-type content
// async function waitForClipboardFile(timeout = 5000): Promise<string> {
//   const startTime = Date.now();
//   while (Date.now() - startTime < timeout) {
//     try {
//       const filePath = await getClipboardFilePath();
//       if (filePath && filePath.trim() !== '') {
//         return filePath.trim();
//       }
//     } catch {}
//     await setTimeout(100);
//   }
//   throw new Error('Timeout: No file in clipboard within the specified period');
// }

// // <==== Wait for the clipboard text to match "expectedContent"
// async function waitForClipboardMatch(expectedContent: string, timeout = 5000): Promise<void> {
//   const startTime = Date.now();

//   while (Date.now() - startTime < timeout) {
//     const currentClipboard = await vscode.env.clipboard.readText();
//     if (normalizeContent(currentClipboard) === normalizeContent(expectedContent)) {
//       return;
//     }
//     await setTimeout(100);
//   }

//   throw new Error('Timeout: Clipboard content did not match the expected text');
// }
// // <==== Reads the file from the clipboard using AppleScript (file mode)
// async function getClipboardFilePath(): Promise<string> {
//   return new Promise((resolve, reject) => {
//     exec(
//       `osascript -e 'try
//         set theFile to (the clipboard as «class furl»)
//         return POSIX path of theFile
//       on error errMsg
//         return ""
//       end try'`,
//       (error, stdout, stderr) => {
//         if (error || stderr) {
//           reject(error || stderr);
//         } else if (!stdout.trim()) {
//           reject(new Error('No file in clipboard'));
//         } else {
//           resolve(stdout.trim());
//         }
//       }
//     );
//   });
// }

// // <==== Compute hash to compare two files
// async function computeFileHash(filePath: string): Promise<string> {
//   const data = await fs.readFile(filePath);
//   return createHash('sha256').update(data).digest('hex');
// }

// // <==== Normalization of strings (line breaks, etc.)
// function normalizeContent(content: string): string {
//   return content.replace(/\r\n/g, '\n').trim();
// }

// suite('Repomix Runner Extension Test Suite', function () {
//   this.timeout(5_000);

//   const testWorkspacePath = path.join(__dirname, '../../test-workspace');
//   const outputPath = path.join(testWorkspacePath, 'repomix-output.txt');

//   suiteSetup(async () => {
//     await fs.mkdir(testWorkspacePath, { recursive: true });
//     await vscode.extensions.getExtension('DorianMassoulier.repomix-runner')?.activate();
//     await fs.writeFile(
//       path.join(testWorkspacePath, 'repomix-input.txt'),
//       'file to be copied by repomix'
//     );
//   });

//   suiteTeardown(async () => {
//     await fs.rm(testWorkspacePath, { recursive: true, force: true });
//   });

//   setup(async () => {
//     await vscode.env.clipboard.writeText('');
//     await fs.rm(outputPath, { force: true });
//   });

//   test('Extension should be present', async () => {
//     const extension = vscode.extensions.getExtension('DorianMassoulier.repomix-runner');
//     assert.ok(extension, 'Extension should be available');
//     await extension?.activate();
//     assert.ok(extension.isActive, 'Extension should be active');
//   });

//   const testCases: TestParams[] = [
//     { keepOutputFile: true, copyMode: 'content' },
//     { keepOutputFile: true, copyMode: 'file' },
//     { keepOutputFile: false, copyMode: 'content' },
//     { keepOutputFile: false, copyMode: 'file' },
//   ];

//   testCases.forEach(({ keepOutputFile, copyMode }) => {
//     test(`Should handle keepOutputFile=${keepOutputFile} and copyMode=${copyMode}`, async () => {
//       try {
//         // 1) Configure settings
//         await vscode.workspace
//           .getConfiguration('repomixRunner')
//           .update('keepOutputFile', keepOutputFile, vscode.ConfigurationTarget.Global);
//         await vscode.workspace
//           .getConfiguration('repomixRunner')
//           .update('copyMode', copyMode, vscode.ConfigurationTarget.Global);

//         // 2) Run the command
//         const uri = vscode.Uri.file(testWorkspacePath);
//         await vscode.commands.executeCommand('repomixRunner.run', uri);

//         // 3) Wait for the file to be created
//         const fileContent = await waitForFile(outputPath);

//         // 4) Depending on the copyMode, check what's in the clipboard
//         if (copyMode === 'content') {
//           // => Compare the text in the clipboard
//           //    we can wait directly for the match:
//           await waitForClipboardMatch(fileContent);
//         } else {
//           // => Compare the file (hash)
//           //    wait for the AppleScript command to have had time to place the file

//           const clipboardFilePath = await waitForClipboardFile();
//           assert.ok(clipboardFilePath, 'Clipboard should contain a file reference');
//           const fileOnClipboardExists = await fileExists(clipboardFilePath);
//           assert.ok(fileOnClipboardExists, 'Clipboard file should exist on disk (macOS)');

//           const tempFilePath = getLastTempFilePath();
//           assert.ok(tempFilePath, 'Temp file path should be defined');

//           const outputHash = await computeFileHash(tempFilePath!);
//           const clipboardFileHash = await computeFileHash(clipboardFilePath);
//           assert.strictEqual(
//             await outputHash,
//             await clipboardFileHash,
//             'Clipboard file hash should match the output file hash'
//           );
//         }

//         // 5) Wait a bit for the deletion of the file to take effect
//         if (!keepOutputFile) {
//           await setTimeout(200);
//         }

//         // 6) Check if the original file still exists (keepOutputFile)
//         const exists = await fileExists(outputPath);
//         assert.strictEqual(
//           exists,
//           keepOutputFile,
//           keepOutputFile
//             ? 'Output file should exist when keepOutputFile is true'
//             : 'Output file should be deleted when keepOutputFile is false'
//         );
//       } finally {
//         // Cleanup
//         await fs.rm(outputPath, { force: true });
//         await vscode.workspace
//           .getConfiguration('repomixRunner')
//           .update('keepOutputFile', undefined, vscode.ConfigurationTarget.Global);
//         await vscode.workspace
//           .getConfiguration('repomixRunner')
//           .update('copyMode', undefined, vscode.ConfigurationTarget.Global);
//       }
//     });
//   });

//   test('Should handle repomix execution errors', async () => {
//     const invalidPath = path.join(testWorkspacePath, 'invalid');
//     const uri = vscode.Uri.file(invalidPath);

//     try {
//       await vscode.commands.executeCommand('repomixRunner.run', uri);
//       assert.fail('Should have thrown an error');
//     } catch (error) {
//       assert.ok(error, 'An error should be thrown for an invalid path');
//     }
//   });
// });
