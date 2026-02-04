"""
Vehicle Total Cost of Ownership Calculator
Main Application - Home Page
"""

import streamlit as st
import sys
import os
from terms_agreement import require_terms_acceptance

sys.path.append(os.path.dirname(os.path.abspath(__file__)))
from session_manager import initialize_session_state
from theme_utils import apply_theme, get_footer_html

if not require_terms_acceptance():
    st.stop()

st.set_page_config(
    page_title="CashPedal - Vehicle TCO Calculator",
    page_icon="🚗",
    layout="wide",
    initial_sidebar_state="expanded"
)

def main():
    initialize_session_state()
    apply_theme()
    
    # Hero Section
    st.markdown('<p class="main-header">🚗 CashPedal</p>', unsafe_allow_html=True)
    st.markdown('<p class="sub-header">Vehicle Total Cost of Ownership Calculator</p>', unsafe_allow_html=True)
    st.markdown("---")
    
    st.markdown("""
    Welcome to **CashPedal**, your comprehensive tool for understanding the true cost 
    of vehicle ownership. Make informed decisions by analyzing all the costs associated 
    with buying, leasing, or owning a vehicle.
    """)
    
    # Quick Navigation
    st.subheader("🎯 Get Started")
    
    col1, col2 = st.columns(2)
    
    with col1:
        st.markdown("""
        ### 🔧 Single Vehicle Calculator
        Analyze the total cost of ownership for a single vehicle including:
        - Purchase price and financing
        - Depreciation estimates
        - Fuel and maintenance costs
        - Insurance estimates
        - Lease vs. buy analysis
        """)
        
        if st.button("🔧 Open Single Vehicle Calculator", key="nav_single", use_container_width=True):
            st.switch_page("pages/1___Single_Vehicle_Calculator.py")
    
    with col2:
        st.markdown("""
        ### ⚖ Multi-Vehicle Comparison
        Compare up to 5 vehicles side by side:
        - Cost comparison charts
        - Feature-by-feature analysis
        - Automated recommendations
        - Export comparison reports
        - Pros and cons analysis
        """)
        
        if st.button("⚖ Open Vehicle Comparison", key="nav_compare", use_container_width=True):
            st.switch_page("pages/2____Multi_Vehicle_Comparison.py")
    
    st.markdown("---")
    
    # Key Features
    st.subheader("✨ Key Features")
    
    feat_col1, feat_col2, feat_col3 = st.columns(3)
    
    with feat_col1:
        st.markdown("""
        **📍 Location-Based Estimates**
        - ZIP code auto-population
        - Regional fuel prices
        - State tax calculations
        - Local insurance rates
        """)
    
    with feat_col2:
        st.markdown("""
        **📊 Advanced Analytics**
        - Weibull reliability modeling
        - Climate-adjusted maintenance
        - Market depreciation data
        - Historical cost trends
        """)
    
    with feat_col3:
        st.markdown("""
        **📋 Comprehensive Reports**
        - Monthly cost breakdown
        - 5-year projections
        - Export to PDF/Excel
        - Visual comparisons
        """)
    
    # Sidebar
    with st.sidebar:
        st.header("📱 Navigation")
        st.info("Use the sidebar to navigate between pages, or click the buttons above to get started.")
        
        st.markdown("---")
        st.header("📊 Session Status")
        if hasattr(st.session_state, 'comparison_vehicles') and st.session_state.comparison_vehicles:
            st.success(f"✓ {len(st.session_state.comparison_vehicles)} vehicles in comparison")
        else:
            st.info("No vehicles added yet")
        
        st.markdown("---")
        st.header("🔗 Quick Links")
        st.markdown("""
        - Single Vehicle Calculator
        - Multi-Vehicle Comparison
        - About & FAQ
        """)
    
    # FlexOffers Verification
    st.markdown("---")
    st.markdown("""
    <div style="text-align: center; padding: 20px; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); border-radius: 10px; margin: 20px 0;">
        <p style="color: white; font-size: 14px; margin: 0;">FlexOffers Partner Verification</p>
        <p style="color: white; font-size: 32px; font-weight: bold; margin: 10px 0; letter-spacing: 3px;">1523685</p>
        <p style="color: white; font-size: 12px; margin: 0; opacity: 0.9;">Verified Affiliate Partner</p>
    </div>
    """, unsafe_allow_html=True)
    
    # How to Use
    st.markdown("---")
    st.subheader("📖 How to Use This Calculator")
    st.markdown("""
    1. **Enter Your Location**: Start by entering your ZIP code
    2. **Select a Vehicle**: Choose from our database
    3. **Configure Options**: Set financing terms and mileage
    4. **Review Results**: Get detailed cost breakdown
    5. **Compare Options**: Add multiple vehicles to compare
    """)
    
    st.markdown("---")
    st.markdown(get_footer_html(), unsafe_allow_html=True)

if __name__ == "__main__":
    main()
