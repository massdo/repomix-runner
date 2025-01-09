import * as vscode from 'vscode';
import * as path from 'path';
import { access, readFile } from 'fs/promises';

interface RepomixConfig {
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

interface RepomixRunnerConfig {
  keepOutputFile: boolean;
  copyMode: 'content' | 'file';
  useTargetAsOutput: boolean;
}

export function readRunnerConfig(): RepomixRunnerConfig {
  const config = vscode.workspace.getConfiguration('repomix.runner');
  return {
    keepOutputFile: config.get('keepOutputFile') ?? true,
    copyMode: config.get('copyMode') ?? 'content',
    useTargetAsOutput: config.get('useTargetAsOutput') ?? true,
  };
}

export async function readBaseConfig(cwd: string): Promise<RepomixConfig> {
  const configPath = path.join(cwd, 'repomix.config.json');

  try {
    await access(configPath);
    const data = await readFile(configPath, 'utf8');
    return JSON.parse(data);
  } catch {
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

export interface MergedConfig extends RepomixConfig, RepomixRunnerConfig {
  targetDirBasename: string;
  targetDir: string;
  targetPathRelative: string;
}

export function mergeConfigs(
  cwd: string,
  runnerConfig: RepomixRunnerConfig,
  baseConfig: RepomixConfig,
  targetDir: string
): MergedConfig {
  return {
    targetDirBasename: path.relative(cwd, targetDir) || path.basename(cwd),
    targetDir,
    targetPathRelative: path.relative(cwd, path.resolve(targetDir, baseConfig.output.filePath)),
    ...baseConfig,
    ...runnerConfig,
    output: {
      ...baseConfig.output,
      filePath: runnerConfig.useTargetAsOutput
        ? path.resolve(targetDir, baseConfig.output.filePath)
        : path.resolve(cwd, baseConfig.output.filePath),
    },
  };
}
