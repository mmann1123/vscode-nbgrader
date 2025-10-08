# nbgrader cell tags for VS Code

Create and manage [nbgrader](https://nbgrader.readthedocs.io/) assignments directly in Visual Studio Code.



## Features

- **Cell Toolbar Button**: Click the tag icon ($(tag)) in any notebook cell toolbar to set its nbgrader type
- **Status Bar Indicators**: See cell type, points, and lock status at the bottom of each cell
- **Full nbgrader Support**: Compatible with all nbgrader cell types:
  - `-` (no grading)
  - Manually graded answer
  - Manually graded task
  - Autograded answer (code cells only)
  - Autograded tests (code cells only)
  - Read-only

## Usage

<video controls src="static/nbgrader.mp4" title="nbgrader demo"></video>


### Setting Cell Types

1. Open a Jupyter notebook in VS Code
2. Click on a cell to select it
3. Click the **tag icon** in the cell toolbar (top-right of the cell)
4. Choose the cell type from the dropdown
5. For gradable types, enter the point value

**Alternative**: Use the command palette (`Ctrl+Shift+P` / `Cmd+Shift+P`) and search for "nbgrader: Set Cell Type"

**Keyboard Shortcut**: `Ctrl+Shift+G` / `Cmd+Shift+G`

### Visual Indicators

Each cell with nbgrader metadata shows indicators in the status bar at the bottom:

- **$(tag) Cell Type**: The assigned nbgrader type (click to change)
- **$(star-full) Points**: Point value (for gradable cells)
- **$(lock)**: Lock indicator (for read-only cells)

### Clearing Metadata

Use the command palette and search for "nbgrader: Clear Cell Metadata" to remove nbgrader metadata from a cell.

## Requirements

- VS Code 1.75.0 or higher
- Jupyter extension for VS Code
- nbgrader (Python package) for processing assignments

## How It Works

This extension modifies the notebook cell metadata to add nbgrader-specific fields. The metadata structure matches exactly what nbgrader expects:

```json
{
  "nbgrader": {
    "schema_version": 3,
    "grade_id": "cell-abc123def456",
    "grade": true,
    "solution": false,
    "locked": true,
    "points": 10
  }
}
```

The notebook file (`.ipynb`) is compatible with:
- JupyterLab's nbgrader extension
- Jupyter Notebook's nbgrader extension
- nbgrader command-line tools

## Cell Type Details

### Manually graded answer
- `solution: true, grade: true`
- Student writes answer, instructor manually grades
- Requires points value
- Works with code or markdown cells

### Manually graded task
- `task: true`
- Open-ended task for manual grading
- Requires points value
- Works with code or markdown cells

### Autograded answer
- `solution: true, grade: false`
- Student writes code, replaced with solution during grading
- **Code cells only**
- No points (tests will have points)

### Autograded tests
- `grade: true, solution: false, locked: true`
- Contains test code that runs against student solution
- **Code cells only**
- Requires points value
- Cell is locked (read-only for students)

### Read-only
- `locked: true`
- Cell cannot be edited by students
- Works with code or markdown cells

## Tips

- Use **Autograded answer** for cells where students write code
- Use **Autograded tests** for cells that check the student's code
- Use **Manually graded answer** for free-form questions or code that needs manual review
- Use **Read-only** for instructions or provided code that shouldn't be modified

## Development

To build and test locally:

```bash
git clone <repository-url>
cd vscode-nbgrader
npm install
npm run compile
```

Press `F5` to open a new VS Code window with the extension loaded.

## Compatibility

This extension is designed to be fully compatible with the official nbgrader toolchain. You can:

1. Create assignments in VS Code using this extension
2. Process them with `nbgrader generate_assignment`
3. Grade them with `nbgrader autograde` and the formgrader
4. Switch between VS Code and JupyterLab seamlessly

## Known Limitations

- Cell toolbar button appears on all cells (nbgrader-specific cells are marked via status bar)
- Cannot bulk-edit multiple cells at once (planned feature)
- No visual cell decorations beyond status bar (VS Code API limitation)

## Related

- [nbgrader Documentation](https://nbgrader.readthedocs.io/)
- [nbgrader GitHub](https://github.com/jupyter/nbgrader)

## License

BSD-3-Clause (matches nbgrader)
