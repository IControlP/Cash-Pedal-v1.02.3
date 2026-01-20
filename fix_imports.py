"""
COMPLETE IMPORT FIXER - Run this in your project directory
This will fix ALL import statements to work with flat directory structure
"""

import os
import re
import glob

def fix_all_imports():
    """Fix all directory-based imports in all Python files"""
    
    # All possible import patterns to fix
    patterns = [
        (r'from\s+models\.depreciation\.([\w]+)\s+import', r'from \1 import'),
        (r'from\s+models\.maintenance\.([\w]+)\s+import', r'from \1 import'),
        (r'from\s+models\.insurance\.([\w]+)\s+import', r'from \1 import'),
        (r'from\s+models\.fuel\.([\w]+)\s+import', r'from \1 import'),
        (r'from\s+models\.([\w]+)\s+import', r'from \1 import'),
        (r'from\s+utils\.([\w]+)\s+import', r'from \1 import'),
        (r'from\s+ui\.([\w]+)\s+import', r'from \1 import'),
        (r'from\s+data\.([\w]+)\s+import', r'from \1 import'),
        (r'from\s+services\.([\w]+)\s+import', r'from \1 import'),
        # Fix importlib.import_module calls
        (r"importlib\.import_module\(f?['\"]data\.{([\w]+)}['\"]\)", r"importlib.import_module(\1)"),
        (r"importlib\.import_module\(['\"]data\.([\w]+)['\"]\)", r"importlib.import_module('\1')"),
    ]
    
    fixed_files = []
    error_files = []
    
    # Get all Python files in current directory
    py_files = glob.glob('*.py')
    
    if not py_files:
        print("❌ ERROR: No Python files found in current directory!")
        print("   Make sure you're running this script in your project folder.")
        return
    
    print(f"Found {len(py_files)} Python files to check...\n")
    
    for filepath in py_files:
        try:
            with open(filepath, 'r', encoding='utf-8') as f:
                content = f.read()
            
            original_content = content
            changes_made = 0
            
            # Apply all pattern fixes
            for old_pattern, new_pattern in patterns:
                new_content, count = re.subn(old_pattern, new_pattern, content)
                if count > 0:
                    changes_made += count
                    content = new_content
            
            # Write back if changed
            if content != original_content:
                with open(filepath, 'w', encoding='utf-8') as f:
                    f.write(content)
                fixed_files.append((filepath, changes_made))
                print(f"✓ {filepath}: Fixed {changes_made} import(s)")
        
        except Exception as e:
            error_files.append((filepath, str(e)))
            print(f"✗ {filepath}: ERROR - {e}")
    
    # Summary
    print("\n" + "="*60)
    print(f"SUMMARY:")
    print(f"  Fixed: {len(fixed_files)} files")
    print(f"  Errors: {len(error_files)} files")
    print(f"  Unchanged: {len(py_files) - len(fixed_files) - len(error_files)} files")
    print("="*60)
    
    if fixed_files:
        print("\n✅ FIXED FILES:")
        for filename, count in fixed_files:
            print(f"   {filename} ({count} changes)")
    
    if error_files:
        print("\n❌ FILES WITH ERRORS:")
        for filename, error in error_files:
            print(f"   {filename}: {error}")
    
    if not fixed_files and not error_files:
        print("\n✓ All files are already using correct imports!")
    
    print("\n" + "="*60)
    print("Next step: Run 'streamlit run main.py' to test your app")
    print("="*60)

if __name__ == "__main__":
    print("="*60)
    print("VEHICLE TCO CALCULATOR - IMPORT FIXER")
    print("="*60)
    print(f"Current directory: {os.getcwd()}")
    print()
    
    response = input("Fix all imports in this directory? (yes/no): ").strip().lower()
    
    if response in ['yes', 'y']:
        print("\nProcessing...\n")
        fix_all_imports()
    else:
        print("\nCancelled. No changes made.")
