// src/extension.ts
import * as vscode from 'vscode';
import * as path from 'path';
import { MainPanel } from './MainPanel';
import { getProjectStructure } from './utils/getProjectStructure';
import { initializeAiService, generatePlan, generateCodeForStep } from './services/aiService';

export function activate(context: vscode.ExtensionContext) {
    try {
        initializeAiService();
    } catch (error) {
        console.error("Failed to activate SpecGen extension:", error);
        return; 
    }

    console.log('Congratulations, your extension "specgen" is now active!');

    context.subscriptions.push(
        vscode.commands.registerCommand('specgen.start', () => {
            MainPanel.createOrShow(context.extensionUri);

            if (MainPanel.currentPanel) {
                MainPanel.currentPanel.getPanel().webview.onDidReceiveMessage(
                    async message => {
                        switch (message.command) {
                            case 'generatePlan':
                                vscode.window.withProgress({
                                    location: vscode.ProgressLocation.Notification,
                                    title: "Generating Implementation Plan...",
                                    cancellable: false
                                }, async () => {
                                    const projectStructure = await getProjectStructure();
                                    const plan = await generatePlan(message.text, projectStructure);
                                    MainPanel.currentPanel?.getPanel().webview.postMessage({ command: 'planGenerated', payload: plan });
                                });
                                return;

                            case 'generateCode':
                                vscode.window.withProgress({
                                    location: vscode.ProgressLocation.Notification,
                                    title: `Generating code for: ${message.step.file}`,
                                    cancellable: false
                                }, async () => {
                                    let fileContent: string | null = null;
                                    try {
                                        const workspaceFolders = vscode.workspace.workspaceFolders;
                                        if (workspaceFolders) {
                                            const fileUri = vscode.Uri.joinPath(workspaceFolders[0].uri, message.step.file);
                                            const fileBytes = await vscode.workspace.fs.readFile(fileUri);
                                            fileContent = Buffer.from(fileBytes).toString('utf8');
                                        }
                                    } catch (e) {
                                        // File doesn't exist, which is fine for 'CREATE' actions
                                    }
                                    const generatedCode = await generateCodeForStep(message.step, fileContent);
                                    MainPanel.currentPanel?.getPanel().webview.postMessage({ command: 'codeGenerated', payload: { step: message.step, code: generatedCode } });
                                });
                                return;

                            case 'applyCode':
                                try {
                                    const workspaceFolders = vscode.workspace.workspaceFolders;
                                    if (!workspaceFolders) {
                                        vscode.window.showErrorMessage("No open folder in workspace.");
                                        return;
                                    }
                                    const workspaceRoot = workspaceFolders[0].uri;
                                    const fileUri = vscode.Uri.joinPath(workspaceRoot, message.filePath);

                                    const dirUri = vscode.Uri.joinPath(workspaceRoot, path.dirname(message.filePath));
                                    try {
                                        await vscode.workspace.fs.createDirectory(dirUri);
                                    } catch (error) {
                                        if (error instanceof vscode.FileSystemError && error.code === 'FileExists') {
                                            // This is okay, the directory already exists.
                                        } else {
                                            throw error;
                                        }
                                    }

                                    await vscode.workspace.fs.writeFile(fileUri, Buffer.from(message.code, 'utf8'));

                                    vscode.window.showInformationMessage(`Successfully updated ${message.filePath}`);

                                    const document = await vscode.workspace.openTextDocument(fileUri);
                                    await vscode.window.showTextDocument(document);

                                } catch (error) {
                                    vscode.window.showErrorMessage(`Failed to apply code to ${message.filePath}. Error: ${error}`);
                                }
                                return;
                        }
                    },
                    undefined,
                    context.subscriptions
                );
            }
        })
    );
}

export function deactivate() {}