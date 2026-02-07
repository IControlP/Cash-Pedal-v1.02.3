"""Salary Requirements Calculator Page."""

import os
import sys

import streamlit as st

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from session_manager import initialize_session_state
from theme_utils import apply_theme, get_footer_html


def estimate_monthly_vehicle_cost(price: float, is_lease: bool, years: int, apr: float) -> float:
    """Estimate monthly vehicle cost using a simplified model."""
    if price <= 0:
        return 0.0

    if is_lease:
        # Simple lease heuristic: depreciation + financing + fees
        return (price * 0.55) / 36 + (price * 0.03) / 12 + 75

    months = max(years * 12, 1)
    monthly_rate = (apr / 100) / 12
    if monthly_rate <= 0:
        loan_payment = price / months
    else:
        loan_payment = price * (monthly_rate * (1 + monthly_rate) ** months) / (
            (1 + monthly_rate) ** months - 1
        )

    running_costs = 250  # fuel + insurance + maintenance baseline
    return loan_payment + running_costs


def required_salary(monthly_cost: float, affordability_ratio: float) -> float:
    """Convert monthly cost into annual gross salary requirement."""
    if affordability_ratio <= 0:
        return 0.0
    return (monthly_cost * 12) / affordability_ratio


def main() -> None:
    initialize_session_state()
    apply_theme()

    st.set_page_config(
        page_title="Salary Calculator - CashPedal",
        page_icon="💰",
        layout="wide",
        initial_sidebar_state="expanded",
    )

    st.title("Salary Requirements Calculator")
    st.markdown("Estimate the income needed to comfortably afford a vehicle.")
    st.markdown("---")

    with st.sidebar:
        st.header("Quick Links")
        if st.button("Single Vehicle Calculator"):
            st.switch_page("pages/1___Single_Vehicle_Calculator.py")
        if st.button("Multi-Vehicle Comparison"):
            st.switch_page("pages/2____Multi_Vehicle_Comparison.py")

    col1, col2 = st.columns(2)

    with col1:
        purchase_type = st.radio("Purchase Type", ["Purchase", "Lease"], horizontal=True)
        vehicle_price = st.number_input(
            "Vehicle Price ($)", min_value=1000, max_value=500000, value=35000, step=1000
        )
        term_years = st.slider("Loan Term (years)", 2, 8, 5)
        apr = st.slider("APR (%)", 0.0, 20.0, 6.5, 0.1)

    with col2:
        affordability = st.selectbox(
            "Affordability Target",
            [
                (0.10, "Conservative (10% of gross income)"),
                (0.15, "Balanced (15% of gross income)"),
                (0.20, "Aggressive (20% of gross income)"),
            ],
            format_func=lambda x: x[1],
        )

        state_tax_impact = st.slider("Estimated state/local tax impact (%)", 0, 15, 5)
        other_debt = st.number_input("Other Monthly Debt Payments ($)", 0, 10000, 0, 50)

    monthly_cost = estimate_monthly_vehicle_cost(
        price=float(vehicle_price),
        is_lease=(purchase_type == "Lease"),
        years=int(term_years),
        apr=float(apr),
    )
    gross_salary_needed = required_salary(monthly_cost + float(other_debt), affordability[0])
    tax_adjusted_salary = gross_salary_needed / (1 - (state_tax_impact / 100))

    st.markdown("---")
    m1, m2, m3 = st.columns(3)
    m1.metric("Estimated Monthly Vehicle Cost", f"${monthly_cost:,.0f}")
    m2.metric("Required Gross Salary", f"${gross_salary_needed:,.0f}")
    m3.metric("Tax-Adjusted Salary", f"${tax_adjusted_salary:,.0f}")

    st.caption("This is a planning estimate and not financial advice.")

    st.markdown("---")
    st.markdown(get_footer_html(), unsafe_allow_html=True)


if __name__ == "__main__":
    main()
