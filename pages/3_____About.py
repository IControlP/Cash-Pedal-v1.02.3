"""
About Page
Information about CashPedal, methodology, and disclaimers
"""

import streamlit as st
import sys
import os

# Add parent directory to path for imports
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from session_manager import initialize_session_state
from theme_utils import apply_theme, get_footer_html

# Page configuration
st.set_page_config(
    page_title="About - CashPedal",
    page_icon="info",
    layout="wide",
    initial_sidebar_state="expanded"
)

def main():
    """About Page"""
    # Initialize session state
    initialize_session_state()
    
    # Apply CashPedal theme (handles device/dark mode detection)
    apply_theme()
    
    # Page header
    st.title("About CashPedal")
    st.markdown("Learn more about how our Vehicle Total Cost of Ownership Calculator works.")
    st.markdown("---")
    
    # Sidebar
    with st.sidebar:
        st.header("Page Sections")
        st.markdown("""
        - [What is TCO?](#what-is-tco)
        - [Our Methodology](#our-methodology)
        - [Data Sources](#data-sources)
        - [Disclaimers](#disclaimers)
        - [Contact](#contact)
        """)
        
        st.markdown("---")
        
        st.header("Quick Links")
        if st.button("Calculator"):
            st.switch_page("pages/1___Single_Vehicle_Calculator.py")
        if st.button("Comparison"):
            st.switch_page("pages/2____Multi_Vehicle_Comparison.py")
    
    # Main content
    
    # What is TCO Section
    st.header("What is TCO?")
    st.markdown("""
    **Total Cost of Ownership (TCO)** represents the complete cost of owning a vehicle 
    over a specified period, not just the purchase price. Understanding TCO helps you 
    make informed decisions by revealing the true financial impact of vehicle ownership.
    
    TCO includes:
    """)
    
    col1, col2 = st.columns(2)
    
    with col1:
        st.markdown("""
        **Acquisition Costs**
        - Purchase price or lease payments
        - Down payment
        - Taxes and fees
        - Registration costs
        
        **Operating Costs**
        - Fuel or electricity
        - Regular maintenance
        - Repairs and wear items
        - Parking and tolls
        """)
    
    with col2:
        st.markdown("""
        **Ownership Costs**
        - Depreciation
        - Insurance premiums
        - Financing interest
        - Extended warranties
        
        **Maintenance Costs**
        - Scheduled services
        - Tire replacements
        - Brake services
        - Fluid changes
        """)
    
    st.markdown("---")
    
    # Methodology Section
    st.header("Our Methodology")
    
    st.subheader("Depreciation Modeling")
    st.markdown("""
    We use advanced depreciation models that account for:
    - **Brand-specific retention rates** - Some brands hold value better than others
    - **Model popularity** - High-demand models depreciate slower
    - **Mileage impact** - Higher mileage accelerates depreciation
    - **Market conditions** - Current supply and demand factors
    - **Vehicle age curves** - Non-linear depreciation patterns
    """)
    
    st.subheader("Maintenance Predictions")
    st.markdown("""
    Our maintenance cost predictions utilize:
    - **Weibull distribution analysis** - Statistical modeling of component failure rates
    - **Climate adjustments** - Regional weather impacts on vehicle wear
    - **Manufacturer service schedules** - Factory-recommended maintenance intervals
    - **Historical repair data** - Real-world cost averages by make and model
    """)
    
    st.subheader("Fuel Cost Calculations")
    st.markdown("""
    Fuel costs are calculated using:
    - **EPA fuel economy ratings** - Official MPG/MPGe figures
    - **Regional fuel prices** - Current local gas and electricity rates
    - **Driving pattern adjustments** - City vs. highway mix
    - **Seasonal variations** - Winter fuel economy impacts
    """)
    
    st.subheader("Insurance Estimates")
    st.markdown("""
    Insurance estimates consider:
    - **Vehicle safety ratings** - IIHS and NHTSA scores
    - **Theft rates** - Historical theft data by model
    - **Repair costs** - Parts and labor expense factors
    - **Regional factors** - State and ZIP code adjustments
    """)
    
    st.markdown("---")
    
    # Data Sources Section
    st.header("Data Sources")
    st.markdown("""
    CashPedal aggregates data from multiple authoritative sources:
    
    | Category | Sources |
    |----------|---------|
    | Fuel Economy | EPA, FuelEconomy.gov |
    | Vehicle Prices | Manufacturer MSRP data |
    | Depreciation | Industry valuation guides, market analysis |
    | Maintenance | Manufacturer schedules, repair databases |
    | Insurance | Industry averages, regional data |
    | Fuel Prices | EIA, regional price indices |
    
    *Data is updated regularly to ensure accuracy.*
    """)
    
    st.markdown("---")
    
    # Disclaimers Section
    st.header("Important Disclaimers")
    
    st.warning("""
    **Please Read Carefully**
    
    The estimates provided by CashPedal are for informational purposes only and should 
    not be considered as financial advice. Actual costs may vary significantly based on:
    
    - Individual driving habits and conditions
    - Local market variations
    - Personal credit and insurance history
    - Unforeseen repairs and maintenance needs
    - Changes in fuel prices and market conditions
    - Dealer pricing and negotiation outcomes
    
    **We recommend:**
    - Consulting with financial advisors for major purchase decisions
    - Obtaining actual quotes from dealers and insurance providers
    - Reviewing manufacturer warranty coverage
    - Considering your specific circumstances and needs
    """)
    
    st.info("""
    **Accuracy Notice**
    
    While we strive to provide accurate estimates, all projections are based on 
    historical data and statistical models. Past performance does not guarantee 
    future results. Vehicle ownership costs can be influenced by many factors 
    beyond our modeling capabilities.
    """)
    
    st.markdown("---")
    
    # Contact Section
    st.header("Contact & Feedback")
    st.markdown("""
    We're constantly working to improve CashPedal. If you have:
    
    - **Bug reports** - Found something not working correctly?
    - **Feature requests** - Have an idea for improvement?
    - **Data corrections** - Noticed inaccurate information?
    - **General feedback** - Want to share your experience?
    
    Please reach out to us at: **support@cashpedal.io**
    """)
    
    # Version info
    st.markdown("---")
    
    col1, col2, col3 = st.columns(3)
    
    with col1:
        st.metric("Version", "1.02.3")
    
    with col2:
        st.metric("Last Updated", "January 2025")
    
    with col3:
        st.metric("Database Vehicles", "500+")
    
    # Footer
    st.markdown("---")
    st.markdown(get_footer_html(), unsafe_allow_html=True)

if __name__ == "__main__":
    main()
