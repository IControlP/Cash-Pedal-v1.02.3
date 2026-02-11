"""
Lease Terms Calculator
Provides realistic residual values and money factors based on vehicle make, model, trim, and lease term
Based on industry data from automotive lease programs (2024-2025)
"""

from typing import Dict, Any, Tuple
import math


class LeaseTermsCalculator:
    """Calculate realistic lease terms (residual value % and money factor) for vehicles"""

    def __init__(self):
        # Base residual values by brand for 36-month lease (as percentage of MSRP)
        # Based on ALG (Automotive Lease Guide) and industry data
        self.brand_base_residuals_36mo = {
            # Premium Residuals (55-62%)
            'Toyota': 60,
            'Lexus': 59,
            'Honda': 58,
            'Subaru': 57,
            'Porsche': 62,
            'Mazda': 56,

            # Good Residuals (50-55%)
            'Hyundai': 53,
            'Kia': 52,
            'GMC': 54,
            'Ford': 52,
            'Chevrolet': 51,
            'Nissan': 50,
            'Jeep': 53,
            'Ram': 54,

            # Average Residuals (45-50%)
            'BMW': 48,
            'Mercedes-Benz': 47,
            'Audi': 49,
            'Cadillac': 50,  # Improved - especially for SUVs
            'Acura': 52,
            'Infiniti': 46,
            'Genesis': 48,
            'Volvo': 47,
            'Lincoln': 48,
            'Buick': 49,

            # Below Average Residuals (40-45%)
            'Volkswagen': 44,
            'Chrysler': 42,
            'Dodge': 43,
            'Jaguar': 40,
            'Land Rover': 42,
            'Alfa Romeo': 38,
            'Fiat': 35,
            'Mini': 45,
            'Maserati': 38,

            # Electric vehicles (varies widely by brand)
            'Tesla': 55,  # Strong brand loyalty
            'Rivian': 48,
            'Lucid': 42,
            'Polestar': 46,
        }

        # Segment adjustments to base residuals
        self.segment_residual_adjustments = {
            'truck': +5,        # Trucks hold value very well
            'suv': +3,          # SUVs popular and hold value
            'luxury_suv': +4,   # Luxury SUVs especially strong
            'sports': +2,       # Sports cars for enthusiasts
            'compact': 0,       # Average
            'sedan': -2,        # Sedans less popular
            'luxury': -3,       # Luxury sedans depreciate faster
            'economy': -3,      # Economy cars depreciate faster
            'electric': -2,     # EVs have tech obsolescence risk
            'hybrid': +1,       # Hybrids popular
        }

        # High-demand models get better residuals
        self.high_residual_models = {
            'Toyota': ['4Runner', 'Tacoma', 'Tundra', 'Land Cruiser', 'Highlander', 'RAV4'],
            'Honda': ['Pilot', 'CR-V', 'Ridgeline', 'Accord'],
            'Subaru': ['Outback', 'Forester', 'Crosstrek', 'Ascent'],
            'Jeep': ['Wrangler', 'Gladiator'],
            'Ford': ['F-150', 'Bronco', 'Mustang'],
            'Chevrolet': ['Silverado', 'Tahoe', 'Suburban', 'Corvette'],
            'GMC': ['Yukon', 'Sierra', 'Yukon XL'],
            'Cadillac': ['Escalade', 'XT5', 'XT6'],  # Premium SUVs
            'Porsche': ['911', 'Cayenne', 'Macan'],
            'Lexus': ['RX', 'NX', 'GX', 'LX'],
            'BMW': ['X5', 'X3'],
            'Mercedes-Benz': ['G-Class', 'GLE'],
            'Audi': ['Q5', 'Q7'],
            'Lincoln': ['Navigator'],
            'Ram': ['1500', '2500'],
        }

        # Low-demand models get worse residuals
        self.low_residual_models = {
            'Cadillac': ['CT4', 'CT5', 'CT6'],  # Sedans depreciate faster
            'Lincoln': ['MKZ', 'Continental'],
            'BMW': ['7 Series'],
            'Mercedes-Benz': ['S-Class'],
            'Audi': ['A8'],
            'Jaguar': ['XJ', 'XF'],
            'Chrysler': ['300'],
            'Dodge': ['Charger', 'Challenger'],  # Despite popularity, still depreciate
            'Nissan': ['Altima', 'Maxima'],
        }

        # Base money factors by brand (multiply by 2400 to get APR equivalent)
        # Industry average is around .00125-.00200 (3-4.8% APR)
        self.brand_money_factors = {
            # Subsidized/Low rates (.00100-.00140 = 2.4-3.36% APR)
            'Toyota': 0.00120,
            'Lexus': 0.00125,
            'Honda': 0.00115,
            'Acura': 0.00120,
            'Subaru': 0.00125,
            'Mazda': 0.00130,
            'Hyundai': 0.00125,
            'Kia': 0.00120,

            # Average rates (.00140-.00170 = 3.36-4.08% APR)
            'Ford': 0.00145,
            'Chevrolet': 0.00150,
            'GMC': 0.00150,
            'Nissan': 0.00155,
            'Jeep': 0.00155,
            'Ram': 0.00150,
            'Buick': 0.00145,
            'Volkswagen': 0.00160,

            # Luxury rates (.00150-.00200 = 3.6-4.8% APR)
            'BMW': 0.00165,
            'Mercedes-Benz': 0.00170,
            'Audi': 0.00165,
            'Cadillac': 0.00160,
            'Lincoln': 0.00165,
            'Genesis': 0.00155,
            'Infiniti': 0.00175,
            'Volvo': 0.00170,
            'Porsche': 0.00180,

            # Higher rates (.00175-.00250 = 4.2-6% APR)
            'Tesla': 0.00175,  # Tesla leases have higher rates
            'Chrysler': 0.00185,
            'Dodge': 0.00180,
            'Jaguar': 0.00200,
            'Land Rover': 0.00195,
            'Alfa Romeo': 0.00210,
            'Maserati': 0.00220,
            'Fiat': 0.00190,
            'Mini': 0.00175,
            'Rivian': 0.00185,
            'Lucid': 0.00195,
        }

        # Lease term adjustments for residual value
        # Residual decreases as lease term increases
        self.lease_term_residual_adjustments = {
            24: +6,   # 2-year lease: higher residual
            36: 0,    # 3-year lease: baseline
            39: -2,   # 39-month: slight decrease
            42: -4,   # 42-month: moderate decrease
            48: -8,   # 4-year lease: significant decrease
            60: -15,  # 5-year lease: major decrease
        }

    def _classify_vehicle_segment(self, make: str, model: str) -> str:
        """
        Classify vehicle segment - simplified version
        For full classification, use enhanced_depreciation.py
        """
        model_lower = model.lower()
        make_lower = make.lower()

        # Check luxury brands first
        luxury_brands = ['bmw', 'mercedes-benz', 'audi', 'lexus', 'acura',
                        'infiniti', 'cadillac', 'lincoln', 'jaguar', 'land rover',
                        'porsche', 'maserati', 'alfa romeo', 'genesis']

        # Luxury SUV keywords
        luxury_suv_keywords = [
            'escalade', 'xt4', 'xt5', 'xt6', 'x1', 'x2', 'x3', 'x4', 'x5', 'x6', 'x7',
            'gla', 'glb', 'glc', 'gle', 'gls', 'g-class', 'q3', 'q4', 'q5', 'q7', 'q8',
            'ux', 'nx', 'rx', 'gx', 'lx', 'rdx', 'mdx', 'qx50', 'qx55', 'qx60', 'qx80',
            'navigator', 'nautilus', 'aviator', 'corsair', 'cayenne', 'macan',
            'e-pace', 'f-pace', 'range rover', 'discovery', 'defender', 'evoque',
            'gv60', 'gv70', 'gv80', 'levante', 'grecale'
        ]

        if make_lower in luxury_brands:
            if any(keyword in model_lower for keyword in luxury_suv_keywords):
                return 'luxury_suv'
            return 'luxury'

        # Check trucks
        truck_keywords = ['f-150', 'f-250', 'f-350', 'silverado', 'sierra', 'ram 1500',
                         'ram 2500', 'tundra', 'tacoma', 'frontier', 'ridgeline',
                         'gladiator', 'ranger', 'colorado', 'canyon', 'titan']
        if any(keyword in model_lower for keyword in truck_keywords):
            return 'truck'

        # Check SUVs
        suv_keywords = ['suburban', 'tahoe', 'yukon', 'escalade', 'navigator', 'pilot',
                       'highlander', 'rav4', 'cr-v', 'explorer', 'expedition', 'escape',
                       'equinox', 'traverse', 'pathfinder', 'armada', 'palisade',
                       'telluride', 'sorento', 'santa fe', 'tucson', 'cx-5', 'cx-9',
                       'outback', 'forester', 'ascent', 'wrangler', 'grand cherokee',
                       'durango', 'atlas', 'tiguan']
        if any(keyword in model_lower for keyword in suv_keywords):
            return 'suv'

        # Check sports cars
        sports_keywords = ['corvette', 'mustang', 'camaro', 'challenger', 'charger',
                          '911', 'cayman', 'boxster', 'z4', 'supra', 'miata', 'mx-5',
                          'gt-r', '370z', '400z', 'brz', 'gr86']
        if any(keyword in model_lower for keyword in sports_keywords):
            return 'sports'

        # Check compacts
        compact_keywords = ['civic', 'corolla', 'elantra', 'sentra', 'forte', 'jetta',
                           'golf', 'mazda3', 'impreza']
        if any(keyword in model_lower for keyword in compact_keywords):
            return 'compact'

        # Check economy
        economy_keywords = ['spark', 'mirage', 'rio', 'versa', 'accent', 'yaris', 'fit']
        if any(keyword in model_lower for keyword in economy_keywords):
            return 'economy'

        # Default to sedan
        return 'sedan'

    def _get_model_residual_adjustment(self, make: str, model: str) -> int:
        """Get model-specific residual adjustment"""
        adjustment = 0

        # Check high residual models
        if make in self.high_residual_models:
            if any(model_name.lower() in model.lower()
                   for model_name in self.high_residual_models[make]):
                adjustment += 4  # +4% for high-demand models

        # Check low residual models
        if make in self.low_residual_models:
            if any(model_name.lower() in model.lower()
                   for model_name in self.low_residual_models[make]):
                adjustment -= 4  # -4% for low-demand models

        return adjustment

    def calculate_residual_value(self, make: str, model: str, trim: str,
                                msrp: float, lease_term_months: int = 36) -> Dict[str, Any]:
        """
        Calculate residual value percentage and dollar amount for a lease

        Args:
            make: Vehicle manufacturer
            model: Vehicle model
            trim: Trim level (currently not heavily weighted, but could be)
            msrp: Manufacturer's Suggested Retail Price
            lease_term_months: Lease term in months (24, 36, 39, 42, 48, 60)

        Returns:
            Dictionary with residual percentage and dollar amount
        """
        # Get base residual for brand
        base_residual = self.brand_base_residuals_36mo.get(make, 50)

        # Classify vehicle segment
        segment = self._classify_vehicle_segment(make, model)

        # Apply segment adjustment
        segment_adj = self.segment_residual_adjustments.get(segment, 0)

        # Apply model-specific adjustment
        model_adj = self._get_model_residual_adjustment(make, model)

        # Apply lease term adjustment
        term_adj = self.lease_term_residual_adjustments.get(lease_term_months, 0)

        # Calculate final residual percentage
        residual_percent = base_residual + segment_adj + model_adj + term_adj

        # Cap residuals between 25% and 75%
        residual_percent = max(25, min(75, residual_percent))

        # Calculate residual dollar amount
        residual_value = msrp * (residual_percent / 100)

        return {
            'residual_percent': residual_percent,
            'residual_value': residual_value,
            'base_residual': base_residual,
            'segment': segment,
            'segment_adjustment': segment_adj,
            'model_adjustment': model_adj,
            'term_adjustment': term_adj,
            'lease_term_months': lease_term_months
        }

    def calculate_money_factor(self, make: str, model: str,
                              credit_tier: str = 'good') -> Dict[str, Any]:
        """
        Calculate money factor (lease interest rate)

        Args:
            make: Vehicle manufacturer
            model: Vehicle model
            credit_tier: Credit rating (excellent, good, fair) - affects rate

        Returns:
            Dictionary with money factor and equivalent APR
        """
        # Get base money factor for brand
        base_mf = self.brand_money_factors.get(make, 0.00150)

        # Credit tier adjustments
        credit_adjustments = {
            'excellent': -0.00020,  # 720+ credit score
            'good': 0.00000,        # 680-719 credit score (baseline)
            'fair': +0.00030,       # 620-679 credit score
            'poor': +0.00060        # <620 credit score
        }

        credit_adj = credit_adjustments.get(credit_tier, 0)

        # Calculate final money factor
        money_factor = base_mf + credit_adj

        # Cap between 0.00080 and 0.00350
        money_factor = max(0.00080, min(0.00350, money_factor))

        # Convert to APR equivalent (multiply by 2400)
        apr_equivalent = money_factor * 2400

        return {
            'money_factor': money_factor,
            'apr_equivalent': apr_equivalent,
            'base_money_factor': base_mf,
            'credit_adjustment': credit_adj,
            'credit_tier': credit_tier
        }

    def calculate_monthly_lease_payment(self, msrp: float, residual_percent: float,
                                       money_factor: float, lease_term_months: int,
                                       down_payment: float = 0,
                                       sales_tax_rate: float = 0) -> Dict[str, Any]:
        """
        Calculate monthly lease payment

        Args:
            msrp: Vehicle MSRP
            residual_percent: Residual value as percentage
            money_factor: Money factor (interest rate)
            lease_term_months: Lease term in months
            down_payment: Down payment/capitalized cost reduction
            sales_tax_rate: Sales tax rate (as decimal, e.g., 0.0725 for 7.25%)

        Returns:
            Dictionary with payment breakdown
        """
        # Calculate residual value
        residual_value = msrp * (residual_percent / 100)

        # Calculate depreciation (adjusted for down payment)
        net_cap_cost = msrp - down_payment
        depreciation_amount = net_cap_cost - residual_value

        # Monthly depreciation
        monthly_depreciation = depreciation_amount / lease_term_months

        # Monthly finance charge (rent charge)
        # Formula: (Net Cap Cost + Residual Value) × Money Factor
        monthly_finance_charge = (net_cap_cost + residual_value) * money_factor

        # Base monthly payment (before tax)
        base_monthly_payment = monthly_depreciation + monthly_finance_charge

        # Apply sales tax (typically on the full payment)
        monthly_tax = base_monthly_payment * sales_tax_rate
        total_monthly_payment = base_monthly_payment + monthly_tax

        # Calculate total lease cost
        total_payments = total_monthly_payment * lease_term_months
        total_lease_cost = total_payments + down_payment

        # Calculate total interest paid
        total_interest = monthly_finance_charge * lease_term_months

        return {
            'monthly_payment': total_monthly_payment,
            'monthly_payment_pretax': base_monthly_payment,
            'monthly_depreciation': monthly_depreciation,
            'monthly_finance_charge': monthly_finance_charge,
            'monthly_tax': monthly_tax,
            'total_payments': total_payments,
            'total_lease_cost': total_lease_cost,
            'total_interest': total_interest,
            'residual_value': residual_value,
            'depreciation_amount': depreciation_amount,
            'down_payment': down_payment,
            'effective_apr': money_factor * 2400
        }

    def get_complete_lease_analysis(self, make: str, model: str, trim: str,
                                   msrp: float, lease_term_months: int = 36,
                                   down_payment: float = 0,
                                   sales_tax_rate: float = 0,
                                   credit_tier: str = 'good') -> Dict[str, Any]:
        """
        Get complete lease analysis with residual, money factor, and payment calculations

        Args:
            make: Vehicle manufacturer
            model: Vehicle model
            trim: Trim level
            msrp: MSRP
            lease_term_months: Lease term in months (24, 36, 39, 42, 48, 60)
            down_payment: Down payment amount
            sales_tax_rate: Sales tax rate (as decimal)
            credit_tier: Credit rating tier

        Returns:
            Complete dictionary with all lease calculations
        """
        # Calculate residual value
        residual_info = self.calculate_residual_value(
            make, model, trim, msrp, lease_term_months
        )

        # Calculate money factor
        mf_info = self.calculate_money_factor(make, model, credit_tier)

        # Calculate monthly payment
        payment_info = self.calculate_monthly_lease_payment(
            msrp=msrp,
            residual_percent=residual_info['residual_percent'],
            money_factor=mf_info['money_factor'],
            lease_term_months=lease_term_months,
            down_payment=down_payment,
            sales_tax_rate=sales_tax_rate
        )

        # Combine all information
        return {
            'vehicle': {
                'make': make,
                'model': model,
                'trim': trim,
                'msrp': msrp
            },
            'lease_terms': {
                'lease_term_months': lease_term_months,
                'residual_percent': residual_info['residual_percent'],
                'residual_value': residual_info['residual_value'],
                'money_factor': mf_info['money_factor'],
                'apr_equivalent': mf_info['apr_equivalent'],
                'segment': residual_info['segment']
            },
            'payment': payment_info,
            'insights': self._generate_lease_insights(
                residual_info, mf_info, payment_info, make, model
            )
        }

    def _generate_lease_insights(self, residual_info: Dict, mf_info: Dict,
                                payment_info: Dict, make: str, model: str) -> list:
        """Generate insights about the lease"""
        insights = []

        # Residual insights
        if residual_info['residual_percent'] >= 60:
            insights.append(f"Excellent residual value at {residual_info['residual_percent']}% - this {make} {model} holds value very well")
        elif residual_info['residual_percent'] >= 52:
            insights.append(f"Good residual value at {residual_info['residual_percent']}% - solid value retention")
        elif residual_info['residual_percent'] >= 45:
            insights.append(f"Average residual value at {residual_info['residual_percent']}% - typical for this segment")
        else:
            insights.append(f"Lower residual value at {residual_info['residual_percent']}% - higher depreciation expected")

        # Money factor insights
        if mf_info['apr_equivalent'] <= 3.5:
            insights.append(f"Competitive lease rate at {mf_info['apr_equivalent']:.2f}% APR equivalent")
        elif mf_info['apr_equivalent'] <= 4.5:
            insights.append(f"Average lease rate at {mf_info['apr_equivalent']:.2f}% APR equivalent")
        else:
            insights.append(f"Higher lease rate at {mf_info['apr_equivalent']:.2f}% APR equivalent - consider negotiating")

        # Payment structure insights
        depreciation_ratio = payment_info['monthly_depreciation'] / payment_info['monthly_payment_pretax']
        if depreciation_ratio >= 0.75:
            insights.append("Most of your payment covers depreciation - consider extending lease term or increasing down payment")

        return insights


# Test function
def test_lease_calculator():
    """Test the lease calculator with various vehicles"""
    calculator = LeaseTermsCalculator()

    # Test 1: 2023 Cadillac Escalade
    print("=" * 60)
    print("Test 1: 2023 Cadillac Escalade Luxury")
    print("=" * 60)
    escalade = calculator.get_complete_lease_analysis(
        make='Cadillac',
        model='Escalade',
        trim='Luxury',
        msrp=85000,
        lease_term_months=36,
        down_payment=5000,
        sales_tax_rate=0.0725,
        credit_tier='good'
    )

    print(f"MSRP: ${escalade['vehicle']['msrp']:,.0f}")
    print(f"Segment: {escalade['lease_terms']['segment']}")
    print(f"Residual: {escalade['lease_terms']['residual_percent']}% (${escalade['lease_terms']['residual_value']:,.0f})")
    print(f"Money Factor: {escalade['lease_terms']['money_factor']:.5f} ({escalade['lease_terms']['apr_equivalent']:.2f}% APR)")
    print(f"Monthly Payment: ${escalade['payment']['monthly_payment']:,.2f}")
    print(f"Total Lease Cost: ${escalade['payment']['total_lease_cost']:,.0f}")
    print("\nInsights:")
    for insight in escalade['insights']:
        print(f"  - {insight}")

    # Test 2: 2024 Toyota Tacoma
    print("\n" + "=" * 60)
    print("Test 2: 2024 Toyota Tacoma TRD Pro")
    print("=" * 60)
    tacoma = calculator.get_complete_lease_analysis(
        make='Toyota',
        model='Tacoma',
        trim='TRD Pro',
        msrp=48000,
        lease_term_months=36,
        down_payment=3000,
        sales_tax_rate=0.0725,
        credit_tier='excellent'
    )

    print(f"MSRP: ${tacoma['vehicle']['msrp']:,.0f}")
    print(f"Segment: {tacoma['lease_terms']['segment']}")
    print(f"Residual: {tacoma['lease_terms']['residual_percent']}% (${tacoma['lease_terms']['residual_value']:,.0f})")
    print(f"Money Factor: {tacoma['lease_terms']['money_factor']:.5f} ({tacoma['lease_terms']['apr_equivalent']:.2f}% APR)")
    print(f"Monthly Payment: ${tacoma['payment']['monthly_payment']:,.2f}")
    print(f"Total Lease Cost: ${tacoma['payment']['total_lease_cost']:,.0f}")
    print("\nInsights:")
    for insight in tacoma['insights']:
        print(f"  - {insight}")


if __name__ == "__main__":
    test_lease_calculator()
