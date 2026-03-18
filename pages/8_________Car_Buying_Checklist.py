"""
Car Buying Checklist Page
Generates maintenance checklist for used car purchases based on vehicle info
"""

import streamlit as st
import sys
import os

# Add parent directory to path for imports
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from session_manager import initialize_session_state
from theme_utils import apply_theme, get_footer_html
from car_buying_checklist import CarBuyingChecklist, format_currency, format_mileage

# Try to import vehicle database
try:
    from vehicle_database import (
        get_all_manufacturers,
        get_models_for_manufacturer,
        get_available_years_for_model,
        get_trims_for_vehicle,
        get_vehicle_trim_price,
    )
    VEHICLE_DATABASE_AVAILABLE = True
except ImportError:
    VEHICLE_DATABASE_AVAILABLE = False

# Try to import used vehicle estimator
try:
    from used_vehicle_estimator import UsedVehicleEstimator
    VEHICLE_ESTIMATOR_AVAILABLE = True
except ImportError:
    VEHICLE_ESTIMATOR_AVAILABLE = False

# Page configuration
st.set_page_config(
    page_title="Car Buying Checklist - CashPedal",
    page_icon="✅",
    layout="wide",
    initial_sidebar_state="expanded"
)


def display_sidebar_guide():
    """Display sidebar with guide and tips"""
    with st.sidebar:
        st.header("📋 Buying Guide")

        st.markdown("""
        ### How It Works
        1. **Enter vehicle details** from the listing
        2. **Review maintenance history** that should have been done
        3. **Get inspection questions** to ask the seller
        4. **See upcoming maintenance** costs

        ### What You'll Get
        - Complete maintenance checklist based on mileage
        - Critical questions to ask the seller
        - Estimated maintenance costs
        - Buying insights and red flags

        ### Tips
        - Always request service records
        - Get a pre-purchase inspection
        - Check for timing belt replacement (if applicable)
        - Verify no warning lights on dashboard
        """)

        # Session status
        st.markdown("---")
        st.caption("🚗 Smart Car Buying Tool")


def display_url_scraper():
    """Display URL scraping section"""
    st.subheader("🔗 Option 1: Paste Vehicle Listing URL")

    url = st.text_input(
        "Enter URL from listing site (CarGurus, AutoTrader, Craigslist, etc.)",
        placeholder="https://www.cargurus.com/Cars/inventorylisting/...",
        help="We'll try to extract vehicle information from the listing"
    )

    if st.button("🔍 Extract Info from URL", type="primary", disabled=not url):
        with st.spinner("Extracting vehicle information..."):
            checklist = CarBuyingChecklist()
            car_info = checklist.extract_car_info_from_url(url)

            if car_info.get('extraction_success'):
                if car_info.get('used_playwright'):
                    st.success("✅ Successfully extracted vehicle information using browser automation!")
                else:
                    st.success("✅ Successfully extracted vehicle information!")

                # Store in session state
                st.session_state['extracted_car_info'] = car_info

                # Display extracted info
                col1, col2, col3, col4 = st.columns(4)
                with col1:
                    st.metric("Year", car_info.get('year', 'N/A'))
                with col2:
                    st.metric("Make", car_info.get('make', 'N/A'))
                with col3:
                    st.metric("Model", car_info.get('model', 'N/A'))
                with col4:
                    st.metric("Mileage", format_mileage(car_info.get('mileage', 0)) if car_info.get('mileage') else 'N/A')

                # Show debug info if some fields are missing
                if not all([car_info.get('make'), car_info.get('model'), car_info.get('year'), car_info.get('mileage')]):
                    st.warning("⚠️ Some information couldn't be extracted. Please fill in the missing details below.")

                    # Show debug info in expander
                    if car_info.get('debug_info'):
                        with st.expander("🔍 Debug Info (for troubleshooting)"):
                            debug = car_info['debug_info']
                            st.caption(f"**Page Title:** {debug.get('title', 'Not found')}")
                            st.caption(f"**Meta Description:** {debug.get('meta_desc', 'Not found')}")
                            st.caption(f"**Found Make:** {'✓' if debug.get('found_make') else '✗'}")
                            st.caption(f"**Found Model:** {'✓' if debug.get('found_model') else '✗'}")
                            st.caption(f"**Found Year:** {'✓' if debug.get('found_year') else '✗'}")
                            st.caption(f"**Found Mileage:** {'✓' if debug.get('found_mileage') else '✗'}")
            else:
                st.error(f"❌ Couldn't extract vehicle information.")
                st.error(f"**Error:** {car_info.get('error', 'Unknown error')}")

                # Provide helpful guidance based on error
                if '403' in str(car_info.get('error', '')):
                    st.info("💡 **Tip:** This dealership website is blocking automated requests. Please copy and paste the vehicle details manually below.")
                elif '404' in str(car_info.get('error', '')):
                    st.info("💡 **Tip:** The listing may have been removed or the URL is incorrect. Please check the link and try again.")
                else:
                    st.info("💡 **Tip:** Please use the manual entry option below instead.")


def display_manual_entry():
    """Display manual vehicle entry form"""
    st.subheader("📝 Enter Vehicle Details")

    # Pre-fill with extracted info if available
    extracted_info = st.session_state.get('extracted_car_info', {})

    col1, col2 = st.columns(2)

    with col1:
        # Make selection
        if VEHICLE_DATABASE_AVAILABLE:
            makes = [''] + sorted(get_all_manufacturers())
            default_make_idx = 0
            if extracted_info.get('make') in makes:
                default_make_idx = makes.index(extracted_info['make'])

            make = st.selectbox(
                "Make *",
                options=makes,
                index=default_make_idx,
                help="Select the vehicle manufacturer"
            )
        else:
            make = st.text_input(
                "Make *",
                value=extracted_info.get('make', ''),
                placeholder="e.g., Toyota, Honda, BMW"
            )

        # Model selection
        if VEHICLE_DATABASE_AVAILABLE and make:
            models = [''] + sorted(get_models_for_manufacturer(make))
            model = st.selectbox(
                "Model *",
                options=models,
                help="Select the vehicle model"
            )
        else:
            model = st.text_input(
                "Model *",
                value=extracted_info.get('model', '') if extracted_info.get('model') else '',
                placeholder="e.g., Camry, Accord, 3 Series"
            )

    with col2:
        # Year selection (dropdown when database available and make/model selected)
        if VEHICLE_DATABASE_AVAILABLE and make and model:
            available_years = get_available_years_for_model(make, model)
            if available_years:
                # Sort years in descending order (newest first)
                years = [''] + sorted(available_years, reverse=True)
                default_year_idx = 0
                if extracted_info.get('year') in available_years:
                    default_year_idx = years.index(extracted_info['year'])

                year_str = st.selectbox(
                    "Year *",
                    options=years,
                    index=default_year_idx,
                    help="Select the model year"
                )
                year = int(year_str) if year_str else None
            else:
                # Fallback to number input if no years found
                year = st.number_input(
                    "Year *",
                    min_value=1990,
                    max_value=2027,
                    value=extracted_info.get('year', 2020) if extracted_info.get('year') else 2020,
                    step=1,
                    help="Model year of the vehicle"
                )
        else:
            # Fallback to number input if database not available or make/model not selected
            year = st.number_input(
                "Year *",
                min_value=1990,
                max_value=2027,
                value=extracted_info.get('year', 2020) if extracted_info.get('year') else 2020,
                step=1,
                help="Model year of the vehicle"
            )

        # Trim selection (dropdown when database available)
        if VEHICLE_DATABASE_AVAILABLE and make and model and year:
            trims_dict = get_trims_for_vehicle(make, model, year)
            if trims_dict:
                trim_options = [''] + list(trims_dict.keys())
                default_trim_idx = 0
                if extracted_info.get('trim') in trim_options:
                    default_trim_idx = trim_options.index(extracted_info['trim'])

                trim = st.selectbox(
                    "Trim *",
                    options=trim_options,
                    index=default_trim_idx,
                    help="Select the trim level"
                )
            else:
                # Fallback to text input if no trims found
                trim = st.text_input(
                    "Trim (optional)",
                    value=extracted_info.get('trim', '') if extracted_info.get('trim') else '',
                    placeholder="e.g., LE, EX, Sport"
                )
        else:
            trim = st.text_input(
                "Trim (optional)",
                value=extracted_info.get('trim', '') if extracted_info.get('trim') else '',
                placeholder="e.g., LE, EX, Sport"
            )

        # Mileage
        mileage = st.number_input(
            "Current Mileage *",
            min_value=0,
            max_value=500000,
            value=extracted_info.get('mileage', 50000) if extracted_info.get('mileage') else 50000,
            step=1000,
            help="Current odometer reading"
        )

        # Price (optional, for additional insights)
        asking_price = st.number_input(
            "Asking Price (optional)",
            min_value=0,
            max_value=1000000,
            value=0,
            step=500,
            help="Seller's asking price"
        )

    # Show vehicle pricing information if available
    if make and model and year and trim:
        st.markdown("---")
        st.markdown("### 💰 Vehicle Pricing")

        # Get original MSRP from database
        original_msrp = None
        if VEHICLE_DATABASE_AVAILABLE:
            try:
                original_msrp = get_vehicle_trim_price(make, model, trim, year)
            except Exception as e:
                print(f"Could not get MSRP: {e}")

        # Get estimated current value if mileage is available
        estimated_value = None
        if VEHICLE_ESTIMATOR_AVAILABLE and mileage:
            try:
                estimator = UsedVehicleEstimator()
                estimated_value = estimator.estimate_current_value(make, model, year, trim, mileage)
            except Exception as e:
                print(f"Could not estimate value: {e}")

        # Display pricing metrics
        if original_msrp or estimated_value:
            # Determine number of columns based on what data we have
            metrics_to_show = []
            if original_msrp:
                metrics_to_show.append(('Original MSRP', original_msrp, 'New vehicle price when launched'))
            if estimated_value:
                metrics_to_show.append(('Estimated Market Value', estimated_value, 'Based on depreciation and current mileage'))
            if asking_price > 0:
                metrics_to_show.append(('Asking Price', asking_price, 'Seller\'s listed price'))

            cols = st.columns(len(metrics_to_show))
            for idx, (label, value, help_text) in enumerate(metrics_to_show):
                with cols[idx]:
                    st.metric(label, format_currency(value), help=help_text)

            # Show price analysis if we have estimated value and asking price
            if estimated_value and asking_price > 0:
                st.markdown("---")
                difference = asking_price - estimated_value
                difference_pct = (difference / estimated_value) * 100

                if difference > 0:
                    st.warning(f"⚠️ **Above Market:** Asking price is **{format_currency(difference)}** ({difference_pct:.1f}%) above estimated market value.")
                elif difference < 0:
                    st.success(f"✅ **Good Deal:** Asking price is **{format_currency(abs(difference))}** ({abs(difference_pct):.1f}%) below estimated market value.")
                else:
                    st.info("ℹ️ **Fair Price:** Asking price matches estimated market value.")

    st.markdown("---")

    # Generate checklist button
    if st.button("📋 Generate Buying Checklist", type="primary", disabled=not (make and model and year and mileage)):
        return {
            'make': make,
            'model': model,
            'year': year,
            'mileage': mileage,
            'trim': trim,
            'asking_price': asking_price
        }

    return None


def _maintenance_status_key(service: dict) -> str:
    """Unique session-state key for a maintenance status widget."""
    return f"maint_status_{service['service_name']}_{service.get('due_at_mileage', 0)}"


def display_checklist(checklist_data: dict):
    """Display the generated checklist"""
    vehicle_info = checklist_data['vehicle_info']
    insights = checklist_data['insights']

    # Vehicle header
    st.markdown("---")
    st.header(f"📋 Buying Checklist: {vehicle_info['year']} {vehicle_info['make']} {vehicle_info['model']}")

    # Key metrics
    col1, col2, col3, col4 = st.columns(4)
    with col1:
        st.metric("Vehicle Age", f"{vehicle_info['age']} years")
    with col2:
        st.metric("Current Mileage", format_mileage(vehicle_info['mileage']))
    with col3:
        st.metric("Avg Miles/Year", f"{vehicle_info['mileage'] / max(vehicle_info['age'], 1):,.0f}")
    with col4:
        st.metric("Expected Maintenance", format_currency(checklist_data['total_expected_maintenance_cost']))

    # ── Vehicle Assessment ──────────────────────────────────────────────────
    st.markdown("### 🔍 Vehicle Assessment")

    # Separate insights by severity
    critical_insights = [i for i in insights if i.get('severity') == 'critical']
    warning_insights  = [i for i in insights if i.get('severity') == 'warning']
    info_insights     = [i for i in insights if i.get('severity') == 'info']

    if critical_insights:
        st.error("🚨 **Red Flags — Address Before Buying**")
        for insight in critical_insights:
            st.error(f"• {insight['text']}")

    if warning_insights:
        st.warning("⚠️ **Caution Items — Verify with Seller**")
        for insight in warning_insights:
            st.warning(f"• {insight['text']}")

    if info_insights:
        with st.expander("ℹ️ General Insights", expanded=not critical_insights):
            for insight in info_insights:
                st.info(f"• {insight['text']}")

    # ── Maintenance History ─────────────────────────────────────────────────
    st.markdown("### 🔧 Maintenance That Should Have Been Completed")
    st.markdown(f"*Based on {format_mileage(vehicle_info['mileage'])} of driving*")

    categorized_services = checklist_data['categorized_services']

    if categorized_services:
        tabs = st.tabs(list(categorized_services.keys()))

        for idx, (category, services) in enumerate(categorized_services.items()):
            with tabs[idx]:
                total_category_cost = sum(s['cost'] for s in services)
                st.markdown(f"**Total {category} Costs:** {format_currency(total_category_cost)}")
                st.markdown("---")

                for service in services:
                    with st.expander(f"✓ {service['service_name']} - {format_currency(service['cost'])}", expanded=False):
                        col1, col2 = st.columns(2)
                        with col1:
                            st.markdown(f"**Due at:** {format_mileage(service['due_at_mileage'])}")
                        with col2:
                            st.markdown(f"**Service Interval:** Every {format_mileage(service['interval'])}")
                        st.markdown(f"**Cost:** {format_currency(service['cost'])}")
                        st.markdown("**Action:** Ask seller for documented proof of this service")
    else:
        st.success("✅ No major maintenance services expected yet for this mileage.")

    # ── Recent Maintenance Tracker (prior 12 months) ────────────────────────
    st.markdown("### ⚠️ Recent Maintenance Tracker — Prior 12 Months")
    st.markdown(
        "Mark each item as the seller responds. Unconfirmed costs roll up into your "
        "**Negotiation Leverage** total below."
    )

    recent = checklist_data.get('recent_services', [])
    if recent:
        total_recent = sum(s['cost'] for s in recent)
        st.info(
            f"📋 **{len(recent)} service(s)** were due in the past year "
            f"(estimated value: **{format_currency(total_recent)}**). "
            "Ask the seller for receipts or a service history printout."
        )

        # Group by category
        recent_by_category: dict = {}
        for service in recent:
            cat = service.get('category', 'Other')
            recent_by_category.setdefault(cat, []).append(service)

        for category, services in recent_by_category.items():
            with st.expander(f"🔧 {category} — {len(services)} service(s)", expanded=True):
                header_cols = st.columns([3, 2, 1, 2])
                header_cols[0].caption("Service")
                header_cols[1].caption("Due At")
                header_cols[2].caption("Cost")
                header_cols[3].caption("Status")
                st.markdown("---")

                for service in services:
                    sk = _maintenance_status_key(service)
                    row = st.columns([3, 2, 1, 2])
                    row[0].write(f"**{service['service_name']}**")
                    row[1].write(format_mileage(service['due_at_mileage']))
                    row[2].write(format_currency(service['cost']))
                    row[3].selectbox(
                        "Status",
                        options=["❓ Unknown", "✅ Seller Confirmed", "❌ Not Done"],
                        key=sk,
                        label_visibility="collapsed"
                    )
    else:
        st.success("✅ No maintenance services were due in the past 12 months")

    st.markdown("---")

    # ── Upcoming Maintenance ────────────────────────────────────────────────
    st.markdown("### 🔜 Upcoming Maintenance — Next 12 Months")

    upcoming = checklist_data['upcoming_services']
    if upcoming:
        total_upcoming = sum(s['cost'] for s in upcoming)
        st.warning(
            f"💰 Budget approximately **{format_currency(total_upcoming)}** "
            "for maintenance in the next year after purchase"
        )

        header_cols = st.columns([3, 2, 1])
        header_cols[0].caption("Service")
        header_cols[1].caption("Miles Until Due")
        header_cols[2].caption("Est. Cost")
        st.markdown("---")
        for service in upcoming[:5]:
            row = st.columns([3, 2, 1])
            row[0].write(f"🔧 {service['service_name']}")
            row[1].write(f"In {service['miles_until_due']:,} mi")
            row[2].write(format_currency(service['cost']))
    else:
        st.success("✅ No major services due in the next 12,000 miles")

    # ── Negotiation Leverage Calculator ────────────────────────────────────
    st.markdown("---")
    st.markdown("### 💰 Negotiation Leverage Calculator")

    if recent:
        confirmed_cost    = 0
        not_done_cost     = 0
        unknown_cost      = 0

        for service in recent:
            sk     = _maintenance_status_key(service)
            status = st.session_state.get(sk, "❓ Unknown")
            cost   = service['cost']
            if status == "✅ Seller Confirmed":
                confirmed_cost += cost
            elif status == "❌ Not Done":
                not_done_cost += cost
            else:
                unknown_cost += cost

        upcoming_cost = sum(s['cost'] for s in (upcoming or []))

        nc1, nc2, nc3, nc4 = st.columns(4)
        nc1.metric("Seller Confirmed ✅", format_currency(confirmed_cost),
                   help="Maintenance the seller has documented records for")
        nc2.metric("Not Done ❌", format_currency(not_done_cost),
                   help="Maintenance seller confirmed was skipped — negotiate off asking price")
        nc3.metric("Unknown ❓", format_currency(unknown_cost),
                   help="Items with no information yet — push seller for records")
        nc4.metric("Upcoming (next year) 🔜", format_currency(upcoming_cost),
                   help="Services you'll need to pay for after purchase")

        negotiate_off = not_done_cost + (unknown_cost * 0.5)
        total_ownership_gap = not_done_cost + unknown_cost + upcoming_cost

        if negotiate_off > 0:
            st.error(
                f"🔴 **Suggested price reduction: {format_currency(negotiate_off)}**  \n"
                f"({format_currency(not_done_cost)} skipped maintenance + "
                f"50% of {format_currency(unknown_cost)} unverified items)"
            )
        else:
            st.success(
                "✅ All recent maintenance has been confirmed by the seller — "
                "no price reduction needed for deferred maintenance."
            )

        with st.expander("📊 Full Ownership Cost Breakdown"):
            st.markdown(f"- **Recent maintenance not done:** {format_currency(not_done_cost)}")
            st.markdown(f"- **Unverified recent maintenance (50%):** {format_currency(unknown_cost * 0.5)}")
            st.markdown(f"- **Upcoming maintenance (next year):** {format_currency(upcoming_cost)}")
            st.markdown(f"---")
            st.markdown(f"**Total first-year maintenance exposure: {format_currency(total_ownership_gap)}**")
            st.caption(
                "Tip: Present confirmed 'Not Done' items to the seller by name and mileage. "
                "Factual, specific requests carry more weight than a generic discount ask."
            )
    else:
        st.info("No recent maintenance items to evaluate — negotiation leverage is minimal for maintenance.")

    # ── Inspection Questions ────────────────────────────────────────────────
    st.markdown("---")
    st.markdown("### ❓ Critical Questions to Ask the Seller")

    questions = checklist_data['checklist_questions']
    question_categories: dict = {}

    for q in questions:
        question_categories.setdefault(q['category'], []).append(q)

    for category, qs in question_categories.items():
        with st.expander(f"📌 {category} ({len(qs)})", expanded=True):
            for q in qs:
                importance_emoji = {
                    'Critical': '🔴',
                    'High': '🟡',
                    'Medium': '🟢'
                }.get(q['importance'], '⚪')

                st.markdown(f"{importance_emoji} **{q['question']}**")
                st.markdown(f"*Why this matters:* {q['why']}")

                # Notes field for recording seller's answer
                notes_key = f"q_notes_{q['question'][:40]}"
                st.text_input(
                    "Seller's answer / notes",
                    key=notes_key,
                    placeholder="Record what the seller said…",
                    label_visibility="collapsed"
                )
                st.markdown("---")

    # ── Save Checklist ──────────────────────────────────────────────────────
    st.markdown("### 💾 Save This Checklist")
    st.info("💡 Take screenshots or print this page to bring with you when inspecting the vehicle")


def main():
    """Main application logic"""

    # Initialize session state
    initialize_session_state()

    # Apply theme
    apply_theme()

    # Display sidebar
    display_sidebar_guide()

    # Main content
    st.title("🚗 Car Buying Checklist Generator")
    st.markdown("""
    Get a comprehensive maintenance checklist before buying a used car.
    Know what services should have been done and what questions to ask the seller.
    """)

    st.markdown("---")

    # Manual entry section
    vehicle_data = display_manual_entry()

    # Generate and display checklist
    if vehicle_data:
        with st.spinner("🔍 Analyzing vehicle and generating checklist..."):
            try:
                checklist = CarBuyingChecklist()
                checklist_data = checklist.generate_maintenance_checklist(
                    make=vehicle_data['make'],
                    model=vehicle_data['model'],
                    year=vehicle_data['year'],
                    mileage=vehicle_data['mileage'],
                    trim=vehicle_data['trim']
                )

                # Display the checklist
                display_checklist(checklist_data)

            except Exception as e:
                st.error(f"❌ Error generating checklist: {str(e)}")
                st.exception(e)

    # Footer
    st.markdown("---")
    st.markdown(get_footer_html(), unsafe_allow_html=True)


if __name__ == "__main__":
    main()
