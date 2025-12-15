import * as vscode from 'vscode';
import * as path from 'path';
import { BundleManager } from '../core/bundles/bundleManager';
import { fileAccess } from '../shared/files';
import { showTempNotification } from '../shared/showTempNotification';
import { mergeConfigs } from '../config/configLoader';
import { readRepomixFileConfig } from '../config/configLoader';
import { readRepomixRunnerVscodeConfig } from '../config/configLoader';

export async function goToConfigFile(
  bundleId: string,
  deps: { cwd: string; bundleManager: BundleManager }
) {
  await deps.bundleManager.setActiveBundle(bundleId);
  const bundle = await deps.bundleManager.getBundle(bundleId);
  let { configPath } = bundle;

  if (!configPath) {
    const configFiles = await vscode.workspace.findFiles('.repomix/config/*repomix.config.json');
    const oldConfigFile = configFiles.find(
      file => file.fsPath.split('/').pop()?.split('-')[0] === bundle.name
    );
    let isUsingOldConfig: string | undefined;

    if (oldConfigFile) {
      isUsingOldConfig = await vscode.window.showInformationMessage(
        'Do you want to use the existing config file for this bundle? (in .repomix/config)',
        { modal: true },
        'Yes',
        'No'
      );

      if (isUsingOldConfig === 'Yes') {
        configPath = vscode.workspace.asRelativePath(oldConfigFile);
      }
    }
    if (isUsingOldConfig === 'No' || !oldConfigFile) {
      const isCreatingNewConfig = await vscode.window.showInformationMessage(
        'Do you want to create a new custom config file for this bundle? (in .repomix/config)',
        { modal: true },
        'Yes',
        'No'
      );

      if (isCreatingNewConfig === 'Yes') {
        configPath = await createConfigFile(deps.cwd, bundle.name);
      }
    }

    if (!configPath) {
      return;
    }

    const updatedBundle = {
      ...bundle,
      configPath,
    };

    await deps.bundleManager.saveBundle(bundleId, updatedBundle);
    showTempNotification(`Config file set to "${configPath}" for bundle "${bundle.name}"`);
  }

  if (!fileAccess(configPath)) {
    return;
  }

  const uri = vscode.Uri.joinPath(vscode.Uri.file(deps.cwd), configPath);
  await vscode.commands.executeCommand('vscode.open', uri);
}

/**
 * Creates a new config file for a bundle and opens it in VSCode.
 * @returns the relative path to the config file if successful, or undefined if there was an error.
 */
async function createConfigFile(cwd: string, bundleName: string): Promise<string | undefined> {
  let configPath = '';
  const configDir = vscode.Uri.joinPath(vscode.Uri.file(cwd), '.repomix', 'config');
  try {
    await vscode.workspace.fs.createDirectory(configDir);
  } catch (error) {
    vscode.window.showErrorMessage('Failed to create config directory');
    return;
  }

  const configFileName = `${bundleName}-repomix.config.json`;
  const configFilePath = vscode.Uri.joinPath(configDir, configFileName);

  const vscodeConfig = readRepomixRunnerVscodeConfig();
  const configFile = await readRepomixFileConfig(cwd);

  const globalConfig = await mergeConfigs(cwd, configFile, vscodeConfig);

  const { runner, cwd: _, ...bundleConfig } = globalConfig;

  // Ensure output filePath is relative to project root
  if (bundleConfig.output?.filePath) {
    bundleConfig.output.filePath = path.relative(cwd, bundleConfig.output.filePath);
  }

  const initialConfigContent = JSON.stringify(bundleConfig, null, 2);

  try {
    await vscode.workspace.fs.writeFile(configFilePath, Buffer.from(initialConfigContent, 'utf8'));
  } catch (error) {
    vscode.window.showErrorMessage('Failed to create config file');
    return;
  }

  configPath = vscode.workspace.asRelativePath(configFilePath);
  vscode.commands.executeCommand('vscode.open', configFilePath);

  return configPath;
}
