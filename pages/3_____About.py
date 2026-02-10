"""About page for CashPedal."""

import os
import sys

import streamlit as st

# Add parent directory to path for imports
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from session_manager import initialize_session_state
from theme_utils import apply_theme, get_footer_html

st.set_page_config(
    page_title="About - CashPedal",
    page_icon="ℹ️",
    layout="wide",
    initial_sidebar_state="expanded",
)


def main() -> None:
    """Render the About page."""
    initialize_session_state()
    apply_theme()

    st.title("About CashPedal")
    st.markdown(
        "CashPedal helps drivers compare the true total cost of vehicle ownership."
    )
    st.markdown("---")

    with st.sidebar:
        st.header("Page Sections")
        st.markdown(
            """
            - [What We Do](#what-we-do)
            - [How It Works](#how-it-works)
            - [What’s Included](#whats-included)
            - [Disclaimers](#disclaimers)
            """
        )

        st.markdown("---")
        st.header("Quick Links")
        if st.button("Single Car Ownership Calculator"):
            st.switch_page("pages/1___Single_Vehicle_Calculator.py")
        if st.button("Multi-Vehicle Comparison"):
            st.switch_page("pages/2____Multi_Vehicle_Comparison.py")

    st.header("What We Do")
    st.write(
        "We estimate ownership costs by combining purchase/lease details with fuel, "
        "maintenance, insurance, taxes, and depreciation assumptions."
    )

    st.header("How It Works")
    st.markdown(
        """
        1. Enter vehicle and location details.
        2. Add financing or lease assumptions.
        3. Review annual and total ownership cost outputs.
        4. Save and compare vehicles side-by-side.
        """
    )

    st.header("What’s Included")
    st.markdown(
        """
        - Fuel or electricity cost estimates
        - Depreciation and financing effects
        - Maintenance and insurance projections
        - Side-by-side vehicle comparison
        """
    )

    st.header("Disclaimers")
    st.info(
        "Results are estimates, not financial advice. Real-world costs vary by market, "
        "driving behavior, and vehicle condition."
    )

    st.markdown("---")
    st.markdown(get_footer_html(), unsafe_allow_html=True)


if __name__ == "__main__":
    main()
