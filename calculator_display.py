"""Calculator display and helper functions used across pages/forms."""

from typing import Any, Dict, List

import streamlit as st

from input_forms import collect_all_form_data, display_all_forms_visible
from prediction_service import PredictionService
from session_manager import add_vehicle_to_comparison, save_calculation_results
from vehicle_helpers import (
    detect_electric_vehicle,
    determine_fuel_type_and_price,
    get_electricity_rate_from_location,
    get_fuel_price_from_location,
    get_premium_fuel_price,
    get_vehicle_energy_type,
)


def clean_maintenance_services(services: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
    """Remove invalid/duplicate maintenance entries."""
    if not services:
        return []

    valid: List[Dict[str, Any]] = []
    seen = set()
    for item in services:
        if not isinstance(item, dict):
            continue
        name = str(item.get("service", "")).strip()
        total = float(item.get("total_cost", item.get("cost", 0)) or 0)
        if not name or total <= 0:
            continue
        normalized = name.lower()
        if normalized in seen:
            continue
        seen.add(normalized)
        valid.append(item)
    return valid


def calculate_blended_electricity_rate(base_rate: float, charging_preference: str) -> Dict[str, Any]:
    """Return a simple blended electricity rate estimate."""
    multipliers = {"home_primary": 1.0, "mixed": 1.25, "public_heavy": 1.6}
    m = multipliers.get(charging_preference, 1.25)
    return {
        "base_rate": base_rate,
        "charging_preference": charging_preference,
        "blended_rate": base_rate * m,
    }


def display_charging_preference_form(
    electricity_rate: float = None, state: str = None
) -> Dict[str, Any]:
    """Render EV charging preference controls and return selected settings."""
    default_rate = electricity_rate if electricity_rate is not None else get_electricity_rate_from_location(state=state)
    charging_preference = st.selectbox(
        "Charging Preference",
        ["home_primary", "mixed", "public_heavy"],
        index=1,
        help="Home charging is usually cheaper than public fast charging.",
    )
    blended = calculate_blended_electricity_rate(default_rate, charging_preference)
    st.caption(f"Estimated blended electricity rate: ${blended['blended_rate']:.3f}/kWh")
    return {
        "charging_preference": charging_preference,
        "electricity_rate": default_rate,
        "blended_electricity_rate": blended["blended_rate"],
    }


def display_fuel_cost_estimate(
    mpg_data: Dict[str, Any],
    annual_mileage: int,
    fuel_price: float,
    electricity_rate: float = 0.12,
    charging_preference: str = "mixed",
    driving_style: str = "normal",
    terrain: str = "flat",
):
    """Display basic fuel/energy estimate using provided efficiency metrics."""
    if not mpg_data or annual_mileage <= 0:
        return None

    if mpg_data.get("is_electric"):
        mpge = max(float(mpg_data.get("mpge_combined", 100)), 1)
        kwh_per_mile = 33.7 / mpge
        annual_cost = annual_mileage * kwh_per_mile * electricity_rate
    else:
        mpg = max(float(mpg_data.get("combined", 25)), 1)
        annual_cost = (annual_mileage / mpg) * fuel_price

    st.metric("Estimated Annual Fuel/Energy", f"${annual_cost:,.0f}")
    return {"annual_cost": annual_cost}


def display_location_energy_info(
    zip_code: str = None,
    state: str = None,
    make: str = None,
    model: str = None,
    trim: str = None,
):
    """Show detected energy type and local price assumptions."""
    fuel_info = determine_fuel_type_and_price(
        make=make or "", model=model or "", year=2024, trim=trim or "", zip_code=zip_code, state=state
    )
    st.caption(
        f"Fuel type: {fuel_info.get('fuel_type', 'unknown')} | "
        f"Fuel price: ${fuel_info.get('fuel_price', 0):.2f}/gal"
    )


def _render_results(results: Dict[str, Any], vehicle_data: Dict[str, Any]) -> None:
    total_cost = float(results.get("total_cost_of_ownership", 0) or 0)
    monthly_cost = float(results.get("monthly_total_cost", 0) or 0)
    ownership_years = int(vehicle_data.get("analysis_years", 5) or 5)

    col1, col2, col3 = st.columns(3)
    col1.metric("Total Cost of Ownership", f"${total_cost:,.0f}")
    col2.metric("Monthly Ownership Cost", f"${monthly_cost:,.0f}")
    col3.metric("Analysis Horizon", f"{ownership_years} years")

    breakdown = results.get("category_totals", {})
    if isinstance(breakdown, dict) and breakdown:
        st.subheader("Cost Breakdown")
        for k, v in breakdown.items():
            st.write(f"- **{k.replace('_', ' ').title()}**: ${float(v):,.0f}")


def display_calculator() -> None:
    """Primary calculator UI used by the single-vehicle page."""
    st.subheader("Vehicle TCO Calculator")

    # Keep all fields visible in a single workflow.
    vehicle_data, is_valid, validation_message = display_all_forms_visible()

    if not is_valid:
        if validation_message:
            st.warning(validation_message)
        return

    if st.button("Calculate TCO", type="primary"):
        with st.spinner("Running ownership cost analysis..."):
            service = PredictionService()
            results = service.calculate_total_cost_of_ownership(vehicle_data)

        save_calculation_results(vehicle_data, results)
        _render_results(results, vehicle_data)

        if st.button("Add to Comparison"):
            add_vehicle_to_comparison(vehicle_data, results)
            st.success("Vehicle added to comparison list.")


# Backward-compatible entry points used elsewhere in the app

def display_enhanced_basic_calculator():
    display_calculator()


def calculate_enhanced_tco(*args, **kwargs):
    service = PredictionService()
    if args and isinstance(args[0], dict):
        return service.calculate_total_cost_of_ownership(args[0])
    return service.calculate_total_cost_of_ownership(kwargs)


def display_full_featured_calculator():
    display_calculator()


def display_quick_summary():
    st.info("Run a calculation to view summary metrics.")


def display_detailed_results_with_maintenance():
    st.info("Detailed results are shown after running calculation.")


def display_summary_tab(results: Dict[str, Any], vehicle_data: Dict[str, Any]):
    _render_results(results, vehicle_data)


def display_visualizations(results: Dict[str, Any], vehicle_data: Dict[str, Any]):
    _render_results(results, vehicle_data)


def display_cost_breakdown(results: Dict[str, Any], vehicle_data: Dict[str, Any]):
    _render_results(results, vehicle_data)


def display_cost_breakdown_clean(results: Dict[str, Any], vehicle_data: Dict[str, Any]):
    _render_results(results, vehicle_data)


def display_recommendations_tab(results: Dict[str, Any], vehicle_data: Dict[str, Any]):
    st.info("Recommendations will appear here based on cost inputs and outcomes.")
