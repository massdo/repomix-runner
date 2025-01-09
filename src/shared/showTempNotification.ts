import * as vscode from 'vscode';
import { setTimeout } from 'timers/promises';

export async function showTempNotification(
  message: string,
  options: {
    duration?: number;
    cancellable?: boolean;
    promise?: Promise<any>;
  } = {}
): Promise<void> {
  const { duration = 3000, cancellable = false, promise } = options;

  try {
    await vscode.window.withProgress(
      {
        location: vscode.ProgressLocation.Notification,
        title: message,
        cancellable,
      },
      async (progress, token) => {
        progress.report({ increment: 0 });
        await setTimeout(50);

        if (promise) {
          // Promise to wait for
          try {
            await promise;
            progress.report({ increment: 100 });
          } catch (error) {
            throw error;
          }
        } else {
          // Timer mode
          const steps = 100;
          const interval = duration / steps;
          let currentStep = 0;

          while (currentStep < steps) {
            if (token.isCancellationRequested) {
              console.log('Notification was cancelled.');
              return;
            }

            currentStep++;
            progress.report({
              increment: 100 / steps,
            });

            await setTimeout(interval);
          }
        }

        console.log('Notification completed successfully.');
      }
    );
  } catch (err: any) {
    console.error('An unexpected error occurred:', err);
    throw err;
  }
}
