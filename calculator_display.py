"""Calculator display and helper functions used across pages/forms."""

from typing import Any, Dict, List

import streamlit as st

from input_forms import collect_all_form_data, display_all_forms_visible
from prediction_service import PredictionService
from session_manager import add_vehicle_to_comparison, save_calculation_results
from vehicle_helpers import (
    detect_electric_vehicle,
    determine_fuel_type_and_price,
    display_vehicle_mpg_info,
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
    import pandas as pd

    summary = results.get("summary", {})
    ownership_years = int(vehicle_data.get("analysis_years", 5) or 5)

    # Purchase results use 'total_tco'; lease results use 'total_lease_cost'
    total_tco = float(
        summary.get("total_tco", 0)
        or summary.get("total_lease_cost", 0)
        or 0
    )

    # Out-of-pocket total (TCO minus depreciation)
    category_totals = results.get("category_totals", {})
    total_depreciation = float(category_totals.get("depreciation", 0))
    total_out_of_pocket = total_tco - total_depreciation

    # Monthly out-of-pocket cost (what you actually pay each month)
    monthly_oop = total_out_of_pocket / (ownership_years * 12) if ownership_years > 0 else 0

    # --- Summary metrics ---
    col1, col2, col3, col4 = st.columns(4)
    col1.metric("Total Cost of Ownership", f"${total_tco:,.0f}")
    col2.metric("Total Out-of-Pocket Cost", f"${total_out_of_pocket:,.0f}")
    col3.metric("Monthly Out-of-Pocket", f"${monthly_oop:,.0f}")
    col4.metric("Analysis Horizon", f"{ownership_years} years")

    # --- Tabs ---
    tab_breakdown, tab_annual, tab_maintenance = st.tabs(
        ["Cost Breakdown", "Annual Costs", "Maintenance Schedule"]
    )

    # ---- Tab 1: Category totals ----
    category_totals = results.get("category_totals", {})
    with tab_breakdown:
        if isinstance(category_totals, dict) and category_totals:
            for k, v in category_totals.items():
                st.write(f"- **{k.replace('_', ' ').title()}**: ${float(v):,.0f}")
        else:
            st.info("No cost breakdown data available.")

    # ---- Tab 2: Year-by-year cost table ----
    annual_breakdown = results.get("annual_breakdown", [])
    with tab_annual:
        if annual_breakdown:
            # Out-of-pocket categories (depreciation is informational, not cash spent)
            oop_categories = [
                "maintenance", "insurance",
                "fuel_energy", "financing", "taxes_fees",
            ]
            rows: List[Dict[str, Any]] = []
            for entry in annual_breakdown:
                row: Dict[str, Any] = {"Year": int(entry.get("year", 0))}
                # Show depreciation for reference but exclude from the total
                row["Depreciation*"] = float(entry.get("depreciation", 0))
                for cat in oop_categories:
                    row[cat.replace("_", " ").title()] = float(entry.get(cat, 0))
                # Annual total = only out-of-pocket costs
                row["Annual Total"] = sum(
                    float(entry.get(cat, 0)) for cat in oop_categories
                )
                rows.append(row)

            df = pd.DataFrame(rows).set_index("Year")
            st.dataframe(
                df.style.format("${:,.0f}"),
                use_container_width=True,
            )
            st.caption(
                r"\*Depreciation is shown for reference but is **not** included "
                "in the Annual Total. It represents value loss, not an out-of-pocket expense."
            )
        else:
            st.info("No annual breakdown data available.")

    # ---- Tab 3: Maintenance schedule per year ----
    with tab_maintenance:
        if annual_breakdown:
            for entry in annual_breakdown:
                yr = entry.get("year", "?")
                activities = entry.get("maintenance_activities", [])
                cleaned = clean_maintenance_services(activities)
                year_total = float(entry.get("maintenance", 0))

                with st.expander(
                    f"Year {yr}  —  ${year_total:,.0f}", expanded=(yr == 1)
                ):
                    if cleaned:
                        for svc in cleaned:
                            name = svc.get("service", "Service")
                            cost = float(
                                svc.get("total_cost", svc.get("cost_per_service", 0))
                            )
                            st.write(f"- {name}: **${cost:,.0f}**")
                    else:
                        st.caption("No scheduled services this year.")
        else:
            st.info("No maintenance schedule data available.")


def display_calculator() -> None:
    """Primary calculator UI used by the single-vehicle page."""
    st.subheader("Vehicle TCO Calculator")

    mode = st.radio("Form Mode", ["Step-by-step", "All sections"], horizontal=True)
    if mode == "All sections":
        vehicle_data, is_valid, validation_message = display_all_forms_visible()
    else:
        vehicle_data, is_valid, validation_message = collect_all_form_data()

    if not is_valid:
        if validation_message:
            st.warning(validation_message)
        return

    make = vehicle_data.get("make", "")
    model = vehicle_data.get("model", "")
    if make and model:
        display_vehicle_mpg_info(make, model)

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
