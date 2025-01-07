import * as vscode from 'vscode';
import * as path from 'path';
import { access } from 'fs/promises';
import { readFile } from 'fs/promises';

export interface RepomixConfig {
  output: {
    filePath: string;
    style: 'plain' | 'xml' | 'markdown';
    fileSummary: boolean;
    directoryStructure: boolean;
    removeComments: boolean;
    removeEmptyLines: boolean;
    topFilesLength: number;
    showLineNumbers: boolean;
    copyToClipboard: boolean;
  };
  include: string[];
  ignore: {
    useGitignore: boolean;
    useDefaultPatterns: boolean;
    customPatterns: string[];
  };
  security: {
    enableSecurityCheck: boolean;
  };
}

export async function readRepomixConfig(rootFolderPath: string): Promise<RepomixConfig> {
  // TODO ajouter un watcher sur le fichier repomix.config.json
  const configPath = path.join(rootFolderPath, 'repomix.config.json');

  try {
    await access(configPath); // Vérifie que le fichier existe
    const data = await readFile(configPath, 'utf8');
    const parsedConfig = JSON.parse(data);

    // Validation et valeurs par défaut
    return {
      output: {
        filePath: parsedConfig?.output?.filePath || 'repomix-output.txt',
        style: parsedConfig?.output?.style || 'plain',
        fileSummary: parsedConfig?.output?.fileSummary ?? true,
        directoryStructure: parsedConfig?.output?.directoryStructure ?? true,
        removeComments: parsedConfig?.output?.removeComments ?? false,
        removeEmptyLines: parsedConfig?.output?.removeEmptyLines ?? false,
        topFilesLength: parsedConfig?.output?.topFilesLength ?? 5,
        showLineNumbers: parsedConfig?.output?.showLineNumbers ?? false,
        copyToClipboard: parsedConfig?.output?.copyToClipboard ?? false,
      },
      include: parsedConfig?.include || [],
      ignore: {
        useGitignore: parsedConfig?.ignore?.useGitignore ?? true,
        useDefaultPatterns: parsedConfig?.ignore?.useDefaultPatterns ?? true,
        customPatterns: parsedConfig?.ignore?.customPatterns || [],
      },
      security: {
        enableSecurityCheck: parsedConfig?.security?.enableSecurityCheck ?? true,
      },
    };
  } catch {
    // Si pas de config ou parsing échoue, on utilise la config VS Code
    const vsCodeConfig = vscode.workspace.getConfiguration('repomix');

    return {
      output: {
        filePath: vsCodeConfig.get('output.filePath') || 'repomix-output.txt',
        style: vsCodeConfig.get('output.style') || 'plain',
        fileSummary: vsCodeConfig.get('output.fileSummary') ?? true,
        directoryStructure: vsCodeConfig.get('output.directoryStructure') ?? true,
        removeComments: vsCodeConfig.get('output.removeComments') ?? false,
        removeEmptyLines: vsCodeConfig.get('output.removeEmptyLines') ?? false,
        topFilesLength: vsCodeConfig.get('output.topFilesLength') ?? 5,
        showLineNumbers: vsCodeConfig.get('output.showLineNumbers') ?? false,
        copyToClipboard: vsCodeConfig.get('output.copyToClipboard') ?? false,
      },
      include: vsCodeConfig.get('include') || [],
      ignore: {
        useGitignore: vsCodeConfig.get('ignore.useGitignore') ?? true,
        useDefaultPatterns: vsCodeConfig.get('ignore.useDefaultPatterns') ?? true,
        customPatterns: vsCodeConfig.get('ignore.customPatterns') || [],
      },
      security: {
        enableSecurityCheck: vsCodeConfig.get('security.enableSecurityCheck') ?? true,
      },
    };
  }
}
