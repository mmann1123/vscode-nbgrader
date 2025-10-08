/**
 * Type definitions for nbgrader metadata
 * Based on nbgrader/src/create_assignment/create_assignment_model.ts
 */

export const NBGRADER_KEY = 'nbgrader';
export const NBGRADER_SCHEMA_VERSION = 3;

/**
 * Cell types supported by nbgrader
 */
export type CellType = '' | 'manual' | 'task' | 'solution' | 'tests' | 'readonly';

/**
 * User-friendly labels for cell types
 */
export const CELL_TYPE_LABELS: Record<CellType, string> = {
  '': '-',
  'manual': 'Manually graded answer',
  'task': 'Manually graded task',
  'solution': 'Autograded answer',
  'tests': 'Autograded tests',
  'readonly': 'Read-only'
};

/**
 * Reverse mapping from label to type
 */
export const LABEL_TO_CELL_TYPE: Record<string, CellType> = {
  '-': '',
  'Manually graded answer': 'manual',
  'Manually graded task': 'task',
  'Autograded answer': 'solution',
  'Autograded tests': 'tests',
  'Read-only': 'readonly'
};

/**
 * nbgrader metadata structure stored in cell.metadata.nbgrader
 */
export interface NbgraderData {
  schema_version?: number;
  grade_id?: string;
  grade?: boolean;
  solution?: boolean;
  locked?: boolean;
  task?: boolean;
  points?: number;
}

/**
 * Internal representation for UI
 */
export interface ToolData {
  type: CellType;
  id: string;
  points: number;
  locked: boolean;
}

/**
 * Check if a cell type requires points input
 */
export function isGradableType(type: CellType): boolean {
  return type === 'manual' || type === 'task' || type === 'tests';
}

/**
 * Check if a cell type is valid for code cells only
 */
export function isCodeOnlyType(type: CellType): boolean {
  return type === 'solution' || type === 'tests';
}

/**
 * Get available cell types for a given cell kind
 */
export function getAvailableTypes(isCodeCell: boolean): string[] {
  const baseTypes = ['-', 'Manually graded answer', 'Manually graded task', 'Read-only'];

  if (isCodeCell) {
    return [...baseTypes, 'Autograded answer', 'Autograded tests'];
  }

  return baseTypes;
}
