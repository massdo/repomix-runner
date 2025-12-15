// Utility to get the VS Code API
// This ensures we only call acquireVsCodeApi once, which is required by VS Code

interface VSCodeApi {
  postMessage(message: any): void;
  getState(): any;
  setState(state: any): void;
}

declare function acquireVsCodeApi(): VSCodeApi;

class VSCodeApiWrapper {
  private static _api: VSCodeApi;

  public static getApi(): VSCodeApi {
    if (!this._api) {
      this._api = acquireVsCodeApi();
    }
    return this._api;
  }
}

export const vscode = VSCodeApiWrapper.getApi();
