# Quick Start Guide

## Installation & Setup

### 1. Install the Extension

**From Source:**
```bash
cd vscode-nbgrader
npm install
npm run compile
```

Press `F5` to open Extension Development Host, OR:

```bash
npm install -g @vscode/vsce
vsce package
code --install-extension vscode-nbgrader-0.1.0.vsix
```

### 2. Verify Installation

1. Open VS Code
2. Open a Jupyter notebook (`.ipynb` file)
3. You should see a tag icon ($(tag)) in each cell's toolbar

## Creating Your First nbgrader Assignment

### Step 1: Create a Notebook

Create a new Jupyter notebook in VS Code named `assignment1.ipynb`

### Step 2: Add Instructions (Read-only cell)

1. Add a markdown cell with instructions
2. Click the **tag icon** in the cell toolbar
3. Select **"Read-only"**
4. Status bar shows: `$(tag) Read-only` and `$(lock)`

### Step 3: Add a Question Cell

1. Add a markdown cell with a question
2. Keep it as "**-**" (no grading)

### Step 4: Add Student Code Cell (Autograded answer)

1. Add a code cell with a placeholder:
```python
# YOUR CODE HERE
raise NotImplementedError()
```
2. Click the tag icon
3. Select **"Autograded answer"**
4. Status bar shows: `$(tag) Autograded answer`

### Step 5: Add Test Cell (Autograded tests)

1. Add a code cell with tests:
```python
# Test cell
assert multiply(2, 3) == 6
assert multiply(0, 10) == 0
print("All tests passed!")
```
2. Click the tag icon
3. Select **"Autograded tests"**
4. Enter **"10"** for points
5. Status bar shows: `$(tag) Autograded tests`, `$(star-full) 10 pts`, `$(lock)`

### Step 6: Save and Process

Save the notebook, then use nbgrader CLI:

```bash
# Validate the notebook
nbgrader validate assignment1.ipynb

# Generate student version
nbgrader generate_assignment assignment1 --force

# The student version will have:
# - Read-only cells locked
# - Solution cells cleared (YOUR CODE HERE)
# - Test cells present but locked
```

## Common Workflows

### Manual Grading Workflow

For essay questions or code that needs manual review:

1. Add markdown or code cell
2. Set type to **"Manually graded answer"**
3. Enter points (e.g., 5)
4. Students submit, you grade in formgrader

### Auto + Manual Grading

Combine both:

1. **Autograded answer** cell for student code
2. **Autograded tests** cell to check correctness (e.g., 8 points)
3. **Manually graded task** cell for style/explanation (e.g., 2 points)

### Task-Based Grading

For open-ended work:

1. Add cell with instructions
2. Set type to **"Manually graded task"**
3. Enter points
4. Review student work in formgrader

## Keyboard Shortcuts

- **Ctrl+Shift+G** (Cmd+Shift+G on Mac): Open cell type picker
- **Ctrl+Shift+P** → "nbgrader: Clear Cell Metadata": Remove nbgrader data

## Tips

✅ **Do:**
- Use **Autograded tests** for objective code checking
- Use **Manually graded answer** for subjective questions
- Use **Read-only** for instructions and setup code
- Set meaningful point values

❌ **Don't:**
- Don't use **Autograded tests** on markdown cells (code only!)
- Don't forget to set points on gradable cells
- Don't manually edit the metadata JSON (use the UI)

## Troubleshooting

### "No cell selected" error
- Click on a cell first, then use the command

### Cell type not showing in status bar
- Make sure you selected a type other than "-"
- Check that metadata was saved (re-open the notebook)

### "Can only be used with code cells" error
- Convert the cell to code first, or choose a different type

### nbgrader validate fails
- Check that cell metadata structure is correct
- Verify `schema_version: 3` in metadata
- Test by opening in JupyterLab to compare

## Next Steps

- Read the full [README.md](README.md)
- Check [TESTING.md](TESTING.md) for test cases
- See [DEVELOPMENT.md](DEVELOPMENT.md) for contributing

## Example Assignment Structure

```
assignment1.ipynb:
┌─────────────────────────────────────────┐
│ Cell 1 (Markdown, Read-only)            │
│ # Assignment 1: Python Basics           │
│ Complete the following exercises...     │
├─────────────────────────────────────────┤
│ Cell 2 (Markdown, -)                    │
│ ## Question 1                           │
│ Write a function to multiply two nums   │
├─────────────────────────────────────────┤
│ Cell 3 (Code, Autograded answer)        │
│ def multiply(a, b):                     │
│     # YOUR CODE HERE                    │
├─────────────────────────────────────────┤
│ Cell 4 (Code, Autograded tests, 10pts)  │
│ assert multiply(2, 3) == 6              │
│ assert multiply(0, 10) == 0             │
├─────────────────────────────────────────┤
│ Cell 5 (Markdown, Manually graded, 5pts)│
│ Explain your implementation:            │
└─────────────────────────────────────────┘
```

Each cell shows its type and points in the status bar!
