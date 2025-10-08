# Metadata Persistence Debugging

## Issue: Metadata not saved when notebook is saved/reopened

### Steps to Debug

1. **Recompile and Reload Extension**
   ```bash
   npm run compile
   ```
   Then close the Extension Development Host and press F5 again.

2. **Test with Debug Logging**
   - Set cell type
   - Open **View → Output → Extension Host**
   - Look for log: `Metadata update successful. Cell metadata: {...}`
   - Check if the nbgrader metadata is in there

3. **Manually Inspect the .ipynb File**
   ```bash
   cat your_notebook.ipynb | jq '.cells[0].metadata'
   ```
   Or open in text editor and look for:
   ```json
   {
     "cells": [
       {
         "metadata": {
           "nbgrader": {
             "schema_version": 3,
             "grade_id": "cell-abc123",
             ...
           }
         }
       }
     ]
   }
   ```

4. **Check if Metadata Exists Before Save**
   - Set cell type
   - DON'T save yet
   - Open Command Palette → "Developer: Inspect Context Keys"
   - Or check console output
   - Metadata should be there

5. **Check if Save Strips Metadata**
   - If metadata exists before save but not after
   - VS Code might be stripping it
   - This is a known issue with some notebook controllers

### Possible Causes & Fixes

#### Cause 1: Notebook Controller Stripping Metadata

Some Jupyter notebook controllers strip unknown metadata on save.

**Fix:** Update package.json to declare we're a notebook controller:

```json
{
  "contributes": {
    "notebookPreload": [
      {
        "type": "jupyter-notebook",
        "entrypoint": "./out/extension.js"
      }
    ]
  }
}
```

#### Cause 2: VS Code Not Marking Document as Dirty

The notebook might not be marked as "dirty" after metadata change.

**Fix:** Add explicit save trigger:

```typescript
// After updateCellMetadata
if (success) {
  // Trigger save prompt
  await vscode.workspace.saveAll(false);
}
```

#### Cause 3: Metadata Serialization Issue

VS Code might not serialize certain metadata fields.

**Test:** Try simpler metadata first:
```typescript
// In updateCellMetadata, try this minimal version:
newMetadata['nbgrader'] = { test: 'value' };
```

If this saves, the issue is with the data structure.

#### Cause 4: Timing Issue

The edit might not complete before save.

**Fix:** Add delay or await:
```typescript
const success = await vscode.workspace.applyEdit(edit);
await new Promise(resolve => setTimeout(resolve, 100));
```

### Testing Workflow

1. **Close Extension Development Host**
2. **Recompile:** `npm run compile`
3. **Press F5** to restart
4. **Open a notebook**
5. **Set cell type**
6. **Check console:** Should see metadata logged
7. **Save notebook** (Ctrl+S)
8. **Close notebook**
9. **Reopen notebook**
10. **Check if metadata persisted**

### Alternative: Force Metadata Write

If WorkspaceEdit isn't working, we can try writing directly to the document:

```typescript
export async function updateCellMetadata(
  cell: vscode.NotebookCell,
  nbgraderData: NbgraderData | null
): Promise<boolean> {
  try {
    const edit = new vscode.WorkspaceEdit();
    const notebook = cell.notebook;
    const newMetadata = { ...cell.metadata };

    if (nbgraderData === null) {
      delete newMetadata[NBGRADER_KEY];
    } else {
      newMetadata[NBGRADER_KEY] = nbgraderData;
    }

    // Create cell edit
    const cellEdit = vscode.NotebookEdit.updateCellMetadata(cell.index, newMetadata);
    edit.set(notebook.uri, [cellEdit]);

    // Apply and wait
    const success = await vscode.workspace.applyEdit(edit);

    // Mark document as dirty to ensure save
    if (success) {
      // This might trigger a save prompt
      const edit2 = new vscode.WorkspaceEdit();
      edit2.set(notebook.uri, [
        vscode.NotebookEdit.updateNotebookMetadata({
          ...notebook.metadata,
          modified: Date.now()
        })
      ]);
      await vscode.workspace.applyEdit(edit2);
    }

    return success;
  } catch (error) {
    console.error('Failed to update cell metadata:', error);
    return false;
  }
}
```

### Quick Test Command

Add a test command to verify metadata reading:

```typescript
// In extension.ts
vscode.commands.registerCommand('nbgrader.debugMetadata', () => {
  const cell = getActiveCell();
  if (cell) {
    vscode.window.showInformationMessage(
      `Metadata: ${JSON.stringify(cell.metadata?.nbgrader || 'none')}`
    );
  }
});
```

Then run this after setting a cell type to see if metadata is there.

### Known VS Code Issues

- Some notebook controllers reset metadata on save
- Metadata might be cached and not reload
- File system watchers might interfere

### Next Steps

1. Add debug logging (done)
2. Recompile and test
3. Check console output
4. Manually inspect .ipynb file
5. Try fixes above if needed
