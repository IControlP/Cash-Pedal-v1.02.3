"""
Take it to the Next Gear - Affiliate Links Page
Curated automotive resources and partner links
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
    page_title="Take it to the Next Gear - CashPedal",
    page_icon="🚗",
    layout="wide",
    initial_sidebar_state="expanded"
)

def main():
    """Affiliate Links Page"""
    # Initialize session state
    initialize_session_state()
    
    # Apply CashPedal theme (handles device/dark mode detection)
    apply_theme()
    
    # Add verification meta tag for affiliate program
    st.markdown(
        '<meta name="fo-verify" content="df7203c6-f078-4576-8957-fdf45f55a848" />',
        unsafe_allow_html=True
    )
    
    # Page header
    st.title("🚗 Take it to the Next Gear")
    st.markdown("Ready to make your move? Check out these trusted automotive resources.")
    st.markdown("---")
    
    # Sidebar
    with st.sidebar:
        st.header("📋 Page Sections")
        st.markdown("""
        - [Vehicle Shopping](#vehicle-shopping)
        - [Financing](#financing-resources)
        - [Insurance](#insurance-quotes)
        - [Auto Care](#auto-care-maintenance)
        - [Reviews & Research](#reviews-research)
        """)
        
        st.markdown("---")
        
        st.header("🔗 Quick Links")
        if st.button("🔧 Calculator"):
            st.switch_page("pages/1___Single_Vehicle_Calculator.py")
        if st.button("⚖️ Comparison"):
            st.switch_page("pages/2____Multi_Vehicle_Comparison.py")
        if st.button("🔍 Find Your Car"):
            st.switch_page("pages/4_____Find_Your_Car.py")
    
    # FlexOffers Verification
    st.markdown("""
    <div style="background-color: #f0f0f0; padding: 10px; border-radius: 5px; margin-bottom: 20px;">
    <p style="margin: 0; font-size: 12px; color: #666;">
    FlexOffers Verification Code: <strong>1523685</strong>
    </p>
    </div>
    """, unsafe_allow_html=True)
    
    # Introduction
    st.info("""
    **Welcome to Our Resources Hub!**
    
    We're building a comprehensive directory of trusted automotive resources to help you 
    through every step of vehicle ownership. From shopping for your next car to maintaining 
    the one you have, we'll connect you with quality services and competitive pricing.
    
    **This page is currently under development.** Check back soon for direct links to our 
    trusted partners!
    
    In the meantime, explore our powerful TCO calculator and comparison tools to help you 
    make informed vehicle decisions.
    """)
    
    st.markdown("---")
    
    # Vehicle Shopping Section
    st.header("🛒 Vehicle Shopping")
    st.markdown("Find your perfect vehicle with these trusted marketplaces:")
    
    st.info("""
    **Coming Soon!**
    
    We're partnering with trusted automotive retailers and marketplaces to bring you 
    exclusive deals and offers. Check back soon for direct links to:
    
    - New and used car dealerships
    - Online car buying platforms
    - Certified pre-owned programs
    - Private seller marketplaces
    
    In the meantime, use our TCO calculator to determine your budget and compare vehicles!
    """)
    
    if st.button("🔧 Try Our Calculator", key="calc_from_shopping", use_container_width=True):
        st.switch_page("pages/1___Single_Vehicle_Calculator.py")
    
    st.markdown("---")
    
    # Financing Section
    st.header("💰 Financing Resources")
    st.markdown("Get pre-approved and secure competitive rates:")
    
    st.info("""
    **Coming Soon!**
    
    We're working to connect you with trusted financial partners for:
    
    - Auto loan pre-qualification
    - Competitive rate comparisons
    - Lease financing options
    - Refinancing opportunities
    
    Check back soon for direct access to financing tools!
    """)
    
    if st.button("💵 Calculate Your Budget", key="calc_from_finance", use_container_width=True):
        st.switch_page("pages/5_______Salary_Calculator.py")
    
    st.markdown("---")
    
    # Insurance Section
    st.header("🛡️ Insurance Quotes")
    st.markdown("Protect your investment with competitive insurance rates:")
    
    st.info("""
    **Coming Soon!**
    
    We're partnering with insurance providers to help you:
    
    - Compare quotes from multiple insurers
    - Find coverage that fits your needs
    - Save money on premiums
    - Get instant online quotes
    
    Stay tuned for direct quote comparison tools!
    """)
    
    if st.button("📊 Compare Vehicle Costs", key="calc_from_insurance", use_container_width=True):
        st.switch_page("pages/2____Multi_Vehicle_Comparison.py")
    
    st.markdown("---")
    
    # Auto Care Section
    st.header("🔧 Auto Care & Maintenance")
    st.markdown("Keep your vehicle running smoothly:")
    
    st.info("""
    **Coming Soon!**
    
    We're building partnerships to help you with:
    
    - Auto repair shops and mechanics
    - Discount auto parts suppliers
    - Car care and detailing products
    - Tire retailers and services
    
    Future updates will include direct links to trusted service providers!
    """)
    
    if st.button("🔍 Find Your Perfect Car", key="calc_from_care", use_container_width=True):
        st.switch_page("pages/4_____Find_Your_Car.py")
    
    st.markdown("---")
    
    # Reviews & Research Section
    st.header("📚 Reviews & Research")
    st.markdown("Make informed decisions with expert insights:")
    
    st.info("""
    **Coming Soon!**
    
    We're curating resources for:
    
    - Expert vehicle reviews
    - Video comparisons and testing
    - Buying guides and advice
    - Latest automotive news
    
    Meanwhile, explore our built-in research tools and vehicle database!
    """)
    
    if st.button("ℹ️ Learn About TCO", key="calc_from_research", use_container_width=True):
        st.switch_page("pages/3_____About.py")
    
    st.markdown("---")
    
    # Extended Warranty Section
    st.header("🛡️ Extended Warranties & Protection")
    st.markdown("Peace of mind for your investment:")
    
    st.info("""
    **Coming Soon!**
    
    We're exploring partnerships with warranty providers for:
    
    - Extended vehicle protection plans
    - Coverage for high-mileage vehicles
    - Flexible payment options
    - Roadside assistance programs
    
    Check back for direct access to protection plan quotes!
    """)
    
    st.markdown("---")
    
    # Disclaimer Section
    st.info("""
    **Building Partnerships**
    
    CashPedal is actively building partnerships with trusted automotive service providers 
    and retailers. This page will be updated with direct links as affiliate relationships 
    are established.
    
    Our goal is to connect you with quality services that complement our TCO calculator, 
    helping you through every stage of vehicle ownership - from shopping to maintenance.
    
    In the meantime, feel free to explore our comprehensive vehicle analysis tools to 
    make informed decisions about your next vehicle purchase!
    """)
    
    # Tips Section
    st.markdown("---")
    st.header("💡 Smart Shopping Tips")
    
    col1, col2, col3 = st.columns(3)
    
    with col1:
        st.markdown("""
        **Before You Buy**
        - Use our TCO calculator first
        - Get pre-approved for financing
        - Research market values
        - Check vehicle history reports
        - Schedule pre-purchase inspection
        """)
    
    with col2:
        st.markdown("""
        **During Shopping**
        - Compare offers from multiple sources
        - Don't rush the decision
        - Test drive thoroughly
        - Review all fees and charges
        - Negotiate confidently
        """)
    
    with col3:
        st.markdown("""
        **After Purchase**
        - Keep maintenance records
        - Review insurance annually
        - Budget for ownership costs
        - Build emergency repair fund
        - Consider extended warranty
        """)
    
    # Footer
    st.markdown("---")
    st.markdown(get_footer_html(), unsafe_allow_html=True)

if __name__ == "__main__":
    main()
