"""
Salary Requirements Calculator Utilities
Calculates the required salary to afford vehicle ownership based on state-specific taxes
and recommended affordability guidelines.
"""

from typing import Dict, Any, Optional, Tuple
from dataclasses import dataclass

# ============================================================================
# STATE INCOME TAX DATA (2025)
# Simplified effective rates for median income earners
# Source: Tax Foundation and state tax agencies
# ============================================================================

STATE_TAX_DATA = {
    # State: (state_income_tax_rate, state_name, has_income_tax)
    'AL': (0.050, 'Alabama', True),
    'AK': (0.000, 'Alaska', False),
    'AZ': (0.025, 'Arizona', True),
    'AR': (0.044, 'Arkansas', True),
    'CA': (0.093, 'California', True),
    'CO': (0.044, 'Colorado', True),
    'CT': (0.050, 'Connecticut', True),
    'DE': (0.066, 'Delaware', True),
    'DC': (0.085, 'Washington D.C.', True),
    'FL': (0.000, 'Florida', False),
    'GA': (0.055, 'Georgia', True),
    'HI': (0.088, 'Hawaii', True),
    'ID': (0.058, 'Idaho', True),
    'IL': (0.0495, 'Illinois', True),
    'IN': (0.0315, 'Indiana', True),
    'IA': (0.057, 'Iowa', True),
    'KS': (0.057, 'Kansas', True),
    'KY': (0.045, 'Kentucky', True),
    'LA': (0.0425, 'Louisiana', True),
    'ME': (0.0715, 'Maine', True),
    'MD': (0.0575, 'Maryland', True),
    'MA': (0.050, 'Massachusetts', True),
    'MI': (0.0425, 'Michigan', True),
    'MN': (0.0785, 'Minnesota', True),
    'MS': (0.050, 'Mississippi', True),
    'MO': (0.049, 'Missouri', True),
    'MT': (0.0590, 'Montana', True),
    'NE': (0.0584, 'Nebraska', True),
    'NV': (0.000, 'Nevada', False),
    'NH': (0.000, 'New Hampshire', False),  # No income tax on wages
    'NJ': (0.0637, 'New Jersey', True),
    'NM': (0.0490, 'New Mexico', True),
    'NY': (0.0685, 'New York', True),
    'NC': (0.0525, 'North Carolina', True),
    'ND': (0.0195, 'North Dakota', True),
    'OH': (0.0399, 'Ohio', True),
    'OK': (0.0475, 'Oklahoma', True),
    'OR': (0.0875, 'Oregon', True),
    'PA': (0.0307, 'Pennsylvania', True),
    'RI': (0.0599, 'Rhode Island', True),
    'SC': (0.065, 'South Carolina', True),
    'SD': (0.000, 'South Dakota', False),
    'TN': (0.000, 'Tennessee', False),
    'TX': (0.000, 'Texas', False),
    'UT': (0.0485, 'Utah', True),
    'VT': (0.0660, 'Vermont', True),
    'VA': (0.0575, 'Virginia', True),
    'WA': (0.000, 'Washington', False),
    'WV': (0.055, 'West Virginia', True),
    'WI': (0.0530, 'Wisconsin', True),
    'WY': (0.000, 'Wyoming', False),
}

# Federal tax brackets for 2025 (Single filer, simplified)
FEDERAL_TAX_BRACKETS_SINGLE = [
    (11600, 0.10),
    (47150, 0.12),
    (100525, 0.22),
    (191950, 0.24),
    (243725, 0.32),
    (609350, 0.35),
    (float('inf'), 0.37),
]

# Federal tax brackets for 2025 (Married filing jointly, simplified)
FEDERAL_TAX_BRACKETS_MARRIED = [
    (23200, 0.10),
    (94300, 0.12),
    (201050, 0.22),
    (383900, 0.24),
    (487450, 0.32),
    (731200, 0.35),
    (float('inf'), 0.37),
]

# FICA rates (2025)
SOCIAL_SECURITY_RATE = 0.062
SOCIAL_SECURITY_CAP = 168600  # 2025 wage base
MEDICARE_RATE = 0.0145
ADDITIONAL_MEDICARE_THRESHOLD = 200000
ADDITIONAL_MEDICARE_RATE = 0.009


@dataclass
class AffordabilityThresholds:
    """Vehicle affordability thresholds as percentage of monthly take-home pay"""
    conservative: float = 0.10  # 10% - Financial advisors' recommendation
    moderate: float = 0.15      # 15% - Manageable for most
    aggressive: float = 0.20   # 20% - Upper limit, higher risk


def calculate_federal_tax(gross_income: float, filing_status: str = 'single') -> float:
    """Calculate federal income tax using progressive brackets"""
    if filing_status.lower() == 'married':
        brackets = FEDERAL_TAX_BRACKETS_MARRIED
        standard_deduction = 29200  # 2025 married filing jointly
    else:
        brackets = FEDERAL_TAX_BRACKETS_SINGLE
        standard_deduction = 14600  # 2025 single filer
    
    taxable_income = max(0, gross_income - standard_deduction)
    
    tax = 0
    prev_bracket = 0
    
    for bracket_limit, rate in brackets:
        if taxable_income <= 0:
            break
        
        taxable_in_bracket = min(taxable_income, bracket_limit - prev_bracket)
        tax += taxable_in_bracket * rate
        taxable_income -= taxable_in_bracket
        prev_bracket = bracket_limit
    
    return tax


def calculate_fica_tax(gross_income: float) -> float:
    """Calculate Social Security and Medicare taxes"""
    # Social Security (capped)
    ss_wages = min(gross_income, SOCIAL_SECURITY_CAP)
    social_security = ss_wages * SOCIAL_SECURITY_RATE
    
    # Medicare (no cap, with additional tax for high earners)
    medicare = gross_income * MEDICARE_RATE
    if gross_income > ADDITIONAL_MEDICARE_THRESHOLD:
        medicare += (gross_income - ADDITIONAL_MEDICARE_THRESHOLD) * ADDITIONAL_MEDICARE_RATE
    
    return social_security + medicare


def calculate_state_tax(gross_income: float, state: str) -> float:
    """Calculate state income tax (simplified effective rate)"""
    tax_data = STATE_TAX_DATA.get(state, (0.05, 'Unknown', True))
    rate = tax_data[0]
    
    # Apply simplified effective rate
    # In reality, states have deductions and brackets, but this gives reasonable estimates
    return gross_income * rate


def calculate_take_home_pay(gross_income: float, state: str, 
                            filing_status: str = 'single') -> Dict[str, float]:
    """
    Calculate annual and monthly take-home pay after all taxes
    
    Returns dict with:
    - gross_annual, gross_monthly
    - federal_tax, state_tax, fica_tax
    - total_tax, effective_tax_rate
    - net_annual, net_monthly
    """
    federal_tax = calculate_federal_tax(gross_income, filing_status)
    state_tax = calculate_state_tax(gross_income, state)
    fica_tax = calculate_fica_tax(gross_income)
    
    total_tax = federal_tax + state_tax + fica_tax
    net_annual = gross_income - total_tax
    
    return {
        'gross_annual': gross_income,
        'gross_monthly': gross_income / 12,
        'federal_tax': federal_tax,
        'state_tax': state_tax,
        'fica_tax': fica_tax,
        'total_tax': total_tax,
        'effective_tax_rate': (total_tax / gross_income * 100) if gross_income > 0 else 0,
        'net_annual': net_annual,
        'net_monthly': net_annual / 12,
    }


def calculate_required_salary(monthly_vehicle_cost: float, state: str,
                              affordability_level: str = 'moderate',
                              filing_status: str = 'single') -> Dict[str, Any]:
    """
    Calculate required gross salary to afford a vehicle at specified affordability level
    
    Uses iterative approach since tax calculations are non-linear
    """
    thresholds = AffordabilityThresholds()
    
    if affordability_level == 'conservative':
        target_percent = thresholds.conservative
    elif affordability_level == 'aggressive':
        target_percent = thresholds.aggressive
    else:
        target_percent = thresholds.moderate
    
    # Required monthly take-home for this vehicle cost at target percentage
    required_monthly_take_home = monthly_vehicle_cost / target_percent
    required_annual_take_home = required_monthly_take_home * 12
    
    # Iteratively find gross salary that produces this take-home
    # Start with estimate assuming ~30% total tax rate
    gross_estimate = required_annual_take_home / 0.70
    
    # Refine estimate through iteration
    for _ in range(20):  # Usually converges in 5-10 iterations
        take_home_result = calculate_take_home_pay(gross_estimate, state, filing_status)
        actual_net = take_home_result['net_annual']
        
        if abs(actual_net - required_annual_take_home) < 100:  # Within $100
            break
        
        # Adjust estimate based on difference
        ratio = required_annual_take_home / actual_net if actual_net > 0 else 1.5
        gross_estimate *= ratio
    
    # Final calculation at found gross salary
    final_result = calculate_take_home_pay(gross_estimate, state, filing_status)
    
    return {
        'required_gross_annual': gross_estimate,
        'required_gross_monthly': gross_estimate / 12,
        'monthly_take_home': final_result['net_monthly'],
        'annual_take_home': final_result['net_annual'],
        'monthly_vehicle_cost': monthly_vehicle_cost,
        'affordability_percent': target_percent * 100,
        'affordability_level': affordability_level,
        'tax_breakdown': final_result,
        'state': state,
        'state_name': STATE_TAX_DATA.get(state, (0, 'Unknown', True))[1],
        'filing_status': filing_status,
    }


def calculate_vehicle_monthly_cost(
    vehicle_payment: float = 0,
    fuel_cost: float = 0,
    insurance_cost: float = 0,
    maintenance_cost: float = 0,
    registration_cost: float = 0,
    depreciation_cost: float = 0,
    other_costs: float = 0,
    include_depreciation: bool = True
) -> Dict[str, float]:
    """
    Calculate total monthly vehicle ownership cost
    
    Parameters are all monthly amounts
    """
    # Core ownership costs (cash outflow)
    cash_costs = (
        vehicle_payment +
        fuel_cost +
        insurance_cost +
        maintenance_cost +
        registration_cost +
        other_costs
    )
    
    # Total cost including depreciation (opportunity cost)
    total_with_depreciation = cash_costs + depreciation_cost
    
    return {
        'vehicle_payment': vehicle_payment,
        'fuel_cost': fuel_cost,
        'insurance_cost': insurance_cost,
        'maintenance_cost': maintenance_cost,
        'registration_cost': registration_cost,
        'depreciation_cost': depreciation_cost,
        'other_costs': other_costs,
        'total_cash_costs': cash_costs,
        'total_with_depreciation': total_with_depreciation,
        'recommended_monthly_cost': total_with_depreciation if include_depreciation else cash_costs,
    }


def get_affordability_rating(monthly_cost: float, monthly_take_home: float) -> Dict[str, Any]:
    """
    Evaluate affordability of a vehicle given monthly cost and take-home pay
    """
    if monthly_take_home <= 0:
        return {
            'percentage': 0,
            'rating': 'Unknown',
            'description': 'Unable to calculate',
            'color': 'gray'
        }
    
    percentage = (monthly_cost / monthly_take_home) * 100
    
    if percentage <= 10:
        return {
            'percentage': percentage,
            'rating': 'Excellent',
            'description': 'Well within budget - leaves plenty for savings and other expenses',
            'color': 'green'
        }
    elif percentage <= 15:
        return {
            'percentage': percentage,
            'rating': 'Good',
            'description': 'Comfortable fit - recommended by most financial advisors',
            'color': 'lightgreen'
        }
    elif percentage <= 20:
        return {
            'percentage': percentage,
            'rating': 'Moderate',
            'description': 'Manageable but tight - be mindful of other expenses',
            'color': 'orange'
        }
    elif percentage <= 25:
        return {
            'percentage': percentage,
            'rating': 'Stretched',
            'description': 'May strain budget - consider a less expensive vehicle',
            'color': 'orangered'
        }
    else:
        return {
            'percentage': percentage,
            'rating': 'Overextended',
            'description': 'Vehicle cost too high relative to income - high financial risk',
            'color': 'red'
        }


def estimate_vehicle_costs_simple(
    vehicle_price: float,
    annual_mileage: float = 12000,
    fuel_price: float = 3.50,
    mpg: float = 28,
    is_lease: bool = False,
    lease_payment: float = 0,
    loan_term_years: int = 5,
    interest_rate: float = 6.5,
    down_payment_percent: float = 10,
    vehicle_age: int = 0,
    vehicle_tier: str = 'standard'
) -> Dict[str, float]:
    """
    Estimate monthly vehicle costs with reasonable defaults
    for quick salary calculations
    """
    # Monthly fuel cost
    monthly_fuel = (annual_mileage / 12) / mpg * fuel_price
    
    # Insurance estimate based on vehicle price
    if vehicle_price > 60000:
        annual_insurance = 2400  # ~$200/month for luxury
    elif vehicle_price > 40000:
        annual_insurance = 1800  # ~$150/month for premium
    elif vehicle_price > 25000:
        annual_insurance = 1500  # ~$125/month for mid-range
    else:
        annual_insurance = 1200  # ~$100/month for economy
    monthly_insurance = annual_insurance / 12
    
    # Maintenance estimate based on tier and age
    base_maintenance = {
        'luxury': 150,
        'premium': 100,
        'standard': 70,
        'economy': 50
    }.get(vehicle_tier, 70)
    
    # Increase maintenance for older vehicles
    age_multiplier = 1 + (vehicle_age * 0.05)  # 5% increase per year
    monthly_maintenance = base_maintenance * age_multiplier
    
    # Registration/fees (varies by state, using average)
    monthly_registration = 50
    
    if is_lease:
        monthly_payment = lease_payment
        monthly_depreciation = 0  # Already baked into lease
    else:
        # Calculate loan payment
        down_payment = vehicle_price * (down_payment_percent / 100)
        loan_amount = vehicle_price - down_payment
        
        if interest_rate > 0 and loan_term_years > 0:
            monthly_rate = interest_rate / 100 / 12
            num_payments = loan_term_years * 12
            monthly_payment = loan_amount * (monthly_rate * (1 + monthly_rate)**num_payments) / \
                            ((1 + monthly_rate)**num_payments - 1)
        else:
            monthly_payment = loan_amount / (loan_term_years * 12) if loan_term_years > 0 else 0
        
        # Depreciation estimate (for owned vehicles)
        # First year: ~15-20%, then ~10% per year
        if vehicle_age == 0:
            annual_depreciation_rate = 0.15
        elif vehicle_age <= 3:
            annual_depreciation_rate = 0.12
        elif vehicle_age <= 5:
            annual_depreciation_rate = 0.10
        else:
            annual_depreciation_rate = 0.08
        
        monthly_depreciation = (vehicle_price * annual_depreciation_rate) / 12
    
    return calculate_vehicle_monthly_cost(
        vehicle_payment=monthly_payment,
        fuel_cost=monthly_fuel,
        insurance_cost=monthly_insurance,
        maintenance_cost=monthly_maintenance,
        registration_cost=monthly_registration,
        depreciation_cost=monthly_depreciation if not is_lease else 0,
        include_depreciation=not is_lease
    )


def get_state_list() -> list:
    """Return list of states for dropdown"""
    states = []
    for code, (rate, name, has_tax) in STATE_TAX_DATA.items():
        states.append({
            'code': code,
            'name': name,
            'rate': rate,
            'has_income_tax': has_tax
        })
    return sorted(states, key=lambda x: x['name'])


def format_currency(amount: float) -> str:
    """Format number as currency string"""
    return f"${amount:,.0f}"


def format_percentage(value: float) -> str:
    """Format number as percentage string"""
    return f"{value:.1f}%"


# ============================================================================
# Testing / Demo
# ============================================================================

if __name__ == "__main__":
    # Test the salary calculator
    print("=" * 60)
    print("Salary Requirements Calculator - Test")
    print("=" * 60)
    
    # Example: $600/month total vehicle cost in California
    monthly_cost = 600
    state = 'CA'
    
    print(f"\nMonthly Vehicle Cost: ${monthly_cost}")
    print(f"State: California")
    print()
    
    for level in ['conservative', 'moderate', 'aggressive']:
        result = calculate_required_salary(monthly_cost, state, level)
        print(f"{level.capitalize()} ({result['affordability_percent']:.0f}% of take-home):")
        print(f"  Required Salary: ${result['required_gross_annual']:,.0f}/year")
        print(f"  Monthly Take-Home: ${result['monthly_take_home']:,.0f}")
        print()
    
    print("\nTax Breakdown for Moderate level:")
    result = calculate_required_salary(monthly_cost, state, 'moderate')
    taxes = result['tax_breakdown']
    print(f"  Federal Tax: ${taxes['federal_tax']:,.0f}")
    print(f"  State Tax: ${taxes['state_tax']:,.0f}")
    print(f"  FICA Tax: ${taxes['fica_tax']:,.0f}")
    print(f"  Effective Rate: {taxes['effective_tax_rate']:.1f}%")
