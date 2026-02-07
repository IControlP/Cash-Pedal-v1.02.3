"""
Single Vehicle Calculator Page
Handles individual vehicle TCO analysis
"""

import streamlit as st
import sys
import os

# Add parent directory to path for imports
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from session_manager import initialize_session_state
from calculator_display import display_calculator
from theme_utils import apply_theme, get_footer_html

# Page configuration
st.set_page_config(
 page_title="Single Vehicle Calculator - CashPedal",
 page_icon="🔧",
 layout="wide",
 initial_sidebar_state="expanded"
)

def main():
 """Single Vehicle Calculator Page"""
 # Initialize session state
 initialize_session_state()
 
 # Apply CashPedal theme (handles device/dark mode detection)
 apply_theme()
 
 # Page header
 st.title(" Single Vehicle Calculator")
 st.markdown("Analyze the total cost of ownership for an individual vehicle.")
 st.markdown("---")
 
 # Sidebar content specific to this page
 with st.sidebar:
 st.header(" Calculator Guide")
 st.info("""
 **Steps:**
 1. Enter your ZIP code
 2. Select vehicle make/model
 3. Choose purchase or lease
 4. Set ownership duration
 5. Review cost breakdown
 """)
 
 st.markdown("---")
 
 # Session status
 st.header("  Session Status")
 if hasattr(st.session_state, 'comparison_vehicles') and st.session_state.comparison_vehicles:
 st.success(f" {len(st.session_state.comparison_vehicles)} vehicles in comparison")
 if st.button("View Comparison  "):
 st.switch_page("pages/2____Multi_Vehicle_Comparison.py")
 else:
 st.info("No vehicles in comparison yet")
 st.caption("Complete a calculation and click 'Add to Comparison' to start comparing vehicles.")
 
 st.markdown("---")
 
 # Tips section
 st.header(" Tips")
 st.markdown("""
 - Use accurate mileage estimates for better results
 - Include all financing costs
 - Consider resale value for long-term ownership
 - Compare lease vs buy for each vehicle
 """)
 
 # Main content - call the calculator display function
 display_calculator()
 
 # Footer
 st.markdown("---")
 col1, col2, col3 = st.columns([1, 2, 1])
 with col2:
 st.markdown(get_footer_html(), unsafe_allow_html=True)

if __name__ == "__main__":
 main()
