/**
 * Generate a short UUID for grade_id
 * Format matches nbgrader: cell-{12 hex chars}
 */
export function generateGradeId(): string {
  const hex = Array.from({ length: 12 }, () =>
    Math.floor(Math.random() * 16).toString(16)
  ).join('');
  return `cell-${hex}`;
}
