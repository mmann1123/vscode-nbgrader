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
