"""
Vehicle Helper Functions - Shared utilities to avoid circular imports
Contains functions used by both calculator_display.py and input_forms.py
"""

import streamlit as st
from typing import Dict, Any


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

    # Combine model and trim for better matching (handles split names like "Civic" + "Type R")
    full_name = f"{model_lower} {trim_lower}".strip()

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
        'porsche', 'maserati', 'alfa romeo', 'jaguar', 'land rover',
        'cadillac', 'lincoln', 'genesis'  # Luxury brands
    ]
    if make_lower in luxury_brands_premium:
        requires_premium = True

    # ========================================================================
    # 2. PERFORMANCE TRIM INDICATORS - Require premium
    # ========================================================================
    # These are trim-level indicators that require premium regardless of base model
    performance_trim_indicators = [
        'type r', 'type s', 'type-r', 'type-s',  # Honda/Acura performance
        'red sport', 'redsport',  # Nissan/Infiniti performance
        'n line', 'n-line',  # Hyundai performance
        'st', 'rs', 'gt',  # Ford/Audi/Various performance
        'srt', 'srt8', 'hellcat', 'demon', 'redeye',  # Dodge performance
        'ss', 'zl1', 'z28', '1le',  # Chevy performance
        'shelby', 'gt350', 'gt500', 'mach 1',  # Ford Mustang performance
        'nismo',  # Nissan performance
        'm sport', 'm-sport', 'm40i', 'm50i',  # BMW performance (not full M)
        'amg',  # Mercedes performance
        's line', 's-line',  # Audi sport
        'f sport',  # Lexus sport
        'sport +', 'sport+',  # Various performance
        'prestige turbo', 'sport turbo',  # Mazda/Various
    ]

    for indicator in performance_trim_indicators:
        if indicator in trim_lower or indicator in full_name:
            requires_premium = True
            break

    # ========================================================================
    # 3. PERFORMANCE VEHICLES - Complete model names requiring premium
    # ========================================================================
    performance_models = [
        # Chevrolet
        'corvette', 'camaro ss', 'camaro zl1', 'camaro z28',
        # Ford
        'mustang gt', 'mustang shelby', 'mustang mach 1', 'raptor', 'f-150 raptor',
        'bronco raptor', 'ranger raptor',
        # Dodge
        'charger srt', 'charger hellcat', 'charger scat pack', 'charger r/t',
        'challenger srt', 'challenger hellcat', 'challenger scat pack', 'challenger r/t',
        'viper', 'durango srt',
        # Toyota/Lexus performance
        'supra', 'gr86', 'gr supra', 'gr corolla',
        'is 350', 'is 500', 'rc f', 'gs f', 'lc 500', 'nx 350',
        # Honda/Acura performance
        'civic type r', 'civic si', 'accord sport', 'nsx',
        'tlx type s', 'integra type s', 'mdx type s',
        # Nissan/Infiniti performance
        'gt-r', 'gtr', '370z', '400z', 'z',
        'q50 red sport', 'q60 red sport', 'qx50 sport', 'qx55',
        # Volkswagen/Audi performance
        'golf r', 'golf gti', 'gti', 'jetta gli', 'gli',
        's3', 's4', 's5', 's6', 's7', 's8', 'sq5', 'sq7', 'sq8',
        'rs3', 'rs4', 'rs5', 'rs6', 'rs7', 'r8', 'tt rs', 'rs q8',
        # Subaru performance
        'wrx', 'sti', 'wrx sti', 'brz',
        # Mazda performance
        'mazda3 turbo', 'mazda6 turbo', 'cx-5 turbo', 'cx-9 turbo',
        'miata', 'mx-5', 'rx-7', 'rx-8',
        # Hyundai/Kia performance
        'veloster n', 'elantra n', 'kona n', 'i30 n',
        'stinger gt', 'forte gt', 'k5 gt',
        # Mini performance
        'cooper s', 'jcw', 'john cooper works',
    ]

    for perf_model in performance_models:
        if perf_model in model_lower or perf_model in full_name:
            requires_premium = True
            break

    # ========================================================================
    # 4. ENGINE-BASED DETECTION - V8, V6 Turbo, etc.
    # ========================================================================
    # Check for high-performance engines in trim
    if any(engine in trim_lower for engine in ['v8', 'v-8', '5.0l', '6.2l', '392', 'hemi']):
        requires_premium = True

    # Turbocharged engines (many require premium for optimal performance)
    if any(keyword in trim_lower for keyword in ['turbo', 'twin-turbo', 'twin turbo', 'supercharged', 'supercharger']):
        # Some brands can use regular with turbos (Ford EcoBoost, some Chevy)
        if make_lower not in ['ford', 'chevrolet', 'gmc', 'ram', 'jeep']:
            requires_premium = True
        # But high-performance turbo models still need premium even from these brands
        elif any(perf in full_name for perf in ['raptor', 'st', 'rs', 'ss', 'zl1']):
            requires_premium = True

    # ========================================================================
    # 5. SPECIFIC MODEL EXCEPTIONS - Regular fuel despite luxury brand
    # ========================================================================
    regular_fuel_exceptions = [
        # BMW (base models)
        'x1 sdrive28i', 'x1 xdrive28i', 'x2 sdrive28i', '228i', '230i',
        # Mercedes (base models)
        'cla 250', 'a 220', 'a 250', 'gla 250',
        # Audi (base models - non-turbo or low-power turbo)
        'a3 35', 'q3 35', 'a3 2.0t base',
        # Lexus (some base models can use regular but premium recommended)
        # Note: Most Lexus still benefit from premium
    ]

    for exception_model in regular_fuel_exceptions:
        if exception_model in full_name:
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
        'regular_price': regular_price,
        'requires_premium': requires_premium,
        'price_info': price_info
    }


def display_vehicle_mpg_info(make: str, model: str, year: int = None, trim: str = None,
                            annual_mileage: int = None, fuel_price: float = None,
                            electricity_rate: float = None, charging_preference: str = None,
                            driving_style: str = None, terrain: str = None):
    """Vehicle efficiency detail output disabled by request."""
    return
