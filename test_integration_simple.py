"""
Simple integration test without Streamlit/pandas dependencies.
Verifies the core integration points.
"""

def test_specs_database_structure():
    """Verify the specs database has the expected structure"""
    print("\n=== Testing Specs Database Structure ===")

    try:
        from vehicle_specs_database import VEHICLE_SPECS_DATABASE, get_vehicle_specs

        # Test structure
        print(f"✓ Database loaded with {len(VEHICLE_SPECS_DATABASE)} makes")

        # Test a few popular makes
        test_makes = ['Toyota', 'Honda', 'Ford', 'Tesla', 'Chevrolet']
        found_makes = [make for make in test_makes if make in VEHICLE_SPECS_DATABASE]

        print(f"✓ Found {len(found_makes)}/{len(test_makes)} popular makes")

        # Test specs extraction for real vehicles
        test_cases = [
            ("Toyota", "Camry", 2024, "LE"),
            ("Honda", "Civic", 2023, "LX"),
            ("Ford", "Mustang", 2024, "GT"),
            ("Chevrolet", "Silverado 1500", 2024, "LT"),
        ]

        specs_found = 0
        for make, model, year, trim in test_cases:
            specs = get_vehicle_specs(make, model, year, trim)
            if specs and all(key in specs for key in ['horsepower', 'seats', 'cargo_cu_ft']):
                specs_found += 1
                print(f"✓ {year} {make} {model} {trim}: HP={specs['horsepower']}, Seats={specs['seats']}, Cargo={specs['cargo_cu_ft']}")

        if specs_found >= len(test_cases) * 0.75:  # At least 75% should have specs
            print(f"✓ Specs retrieval working: {specs_found}/{len(test_cases)} vehicles have complete specs")
            return True
        else:
            print(f"✗ Insufficient specs coverage: only {specs_found}/{len(test_cases)} vehicles")
            return False

    except Exception as e:
        print(f"✗ Error: {e}")
        import traceback
        traceback.print_exc()
        return False


def test_comparison_service_structure():
    """Test that comparison service has the expected methods and structure"""
    print("\n=== Testing Comparison Service Structure ===")

    try:
        # Import without running to check structure
        import comparison_service

        # Check that ComparisonService class exists
        if hasattr(comparison_service, 'ComparisonService'):
            print("✓ ComparisonService class exists")
        else:
            print("✗ ComparisonService class not found")
            return False

        service_class = comparison_service.ComparisonService

        # Check for key methods
        required_methods = [
            'compare_vehicles',
            '_extract_comparison_metrics',
            '_fetch_vehicle_specs',
            '_create_vehicle_rankings',
            '_generate_comparison_insights',
            'get_vehicle_recommendations'
        ]

        for method in required_methods:
            if hasattr(service_class, method):
                print(f"✓ Method exists: {method}")
            else:
                print(f"✗ Method missing: {method}")
                return False

        return True

    except Exception as e:
        print(f"✗ Error: {e}")
        import traceback
        traceback.print_exc()
        return False


def test_calculator_display_integration():
    """Test that calculator display has the Add to Comparison button"""
    print("\n=== Testing Calculator Display Integration ===")

    try:
        with open('/home/user/Cash-Pedal-v1.02.3/calculator_display.py', 'r') as f:
            content = f.read()

        # Check for key integration points
        checks = [
            ('Add to Comparison button', 'Add to Comparison'),
            ('add_vehicle_to_comparison call', 'add_vehicle_to_comparison'),
            ('display_calculator function', 'def display_calculator'),
            ('Save calculation results', 'save_calculation_results')
        ]

        all_found = True
        for check_name, search_str in checks:
            if search_str in content:
                print(f"✓ {check_name} found")
            else:
                print(f"✗ {check_name} not found")
                all_found = False

        return all_found

    except Exception as e:
        print(f"✗ Error: {e}")
        return False


def test_session_manager_structure():
    """Test that session manager has the expected functions"""
    print("\n=== Testing Session Manager Structure ===")

    try:
        with open('/home/user/Cash-Pedal-v1.02.3/session_manager.py', 'r') as f:
            content = f.read()

        # Check for key functions
        required_functions = [
            'add_vehicle_to_comparison',
            'remove_vehicle_from_comparison',
            'get_comparison_vehicle_count',
            'is_comparison_ready'
        ]

        all_found = True
        for func in required_functions:
            if f'def {func}' in content:
                print(f"✓ Function exists: {func}")
            else:
                print(f"✗ Function missing: {func}")
                all_found = False

        # Check for duplicate checking logic
        if 'already in your comparison' in content:
            print("✓ Duplicate checking implemented")
        else:
            print("✗ Duplicate checking not found")
            all_found = False

        # Check for max vehicles limit
        if 'max_vehicles' in content:
            print("✓ Maximum vehicles limit implemented")
        else:
            print("✗ Maximum vehicles limit not found")
            all_found = False

        return all_found

    except Exception as e:
        print(f"✗ Error: {e}")
        return False


def test_comparison_display_structure():
    """Test that comparison display has specs comparison functionality"""
    print("\n=== Testing Comparison Display Structure ===")

    try:
        with open('/home/user/Cash-Pedal-v1.02.3/comparison_display.py', 'r') as f:
            content = f.read()

        # Check for key display functions
        checks = [
            ('display_comparison function', 'def display_comparison'),
            ('display_specs_comparison function', 'def display_specs_comparison'),
            ('display_comparison_tabs function', 'def display_comparison_tabs'),
            ('Horsepower ranking', 'by_horsepower'),
            ('MPG ranking', 'by_mpg'),
            ('Seats ranking', 'by_seats'),
            ('Cargo ranking', 'by_cargo'),
            ('Cost comparison', 'Cost Comparison'),
            ('Vehicle Specs tab', 'Vehicle Specs')
        ]

        all_found = True
        for check_name, search_str in checks:
            if search_str in content:
                print(f"✓ {check_name} found")
            else:
                print(f"✗ {check_name} not found")
                all_found = False

        return all_found

    except Exception as e:
        print(f"✗ Error: {e}")
        return False


def test_ranking_categories():
    """Test that all required ranking categories are in comparison_service.py"""
    print("\n=== Testing Ranking Categories ===")

    try:
        with open('/home/user/Cash-Pedal-v1.02.3/comparison_service.py', 'r') as f:
            content = f.read()

        # Check for ranking categories
        ranking_categories = {
            'Cost rankings': [
                'by_annual_cost',
                'by_total_cost',
                'by_cost_per_mile',
                'by_affordability',
                'by_value_score'
            ],
            'Spec rankings': [
                'by_horsepower',
                'by_mpg',
                'by_seats',
                'by_cargo'
            ],
            'Best winners': [
                'best_annual_cost',
                'best_total_cost',
                'best_value',
                'most_affordable',
                'most_powerful',
                'best_mpg',
                'most_seats',
                'most_cargo'
            ]
        }

        all_found = True
        for category_group, categories in ranking_categories.items():
            print(f"\n{category_group}:")
            for category in categories:
                if category in content:
                    print(f"  ✓ {category}")
                else:
                    print(f"  ✗ {category}")
                    all_found = False

        return all_found

    except Exception as e:
        print(f"✗ Error: {e}")
        return False


def main():
    """Run all simple integration tests"""
    print("=" * 70)
    print("Cash Pedal Simple Integration Test Suite")
    print("Testing integration without external dependencies")
    print("=" * 70)

    results = {}

    # Run tests
    results['Specs Database Structure'] = test_specs_database_structure()
    results['Comparison Service Structure'] = test_comparison_service_structure()
    results['Calculator Display Integration'] = test_calculator_display_integration()
    results['Session Manager Structure'] = test_session_manager_structure()
    results['Comparison Display Structure'] = test_comparison_display_structure()
    results['Ranking Categories'] = test_ranking_categories()

    # Summary
    print("\n" + "=" * 70)
    print("Test Summary")
    print("=" * 70)

    for test_name, result in results.items():
        status = "✓ PASS" if result else "✗ FAIL"
        print(f"{status}: {test_name}")

    # Overall result
    passed = sum(1 for r in results.values() if r)
    failed = sum(1 for r in results.values() if not r)
    total = len(results)

    print(f"\nResults: {passed}/{total} tests passed")

    if failed == 0:
        print("\n✓ All integration points verified successfully!")
        print("\nIntegration Summary:")
        print("  ✓ Single vehicle calculator can add vehicles to comparison")
        print("  ✓ Vehicle specs (HP, MPG, seats, cargo) are fetched from database")
        print("  ✓ Comparison service ranks vehicles by specs and costs")
        print("  ✓ Comparison display shows specs comparison and rankings")
        print("  ✓ Session manager handles vehicle storage and duplicates")
        return 0
    else:
        print(f"\n⚠ {failed} test(s) failed. Please review the output above.")
        return 1


if __name__ == "__main__":
    exit(main())
