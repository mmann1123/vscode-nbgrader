/**
 * Core metadata management for nbgrader cells
 * Based on nbgrader/src/create_assignment/create_assignment_model.ts
 */

import * as vscode from 'vscode';
import {
  NbgraderData,
  CellType,
  NBGRADER_KEY,
  NBGRADER_SCHEMA_VERSION,
  isGradableType
} from './types';
import { generateGradeId } from '../utils/uuid';

/**
 * Check if we should use custom metadata wrapper
 * VS Code's ipynb serializer behavior changed - newer versions don't drop custom metadata
 */
function useCustomMetadata(): boolean {
  const ipynbExt = vscode.extensions.getExtension('vscode.ipynb');
  if (ipynbExt?.exports?.dropCustomMetadata !== undefined) {
    return !ipynbExt.exports.dropCustomMetadata;
  }
  return true; // Default to using custom for newer VS Code
}

/**
 * Get nbgrader metadata from a cell
 * Checks both custom.metadata.nbgrader and metadata.nbgrader paths
 */
export function getNbgraderData(cell: vscode.NotebookCell): NbgraderData | null {
  let metadata: any = null;

  // Try the appropriate metadata path based on VS Code version
  if (useCustomMetadata()) {
    metadata = (cell.metadata as any).custom?.metadata?.[NBGRADER_KEY];
  } else {
    metadata = (cell.metadata as any).metadata?.[NBGRADER_KEY];
  }

  if (metadata) {
    return metadata as NbgraderData;
  }

  // Fallback: try direct nbgrader metadata (older approach)
  metadata = cell.metadata?.[NBGRADER_KEY];
  if (metadata) {
    return metadata as NbgraderData;
  }

  // Last fallback: try to restore from tags (backup mechanism)
  const tags = (cell.metadata as any).custom?.metadata?.tags || (cell.metadata as any).metadata?.tags || cell.metadata?.tags as string[] | undefined;
  if (tags) {
    const nbgraderTag = tags.find((t: string) => t.startsWith('nbgrader:'));
    if (nbgraderTag) {
      try {
        const encoded = nbgraderTag.substring('nbgrader:'.length);
        const decoded = Buffer.from(encoded, 'base64').toString('utf8');
        metadata = JSON.parse(decoded);
        console.log('[nbgrader] Restored metadata from tag:', metadata);
        return metadata as NbgraderData;
      } catch (error) {
        console.error('[nbgrader] Failed to decode tag:', error);
      }
    }
  }

  return null;
}

/**
 * Get or create a grade_id for a cell
 */
export function getOrCreateGradeId(cell: vscode.NotebookCell): string {
  const existing = getNbgraderData(cell);
  if (existing?.grade_id) {
    return existing.grade_id;
  }
  return generateGradeId();
}

/**
 * Create nbgrader metadata for a given cell type
 * Matches the logic from nbgrader's create_assignment_model.ts
 */
export function createNbgraderMetadata(
  type: CellType,
  points: number,
  gradeId: string
): NbgraderData | null {
  if (type === '') {
    return null; // Remove metadata
  }

  const base: NbgraderData = {
    schema_version: NBGRADER_SCHEMA_VERSION,
    grade_id: gradeId
  };

  switch (type) {
    case 'manual':
      // Manually graded answer
      return {
        ...base,
        grade: true,
        solution: true,
        locked: false,
        points
      };

    case 'task':
      // Manually graded task
      return {
        ...base,
        // nbgrader requires grade, solution, and locked to be present
        grade: true,
        solution: false,
        locked: false,
        task: true,
        points
      };

    case 'solution':
      // Autograded answer (student writes code)
      return {
        ...base,
        solution: true,
        grade: false,
        locked: false
      };

    case 'tests':
      // Autograded tests (locked test cells)
      return {
        ...base,
        grade: true,
        solution: false,
        locked: true,
        points
      };

    case 'readonly':
      // Read-only cell
      return {
        ...base,
        // Explicitly include all required fields
        grade: false,
        solution: false,
        locked: true
      };

    default:
      return null;
  }
}

/**
 * Update cell metadata with nbgrader data
 * Uses custom.metadata.nbgrader or metadata.nbgrader based on VS Code version
 */
export async function updateCellMetadata(
  cell: vscode.NotebookCell,
  nbgraderData: NbgraderData | null
): Promise<boolean> {
  try {
    const edit = new vscode.WorkspaceEdit();
    const notebook = cell.notebook;

    // Deep clone existing metadata to preserve other keys
    const newMetadata = JSON.parse(JSON.stringify(cell.metadata));

    // Ensure all fields are JSON-serializable primitives
    const cleanData: any = nbgraderData ? {
      schema_version: nbgraderData.schema_version,
      grade_id: nbgraderData.grade_id
    } : null;

    if (nbgraderData) {
      // Only include defined fields
      if (nbgraderData.grade !== undefined) cleanData.grade = nbgraderData.grade;
      if (nbgraderData.solution !== undefined) cleanData.solution = nbgraderData.solution;
      if (nbgraderData.locked !== undefined) cleanData.locked = nbgraderData.locked;
      if (nbgraderData.task !== undefined) cleanData.task = nbgraderData.task;
      if (nbgraderData.points !== undefined) cleanData.points = nbgraderData.points;
    }

    // Set metadata using the appropriate path
    if (useCustomMetadata()) {
      newMetadata.custom = newMetadata.custom || {};
      newMetadata.custom.metadata = newMetadata.custom.metadata || {};

      if (nbgraderData === null) {
        delete newMetadata.custom.metadata[NBGRADER_KEY];
      } else {
        newMetadata.custom.metadata[NBGRADER_KEY] = cleanData;
      }
    } else {
      newMetadata.metadata = newMetadata.metadata || {};

      if (nbgraderData === null) {
        delete newMetadata.metadata[NBGRADER_KEY];
      } else {
        newMetadata.metadata[NBGRADER_KEY] = cleanData;
      }
    }

    // Sort keys alphabetically to minimize SCM changes (matching Jupyter behavior)
    const sortedMetadata = sortObjectPropertiesRecursively(newMetadata);

    edit.set(notebook.uri, [
      vscode.NotebookEdit.updateCellMetadata(cell.index, sortedMetadata)
    ]);

    const success = await vscode.workspace.applyEdit(edit);

    if (success) {
      console.log('[nbgrader] Metadata updated successfully');
    }

    return success;
  } catch (error) {
    console.error('Failed to update cell metadata:', error);
    return false;
  }
}

/**
 * Sort object properties recursively to minimize SCM changes
 * Matches Jupyter notebook/lab behavior
 */
function sortObjectPropertiesRecursively(obj: any): any {
  if (Array.isArray(obj)) {
    return obj.map(sortObjectPropertiesRecursively);
  }
  if (obj !== undefined && obj !== null && typeof obj === 'object' && Object.keys(obj).length > 0) {
    return Object.keys(obj)
      .sort()
      .reduce<Record<string, any>>((sortedObj, prop) => {
        sortedObj[prop] = sortObjectPropertiesRecursively(obj[prop]);
        return sortedObj;
      }, {});
  }
  return obj;
}

/**
 * Get the cell type from nbgrader metadata
 */
export function getCellType(data: NbgraderData | null, isCodeCell: boolean): CellType {
  if (!data) {
    return '';
  }

  // Task type
  if (data.task) {
    return 'task';
  }

  // Manually graded answer
  if (data.solution && data.grade) {
    return 'manual';
  }

  // Autograded answer (code only)
  if (data.solution && !data.grade && isCodeCell) {
    return 'solution';
  }

  // Autograded tests (code only)
  if (data.grade && !data.solution && isCodeCell) {
    return 'tests';
  }

  // Read-only
  if (data.locked && !data.solution && !data.grade && !data.task) {
    return 'readonly';
  }

  return '';
}

/**
 * Get human-readable description of cell type
 */
export function getCellTypeDescription(cell: vscode.NotebookCell): string {
  const data = getNbgraderData(cell);
  const isCode = cell.kind === vscode.NotebookCellKind.Code;
  const type = getCellType(data, isCode);

  if (type === '') {
    return 'Not graded';
  }

  const labels: Record<CellType, string> = {
    '': 'Not graded',
    'manual': 'Manually graded answer',
    'task': 'Manually graded task',
    'solution': 'Autograded answer',
    'tests': 'Autograded tests',
    'readonly': 'Read-only'
  };

  let desc = labels[type];

  // Add points if gradable
  if (isGradableType(type) && data?.points !== undefined) {
    desc += ` (${data.points} pts)`;
  }

  return desc;
}
