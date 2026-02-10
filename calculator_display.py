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

    # User-friendly charging preference options
    charging_options = {
        "Mostly home charging (80% home, 20% public)": "home_primary",
        "Mix of home and public charging (60% home, 40% public)": "mixed",
        "Mostly public charging (40% home, 60% public)": "public_heavy"
    }

    st.subheader("EV Charging Breakdown")
    st.write("How do you plan to charge your electric vehicle?")

    selected_label = st.radio(
        "Select your charging preference:",
        options=list(charging_options.keys()),
        index=1,  # Default to "mixed"
        help="Home charging is typically cheaper than public fast charging. Your selection affects electricity cost estimates.",
    )

    # Map the user-friendly label back to internal key
    charging_preference = charging_options[selected_label]

    blended = calculate_blended_electricity_rate(default_rate, charging_preference)

    # Show rate breakdown
    col1, col2 = st.columns(2)
    with col1:
        st.metric("Base Home Rate", f"${default_rate:.3f}/kWh")
    with col2:
        st.metric("Blended Rate", f"${blended['blended_rate']:.3f}/kWh")

    st.caption("💡 The blended rate accounts for higher costs when using public charging stations.")

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


def _find_affordable_alternatives(
    current_vehicle: Dict[str, Any],
    affordability: Dict[str, Any],
    max_monthly_affordable: float,
    ownership_years: int = 5
) -> List[Dict[str, Any]]:
    """Find affordable alternative vehicles based on affordability constraints

    Args:
        current_vehicle: Current vehicle data including make, model, year, price
        affordability: Affordability analysis results
        max_monthly_affordable: Maximum affordable monthly cost
        ownership_years: Analysis period in years

    Returns:
        List of alternative vehicle recommendations
    """
    from vehicle_database import search_vehicles_by_price_range, get_vehicle_characteristics
    from recommendation_engine import RecommendationEngine

    # Calculate target annual cost (convert monthly to annual)
    target_annual_cost = max_monthly_affordable * 12

    # Get current vehicle price and segment
    current_price = current_vehicle.get('price', current_vehicle.get('trim_msrp', 30000))
    current_segment = current_vehicle.get('market_segment', 'sedan')
    current_year = current_vehicle.get('year', 2024)

    # Search for vehicles with lower purchase price
    # Target vehicles that cost 20-40% less to achieve meaningful savings
    target_price_reduction = 0.30  # 30% reduction
    max_alternative_price = current_price * (1 - target_price_reduction)
    min_alternative_price = max(15000, max_alternative_price * 0.5)  # Don't go too low

    # Find vehicles in target price range
    alternative_vehicles = search_vehicles_by_price_range(
        min_price=min_alternative_price,
        max_price=max_alternative_price,
        year=current_year
    )

    # Get recommendation engine for reliability scores
    rec_engine = RecommendationEngine()

    # Score and filter alternatives
    recommendations = []
    for vehicle in alternative_vehicles[:50]:  # Limit to first 50 to avoid excessive processing
        make = vehicle['make']
        model = vehicle['model']

        # Get vehicle characteristics
        try:
            characteristics = get_vehicle_characteristics(make, model, current_year)
            vehicle_segment = characteristics.get('market_segment', 'sedan')

            # Get reliability score
            reliability = rec_engine.brand_reliability.get(make, 3.5)

            # Calculate estimated annual operating cost reduction
            # Rough estimate: lower price = lower insurance, depreciation
            price_ratio = vehicle['price'] / current_price
            estimated_savings_pct = (1 - price_ratio) * 0.4  # 40% of price difference affects operating costs

            # Prefer vehicles in similar segment and higher reliability
            segment_match = 1.0 if vehicle_segment == current_segment else 0.7
            reliability_score = reliability / 5.0  # Normalize to 0-1

            # Overall score
            overall_score = (estimated_savings_pct * 0.5 + reliability_score * 0.3 + segment_match * 0.2)

            recommendations.append({
                'make': make,
                'model': model,
                'year': vehicle['year'],
                'trim': vehicle['trim'],
                'price': vehicle['price'],
                'estimated_savings_pct': estimated_savings_pct * 100,
                'segment': vehicle_segment,
                'reliability': reliability,
                'score': overall_score
            })
        except Exception:
            # Skip vehicles that cause errors
            continue

    # Sort by score and return top recommendations
    recommendations.sort(key=lambda x: x['score'], reverse=True)
    return recommendations[:5]  # Return top 5 alternatives


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

    # --- Affordability Analysis ---
    affordability = results.get("affordability", {})
    if affordability:
        st.markdown("---")

        percentage = affordability.get("percentage_of_income", 0)
        rating = affordability.get("affordability_rating", "Unknown")
        is_affordable = affordability.get("is_affordable", False)
        threshold_desc = affordability.get("threshold_description", "Standard")
        max_pct = affordability.get("recommended_max_percentage", 20)

        # Determine alert type based on affordability
        if is_affordable and rating in ["Excellent", "Very Good"]:
            alert_type = "success"
            icon = "✅"
        elif is_affordable:
            alert_type = "info"
            icon = "ℹ️"
        else:
            alert_type = "warning"
            icon = "⚠️"

        # Display affordability message
        affordability_message = f"""
        {icon} **Affordability Assessment: {rating}**

        Your annual operating costs represent **{percentage:.1f}%** of your gross annual income.

        - **Recommended Maximum:** {max_pct:.1f}% ({threshold_desc})
        - **Your Monthly Cost:** ${affordability.get('monthly_cost', 0):,.0f}
        - **Recommended Max Monthly:** ${affordability.get('recommended_max_monthly', 0):,.0f}
        """

        if alert_type == "success":
            st.success(affordability_message)
        elif alert_type == "info":
            st.info(affordability_message)
        else:
            st.warning(affordability_message)

        # Additional context
        with st.expander("📊 Understanding Affordability Guidelines"):
            st.markdown("""
            **Affordability guidelines vary based on your location and age:**

            - **Low Cost of Living States:** Vehicle operating costs should not exceed **20%** of gross annual income
            - **High Cost of Living States (Under 26):** Up to **27.5%** may be acceptable due to higher housing costs and entry-level salaries
            - **High Cost of Living States (26+):** Standard **15-20%** range is recommended

            **High Cost of Living States include:** CA, HI, MA, NY, NJ, CT, MD, WA, OR, CO, NH, VA, RI, VT, AK, DC

            These guidelines are based on financial planning best practices and help ensure you can comfortably afford your vehicle while meeting other financial obligations.
            """)

        # Show alternative recommendations if vehicle is unaffordable
        if not is_affordable:
            st.markdown("---")
            st.subheader("💡 More Affordable Alternative Vehicles")

            with st.spinner("Finding affordable alternatives..."):
                try:
                    alternatives = _find_affordable_alternatives(
                        current_vehicle=vehicle_data,
                        affordability=affordability,
                        max_monthly_affordable=affordability.get('recommended_max_monthly', 0),
                        ownership_years=ownership_years
                    )

                    if alternatives:
                        st.info(
                            f"Based on your budget of **${affordability.get('recommended_max_monthly', 0):,.0f}/month**, "
                            "here are some vehicles that may be more affordable:"
                        )

                        for i, alt in enumerate(alternatives, 1):
                            with st.expander(
                                f"**{i}. {alt['year']} {alt['make']} {alt['model']} {alt['trim']}** - "
                                f"${alt['price']:,.0f} (Est. {alt['estimated_savings_pct']:.0f}% savings)",
                                expanded=(i == 1)  # Expand first recommendation
                            ):
                                col1, col2, col3 = st.columns(3)

                                with col1:
                                    st.metric("MSRP", f"${alt['price']:,.0f}")
                                    st.caption(f"**Segment:** {alt['segment'].title()}")

                                with col2:
                                    st.metric("Est. Annual Savings", f"{alt['estimated_savings_pct']:.0f}%")
                                    st.caption("vs. current selection")

                                with col3:
                                    st.metric("Reliability Score", f"{alt['reliability']:.1f}/5.0")
                                    st.caption(f"**Brand:** {alt['make']}")

                                st.markdown("---")
                                st.caption(
                                    f"💡 **Why this alternative?** Lower purchase price typically means lower insurance, "
                                    f"depreciation, and financing costs. The {alt['make']} {alt['model']} has a strong "
                                    f"reliability rating of {alt['reliability']:.1f}/5.0, making it a dependable choice."
                                )

                        st.info(
                            "💡 **Tip:** These are rough estimates. To see exact TCO calculations for any of these "
                            "vehicles, select them in the calculator above and run a new analysis."
                        )
                    else:
                        st.info(
                            "No specific alternatives found in our database at this time. Consider looking for vehicles "
                            "with lower MSRP, better fuel efficiency, or models known for lower insurance costs."
                        )
                except Exception as e:
                    st.error(f"Unable to generate recommendations at this time. Error: {str(e)}")

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

            # Annual Taxes & Fees Breakdown for All Years
            st.markdown("---")
            st.subheader("Annual Taxes & Fees Breakdown")

            # Year 1 - Detailed upfront costs
            year_1_data = annual_breakdown[0] if annual_breakdown else None
            if year_1_data and year_1_data.get("taxes_fees_detail"):
                with st.expander("📋 Year 1 - Purchase Taxes & Fees", expanded=True):
                    detail = year_1_data["taxes_fees_detail"]

                    col1, col2, col3 = st.columns(3)

                    with col1:
                        st.metric("Sales Tax", f"${detail.get('sales_tax', 0):,.0f}")
                        if detail.get('sales_tax_rate'):
                            st.caption(f"Rate: {detail['sales_tax_rate']*100:.2f}%")

                    with col2:
                        st.metric("Destination Charge", f"${detail.get('destination_charge', 0):,.0f}")

                    with col3:
                        st.metric("Registration Fee", f"${detail.get('registration_fee', 0):,.0f}")

                    col4, col5, col6 = st.columns(3)

                    with col4:
                        st.metric("Doc Fee", f"${detail.get('doc_fee', 0):,.0f}")

                    with col5:
                        st.metric("Title Fee", f"${detail.get('title_fee', 0):,.0f}")

                    with col6:
                        st.metric("Total Year 1", f"${detail.get('total_taxes_and_fees', 0):,.0f}")

                    # Additional details
                    st.caption(f"**State:** {detail.get('state', 'N/A')} | **Vehicle Status:** {'New' if detail.get('is_new', True) else 'Used'}")
                    if detail.get('trade_in_applied') and not detail.get('trade_in_credit_allowed'):
                        st.caption("⚠️ Note: This state does not allow trade-in credit to reduce sales tax.")

            # Years 2+ - Annual recurring fees
            for entry in annual_breakdown[1:]:
                year_num = entry.get('year', 0)
                detail = entry.get('taxes_fees_detail')

                if detail:
                    reg_fee = detail.get('registration_renewal', 0)
                    smog_fee = detail.get('smog_test', 0)
                    total = detail.get('total', reg_fee + smog_fee)
                    vehicle_age = detail.get('vehicle_age', 0)

                    with st.expander(f"🔄 Year {year_num} - Annual Government Fees (Vehicle Age: {vehicle_age} years)"):
                        col1, col2, col3 = st.columns(3)

                        with col1:
                            st.metric("DMV Registration Renewal", f"${reg_fee:,.0f}")

                        with col2:
                            if smog_fee > 0:
                                st.metric("Smog/Emissions Test", f"${smog_fee:,.0f}")
                            else:
                                st.metric("Smog/Emissions Test", "Not Required")

                        with col3:
                            st.metric("Total Year " + str(year_num), f"${total:,.0f}")

                        if smog_fee == 0:
                            st.caption("💨 Smog test not required this year (check your state's requirements)")
                        else:
                            st.caption(f"💨 Smog test required in {detail.get('state', 'your state')}")
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
