# Testing Guide

## Quick Test

1. Install dependencies: `npm install`
2. Compile: `npm run compile`
3. Press `F5` to launch Extension Development Host
4. Open a `.ipynb` file
5. Click tag icon in cell toolbar → Select "Autograded tests" → Enter "10" for points
6. Verify status bar shows: `$(tag) Autograded tests` and `$(star-full) 10 pts`

## Manual Test Cases

### Test 1: Basic Cell Type Setting
- **Action**: Set a code cell to "Autograded tests" with 5 points
- **Expected**:
  - Status bar shows "$(tag) Autograded tests"
  - Status bar shows "$(star-full) 5 pts"
  - Status bar shows "$(lock)"
  - Cell metadata contains: `{nbgrader: {schema_version: 3, grade_id: "cell-...", grade: true, solution: false, locked: true, points: 5}}`

### Test 2: Code-Only Type Validation
- **Action**: Try to set a markdown cell to "Autograded tests"
- **Expected**: Error message: "Autograded tests can only be used with code cells"

### Test 3: Points Validation
- **Action**: Set cell type to "Manually graded answer", enter "abc" for points
- **Expected**: Error message: "Points must be a number"

### Test 4: Clear Metadata
- **Action**: Set cell type, then run "Clear Cell Metadata" command
- **Expected**: Status bar items disappear, metadata removed

### Test 5: Cell Types
Test each type with appropriate cell kind:

| Type | Cell Kind | Points Required | Expected Metadata |
|------|-----------|-----------------|-------------------|
| - | Any | No | No metadata |
| Manually graded answer | Any | Yes | grade: true, solution: true |
| Manually graded task | Any | Yes | task: true |
| Autograded answer | Code only | No | solution: true, grade: false |
| Autograded tests | Code only | Yes | grade: true, solution: false, locked: true |
| Read-only | Any | No | locked: true |

### Test 6: Persistence
- **Action**: Set cell types, save notebook, close VS Code, reopen
- **Expected**: Status bar indicators still show, metadata preserved

### Test 7: Keyboard Shortcut
- **Action**: Select cell, press Ctrl+Shift+G (Cmd+Shift+G on Mac)
- **Expected**: Quick pick menu appears

### Test 8: Multiple Cells
- **Action**: Set different types on multiple cells in same notebook
- **Expected**: Each cell shows correct status bar items

## Integration Testing with nbgrader

### Test 9: nbgrader validate
```bash
# In VS Code: Create notebook, set cell types
# In terminal:
nbgrader validate test_notebook.ipynb
# Expected: No errors
```

### Test 10: nbgrader generate_assignment
```bash
# Create source notebook with various cell types
nbgrader generate_assignment assignment1
# Expected: Assignment generates successfully
```

### Test 11: Metadata Structure
```python
import nbformat

nb = nbformat.read('test.ipynb', as_version=4)
cell = nb.cells[0]
print(cell.metadata.get('nbgrader'))

# Expected output:
# {
#   'schema_version': 3,
#   'grade_id': 'cell-...',
#   'grade': True,
#   'solution': False,
#   'locked': True,
#   'points': 10
# }
```

## Performance Testing

### Test 12: Large Notebooks
- **Action**: Open notebook with 100+ cells, set types on multiple cells
- **Expected**: UI remains responsive, no lag

### Test 13: Rapid Changes
- **Action**: Quickly change cell type multiple times
- **Expected**: Status bar updates correctly, no race conditions

## Edge Cases

### Test 14: Invalid Existing Metadata
- **Action**: Manually create cell with invalid nbgrader metadata, open in extension
- **Expected**: Extension handles gracefully, allows setting valid type

### Test 15: Empty Points
- **Action**: Set gradable type, leave points input empty or cancel
- **Expected**: Operation cancelled, metadata unchanged

### Test 16: Concurrent Editing
- **Action**: Open same notebook in VS Code and JupyterLab
- **Expected**: Warning or graceful handling (known limitation)

## Automated Testing (Future)

```typescript
// Example unit test
import * as assert from 'assert';
import { createNbgraderMetadata } from '../src/metadata/manager';

suite('Metadata Manager', () => {
  test('Create autograded tests metadata', () => {
    const metadata = createNbgraderMetadata('tests', 10, 'cell-abc123');
    assert.strictEqual(metadata?.grade, true);
    assert.strictEqual(metadata?.solution, false);
    assert.strictEqual(metadata?.locked, true);
    assert.strictEqual(metadata?.points, 10);
  });
});
```

## Regression Testing

After any changes, run through all test cases above to ensure nothing broke.
