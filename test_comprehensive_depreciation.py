"""
Comprehensive Depreciation Model Test Suite
Tests all vehicle segments with 2024-2025 market data validation
"""

from enhanced_depreciation import EnhancedDepreciationModel

# Try to import tabulate, but continue without it if not available
try:
    from tabulate import tabulate
    HAS_TABULATE = True
except ImportError:
    HAS_TABULATE = False
    print("Note: 'tabulate' not installed. Running simplified tests.")
    print("For better output, install with: pip install tabulate\n")


def test_all_segments():
    """Test depreciation across all vehicle segments with real examples"""

    model_obj = EnhancedDepreciationModel()

    # Test vehicles representing each segment
    test_vehicles = [
        # (Make, Model, Year, MSRP, Segment, Expected 5yr retention %)
        # TRUCKS - Best retention
        ('Toyota', 'Tacoma', 2024, 42000, 'truck', 63),
        ('Ford', 'F-150', 2024, 48000, 'truck', 58),
        ('Chevrolet', 'Silverado', 2024, 45000, 'truck', 57),

        # SPORTS - Variable retention
        ('Porsche', '911', 2024, 115000, 'sports', 68),
        ('Chevrolet', 'Corvette', 2024, 70000, 'sports', 61),
        ('Ford', 'Mustang', 2024, 38000, 'sports', 52),

        # SUVs - Strong retention
        ('Toyota', '4Runner', 2024, 48000, 'suv', 67),
        ('Honda', 'CR-V', 2024, 32000, 'suv', 57),
        ('Mazda', 'CX-5', 2024, 30000, 'suv', 54),

        # LUXURY SUVs - Better than luxury sedans
        ('Lexus', 'GX', 2024, 64000, 'luxury_suv', 64),
        ('Cadillac', 'Escalade', 2024, 85000, 'luxury_suv', 55),
        ('BMW', 'X5', 2024, 68000, 'luxury_suv', 49),

        # HYBRIDS - Better than gas
        ('Toyota', 'Prius', 2024, 28000, 'hybrid', 53),
        ('Honda', 'Accord Hybrid', 2024, 33000, 'hybrid', 51),

        # COMPACTS - Average
        ('Toyota', 'Corolla', 2024, 24000, 'compact', 54),
        ('Honda', 'Civic', 2024, 26000, 'compact', 53),
        ('Mazda', 'Mazda3', 2024, 25000, 'compact', 50),

        # SEDANS - Below average
        ('Toyota', 'Camry', 2024, 29000, 'sedan', 52),
        ('Honda', 'Accord', 2024, 30000, 'sedan', 51),
        ('Nissan', 'Altima', 2024, 27000, 'sedan', 43),

        # LUXURY SEDANS - Poor retention
        ('Lexus', 'ES', 2024, 43000, 'luxury', 51),
        ('BMW', '3 Series', 2024, 45000, 'luxury', 42),
        ('Mercedes-Benz', 'E-Class', 2024, 62000, 'luxury', 38),
        ('BMW', '7 Series', 2024, 95000, 'luxury', 32),

        # ECONOMY - Poor retention
        ('Honda', 'Fit', 2024, 19000, 'economy', 46),
        ('Nissan', 'Versa', 2024, 17000, 'economy', 39),

        # ELECTRIC - Variable, generally lower
        ('Tesla', 'Model Y', 2024, 52000, 'electric', 52),
        ('Tesla', 'Model 3', 2024, 42000, 'electric', 50),
        ('Chevrolet', 'Bolt', 2024, 28000, 'electric', 37),
        ('Nissan', 'Leaf', 2024, 30000, 'electric', 28),
    ]

    print("=" * 120)
    print("COMPREHENSIVE DEPRECIATION TEST - ALL SEGMENTS (2024-2025 Market Data)")
    print("=" * 120)
    print()

    results = []

    for make, model, year, msrp, expected_segment, expected_5yr_retention in test_vehicles:
        # Calculate 5-year depreciation schedule
        schedule = model_obj.calculate_depreciation_schedule(
            initial_value=msrp,
            vehicle_make=make,
            vehicle_model=model,
            model_year=year,
            annual_mileage=12000,
            years=5
        )

        if schedule:
            year_5_data = schedule[-1]
            calculated_retention = (year_5_data['vehicle_value'] / msrp) * 100
            calculated_segment = year_5_data['segment']

            # Calculate accuracy (how close we are to expected)
            accuracy = 100 - abs(calculated_retention - expected_5yr_retention)
            status = "✓ PASS" if accuracy >= 90 else "⚠ CHECK" if accuracy >= 80 else "✗ FAIL"

            results.append([
                f"{make} {model}",
                expected_segment,
                calculated_segment,
                f"${msrp:,}",
                f"{expected_5yr_retention}%",
                f"{calculated_retention:.1f}%",
                f"{accuracy:.1f}%",
                status
            ])

    # Print results table
    if HAS_TABULATE:
        headers = ["Vehicle", "Expected Seg", "Calc Seg", "MSRP", "Market 5yr", "Model 5yr", "Accuracy", "Status"]
        print(tabulate(results, headers=headers, tablefmt="grid"))
    else:
        # Simple format without tabulate
        for r in results:
            print(f"{r[0]:<30} {r[1]:<12} {r[2]:<12} {r[3]:<12} Market:{r[4]:<6} Model:{r[5]:<7} Acc:{r[6]:<7} {r[7]}")
    print()

    # Calculate overall statistics
    accuracies = [float(r[6].rstrip('%')) for r in results]
    avg_accuracy = sum(accuracies) / len(accuracies)
    pass_count = sum(1 for r in results if "PASS" in r[7])
    check_count = sum(1 for r in results if "CHECK" in r[7])
    fail_count = sum(1 for r in results if "FAIL" in r[7])

    print(f"OVERALL STATISTICS:")
    print(f"  Average Accuracy: {avg_accuracy:.1f}%")
    print(f"  Pass Rate (≥90%): {pass_count}/{len(results)} ({pass_count/len(results)*100:.1f}%)")
    print(f"  Check (80-90%): {check_count}/{len(results)}")
    print(f"  Fail (<80%): {fail_count}/{len(results)}")
    print()


def test_brand_multipliers():
    """Test brand multiplier accuracy across different manufacturers"""

    model = EnhancedDepreciationModel()

    print("=" * 120)
    print("BRAND MULTIPLIER VALIDATION")
    print("=" * 120)
    print()

    # Test vehicles from different brands
    brand_tests = [
        # (Make, Model, MSRP, Expected Brand Position)
        ('Toyota', 'Camry', 29000, 'Exceptional'),
        ('Lexus', 'ES', 43000, 'Exceptional'),
        ('Honda', 'Accord', 30000, 'Exceptional'),
        ('Porsche', '911', 115000, 'Exceptional'),
        ('Subaru', 'Outback', 30000, 'Exceptional'),
        ('Mazda', 'CX-5', 30000, 'Excellent'),
        ('Hyundai', 'Palisade', 38000, 'Good'),
        ('Ford', 'F-150', 48000, 'Good'),
        ('Chevrolet', 'Silverado', 45000, 'Average'),
        ('Nissan', 'Altima', 27000, 'Average'),
        ('Volkswagen', 'Jetta', 23000, 'Below Avg'),
        ('BMW', '3 Series', 45000, 'Below Avg'),
        ('Mercedes-Benz', 'E-Class', 62000, 'Poor'),
        ('Jaguar', 'XF', 48000, 'Poor'),
    ]

    results = []

    for make, model_name, msrp, expected_position in brand_tests:
        multiplier = model.brand_multipliers.get(make, 1.0)

        # Classify multiplier
        if multiplier <= 0.85:
            position = 'Exceptional'
        elif multiplier <= 0.95:
            position = 'Excellent'
        elif multiplier <= 1.00:
            position = 'Good'
        elif multiplier <= 1.10:
            position = 'Average'
        elif multiplier <= 1.20:
            position = 'Below Avg'
        else:
            position = 'Poor'

        status = "✓" if position == expected_position else "✗"

        results.append([
            make,
            f"{multiplier:.2f}",
            expected_position,
            position,
            status
        ])

    if HAS_TABULATE:
        headers = ["Brand", "Multiplier", "Expected", "Calculated", "✓"]
        print(tabulate(results, headers=headers, tablefmt="grid"))
    else:
        for r in results:
            print(f"{r[0]:<20} {r[1]:<12} {r[2]:<15} {r[3]:<15} {r[4]}")
    print()


def test_mileage_impact():
    """Test mileage impact calculations"""

    model = EnhancedDepreciationModel()

    print("=" * 120)
    print("MILEAGE IMPACT VALIDATION")
    print("=" * 120)
    print()

    # Test different mileage scenarios
    mileage_tests = [
        (5000, "Very Low", 0.85, "15% better retention"),
        (8000, "Low", 0.92, "8% better retention"),
        (10000, "Below Avg", 0.96, "4% better retention"),
        (12000, "Average", 1.00, "Baseline"),
        (15000, "Above Avg", 1.08, "8% worse retention"),
        (18000, "High", 1.15, "15% worse retention"),
        (22000, "Very High", 1.25, "25% worse retention"),
        (30000, "Extreme", 1.35, "35% worse (capped)"),
    ]

    results = []

    for annual_miles, description, expected_multiplier, impact_desc in mileage_tests:
        calculated = model._calculate_mileage_impact(annual_miles)
        difference = abs(calculated - expected_multiplier)
        accuracy = 100 - (difference * 100)
        status = "✓" if accuracy >= 95 else "⚠" if accuracy >= 90 else "✗"

        results.append([
            f"{annual_miles:,}",
            description,
            f"{expected_multiplier:.2f}",
            f"{calculated:.2f}",
            impact_desc,
            f"{accuracy:.1f}%",
            status
        ])

    if HAS_TABULATE:
        headers = ["Annual Miles", "Category", "Expected", "Calculated", "Impact", "Accuracy", "✓"]
        print(tabulate(results, headers=headers, tablefmt="grid"))
    else:
        for r in results:
            print(f"{r[0]:<15} {r[1]:<15} {r[2]:<10} {r[3]:<12} {r[4]:<30} {r[5]:<10} {r[6]}")
    print()


def test_year_by_year_depreciation():
    """Test year-by-year depreciation progression for selected vehicles"""

    model = EnhancedDepreciationModel()

    print("=" * 120)
    print("YEAR-BY-YEAR DEPRECIATION PROGRESSION")
    print("=" * 120)
    print()

    # Test vehicles
    test_cases = [
        ('Toyota', 'Tacoma', 42000),
        ('Tesla', 'Model 3', 42000),
        ('BMW', '7 Series', 95000),
        ('Honda', 'Civic', 26000),
    ]

    for make, model_name, msrp in test_cases:
        print(f"\n{make} {model_name} (${msrp:,} MSRP)")
        print("-" * 100)

        schedule = model.calculate_depreciation_schedule(
            initial_value=msrp,
            vehicle_make=make,
            vehicle_model=model_name,
            model_year=2024,
            annual_mileage=12000,
            years=10
        )

        results = []
        results.append(["0", f"${msrp:,}", "-", "-", "100.0%"])

        for year_data in schedule:
            year = year_data['year']
            value = year_data['vehicle_value']
            annual_dep = year_data['annual_depreciation']
            cumulative_dep = year_data['cumulative_depreciation']
            retention = (value / msrp) * 100

            results.append([
                str(year),
                f"${value:,.0f}",
                f"${annual_dep:,.0f}",
                f"${cumulative_dep:,.0f}",
                f"{retention:.1f}%"
            ])

        if HAS_TABULATE:
            headers = ["Year", "Value", "Annual Dep", "Cumul. Dep", "Retention %"]
            print(tabulate(results, headers=headers, tablefmt="grid"))
        else:
            for r in results:
                print(f"Yr {r[0]:<3} {r[1]:<15} {r[2]:<15} {r[3]:<15} {r[4]}")


def test_segment_classification():
    """Test vehicle segment classification accuracy"""

    model = EnhancedDepreciationModel()

    print("=" * 120)
    print("SEGMENT CLASSIFICATION VALIDATION")
    print("=" * 120)
    print()

    # Test segment classification
    classification_tests = [
        ('Toyota', 'Tacoma', 'truck'),
        ('Ford', 'F-150', 'truck'),
        ('Chevrolet', 'Corvette', 'sports'),
        ('Porsche', '911', 'sports'),
        ('Toyota', '4Runner', 'suv'),
        ('Honda', 'CR-V', 'suv'),
        ('Cadillac', 'Escalade', 'luxury_suv'),
        ('BMW', 'X5', 'luxury_suv'),
        ('Lexus', 'RX', 'luxury_suv'),
        ('Toyota', 'Prius', 'hybrid'),
        ('Honda', 'Accord Hybrid', 'hybrid'),
        ('Tesla', 'Model 3', 'electric'),
        ('Nissan', 'Leaf', 'electric'),
        ('Toyota', 'Corolla', 'compact'),
        ('Honda', 'Civic', 'compact'),
        ('Toyota', 'Camry', 'sedan'),
        ('Nissan', 'Altima', 'sedan'),
        ('BMW', '3 Series', 'luxury'),
        ('Mercedes-Benz', 'E-Class', 'luxury'),
        ('Nissan', 'Versa', 'economy'),
    ]

    results = []

    for make, model_name, expected_segment in classification_tests:
        calculated_segment = model._classify_vehicle_segment(make, model_name)
        status = "✓" if calculated_segment == expected_segment else "✗"

        results.append([
            f"{make} {model_name}",
            expected_segment,
            calculated_segment,
            status
        ])

    if HAS_TABULATE:
        headers = ["Vehicle", "Expected Segment", "Calculated Segment", "✓"]
        print(tabulate(results, headers=headers, tablefmt="grid"))
    else:
        for r in results:
            print(f"{r[0]:<35} {r[1]:<15} {r[2]:<20} {r[3]}")

    correct = sum(1 for r in results if r[3] == "✓")
    total = len(results)
    accuracy = (correct / total) * 100

    print(f"\nSegment Classification Accuracy: {correct}/{total} ({accuracy:.1f}%)")
    print()


def main():
    """Run all comprehensive tests"""

    print("\n")
    print("╔" + "═" * 118 + "╗")
    print("║" + " " * 30 + "COMPREHENSIVE DEPRECIATION MODEL TEST SUITE" + " " * 45 + "║")
    print("║" + " " * 40 + "2024-2025 Market Data Validation" + " " * 46 + "║")
    print("╚" + "═" * 118 + "╝")
    print("\n")

    # Run all test suites
    test_segment_classification()
    test_brand_multipliers()
    test_mileage_impact()
    test_all_segments()
    test_year_by_year_depreciation()

    print("\n")
    print("=" * 120)
    print("ALL TESTS COMPLETED")
    print("=" * 120)
    print("\n")


if __name__ == "__main__":
    try:
        main()
    except ImportError as e:
        if 'tabulate' in str(e):
            print("Error: 'tabulate' package required for formatted output.")
            print("Running simplified tests without tabulate...")
            print()

            # Run simplified version without tabulate
            model_obj = EnhancedDepreciationModel()

            # Quick test of a few vehicles
            test_vehicles = [
                ('Toyota', 'Tacoma', 42000),
                ('Tesla', 'Model 3', 42000),
                ('BMW', '7 Series', 95000),
            ]

            print("Simple Depreciation Test (without tabulate):")
            print("=" * 80)

            for make, model, msrp in test_vehicles:
                schedule = model_obj.calculate_depreciation_schedule(
                    initial_value=msrp,
                    vehicle_make=make,
                    vehicle_model=model,
                    model_year=2024,
                    annual_mileage=12000,
                    years=5
                )

                if schedule:
                    year_5 = schedule[-1]
                    retention = (year_5['vehicle_value'] / msrp) * 100
                    print(f"{make} {model}: {retention:.1f}% 5-year retention")

            print("=" * 80)
            print("Install 'tabulate' for detailed test output: pip install tabulate")
