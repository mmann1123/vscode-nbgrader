/**
 * Status bar provider for showing cell type in notebook cells
 */

import * as vscode from 'vscode';
import { getNbgraderData, getCellType } from '../metadata/manager';
import { CELL_TYPE_LABELS, isGradableType } from '../metadata/types';

export class NbgraderStatusBarProvider implements vscode.NotebookCellStatusBarItemProvider {
  /**
   * Provide status bar items for a cell
   */
  provideCellStatusBarItems(
    cell: vscode.NotebookCell,
    token: vscode.CancellationToken
  ): vscode.ProviderResult<vscode.NotebookCellStatusBarItem[]> {
    const data = getNbgraderData(cell);

    // If no nbgrader metadata, show nothing
    if (!data) {
      return [];
    }

    const isCode = cell.kind === vscode.NotebookCellKind.Code;
    const type = getCellType(data, isCode);

    if (type === '') {
      return [];
    }

    const items: vscode.NotebookCellStatusBarItem[] = [];

    // Main type indicator
    const typeLabel = CELL_TYPE_LABELS[type];
    const typeItem = new vscode.NotebookCellStatusBarItem(
      `$(tag) ${typeLabel}`,
      vscode.NotebookCellStatusBarAlignment.Right
    );
    typeItem.command = 'nbgrader.setCellType';
    typeItem.tooltip = 'Click to change nbgrader cell type';
    items.push(typeItem);

    // Points indicator (for gradable types)
    if (isGradableType(type) && data.points !== undefined) {
      const pointsItem = new vscode.NotebookCellStatusBarItem(
        `$(star-full) ${data.points} pts`,
        vscode.NotebookCellStatusBarAlignment.Right
      );
      pointsItem.tooltip = 'Points for this cell';
      items.push(pointsItem);
    }

    // Lock indicator
    if (data.locked) {
      const lockItem = new vscode.NotebookCellStatusBarItem(
        '$(lock)',
        vscode.NotebookCellStatusBarAlignment.Right
      );
      lockItem.tooltip = 'This cell is locked (read-only for students)';
      items.push(lockItem);
    }

    return items;
  }
}
