"""
Enhanced User Input Forms with Persistent Settings
Maintains user information, location, and insurance settings across multiple car calculations
"""

import streamlit as st
import re
from typing import Dict, Any, Tuple, Optional
from datetime import datetime
try:
    from used_vehicle_estimator import UsedVehicleEstimator
except ImportError:
    # Fallback if estimator not available
    class UsedVehicleEstimator:
        def __init__(self):
            pass
        def is_used_vehicle(self, year, mileage):
            return False
        def estimate_current_value(self, make, model, year, trim, mileage):
            return None

try:
    from lease_terms_calculator import LeaseTermsCalculator
except ImportError:
    # Fallback if calculator not available
    class LeaseTermsCalculator:
        def __init__(self):
            pass
        def get_complete_lease_analysis(self, make, model, trim, msrp, lease_term_months=36, down_payment=0, sales_tax_rate=0, credit_tier='good'):
            return {'payment': {'monthly_payment_pretax': 399}}
# Import with error handling (keeping your existing structure)
# Import with error handling to match your existing structure
try:
    from vehicle_database import (
        get_all_manufacturers, 
        get_models_for_manufacturer, 
        get_trims_for_vehicle, 
        get_vehicle_trim_price,
        validate_vehicle_selection, 
        get_available_years_for_model
    )
    VEHICLE_DATABASE_AVAILABLE = True
except ImportError:
    VEHICLE_DATABASE_AVAILABLE = False
    # Fallback functions if database not available
    def get_all_manufacturers():
        return ['Toyota', 'Honda', 'Chevrolet', 'Ford', 'Hyundai', 'BMW', 'Mercedes-Benz']
    
    def get_models_for_manufacturer(make):
        models = {
            'Toyota': ['Camry', 'Corolla', 'Prius', 'RAV4'],
            'Honda': ['Civic', 'Accord', 'CR-V', 'Pilot'],
            'Chevrolet': ['Silverado', 'Malibu', 'Equinox'],
            'Ford': ['F-150', 'Escape', 'Focus'],
            'Hyundai': ['Elantra', 'Santa Fe', 'Tucson'],
            'BMW': ['3 Series', '5 Series', 'X3', 'X5'],
            'Mercedes-Benz': ['C-Class', 'E-Class', 'GLC', 'GLE']
        }
        return models.get(make, [])
    
    def get_trims_for_vehicle(make, model, year):
        return {'Base': 25000, 'LX': 28000, 'EX': 32000, 'Touring': 35000}
    
    def get_available_years_for_model(make, model):
        return list(range(2015, 2026))
    
    def validate_vehicle_selection(make, model, year, trim):
        return True, "Valid selection"
    
    def get_vehicle_trim_price(make, model, year, trim):
        return 30000

try:
    from zip_code_utils import validate_zip_code, lookup_zip_code_data, validate_and_lookup_location
except ImportError:
    def validate_zip_code(zip_code):
        return len(zip_code) == 5 and zip_code.isdigit()
    
    def lookup_zip_code_data(zip_code):
        return {
            'state': 'CA', 
            'geography_type': 'Suburban', 
            'fuel_price': 3.50,
            'electricity_rate': 0.12
        }
# Persistent settings storage
def initialize_persistent_settings():
    """Initialize persistent settings in session state"""
    if 'persistent_settings' not in st.session_state:
        st.session_state.persistent_settings = {
            'location': {'is_set': False},
            'personal': {'is_set': False},
            'insurance': {'is_set': False},
            'analysis': {'is_set': False}
        }

def get_persistent_setting(category: str) -> Dict[str, Any]:
    """Get persistent setting for a category"""
    initialize_persistent_settings()
    return st.session_state.persistent_settings.get(category, {'is_set': False})

def save_persistent_setting(category: str, data: Dict[str, Any]):
    """Save persistent setting for a category"""
    initialize_persistent_settings()
    data['is_set'] = True
    st.session_state.persistent_settings[category] = data

# ============================================
# CALLBACK FUNCTIONS FOR REACTIVE INPUTS
# ============================================

def on_zip_code_change():
    """Callback when ZIP code changes - auto-populate state, fuel price, electricity rate, and labor rate"""
    zip_code = st.session_state.get('zip_code_input_reactive', '')
    if zip_code and len(zip_code) == 5 and zip_code.isdigit():
        # Use comprehensive lookup with fallback
        zip_data = validate_and_lookup_location(zip_code)
        if zip_data and zip_data.get('is_valid', False):
            st.session_state['auto_detected_state'] = zip_data.get('state', '')
            st.session_state['auto_detected_geography'] = zip_data.get('geography_type', 'Suburban')
            st.session_state['auto_detected_fuel_price'] = zip_data.get('fuel_price', 3.50)
            st.session_state['auto_detected_electricity_rate'] = zip_data.get('electricity_rate', 0.15)
            st.session_state['auto_detected_labor_rate'] = zip_data.get('labor_rate', 100)
            st.session_state['state_select_reactive'] = zip_data.get('state', '')
            st.session_state['state_fuel_price'] = zip_data.get('fuel_price', 3.50)
            st.session_state['state_electricity_rate'] = zip_data.get('electricity_rate', 0.15)
            st.session_state['state_labor_rate'] = zip_data.get('labor_rate', 100)
            st.session_state['zip_code_valid'] = True
            st.session_state['location_needs_update'] = True

            # Store any informational messages (like "using state averages")
            if zip_data.get('error_message'):
                st.session_state['zip_lookup_message'] = zip_data['error_message']
        else:
            st.session_state['zip_code_valid'] = False
            st.session_state['zip_lookup_message'] = zip_data.get('error_message', 'Invalid ZIP code')
    else:
        st.session_state['zip_code_valid'] = False


def on_state_change():
    """Callback when state selection changes - update fuel pricing, electricity rate, and labor rate"""
    selected_state = st.session_state.get('state_select_reactive', '')
    if selected_state:
        try:
            from zip_code_utils import STATE_FUEL_PRICES, STATE_ELECTRICITY_RATES, STATE_LABOR_RATES
            st.session_state['state_fuel_price'] = STATE_FUEL_PRICES.get(selected_state, 3.50)
            st.session_state['state_electricity_rate'] = STATE_ELECTRICITY_RATES.get(selected_state, 0.15)
            st.session_state['state_labor_rate'] = STATE_LABOR_RATES.get(selected_state, 100)
        except ImportError:
            # Fallback state fuel prices
            state_fuel_prices = {
                'CA': 4.65, 'HI': 4.95, 'WA': 4.20, 'NV': 4.05, 'OR': 4.10,
                'AK': 4.15, 'AZ': 3.85, 'IL': 3.60, 'PA': 3.65, 'NY': 3.90,
                'TX': 3.25, 'OK': 3.15, 'KS': 3.15, 'MO': 3.20, 'AR': 3.10,
                'AL': 3.20, 'CO': 3.50, 'CT': 3.75, 'DE': 3.45, 'FL': 3.40,
                'GA': 3.30, 'ID': 3.65, 'IN': 3.35, 'IA': 3.25, 'KY': 3.30,
                'LA': 3.05, 'ME': 3.70, 'MD': 3.55, 'MA': 3.80, 'MI': 3.50,
                'MN': 3.45, 'MS': 3.10, 'MT': 3.60, 'NE': 3.30, 'NH': 3.65,
                'NJ': 3.70, 'NM': 3.40, 'NC': 3.35, 'ND': 3.25, 'OH': 3.40,
                'RI': 3.75, 'SC': 3.25, 'SD': 3.35, 'TN': 3.20, 'UT': 3.75,
                'VT': 3.70, 'VA': 3.45, 'WV': 3.40, 'WI': 3.45, 'WY': 3.50,
            }
            st.session_state['state_fuel_price'] = state_fuel_prices.get(selected_state, 3.50)
            st.session_state['state_electricity_rate'] = 0.15
            st.session_state['state_labor_rate'] = 100
        st.session_state['location_needs_update'] = True


def on_vehicle_make_change():
    """Callback when vehicle make changes - reset dependent selections"""
    st.session_state['vehicle_selection_changed'] = True


def on_vehicle_model_change():
    """Callback when vehicle model changes"""
    st.session_state['vehicle_selection_changed'] = True


def on_vehicle_year_change():
    """Callback when vehicle year changes"""
    st.session_state['vehicle_selection_changed'] = True


def initialize_reactive_state():
    """Initialize session state for reactive inputs"""
    defaults = {
        'zip_code_valid': False,
        'auto_detected_state': '',
        'auto_detected_geography': 'Suburban',
        'auto_detected_fuel_price': 3.50,
        'auto_detected_electricity_rate': 0.15,
        'state_fuel_price': 3.50,
        'vehicle_selection_changed': False,
        'location_needs_update': False,
    }
    for key, value in defaults.items():
        if key not in st.session_state:
            st.session_state[key] = value

def estimate_used_vehicle_value(make: str, model: str, year: int, current_mileage: int, trim_msrp: float) -> Optional[float]:
    """
    Market-validated depreciation estimation with research-based curves and brand multipliers
    Updated with 2024-2025 market data for realistic vehicle valuations
    """
    try:
        current_year = datetime.now().year
        vehicle_age = current_year - year
        
        # Only process vehicles that qualify for depreciation estimation
        if year > current_year:
            return None
            
        # Skip estimation for current year vehicles with very low mileage (truly new)
        if year == current_year and current_mileage <= 1000:
            return None
        
        # ENHANCED LOGIC FOR CURRENT YEAR VEHICLES WITH MILEAGE
        if vehicle_age == 0 and current_mileage > 1000:
            # CURRENT YEAR VEHICLE WITH SIGNIFICANT MILEAGE - Apply new car depreciation
            # First, determine the vehicle segment to get the 1-year baseline
            model_lower = model.lower()
            make_lower = make.lower()
            
            if make_lower in ['bmw', 'mercedes-benz', 'audi', 'lexus', 'acura', 'infiniti', 'cadillac', 'lincoln']:
                segment = 'luxury'
                one_year_rate = 0.15  # Market-validated: reduced from 0.18 to align with KBB
            elif any(term in model_lower for term in ['f-150', 'silverado', 'ram', 'tundra', 'tacoma', 'frontier', 'ridgeline']):
                segment = 'truck'
                one_year_rate = 0.10  # Trucks hold value better - reduced from 0.12
            elif any(term in model_lower for term in ['suburban', 'tahoe', 'pilot', 'highlander', 'rav4', 'cr-v', 'explorer', 'escape', 'equinox']):
                segment = 'suv'
                one_year_rate = 0.13  # SUVs moderate retention - reduced from 0.15
            elif any(term in model_lower for term in ['corvette', 'mustang', 'camaro', 'challenger', '911', 'boxster', 'cayman']):
                segment = 'sports'
                one_year_rate = 0.16  # Sports cars - reduced from 0.20
            elif any(term in model_lower for term in ['civic', 'corolla', 'elantra', 'sentra', 'forte']):
                segment = 'compact'
                one_year_rate = 0.14  # Compacts - reduced from 0.16
            elif any(term in model_lower for term in ['spark', 'mirage', 'rio', 'versa']):
                segment = 'economy'
                one_year_rate = 0.17  # Economy cars - reduced from 0.19
            else:
                segment = 'sedan'
                one_year_rate = 0.15  # Sedans - reduced from 0.17
            
            # INTEGRATED Progressive depreciation - never exceed 1-year rates
            # Scale from minimal depreciation to approaching (but not exceeding) 1-year rates
            if current_mileage <= 5000:
                # 1,001 - 5,000 miles: 2-6% (demo/test drive level)
                mileage_factor = (current_mileage - 1000) / 4000  # 0 to 1
                base_depreciation = 0.02 + mileage_factor * 0.04  # 2-6%
                depreciation_type = "demo/test drive level"
            elif current_mileage <= 15000:
                # 5,001 - 15,000 miles: 6-12% (rental return level)
                mileage_factor = (current_mileage - 5000) / 10000  # 0 to 1
                base_depreciation = 0.06 + mileage_factor * 0.06  # 6-12%
                depreciation_type = "rental return level"
            elif current_mileage <= 25000:
                # 15,001 - 25,000 miles: Scale to 75% of 1-year rate
                mileage_factor = (current_mileage - 15000) / 10000  # 0 to 1
                base_depreciation = 0.12 + mileage_factor * (one_year_rate * 0.75 - 0.12)
                depreciation_type = "high usage new car"
            else:
                # >25,000 miles: Approach but never exceed 85% of 1-year rate
                excess_miles = min(current_mileage - 25000, 25000)  # Cap excess at 25k
                mileage_factor = excess_miles / 25000  # 0 to 1
                max_depreciation = one_year_rate * 0.85  # Never exceed 85% of 1-year rate
                base_depreciation = (one_year_rate * 0.75) + mileage_factor * (max_depreciation - one_year_rate * 0.75)
                depreciation_type = "heavily used new car"
            
            # Apply research-validated brand-specific modifiers for new car depreciation
            brand_modifiers = {
                # Best Value Retention (0.85-0.95)
                'Toyota': 0.90, 'Lexus': 0.85, 'Honda': 0.90, 'Subaru': 0.92, 
                'Mazda': 0.95, 'Porsche': 0.88,
                
                # Good Value Retention (0.95-1.00)
                'Hyundai': 0.95, 'Kia': 0.96, 'Jeep': 0.92, 'Ram': 0.94,
                'Acura': 0.93,
                
                # Average Retention (1.00-1.05)
                'Ford': 1.00, 'Chevrolet': 1.02, 'Nissan': 1.03, 'GMC': 1.00,
                'Volkswagen': 1.05,
                
                # Below Average - Luxury (1.05-1.15)
                'BMW': 1.12, 'Mercedes-Benz': 1.08, 'Audi': 1.05, 'Cadillac': 1.12,
                'Lincoln': 1.15, 'Infiniti': 1.10,
                
                # Poor Retention (1.15-1.25)
                'Tesla': 1.18, 'Jaguar': 1.22, 'Land Rover': 1.20, 'Chrysler': 1.25,
                'Dodge': 1.22, 'Fiat': 1.28
            }
            
            brand_multiplier = brand_modifiers.get(make, 1.0)
            
            # Calculate final depreciation for new car with mileage
            final_depreciation = base_depreciation * brand_multiplier
            
            # Apply conservative caps for new car depreciation - INTEGRATED with 1-year rates
            # Never exceed 85% of the 1-year depreciation rate for that segment
            max_allowed_depreciation = one_year_rate * 0.85
            final_depreciation = min(final_depreciation, max_allowed_depreciation)
            final_depreciation = max(final_depreciation, 0.015)  # Min 1.5% depreciation
            
            estimated_value = trim_msrp * (1 - final_depreciation)

            return round(estimated_value, 0)
        
        # EXISTING LOGIC FOR OLDER VEHICLES - UPDATED WITH MARKET DATA
        else:
            # STEP 1: MARKET-VALIDATED DEPRECIATION CURVES (Updated based on 2024-2025 research)
            # KBB states most vehicles lose about 20% first year, then 60% total by year 5
            realistic_curves = {
                # Luxury vehicles - aligned with market research showing high depreciation
                'luxury': {
                    1: 0.15,   2: 0.25,   3: 0.33,   4: 0.40,   5: 0.47,  # More conservative based on KBB data
                    6: 0.53,   7: 0.58,   8: 0.62,   9: 0.65,   10: 0.68,
                    11: 0.70,  12: 0.72,  13: 0.73,  14: 0.74,  15: 0.75
                },
                
                # Trucks - excellent retention based on research
                'truck': {
                    1: 0.10,   2: 0.18,   3: 0.25,   4: 0.31,   5: 0.36,  # Strong value retention
                    6: 0.41,   7: 0.45,   8: 0.48,   9: 0.51,   10: 0.54,
                    11: 0.56,  12: 0.58,  13: 0.59,  14: 0.60,  15: 0.61
                },
                
                # SUVs - good retention, popular segment
                'suv': {
                    1: 0.13,   2: 0.22,   3: 0.30,   4: 0.36,   5: 0.42,  # Moderate retention
                    6: 0.47,   7: 0.51,   8: 0.55,   9: 0.58,   10: 0.61,
                    11: 0.63,  12: 0.65,  13: 0.66,  14: 0.67,  15: 0.68
                },
                
                # Sports cars - variable by desirability
                'sports': {
                    1: 0.16,   2: 0.26,   3: 0.34,   4: 0.41,   5: 0.47,  # Some hold value well (911), others don't
                    6: 0.52,   7: 0.56,   8: 0.60,   9: 0.63,   10: 0.66,
                    11: 0.68,  12: 0.70,  13: 0.71,  14: 0.72,  15: 0.73
                },
                
                # Compact cars - moderate depreciation
                'compact': {
                    1: 0.14,   2: 0.24,   3: 0.32,   4: 0.38,   5: 0.44,  # Civic, Corolla hold value well
                    6: 0.49,   7: 0.53,   8: 0.57,   9: 0.60,   10: 0.62,
                    11: 0.64,  12: 0.66,  13: 0.67,  14: 0.68,  15: 0.69
                },
                
                # Standard sedans - declining segment
                'sedan': {
                    1: 0.15,   2: 0.25,   3: 0.33,   4: 0.40,   5: 0.46,  # Average depreciation
                    6: 0.51,   7: 0.55,   8: 0.59,   9: 0.62,   10: 0.65,
                    11: 0.67,  12: 0.69,  13: 0.70,  14: 0.71,  15: 0.72
                },
                
                # Economy cars - higher depreciation
                'economy': {
                    1: 0.17,   2: 0.28,   3: 0.37,   4: 0.45,   5: 0.52,  # Faster depreciation
                    6: 0.58,   7: 0.62,   8: 0.66,   9: 0.69,   10: 0.72,
                    11: 0.74,  12: 0.76,  13: 0.77,  14: 0.78,  15: 0.79
                }
            }
            
            # Classify vehicle segment
            model_lower = model.lower()
            make_lower = make.lower()
            
            if make_lower in ['bmw', 'mercedes-benz', 'audi', 'lexus', 'acura', 'infiniti', 'cadillac', 'lincoln']:
                segment = 'luxury'
            elif any(term in model_lower for term in ['f-150', 'silverado', 'ram', 'tundra', 'tacoma', 'frontier', 'ridgeline']):
                segment = 'truck'
            elif any(term in model_lower for term in ['suburban', 'tahoe', 'pilot', 'highlander', 'rav4', 'cr-v', 'explorer', 'escape', 'equinox']):
                segment = 'suv'
            elif any(term in model_lower for term in ['corvette', 'mustang', 'camaro', 'challenger', '911', 'boxster', 'cayman']):
                segment = 'sports'
            elif any(term in model_lower for term in ['civic', 'corolla', 'elantra', 'sentra', 'forte']):
                segment = 'compact'
            elif any(term in model_lower for term in ['spark', 'mirage', 'rio', 'versa']):
                segment = 'economy'
            else:
                segment = 'sedan'
            
            # Get realistic base depreciation
            curve = realistic_curves[segment]
            base_depreciation = curve.get(vehicle_age, curve.get(15, 0.72))
            
            # STEP 2: MILEAGE ADJUSTMENT (12k miles/year baseline for older vehicles)
            expected_mileage = vehicle_age * 12000
            mileage_difference = current_mileage - expected_mileage
            
            # Improved mileage adjustment logic
            mileage_adjustment = 0.0
            
            if abs(mileage_difference) <= 10000:
                # Normal mileage range (+/- 10k from expected)
                mileage_adjustment = mileage_difference / 200000  # Very gradual adjustment
                
            elif mileage_difference > 10000:
                # Higher than expected mileage - penalty
                excess_miles = mileage_difference - 10000
                mileage_adjustment = 0.08 + (excess_miles / 300000)  # Reduced penalty
                mileage_adjustment = min(mileage_adjustment, 0.20)  # Cap at 20% additional
                
            else:
                # Lower than expected mileage - bonus
                missing_miles = abs(mileage_difference) - 10000
                mileage_adjustment = -0.04 - (missing_miles / 400000)  # Reduced bonus
                mileage_adjustment = max(mileage_adjustment, -0.12)  # Cap at 12% reduction
            
            # STEP 3: RESEARCH-VALIDATED BRAND ADJUSTMENT
            brand_multipliers = {
                # Best Value Retention (0.75-0.90) - Market Research Validated
                'Toyota': 0.78, 'Lexus': 0.75, 'Honda': 0.82, 'Subaru': 0.85, 
                'Mazda': 0.88, 'Porsche': 0.80,
                
                # Good Value Retention (0.90-0.98)
                'Hyundai': 0.92, 'Kia': 0.94, 'Jeep': 0.90, 'Ram': 0.95, 'Acura': 0.95,
                
                # Average Retention (0.98-1.05)
                'Ford': 1.00, 'Chevrolet': 1.02, 'Nissan': 1.05, 'GMC': 1.00, 'Volkswagen': 1.08,
                
                # Poor Retention - Luxury (1.05-1.20) - Research Shows High Depreciation
                'BMW': 1.15, 'Mercedes-Benz': 1.12, 'Audi': 1.08, 'Cadillac': 1.15,
                'Lincoln': 1.18, 'Infiniti': 1.12,
                
                # Poorest Retention (1.15-1.30) - Market Data Validated
                'Tesla': 1.20, 'Jaguar': 1.25, 'Land Rover': 1.22, 'Chrysler': 1.28,
                'Dodge': 1.25, 'Fiat': 1.30
            }
            
            brand_multiplier = brand_multipliers.get(make, 1.00)
            
            # Step 4: Combine age + mileage + brand
            adjusted_depreciation = base_depreciation + mileage_adjustment
            final_depreciation = adjusted_depreciation * brand_multiplier
            
            # Step 5: Apply realistic caps and floors by segment - FIXED: Age-appropriate bounds
            if vehicle_age <= 3:
                # Young vehicles (1-3 years) - use conservative caps, minimal floors
                realistic_caps = {
                    'luxury': 0.42,     # Max 42% depreciation for young luxury
                    'truck': 0.28,      # Max 28% for young trucks
                    'suv': 0.35,        # Max 35% for young SUVs
                    'sports': 0.38,     # Max 38% for young sports cars
                    'compact': 0.35,    # Max 35% for young compacts
                    'sedan': 0.38,      # Max 38% for young sedans
                    'economy': 0.42     # Max 42% for young economy cars
                }
                realistic_floors = {
                    'luxury': 0.08,     # Min 8% depreciation (realistic for 1-year)
                    'truck': 0.05,      # Min 5% for trucks
                    'suv': 0.06,        # Min 6% for SUVs
                    'sports': 0.08,     # Min 8% for sports cars
                    'compact': 0.06,    # Min 6% for compacts
                    'sedan': 0.08,      # Min 8% for sedans
                    'economy': 0.10     # Min 10% for economy cars
                }
            elif vehicle_age <= 7:
                # Mid-age vehicles (4-7 years) - moderate caps and floors
                realistic_caps = {
                    'luxury': 0.65,     # Max 65% depreciation for mid-age luxury
                    'truck': 0.50,      # Max 50% for mid-age trucks
                    'suv': 0.55,        # Max 55% for mid-age SUVs
                    'sports': 0.60,     # Max 60% for mid-age sports cars
                    'compact': 0.55,    # Max 55% for mid-age compacts
                    'sedan': 0.60,      # Max 60% for mid-age sedans
                    'economy': 0.65     # Max 65% for mid-age economy cars
                }
                realistic_floors = {
                    'luxury': 0.30,     # Min 30% depreciation for mid-age luxury
                    'truck': 0.20,      # Min 20% for trucks
                    'suv': 0.25,        # Min 25% for SUVs
                    'sports': 0.28,     # Min 28% for sports cars
                    'compact': 0.25,    # Min 25% for compacts
                    'sedan': 0.28,      # Min 28% for sedans
                    'economy': 0.32     # Min 32% for economy cars
                }
            else:
                # Older vehicles (8+ years) - high caps for very depreciated vehicles
                realistic_caps = {
                    'luxury': 0.80,     # Max 80% depreciation for old luxury
                    'truck': 0.65,      # Max 65% for old trucks (hold value well)
                    'suv': 0.70,        # Max 70% for old SUVs
                    'sports': 0.75,     # Max 75% for old sports cars
                    'compact': 0.72,    # Max 72% for old compacts
                    'sedan': 0.75,      # Max 75% for old sedans
                    'economy': 0.82     # Max 82% for old economy cars
                }
                realistic_floors = {
                    'luxury': 0.45,     # Min 45% depreciation for old luxury
                    'truck': 0.35,      # Min 35% for trucks (strong demand)
                    'suv': 0.40,        # Min 40% for SUVs
                    'sports': 0.42,     # Min 42% for sports cars
                    'compact': 0.40,    # Min 40% for compacts
                    'sedan': 0.42,      # Min 42% for sedans
                    'economy': 0.50     # Min 50% for economy cars
                }
            
            cap = realistic_caps.get(segment, 0.70)
            floor = realistic_floors.get(segment, 0.35)
            
            # Apply caps but be more generous for low-mileage vehicles
            if current_mileage <= 25000:
                # Low-moderate mileage vehicles get reduced caps
                cap = cap * 0.90  # 10% reduction in cap for low mileage
            
            final_depreciation = max(floor, min(final_depreciation, cap))
            
            estimated_value = trim_msrp * (1 - final_depreciation)
            
            return round(estimated_value, 0)
        
    except (ImportError, Exception):
        return None

# Fix for display_vehicle_selection_form() in input_forms.py
# Add unique keys and reset logic to cascade changes

def detect_electric_vehicle(make: str, model: str) -> bool:
    """Detect if make/model is an electric vehicle - FIXED for Audi"""
    model_lower = model.lower()
    make_lower = make.lower()
    
    # Tesla is always electric
    if make_lower == 'tesla':
        return True
    
    # Comprehensive EV model detection - EXACT matches to avoid false positives
    ev_models = [
        # Nissan
        'leaf', 'ariya',
        # Tesla
        'model 3', 'model s', 'model x', 'model y', 'cybertruck',
        # Chevrolet/GM
        'bolt ev', 'bolt euv', 'equinox ev', 'blazer ev', 'silverado ev',
        # Hyundai/Kia
        'ioniq electric', 'ioniq 5', 'ioniq 6', 'kona electric', 
        'niro ev', 'soul ev', 'ev6', 'ev9',
        # BMW - ONLY electric i-series
        'i3', 'i4', 'i5', 'i7', 'ix', 'ix1', 'ix3', 'ixm60',
        # Audi - ONLY e-tron models (NOT regular A4, A6, etc.)
        'e-tron gt', 'q4 e-tron', 'q5 e-tron', 'q6 e-tron', 'q8 e-tron',
        # Porsche
        'taycan',
        # Volkswagen
        'id.3', 'id.4', 'id.5', 'id.7', 'id.buzz',
        # Ford
        'mustang mach-e', 'mach-e', 'f-150 lightning', ' lightning ', 'e-transit',
        # Mercedes
        'eqb', 'eqc', 'eqe', 'eqs', 'eqv',
        # Volvo
        'c40 recharge', 'xc40 recharge',
        # Other
        'polestar', 'lucid air', 'rivian', 'i-pace', 'mini electric', 'cooper se',
        'lyriq', 'hummer ev', 'prologue', 'zdx', 'bz4x', 'solterra', 'mx-30'
    ]
    
    # Check for exact EV model matches
    for ev_model in ev_models:
        if ev_model in model_lower:
            # SPECIAL CHECK: For 'e-tron', make sure it's actually an e-tron model
            if ev_model == 'e-tron' or 'e-tron' in ev_model:
                # Only mark as electric if model contains 'e-tron' with space/hyphen
                # This prevents matching 'electron' or random 'e' + 'tron' patterns
                if 'e-tron' in model_lower or 'etron' in model_lower:
                    return True
            else:
                return True
    
    # Check for generic EV keywords - but be specific
    # Only match if these appear as distinct words, not as part of other words
    if ' ev ' in f' {model_lower} ':  # Surrounded by spaces
        return True
    if model_lower.endswith(' ev'):  # Ends with EV
        return True
    if model_lower.startswith('ev '):  # Starts with EV  
        return True
    
    # BEV (Battery Electric Vehicle) indicator
    if ' bev' in model_lower or model_lower.endswith('bev'):
        return True
    
    return False


def display_vehicle_selection_form(display_mode: str = "collect") -> Dict[str, Any]:
    """
    Display vehicle selection form with transaction type selection
    Supports both Purchase and Lease transactions
    FIXED: Now properly resets dependent fields when parent selections change
    """

    st.subheader("🚗 Vehicle Selection")

    # Transaction type selection
    transaction_type = st.radio(
        "Transaction Type:",
        ["Purchase", "Lease"],
        horizontal=True,
        help="Select whether you're buying or leasing the vehicle",
        key="transaction_type_radio"
    )

    # Reset year and trim selection if transaction type changed (lease has year restrictions)
    if 'previous_transaction_type' not in st.session_state:
        st.session_state.previous_transaction_type = transaction_type

    if st.session_state.previous_transaction_type != transaction_type:
        st.session_state.previous_transaction_type = transaction_type
        # Reset year and trim when switching between purchase and lease
        for key in ['vehicle_year_select', 'vehicle_trim_select']:
            if key in st.session_state:
                del st.session_state[key]
        st.rerun()

    st.markdown("---")

    # Progress indicator
    selected_make = st.session_state.get('vehicle_make_select', '')
    selected_model = st.session_state.get('vehicle_model_select', '')
    selected_year = st.session_state.get('vehicle_year_select', '')
    selected_trim = st.session_state.get('vehicle_trim_select', '')

    # Calculate progress
    steps_completed = 0
    if selected_make: steps_completed += 1
    if selected_model: steps_completed += 1
    if selected_year: steps_completed += 1
    if selected_trim: steps_completed += 1

    # Show progress bar
    st.progress(steps_completed / 4, text=f"Vehicle Selection Progress: {steps_completed}/4 steps completed")
    st.caption("👉 **Please follow the steps in order: Make → Model → Year → Trim**")

    st.markdown("---")

    col1, col2 = st.columns(2)

    with col1:
        # Step 1: Make selection
        st.markdown("### 📍 Step 1: Select Make")
        available_makes = get_all_manufacturers()
        selected_make = st.selectbox(
            "Vehicle Manufacturer:",
            [''] + sorted(available_makes),
            help="Choose the vehicle brand/manufacturer",
            key="vehicle_make_select",
            label_visibility="visible"
        )

        if not selected_make:
            st.info("👆 Start here: Select a vehicle manufacturer")

        # CRITICAL: Reset downstream selections if make changed
        if 'previous_make' not in st.session_state:
            st.session_state.previous_make = selected_make

        if st.session_state.previous_make != selected_make:
            # Make changed - reset all dependent fields
            st.session_state.previous_make = selected_make
            # Clear cached selections AND financial data
            for key in ['vehicle_model_select', 'vehicle_year_select', 'vehicle_trim_select',
                       'vehicle_purchase_price', 'purchase_price_input', 'purchase_price_progressive']:
                if key in st.session_state:
                    del st.session_state[key]
            st.rerun()

        # Step 2: Model selection (dependent on make)
        st.markdown("### 📍 Step 2: Select Model")
        if selected_make:
            available_models = get_models_for_manufacturer(selected_make)
            selected_model = st.selectbox(
                "Vehicle Model:",
                [''] + sorted(available_models),
                help="Choose the specific model",
                key="vehicle_model_select"
            )

            if not selected_model:
                st.info("👆 Next: Select a model from this manufacturer")

            # CRITICAL: Reset year and trim selection if model changed
            if 'previous_model' not in st.session_state:
                st.session_state.previous_model = selected_model

            if st.session_state.previous_model != selected_model:
                # Model changed - reset year and trim AND financial data
                st.session_state.previous_model = selected_model
                for key in ['vehicle_year_select', 'vehicle_trim_select',
                           'vehicle_purchase_price', 'purchase_price_input', 'purchase_price_progressive']:
                    if key in st.session_state:
                        del st.session_state[key]
                st.rerun()
        else:
            st.selectbox(
                "Vehicle Model:",
                [''],
                help="Select a make first",
                key="vehicle_model_select_disabled",
                disabled=True
            )
            st.warning("⚠️ Please select a make first")

    with col2:
        # Step 3: Year selection (dependent on make and model)
        st.markdown("### 📍 Step 3: Select Year")
        if selected_make and selected_model:
            # Get actual production years for this specific model
            available_years = get_available_years_for_model(selected_make, selected_model)
            if available_years:
                # Sort in descending order (newest first)
                year_options = sorted(available_years, reverse=True)

                # Filter years for lease - only new cars (current year or prior year if current not available)
                if transaction_type == "Lease":
                    current_year = datetime.now().year

                    # Filter to only current year or prior year
                    lease_eligible_years = [y for y in year_options if y >= current_year - 1]

                    if lease_eligible_years:
                        year_options = lease_eligible_years
                        help_text = f"Lease available for: {min(lease_eligible_years)}-{max(lease_eligible_years)} (new cars only)"
                    else:
                        # No eligible years for lease
                        year_options = []
                        help_text = "No new model years available for lease"
                else:
                    help_text = f"Production years: {min(available_years)}-{max(available_years)}"

                selected_year = st.selectbox(
                    "Model Year:",
                    [''] + year_options,
                    help=help_text,
                    key="vehicle_year_select"
                )

                if not selected_year:
                    if transaction_type == "Lease" and year_options:
                        st.info(f"👆 Available for lease: {min(year_options)}-{max(year_options)} (new cars only)")
                    elif transaction_type == "Lease" and not year_options:
                        st.warning("⚠️ No new model years available for lease. Consider purchasing.")
                    else:
                        st.info(f"👆 Available: {min(available_years)}-{max(available_years)}")
            else:
                selected_year = st.selectbox(
                    "Model Year:",
                    [''],
                    help="No years available for this model",
                    key="vehicle_year_select_empty"
                )
                selected_year = ""
                st.error("❌ No production years available")

            # CRITICAL: Reset trim selection if year changed
            if 'previous_year' not in st.session_state:
                st.session_state.previous_year = selected_year

            if st.session_state.previous_year != selected_year:
                # Year changed - reset trim AND financial data
                st.session_state.previous_year = selected_year
                for key in ['vehicle_trim_select', 'vehicle_purchase_price', 'purchase_price_input', 'purchase_price_progressive']:
                    if key in st.session_state:
                        del st.session_state[key]
                st.rerun()
        else:
            st.selectbox(
                "Model Year:",
                [''],
                help="Select make and model first",
                key="vehicle_year_select_disabled",
                disabled=True
            )
            st.warning("⚠️ Please select make and model first")

        # Step 4: Trim selection (dependent on model and year)
        st.markdown("### 📍 Step 4: Select Trim")
        if selected_make and selected_model and selected_year:
            trims = get_trims_for_vehicle(selected_make, selected_model, int(selected_year))
            if trims:
                trim_options = [''] + list(trims.keys())
                selected_trim = st.selectbox(
                    "Trim Level:",
                    trim_options,
                    help="Vehicle trim level and features",
                    key="vehicle_trim_select"
                )

                if not selected_trim:
                    st.info("👆 Final step: Select a trim level")

                # CRITICAL: Reset financial data if trim changed
                if 'previous_trim' not in st.session_state:
                    st.session_state.previous_trim = selected_trim

                if st.session_state.previous_trim != selected_trim:
                    # Trim changed - reset financial data
                    st.session_state.previous_trim = selected_trim
                    for key in ['vehicle_purchase_price', 'purchase_price_input', 'purchase_price_progressive']:
                        if key in st.session_state:
                            del st.session_state[key]
                    st.rerun()

                # Get MSRP for selected trim
                if selected_trim:
                    trim_msrp = trims.get(selected_trim, 30000)
                else:
                    trim_msrp = 0
            else:
                st.selectbox(
                    "Trim Level:",
                    [''],
                    help="No trims available",
                    key="vehicle_trim_select_empty",
                    disabled=True
                )
                selected_trim = ""
                trim_msrp = 0
                st.error("❌ No trims available for this model/year")
        else:
            st.selectbox(
                "Trim Level:",
                [''],
                help="Select make, model, and year first",
                key="vehicle_trim_select_disabled",
                disabled=True
            )
            selected_trim = ""
            trim_msrp = 0
            st.warning("⚠️ Please complete steps 1-3 first")
    
# Vehicle condition and pricing section
    if selected_make and selected_model and selected_year and selected_trim:
        st.markdown("---")
        st.success(f"✅ Vehicle Selected: {selected_year} {selected_make} {selected_model} {selected_trim}")
        st.markdown("---")
        st.subheader("💰 Pricing & Condition")
        
        col1, col2 = st.columns(2)
        
        with col1:
            # AUTO-ESTIMATE MILEAGE based on vehicle age and transaction type
            current_year_val = datetime.now().year
            vehicle_age = current_year_val - int(selected_year)

            # Calculate estimated mileage differently for lease vs purchase
            # For LEASE: New or last year's model should have minimal mileage (demo miles)
            # For PURCHASE: Use 12,000 miles/year standard for used vehicles
            if transaction_type == "Lease":
                # For lease vehicles, especially new or last year's model
                if vehicle_age == 0:
                    estimated_mileage = 0  # Brand new
                elif vehicle_age == 1:
                    estimated_mileage = 500  # Demo/test drive miles only
                else:
                    # Older lease returns might have more miles
                    estimated_mileage = vehicle_age * 12000
            else:  # Purchase
                # For purchase, use standard 12,000 miles/year estimation
                if vehicle_age == 0:
                    estimated_mileage = 0
                else:
                    estimated_mileage = vehicle_age * 12000

            # Current mileage input with auto-estimated default
            mileage_help_text = (
                "For lease: Enter actual odometer reading (typically low for new/demo vehicles). "
                if transaction_type == "Lease"
                else "Auto-estimated at 12,000 miles/year. Adjust to actual odometer reading."
            )

            current_mileage = st.number_input(
                "Current Mileage:",
                min_value=0,
                max_value=300000,
                value=estimated_mileage,
                step=1000,
                help=mileage_help_text,
                key="current_mileage_input"
            )

            # Show estimation note for used vehicles (skip for new lease vehicles)
            if vehicle_age > 0 and not (transaction_type == "Lease" and vehicle_age <= 1):
                avg_annual = current_mileage / vehicle_age if vehicle_age > 0 else 0
                if avg_annual < 10000:
                    mileage_note = " Below average mileage"
                elif avg_annual < 15000:
                    mileage_note = " Average mileage"
                else:
                    mileage_note = " Above average mileage"
                st.caption(f"{mileage_note} ({avg_annual:,.0f} miles/year)")
        
        with col2:
            # Auto-calculate used vehicle value
            is_used = (int(selected_year) < current_year_val) or (int(selected_year) == current_year_val and current_mileage > 1000)
            
            default_price =int(trim_msrp)
            estimated_price = None
            
            if is_used and trim_msrp > 0:
                try:
                    from used_vehicle_estimator import UsedVehicleEstimator
                    estimator = UsedVehicleEstimator()
                    
                    estimated_value = estimator.estimate_current_value(
                        selected_make, 
                        selected_model, 
                        int(selected_year), 
                        selected_trim, 
                        current_mileage
                    )
                    
                    if estimated_value:
                        default_price = int(estimated_value)
                        estimated_price = estimated_value
                except Exception:
                    estimated_price = None
        
        # Purchase price input
        if transaction_type == "Purchase":
            purchase_price = st.number_input(
                "Purchase Price ($):",
                min_value=0,
                max_value=500000,
                value=int(default_price),
                step=1000,
                help="Final purchase price...",
                key="purchase_price_input"
            )


            # Show estimation info for used vehicles
            if estimated_price and is_used:
                depreciation_pct = ((trim_msrp - estimated_price) / trim_msrp * 100) if trim_msrp > 0 else 0
                
                st.info(f"""
                  **Used Vehicle Pricing**
                
                - **Original MSRP ({selected_year})**: ${trim_msrp:,}
                - **Estimated Current Value**: ${estimated_price:,.0f}
                - **Depreciation**: {depreciation_pct:.1f}%
                - **Vehicle Age**: {vehicle_age} years
                - **Current Mileage**: {current_mileage:,} miles
                """)
        
        else:  # Lease
            # Show vehicle MSRP for reference (used in insurance calculations)
            st.info(f"**Vehicle MSRP:** ${trim_msrp:,}\n\n_This MSRP is used for insurance calculations and lease payment estimation._")

            # Calculate realistic lease payment using LeaseTermsCalculator
            try:
                lease_calculator = LeaseTermsCalculator()
                # Use 36-month term for initial calculation
                lease_analysis = lease_calculator.get_complete_lease_analysis(
                    make=selected_make,
                    model=selected_model,
                    trim=selected_trim,
                    msrp=float(trim_msrp),
                    lease_term_months=36,
                    down_payment=0,  # Calculate with 0 down first
                    sales_tax_rate=0.08,  # Average US sales tax
                    credit_tier='good'  # Assume good credit
                )
                calculated_monthly = int(lease_analysis['payment']['monthly_payment_pretax'])
                # Suggested down payment: ~10% of MSRP or $2000, whichever is less
                suggested_down = min(int(trim_msrp * 0.10), 2000)
            except Exception:
                # Fallback to reasonable defaults if calculation fails
                calculated_monthly = 399
                suggested_down = 2000

            monthly_payment = st.number_input(
                "Monthly Lease Payment ($):",
                min_value=100,
                max_value=3000,
                value=calculated_monthly,
                step=50,
                help=f"Estimated monthly lease payment based on vehicle MSRP. Adjust to match your actual lease offer.",
                key="lease_payment_input"
            )

            down_payment = st.number_input(
                "Down Payment ($):",
                min_value=0,
                max_value=20000,
                value=suggested_down,
                step=500,
                help="Initial down payment for lease (typically 0-10% of MSRP)",
                key="lease_down_payment_input"
            )

            lease_term = st.number_input(
                "Lease Term (months):",
                min_value=12,
                max_value=60,
                value=36,
                step=12,
                help="Length of lease agreement (analysis will be based on this term)",
                key="lease_term_input"
            )

            # Show calculated lease summary
            total_payments = monthly_payment * lease_term
            total_lease_cost = total_payments + down_payment
            st.caption(f"📊 **Lease Summary:** {lease_term} months × ${monthly_payment:,.0f}/month + ${down_payment:,.0f} down = **${total_lease_cost:,.0f} total payments**")
    else:
        # No complete selection yet
        current_mileage = 0
        estimated_price = None
        purchase_price = None
        monthly_payment = None
        down_payment = None
        lease_term = None
    
    # Validate vehicle selection
    is_valid = all([
        selected_make, selected_model, selected_year, selected_trim,
        transaction_type
    ])
    
    if transaction_type == "Purchase":
        is_valid = is_valid and (purchase_price is not None and purchase_price > 0)
    else:
        is_valid = is_valid and (monthly_payment is not None and lease_term is not None)
    
    # Return the complete vehicle data
    result = {
        'transaction_type': transaction_type,
        'make': selected_make,
        'model': selected_model,
        'year': int(selected_year) if selected_year else None,
        'trim': selected_trim,
        'trim_msrp': trim_msrp if 'trim_msrp' in locals() else 0,
        'current_mileage': current_mileage if 'current_mileage' in locals() else 0,
        'is_used': is_used if 'is_used' in locals() else False,
        'is_valid': is_valid
    }
    
    # Add transaction-specific fields
    if transaction_type == "Purchase":
        result['purchase_price'] = purchase_price if purchase_price is not None else (trim_msrp if 'trim_msrp' in locals() else 0)
        result['estimated_price'] = estimated_price if estimated_price is not None else 0
    else:
        result.update({
            'monthly_payment': monthly_payment if monthly_payment is not None else 300,
            'down_payment': down_payment if down_payment is not None else 2000,
            'lease_term': lease_term if lease_term is not None else 36
        })
    
    return result
    
def display_location_form(vehicle_data: Dict[str, Any] = None) -> Dict[str, Any]:
    """
    Display location form with persistence and conditional electricity rate
    NOW WITH AUTOMATIC PREMIUM FUEL DETECTION
    
    Args:
        vehicle_data: Optional vehicle data to determine if EV and fuel type requirements
    """
    
    st.subheader("Location & Regional Settings")
    
    # Initialize persistent settings
    initialize_persistent_settings()
    location_settings = get_persistent_setting('location')
    
    # Determine if vehicle is electric AND extract vehicle details for fuel detection
    is_electric_vehicle = False
    make = ''
    model = ''
    year = None
    trim = ''
    
    if vehicle_data:
        from vehicle_helpers import detect_electric_vehicle
        make = vehicle_data.get('make', '')
        model = vehicle_data.get('model', '')
        year = vehicle_data.get('year', None)
        trim = vehicle_data.get('trim', '')
        is_electric_vehicle = detect_electric_vehicle(make, model) if make and model else False
    
    force_all_visible = st.session_state.get('force_all_visible', False)

    # Show persistence status
    if location_settings.get('is_set', False) and not force_all_visible:
        st.success(f"Using saved location: {location_settings.get('zip_code', '')} - {location_settings.get('state', '')}")
        
        # Option to modify
        if st.button("Update Location Settings", key="update_location"):
            st.session_state.show_location_form = True
        else:
            st.session_state.show_location_form = False
    else:
        st.session_state.show_location_form = True
    
    if st.session_state.get('show_location_form', True) or force_all_visible:
        # Initialize reactive state for callbacks
        initialize_reactive_state()
        
        col1, col2 = st.columns(2)
        
        with col1:
            # ZIP code input with auto-population and reactive callback
            zip_code = st.text_input(
                "ZIP Code:",
                value=location_settings.get('zip_code', ''),
                max_chars=5,
                help="Enter 5-digit ZIP code for automatic location detection",
                key="zip_code_input_reactive",
                on_change=on_zip_code_change
            )
            
            # Initialize variables before ZIP code check
            auto_state = ''
            auto_geography = 'Suburban'
            auto_fuel_price = 3.50
            auto_electricity_rate = None
            
            # Check reactive session state first, then do lookup
            if st.session_state.get('zip_code_valid', False):
                auto_state = st.session_state.get('auto_detected_state', '')
                auto_geography = st.session_state.get('auto_detected_geography', 'Suburban')
                auto_fuel_price = st.session_state.get('auto_detected_fuel_price', 3.50)
                auto_electricity_rate = st.session_state.get('auto_detected_electricity_rate', None)
                if auto_state:
                    # Show informational message if available
                    if st.session_state.get('zip_lookup_message'):
                        st.info(f"Auto-detected: {auto_state} - {auto_geography} ({st.session_state['zip_lookup_message']})")
                    else:
                        st.success(f"Auto-detected: {auto_state} - {auto_geography}")
            elif zip_code and len(zip_code) == 5:
                # Use comprehensive lookup with fallback
                zip_data = validate_and_lookup_location(zip_code)
                if zip_data and zip_data.get('is_valid', False):
                    auto_state = zip_data.get('state', '')
                    auto_geography = zip_data.get('geography_type', 'Suburban')
                    auto_fuel_price = zip_data.get('fuel_price', 3.50)
                    auto_electricity_rate = zip_data.get('electricity_rate', None)
                    # Show informational message if using state-level data
                    if zip_data.get('error_message'):
                        st.info(f"Auto-detected: {auto_state} - {auto_geography} ({zip_data['error_message']})")
                    else:
                        st.success(f"Auto-detected: {auto_state} - {auto_geography}")
                else:
                    auto_state = ''
                    auto_geography = 'Suburban'
                    auto_fuel_price = 3.50
                    auto_electricity_rate = None
                    st.warning(f"ZIP code not recognized: {zip_data.get('error_message', 'Invalid ZIP code')}")
            else:
                auto_state = ''
                auto_geography = 'Suburban'
                auto_fuel_price = 3.50
                auto_electricity_rate = None
                st.error("Invalid ZIP code format")

        # State selection
        state_options = [
            'AL', 'AK', 'AZ', 'AR', 'CA', 'CO', 'CT', 'DE', 'FL', 'GA',
            'HI', 'ID', 'IL', 'IN', 'IA', 'KS', 'KY', 'LA', 'ME', 'MD',
            'MA', 'MI', 'MN', 'MS', 'MO', 'MT', 'NE', 'NV', 'NH', 'NJ',
            'NM', 'NY', 'NC', 'ND', 'OH', 'OK', 'OR', 'PA', 'RI', 'SC',
            'SD', 'TN', 'TX', 'UT', 'VT', 'VA', 'WA', 'WV', 'WI', 'WY'
        ]

        # Use auto-detected state or saved state – set default via session
        # state only on first render to avoid the Streamlit
        # "default value vs Session State API" warning.
        current_state = auto_state if auto_state else location_settings.get('state', '')
        if 'state_select_reactive' not in st.session_state:
            st.session_state['state_select_reactive'] = current_state if current_state in state_options else ''

            selected_state = st.selectbox(
                "State:",
                [''] + state_options,
                help="State for insurance and tax calculations",
                key="state_select_reactive",
                on_change=on_state_change
            )
        
        with col2:
            # Geography type
            geography_options = ['Urban', 'Suburban', 'Rural']
            current_geography = auto_geography if auto_geography else location_settings.get('geography_type', 'Suburban')
            
            if current_geography in geography_options:
                geography_index = geography_options.index(current_geography)
            else:
                geography_index = 1
            
            geography_type = st.selectbox(
                "Geography Type:",
                geography_options,
                index=geography_index,
                help="Affects maintenance costs and driving patterns",
                key="geography_select"
            )
        
        # ===================================================================
        # ENHANCED FUEL PRICING WITH AUTOMATIC PREMIUM DETECTION
        # ===================================================================
        from calculator_display import get_electricity_rate_from_location
        from vehicle_helpers import determine_fuel_type_and_price
        
        current_fuel_price = auto_fuel_price if auto_fuel_price else location_settings.get('fuel_price', 3.50)
        
        # Check if state changed via callback and use updated fuel price
        if st.session_state.get('location_needs_update', False):
            state_fuel = st.session_state.get('state_fuel_price', None)
            state_electricity = st.session_state.get('state_electricity_rate', None)
            if state_fuel:
                current_fuel_price = state_fuel
                st.session_state['fuel_price_input'] = float(current_fuel_price)
            if state_electricity is not None:
                st.session_state['electricity_rate_input'] = float(state_electricity)
            st.session_state['location_needs_update'] = False
        
        # PRIORITIZE auto-detected electricity rate from ZIP code lookup
        if auto_electricity_rate is not None:
            current_electricity_rate = auto_electricity_rate
        else:
            # Fall back to lookup or saved settings
            current_electricity_rate = get_electricity_rate_from_location(
                zip_code if zip_code and len(zip_code) == 5 else None, 
                selected_state if selected_state else None
            )
            if current_electricity_rate == 0.15:  # If still default, try saved
                current_electricity_rate = location_settings.get('electricity_rate', 0.15)
        
        # Detect if vehicle has changed (to recalculate fuel price)
        current_vehicle_key = f"{make}|{model}|{year}|{trim}"
        previous_vehicle_key = st.session_state.get('previous_vehicle_key_location', '')
        vehicle_changed = (current_vehicle_key != previous_vehicle_key) and previous_vehicle_key != ''

        # Store current vehicle key for next comparison
        st.session_state['previous_vehicle_key_location'] = current_vehicle_key

        # Determine fuel type requirements if vehicle information is available
        fuel_info = None
        if make and model and selected_state and not is_electric_vehicle:
            fuel_info = determine_fuel_type_and_price(
                make=make,
                model=model,
                year=year if year else 2024,
                trim=trim,
                zip_code=zip_code if zip_code and len(zip_code) == 5 else None,
                state=selected_state
            )
        
        # Show appropriate fields based on vehicle type
        if is_electric_vehicle:
            # EV: Show electricity rate prominently, fuel price hidden
            st.markdown("**Electric Vehicle Pricing**")
            electricity_rate = st.number_input(
                "Electricity Rate ($/kWh):",
                min_value=0.05,
                max_value=0.50,
                value=float(current_electricity_rate),
                step=0.01,
                format="%.3f",
                help="Current local electricity rate for electric vehicles",
                key="electricity_rate_input"
            )
            # Store fuel price but don't display
            fuel_price = current_fuel_price
            
        else:
            # Gas/Hybrid: Show fuel price with premium detection
            st.markdown("**Fuel Pricing**")
            
            # Display fuel type detection if available
            if fuel_info:
                requires_premium = fuel_info.get('requires_premium', False)
                detected_fuel_price = fuel_info.get('fuel_price', current_fuel_price)
                fuel_type = fuel_info.get('fuel_type', 'regular')

                # Notify user if vehicle changed and fuel price was recalculated
                if vehicle_changed:
                    if requires_premium:
                        st.info(f"🔄 Vehicle changed to {make} {model} {trim if trim else ''} - Updated to **Premium** fuel (${detected_fuel_price:.2f}/gal)")
                    else:
                        st.info(f"🔄 Vehicle changed to {make} {model} {trim if trim else ''} - Updated to **Regular** fuel (${detected_fuel_price:.2f}/gal)")
                elif requires_premium:
                    st.info(f" **Premium Fuel Required** for {make} {model} {trim if trim else ''}")
                    st.caption(f"Base regular: ${fuel_info.get('regular_price', 3.50):.2f}/gal -> Premium: ${detected_fuel_price:.2f}/gal (+$0.40)")
                else:
                    st.success(f"Regular fuel detected for {make} {model}")

                # Use detected price as default
                default_fuel_price = detected_fuel_price

                # Sync session state so the number_input widget reflects
                # the detected price (Streamlit ignores the value param when
                # the key already exists in session state).
                st.session_state['fuel_price_input'] = float(detected_fuel_price)
            else:
                # No vehicle selected yet, use saved/default price
                default_fuel_price = current_fuel_price

            fuel_price = st.number_input(
                "Local Fuel Price ($/gallon):",
                min_value=2.0,
                max_value=7.0,
                value=float(default_fuel_price),
                step=0.05,
                format="%.2f",
                help="Current local fuel price (auto-adjusted for premium fuel requirements)",
                key="fuel_price_input"
            )
            
            # Store electricity rate in background for future EV calculations
            electricity_rate = current_electricity_rate
        
        # Save button
        if st.button("Save Location Settings", key="save_location"):
            location_data = {
                'zip_code': zip_code,
                'state': selected_state,
                'geography_type': geography_type,
                'fuel_price': fuel_price,
                'electricity_rate': electricity_rate
            }
            save_persistent_setting('location', location_data)
            st.success("Location settings saved!")
            st.session_state.show_location_form = False
            st.rerun()
    else:
        # Use saved settings
        zip_code = location_settings.get('zip_code', '')
        selected_state = location_settings.get('state', '')
        geography_type = location_settings.get('geography_type', 'Suburban')
        fuel_price = location_settings.get('fuel_price', 3.50)
        electricity_rate = location_settings.get('electricity_rate', 0.12)
        
        # STILL CHECK FOR PREMIUM FUEL EVEN WHEN USING SAVED SETTINGS
        if make and model and selected_state and not is_electric_vehicle:
            from vehicle_helpers import determine_fuel_type_and_price
            
            fuel_info = determine_fuel_type_and_price(
                make=make,
                model=model,
                year=year if year else 2024,
                trim=trim,
                zip_code=zip_code if zip_code and len(zip_code) == 5 else None,
                state=selected_state
            )
            
            # Update fuel price if premium is required
            if fuel_info.get('requires_premium', False):
                fuel_price = fuel_info.get('fuel_price', fuel_price)
                st.info(f" Premium fuel detected for {make} {model} - Price adjusted to ${fuel_price:.2f}/gal")
    
    return {
        'zip_code': zip_code,
        'state': selected_state,
        'geography_type': geography_type,
        'fuel_price': fuel_price,
        'electricity_rate': electricity_rate,
        'is_valid': bool(zip_code and len(zip_code) == 5 and selected_state)
    }

def display_personal_info_form() -> Dict[str, Any]:
    """Display personal information form with persistence - COMPLETE with all fields
    Fixed: Now uses current selections immediately, doesn't require saving first
    """
    
    st.subheader("Personal Information")
    
    # Initialize persistent settings
    initialize_persistent_settings()
    personal_settings = get_persistent_setting('personal')
    
    # Initialize session state for form visibility if not exists
    if 'show_personal_form' not in st.session_state:
        st.session_state.show_personal_form = not personal_settings.get('is_set', False)
    
    # Show persistence status
    if personal_settings.get('is_set', False) and not st.session_state.get('force_all_visible', False):
        st.success(f"Using saved personal info: Age {personal_settings.get('user_age', 35)}, Income ${personal_settings.get('gross_income', 60000):,}, Mileage {personal_settings.get('annual_mileage', 12000):,}/yr")
        
        # Toggle buttons
        col1, col2 = st.columns([1, 4])
        with col1:
            if st.session_state.show_personal_form:
                if st.button("Hide Form", key="hide_personal"):
                    st.session_state.show_personal_form = False
                    st.rerun()
            else:
                if st.button("Update", key="show_personal"):
                    st.session_state.show_personal_form = True
                    st.rerun()
    
    # CRITICAL FIX: Always show the form and capture current values
    # Initialize with saved values or defaults
    if st.session_state.get('show_personal_form', True) or st.session_state.get('force_all_visible', False):
        col1, col2 = st.columns(2)
        
        with col1:
            user_age = st.number_input(
                "Age:",
                min_value=16,
                max_value=100,
                value=personal_settings.get('user_age', 35),
                help="Driver's age (affects insurance)"
            )
            
            gross_income = st.number_input(
                "Gross Annual Income:",
                min_value=0,
                max_value=1000000,
                value=personal_settings.get('gross_income', 60000),
                step=5000,
                help="Total annual income before taxes"
            )
            
            credit_scores = ['300-579 (Very Poor)', '580-669 (Fair)', '670-739 (Good)', '740-799 (Very Good)', '800-850 (Exceptional)']
            current_score = personal_settings.get('credit_score_range', '670-739 (Good)')
            score_index = credit_scores.index(current_score) if current_score in credit_scores else 2
            
            credit_score_range = st.selectbox(
                "Credit Score Range:",
                credit_scores,
                index=score_index,
                help="Your credit score affects loan terms"
            )
        
        with col2:
            annual_mileage = st.number_input(
                "Annual Mileage:",
                min_value=1000,
                max_value=50000,
                value=personal_settings.get('annual_mileage', 12000),
                step=1000,
                help="Estimated miles driven per year"
            )
            
            num_household_vehicles = st.number_input(
                "Number of Household Vehicles:",
                min_value=1,
                max_value=10,
                value=personal_settings.get('num_household_vehicles', 1),
                help="Total vehicles in your household"
            )
            
            # Driving style field
            driving_styles = ['Gentle', 'Normal', 'Aggressive']
            current_style = personal_settings.get('driving_style', 'normal').title()
            style_index = driving_styles.index(current_style) if current_style in driving_styles else 1
            
            driving_style = st.selectbox(
                "Driving Style:",
                driving_styles,
                index=style_index,
                help="Affects fuel economy - changes take effect immediately",
                key="driving_style_select"
            )
            
            # Terrain field
            terrains = ['Flat', 'Hilly']
            current_terrain = personal_settings.get('terrain', 'flat').title()
            terrain_index = terrains.index(current_terrain) if current_terrain in terrains else 0
            
            terrain = st.selectbox(
                "Typical Terrain:",
                terrains,
                index=terrain_index,
                help="Affects fuel economy - changes take effect immediately",
                key="terrain_select"
            )
        
        # Save button - now optional, just for persistence
        if st.button("Save Personal Info", key="save_personal"):
            personal_data = {
                'user_age': user_age,
                'gross_income': gross_income,
                'credit_score_range': credit_score_range,
                'annual_mileage': annual_mileage,
                'driving_style': driving_style.lower(),
                'terrain': terrain.lower(),
                'num_household_vehicles': num_household_vehicles
            }
            save_persistent_setting('personal', personal_data)
            st.success("Personal information saved!")
            # DON'T hide form or rerun - let user continue editing
        
        # CRITICAL FIX: ALWAYS return current form values (not saved values)
        return {
            'user_age': user_age,
            'gross_income': gross_income,
            'credit_score_range': credit_score_range,
            'annual_mileage': annual_mileage,
            'driving_style': driving_style.lower(),
            'terrain': terrain.lower(),
            'num_household_vehicles': num_household_vehicles,
            'is_valid': True
        }
    else:
        # Form is hidden - use saved settings
        user_age = personal_settings.get('user_age', 35)
        gross_income = personal_settings.get('gross_income', 60000)
        credit_score_range = personal_settings.get('credit_score_range', '670-739 (Good)')
        annual_mileage = personal_settings.get('annual_mileage', 12000)
        driving_style = personal_settings.get('driving_style', 'normal')
        terrain = personal_settings.get('terrain', 'flat')
        num_household_vehicles = personal_settings.get('num_household_vehicles', 1)
        
        return {
            'user_age': user_age,
            'gross_income': gross_income,
            'credit_score_range': credit_score_range,
            'annual_mileage': annual_mileage,
            'driving_style': driving_style,
            'terrain': terrain,
            'num_household_vehicles': num_household_vehicles,
            'is_valid': True
        }

def display_insurance_form() -> Dict[str, Any]:
    """Display insurance form with persistence"""
    
    st.subheader(" Insurance Preferences")
    
    initialize_persistent_settings()
    insurance_settings = get_persistent_setting('insurance')
    
    if 'show_insurance_form' not in st.session_state:
        st.session_state.show_insurance_form = not insurance_settings.get('is_set', False)
    
    if insurance_settings.get('is_set', False) and not st.session_state.get('force_all_visible', False):
        st.success(f"Using saved insurance: {insurance_settings.get('coverage_type', 'Full Coverage')}")
        
        col1, col2 = st.columns([1, 4])
        with col1:
            if st.session_state.show_insurance_form:
                if st.button(" Hide", key="hide_insurance"):
                    st.session_state.show_insurance_form = False
                    st.rerun()
            else:
                if st.button(" Update", key="show_insurance"):
                    st.session_state.show_insurance_form = True
                    st.rerun()
    
    if st.session_state.get('show_insurance_form', True) or st.session_state.get('force_all_visible', False):
        coverage_options = ['Liability Only', 'Full Coverage', 'Premium Coverage']
        current_coverage = insurance_settings.get('coverage_type', 'Full Coverage')
        coverage_index = coverage_options.index(current_coverage) if current_coverage in coverage_options else 1
        
        coverage_type = st.selectbox(
            "Coverage Type:",
            coverage_options,
            index=coverage_index,
            help="Insurance coverage level"
        )
        
        shop_options = ['Dealership', 'Independent', 'Chain', 'Specialty']
        current_shop = insurance_settings.get('shop_type', 'Independent')
        shop_index = shop_options.index(current_shop) if current_shop in shop_options else 1
        
        shop_type = st.selectbox(
            "Preferred Service Shop:",
            shop_options,
            index=shop_index,
            help="Where you plan to service the vehicle"
        )
        
        if st.button("Save Insurance Settings", key="save_insurance"):
            insurance_data = {
                'coverage_type': coverage_type,
                'shop_type': shop_type
            }
            save_persistent_setting('insurance', insurance_data)
            st.success("Insurance settings saved!")
            st.session_state.show_insurance_form = False
            st.rerun()
    else:
        coverage_type = insurance_settings.get('coverage_type', 'Full Coverage')
        shop_type = insurance_settings.get('shop_type', 'Independent')
    
    return {
        'coverage_type': coverage_type,
        'shop_type': shop_type,
        'is_valid': True
    }


def display_financial_parameters_form(transaction_type: str) -> Dict[str, Any]:
    """Display financial parameters form (this can vary per car)"""
    
    st.subheader(" Financial Parameters")
    
    if transaction_type == "Purchase":
        # Payment method selection
        payment_method = st.radio(
            "Payment Method:",
            options=["Financing (Loan)", "Cash Purchase"],
            help="Choose how you plan to pay for the vehicle",
            key="payment_method_radio"
        )
        
        if payment_method == "Cash Purchase":
            # Cash purchase - simple display
            st.success("Cash purchase selected")
            st.info("No financing needed - you'll pay the full purchase price upfront")
            
            # FIX: Get purchase price from multiple possible sources
            purchase_price = (
                st.session_state.get('purchase_price_input') or  # Direct input key
                st.session_state.get('vehicle_purchase_price') or  # From vehicle_data
                25000  # Fallback default
            )
            
            st.metric("Total Cash Payment", f"${purchase_price:,.0f}")
            
            return {
                'payment_method': 'cash',
                'financing_type': 'cash',
                'financing_option': 'cash',
                'loan_amount': 0,
                'interest_rate': 0.0,
                'loan_term': 0,
                'down_payment': 0,
                'down_payment_type': 'amount',
                'down_payment_percent': 100,
                'annual_mileage': 12000,  # ADD DEFAULT VALUE FOR CASH PURCHASE TOO!
                'is_cash_purchase': True,
                'is_valid': True
            }
        
        else:  # Financing (Loan)
            st.info(" **Loan Financing Selected**")
            
            # FIX: Get purchase price from multiple possible sources
            purchase_price = (
                st.session_state.get('purchase_price_input') or
                st.session_state.get('vehicle_purchase_price') or
                25000
            )
            
            # Display the purchase price being used for calculations
            st.metric("Vehicle Purchase Price", f"${purchase_price:,.0f}",
                     help="From vehicle selection above")
            
            col1, col2 = st.columns(2)
            
            with col1:
                # Down payment method selection
                down_payment_method = st.radio(
                    "Down Payment Method:",
                    options=["Percentage of Purchase Price", "Fixed Dollar Amount"],
                    help="Choose how to specify your down payment",
                    key="down_payment_method_radio"
                )
                
                if down_payment_method == "Percentage of Purchase Price":
                    down_payment_percent = st.slider(
                        "Down Payment (%):",
                        min_value=0,
                        max_value=90,
                        value=20,
                        step=5,
                        help="Percentage of purchase price to pay upfront",
                        key="down_payment_percent_slider"
                    )
                    
                    # Calculate down payment amount
                    down_payment_amount = purchase_price * (down_payment_percent / 100)
                    loan_amount = purchase_price - down_payment_amount
                    
                    # Display calculated values
                    st.metric(
                        "Down Payment Amount", 
                        f"${down_payment_amount:,.0f}",
                        help=f"{down_payment_percent}% of ${purchase_price:,.0f}"
                    )
                    st.metric(
                        "Loan Amount", 
                        f"${loan_amount:,.0f}",
                        help=f"${purchase_price:,.0f} - ${down_payment_amount:,.0f}"
                    )
                    
                    # Store values for return
                    final_down_payment = down_payment_amount
                    final_loan_amount = loan_amount
                    payment_type = 'percent'
                    
                else:  # Fixed Dollar Amount
                    down_payment_amount = st.number_input(
                        "Down Payment ($):",
                        min_value=0,
                        max_value=int(purchase_price * 0.9),
                        value=min(5000, int(purchase_price * 0.2)),
                        step=500,
                        help="Fixed dollar amount to pay upfront",
                        key="down_payment_amount_input"
                    )
                    
                    # Calculate percentage and loan amount
                    down_payment_percent = (down_payment_amount / purchase_price * 100) if purchase_price > 0 else 0
                    loan_amount = purchase_price - down_payment_amount
                    
                    # Display calculated values
                    st.metric(
                        "Down Payment Percentage", 
                        f"{down_payment_percent:.1f}%",
                        help=f"${down_payment_amount:,.0f} of ${purchase_price:,.0f}"
                    )
                    st.metric(
                        "Loan Amount", 
                        f"${loan_amount:,.0f}",
                        help=f"${purchase_price:,.0f} - ${down_payment_amount:,.0f}"
                    )
                    
                    # Store values for return
                    final_down_payment = down_payment_amount
                    final_loan_amount = loan_amount
                    payment_type = 'amount'
                
                # Validation warnings
                if final_down_payment == 0:
                    st.warning("Zero down payment will increase monthly payments and total interest")
                elif down_payment_percent < 10:
                    st.warning("Low down payment may require PMI or higher interest rates")
                elif down_payment_percent > 50:
                    st.info("Large down payment will significantly reduce monthly payments")
            
            with col2:
                # Loan terms
                interest_rate = st.number_input(
                    "Interest Rate (%):",
                    min_value=0.0,
                    max_value=15.0,
                    value=6.5,
                    step=0.1,
                    help="Annual interest rate (APR)",
                    key="interest_rate_input"
                )
                
                loan_term = st.number_input(
                    "Loan Term (years):",
                    min_value=1,
                    max_value=8,
                    value=5,
                    help="Loan duration in years",
                    key="loan_term_input"
                )
                
                
                # Calculate and display monthly payment preview
                if final_loan_amount > 0 and interest_rate > 0:
                    monthly_rate = interest_rate / 100 / 12
                    num_payments = loan_term * 12
                    monthly_payment = final_loan_amount * (monthly_rate * (1 + monthly_rate)**num_payments) / ((1 + monthly_rate)**num_payments - 1)
                    total_payments = monthly_payment * num_payments
                    total_interest = total_payments - final_loan_amount
                    
                    st.markdown("---")
                    st.markdown("**  Loan Summary:**")
                    
                    st.metric("Monthly Payment", f"${monthly_payment:.0f}")
                    st.metric("Total Interest", f"${total_interest:,.0f}")
                    st.metric("Total Payments", f"${total_payments:,.0f}")
                    
                elif final_loan_amount == 0:
                    st.success("No loan needed - this is essentially a cash purchase")
            
            return {
                'payment_method': 'financing',
                'financing_type': 'loan',
                'financing_option': 'financing',
                'purchase_price': purchase_price,  # Include this!
                'loan_amount': final_loan_amount,
                'down_payment': final_down_payment,
                'down_payment_type': payment_type,
                'down_payment_percent': down_payment_percent,
                'interest_rate': interest_rate,
                'loan_term': loan_term,
                'is_cash_purchase': False,
                'is_valid': True
            }
    
    else:  # Lease
        st.info(" **Lease Transaction**")
        
        col1, col2 = st.columns(2)
        
        with col1:
            annual_mileage_limit = st.selectbox(
                "Annual Mileage Limit:",
                [10000, 12000, 15000, 18000],
                index=1,
                help="Contracted annual mileage limit"
            )
            
            excess_mileage_fee = st.number_input(
                "Excess Mileage Fee ($/mile):",
                min_value=0.10,
                max_value=0.50,
                value=0.25,
                step=0.05,
                help="Penalty per mile over limit"
            )
        
        with col2:
            annual_mileage = st.number_input(
                "Expected Annual Mileage:",
                min_value=5000,
                max_value=50000,
                value=12000,
                step=1000,
                help="How many miles you expect to drive per year",
                key="annual_mileage_lease"
            )
            
            wear_tear_protection = st.checkbox(
                "Wear & Tear Protection",
                value=False,
                help="Additional coverage for lease-end condition"
            )
        
        return {
            'annual_mileage_limit': annual_mileage_limit,
            'excess_mileage_fee': excess_mileage_fee,
            'annual_mileage': annual_mileage,  # MAKE SURE THIS IS INCLUDED
            'wear_tear_protection': wear_tear_protection,
            'is_valid': True
        }


def display_analysis_settings_form(transaction_type: str = "Purchase") -> Dict[str, Any]:
    """Display analysis settings form"""
    
    st.subheader("  Analysis Settings")
    
    initialize_persistent_settings()
    analysis_settings = get_persistent_setting('analysis')
    
    col1, col2 = st.columns(2)
    
    with col1:
        if transaction_type == "Purchase":
            analysis_years = st.number_input(
                "Analysis Period (years):",
                min_value=1,
                max_value=15,
                value=analysis_settings.get('default_analysis_years', 5),
                help="How many years to analyze ownership costs",
                key="analysis_years_purchase" 
            )
        else:  # Lease
            analysis_years = st.number_input(
                "Lease Term (years):",
                min_value=1,
                max_value=5,
                value=3,
                help="Lease agreement length",
                key="analysis_years_lease" 
            )
    
    with col2:
        priority_options = ["Cost", "Reliability", "Features", "Fuel Economy"]
        current_priority = analysis_settings.get('comparison_priority', 'cost').title()
        priority_index = priority_options.index(current_priority) if current_priority in priority_options else 0
        
        comparison_priority = st.selectbox(
            "Comparison Priority:",
            priority_options,
            index=priority_index,
            help="Primary factor for vehicle recommendations"
        )
        
        # Save analysis preferences
        if st.button("Save Analysis Preferences", key="save_analysis"):
            analysis_data = {
                'comparison_priority': comparison_priority.lower(),
                'default_analysis_years': analysis_years if transaction_type == "Purchase" else 5
            }
            save_persistent_setting('analysis', analysis_data)
            st.success("Analysis preferences saved!")
    
    return {
        'analysis_years': analysis_years,
        'comparison_priority': comparison_priority.lower(),
        'is_valid': True
    }

def collect_all_form_data() -> Tuple[Dict[str, Any], bool, str]:
    """Collect and validate all form data with persistent settings"""
    
    initialize_persistent_settings()
    
    # Display vehicle selection
    vehicle_data = display_vehicle_selection_form()
    
    if not vehicle_data['is_valid']:
        return {}, False, "Please complete vehicle selection"
    
    # FIX: Store purchase_price in session state for financial form to access
    if vehicle_data.get('purchase_price'):
        st.session_state['vehicle_purchase_price'] = vehicle_data['purchase_price']
    
    st.markdown("---")
    
    # Display location form (passes vehicle_data for premium fuel detection)
    location_data = display_location_form(vehicle_data)

    if not location_data['is_valid']:
        return {}, False, "Please complete location information"

    st.markdown("---")

    # EV Charging Preferences (if electric vehicle detected)
    charging_data = {}
    if vehicle_data.get('is_valid', False):
        from vehicle_helpers import detect_electric_vehicle
        from calculator_display import display_charging_preference_form

        make = vehicle_data.get('make', '')
        model = vehicle_data.get('model', '')

        if detect_electric_vehicle(make, model):
            charging_data = display_charging_preference_form(
                electricity_rate=location_data.get('electricity_rate', 0.12),
                state=location_data.get('state', '')
            )
            location_data.update(charging_data)
            st.markdown("---")

    # Display personal info form
    personal_data = display_personal_info_form()
    
    st.markdown("---")
    
    # Display financial parameters (now has access to purchase_price via session state)
    financial_data = display_financial_parameters_form(vehicle_data['transaction_type'])
    
    st.markdown("---")
    
    # Display insurance form
    insurance_data = display_insurance_form()
    
    st.markdown("---")
    
    # Display analysis settings
    analysis_data = display_analysis_settings_form(vehicle_data['transaction_type'])
    
    # Combine all data
    all_data = {
        **vehicle_data,
        **location_data,
        **personal_data,
        **financial_data,
        **insurance_data,
        **analysis_data
    }
    
    # Validate all required fields
    is_valid = all([
        vehicle_data['is_valid'],
        location_data['is_valid'],
        personal_data['is_valid'],
        insurance_data['is_valid'],
        analysis_data['is_valid']
    ])
    
    validation_message = "All data collected successfully" if is_valid else "Please complete all required fields"
    
    return all_data, is_valid, validation_message

def clear_persistent_settings():
    """Clear all persistent settings (utility function)"""
    if 'persistent_settings' in st.session_state:
        del st.session_state.persistent_settings
    # Reset form display flags
    for key in ['show_location_form', 'show_personal_form', 'show_insurance_form']:
        if key in st.session_state:
            del st.session_state[key]

def display_settings_management_sidebar():
    """Display settings management in sidebar"""
    st.sidebar.markdown("---")
    st.sidebar.subheader(" Persistent Settings")
    
    # Initialize persistent settings
    initialize_persistent_settings()
    settings = get_persistent_setting('location')
    
    # Show status of saved settings
    saved_settings = []
    if get_persistent_setting('location', 'is_set', False):
        saved_settings.append(" Location")
    if get_persistent_setting('personal', 'is_set', False):
        saved_settings.append(" Personal Info")
    if get_persistent_setting('insurance', 'is_set', False):
        saved_settings.append(" Insurance")
    if get_persistent_setting('analysis', 'is_set', False):
        saved_settings.append("  Analysis Prefs")
    
    if saved_settings:
        st.sidebar.success(f"Saved: {', '.join(saved_settings)}")
    else:
        st.sidebar.info("No settings saved yet")
    
    # Settings management buttons
    col1, col2 = st.sidebar.columns(2)
    
    with col1:
        if st.button(" Reset All", key="reset_all_settings", help="Clear all saved settings"):
            clear_persistent_settings()
            st.success("Settings cleared!")
            st.rerun()
    
    with col2:
        # Export settings (future enhancement)
        if st.button(" View All", key="view_all_settings", help="View all saved settings"):
            st.session_state.show_settings_summary = True

def display_settings_summary():
    """Display a summary of all saved settings"""
    if st.session_state.get('show_settings_summary', False):
        with st.expander(" Current Saved Settings", expanded=True):
            initialize_persistent_settings()
            
            # Location settings
            location = get_persistent_setting('location')
            if location.get('is_set', False):
                st.write("** Location & Regional:**")
                st.write(f"- ZIP Code: {location.get('zip_code', 'Not set')}")
                st.write(f"- State: {location.get('state', 'Not set')}")
                st.write(f"- Geography: {location.get('geography_type', 'Not set')}")
                st.write(f"- Fuel Price: ${location.get('fuel_price', 0):.2f}/gallon")
            
            # Personal settings
            personal = get_persistent_setting('personal')
            if personal.get('is_set', False):
                st.write("** Personal Information:**")
                st.write(f"- Age: {personal.get('user_age', 'Not set')}")
                st.write(f"- Income: ${personal.get('gross_income', 0):,}")
                st.write(f"- Annual Mileage: {personal.get('annual_mileage', 'Not set'):,}")
                st.write(f"- Driving Style: {personal.get('driving_style', 'Not set').title()}")
                st.write(f"- Terrain: {personal.get('terrain', 'Not set').title()}")
                st.write(f"- Household Vehicles: {personal.get('num_household_vehicles', 'Not set')}")
            
            # Insurance settings
            insurance = get_persistent_setting('insurance')
            if insurance.get('is_set', False):
                st.write("** Insurance Settings:**")
                st.write(f"- Coverage: {insurance.get('coverage_type', 'Not set').title()}")
                st.write(f"- Shop Type: {insurance.get('shop_type', 'Not set').title()}")
            
            # Analysis settings
            analysis = get_persistent_setting('analysis')
            if analysis.get('is_set', False):
                st.write("**  Analysis Preferences:**")
                st.write(f"- Priority: {analysis.get('comparison_priority', 'Not set').title()}")
                st.write(f"- Default Years: {analysis.get('default_analysis_years', 'Not set')}")
            
            if st.button("Close", key="close_settings_summary"):
                st.session_state.show_settings_summary = False
                st.rerun()

# Utility function to pre-populate form data for comparison
def get_comparison_form_data(vehicle_override: Dict[str, Any] = None) -> Dict[str, Any]:
    """Get form data for comparison with persistent settings pre-populated"""
    
    initialize_persistent_settings()
    
    # Base data from persistent settings
    base_data = {}
    
    # Add location data
    location = get_persistent_setting('location')
    if location.get('is_set', False):
        base_data.update({
            'zip_code': location.get('zip_code', ''),
            'state': location.get('state', ''),
            'geography_type': location.get('geography_type', 'Suburban'),
            'fuel_price': location.get('fuel_price', 3.50),
            'electricity_rate': location.get('electricity_rate', 0.12)
        })
    
    # Add personal data
    personal = get_persistent_setting('personal')
    if personal.get('is_set', False):
        base_data.update({
            'user_age': personal.get('user_age', 35),
            'gross_income': personal.get('gross_income', 60000),
            'annual_mileage': personal.get('annual_mileage', 12000),
            'driving_style': personal.get('driving_style', 'normal'),
            'terrain': personal.get('terrain', 'flat'),
            'num_household_vehicles': personal.get('num_household_vehicles', 2)
        })
    
    # Add insurance data
    insurance = get_persistent_setting('insurance')
    if insurance.get('is_set', False):
        base_data.update({
            'coverage_type': insurance.get('coverage_type', 'standard'),
            'shop_type': insurance.get('shop_type', 'independent')
        })
    
    # Add analysis data
    analysis = get_persistent_setting('analysis')
    if analysis.get('is_set', False):
        base_data.update({
            'comparison_priority': analysis.get('comparison_priority', 'cost'),
            'analysis_years': analysis.get('default_analysis_years', 5)
        })
    
    # Override with vehicle-specific data if provided
    if vehicle_override:
        base_data.update(vehicle_override)
    
    return base_data
# ====================
# ALL-VISIBLE FORMS OPTION
# ====================

def display_all_forms_visible() -> Tuple[Dict[str, Any], bool, str]:
    """
    Alternative form display that shows all sections at once
    Compatible with existing collect_all_form_data() structure
    Returns same format: (all_data, is_valid, validation_message)
    """

    # Force all form sections open in this workflow
    st.session_state.show_location_form = True
    st.session_state.show_personal_form = True
    st.session_state.show_insurance_form = True
    st.session_state.force_all_visible = True

    # Initialize persistent settings
    initialize_persistent_settings()
    
    st.markdown("## Vehicle Analysis Form")
    st.markdown("All sections are visible; complete in any order.")
    st.markdown("---")
    
    # Section 1: Vehicle Selection
    with st.container():
        vehicle_data = display_vehicle_selection_form("visible")
    
    st.markdown("---")
    
    # Section 2: Location (NOW RECEIVES vehicle_data to show/hide electricity rate AND detect fuel type)
    with st.container():
        location_data = display_location_form(vehicle_data)
    
    st.markdown("---")
    
    # Section 2.5: EV Charging Preferences (if electric vehicle detected)
    charging_data = {}
    if vehicle_data.get('is_valid', False):
        from vehicle_helpers import detect_electric_vehicle
        from calculator_display import display_charging_preference_form

        make = vehicle_data.get('make', '')
        model = vehicle_data.get('model', '')

        if detect_electric_vehicle(make, model):
            with st.container():
                electricity_rate = location_data.get('electricity_rate', 0.12)
                state = location_data.get('state', '')
                charging_data = display_charging_preference_form(electricity_rate, state)
                location_data.update(charging_data)
    
    st.markdown("---")
    
    # Section 3: Personal Information
    with st.container():
        personal_data = display_personal_info_form()
    
    st.markdown("---")
    
    # Section 4: Financial Parameters
    with st.container():
        transaction_type = vehicle_data.get('transaction_type', 'Purchase')
        financial_data = display_financial_parameters_form(transaction_type)
    
    st.markdown("---")
    
    # Section 5: Insurance
    with st.container():
        insurance_data = display_insurance_form()
    
    st.markdown("---")
    
    # Section 6: Analysis Settings
    with st.container():
        analysis_data = display_analysis_settings_form(vehicle_data.get('transaction_type', 'Purchase'))
    
    # Combine all data
    all_data = {
        **vehicle_data,
        **location_data,
        **personal_data,
        **financial_data,
        **insurance_data,
        **analysis_data
    }
    
    # Validate all required fields
    is_valid = all([
        vehicle_data.get('is_valid', False),
        location_data.get('is_valid', False),
        personal_data.get('is_valid', False),
        insurance_data.get('is_valid', False),
        analysis_data.get('is_valid', False)
    ])
    
    validation_message = "All data collected successfully" if is_valid else "Please complete all required fields"
    
    return all_data, is_valid, validation_message

def get_default_form_data(vehicle_override: Dict[str, Any] = None) -> Dict[str, Any]:
    """
    Get default form data from persistent settings
    Useful for pre-filling forms or API calls
    """
    
    initialize_persistent_settings()
    
    # Start with base defaults
    base_data = {
        'transaction_type': 'Purchase',
        'make': '',
        'model': '',
        'year': 2024,
        'trim': '',
        'is_used': False,
        'current_mileage': 0,
        'annual_mileage': 12000,
        'user_age': 35,
        'gross_income': 60000,
        'credit_score_range': '670-739 (Good)',
        'driving_style': 'normal',  #  ADDED: Default driving style
        'terrain': 'flat'  #  ADDED: Default terrain
    }
    
    # Add location data if saved
    location = get_persistent_setting('location')
    if location.get('is_set', False):
        base_data.update({
            'zip_code': location.get('zip_code', ''),
            'state': location.get('state', ''),
            'geography_type': location.get('geography_type', 'Suburban'),
            'fuel_price': location.get('fuel_price', 3.50),
            'electricity_rate': location.get('electricity_rate', 0.12)
        })
    
    # Add personal data if saved -  FIXED: Now includes driving_style and terrain
    personal = get_persistent_setting('personal')
    if personal.get('is_set', False):
        base_data.update({
            'user_age': personal.get('user_age', 35),
            'gross_income': personal.get('gross_income', 60000),
            'credit_score_range': personal.get('credit_score_range', '670-739 (Good)'),
            'annual_mileage': personal.get('annual_mileage', 12000),  #  ADDED
            'driving_style': personal.get('driving_style', 'normal'),  #  ADDED
            'terrain': personal.get('terrain', 'flat'),  #  ADDED
            'num_household_vehicles': personal.get('num_household_vehicles', 2)  #  ADDED
        })
    
    # Add insurance data if saved
    insurance = get_persistent_setting('insurance')
    if insurance.get('is_set', False):
        base_data.update({
            'coverage_type': insurance.get('coverage_type', 'Full Coverage'),
            'shop_type': insurance.get('shop_type', 'independent')
        })
    
    # Add analysis data
    analysis = get_persistent_setting('analysis')
    if analysis.get('is_set', False):
        base_data.update({
            'comparison_priority': analysis.get('comparison_priority', 'cost'),
            'analysis_years': analysis.get('default_analysis_years', 5)
        })
    
    # Override with vehicle-specific data if provided
    if vehicle_override:
        base_data.update(vehicle_override)
    
    return base_data


# ====================
# PROGRESSIVE FORMS (SALARY CALCULATOR STYLE)
# ====================

def display_progressive_forms():
    """
    Progressive form display inspired by salary calculator
    Sections are grayed out/disabled until prerequisites are completed
    Returns same format: (all_data, is_valid, validation_message)
    """

    initialize_persistent_settings()
    initialize_reactive_state()

    # =========================================================================
    # STEP 1: VEHICLE SELECTION
    # =========================================================================
    st.subheader("Step 1: Select your vehicle")
    st.markdown("**Select the vehicle** you want to analyze")

    vehicle_valid = False
    vehicle_data = {
        'make': '',
        'model': '',
        'year': 2025,
        'trim': '',
        'trim_msrp': 0,
        'transaction_type': 'Purchase',
        'is_used': False,
        'current_mileage': 0,
        'is_valid': False
    }

    # Transaction type
    transaction_type = st.radio(
        "Transaction Type:",
        ["Purchase", "Lease"],
        horizontal=True,
        key="transaction_type_progressive"
    )
    vehicle_data['transaction_type'] = transaction_type

    col1, col2 = st.columns(2)

    with col1:
        # Make selection
        manufacturers = get_all_manufacturers()
        make = st.selectbox(
            "Make",
            [''] + sorted(manufacturers),
            key="make_progressive"
        )

        # Model selection
        if make:
            models = get_models_for_manufacturer(make)
            model = st.selectbox(
                "Model",
                [''] + sorted(models),
                key="model_progressive"
            )
        else:
            st.selectbox("Model", ["-- Select Make first --"], disabled=True, key="model_progressive_disabled")
            model = ''

    with col2:
        # Year selection (depends on make and model)
        if make and model:
            if transaction_type == "Lease":
                year = 2025
                st.selectbox("Year", [2025], key="year_progressive_lease", disabled=True)
                st.caption("Leases are only available for 2025 model year")
            else:
                # Get years for the specific make/model, limited to last 10 years
                from datetime import datetime
                current_year = datetime.now().year
                ten_years_ago = current_year - 10

                years = get_available_years_for_model(make, model)
                if not years:
                    years = list(range(ten_years_ago, current_year + 2))  # Default to last 10 years + next year
                else:
                    # Filter to only last 10 years
                    years = [y for y in years if y >= ten_years_ago and y <= current_year + 1]

                # Add empty option at beginning (no default)
                year = st.selectbox("Year", [''] + sorted(years, reverse=True), key="year_progressive")
        else:
            st.selectbox("Year", ["-- Select Make and Model first --"], disabled=True, key="year_progressive_disabled")
            year = ''

        # Trim selection (depends on make, model, and year)
        if make and model and year:
            trims = get_trims_for_vehicle(make, model, year)
            if trims:
                trim = st.selectbox("Trim", list(trims.keys()), key="trim_progressive")
                trim_msrp = trims.get(trim, 0)
            else:
                trim = st.selectbox("Trim", ["Base"], key="trim_progressive_default")
                trim_msrp = 30000
        else:
            st.selectbox("Trim", ["-- Select Make, Model, and Year first --"], disabled=True, key="trim_progressive_disabled")
            trim = ''
            trim_msrp = 0

    # If vehicle fully selected, show mileage input and pricing
    if make and model and trim_msrp > 0:
        st.markdown("---")
        st.markdown("**Vehicle Details**")

        # Determine if vehicle is used
        from datetime import datetime
        current_year = datetime.now().year
        is_used = (year and int(year) < current_year)
        vehicle_age = (current_year - int(year)) if year else 0

        # Estimate default mileage
        if transaction_type == "Lease":
            if vehicle_age == 0:
                estimated_mileage = 0  # Brand new
            elif vehicle_age == 1:
                estimated_mileage = 500  # Demo/test drive miles
            else:
                estimated_mileage = vehicle_age * 12000
        else:  # Purchase
            if vehicle_age == 0:
                estimated_mileage = 0
            else:
                estimated_mileage = vehicle_age * 12000

        # Mileage input
        mileage_help = (
            "Enter actual odometer reading (typically low for lease vehicles)"
            if transaction_type == "Lease"
            else "Auto-estimated at 12,000 miles/year. Adjust to actual odometer reading."
        )

        col_mile1, col_mile2 = st.columns(2)

        with col_mile1:
            current_mileage = st.number_input(
                "Current Mileage:",
                min_value=0,
                max_value=300000,
                value=estimated_mileage,
                step=1000,
                help=mileage_help,
                key="current_mileage_progressive"
            )

            # Show mileage analysis for used vehicles
            if vehicle_age > 0 and not (transaction_type == "Lease" and vehicle_age <= 1):
                avg_annual = current_mileage / vehicle_age if vehicle_age > 0 else 0
                if avg_annual < 10000:
                    mileage_note = "📊 Below average mileage"
                elif avg_annual < 15000:
                    mileage_note = "📊 Average mileage"
                else:
                    mileage_note = "📊 Above average mileage"
                st.caption(f"{mileage_note} ({avg_annual:,.0f} miles/year)")

        with col_mile2:
            # Calculate estimated value for used vehicles
            estimated_value = None
            if is_used and trim_msrp > 0:
                # Use mileage-aware estimation
                try:
                    from used_vehicle_estimator import UsedVehicleEstimator
                    estimator = UsedVehicleEstimator()

                    estimated_value = estimator.estimate_current_value(
                        make,
                        model,
                        int(year),
                        trim,
                        current_mileage
                    )
                except Exception:
                    # Fallback to basic estimation
                    estimated_value = estimate_used_vehicle_value(
                        make, model, int(year), current_mileage, trim_msrp
                    )

            # Show estimated value
            if estimated_value and estimated_value > 0:
                depreciation_pct = ((trim_msrp - estimated_value) / trim_msrp * 100) if trim_msrp > 0 else 0
                st.metric(
                    "Estimated Current Value",
                    f"${estimated_value:,.0f}",
                    delta=f"-{depreciation_pct:.1f}% from MSRP",
                    delta_color="inverse"
                )
                st.caption(f"Original MSRP: ${trim_msrp:,}")

        vehicle_data.update({
            'make': make,
            'model': model,
            'year': year,
            'trim': trim,
            'trim_msrp': trim_msrp,
            'is_used': is_used,
            'current_mileage': current_mileage,
            'estimated_value': estimated_value if estimated_value else trim_msrp,
            'is_valid': True
        })
        vehicle_valid = True

        # Show vehicle summary
        st.success(f"✓ Selected: {year} {make} {model} {trim}")

    st.markdown("---")

    # =========================================================================
    # STEP 2: LOCATION INFORMATION
    # =========================================================================
    st.subheader("Step 2: Where are you located?")

    location_valid = False
    location_data = {
        'zip_code': '',
        'state': '',
        'geography_type': 'Suburban',
        'fuel_price': 3.50,
        'electricity_rate': 0.12,
        'is_valid': False
    }

    if not vehicle_valid:
        st.info("🚗 Complete Step 1 (Vehicle Selection) first to proceed with location")
        st.text_input("ZIP Code", value="", disabled=True, key="zip_code_disabled")
    else:
        st.markdown("**Enter your ZIP code** to get accurate fuel prices, electricity rates, and tax information.")

        # ZIP Code input
        zip_code = st.text_input(
            "ZIP Code",
            value="",
            max_chars=5,
            help="Your 5-digit ZIP code for location-based estimates",
            key="zip_code_progressive"
        )

        location_data['zip_code'] = zip_code

        # Validate and lookup ZIP code
        if zip_code and len(zip_code) == 5 and zip_code.isdigit():
            # Use comprehensive lookup with fallback
            zip_data = validate_and_lookup_location(zip_code)
            if zip_data and zip_data.get('is_valid', False):
                # Get vehicle info from vehicle_data
                make = vehicle_data.get('make', '')
                model = vehicle_data.get('model', '')
                trim = vehicle_data.get('trim', '')
                year = vehicle_data.get('year', 2025)

                # Import fuel detection function
                from vehicle_helpers import determine_fuel_type_and_price

                # Detect if vehicle has changed (to recalculate fuel price)
                current_vehicle_key = f"{make}|{model}|{year}|{trim}"
                previous_vehicle_key = st.session_state.get('previous_vehicle_key', '')
                vehicle_changed = (current_vehicle_key != previous_vehicle_key)

                # Store current vehicle key for next comparison
                st.session_state['previous_vehicle_key'] = current_vehicle_key

                # Get fuel type for the selected vehicle (recalculate if vehicle changed)
                fuel_info = determine_fuel_type_and_price(make, model, year, trim, zip_code)
                fuel_type = fuel_info.get('fuel_type', 'regular')  # 'electric', 'premium', 'regular'
                base_fuel_price = fuel_info.get('fuel_price', 3.50)
                electricity_rate_default = zip_data.get('electricity_rate', 0.12)

                # If vehicle changed, reset the fuel price input to the new detected price
                if vehicle_changed:
                    st.session_state['fuel_price_progressive'] = float(base_fuel_price)

                # Show location detection with informational message if using state-level data
                state_info = f"{zip_data.get('state', '')} - {zip_data.get('geography_type', 'Suburban')}"
                if zip_data.get('error_message'):
                    st.info(f"✓ Location detected: {state_info} ({zip_data['error_message']})")
                else:
                    st.success(f"✓ Location detected: {state_info}")

                    # Notify user if vehicle changed and fuel price was recalculated
                    if vehicle_changed and previous_vehicle_key:
                        if fuel_type == 'premium':
                            st.info(f"🔄 Vehicle changed to {make} {model} {trim} - Updated to **Premium** fuel (${base_fuel_price:.2f}/gal)")
                        elif fuel_type == 'regular':
                            st.info(f"🔄 Vehicle changed to {make} {model} {trim} - Updated to **Regular** fuel (${base_fuel_price:.2f}/gal)")
                        elif fuel_type == 'electric':
                            st.info(f"🔄 Vehicle changed to {make} {model} {trim} - This is an **Electric** vehicle")

                    # Show appropriate pricing inputs based on fuel type
                    if fuel_type == 'electric':
                        # Electric vehicle - show only electricity pricing with charging modes
                        st.markdown("**Electricity Pricing** (EV Charging)")

                        charging_mode = st.radio(
                            "Charging Mode:",
                            ["Home Only", "Public Only", "Mixed (Home & Public)"],
                            horizontal=True,
                            key="charging_mode_progressive"
                        )

                        col1, col2 = st.columns(2)
                        with col1:
                            home_rate = st.number_input(
                                "Home Electricity Rate (per kWh)",
                                min_value=0.0,
                                max_value=1.0,
                                value=float(electricity_rate_default),
                                step=0.01,
                                format="%.3f",
                                help="Your home electricity rate",
                                key="home_electricity_rate_progressive"
                            )
                        with col2:
                            public_rate = st.number_input(
                                "Public Charging Rate (per kWh)",
                                min_value=0.0,
                                max_value=1.0,
                                value=float(electricity_rate_default * 2.5),  # Public charging typically 2-3x home rate
                                step=0.01,
                                format="%.3f",
                                help="Average public/DC fast charging rate",
                                key="public_electricity_rate_progressive"
                            )

                        # Calculate blended rate based on charging mode
                        if charging_mode == "Home Only":
                            blended_rate = home_rate
                            mix_pct = "100% home"
                        elif charging_mode == "Public Only":
                            blended_rate = public_rate
                            mix_pct = "100% public"
                        else:  # Mixed
                            home_pct = st.slider(
                                "Percentage of Home Charging",
                                min_value=0,
                                max_value=100,
                                value=80,
                                step=5,
                                help="What percentage of your charging is done at home?",
                                key="home_charging_pct_progressive"
                            )
                            blended_rate = (home_rate * home_pct / 100) + (public_rate * (100 - home_pct) / 100)
                            mix_pct = f"{home_pct}% home / {100-home_pct}% public"

                        st.info(f"**Blended Electricity Rate: ${blended_rate:.3f}/kWh** ({mix_pct})")

                        location_data.update({
                            'state': zip_data.get('state', ''),
                            'geography_type': zip_data.get('geography_type', 'Suburban'),
                            'fuel_price': 0.0,  # No fuel for EVs
                            'electricity_rate': blended_rate,
                            'is_valid': True
                        })
                        location_valid = True

                    else:
                        # Gas vehicle (regular or premium) - show only fuel pricing
                        fuel_label = "Premium Gasoline" if fuel_type == 'premium' else "Regular Gasoline"

                        fuel_price = st.number_input(
                            f"Fuel Price ({fuel_label}, per gallon)",
                            min_value=0.0,
                            max_value=10.0,
                            value=float(base_fuel_price),
                            step=0.10,
                            format="%.2f",
                            help=f"Current {fuel_label.lower()} price in your area",
                            key="fuel_price_progressive"
                        )

                        if fuel_type == 'premium':
                            st.caption(f"ℹ️ This vehicle requires premium fuel (${base_fuel_price:.2f}/gal)")

                        location_data.update({
                            'state': zip_data.get('state', ''),
                            'geography_type': zip_data.get('geography_type', 'Suburban'),
                            'fuel_price': fuel_price,
                            'electricity_rate': 0.0,  # No electricity for gas vehicles
                            'is_valid': True
                        })
                        location_valid = True
            else:
                st.error("ZIP code not found in our database")

        st.markdown("---")

    # =========================================================================
    # STEP 3: PERSONAL INFORMATION
    # =========================================================================
    st.subheader("Step 3: Personal Information")

    personal_valid = False
    personal_data = {
        'user_age': 25,
        'gross_income': 60000,
        'credit_score_range': '670-739 (Good)',
        'annual_mileage': 12000,
        'driving_style': 'normal',
        'terrain': 'flat',
        'num_household_vehicles': 1,
        'is_valid': False
    }

    if not location_valid:
        st.info("📍 Complete Step 2 (Location) first to proceed with personal information")

        # Show disabled fields
        col1, col2 = st.columns(2)
        with col1:
            st.number_input("Age", value=25, disabled=True, key="age_disabled")
            st.number_input("Annual Mileage", value=12000, disabled=True, key="mileage_disabled")
        with col2:
            st.number_input("Gross Annual Income", value=60000, disabled=True, key="income_disabled")
            st.selectbox("Credit Score", ["-- Complete Step 2 first --"], disabled=True, key="credit_disabled")
    else:
        st.markdown("**Provide your personal information** for accurate insurance and financing estimates")

        col1, col2 = st.columns(2)

        with col1:
            user_age = st.number_input(
                "Your Age",
                min_value=16,
                max_value=100,
                value=25,
                help="Your age affects insurance rates",
                key="age_progressive"
            )

            annual_mileage = st.number_input(
                "Annual Mileage",
                min_value=1000,
                max_value=50000,
                value=12000,
                step=1000,
                help="Expected miles driven per year",
                key="mileage_progressive"
            )

            driving_style = st.selectbox(
                "Driving Style",
                ["conservative", "normal", "aggressive"],
                index=1,
                help="How you drive affects fuel efficiency",
                key="driving_style_progressive"
            )

        with col2:
            gross_income = st.number_input(
                "Gross Annual Income ($)",
                min_value=0,
                max_value=1000000,
                value=60000,
                step=5000,
                help="Your yearly income before taxes",
                key="income_progressive"
            )

            credit_score_range = st.selectbox(
                "Credit Score Range",
                [
                    '800-850 (Excellent)',
                    '740-799 (Very Good)',
                    '670-739 (Good)',
                    '580-669 (Fair)',
                    '300-579 (Poor)'
                ],
                index=2,
                help="Your credit score affects financing rates",
                key="credit_progressive"
            )

            terrain = st.selectbox(
                "Terrain",
                ["flat", "hilly", "mountainous"],
                help="Your area's terrain affects fuel efficiency",
                key="terrain_progressive"
            )

        num_household_vehicles = st.number_input(
            "Number of Household Vehicles",
            min_value=1,
            max_value=10,
            value=1,
            help="Total vehicles in your household (affects insurance)",
            key="household_vehicles_progressive"
        )

        personal_data.update({
            'user_age': user_age,
            'gross_income': gross_income,
            'credit_score_range': credit_score_range,
            'annual_mileage': annual_mileage,
            'driving_style': driving_style,
            'terrain': terrain,
            'num_household_vehicles': num_household_vehicles,
            'is_valid': True
        })
        personal_valid = True

    st.markdown("---")

    # =========================================================================
    # STEP 4: FINANCIAL PARAMETERS
    # =========================================================================
    st.subheader("Step 4: Financial Parameters")

    financial_valid = False
    financial_data = {
        'purchase_price': 0,
        'down_payment': 0,
        'down_payment_percent': 20,
        'trade_in_value': 0,
        'trade_in_owed': 0,
        'interest_rate': 6.5,
        'loan_term_years': 5,
        'lease_term_months': 36,
        'lease_down_payment': 0,
        'lease_annual_mileage': 12000,
        'is_valid': False
    }

    if not personal_valid:
        st.info("👤 Complete Step 3 (Personal Information) first to proceed with financial parameters")

        col1, col2 = st.columns(2)
        with col1:
            st.number_input("Down Payment %", value=20, disabled=True, key="down_pmt_disabled")
        with col2:
            st.number_input("Loan Term (years)", value=5, disabled=True, key="loan_term_disabled")
    else:
        transaction_type = vehicle_data.get('transaction_type', 'Purchase')

        if transaction_type == "Purchase":
            st.markdown("**Set your purchase financing** terms")

            # Purchase price input (for tax calculations)
            msrp = vehicle_data.get('trim_msrp', 30000)
            estimated_value = vehicle_data.get('estimated_value', msrp)
            is_used = vehicle_data.get('is_used', False)

            if is_used:
                st.markdown(f"*MSRP: ${msrp:,.0f} | Estimated Current Value: ${estimated_value:,.0f}*")
                default_price = int(estimated_value)
            else:
                st.markdown(f"*MSRP: ${msrp:,.0f}*")
                default_price = int(msrp)

            purchase_price = st.number_input(
                "Actual Purchase Price ($)",
                min_value=0,
                max_value=500000,
                value=default_price,
                step=100,
                help="The actual price you're paying. This is used for tax calculations.",
                key="purchase_price_progressive"
            )

            st.markdown("---")

            col1, col2 = st.columns(2)

            with col1:
                down_payment_percent = st.slider(
                    "Down Payment (%)",
                    min_value=0,
                    max_value=100,
                    value=20,
                    step=5,
                    help="Percentage of purchase price to pay upfront",
                    key="down_payment_progressive"
                )

                # Calculate and display down payment amount
                down_payment_amount = purchase_price * (down_payment_percent / 100)
                st.caption(f"Down Payment: **${down_payment_amount:,.0f}**")

                trade_in_value = st.number_input(
                    "Trade-In Value ($)",
                    min_value=0,
                    max_value=200000,
                    value=0,
                    step=1000,
                    help="Value of vehicle you're trading in",
                    key="trade_in_progressive"
                )

            with col2:
                loan_term_years = st.slider(
                    "Loan Term (years)",
                    min_value=1,
                    max_value=8,
                    value=5,
                    help="Length of auto loan",
                    key="loan_term_progressive"
                )

                trade_in_owed = st.number_input(
                    "Amount Owed on Trade-In ($)",
                    min_value=0,
                    max_value=200000,
                    value=0,
                    step=1000,
                    help="Outstanding loan on trade-in",
                    key="trade_in_owed_progressive"
                )

            # Calculate down payment amount based on purchase price
            down_payment = purchase_price * (down_payment_percent / 100)

            financial_data.update({
                'purchase_price': purchase_price,
                'price': purchase_price,  # Alias for compatibility with prediction_service
                'down_payment': down_payment,
                'down_payment_percent': down_payment_percent,
                'trade_in_value': trade_in_value,
                'trade_in_owed': trade_in_owed,
                'loan_term_years': loan_term_years,
                'interest_rate': 6.5,  # Default, will be adjusted based on credit
                'is_valid': True
            })
            financial_valid = True

        else:  # Lease
            st.markdown("**Set your lease** terms")

            col1, col2 = st.columns(2)

            with col1:
                lease_term_months = st.selectbox(
                    "Lease Term",
                    [24, 36, 48],
                    index=1,
                    help="Length of lease in months",
                    key="lease_term_progressive"
                )

                lease_annual_mileage = st.selectbox(
                    "Annual Mileage Allowance",
                    [10000, 12000, 15000, 18000],
                    index=1,
                    help="Miles per year allowed under lease",
                    key="lease_mileage_progressive"
                )

                lease_monthly_payment = st.number_input(
                    "Monthly Lease Payment ($)",
                    min_value=0,
                    max_value=5000,
                    value=0,
                    step=50,
                    help="Expected monthly lease payment",
                    key="lease_monthly_payment_progressive"
                )

            with col2:
                lease_down_payment = st.number_input(
                    "Down Payment at Signing ($)",
                    min_value=0,
                    max_value=20000,
                    value=0,
                    step=500,
                    help="Initial payment due at lease signing (down payment + fees)",
                    key="lease_down_progressive"
                )

            financial_data.update({
                'lease_term_months': lease_term_months,
                'lease_down_payment': lease_down_payment,
                'lease_annual_mileage': lease_annual_mileage,
                'lease_monthly_payment': lease_monthly_payment,
                'is_valid': True
            })
            financial_valid = True

    st.markdown("---")

    # =========================================================================
    # STEP 5: INSURANCE
    # =========================================================================
    st.subheader("Step 5: Insurance Coverage")

    insurance_valid = False
    insurance_data = {
        'coverage_type': 'Full Coverage',
        'shop_type': 'independent',
        'is_valid': False
    }

    if not financial_valid:
        st.info("💰 Complete Step 4 (Financial Parameters) first to proceed with insurance")

        col1, col2 = st.columns(2)
        with col1:
            st.selectbox("Coverage Type", ["-- Complete Step 4 first --"], disabled=True, key="coverage_disabled")
        with col2:
            st.selectbox("Repair Shop", ["-- Complete Step 4 first --"], disabled=True, key="shop_disabled")
    else:
        st.markdown("**Select your insurance coverage** preferences")

        col1, col2 = st.columns(2)

        with col1:
            coverage_type = st.selectbox(
                "Coverage Type",
                ["Full Coverage", "Liability Only"],
                help="Full coverage includes comprehensive and collision",
                key="coverage_progressive"
            )

        with col2:
            shop_type = st.selectbox(
                "Preferred Repair Shop",
                [
                    ("Independent Shop", "independent"),
                    ("Dealer Service", "dealer")
                ],
                format_func=lambda x: x[0] if isinstance(x, tuple) else x,
                help="Independent shops typically cost less",
                key="shop_progressive"
            )
            if isinstance(shop_type, tuple):
                shop_type = shop_type[1]

        insurance_data.update({
            'coverage_type': coverage_type,
            'shop_type': shop_type,
            'is_valid': True
        })
        insurance_valid = True

    st.markdown("---")

    # =========================================================================
    # STEP 6: ANALYSIS SETTINGS
    # =========================================================================
    st.subheader("Step 6: Analysis Settings")

    analysis_valid = False
    analysis_data = {
        'analysis_years': 5,
        'comparison_priority': 'cost',
        'is_valid': False
    }

    if not insurance_valid:
        st.info("🛡️ Complete Step 5 (Insurance) first to finalize analysis settings")

        st.slider("Analysis Period (years)", 1, 10, 5, disabled=True, key="analysis_years_disabled")
    else:
        st.markdown("**Configure analysis** period and priorities")

        col1, col2 = st.columns(2)

        with col1:
            analysis_years = st.slider(
                "Analysis Period (years)",
                min_value=1,
                max_value=10,
                value=5,
                help="How many years to analyze ownership costs",
                key="analysis_years_progressive"
            )

        with col2:
            comparison_priority = st.selectbox(
                "Comparison Priority",
                ["cost", "value", "performance"],
                help="What matters most when comparing vehicles",
                key="comparison_priority_progressive"
            )

        analysis_data.update({
            'analysis_years': analysis_years,
            'comparison_priority': comparison_priority,
            'is_valid': True
        })
        analysis_valid = True

    # =========================================================================
    # COMBINE ALL DATA AND VALIDATE
    # =========================================================================
    all_data = {
        **location_data,
        **vehicle_data,
        **personal_data,
        **financial_data,
        **insurance_data,
        **analysis_data
    }

    # Overall validation
    is_valid = all([
        location_valid,
        vehicle_valid,
        personal_valid,
        financial_valid,
        insurance_valid,
        analysis_valid
    ])

    if is_valid:
        validation_message = "✓ All steps completed - ready to calculate"
    else:
        validation_message = "Please complete all steps to proceed with calculation"

    return all_data, is_valid, validation_message
