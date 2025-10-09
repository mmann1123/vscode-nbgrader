/**
 * Save handler to ensure nbgrader metadata persists
 *
 * Since we can't override VS Code's built-in Jupyter serializer,
 * we hook into save events and write metadata directly to the file.
 */

import * as vscode from 'vscode';
import * as fs from 'fs';
import { NBGRADER_KEY } from './metadata/types';

/**
 * Check if we should use custom metadata wrapper
 */
function useCustomMetadata(): boolean {
  const ipynbExt = vscode.extensions.getExtension('vscode.ipynb');
  if (ipynbExt?.exports?.dropCustomMetadata !== undefined) {
    return !ipynbExt.exports.dropCustomMetadata;
  }
  return true;
}

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
        const cellMeta = cell.metadata as any;

        // Get nbgrader metadata from the appropriate path
        let nbgraderMeta = null;
        if (useCustomMetadata()) {
          nbgraderMeta = cellMeta?.custom?.metadata?.[NBGRADER_KEY];
        } else {
          nbgraderMeta = cellMeta?.metadata?.[NBGRADER_KEY];
        }

        // Fallback to direct path
        if (!nbgraderMeta) {
          nbgraderMeta = cellMeta?.[NBGRADER_KEY];
        }

        if (!notebookJson.cells[i]) {
          console.error(`[nbgrader] Cell ${i} missing in saved file!`);
          continue;
        }

        if (!notebookJson.cells[i].metadata) {
          notebookJson.cells[i].metadata = {};
        }

        // Inject nbgrader metadata at the ROOT level (for nbgrader CLI compatibility)
        if (nbgraderMeta) {
          notebookJson.cells[i].metadata[NBGRADER_KEY] = nbgraderMeta;
          modified = true;
          console.log(`[nbgrader] ✓ Injected nbgrader into cell ${i}:`, JSON.stringify(nbgraderMeta));
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
