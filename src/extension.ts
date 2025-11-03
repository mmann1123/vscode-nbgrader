/**
 * Main extension entry point
 */

import * as vscode from 'vscode';
import { NbgraderStatusBarProvider } from './ui/statusBar';
import { setCellTypeCommand, clearCellMetadataCommand, validateNotebookCommand, fixNotebookCommand } from './ui/commands';
import { registerSaveHandler } from './saveHandler';

/**
 * Activate the extension
 */
export function activate(context: vscode.ExtensionContext) {
  console.log('nbgrader extension is now active');

  // Register save handler to persist metadata
  // VS Code's built-in Jupyter serializer strips unknown metadata,
  // so we patch the file after save to inject nbgrader metadata back
  registerSaveHandler(context);

  // Register status bar provider
  // This shows cell type and points at the bottom of each cell
  const statusBarProvider = new NbgraderStatusBarProvider();
  const statusBarRegistration = vscode.notebooks.registerNotebookCellStatusBarItemProvider(
    'jupyter-notebook',
    statusBarProvider
  );
  context.subscriptions.push(statusBarRegistration);

  // Refresh status bar when notebooks are opened
  context.subscriptions.push(
    vscode.workspace.onDidOpenNotebookDocument((notebook) => {
      if (notebook.notebookType === 'jupyter-notebook') {
        console.log('[nbgrader] Notebook opened, refreshing status bars');
        // Small delay to ensure metadata is loaded
        setTimeout(() => statusBarProvider.refresh(), 100);
      }
    })
  );

  // Refresh status bar when notebook changes (e.g., cell metadata updated)
  context.subscriptions.push(
    vscode.workspace.onDidChangeNotebookDocument((e) => {
      if (e.notebook.notebookType === 'jupyter-notebook') {
        // Only refresh if metadata changes occurred
        if (e.cellChanges.length > 0) {
          const hasMetadataChanges = e.cellChanges.some(change => change.metadata !== undefined);
          if (hasMetadataChanges) {
            console.log('[nbgrader] Metadata changed, refreshing status bars');
            statusBarProvider.refresh();
          }
        }
      }
    })
  );

  // Register commands
  const setCellTypeCmd = vscode.commands.registerCommand(
    'nbgrader.setCellType',
    setCellTypeCommand
  );
  context.subscriptions.push(setCellTypeCmd);

  const clearMetadataCmd = vscode.commands.registerCommand(
    'nbgrader.clearCellMetadata',
    clearCellMetadataCommand
  );
  context.subscriptions.push(clearMetadataCmd);

  const validateCmd = vscode.commands.registerCommand(
    'nbgrader.validateNotebook',
    validateNotebookCommand
  );
  context.subscriptions.push(validateCmd);

  const fixCmd = vscode.commands.registerCommand(
    'nbgrader.fixNotebook',
    fixNotebookCommand
  );
  context.subscriptions.push(fixCmd);

  // Debug command to check cell metadata
  const debugCmd = vscode.commands.registerCommand(
    'nbgrader.debugMetadata',
    () => {
      const editor = vscode.window.activeNotebookEditor;
      if (!editor) {
        vscode.window.showWarningMessage('No active notebook');
        return;
      }
      const cell = editor.notebook.cellAt(editor.selections[0].start);
      const metadata = cell.metadata;
      console.log('=== CELL METADATA DEBUG ===');
      console.log('Cell index:', cell.index);
      console.log('Full metadata:', JSON.stringify(metadata, null, 2));
      vscode.window.showInformationMessage(
        `Cell ${cell.index}: ${JSON.stringify(metadata?.nbgrader || 'No nbgrader metadata')}`
      );
    }
  );
  context.subscriptions.push(debugCmd);

  // Show welcome message (only on first activation)
  const hasShownWelcome = context.globalState.get('hasShownWelcome', false);
  if (!hasShownWelcome) {
    vscode.window.showInformationMessage(
      'nbgrader for VS Code is active! Click the tag icon in cell toolbar to set cell types.',
      'Got it'
    ).then(() => {
      context.globalState.update('hasShownWelcome', true);
    });
  }
}

/**
 * Deactivate the extension
 */
export function deactivate() {
  console.log('nbgrader extension is now deactivated');
}
