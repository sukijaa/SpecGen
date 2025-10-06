// webview-ui/src/vscode.ts
import type { WebviewApi } from "vscode-webview";

interface VsCodeApi {
  getState: () => any;
  setState: (newState: any) => any;
  postMessage: (message: any) => void;
}

// This is a special function that gets the VS Code API instance
// It's only available in the webview environment
declare const acquireVsCodeApi: () => WebviewApi<any>;

// We store the API instance in a global variable
const vscodeApi: WebviewApi<any> | undefined = typeof acquireVsCodeApi === 'function' 
    ? acquireVsCodeApi() 
    : undefined;

export const postMessage = (message: any) => {
    if (vscodeApi) {
        vscodeApi.postMessage(message);
    } else {
        console.log("postMessage called in a non-webview context:", message);
    }
};