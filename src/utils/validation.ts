/**
 * Validation utilities for nbgrader metadata
 */

/**
 * Validate points input
 */
export function validatePoints(input: string): string | null {
  if (!input || input.trim() === '') {
    return 'Points cannot be empty';
  }

  const num = parseFloat(input);
  if (isNaN(num)) {
    return 'Points must be a number';
  }

  if (num < 0) {
    return 'Points must be non-negative';
  }

  return null; // Valid
}

/**
 * Parse points string to number
 */
export function parsePoints(input: string): number {
  const num = parseFloat(input);
  return isNaN(num) ? 0 : Math.max(0, num);
}
