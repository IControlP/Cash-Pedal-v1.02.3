"""
Test script to verify improvements for Cadillac Escalade depreciation and lease terms
"""

from enhanced_depreciation import EnhancedDepreciationModel
from lease_terms_calculator import LeaseTermsCalculator


def test_escalade_depreciation():
    """Test Cadillac Escalade depreciation with improved model"""
    print("=" * 70)
    print("CADILLAC ESCALADE DEPRECIATION TEST")
    print("=" * 70)

    model = EnhancedDepreciationModel()

    # Test parameters
    vehicle_make = 'Cadillac'
    vehicle_model = 'Escalade'
    model_year = 2023
    initial_value = 85000  # MSRP
    annual_mileage = 12000
    years = 5

    print(f"\nVehicle: {model_year} {vehicle_make} {vehicle_model}")
    print(f"Initial Value: ${initial_value:,.0f}")
    print(f"Annual Mileage: {annual_mileage:,}")

    # Get depreciation insights
    insights = model.get_depreciation_insights(
        vehicle_make=vehicle_make,
        vehicle_model=vehicle_model,
        initial_value=initial_value,
        years=years
    )

    print(f"\nSegment: {insights['market_segment']}")
    print(f"Brand Adjustment: {insights['brand_adjustment']:.3f}")
    print(f"Retention Rating: {insights['retention_rating']}")
    print(f"Key Insight: {insights['key_insight']}")

    print("\nValue Retention Scenarios:")
    for scenario, value in insights['scenarios'].items():
        retention_pct = (value / initial_value) * 100
        print(f"  {scenario.capitalize()} Mileage ({scenario}): ${value:,.0f} ({retention_pct:.1f}% retained)")

    # Calculate detailed depreciation schedule
    print(f"\n{years}-Year Depreciation Schedule (Average Mileage):")
    print("-" * 70)
    schedule = model.calculate_depreciation_schedule(
        initial_value=initial_value,
        vehicle_make=vehicle_make,
        vehicle_model=vehicle_model,
        model_year=model_year,
        annual_mileage=annual_mileage,
        years=years
    )

    print(f"{'Year':<6} {'Age':<6} {'Value':<15} {'Annual Dep':<15} {'Total Dep':<15} {'Retained %':<12}")
    print("-" * 70)
    print(f"{'0':<6} {'0':<6} ${initial_value:>12,.0f} {'-':<15} {'-':<15} {'100.0%':<12}")

    for year_data in schedule:
        retained_pct = (year_data['vehicle_value'] / initial_value) * 100
        print(f"{year_data['year']:<6} {year_data['vehicle_age']:<6} "
              f"${year_data['vehicle_value']:>12,.0f} "
              f"${year_data['annual_depreciation']:>12,.0f} "
              f"${year_data['cumulative_depreciation']:>12,.0f} "
              f"{retained_pct:>11.1f}%")

    # Test current value estimation for a 1-year-old Escalade
    print("\n" + "=" * 70)
    print("CURRENT VALUE ESTIMATION - 1 Year Old Escalade")
    print("=" * 70)

    current_value = model.estimate_current_value(
        initial_value=85000,
        vehicle_make=vehicle_make,
        vehicle_model=vehicle_model,
        vehicle_age=1,
        current_mileage=12000
    )

    retention_1yr = (current_value / 85000) * 100
    print(f"1-year-old {vehicle_make} {vehicle_model} with 12,000 miles:")
    print(f"  Estimated Value: ${current_value:,.0f}")
    print(f"  Retention: {retention_1yr:.1f}%")
    print(f"  Depreciation: ${85000 - current_value:,.0f}")


def test_escalade_lease():
    """Test Cadillac Escalade lease terms with new calculator"""
    print("\n\n" + "=" * 70)
    print("CADILLAC ESCALADE LEASE TERMS TEST")
    print("=" * 70)

    calculator = LeaseTermsCalculator()

    # Test 36-month lease
    analysis_36 = calculator.get_complete_lease_analysis(
        make='Cadillac',
        model='Escalade',
        trim='Luxury',
        msrp=85000,
        lease_term_months=36,
        down_payment=5000,
        sales_tax_rate=0.0725,
        credit_tier='good'
    )

    print(f"\n36-Month Lease Analysis:")
    print("-" * 70)
    print(f"MSRP: ${analysis_36['vehicle']['msrp']:,.0f}")
    print(f"Segment: {analysis_36['lease_terms']['segment']}")
    print(f"Down Payment: ${analysis_36['payment']['down_payment']:,.0f}")
    print(f"\nLease Terms:")
    print(f"  Residual Value: {analysis_36['lease_terms']['residual_percent']}% "
          f"(${analysis_36['lease_terms']['residual_value']:,.0f})")
    print(f"  Money Factor: {analysis_36['lease_terms']['money_factor']:.5f}")
    print(f"  APR Equivalent: {analysis_36['lease_terms']['apr_equivalent']:.2f}%")

    print(f"\nMonthly Payment Breakdown:")
    print(f"  Depreciation: ${analysis_36['payment']['monthly_depreciation']:,.2f}")
    print(f"  Finance Charge: ${analysis_36['payment']['monthly_finance_charge']:,.2f}")
    print(f"  Tax: ${analysis_36['payment']['monthly_tax']:,.2f}")
    print(f"  Total Monthly: ${analysis_36['payment']['monthly_payment']:,.2f}")

    print(f"\nTotal Lease Cost:")
    print(f"  Total Payments: ${analysis_36['payment']['total_payments']:,.0f}")
    print(f"  Down Payment: ${analysis_36['payment']['down_payment']:,.0f}")
    print(f"  Grand Total: ${analysis_36['payment']['total_lease_cost']:,.0f}")

    print(f"\nInsights:")
    for insight in analysis_36['insights']:
        print(f"  - {insight}")

    # Test 48-month lease for comparison
    print("\n" + "-" * 70)
    analysis_48 = calculator.get_complete_lease_analysis(
        make='Cadillac',
        model='Escalade',
        trim='Luxury',
        msrp=85000,
        lease_term_months=48,
        down_payment=5000,
        sales_tax_rate=0.0725,
        credit_tier='good'
    )

    print(f"\n48-Month Lease Comparison:")
    print(f"  Residual: {analysis_48['lease_terms']['residual_percent']}% "
          f"(${analysis_48['lease_terms']['residual_value']:,.0f})")
    print(f"  Monthly Payment: ${analysis_48['payment']['monthly_payment']:,.2f}")
    print(f"  Total Lease Cost: ${analysis_48['payment']['total_lease_cost']:,.0f}")

    # Comparison
    print(f"\n36-Month vs 48-Month Comparison:")
    monthly_diff = analysis_48['payment']['monthly_payment'] - analysis_36['payment']['monthly_payment']
    total_diff = analysis_48['payment']['total_lease_cost'] - analysis_36['payment']['total_lease_cost']

    print(f"  36-Month: ${analysis_36['payment']['monthly_payment']:,.2f}/mo, "
          f"${analysis_36['payment']['total_lease_cost']:,.0f} total")
    print(f"  48-Month: ${analysis_48['payment']['monthly_payment']:,.2f}/mo, "
          f"${analysis_48['payment']['total_lease_cost']:,.0f} total")
    print(f"  Difference: ${monthly_diff:+,.2f}/mo, ${total_diff:+,.0f} total")


def compare_with_other_luxury_suvs():
    """Compare Escalade with other luxury SUVs"""
    print("\n\n" + "=" * 70)
    print("LUXURY SUV COMPARISON")
    print("=" * 70)

    calculator = LeaseTermsCalculator()
    depreciation_model = EnhancedDepreciationModel()

    vehicles = [
        ('Cadillac', 'Escalade', 85000),
        ('Lincoln', 'Navigator', 82000),
        ('BMW', 'X7', 80000),
        ('Mercedes-Benz', 'GLS', 83000),
        ('Lexus', 'LX', 88000),
    ]

    print(f"\n36-Month Lease Comparison (with $5,000 down, 7.25% tax):")
    print("-" * 70)
    print(f"{'Vehicle':<25} {'Residual':<15} {'APR':<10} {'Monthly':<15} {'Total Cost':<15}")
    print("-" * 70)

    for make, model, msrp in vehicles:
        analysis = calculator.get_complete_lease_analysis(
            make=make,
            model=model,
            trim='Premium',
            msrp=msrp,
            lease_term_months=36,
            down_payment=5000,
            sales_tax_rate=0.0725,
            credit_tier='good'
        )

        vehicle_name = f"{make} {model}"
        residual = f"{analysis['lease_terms']['residual_percent']}%"
        apr = f"{analysis['lease_terms']['apr_equivalent']:.2f}%"
        monthly = f"${analysis['payment']['monthly_payment']:,.2f}"
        total = f"${analysis['payment']['total_lease_cost']:,.0f}"

        print(f"{vehicle_name:<25} {residual:<15} {apr:<10} {monthly:<15} {total:<15}")

    print("\n5-Year Depreciation Comparison (12,000 miles/year):")
    print("-" * 70)
    print(f"{'Vehicle':<25} {'Segment':<15} {'Retained %':<15} {'Retained Value':<15}")
    print("-" * 70)

    for make, model, msrp in vehicles:
        insights = depreciation_model.get_depreciation_insights(
            vehicle_make=make,
            vehicle_model=model,
            initial_value=msrp,
            years=5
        )

        vehicle_name = f"{make} {model}"
        segment = insights['market_segment']
        retained_value = insights['scenarios']['average']
        retained_pct = (retained_value / msrp) * 100

        print(f"{vehicle_name:<25} {segment:<15} {retained_pct:>13.1f}% "
              f"${retained_value:>12,.0f}")


if __name__ == "__main__":
    test_escalade_depreciation()
    test_escalade_lease()
    compare_with_other_luxury_suvs()
    print("\n" + "=" * 70)
    print("ALL TESTS COMPLETED")
    print("=" * 70)
