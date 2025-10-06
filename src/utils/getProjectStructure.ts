// src/utils/getProjectStructure.ts
import * as vscode from 'vscode';

// Function to recursively get the file structure
async function listFiles(dir: vscode.Uri, prefix: string = ''): Promise<string> {
    let structure = '';
    const entries = await vscode.workspace.fs.readDirectory(dir);
    entries.sort((a, b) => a[0].localeCompare(b[0])); // Sort for consistency

    for (const [name, type] of entries) {
        // Ignore node_modules and other common noise
        if (name === 'node_modules' || name === '.git' || name === '.vscode' || name === 'venv' || name === 'env' || name === '__pycache__') {
            continue;
        }
        const newPrefix = prefix + '  ';
        structure += `${prefix}- ${name}\n`;
        if (type === vscode.FileType.Directory) {
            structure += await listFiles(vscode.Uri.joinPath(dir, name), newPrefix);
        }
    }
    return structure;
}

export async function getProjectStructure(): Promise<string> {
    const workspaceFolders = vscode.workspace.workspaceFolders;
    if (!workspaceFolders) {
        return 'No workspace open.';
    }
    const rootUri = workspaceFolders[0].uri;
    return await listFiles(rootUri);
}