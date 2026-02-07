"""Affiliate resources page."""

import os
import sys

import streamlit as st

# Add parent directory to path for imports
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from session_manager import initialize_session_state
from theme_utils import apply_theme, get_footer_html

st.set_page_config(
    page_title="Take it to the Next Gear - CashPedal",
    page_icon="🚗",
    layout="wide",
    initial_sidebar_state="expanded",
)


def _resource_card(title: str, description: str, key: str) -> None:
    st.subheader(title)
    st.write(description)
    if st.button(f"Open {title}", key=key):
        st.info("Affiliate link would open here.")


def main() -> None:
    """Render partner resource links."""
    initialize_session_state()
    apply_theme()

    st.title("Take it to the Next Gear")
    st.markdown(
        "Trusted resources for shopping, financing, insurance, and maintenance."
    )
    st.markdown("---")

    with st.sidebar:
        st.header("Page Sections")
        st.markdown(
            """
            - [Vehicle Shopping](#vehicle-shopping)
            - [Financing](#financing)
            - [Insurance](#insurance)
            - [Maintenance](#maintenance)
            """
        )
        st.markdown("---")
        st.header("Quick Links")
        if st.button("Calculator"):
            st.switch_page("pages/1___Single_Vehicle_Calculator.py")
        if st.button("Comparison"):
            st.switch_page("pages/2____Multi_Vehicle_Comparison.py")

    st.info(
        "Disclosure: CashPedal may earn affiliate commissions at no additional cost to you."
    )

    st.header("Vehicle Shopping")
    col1, col2 = st.columns(2)
    with col1:
        _resource_card("CarMax", "Large used inventory with no-haggle pricing.", "carmax")
        _resource_card("Carvana", "Online-first buying and delivery.", "carvana")
    with col2:
        _resource_card("Cars.com", "Compare dealer listings nationwide.", "cars")
        _resource_card("Autotrader", "Research and browse new and used cars.", "autotrader")

    st.header("Financing")
    col1, col2 = st.columns(2)
    with col1:
        _resource_card("LendingTree", "Compare auto loan offers.", "lendingtree")
    with col2:
        _resource_card(
            "Capital One Auto Navigator",
            "Pre-qualify and shop with a budget.",
            "capital_one",
        )

    st.header("Insurance")
    col1, col2 = st.columns(2)
    with col1:
        _resource_card("The Zebra", "Compare quotes from many insurers.", "zebra")
    with col2:
        _resource_card("GEICO", "Fast quote flow and national coverage.", "geico")

    st.header("Maintenance")
    col1, col2 = st.columns(2)
    with col1:
        _resource_card("RepairPal", "Repair estimates and nearby shops.", "repairpal")
    with col2:
        _resource_card("Tire Rack", "Tires and accessories.", "tirerack")

    st.markdown("---")
    st.markdown(get_footer_html(), unsafe_allow_html=True)


if __name__ == "__main__":
    main()
