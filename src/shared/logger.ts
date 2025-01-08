import * as vscode from 'vscode';
import util from 'node:util';
import pc from 'picocolors';

type LogLevel = 'debug' | 'info' | 'warn' | 'error' | 'success' | 'trace' | 'log';

class Logger {
  private isVerbose = false;
  private outputChannel: vscode.OutputChannel | null = null;

  constructor() {
    this.outputChannel = vscode.window.createOutputChannel('Repomix runner');
  }

  // Sous-objets pour console, output, et both
  console = this.createLogMethods('console');
  output = this.createLogMethods('output');
  both = this.createLogMethods('both'); // Ajoute pour écrire dans les deux cibles

  // Par défaut, log dans la console
  success(...args: unknown[]) {
    this.console.success(...args);
  }

  // Configure le mode verbose
  setVerbose(value: boolean) {
    this.isVerbose = value;
  }

  // Crée des méthodes de log pour une cible donnée
  private createLogMethods(target: 'console' | 'output' | 'both') {
    return {
      debug: (...args: unknown[]) => this.isVerbose && this.log('debug', target, ...args),
      info: (...args: unknown[]) => this.log('info', target, ...args),
      warn: (...args: unknown[]) => this.log('warn', target, ...args),
      error: (...args: unknown[]) => this.log('error', target, ...args),
      success: (...args: unknown[]) => this.log('success', target, ...args),
      trace: (...args: unknown[]) => this.isVerbose && this.log('trace', target, ...args),
      log: (...args: unknown[]) => this.log('log', target, ...args),
    };
  }

  // Méthode générique pour logger dans console, output ou les deux
  private log(level: LogLevel, target: 'console' | 'output' | 'both', ...args: unknown[]) {
    const formattedMessage = this.formatArgs(args);
    const coloredMessage = this.colorize(level, formattedMessage);

    if (target === 'console' || target === 'both') {
      this.logToConsole(level, coloredMessage);
    }
    if (target === 'output' || target === 'both') {
      const emojiMessage = this.addEmoji(level, formattedMessage);
      this.logToOutputChannel(emojiMessage);
    }
  }

  // Ajoute des émojis pour simuler des "couleurs" dans l'Output Channel
  private addEmoji(level: LogLevel, message: string): string {
    switch (level) {
      case 'debug':
        return `🔍 [DEBUG]: ${message}`;
      case 'info':
        return `ℹ️ [INFO]: ${message}`;
      case 'warn':
        return `⚠️ [WARN]: ${message}`;
      case 'error':
        return `❌ [ERROR]: ${message}`;
      case 'success':
        return `✅ [SUCCESS]: ${message}`;
      case 'trace':
        return `📍 [TRACE]: ${message}`;
      case 'log':
      default:
        return `[LOG]: ${message}`;
    }
  }

  // Colorisation des messages pour la console uniquement
  private colorize(level: LogLevel, message: string): string {
    switch (level) {
      case 'debug':
        return pc.blue(message);
      case 'info':
        return pc.cyan(message);
      case 'warn':
        return pc.yellow(message);
      case 'error':
        return pc.red(message);
      case 'success':
        return pc.green(message);
      case 'trace':
        return pc.gray(message);
      case 'log':
      default:
        return message; // Pas de couleur pour log standard
    }
  }

  // Log dans la console
  private logToConsole(level: LogLevel, message: string) {
    switch (level) {
      case 'error':
        console.error(message);
        break;
      case 'warn':
        console.warn(message);
        break;
      default:
        console.log(message);
    }
  }

  // Log dans l'Output Channel avec emojis
  private logToOutputChannel(message: string) {
    if (this.outputChannel) {
      this.outputChannel.appendLine(message);
      this.outputChannel.show(true); // Montre le canal quand il est activé
    }
  }

  // Formate les arguments pour les afficher comme texte
  private formatArgs(args: unknown[]): string {
    return args
      .map(arg =>
        typeof arg === 'object' ? util.inspect(arg, { depth: null, colors: true }) : String(arg)
      )
      .join(' ');
  }
}

export const logger = new Logger();
