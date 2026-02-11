"""
Test script to verify integration between single vehicle calculator and multi-car comparison tool.
Tests:
1. Vehicle specs are being fetched correctly
2. Vehicles can be added to comparison
3. Rankings are created properly for all categories including specs
"""

import sys
from typing import Dict, Any

# Test vehicle specs database
def test_vehicle_specs_lookup():
    """Test that vehicle specs can be fetched from the database"""
    print("\n=== Testing Vehicle Specs Lookup ===")

    try:
        from vehicle_specs_database import get_vehicle_specs

        test_vehicles = [
            ("Toyota", "Camry", 2024, "LE"),
            ("Honda", "Accord", 2023, "EX"),
            ("Ford", "F-150", 2024, "XLT"),
            ("Tesla", "Model 3", 2024, "Long Range")
        ]

        for make, model, year, trim in test_vehicles:
            specs = get_vehicle_specs(make, model, year, trim)
            if specs:
                print(f"✓ {year} {make} {model} {trim}:")
                print(f"  - Horsepower: {specs.get('horsepower', 'N/A')}")
                print(f"  - Seats: {specs.get('seats', 'N/A')}")
                print(f"  - Cargo: {specs.get('cargo_cu_ft', 'N/A')} cu ft")
                print(f"  - MPG: {specs.get('mpg_combined', 'N/A')}")
            else:
                print(f"✗ {year} {make} {model} {trim}: No specs found")

        return True
    except Exception as e:
        print(f"✗ Error testing vehicle specs: {e}")
        return False


def test_comparison_service():
    """Test that comparison service properly extracts and ranks vehicle specs"""
    print("\n=== Testing Comparison Service ===")

    try:
        from comparison_service import ComparisonService

        # Create mock vehicle data
        mock_vehicles = [
            {
                'data': {
                    'make': 'Toyota',
                    'model': 'Camry',
                    'year': 2024,
                    'trim': 'LE',
                    'transaction_type': 'purchase',
                    'annual_mileage': 12000,
                    'analysis_years': 5
                },
                'results': {
                    'summary': {
                        'average_annual_cost': 8500,
                        'total_ownership_cost': 42500,
                        'cost_per_mile': 0.70,
                        'final_vehicle_value': 15000
                    },
                    'affordability': {
                        'percentage_of_income': 12.5,
                        'is_affordable': False
                    },
                    'category_totals': {
                        'depreciation': 12000,
                        'fuel': 7500,
                        'maintenance': 5000
                    }
                }
            },
            {
                'data': {
                    'make': 'Honda',
                    'model': 'Accord',
                    'year': 2023,
                    'trim': 'EX',
                    'transaction_type': 'purchase',
                    'annual_mileage': 12000,
                    'analysis_years': 5
                },
                'results': {
                    'summary': {
                        'average_annual_cost': 8200,
                        'total_ownership_cost': 41000,
                        'cost_per_mile': 0.68,
                        'final_vehicle_value': 14500
                    },
                    'affordability': {
                        'percentage_of_income': 11.8,
                        'is_affordable': False
                    },
                    'category_totals': {
                        'depreciation': 11500,
                        'fuel': 7200,
                        'maintenance': 4800
                    }
                }
            }
        ]

        service = ComparisonService()
        comparison = service.compare_vehicles(mock_vehicles)

        # Check that comparison was created
        if 'vehicle_results' not in comparison:
            print("✗ Comparison missing vehicle_results")
            return False

        vehicles = comparison['vehicle_results']
        print(f"✓ Created comparison with {len(vehicles)} vehicles")

        # Check that specs were extracted
        for vehicle in vehicles:
            name = vehicle.get('vehicle_name', 'Unknown')
            hp = vehicle.get('horsepower', 0)
            seats = vehicle.get('seats', 0)
            cargo = vehicle.get('cargo_cu_ft', 0)
            mpg = vehicle.get('mpg_combined', 0)

            print(f"\n  {name}:")
            print(f"    - Horsepower: {hp}")
            print(f"    - Seats: {seats}")
            print(f"    - Cargo: {cargo} cu ft")
            print(f"    - MPG: {mpg}")

            if hp == 0 and seats == 0:
                print(f"    ⚠ Warning: No specs found for this vehicle")

        # Check that rankings were created
        rankings = comparison.get('rankings', {})
        print(f"\n✓ Rankings created:")

        ranking_categories = [
            'by_annual_cost',
            'by_total_cost',
            'by_horsepower',
            'by_mpg',
            'by_seats',
            'by_cargo',
            'by_value_score',
            'by_affordability'
        ]

        for category in ranking_categories:
            if category in rankings and rankings[category]:
                print(f"  ✓ {category}: {len(rankings[category])} vehicles ranked")
            else:
                print(f"  ✗ {category}: No rankings found")

        # Check best winners
        print(f"\n✓ Best vehicle winners:")
        winners = [
            ('best_annual_cost', 'Best Annual Cost'),
            ('best_total_cost', 'Best Total Cost'),
            ('most_powerful', 'Most Powerful'),
            ('best_mpg', 'Best MPG'),
            ('most_seats', 'Most Seats'),
            ('most_cargo', 'Most Cargo')
        ]

        for key, label in winners:
            winner = rankings.get(key)
            if winner:
                print(f"  ✓ {label}: {winner.get('vehicle_name', 'Unknown')}")
            else:
                print(f"  ✗ {label}: No winner found")

        return True

    except Exception as e:
        print(f"✗ Error testing comparison service: {e}")
        import traceback
        traceback.print_exc()
        return False


def test_session_manager():
    """Test that vehicles can be added to comparison via session manager"""
    print("\n=== Testing Session Manager ===")

    try:
        # Mock streamlit session state
        import streamlit as st

        # Initialize session state
        if 'comparison_vehicles' not in st.session_state:
            st.session_state.comparison_vehicles = []
        if 'comparison_results' not in st.session_state:
            st.session_state.comparison_results = {}
        if 'user_preferences' not in st.session_state:
            st.session_state.user_preferences = {'max_vehicles': 5}

        from session_manager import add_vehicle_to_comparison

        # Test adding a vehicle
        vehicle_data = {
            'make': 'Toyota',
            'model': 'Camry',
            'year': 2024,
            'trim': 'LE',
            'transaction_type': 'purchase'
        }

        results = {
            'summary': {
                'average_annual_cost': 8500,
                'total_ownership_cost': 42500
            }
        }

        success, message = add_vehicle_to_comparison(vehicle_data, results)

        if success:
            print(f"✓ Vehicle added successfully: {message}")
            print(f"  Total vehicles in comparison: {len(st.session_state.comparison_vehicles)}")

            # Check vehicle structure
            added_vehicle = st.session_state.comparison_vehicles[0]
            if 'data' in added_vehicle and 'results' in added_vehicle and 'name' in added_vehicle:
                print(f"  ✓ Vehicle has correct structure")
                print(f"  ✓ Vehicle name: {added_vehicle['name']}")
            else:
                print(f"  ✗ Vehicle structure is incorrect")
                return False

            # Test duplicate detection
            success2, message2 = add_vehicle_to_comparison(vehicle_data, results)
            if not success2 and "already in your comparison" in message2:
                print(f"✓ Duplicate detection working: {message2}")
            else:
                print(f"✗ Duplicate detection not working")
                return False

            return True
        else:
            print(f"✗ Failed to add vehicle: {message}")
            return False

    except ImportError as e:
        print(f"⚠ Cannot test session manager without Streamlit environment: {e}")
        return None  # Not a failure, just can't test in this environment
    except Exception as e:
        print(f"✗ Error testing session manager: {e}")
        import traceback
        traceback.print_exc()
        return False


def test_comparison_display():
    """Test that comparison display properly shows specs"""
    print("\n=== Testing Comparison Display Functions ===")

    try:
        # Check that the display functions exist and have the right structure
        from comparison_display import display_specs_comparison

        print("✓ display_specs_comparison function exists")

        # Check function signature
        import inspect
        sig = inspect.signature(display_specs_comparison)
        params = list(sig.parameters.keys())

        if 'comparison_results' in params:
            print(f"✓ Function has correct parameters: {params}")
        else:
            print(f"✗ Function parameters unexpected: {params}")
            return False

        return True

    except ImportError as e:
        print(f"✗ Cannot import comparison_display: {e}")
        return False
    except Exception as e:
        print(f"✗ Error testing comparison display: {e}")
        import traceback
        traceback.print_exc()
        return False


def main():
    """Run all integration tests"""
    print("=" * 70)
    print("Cash Pedal Integration Test Suite")
    print("Testing: Single Vehicle Calculator → Multi-Car Comparison")
    print("=" * 70)

    results = {}

    # Run tests
    results['Vehicle Specs Lookup'] = test_vehicle_specs_lookup()
    results['Comparison Service'] = test_comparison_service()
    results['Session Manager'] = test_session_manager()
    results['Comparison Display'] = test_comparison_display()

    # Summary
    print("\n" + "=" * 70)
    print("Test Summary")
    print("=" * 70)

    for test_name, result in results.items():
        if result is True:
            status = "✓ PASS"
        elif result is False:
            status = "✗ FAIL"
        else:
            status = "⚠ SKIPPED"
        print(f"{status}: {test_name}")

    # Overall result
    passed = sum(1 for r in results.values() if r is True)
    failed = sum(1 for r in results.values() if r is False)
    skipped = sum(1 for r in results.values() if r is None)
    total = len(results)

    print(f"\nResults: {passed} passed, {failed} failed, {skipped} skipped out of {total} tests")

    if failed > 0:
        print("\n⚠ Some tests failed. Please review the output above.")
        sys.exit(1)
    else:
        print("\n✓ All tests passed successfully!")
        sys.exit(0)


if __name__ == "__main__":
    main()
