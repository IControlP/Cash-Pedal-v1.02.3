"""
Vehicle Total Cost of Ownership Calculator
Main Application - Home Page

This is the main entry point and landing page for the Streamlit application.
"""

import streamlit as st
import sys
import os
from terms_agreement import require_terms_acceptance


# Add project root to path for imports
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

# Import session manager and theme utilities
from session_manager import initialize_session_state
from theme_utils import apply_theme, get_footer_html

# CRITICAL: Check terms acceptance BEFORE page configuration
if not require_terms_acceptance():
    st.stop()

# Page configuration - MUST be first Streamlit command
st.set_page_config(
    page_title="CashPedal - Vehicle TCO Calculator",
    page_icon="ÃƒÂ°Ã…Â¸Ã…Â¡Ã¢â‚¬â€",
    layout="wide",
    initial_sidebar_state="expanded"
)


def main():
    """Main application entry point - Home Page"""
    # Initialize session state
    initialize_session_state()
    
    # Apply CashPedal theme (handles device/dark mode detection)
    apply_theme()
    
    # Hero Section
    st.markdown('<p class="main-header">ÃƒÂ°Ã…Â¸Ã…Â¡Ã¢â‚¬â€ CashPedal</p>', unsafe_allow_html=True)
    st.markdown('<p class="sub-header">Vehicle Total Cost of Ownership Calculator</p>', unsafe_allow_html=True)
    
    st.markdown("---")
    
    # Welcome message
    st.markdown("""
    Welcome to **CashPedal**, your comprehensive tool for understanding the true cost 
    of vehicle ownership. Make informed decisions by analyzing all the costs associated 
    with buying, leasing, or owning a vehicle.
    """)
    
    # Quick Navigation Cards
    st.subheader("ÃƒÂ°Ã…Â¸Ã…Â½Ã‚Â¯ Get Started")
    
    col1, col2 = st.columns(2)
    
    with col1:
        st.markdown("""
        <div class="feature-card">
            <h3>ÃƒÂ°Ã…Â¸Ã¢â‚¬ÂÃ‚Â§ Single Vehicle Calculator</h3>
            <p>Analyze the total cost of ownership for a single vehicle including:</p>
            <ul>
                <li>Purchase price and financing</li>
                <li>Depreciation estimates</li>
                <li>Fuel and maintenance costs</li>
                <li>Insurance estimates</li>
                <li>Lease vs. buy analysis</li>
            </ul>
        </div>
        """, unsafe_allow_html=True)
        
        if st.button("ÃƒÂ°Ã…Â¸Ã¢â‚¬ÂÃ‚Â§ Open Single Vehicle Calculator", key="nav_single", use_container_width=True):
            st.switch_page("pages/1___Single_Vehicle_Calculator.py")
    
    with col2:
        st.markdown("""
        <div class="feature-card">
            <h3>ÃƒÂ¢Ã…Â¡Ã¢â‚¬â€œÃƒÂ¯Ã‚Â¸Ã‚Â Multi-Vehicle Comparison</h3>
            <p>Compare up to 5 vehicles side by side:</p>
            <ul>
                <li>Cost comparison charts</li>
                <li>Feature-by-feature analysis</li>
                <li>Automated recommendations</li>
                <li>Export comparison reports</li>
                <li>Pros and cons analysis</li>
            </ul>
        </div>
        """, unsafe_allow_html=True)
        
        if st.button("ÃƒÂ¢Ã…Â¡Ã¢â‚¬â€œÃƒÂ¯Ã‚Â¸Ã‚Â Open Vehicle Comparison", key="nav_compare", use_container_width=True):
            st.switch_page("pages/2____Multi_Vehicle_Comparison.py")
    
    st.markdown("---")
    
    # Key Features Section
    st.subheader("ÃƒÂ¢Ã…â€œÃ‚Â¨ Key Features")
    
    feat_col1, feat_col2, feat_col3 = st.columns(3)
    
    with feat_col1:
        st.markdown("""
        <span class="key-feature-title">ÃƒÂ°Ã…Â¸Ã¢â‚¬Å“Ã‚Â Location-Based Estimates</span>
        
        - ZIP code auto-population
        - Regional fuel prices
        - State tax calculations
        - Local insurance rates
        """, unsafe_allow_html=True)
    
    with feat_col2:
        st.markdown("""
        <span class="key-feature-title">ÃƒÂ°Ã…Â¸Ã¢â‚¬Å“Ã‹â€  Advanced Analytics</span>
        
        - Weibull reliability modeling
        - Climate-adjusted maintenance
        - Market depreciation data
        - Historical cost trends
        """, unsafe_allow_html=True)
    
    with feat_col3:
        st.markdown("""
        <span class="key-feature-title">ÃƒÂ°Ã…Â¸Ã¢â‚¬Å“Ã…Â  Comprehensive Reports</span>
        
        - Monthly cost breakdown
        - 5-year projections
        - Export to PDF/Excel
        - Visual comparisons
        """, unsafe_allow_html=True)
    
    # Sidebar content
    with st.sidebar:
        st.header("ÃƒÂ°Ã…Â¸Ã¢â‚¬Å“Ã¢â‚¬Â¹ Navigation")
        st.info("""
        Use the sidebar to navigate between pages, 
        or click the buttons above to get started.
        """)
        
        st.markdown("---")
        
        # Session status
        st.header("ÃƒÂ°Ã…Â¸Ã¢â‚¬Å“Ã…Â  Session Status")
        if hasattr(st.session_state, 'comparison_vehicles') and st.session_state.comparison_vehicles:
            st.success(f"ÃƒÂ¢Ã…â€œÃ¢â‚¬Â¦ {len(st.session_state.comparison_vehicles)} vehicles in comparison")
        else:
            st.info("No vehicles added yet")
        
        st.markdown("---")
        
        # Quick links
        st.header("ÃƒÂ°Ã…Â¸Ã¢â‚¬ÂÃ¢â‚¬â€ Quick Links")
        st.markdown("""
        - [How to Use This Calculator](#how-to-use)
        - [Understanding TCO](#understanding-tco)
        - [FAQ](#faq)
        """)
    
    # How to Use Section
    st.markdown("---")
    st.subheader("ÃƒÂ°Ã…Â¸Ã¢â‚¬Å“Ã¢â‚¬â€œ How to Use This Calculator")
    st.markdown("""
    1. **Enter Your Location**: Start by entering your ZIP code to get accurate local pricing for fuel, taxes, and insurance.
    
    2. **Select a Vehicle**: Choose from our comprehensive database of vehicles, or enter custom specifications.
    
    3. **Configure Options**: Set your financing terms, expected mileage, and ownership duration.
    
    4. **Review Results**: Get a detailed breakdown of all costs over your ownership period.
    
    5. **Compare Options**: Add multiple vehicles to compare and find the best value for your needs.
    """)
    
    # Footer
    st.markdown("---")
    st.markdown(get_footer_html(), unsafe_allow_html=True)

if __name__ == "__main__":
    main()
