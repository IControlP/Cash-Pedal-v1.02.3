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


def main() -> None:
    """Render partner resource links."""
    initialize_session_state()
    apply_theme()

    st.title("Take it to the Next Gear")
    st.markdown("---")

    with st.sidebar:
        st.header("Quick Links")
        if st.button("Calculator"):
            st.switch_page("pages/4______Single_Car_Ownership_Calculator.py")
        if st.button("Comparison"):
            st.switch_page("pages/5_______Multi_Vehicle_Comparison.py")

    st.info("Affiliate resources are not currently available.")
    st.markdown(
        """
        This page will feature trusted resources for vehicle shopping, financing,
        insurance, and maintenance once affiliate partnerships are established.
        """
    )

    st.markdown("---")
    st.markdown(get_footer_html(), unsafe_allow_html=True)


if __name__ == "__main__":
    main()
