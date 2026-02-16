"""
Salary Requirements Calculator Page
Calculates the minimum salary needed to afford vehicle ownership costs
"""

import streamlit as st
import sys
import os

# Add parent directory to path for imports
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from session_manager import initialize_session_state
from theme_utils import apply_theme, get_footer_html
from input_forms import on_year_change_salary
from salary_calculator_utils import (
    calculate_required_salary,
    estimate_vehicle_costs_simple,
    get_state_list,
    format_currency,
    STATE_TAX_DATA,
)

# Try to import vehicle database
try:
    from vehicle_database import (
        get_all_manufacturers,
        get_models_for_manufacturer,
        get_trims_for_vehicle,
        get_available_years_for_model
    )
    VEHICLE_DATABASE_AVAILABLE = True
except ImportError:
    VEHICLE_DATABASE_AVAILABLE = False

# Try to import MPG database
try:
    from vehicle_mpg_database import get_vehicle_mpg
    MPG_DATABASE_AVAILABLE = True
except ImportError:
    MPG_DATABASE_AVAILABLE = False

# Try to import maintenance utilities
try:
    from maintenance_utils import MaintenanceCalculator
    MAINTENANCE_AVAILABLE = True
except ImportError:
    MAINTENANCE_AVAILABLE = False

# Try to import used vehicle estimator
try:
    from used_vehicle_estimator import UsedVehicleEstimator
    USED_VEHICLE_ESTIMATOR_AVAILABLE = True
except ImportError:
    USED_VEHICLE_ESTIMATOR_AVAILABLE = False

# Page configuration
st.set_page_config(
    page_title="Salary Calculator - CashPedal",
    page_icon="car",
    layout="wide",
    initial_sidebar_state="expanded"
)


def get_vehicle_tier(make: str) -> str:
    """Determine vehicle tier based on make"""
    luxury_makes = ['BMW', 'Mercedes-Benz', 'Audi', 'Lexus', 'Porsche', 'Land Rover', 
                    'Jaguar', 'Maserati', 'Bentley', 'Rolls-Royce', 'Ferrari', 'Lamborghini',
                    'Alfa Romeo', 'Genesis', 'Lucid', 'Rivian']
    premium_makes = ['Acura', 'Infiniti', 'Lincoln', 'Cadillac', 'Volvo', 'Tesla', 'Buick']
    economy_makes = ['Kia', 'Hyundai', 'Mitsubishi', 'Nissan', 'Mazda']
    
    if make in luxury_makes:
        return 'luxury'
    elif make in premium_makes:
        return 'premium'
    elif make in economy_makes:
        return 'economy'
    else:
        return 'standard'


def get_maintenance_estimate(make: str, model: str, vehicle_tier: str, annual_mileage: int = 12000) -> dict:
    """Get maintenance cost estimates for the vehicle"""
    
    # Base monthly maintenance by tier
    base_maintenance = {
        'luxury': 180,
        'premium': 120,
        'standard': 80,
        'economy': 60
    }
    
    monthly_base = base_maintenance.get(vehicle_tier, 80)
    
    # Adjust for mileage (higher mileage = more maintenance)
    mileage_factor = annual_mileage / 12000
    monthly_adjusted = monthly_base * mileage_factor
    
    # Create breakdown
    if vehicle_tier == 'luxury':
        return {
            'monthly_total': monthly_adjusted,
            'annual_total': monthly_adjusted * 12,
            'oil_changes': 400,  # Annual - synthetic, dealer service
            'tires': 500,        # Annual amortized (high performance)
            'brakes': 300,       # Annual amortized
            'scheduled_maintenance': 800,  # Annual
            'repairs_reserve': 500,  # Annual unexpected repairs
            'tier_description': 'Luxury vehicles typically have higher maintenance costs due to premium parts, specialized service requirements, and dealer-only repairs.'
        }
    elif vehicle_tier == 'premium':
        return {
            'monthly_total': monthly_adjusted,
            'annual_total': monthly_adjusted * 12,
            'oil_changes': 280,
            'tires': 350,
            'brakes': 200,
            'scheduled_maintenance': 500,
            'repairs_reserve': 300,
            'tier_description': 'Premium vehicles have moderate-to-high maintenance costs with quality parts and some specialized service needs.'
        }
    elif vehicle_tier == 'economy':
        return {
            'monthly_total': monthly_adjusted,
            'annual_total': monthly_adjusted * 12,
            'oil_changes': 150,
            'tires': 200,
            'brakes': 120,
            'scheduled_maintenance': 200,
            'repairs_reserve': 150,
            'tier_description': 'Economy vehicles typically have the lowest maintenance costs with widely available, affordable parts.'
        }
    else:  # standard
        return {
            'monthly_total': monthly_adjusted,
            'annual_total': monthly_adjusted * 12,
            'oil_changes': 200,
            'tires': 280,
            'brakes': 150,
            'scheduled_maintenance': 350,
            'repairs_reserve': 200,
            'tier_description': 'Standard vehicles have average maintenance costs with readily available parts and competitive service pricing.'
        }


def display_salary_results(monthly_cost: float, state: str, filing_status: str = 'single'):
    """Display salary requirements across all affordability levels"""
    
    levels = [
        ('conservative', '10%', 'Recommended', '#4caf50', '#e8f5e9'),
        ('moderate', '15%', 'Comfortable', '#2196f3', '#e3f2fd'),
        ('aggressive', '20%', 'Maximum', '#ff9800', '#fff3e0'),
    ]
    
    cols = st.columns(3)
    
    for i, (level, percent, label, color, bg_color) in enumerate(levels):
        result = calculate_required_salary(monthly_cost, state, level, filing_status)
        
        with cols[i]:
            st.markdown(f"""
            <div style="background-color: {bg_color}; padding: 20px; border-radius: 10px; border-left: 5px solid {color}; text-align: center;">
                <p style="color: {color}; font-weight: bold; margin: 0; font-size: 14px;">{label} ({percent} of gross income)</p>
                <h2 style="margin: 10px 0; color: #333;">{format_currency(result['required_gross_annual'])}</h2>
                <p style="margin: 0; color: #666; font-size: 14px;">per year (gross salary)</p>
                <hr style="margin: 10px 0; border: none; border-top: 1px solid #ddd;">
                <p style="margin: 0; color: #888; font-size: 12px;">Take-home: ~{format_currency(result['monthly_take_home'])}/mo</p>
            </div>
            """, unsafe_allow_html=True)


def display_maintenance_breakdown(maintenance: dict, vehicle_tier: str):
    """Display maintenance cost breakdown"""
    
    st.markdown(f"""
    <div style="background-color: #f5f5f5; padding: 20px; border-radius: 10px; margin-top: 20px;">
        <h4 style="margin-top: 0;">Estimated Annual Maintenance Costs</h4>
        <p style="color: #666; font-style: italic;">{maintenance['tier_description']}</p>
    </div>
    """, unsafe_allow_html=True)
    
    col1, col2 = st.columns(2)
    
    with col1:
        st.markdown("**Routine Maintenance:**")
        st.markdown(f"- Oil Changes: {format_currency(maintenance['oil_changes'])}/year")
        st.markdown(f"- Tires (amortized): {format_currency(maintenance['tires'])}/year")
        st.markdown(f"- Brakes (amortized): {format_currency(maintenance['brakes'])}/year")
    
    with col2:
        st.markdown("**Other Costs:**")
        st.markdown(f"- Scheduled Service: {format_currency(maintenance['scheduled_maintenance'])}/year")
        st.markdown(f"- Repairs Reserve: {format_currency(maintenance['repairs_reserve'])}/year")
    
    st.markdown(f"""
    <div style="background-color: #e3f2fd; padding: 15px; border-radius: 8px; margin-top: 15px; text-align: center;">
        <span style="font-size: 18px; font-weight: bold; color: #1565c0;">
            Estimated Total: {format_currency(maintenance['annual_total'])}/year 
            ({format_currency(maintenance['monthly_total'])}/month)
        </span>
    </div>
    """, unsafe_allow_html=True)


def main():
    """Salary Requirements Calculator Page"""
    # Initialize session state
    initialize_session_state()
    
    # Apply CashPedal theme (handles device/dark mode detection)
    apply_theme()
    
    # Page header
    st.title("Salary Requirements Calculator")
    st.markdown("""
    Find out what salary you need to comfortably afford a vehicle. We'll calculate based on 
    the recommendation that **total vehicle costs should be 10-15% of your gross (pre-tax) income**.
    """)
    st.markdown("---")
    
    # Sidebar
    with st.sidebar:
        st.header("About This Calculator")
        st.info("""
        **What's included in vehicle costs:**
        - Monthly payment
        - Fuel (based on 10-12K miles/year)
        - Insurance
        - Maintenance
        - Registration/fees
        - Depreciation (for purchases)
        
        **Affordability Levels (% of gross income):**
        - **10%** - Conservative (recommended)
        - **15%** - Comfortable for most
        - **20%** - Upper limit
        """)
    
    # =========================================================================
    # STEP 1: Buy or Lease
    # =========================================================================
    st.subheader("Step 1: Are you looking to buy or lease?")
    
    transaction_type = st.radio(
        "Select transaction type:",
        ["Buy (Finance)", "Lease"],
        horizontal=True,
        label_visibility="collapsed"
    )
    
    is_lease = transaction_type == "Lease"
    
    st.markdown("---")
    
    # =========================================================================
    # STEP 2: Select Vehicle
    # =========================================================================
    st.subheader("Step 2: Select a vehicle")
    
    if is_lease:
        st.caption("Showing 2025 model year vehicles only (current year for leasing)")
        available_year = 2025
    else:
        st.caption("Select any available model year")
    
    # Vehicle selection - initialize all variables
    vehicle_price = 35000
    original_msrp = 35000
    vehicle_tier = 'standard'
    make = ""
    model = ""
    trim = "Base"
    mpg = 28
    year = 2025
    is_used_vehicle = False
    estimated_value = None
    
    if VEHICLE_DATABASE_AVAILABLE:
        col1, col2 = st.columns(2)
        
        with col1:
            manufacturers = get_all_manufacturers()
            make = st.selectbox("Make", ["-- Select Make --"] + manufacturers, key="salary_make")
            
            if make and make != "-- Select Make --":
                models = get_models_for_manufacturer(make)
                model = st.selectbox("Model", ["-- Select Model --"] + models, key="salary_model")
            else:
                make = ""
                model = st.selectbox("Model", ["-- Select Model --"], key="salary_model_empty", disabled=True)
                model = ""
        
        with col2:
            if make and model and model != "-- Select Model --":
                if is_lease:
                    # Lease: Only show 2025
                    year = 2025
                    st.selectbox("Year", [2025], key="salary_year_lease", disabled=True)
                else:
                    # Purchase: Show all available years
                    years = get_available_years_for_model(make, model)
                    if years:
                        year = st.selectbox(
                            "Year",
                            years,
                            key="salary_year",
                            on_change=on_year_change_salary
                        )
                    else:
                        year = 2025
                        st.selectbox("Year", [2025], key="salary_year_default")
                
                # Get trims for selected year
                trims = get_trims_for_vehicle(make, model, year)
                if trims:
                    trim_options = list(trims.keys())
                    trim = st.selectbox("Trim", trim_options, key="salary_trim")
                    vehicle_price = trims.get(trim, 35000)
                else:
                    trim = "Base"
                    vehicle_price = 35000
            else:
                year = 2025
                st.selectbox("Year", ["-- Select Year --"], key="salary_year_empty", disabled=True)
                trim = st.selectbox("Trim", ["-- Select Trim --"], key="salary_trim_empty", disabled=True)
        
        # Show vehicle summary if selected
        if make and model and make != "-- Select Make --" and model != "-- Select Model --":
            vehicle_tier = get_vehicle_tier(make)

            # Get MPG if available
            if MPG_DATABASE_AVAILABLE:
                mpg_data = get_vehicle_mpg(make, model, year, trim)
                if mpg_data:
                    mpg = mpg_data.get('combined', 28)

            tier_labels = {
                'luxury': 'Luxury',
                'premium': 'Premium',
                'standard': 'Standard',
                'economy': 'Economy'
            }

            # Store original MSRP
            original_msrp = vehicle_price
            estimated_value = None
            is_used_vehicle = False

            # Determine if vehicle is used and calculate mileage defaults
            vehicle_age = 2025 - year if year < 2025 else 0

            # Auto-estimate mileage based on age
            if vehicle_age == 0:
                estimated_mileage = 0
            else:
                estimated_mileage = vehicle_age * 12000

            # Add mileage input for used vehicles
            if vehicle_age > 0:
                st.markdown("---")
                col_m1, col_m2 = st.columns([1, 1])

                with col_m1:
                    current_mileage = st.number_input(
                        "Current Mileage:",
                        min_value=0,
                        max_value=300000,
                        value=estimated_mileage,
                        step=1000,
                        help="Enter actual odometer reading (auto-estimated at 12,000 miles/year)",
                        key="salary_current_mileage"
                    )

                    # Show mileage analysis
                    avg_annual = current_mileage / vehicle_age if vehicle_age > 0 else 0
                    if avg_annual < 10000:
                        mileage_note = "📊 Below average mileage"
                    elif avg_annual < 15000:
                        mileage_note = "📊 Average mileage"
                    else:
                        mileage_note = "📊 Above average mileage"
                    st.caption(f"{mileage_note} ({avg_annual:,.0f} miles/year)")

                with col_m2:
                    # Recalculate value with actual mileage
                    if USED_VEHICLE_ESTIMATOR_AVAILABLE:
                        try:
                            estimator = UsedVehicleEstimator()
                            estimated_value = estimator.estimate_current_value(
                                make=make,
                                model=model,
                                year=year,
                                trim=trim,
                                current_mileage=current_mileage
                            )

                            if estimated_value and estimated_value > 0:
                                vehicle_price = estimated_value
                                is_used_vehicle = True

                                # Show estimated value metric
                                depreciation_pct = ((original_msrp - estimated_value) / original_msrp * 100) if original_msrp > 0 else 0
                                st.metric(
                                    "Estimated Current Value",
                                    format_currency(estimated_value),
                                    delta=f"-{depreciation_pct:.1f}% from MSRP",
                                    delta_color="inverse"
                                )
                                st.caption(f"Original MSRP: {format_currency(original_msrp)}")
                        except Exception:
                            pass
            else:
                # New vehicle - no mileage input needed
                current_mileage = 0

            st.markdown("---")

            # Display vehicle summary
            if is_used_vehicle and estimated_value:
                st.success(f"**{year} {make} {model} {trim}** - Category: {tier_labels.get(vehicle_tier, 'Standard')}")
            else:
                st.success(f"**{year} {make} {model} {trim}** - MSRP: {format_currency(vehicle_price)} - Category: {tier_labels.get(vehicle_tier, 'Standard')}")
    else:
        st.warning("Vehicle database not available. Please enter vehicle details manually.")
        col1, col2 = st.columns(2)
        with col1:
            vehicle_price = st.number_input("Vehicle Price ($)", min_value=10000, max_value=200000, value=35000, step=1000)
            vehicle_tier = st.selectbox("Vehicle Category", ['economy', 'standard', 'premium', 'luxury'], index=1)
        with col2:
            mpg = st.number_input("Combined MPG", min_value=15, max_value=60, value=28)
        make = "Unknown"
        model = "Vehicle"
        year = 2025
    
    st.markdown("---")
    
    # =========================================================================
    # STEP 3: Select State
    # =========================================================================
    st.subheader("Step 3: What state do you live in?")
    st.caption("Your state affects income tax calculations")
    
    states = get_state_list()
    state_options = {f"{s['name']}": s['code'] for s in states}
    state_names = list(state_options.keys())
    
    # Default to California
    default_idx = state_names.index('California') if 'California' in state_names else 0
    
    selected_state_name = st.selectbox(
        "State",
        state_names,
        index=default_idx,
        label_visibility="collapsed"
    )
    state = state_options[selected_state_name]
    
    # Show tax info for selected state
    state_info = STATE_TAX_DATA.get(state, (0.05, selected_state_name, True))
    if not state_info[2]:  # No income tax
        st.info(f"{selected_state_name} has **no state income tax** - more of your paycheck stays with you!")
    elif state_info[0] >= 0.07:
        st.warning(f"{selected_state_name} has a higher state income tax rate ({state_info[0]*100:.1f}%)")
    
    st.markdown("---")
    
    # =========================================================================
    # STEP 4: Down Payment (Purchase only)
    # =========================================================================
    down_payment_percent = 0
    down_payment_amount = 0
    
    if not is_lease:
        st.subheader("Step 4: How much will you put down?")
        st.caption("A larger down payment reduces your monthly payment and required salary")
        
        # Only show if vehicle is selected
        if make and model and make != "-- Select Make --" and model != "-- Select Model --":
            col1, col2 = st.columns([2, 1])
            
            with col1:
                down_payment_percent = st.slider(
                    "Down Payment",
                    min_value=0,
                    max_value=100,
                    value=20,
                    step=5,
                    format="%d%%",
                    help="Percentage of vehicle price to pay upfront"
                )
            
            with col2:
                down_payment_amount = vehicle_price * (down_payment_percent / 100)
                loan_amount = vehicle_price - down_payment_amount
                
                st.markdown(f"""
                <div style="background-color: #f0f7ff; padding: 15px; border-radius: 8px; text-align: center; margin-top: 5px;">
                    <p style="margin: 0; color: #666; font-size: 12px;">Down Payment</p>
                    <p style="margin: 5px 0; font-size: 20px; font-weight: bold; color: #1565c0;">{format_currency(down_payment_amount)}</p>
                    <p style="margin: 0; color: #666; font-size: 12px;">Amount to Finance</p>
                    <p style="margin: 5px 0; font-size: 16px; color: #333;">{format_currency(loan_amount)}</p>
                </div>
                """, unsafe_allow_html=True)
            
            # Show impact message
            if down_payment_percent >= 50:
                st.success("Excellent! A 50%+ down payment significantly reduces your monthly costs and interest paid.")
            elif down_payment_percent >= 20:
                st.info("A 20%+ down payment is recommended to avoid being underwater on your loan.")
            elif down_payment_percent > 0:
                st.warning("Consider putting at least 20% down to reduce interest costs and build equity faster.")
            else:
                st.warning("Financing 100% of the vehicle will result in higher monthly payments and more interest paid.")
        else:
            st.info("Select a vehicle first to set your down payment.")
        
        st.markdown("---")
    
    # =========================================================================
    # CALCULATE RESULTS
    # =========================================================================
    
    # Only show results if vehicle is selected
    if make and model and make != "-- Select Make --" and model != "-- Select Model --":
        
        # Calculate vehicle costs with defaults
        annual_mileage = 12000  # Average mileage
        fuel_price = 3.50  # National average
        
        if is_lease:
            # Estimate lease payment (roughly 1.2-1.5% of MSRP for luxury, 1% for standard)
            if vehicle_tier == 'luxury':
                lease_payment = vehicle_price * 0.013
            elif vehicle_tier == 'premium':
                lease_payment = vehicle_price * 0.012
            else:
                lease_payment = vehicle_price * 0.011
            
            costs = estimate_vehicle_costs_simple(
                vehicle_price=vehicle_price,
                annual_mileage=annual_mileage,
                fuel_price=fuel_price,
                mpg=mpg,
                is_lease=True,
                lease_payment=lease_payment,
                vehicle_age=0,
                vehicle_tier=vehicle_tier
            )
        else:
            costs = estimate_vehicle_costs_simple(
                vehicle_price=vehicle_price,
                annual_mileage=annual_mileage,
                fuel_price=fuel_price,
                mpg=mpg,
                is_lease=False,
                loan_term_years=5,
                interest_rate=6.5,
                down_payment_percent=down_payment_percent,
                vehicle_age=0 if year == 2025 else (2025 - year),
                vehicle_tier=vehicle_tier
            )
        
        monthly_cost = costs['recommended_monthly_cost']
        
        # Display Results Header
        st.subheader(f"Salary Required for {year} {make} {model}")
        
        # Show calculation summary
        if is_lease:
            st.markdown(f"""
            Based on **{format_currency(monthly_cost)}/month** in total ownership costs 
            (lease, 12,000 miles/year, normal driving):
            """)
        else:
            # Check if this is a used vehicle with estimated value
            price_basis = ""
            if is_used_vehicle:
                price_basis = f" on est. value of {format_currency(vehicle_price)}"
            
            if down_payment_percent > 0:
                st.markdown(f"""
                Based on **{format_currency(monthly_cost)}/month** in total ownership costs 
                ({down_payment_percent}% down payment of {format_currency(down_payment_amount)}{price_basis}, 
                5-year loan at 6.5% APR, 12,000 miles/year):
                """)
            else:
                st.markdown(f"""
                Based on **{format_currency(monthly_cost)}/month** in total ownership costs 
                (no down payment{price_basis}, 5-year loan at 6.5% APR, 12,000 miles/year):
                """)
        
        # Show monthly cost breakdown summary
        with st.expander("View Monthly Cost Breakdown"):
            breakdown_col1, breakdown_col2 = st.columns(2)
            with breakdown_col1:
                st.markdown(f"- **Car Payment:** {format_currency(costs['vehicle_payment'])}")
                st.markdown(f"- **Fuel:** {format_currency(costs['fuel_cost'])}")
                st.markdown(f"- **Insurance:** {format_currency(costs['insurance_cost'])}")
            with breakdown_col2:
                st.markdown(f"- **Maintenance:** {format_currency(costs['maintenance_cost'])}")
                st.markdown(f"- **Registration/Fees:** {format_currency(costs['registration_cost'])}")
                if not is_lease and costs.get('depreciation_cost', 0) > 0:
                    st.markdown(f"- **Depreciation:** {format_currency(costs['depreciation_cost'])}")
            
            st.markdown(f"**Total Monthly Cost: {format_currency(monthly_cost)}**")
        
        # Display salary ranges
        display_salary_results(monthly_cost, state, 'single')
        
        st.markdown("---")
        
        # Display maintenance costs
        maintenance = get_maintenance_estimate(make, model, vehicle_tier, annual_mileage)
        display_maintenance_breakdown(maintenance, vehicle_tier)
        
        st.markdown("---")
        
        # Call to action for full calculator
        st.markdown("""
        <div style="background-color: #e8f5e9; padding: 25px; border-radius: 10px; text-align: center; border: 2px solid #4caf50;">
            <h3 style="color: #2e7d32; margin-top: 0;">Want More Details?</h3>
            <p style="color: #333; font-size: 16px; margin-bottom: 15px;">
                Get a complete cost breakdown including depreciation projections, insurance estimates, 
                fuel costs by location, and year-by-year analysis.
            </p>
        </div>
        """, unsafe_allow_html=True)
        
        col1, col2, col3 = st.columns([1, 2, 1])
        with col2:
            if st.button("Try the Full Vehicle Cost Calculator", type="primary", width="stretch"):
                st.switch_page("pages/4______Single_Car_Ownership_Calculator.py")
    
    else:
        # Prompt to select vehicle
        st.info("Please select a vehicle above to see salary requirements.")
    
    # Footer
    st.markdown("---")
    st.markdown(get_footer_html(), unsafe_allow_html=True)


if __name__ == "__main__":
    main()
