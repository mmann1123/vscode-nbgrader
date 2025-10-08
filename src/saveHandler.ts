/**
 * Save handler to ensure nbgrader metadata persists
 *
 * Since we can't override VS Code's built-in Jupyter serializer,
 * we hook into save events and write metadata directly to the file.
 */

import * as vscode from 'vscode';
import * as fs from 'fs';
import { NBGRADER_KEY } from './metadata/types';

export function registerSaveHandler(context: vscode.ExtensionContext): void {
  // Listen for AFTER save events (onDid instead of onWill)
  const saveListener = vscode.workspace.onDidSaveNotebookDocument(async (notebook) => {
    if (notebook.notebookType !== 'jupyter-notebook') {
      return;
    }

    console.log('[nbgrader] Notebook was saved, patching file with metadata...');

    // Wait a bit to ensure VS Code finished writing
    await new Promise(resolve => setTimeout(resolve, 200));

    try {
      const filePath = notebook.uri.fsPath;

      // Read the saved file
      const content = fs.readFileSync(filePath, 'utf8');
      const notebookJson = JSON.parse(content);

      let modified = false;

      // Inject nbgrader metadata from in-memory cells
      for (let i = 0; i < notebook.cellCount; i++) {
        const cell = notebook.cellAt(i);
        const nbgraderMeta = cell.metadata?.[NBGRADER_KEY];
        const tags = cell.metadata?.tags;

        if (!notebookJson.cells[i]) {
          console.error(`[nbgrader] Cell ${i} missing in saved file!`);
          continue;
        }

        if (!notebookJson.cells[i].metadata) {
          notebookJson.cells[i].metadata = {};
        }

        // Inject nbgrader metadata
        if (nbgraderMeta) {
          notebookJson.cells[i].metadata[NBGRADER_KEY] = nbgraderMeta;
          modified = true;
          console.log(`[nbgrader] ✓ Injected nbgrader into cell ${i}:`, JSON.stringify(nbgraderMeta));
        }

        // Inject tags (backup storage)
        if (tags && Array.isArray(tags) && tags.length > 0) {
          notebookJson.cells[i].metadata.tags = tags;
          modified = true;
          console.log(`[nbgrader] ✓ Injected tags into cell ${i}:`, tags);
        }
      }

      if (modified) {
        // Write back to file
        fs.writeFileSync(filePath, JSON.stringify(notebookJson, null, 2), 'utf8');
        console.log('[nbgrader] ✓✓✓ Successfully persisted metadata to file!');
      } else {
        console.log('[nbgrader] No metadata to persist');
      }
    } catch (error) {
      console.error('[nbgrader] ✗ Failed to persist metadata:', error);
      vscode.window.showErrorMessage(`nbgrader: Failed to save metadata - ${error}`);
    }
  });

  context.subscriptions.push(saveListener);
  console.log('[nbgrader] ✓ Registered AFTER-save handler (onDidSave)');
}
