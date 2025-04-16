import os
import fnmatch

DEFAULT_IGNORE_LIST = ['.git', 'node_modules', 'venv']

def load_gitignore_patterns(gitignore_path):
    """
    Reads patterns from a .gitignore file, skipping comments and empty lines.
    Returns a list of ignore patterns.
    """
    patterns = []
    if os.path.isfile(gitignore_path):
        with open(gitignore_path, 'r', encoding='utf-8') as f:
            for line in f:
                line = line.strip()
                # Skip comments and empty lines
                if not line or line.startswith('#'):
                    continue
                # Optionally remove trailing slash to unify directory matching
                if line.endswith('/'):
                    line = line[:-1]
                patterns.append(line)
    return patterns

def matches_any_pattern(path_to_check, patterns):
    """
    Returns True if the given path_to_check matches any of the patterns (via fnmatch).
    """
    for pat in patterns:
        if fnmatch.fnmatch(path_to_check, pat):
            return True
    return False

def print_directory_structure(start_path='.'):
    """
    Recursively prints the structure of directories and files from the given start path,
    ignoring any paths that match patterns from:
      1) DEFAULT_IGNORE_LIST
      2) The local .gitignore in start_path (if it exists)
    """
    # Load .gitignore patterns
    gitignore_path = os.path.join(start_path, '.gitignore')
    gitignore_patterns = load_gitignore_patterns(gitignore_path)

    # Combine hard-coded and .gitignore-based patterns
    ignore_patterns = DEFAULT_IGNORE_LIST + gitignore_patterns

    for root, dirs, files in os.walk(start_path):
        # Get the path of this root relative to start_path
        rel_root = os.path.relpath(root, start_path)
        # If rel_root == '.', we treat that as empty (top-level)
        if rel_root == '.':
            rel_root = ''

        # Filter directories in-place: skip any directory whose *relative path* matches
        for d in dirs[:]:
            # Build its relative path (e.g. "frontend/node_modules")
            dir_path = os.path.join(rel_root, d) if rel_root else d
            if matches_any_pattern(dir_path, ignore_patterns):
                dirs.remove(d)

        # Filter files in-place: skip any file whose *relative path* matches
        for f in files[:]:
            file_path = os.path.join(rel_root, f) if rel_root else f
            if matches_any_pattern(file_path, ignore_patterns):
                files.remove(f)

        # Now we print the surviving directories and files
        # Determine indentation by counting path separators
        level = root.replace(start_path, '').count(os.sep)
        indent = ' ' * 4 * level
        print(f"{indent}{os.path.basename(root)}/")

        sub_indent = ' ' * 4 * (level + 1)
        for f in files:
            print(f"{sub_indent}{f}")

if __name__ == "__main__":
    print_directory_structure(".")
