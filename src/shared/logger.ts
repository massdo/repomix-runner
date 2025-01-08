import * as vscode from 'vscode';
import util from 'node:util';

type LogLevel = 'debug' | 'info' | 'warn' | 'error' | 'success' | 'trace' | 'log';
type LogTarget = 'console' | 'output' | 'both';

class Logger {
  private isVerbose = false;
  private outputChannel: vscode.OutputChannel | null = null;

  constructor() {
    this.outputChannel = vscode.window.createOutputChannel('Repomix runner');
  }

  console = this.createLogMethods('console');
  output = this.createLogMethods('output');
  both = this.createLogMethods('both');

  success(...args: unknown[]) {
    this.console.success(...args);
  }

  // Configure le mode verbose
  setVerbose(value: boolean) {
    this.isVerbose = value;
  }

  private createLogMethods(target: LogTarget) {
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

  private log(level: LogLevel, target: LogTarget, ...args: unknown[]) {
    const formattedMessage = this.formatArgs(args);
    const emojiMessage = this.addEmoji(level, formattedMessage);

    if (target === 'console' || target === 'both') {
      this.logToConsole(level, emojiMessage);
    }
    if (target === 'output' || target === 'both') {
      this.logToOutputChannel(emojiMessage);
    }
  }

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

  private logToOutputChannel(message: string) {
    if (this.outputChannel) {
      this.outputChannel.appendLine(message);
      this.outputChannel.show(true);
    }
  }

  private formatArgs(args: unknown[]): string {
    return args
      .map(arg =>
        typeof arg === 'object' ? util.inspect(arg, { depth: null, colors: false }) : String(arg)
      )
      .join(' ');
  }
}

export const logger = new Logger();
