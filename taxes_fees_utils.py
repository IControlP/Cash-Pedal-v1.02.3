"""
Vehicle Taxes & Fees Calculator
Calculates state sales tax, destination charges, dealer doc fees,
title fees, and registration fees for new and used vehicle purchases.
Integrates with PredictionService for comprehensive TCO calculations.
"""

from typing import Dict, Any, Optional


# ========================================================================
# STATE VEHICLE SALES TAX RATES (2025)
# Format: state_code -> (base_rate, has_local_addon, avg_local_rate, notes)
# Rates are vehicle-specific where they differ from general sales tax
# ========================================================================

STATE_VEHICLE_TAX_RATES = {
    'AL': (0.020, True, 0.040, 'vehicle_rate'),      # 2% state + ~4% avg local
    'AK': (0.000, True, 0.020, 'no_state'),           # No state; some local
    'AZ': (0.056, True, 0.035, 'standard'),
    'AR': (0.065, True, 0.005, 'tiered_used'),         # Local only on first $2,500
    'CA': (0.0725, True, 0.015, 'no_tradein_credit'),
    'CO': (0.029, True, 0.045, 'standard'),
    'CT': (0.0635, False, 0.0, 'luxury_surcharge'),    # 7.75% over $50K
    'DE': (0.0, False, 0.0, 'doc_fee_state'),          # 5.25% doc fee instead
    'DC': (0.060, False, 0.0, 'weight_mpg_matrix'),    # Simplified avg; actual varies 0-10.1%
    'FL': (0.060, True, 0.010, 'surtax_capped'),       # County surtax on first $5K only
    'GA': (0.070, False, 0.0, 'tavt'),                 # One-time TAVT on fair market value
    'HI': (0.040, True, 0.005, 'get'),                 # General Excise Tax
    'ID': (0.060, False, 0.0, 'standard'),
    'IL': (0.0625, True, 0.020, 'private_flat'),       # Private sales use flat fee schedule
    'IN': (0.070, False, 0.0, 'standard'),
    'IA': (0.050, False, 0.0, 'registration_fee'),     # Called one-time registration fee
    'KS': (0.065, True, 0.030, 'standard'),
    'KY': (0.060, False, 0.0, 'usage_tax'),
    'LA': (0.050, True, 0.050, 'standard'),            # Rate increased Jan 2025
    'ME': (0.055, False, 0.0, 'standard'),
    'MD': (0.065, False, 0.0, 'excise_tax'),           # Increased from 6% July 2025
    'MA': (0.0625, False, 0.0, 'book_value_floor'),
    'MI': (0.060, False, 0.0, 'tradein_capped'),       # Trade-in credit capped $11K
    'MN': (0.06875, False, 0.0, 'standard'),
    'MS': (0.050, False, 0.0, 'vehicle_rate'),          # 5% passenger; 3% heavy truck
    'MO': (0.04225, True, 0.040, 'standard'),
    'MT': (0.000, False, 0.0, 'no_tax'),               # Truly zero
    'NE': (0.055, True, 0.015, 'standard'),
    'NV': (0.0685, True, 0.010, 'standard'),
    'NH': (0.000, False, 0.0, 'no_tax'),               # Truly zero
    'NJ': (0.06625, False, 0.0, 'standard'),
    'NM': (0.040, False, 0.0, 'excise_tax'),           # Motor Vehicle Excise Tax
    'NY': (0.040, True, 0.045, 'standard'),             # NYC = 8.875%
    'NC': (0.030, False, 0.0, 'highway_use'),           # Highway Use Tax
    'ND': (0.050, False, 0.0, 'excise_tax'),
    'OH': (0.0575, True, 0.015, 'standard'),
    'OK': (0.045, False, 0.0, 'combined'),              # 3.25% excise + 1.25% sales
    'OR': (0.005, False, 0.0, 'new_only'),              # 0.5% new vehicles only
    'PA': (0.060, False, 0.0, 'county_varies'),         # 7% Allegheny, 8% Philadelphia
    'RI': (0.070, False, 0.0, 'standard'),
    'SC': (0.050, False, 0.0, 'capped_500'),            # Max tax $500
    'SD': (0.040, False, 0.0, 'excise_tax'),
    'TN': (0.070, True, 0.025, 'complex_tiers'),
    'TX': (0.0625, False, 0.0, 'no_local_vehicles'),   # Vehicles exempt from local tax
    'UT': (0.0485, True, 0.030, 'standard'),
    'VT': (0.060, True, 0.005, 'book_value_floor'),
    'VA': (0.0415, False, 0.0, 'no_tradein_credit'),   # $75 minimum
    'WA': (0.068, True, 0.025, 'motor_vehicle_tax'),   # Includes 0.3% MV tax
    'WV': (0.060, False, 0.0, 'standard'),
    'WI': (0.050, True, 0.005, 'standard'),
    'WY': (0.040, True, 0.015, 'standard'),
}


# ========================================================================
# DESTINATION CHARGES BY MANUFACTURER (2025 models)
# Format: manufacturer -> (min_fee, max_fee, default_fee)
# ========================================================================

DESTINATION_CHARGES = {
    'Toyota': (1095, 1945, 1395),
    'Honda': (1095, 1395, 1295),
    'Ford': (1295, 2195, 1695),
    'Chevrolet': (1295, 2095, 1595),
    'GMC': (1395, 2095, 1695),
    'Ram': (1495, 2095, 1895),
    'Jeep': (1495, 2095, 1795),
    'Dodge': (1495, 1995, 1695),
    'Chrysler': (1495, 1695, 1595),
    'BMW': (995, 1175, 1095),
    'Mercedes-Benz': (1150, 1250, 1250),
    'Audi': (1095, 1195, 1150),
    'Lexus': (1150, 1350, 1250),
    'Tesla': (1390, 1390, 1390),
    'Hyundai': (1175, 1600, 1295),
    'Kia': (1175, 1495, 1295),
    'Nissan': (1245, 1895, 1395),
    'Subaru': (1170, 1395, 1295),
    'Volkswagen': (1425, 1425, 1425),
    'Mazda': (1185, 1375, 1295),
    'Volvo': (1195, 1295, 1245),
    'Acura': (1095, 1295, 1195),
    'Infiniti': (1195, 1395, 1295),
    'Lincoln': (1295, 1795, 1595),
    'Cadillac': (1295, 1895, 1595),
    'Buick': (1295, 1595, 1395),
    'Genesis': (1125, 1225, 1175),
    'Porsche': (1450, 1650, 1550),
    'Land Rover': (1350, 1550, 1450),
    'Jaguar': (1250, 1350, 1295),
    'Alfa Romeo': (1595, 1695, 1650),
    'Maserati': (1695, 1895, 1795),
    'Mitsubishi': (1195, 1495, 1345),
    'Mini': (850, 850, 850),
    'Rivian': (1800, 1800, 1800),
    'Lucid': (1500, 1500, 1500),
    'Polestar': (1400, 1400, 1400),
}

# Default destination charge for unknown manufacturers
DEFAULT_DESTINATION_CHARGE = 1495


# ========================================================================
# DEALER DOCUMENTATION FEE CAPS BY STATE (2025)
# Format: state_code -> cap_amount (None = uncapped)
# ========================================================================

DEALER_DOC_FEE_CAPS = {
    'CA': 85,    'OR': 115,   'AR': 129,   'TX': 200,
    'WA': 175,   'IL': 325,   'NY': 175,   'WV': 225,
    'IA': 180,   'MO': 199,   'LA': 350,   'RI': 200,
    'MI': 220,   'OH': 250,   'MN': 275,   'PA': 449,
    'MD': 500,
}

# Average doc fees for uncapped states
UNCAPPED_DOC_FEE_ESTIMATES = {
    'FL': 899,   'VA': 749,   'GA': 650,   'NC': 600,
    'TN': 590,   'CO': 550,   'SC': 550,   'AZ': 500,
    'NV': 500,   'AL': 485,   'IN': 450,   'KY': 450,
    'NJ': 400,   'CT': 400,   'MA': 400,   'WI': 400,
    'KS': 400,   'NE': 400,   'ID': 400,   'UT': 400,
    'NM': 400,   'OK': 400,   'MS': 400,   'HI': 350,
    'ME': 350,   'NH': 350,   'MT': 300,   'VT': 300,
    'ND': 300,   'SD': 300,   'WY': 300,   'DE': 300,
    'DC': 400,
}

# Default doc fee when state not found
DEFAULT_DOC_FEE = 400


# ========================================================================
# TITLE FEES BY STATE (2025) - One-time flat fees
# ========================================================================

STATE_TITLE_FEES = {
    'AL': 23,    'AK': 15,    'AZ': 4,     'AR': 10,
    'CA': 23,    'CO': 7.20,  'CT': 25,    'DE': 55,
    'DC': 26,    'FL': 75.75, 'GA': 18,    'HI': 5,
    'ID': 14,    'IL': 165,   'IN': 15,    'IA': 25,
    'KS': 10,    'KY': 9,     'LA': 68.50, 'ME': 33,
    'MD': 200,   'MA': 75,    'MI': 15,    'MN': 10.50,
    'MS': 9,     'MO': 14.50, 'MT': 12,    'NE': 10,
    'NV': 28.25, 'NH': 25,    'NJ': 60,    'NM': 5.50,
    'NY': 50,    'NC': 56,    'ND': 5,     'OH': 15,
    'OK': 11,    'OR': 128.50,'PA': 58,    'RI': 52.50,
    'SC': 15,    'SD': 10,    'TN': 14,    'TX': 33,
    'UT': 6,     'VT': 35,    'VA': 15,    'WA': 15,
    'WV': 15,    'WI': 164.50,'WY': 15,
}

DEFAULT_TITLE_FEE = 25


# ========================================================================
# REGISTRATION FEE ESTIMATES BY STATE (2025)
# Simplified to flat estimates; real calculation varies by value/weight/age
# Format: state_code -> (base_annual_fee, plate_fee)
# ========================================================================

STATE_REGISTRATION_FEES = {
    'AL': (50, 0),     'AK': (50, 0),     'AZ': (32, 0),     'AR': (25, 0),
    'CA': (65, 0),     'CO': (75, 0),     'CT': (60, 0),     'DE': (40, 0),
    'DC': (72, 0),     'FL': (28, 28),    'GA': (20, 0),     'HI': (45, 5),
    'ID': (60, 7.50),  'IL': (151, 0),    'IN': (45, 0),     'IA': (50, 0),
    'KS': (42, 0),     'KY': (21, 0),     'LA': (30, 0),     'ME': (35, 0),
    'MD': (135, 0),    'MA': (60, 0),     'MI': (50, 0),     'MN': (45, 8),
    'MS': (14, 0),     'MO': (25, 7.54),  'MT': (130, 10.30),'NE': (30, 6.60),
    'NV': (33, 8),     'NH': (40, 8),     'NJ': (50, 0),     'NM': (40, 0),
    'NY': (50, 25),    'NC': (38, 21.50), 'ND': (49, 0),     'OH': (31, 0),
    'OK': (50, 0),     'OR': (268, 0),    'PA': (42, 0),     'RI': (30, 42.50),
    'SC': (40, 0),     'SD': (36, 0),     'TN': (28, 0),     'TX': (50.75, 0),
    'UT': (44, 7),     'VT': (76, 0),     'VA': (35.75, 0),  'WA': (65, 22),
    'WV': (51.50, 0),  'WI': (85, 4),     'WY': (30, 0),
}

DEFAULT_REGISTRATION_FEE = (50, 0)


# ========================================================================
# STATES WITHOUT TRADE-IN TAX CREDIT
# In these states, tax is on full price regardless of trade-in
# ========================================================================

NO_TRADEIN_CREDIT_STATES = {'CA', 'DC', 'HI', 'KY', 'MD', 'VA'}
# MI allows credit but capped at $11,000


class VehicleTaxesFeesCalculator:
    """
    Calculates all taxes and fees associated with vehicle purchase.
    Produces an out-the-door (OTD) price estimate and amortized annual costs.
    """

    def calculate_all_taxes_fees(
        self,
        purchase_price: float,
        state: str,
        make: str = '',
        is_new: bool = True,
        trade_in_value: float = 0.0,
        vehicle_weight_lbs: int = 0,
        mpg: int = 0,
    ) -> Dict[str, Any]:
        """
        Master calculation: returns full breakdown of taxes, fees, and OTD price.

        Args:
            purchase_price: Vehicle MSRP or negotiated price
            state: Two-letter state code (e.g. 'CA', 'TX')
            make: Manufacturer name for destination charge lookup
            is_new: True for new vehicle, False for used
            trade_in_value: Trade-in credit amount (0 if none)
            vehicle_weight_lbs: Curb weight (optional, for DC matrix)
            mpg: Combined MPG (optional, for DC matrix)

        Returns:
            Dict with itemized fees, totals, and OTD price
        """
        state = state.upper().strip() if state else ''

        # 1) Sales tax
        tax_result = self.calculate_sales_tax(
            purchase_price, state, is_new, trade_in_value,
            vehicle_weight_lbs, mpg
        )

        # 2) Destination / delivery charge (new vehicles only)
        destination = self.get_destination_charge(make) if is_new else 0

        # 3) Dealer documentation fee
        doc_fee = self.get_doc_fee(state)

        # 4) Title fee
        title_fee = self.get_title_fee(state)

        # 5) Registration fee (first-year estimate)
        reg_result = self.get_registration_fee(state)
        registration_fee = reg_result['total']

        # ---- Aggregate ----
        total_taxes = tax_result['total_tax']
        total_fees = destination + doc_fee + title_fee + registration_fee
        total_taxes_and_fees = total_taxes + total_fees
        otd_price = purchase_price + total_taxes_and_fees

        # Amount added to loan (taxes + fees are typically financed)
        financed_addon = total_taxes_and_fees

        return {
            # Itemized breakdown
            'sales_tax': tax_result['total_tax'],
            'sales_tax_rate': tax_result['effective_rate'],
            'sales_tax_detail': tax_result,
            'destination_charge': destination,
            'doc_fee': doc_fee,
            'title_fee': title_fee,
            'registration_fee': registration_fee,
            'registration_detail': reg_result,

            # Totals
            'total_taxes': total_taxes,
            'total_fees': total_fees,
            'total_taxes_and_fees': total_taxes_and_fees,
            'otd_price': otd_price,
            'purchase_price': purchase_price,
            'financed_addon': financed_addon,

            # Flags
            'is_new': is_new,
            'state': state,
            'make': make,
            'trade_in_applied': trade_in_value > 0,
            'trade_in_credit_allowed': state not in NO_TRADEIN_CREDIT_STATES,
        }

    # ------------------------------------------------------------------
    # Sales Tax
    # ------------------------------------------------------------------

    def calculate_sales_tax(
        self,
        purchase_price: float,
        state: str,
        is_new: bool = True,
        trade_in_value: float = 0.0,
        vehicle_weight_lbs: int = 0,
        mpg: int = 0,
    ) -> Dict[str, Any]:
        """Calculate state + estimated local vehicle sales tax."""

        state = state.upper().strip() if state else ''
        tax_data = STATE_VEHICLE_TAX_RATES.get(state)

        if not tax_data:
            # Unknown state fallback: 6% estimate
            fallback_tax = purchase_price * 0.06
            return {
                'state_tax': fallback_tax,
                'local_tax': 0,
                'total_tax': fallback_tax,
                'effective_rate': 0.06,
                'taxable_amount': purchase_price,
                'notes': 'Estimated - state not found',
            }

        base_rate, has_local, avg_local, notes = tax_data
        taxable_amount = purchase_price

        # --- Trade-in credit ---
        if trade_in_value > 0 and state not in NO_TRADEIN_CREDIT_STATES:
            if state == 'MI':
                # Michigan caps trade-in credit at $11,000
                credit = min(trade_in_value, 11000)
            else:
                credit = trade_in_value
            taxable_amount = max(0, purchase_price - credit)

        # --- Special state logic ---

        # South Carolina: $500 cap
        if state == 'SC':
            state_tax = min(taxable_amount * base_rate, 500)
            return {
                'state_tax': state_tax, 'local_tax': 0,
                'total_tax': state_tax,
                'effective_rate': state_tax / purchase_price if purchase_price > 0 else 0,
                'taxable_amount': taxable_amount,
                'notes': 'SC tax capped at $500',
            }

        # Connecticut luxury surcharge: 7.75% over $50K
        if state == 'CT':
            rate = 0.0775 if purchase_price > 50000 else 0.0635
            state_tax = taxable_amount * rate
            return {
                'state_tax': state_tax, 'local_tax': 0,
                'total_tax': state_tax,
                'effective_rate': rate,
                'taxable_amount': taxable_amount,
                'notes': 'Luxury surcharge applied' if purchase_price > 50000 else '',
            }

        # Oregon: 0.5% new only, 0% used
        if state == 'OR':
            rate = 0.005 if is_new else 0.0
            state_tax = taxable_amount * rate
            return {
                'state_tax': state_tax, 'local_tax': 0,
                'total_tax': state_tax,
                'effective_rate': rate,
                'taxable_amount': taxable_amount,
                'notes': 'Vehicle Privilege Tax (new only)' if is_new else 'No tax on used vehicles',
            }

        # Delaware: no sales tax but 5.25% document fee at registration
        if state == 'DE':
            doc_tax = taxable_amount * 0.0525
            return {
                'state_tax': doc_tax, 'local_tax': 0,
                'total_tax': doc_tax,
                'effective_rate': 0.0525,
                'taxable_amount': taxable_amount,
                'notes': 'DE 5.25% document fee (not sales tax)',
            }

        # Virginia: $75 minimum
        if state == 'VA':
            state_tax = max(taxable_amount * base_rate, 75)
            return {
                'state_tax': state_tax, 'local_tax': 0,
                'total_tax': state_tax,
                'effective_rate': state_tax / purchase_price if purchase_price > 0 else 0,
                'taxable_amount': taxable_amount,
                'notes': '$75 minimum applied' if taxable_amount * base_rate < 75 else '',
            }

        # DC weight x MPG matrix (simplified)
        if state == 'DC':
            rate = self._dc_tax_rate(vehicle_weight_lbs, mpg)
            state_tax = taxable_amount * rate
            return {
                'state_tax': state_tax, 'local_tax': 0,
                'total_tax': state_tax,
                'effective_rate': rate,
                'taxable_amount': taxable_amount,
                'notes': f'DC weight/MPG matrix rate: {rate*100:.1f}%',
            }

        # Montana & New Hampshire: truly zero
        if state in ('MT', 'NH'):
            return {
                'state_tax': 0, 'local_tax': 0,
                'total_tax': 0,
                'effective_rate': 0.0,
                'taxable_amount': taxable_amount,
                'notes': 'No vehicle sales tax',
            }

        # --- Standard calculation ---
        state_tax = taxable_amount * base_rate
        local_tax = taxable_amount * avg_local if has_local else 0
        total_tax = state_tax + local_tax
        effective_rate = total_tax / purchase_price if purchase_price > 0 else 0

        return {
            'state_tax': state_tax,
            'local_tax': local_tax,
            'total_tax': total_tax,
            'effective_rate': effective_rate,
            'taxable_amount': taxable_amount,
            'notes': f'Includes est. {avg_local*100:.1f}% local tax' if has_local and avg_local > 0 else '',
        }

    # ------------------------------------------------------------------
    # DC Tax Rate Matrix (simplified)
    # ------------------------------------------------------------------

    def _dc_tax_rate(self, weight_lbs: int, mpg: int) -> float:
        """Simplified DC weight x MPG matrix. EVs = 0%."""
        if mpg == 0:
            return 0.0  # Assume EV
        if mpg >= 40:
            return 0.01 if weight_lbs < 3500 else 0.034
        elif mpg >= 30:
            return 0.034 if weight_lbs < 3500 else 0.054
        elif mpg >= 20:
            return 0.054 if weight_lbs < 4000 else 0.070
        else:
            return 0.070 if weight_lbs < 4500 else 0.101

    # ------------------------------------------------------------------
    # Destination Charge
    # ------------------------------------------------------------------

    def get_destination_charge(self, make: str) -> int:
        """Return estimated destination/delivery charge for a manufacturer."""
        if not make:
            return DEFAULT_DESTINATION_CHARGE

        # Normalize make name for lookup
        make_normalized = make.strip()
        charge_data = DESTINATION_CHARGES.get(make_normalized)

        if charge_data:
            return charge_data[2]  # default_fee (middle estimate)

        # Try case-insensitive match
        for key, val in DESTINATION_CHARGES.items():
            if key.lower() == make_normalized.lower():
                return val[2]

        return DEFAULT_DESTINATION_CHARGE

    # ------------------------------------------------------------------
    # Dealer Documentation Fee
    # ------------------------------------------------------------------

    def get_doc_fee(self, state: str) -> float:
        """Return estimated dealer doc fee for a state."""
        state = state.upper().strip() if state else ''

        # Check capped states first
        if state in DEALER_DOC_FEE_CAPS:
            return DEALER_DOC_FEE_CAPS[state]

        # Check uncapped state estimates
        if state in UNCAPPED_DOC_FEE_ESTIMATES:
            return UNCAPPED_DOC_FEE_ESTIMATES[state]

        return DEFAULT_DOC_FEE

    # ------------------------------------------------------------------
    # Title Fee
    # ------------------------------------------------------------------

    def get_title_fee(self, state: str) -> float:
        """Return state title fee."""
        state = state.upper().strip() if state else ''
        return STATE_TITLE_FEES.get(state, DEFAULT_TITLE_FEE)

    # ------------------------------------------------------------------
    # Registration Fee (first-year estimate)
    # ------------------------------------------------------------------

    def get_registration_fee(self, state: str) -> Dict[str, float]:
        """Return estimated first-year registration + plate fees."""
        state = state.upper().strip() if state else ''
        base, plate = STATE_REGISTRATION_FEES.get(state, DEFAULT_REGISTRATION_FEE)
        return {
            'base_fee': base,
            'plate_fee': plate,
            'total': base + plate,
        }

    # ------------------------------------------------------------------
    # Annual Registration Cost (for recurring TCO years 2+)
    # ------------------------------------------------------------------

    def get_annual_registration_renewal(self, state: str) -> float:
        """
        Estimate annual registration renewal cost.
        Typically lower than first-year since plate fees are one-time.
        """
        state = state.upper().strip() if state else ''
        base, _ = STATE_REGISTRATION_FEES.get(state, DEFAULT_REGISTRATION_FEE)
        return base

    # ------------------------------------------------------------------
    # Helper: Amortize upfront costs over ownership period
    # ------------------------------------------------------------------

    def amortize_upfront_costs(
        self,
        taxes_fees_result: Dict[str, Any],
        analysis_years: int = 5,
    ) -> Dict[str, float]:
        """
        Spread one-time purchase taxes/fees across the ownership period.
        Returns annual and monthly amortized amounts.
        """
        total = taxes_fees_result.get('total_taxes_and_fees', 0)
        annual_registration = self.get_annual_registration_renewal(
            taxes_fees_result.get('state', '')
        )

        # One-time costs (tax, destination, doc, title, first-year registration)
        one_time = total
        # Recurring registration for years 2+
        recurring_total = annual_registration * max(0, analysis_years - 1)

        lifetime_total = one_time + recurring_total
        annual_amortized = lifetime_total / analysis_years if analysis_years > 0 else 0
        monthly_amortized = annual_amortized / 12

        return {
            'one_time_total': one_time,
            'recurring_registration_total': recurring_total,
            'lifetime_taxes_fees': lifetime_total,
            'annual_amortized': annual_amortized,
            'monthly_amortized': monthly_amortized,
        }

    # ------------------------------------------------------------------
    # Summary: formatted for display
    # ------------------------------------------------------------------

    def get_display_summary(
        self,
        taxes_fees_result: Dict[str, Any],
    ) -> Dict[str, str]:
        """Return human-readable formatted strings for UI display."""
        r = taxes_fees_result
        return {
            'sales_tax': f"${r['sales_tax']:,.0f}",
            'sales_tax_rate': f"{r['sales_tax_rate']*100:.1f}%",
            'destination_charge': f"${r['destination_charge']:,.0f}",
            'doc_fee': f"${r['doc_fee']:,.0f}",
            'title_fee': f"${r['title_fee']:,.0f}",
            'registration_fee': f"${r['registration_fee']:,.0f}",
            'total_taxes_and_fees': f"${r['total_taxes_and_fees']:,.0f}",
            'otd_price': f"${r['otd_price']:,.0f}",
        }


# ========================================================================
# Module-level convenience functions (match project's flat-function style)
# ========================================================================

_calculator = VehicleTaxesFeesCalculator()


def calculate_vehicle_taxes_fees(
    purchase_price: float,
    state: str,
    make: str = '',
    is_new: bool = True,
    trade_in_value: float = 0.0,
    vehicle_weight_lbs: int = 0,
    mpg: int = 0,
) -> Dict[str, Any]:
    """Module-level shortcut to calculate all taxes and fees."""
    return _calculator.calculate_all_taxes_fees(
        purchase_price=purchase_price,
        state=state,
        make=make,
        is_new=is_new,
        trade_in_value=trade_in_value,
        vehicle_weight_lbs=vehicle_weight_lbs,
        mpg=mpg,
    )


def get_otd_price(
    purchase_price: float,
    state: str,
    make: str = '',
    is_new: bool = True,
) -> float:
    """Quick helper: returns just the out-the-door price."""
    result = _calculator.calculate_all_taxes_fees(
        purchase_price=purchase_price,
        state=state,
        make=make,
        is_new=is_new,
    )
    return result['otd_price']


def get_destination_charge(make: str) -> int:
    """Quick helper: returns destination charge for a make."""
    return _calculator.get_destination_charge(make)


def get_annual_registration(state: str) -> float:
    """Quick helper: returns annual registration renewal estimate."""
    return _calculator.get_annual_registration_renewal(state)


def amortize_taxes_fees(
    purchase_price: float,
    state: str,
    make: str = '',
    is_new: bool = True,
    analysis_years: int = 5,
) -> Dict[str, float]:
    """Calculate and amortize all taxes/fees over ownership period."""
    tf = _calculator.calculate_all_taxes_fees(
        purchase_price=purchase_price,
        state=state,
        make=make,
        is_new=is_new,
    )
    return _calculator.amortize_upfront_costs(tf, analysis_years)
