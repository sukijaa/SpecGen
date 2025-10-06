// src/MainPanel.ts
import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs';
import { getNonce } from './utils/getNonce';

export class MainPanel {
    public static currentPanel: MainPanel | undefined;
    private readonly _panel: vscode.WebviewPanel;
    private readonly _extensionUri: vscode.Uri;
    private _disposables: vscode.Disposable[] = [];

    private constructor(panel: vscode.WebviewPanel, extensionUri: vscode.Uri) {
        this._panel = panel;
        this._extensionUri = extensionUri;

        this._panel.onDidDispose(() => this.dispose(), null, this._disposables);
        this._panel.webview.html = this._getWebviewContent(this._panel.webview);
    }

    public static createOrShow(extensionUri: vscode.Uri) {
        const column = vscode.window.activeTextEditor ? vscode.window.activeTextEditor.viewColumn : undefined;

        if (MainPanel.currentPanel) {
            MainPanel.currentPanel._panel.reveal(column);
            return;
        }

        const panel = vscode.window.createWebviewPanel(
            'specgen', // Identifies the type of the webview. Used internally
            'SpecGen AI Planner', // Title of the panel displayed to the user
            vscode.ViewColumn.One, // Editor column to show the new webview panel in.
            {
                enableScripts: true,
                localResourceRoots: [vscode.Uri.joinPath(extensionUri, 'webview-ui/build')]
            }
        );

        MainPanel.currentPanel = new MainPanel(panel, extensionUri);
    }

    public getPanel(): vscode.WebviewPanel {
        return this._panel;
    }

    public dispose() {
        MainPanel.currentPanel = undefined;
        this._panel.dispose();
        while (this._disposables.length) {
            const x = this._disposables.pop();
            if (x) {
                x.dispose();
            }
        }
    }

    private _getWebviewContent(webview: vscode.Webview): string {
        const buildPath = path.join(this._extensionUri.fsPath, 'webview-ui', 'build');
        const manifestPath = path.join(buildPath, 'asset-manifest.json');
        
        let manifest;
        try {
            manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
        } catch (err) {
            vscode.window.showErrorMessage("Could not find the asset-manifest.json. Please run 'npm run build' in the 'webview-ui' directory.");
            return `<html><body><h1>Error</h1><p>Could not find the asset-manifest.json. Please run 'npm run build' in the 'webview-ui' directory.</p></body></html>`;
        }

        const mainScript = manifest.files['main.js'];
        const mainStyle = manifest.files['main.css'];

        const scriptPath = vscode.Uri.joinPath(this._extensionUri, 'webview-ui', 'build', mainScript);
        const stylePath = vscode.Uri.joinPath(this._extensionUri, 'webview-ui', 'build', mainStyle);

        const scriptUri = webview.asWebviewUri(scriptPath);
        const styleUri = webview.asWebviewUri(stylePath);
        const nonce = getNonce();

        return `<!DOCTYPE html>
            <html lang="en">
            <head>
                <meta charset="utf-8" />
                <meta name="viewport" content="width=device-width, initial-scale=1" />
                <meta name="theme-color" content="#000000" />
                <title>SpecGen AI Planner</title>
                <link rel="stylesheet" type="text/css" href="${styleUri}">
                <meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src ${webview.cspSource}; script-src 'nonce-${nonce}';">
            </head>
            <body>
                <noscript>You need to enable JavaScript to run this app.</noscript>
                <div id="root"></div>
                <script nonce="${nonce}" src="${scriptUri}"></script>
            </body>
            </html>`;
    }
}