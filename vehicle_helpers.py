"""
Vehicle Helper Functions - Shared utilities to avoid circular imports
Contains functions used by both calculator_display.py and input_forms.py
"""

import streamlit as st
from typing import Dict, Any

# Import MPG database functions
try:
    from vehicle_mpg_database import (
        get_vehicle_mpg, 
        get_mpg_display_text, 
        get_fuel_efficiency_rating,
        compare_mpg_to_class_average,
        estimate_annual_fuel_cost
    )
    MPG_DATABASE_AVAILABLE = True
except ImportError:
    MPG_DATABASE_AVAILABLE = False


def detect_electric_vehicle(make: str, model: str) -> bool:
    """Detect if make/model is an electric vehicle - FIXED for Audi"""
    model_lower = model.lower()
    make_lower = make.lower()
    
    # Tesla is always electric
    if make_lower == 'tesla':
        return True
    
    # All-electric brands
    if make_lower in ['rivian', 'lucid', 'polestar', 'fisker']:
        return True
    
    # Comprehensive EV model detection - EXACT matches to avoid false positives
    ev_models = [
        # Nissan
        'leaf', 'ariya',
        # Tesla
        'model 3', 'model s', 'model x', 'model y', 'cybertruck',
        # Chevrolet/GM
        'bolt ev', 'bolt euv', 'equinox ev', 'blazer ev', 'silverado ev',
        'lyriq', 'hummer ev',
        # Hyundai/Kia/Genesis
        'ioniq electric', 'ioniq 5', 'ioniq 6', 'kona electric', 
        'niro ev', 'soul ev', 'ev6', 'ev9',
        'gv60', 'gv70 electric', 'g80 electric',
        # BMW - ONLY electric i-series
        'i3', 'i4', 'i5', 'i7', 'ix', 'ix1', 'ix2', 'ix3', 'ixm60',
        # Audi - ONLY e-tron models (NOT regular A4, A6, etc.)
        'e-tron', 'e-tron gt', 'q4 e-tron', 'q5 e-tron', 'q6 e-tron', 'q8 e-tron',
        # Porsche
        'taycan',
        # Volkswagen
        'id.3', 'id.4', 'id.5', 'id.7', 'id.buzz',
        # Ford
        'mustang mach-e', 'mach-e', 'f-150 lightning', 'lightning', 'e-transit',
        # Mercedes
        'eqb', 'eqc', 'eqe', 'eqs', 'eqv',
        # Volvo
        'c40 recharge', 'xc40 recharge',
        # Other manufacturers
        'polestar', 'lucid air', 'rivian', 'i-pace', 'mini electric', 'cooper se',
        'prologue', 'zdx', 'bz4x', 'solterra', 'mx-30 electric'
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


def get_vehicle_energy_type(make: str, model: str) -> str:
    """Determine vehicle energy type (gas, electric, hybrid)"""
    model_lower = model.lower()
    
    if detect_electric_vehicle(make, model):
        return 'electric'
    
    # Check for hybrid
    hybrid_keywords = ['hybrid', 'prius', 'insight', 'accord hybrid', 'camry hybrid']
    if any(keyword in model_lower for keyword in hybrid_keywords):
        return 'hybrid'
    
    return 'gasoline'


def get_fuel_price_from_location(zip_code: str = None, state: str = None) -> float:
    """Get fuel price from ZIP code or state with regular/premium distinction"""
    # Base regular gas prices by state (current 2025 averages)
    state_regular_prices = {
        'CA': 4.65, 'TX': 3.25, 'FL': 3.40, 'NY': 3.85, 'IL': 3.60,
        'PA': 3.65, 'OH': 3.35, 'GA': 3.25, 'NC': 3.35, 'MI': 3.50,
        'WA': 4.20, 'OR': 4.10, 'NV': 4.05, 'AZ': 3.85, 'CO': 3.50,
        'MA': 3.75, 'TN': 3.30, 'IN': 3.45, 'MO': 3.35, 'WI': 3.55,
        'MN': 3.45, 'AL': 3.20, 'SC': 3.30, 'KY': 3.35, 'LA': 3.15
    }
    
    # ZIP code to state mapping for major metros (optional enhancement)
    zip_to_state = {
        '90210': 'CA', '10001': 'NY', '60601': 'IL', '77001': 'TX', '33101': 'FL',
        '98101': 'WA', '97201': 'OR', '80201': 'CO', '30301': 'GA', '48201': 'MI',
        '02101': 'MA', '37201': 'TN', '46201': 'IN', '63101': 'MO', '53201': 'WI',
        '55401': 'MN', '35201': 'AL', '29201': 'SC', '40201': 'KY', '70112': 'LA'
    }
    
    # Determine state from ZIP code if provided
    if zip_code and len(zip_code) == 5 and zip_code.isdigit():
        inferred_state = zip_to_state.get(zip_code, state)
        if inferred_state:
            state = inferred_state
    
    return state_regular_prices.get(state, 3.50)


def get_premium_fuel_price(regular_price: float) -> float:
    """Calculate premium fuel price (typically $0.30-$0.50 more than regular)"""
    return regular_price + 0.40


def get_electricity_rate_from_location(zip_code: str = None, state: str = None) -> float:
    """Get electricity rate from ZIP code or state"""
    # Average electricity rates by state (cents per kWh)
    state_electricity_rates = {
        'CA': 0.38, 'TX': 0.14, 'FL': 0.13, 'NY': 0.23, 'IL': 0.15,
        'PA': 0.14, 'OH': 0.13, 'GA': 0.13, 'NC': 0.12, 'MI': 0.17,
        'WA': 0.11, 'OR': 0.11, 'NV': 0.13, 'AZ': 0.13, 'CO': 0.13,
        'MA': 0.27, 'TN': 0.11, 'IN': 0.13, 'MO': 0.11, 'WI': 0.15,
        'MN': 0.13, 'AL': 0.12, 'SC': 0.13, 'KY': 0.11, 'LA': 0.10
    }
    
    # ZIP code to state mapping
    zip_to_state = {
        '90210': 'CA', '10001': 'NY', '60601': 'IL', '77001': 'TX', '33101': 'FL',
        '98101': 'WA', '97201': 'OR', '80201': 'CO', '30301': 'GA', '48201': 'MI',
        '02101': 'MA', '37201': 'TN', '46201': 'IN', '63101': 'MO', '53201': 'WI',
        '55401': 'MN', '35201': 'AL', '29201': 'SC', '40201': 'KY', '70112': 'LA'
    }
    
    # Determine state from ZIP code if provided
    if zip_code and len(zip_code) == 5 and zip_code.isdigit():
        inferred_state = zip_to_state.get(zip_code, state)
        if inferred_state:
            state = inferred_state
    
    return state_electricity_rates.get(state, 0.14)


def determine_fuel_type_and_price(make: str, model: str, year: int, trim: str = "", 
                                 zip_code: str = None, state: str = None) -> Dict[str, Any]:
    """
    Determine if vehicle requires premium fuel and return appropriate pricing
    UPDATED: Comprehensive detection based on full database analysis
    """
    
    make_lower = make.lower()
    model_lower = model.lower()
    trim_lower = trim.lower() if trim else ""
    
    # Get base regular fuel price for location
    regular_price = get_fuel_price_from_location(zip_code, state)
    
    # Electric vehicles don't use fuel
    if detect_electric_vehicle(make, model):
        return {
            'fuel_type': 'electric',
            'fuel_price': 0.0,
            'requires_premium': False,
            'price_info': f"Electric vehicle - uses electricity instead of fuel"
        }
    
    # Determine if vehicle requires premium fuel
    requires_premium = False
    
    # ========================================================================
    # 1. LUXURY BRANDS - All models require premium
    # ========================================================================
    luxury_brands_premium = [
        'bmw', 'mercedes-benz', 'audi', 'lexus', 'infiniti', 'acura', 
        'porsche', 'maserati', 'alfa romeo', 'jaguar', 'land rover'
    ]
    if make_lower in luxury_brands_premium:
        requires_premium = True
    
    # ========================================================================
    # 2. PERFORMANCE VEHICLES - Require premium
    # ========================================================================
    performance_models = [
        # Chevrolet
        'corvette', 'camaro ss', 'camaro zl1', 'camaro z28',
        # Ford
        'mustang gt', 'mustang shelby', 'raptor', 'f-150 raptor',
        # Dodge
        'charger srt', 'charger hellcat', 'challenger srt', 'challenger hellcat',
        'viper', 'durango srt',
        # Toyota/Lexus performance
        'supra', 'gr86', 'is 350', 'is 500', 'rc f', 'gs f', 'lc 500',
        # Honda/Acura performance
        'civic type r', 'nsx', 'tlx type s', 'integra type s',
        # Nissan/Infiniti performance
        'gt-r', 'gtr', '370z', '400z', 'q50 red sport', 'q60 red sport',
        # Volkswagen/Audi performance
        'golf r', 'gti', 'jetta gli', 's3', 's4', 's5', 's6', 's7', 's8',
        'rs3', 'rs4', 'rs5', 'rs6', 'rs7', 'r8', 'tt rs',
        # Subaru performance
        'wrx', 'sti', 'brz'
    ]
    
    for perf_model in performance_models:
        if perf_model in model_lower or perf_model in trim_lower:
            requires_premium = True
            break
    
    # ========================================================================
    # 3. TURBOCHARGED VEHICLES - Many require premium
    # ========================================================================
    if any(keyword in trim_lower for keyword in ['turbo', 'twin-turbo', 'supercharged']):
        # Some brands can use regular with turbos (Ford, Chevy)
        if make_lower not in ['ford', 'chevrolet', 'gmc', 'ram']:
            requires_premium = True
    
    # ========================================================================
    # 4. SPECIFIC MODEL EXCEPTIONS - Regular fuel despite luxury brand
    # ========================================================================
    regular_fuel_exceptions = [
        # BMW
        'x1', 'x2', '228i',
        # Mercedes
        'cla 250', 'a 220', 'gla 250',
        # Audi (base models)
        'a3 35', 'q3 35',
    ]
    
    for exception_model in regular_fuel_exceptions:
        if exception_model in model_lower or exception_model in trim_lower:
            requires_premium = False
            break
    
    # ========================================================================
    # 5. CALCULATE FINAL PRICE
    # ========================================================================
    if requires_premium:
        fuel_price = get_premium_fuel_price(regular_price)
        fuel_type = 'premium'
        price_info = f"Premium fuel required - ${fuel_price:.2f}/gallon (${regular_price:.2f} regular + $0.40 premium)"
    else:
        fuel_price = regular_price
        fuel_type = 'regular'
        price_info = f"Regular fuel - ${fuel_price:.2f}/gallon"
    
    return {
        'fuel_type': fuel_type,
        'fuel_price': fuel_price,
        'requires_premium': requires_premium,
        'price_info': price_info
    }


def display_vehicle_mpg_info(make: str, model: str, year: int, trim: str = None,
                            annual_mileage: int = None, fuel_price: float = None,
                            electricity_rate: float = None, charging_preference: str = None,
                            driving_style: str = None, terrain: str = None):
    """
    Display comprehensive MPG information for the selected vehicle
    
    Args:
        make: Vehicle make
        model: Vehicle model
        year: Vehicle year
        trim: Vehicle trim (optional)
        annual_mileage: Annual miles driven (optional - if None, don't show fuel costs)
        fuel_price: Price per gallon for gas vehicles (optional)
        electricity_rate: Base electricity rate for EVs (optional)
        charging_preference: EV charging pattern (optional)
        driving_style: 'gentle', 'normal', or 'aggressive' (optional)
        terrain: 'flat' or 'hilly' (optional)
    """
    
    if not MPG_DATABASE_AVAILABLE:
        st.info("💡 MPG database not available - using estimates")
        return
    
    # Get MPG data
    mpg_data = get_vehicle_mpg(make, model, year, trim)
    
    if mpg_data:
        # Create MPG display section
        st.markdown("---")
        st.subheader("⛽ Fuel Economy Information")
        
        # Main MPG display
        col1, col2, col3 = st.columns(3)
        
        with col1:
            display_text = get_mpg_display_text(mpg_data)
            st.metric("Fuel Economy", display_text)
        
        with col2:
            efficiency_rating = get_fuel_efficiency_rating(mpg_data)
            rating_emoji = {
                'Excellent': '⭐⭐⭐⭐⭐',
                'Very Good': '⭐⭐⭐⭐',
                'Good': '⭐⭐⭐',
                'Average': '⭐⭐',
                'Below Average': '⭐'
            }.get(efficiency_rating, '⭐⭐⭐')
            st.metric("Efficiency Rating", f"{efficiency_rating} {rating_emoji}")
        
        with col3:
            comparison = compare_mpg_to_class_average(mpg_data, make, model)
            comparison_emoji = '📈' if comparison['comparison'] == 'above' else '📉'
            st.metric(
                f"{comparison['class_name']} Comparison",
                f"{comparison_emoji} {comparison['difference']:.1f} MPG {comparison['comparison']} avg",
                delta=f"Class avg: {comparison['class_average']:.1f} MPG"
            )
        
        # Display fuel cost estimation if mileage and prices provided
        if annual_mileage and (fuel_price or electricity_rate):
            st.markdown("---")
            st.subheader("💰 Estimated Annual Fuel Cost")
            
            # Use defaults if not provided
            if not driving_style:
                driving_style = 'normal'
            if not terrain:
                terrain = 'flat'
            
            cost_data = estimate_annual_fuel_cost(
                mpg_data, 
                annual_mileage, 
                fuel_price or 3.50,
                electricity_rate or 0.14,
                charging_preference,
                driving_style,
                terrain
            )
            
            col1, col2, col3 = st.columns(3)
            with col1:
                st.metric("Annual Cost", f"${cost_data['annual_cost']:,.0f}")
            with col2:
                st.metric("Monthly Cost", f"${cost_data['monthly_cost']:,.0f}")
            with col3:
                st.metric("Cost per Mile", f"${cost_data['cost_per_mile']:.2f}")
        
        # Data source attribution
        st.caption(f"📊 Data source: {mpg_data['source']}")
    else:
        st.info(f"💡 MPG data not available for {year} {make} {model}")