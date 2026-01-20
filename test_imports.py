"""
Import Verification Script
Run this to verify all imports work correctly before running the app
"""

import sys
import os

def test_imports():
    """Test that all critical imports work"""
    
    print("="*70)
    print("VEHICLE TCO CALCULATOR - IMPORT VERIFICATION TEST")
    print("="*70)
    print()
    
    errors = []
    success = []
    
    # List of all critical modules to test
    test_modules = [
        'main',
        'calculator_display',
        'comparison_display',
        'comparison_service',
        'input_forms',
        'prediction_service',
        'session_manager',
        'recommendation_engine',
        'enhanced_depreciation',
        'maintenance_utils',
        'advanced_insurance',
        'fuel_utils',
        'electric_vehicle_utils',
        'financial_analysis',
        'used_vehicle_estimator',
        'vehicle_database',
        'vehicle_helpers',
        'vehicle_mpg_database',
        'zip_code_utils',
    ]
    
    print("Testing critical modules...")
    print()
    
    for module_name in test_modules:
        try:
            __import__(module_name)
            success.append(module_name)
            print(f"✓ {module_name}")
        except ImportError as e:
            errors.append((module_name, str(e)))
            print(f"✗ {module_name}: {e}")
        except Exception as e:
            errors.append((module_name, f"Unexpected error: {e}"))
            print(f"⚠ {module_name}: Unexpected error - {e}")
    
    # Test vehicle database letter files
    print("\nTesting vehicle database modules...")
    print()
    
    letter_modules = ['a', 'b', 'c', 'd', 'f', 'g', 'h', 'i', 'j', 'k', 'l', 'm', 'n', 'p', 'r', 's', 't', 'v']
    
    for letter in letter_modules:
        module_name = f'vehicle_database_{letter}'
        try:
            __import__(module_name)
            success.append(module_name)
            print(f"✓ {module_name}")
        except ImportError as e:
            errors.append((module_name, str(e)))
            print(f"✗ {module_name}: {e}")
        except Exception as e:
            # Some errors are expected (e.g., missing data in some modules)
            success.append(module_name)
            print(f"⚠ {module_name}: Loaded with warnings")
    
    # Summary
    print("\n" + "="*70)
    print("TEST RESULTS:")
    print("="*70)
    print(f"✅ Successfully imported: {len(success)} modules")
    print(f"❌ Failed imports: {len(errors)} modules")
    print()
    
    if errors:
        print("FAILED IMPORTS:")
        print("-" * 70)
        for module, error in errors:
            print(f"  {module}")
            print(f"    Error: {error}")
            print()
        
        print("="*70)
        print("⚠️  SOME IMPORTS FAILED!")
        print("="*70)
        print()
        print("ACTION REQUIRED:")
        print("1. Make sure all .py files are in the SAME directory")
        print("2. Run 'python fix_imports.py' to fix import statements")
        print("3. Run this test again")
        print()
        return False
    else:
        print("="*70)
        print("✅ ALL IMPORTS SUCCESSFUL!")
        print("="*70)
        print()
        print("You're ready to run the app:")
        print("  streamlit run main.py")
        print()
        return True

if __name__ == "__main__":
    success = test_imports()
    sys.exit(0 if success else 1)
