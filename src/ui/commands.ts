/**
 * Command handlers for nbgrader extension
 */

import * as vscode from 'vscode';
import {
  createNbgraderMetadata,
  updateCellMetadata,
  getOrCreateGradeId,
  getNbgraderData,
  getCellType
} from '../metadata/manager';
import {
  getAvailableTypes,
  LABEL_TO_CELL_TYPE,
  CellType,
  isGradableType,
  isCodeOnlyType,
  CELL_TYPE_LABELS
} from '../metadata/types';
import { validatePoints, parsePoints } from '../utils/validation';
import { generateGradeId } from '../utils/uuid';

// Shared output channel for validations
const output = vscode.window.createOutputChannel('nbgrader');

/**
 * Get the currently selected cell in the active notebook
 */
function getActiveCell(): vscode.NotebookCell | null {
  const editor = vscode.window.activeNotebookEditor;
  if (!editor) {
    return null;
  }

  const selection = editor.selection;
  if (!selection) {
    return null;
  }

  return editor.notebook.cellAt(selection.start);
}

/**
 * Command: Set cell type
 */
export async function setCellTypeCommand(): Promise<void> {
  const cell = getActiveCell();
  if (!cell) {
    vscode.window.showWarningMessage('No cell selected');
    return;
  }

  const isCode = cell.kind === vscode.NotebookCellKind.Code;
  const availableLabels = getAvailableTypes(isCode);

  // Get current type for default selection
  const currentData = getNbgraderData(cell);
  const currentType = getCellType(currentData, isCode);
  const currentLabel = CELL_TYPE_LABELS[currentType];

  // Show quick pick
  const selectedLabel = await vscode.window.showQuickPick(availableLabels, {
    placeHolder: 'Select nbgrader cell type',
    title: 'nbgrader Cell Type',
    matchOnDescription: true,
    matchOnDetail: true,
    ignoreFocusOut: false,
    // Pre-select current type
    ...(currentLabel && { activeItems: [currentLabel] })
  });

  if (selectedLabel === undefined) {
    return; // User cancelled
  }

  const selectedType = LABEL_TO_CELL_TYPE[selectedLabel];

  // Validate code-only types
  if (!isCode && isCodeOnlyType(selectedType)) {
    vscode.window.showErrorMessage(
      `"${selectedLabel}" can only be used with code cells. Convert this cell to code first.`
    );
    return;
  }

  // Get or create grade_id
  const gradeId = getOrCreateGradeId(cell);

  // If type is empty (clearing metadata)
  if (selectedType === '') {
    const success = await updateCellMetadata(cell, null);
    if (success) {
      vscode.window.showInformationMessage('nbgrader metadata cleared');
    } else {
      vscode.window.showErrorMessage('Failed to clear metadata');
    }
    return;
  }

  // For gradable types, ask for points
  let points = 0;
  if (isGradableType(selectedType)) {
    // Get current points if available
    const currentPoints = currentData?.points?.toString() || '0';

    const pointsInput = await vscode.window.showInputBox({
      prompt: 'Enter points for this cell',
      placeHolder: 'e.g., 10 or 2.5',
      value: currentPoints,
      validateInput: validatePoints,
      ignoreFocusOut: false
    });

    if (pointsInput === undefined) {
      return; // User cancelled
    }

    points = parsePoints(pointsInput);
  }

  // Create metadata
  const metadata = createNbgraderMetadata(selectedType, points, gradeId);

  // Update cell
  const success = await updateCellMetadata(cell, metadata);

  if (success) {
    // Debug: Log the metadata after update
    console.log('Metadata update successful. Cell metadata:', JSON.stringify(cell.metadata, null, 2));

    const msg = isGradableType(selectedType)
      ? `Cell type set to "${selectedLabel}" (${points} points)`
      : `Cell type set to "${selectedLabel}"`;
    vscode.window.showInformationMessage(msg);
  } else {
    vscode.window.showErrorMessage('Failed to set cell type');
  }
}

/**
 * Command: Clear cell metadata
 */
export async function clearCellMetadataCommand(): Promise<void> {
  const cell = getActiveCell();
  if (!cell) {
    vscode.window.showWarningMessage('No cell selected');
    return;
  }

  const data = getNbgraderData(cell);
  if (!data) {
    vscode.window.showInformationMessage('Cell has no nbgrader metadata');
    return;
  }

  const answer = await vscode.window.showWarningMessage(
    'Clear nbgrader metadata from this cell?',
    { modal: true },
    'Clear'
  );

  if (answer !== 'Clear') {
    return;
  }

  const success = await updateCellMetadata(cell, null);

  if (success) {
    vscode.window.showInformationMessage('nbgrader metadata cleared');
  } else {
    vscode.window.showErrorMessage('Failed to clear metadata');
  }
}

/**
 * Command: Validate current notebook for nbgrader metadata schema
 * - Ensures required fields exist (schema_version=3, grade, solution, locked)
 * - Ensures grade_id present when any of grade/solution/locked is true
 * - Ensures points present and >= 0 when grade is true
 * - Ensures code-only types (solution, tests) are only used on code cells
 * - Ensures grade_id values are unique and match allowed pattern
 */
export async function validateNotebookCommand(): Promise<void> {
  const editor = vscode.window.activeNotebookEditor;
  if (!editor) {
    vscode.window.showWarningMessage('No active notebook to validate');
    return;
  }
  if (editor.notebook.notebookType !== 'jupyter-notebook') {
    vscode.window.showWarningMessage('Only Jupyter notebooks are supported for validation');
    return;
  }

  const nb = editor.notebook;
  const errors: string[] = [];
  const warnings: string[] = [];
  const idToCells = new Map<string, number[]>();

  for (let i = 0; i < nb.cellCount; i++) {
    const cell = nb.cellAt(i);
    const isCode = cell.kind === vscode.NotebookCellKind.Code;
    const data = getNbgraderData(cell);

    if (!data) {
      continue; // cells without nbgrader metadata are ok
    }

    // Required fields presence and values
    const missing: string[] = [];
    if (data.schema_version !== 3) missing.push('schema_version=3');
    if (typeof data.grade !== 'boolean') missing.push('grade');
    if (typeof data.solution !== 'boolean') missing.push('solution');
    if (typeof data.locked !== 'boolean') missing.push('locked');
    if (missing.length) {
      errors.push(`[cell ${i}] Missing/invalid required fields: ${missing.join(', ')}`);
    }

    // grade_id required if any of grade/solution/locked is true
    if ((data.grade || data.solution || data.locked)) {
      if (!data.grade_id || typeof data.grade_id !== 'string') {
        errors.push(`[cell ${i}] grade_id is required when any of grade/solution/locked is true`);
      } else {
        // pattern check per nbgrader schema
        if (!/^[a-zA-Z0-9_\-]+$/.test(data.grade_id)) {
          errors.push(`[cell ${i}] grade_id '${data.grade_id}' contains invalid characters`);
        }
        const arr = idToCells.get(data.grade_id) ?? [];
        arr.push(i);
        idToCells.set(data.grade_id, arr);
      }
    }

    // points check when grade is true
    if (data.grade) {
      if (typeof data.points !== 'number' || Number.isNaN(data.points)) {
        errors.push(`[cell ${i}] points must be a number when grade is true`);
      } else if (data.points < 0) {
        errors.push(`[cell ${i}] points must be non-negative (got ${data.points})`);
      }
    }

    // type vs cell-kind constraints
    const type = getCellType(data, isCode);
    if ((type === 'solution' || type === 'tests') && !isCode) {
      errors.push(`[cell ${i}] '${type}' is only valid on code cells`);
    }
  }

  // duplicate grade_id detection
  for (const [gid, cells] of idToCells) {
    if (cells.length > 1) {
      errors.push(`Duplicate grade_id '${gid}' used by cells ${cells.join(', ')}`);
    }
  }

  // Calculate total points
  let totalPoints = 0;
  for (let i = 0; i < nb.cellCount; i++) {
    const cell = nb.cellAt(i);
    const data = getNbgraderData(cell);
    if (data && data.grade && typeof data.points === 'number' && !Number.isNaN(data.points)) {
      totalPoints += data.points;
    }
  }

  // Emit results
  output.appendLine('==== nbgrader validation ====' );
  output.appendLine(`Notebook: ${nb.uri.fsPath}`);
  output.appendLine(`Checked ${nb.cellCount} cells`);
  output.appendLine(`Total points: ${totalPoints}`);
  if (errors.length === 0) {
    output.appendLine('No errors found. ✔');
    if (warnings.length) {
      output.appendLine(`Warnings (${warnings.length}):`);
      warnings.forEach(w => output.appendLine('  - ' + w));
    }
    output.show(true);
    vscode.window.showInformationMessage(`nbgrader validation passed. Total points: ${totalPoints}`);
    return;
  }

  output.appendLine(`Errors (${errors.length}):`);
  errors.forEach(e => output.appendLine('  - ' + e));
  if (warnings.length) {
    output.appendLine(`Warnings (${warnings.length}):`);
    warnings.forEach(w => output.appendLine('  - ' + w));
  }
  output.show(true);
  vscode.window.showErrorMessage(`nbgrader validation failed with ${errors.length} error(s). See the 'nbgrader' output for details.`);
}

/**
 * Command: Fix current notebook nbgrader metadata
 * Applies automatic repairs for common validation errors and persists changes.
 */
export async function fixNotebookCommand(): Promise<void> {
  const editor = vscode.window.activeNotebookEditor;
  if (!editor) {
    vscode.window.showWarningMessage('No active notebook to fix');
    return;
  }
  if (editor.notebook.notebookType !== 'jupyter-notebook') {
    vscode.window.showWarningMessage('Only Jupyter notebooks are supported for fixing');
    return;
  }

  const nb = editor.notebook;
  output.appendLine('==== nbgrader fix ====' );
  output.appendLine(`Notebook: ${nb.uri.fsPath}`);

  // First pass: collect existing grade_ids to detect duplicates
  const idOwner = new Map<string, number>();
  for (let i = 0; i < nb.cellCount; i++) {
    const cell = nb.cellAt(i);
    const data = getNbgraderData(cell);
    if (!data) continue;
    const gid = data.grade_id;
    if (!gid) continue;
    if (!idOwner.has(gid)) {
      idOwner.set(gid, i);
    }
  }

  let fixes = 0;

  for (let i = 0; i < nb.cellCount; i++) {
    const cell = nb.cellAt(i);
    const isCode = cell.kind === vscode.NotebookCellKind.Code;
    const orig = getNbgraderData(cell);
    if (!orig) continue;

    const data: any = { ...orig };

    // Ensure required fields
    if (data.schema_version !== 3) data.schema_version = 3;
    if (typeof data.grade !== 'boolean') data.grade = false;
    if (typeof data.solution !== 'boolean') data.solution = false;
    if (typeof data.locked !== 'boolean') data.locked = false;
    if (typeof data.task !== 'boolean') data.task = false;

    // Normalize impossible combinations and code-only types
    const type = getCellType(data, isCode);
    if (!isCode) {
      // Convert code-only kinds to reasonable markdown equivalents
      if (type === 'solution') {
        // Convert to manually graded answer on markdown
        data.grade = true; data.solution = true; data.locked = false; data.task = false;
        if (typeof data.points !== 'number' || Number.isNaN(data.points)) data.points = 0;
      } else if (type === 'tests') {
        // Convert to manually graded answer by default
        data.grade = true; data.solution = true; data.locked = false; data.task = false;
        if (typeof data.points !== 'number' || Number.isNaN(data.points)) data.points = 0;
      }
    }

    // Task normalization: task implies graded, not solution, unlocked
    if (data.task) {
      data.grade = true; data.solution = false; data.locked = false;
    }

    // Points only if graded
    if (data.grade) {
      if (typeof data.points !== 'number' || Number.isNaN(data.points) || data.points < 0) {
        data.points = Math.max(0, Number(data.points) || 0);
      }
    } else {
      if (data.points !== undefined) delete data.points;
    }

    // grade_id required if any of the three is true; must be valid and unique
    const needsId = !!(data.grade || data.solution || data.locked);
    if (!needsId) {
      if (data.grade_id) delete data.grade_id;
    } else {
      let gid: string = data.grade_id;
      if (!gid || typeof gid !== 'string') gid = generateGradeId();
      // sanitize
      if (!/^[a-zA-Z0-9_\-]+$/.test(gid)) {
        gid = gid.replace(/[^a-zA-Z0-9_\-]/g, '_');
        if (!gid) gid = generateGradeId();
      }
      // ensure uniqueness: allow first owner, change others
      const owner = idOwner.get(gid);
      if (owner !== undefined && owner !== i) {
        // collision; generate a new unique id
        let newId = generateGradeId();
        while (idOwner.has(newId)) newId = generateGradeId();
        gid = newId;
      }
      idOwner.set(gid, i);
      data.grade_id = gid;
    }

    // Apply if changed
    const changed = JSON.stringify(orig) !== JSON.stringify(data);
    if (changed) {
      const ok = await updateCellMetadata(cell, data);
      if (ok) {
        fixes++;
        output.appendLine(`Fixed cell ${i}`);
      } else {
        output.appendLine(`Failed to update cell ${i}`);
      }
    }
  }

  if (fixes === 0) {
    output.appendLine('No changes required. ✔');
    output.show(true);
    vscode.window.showInformationMessage('nbgrader: No fixes were needed');
  } else {
    output.appendLine(`Completed with ${fixes} cell(s) updated.`);
    output.show(true);
    vscode.window.showInformationMessage(`nbgrader: Fixed ${fixes} cell(s). Re-run validation.`);
  }
}
