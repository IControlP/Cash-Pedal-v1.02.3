"""
Vehicle Total Cost of Ownership Calculator
Main Application - Home Page
"""

import streamlit as st
import sys
import os

sys.path.append(os.path.dirname(os.path.abspath(__file__)))
from session_manager import initialize_session_state
from theme_utils import apply_theme, get_footer_html

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
    st.markdown('<p class="sub-header">Make Smarter Vehicle Ownership Decisions</p>', unsafe_allow_html=True)
    st.markdown("---")

    # Welcome Message
    st.markdown("""
    ### Welcome to CashPedal! 👋

    Thinking about buying a car? Wondering if you can afford that dream vehicle?
    Or maybe you just want to understand the **true cost** of vehicle ownership?

    **You're in the right place!** CashPedal helps you make informed decisions by analyzing
    all the costs associated with owning a vehicle - not just the sticker price.
    """)

    st.markdown("---")

    # Main Feature Cards
    st.subheader("🎯 Choose Your Path")

    col1, col2 = st.columns(2)

    with col1:
        st.markdown("""
        ### 🧮 Single Car Ownership Calculator
        **Perfect for:** Buyers ready to analyze a specific vehicle

        Get a complete breakdown of owning a single car:
        - 💰 Purchase price and financing options
        - 📉 Depreciation estimates over time
        - ⛽ Fuel and electricity costs
        - 🔧 Maintenance projections
        - 🛡️ Insurance estimates
        - 📊 Buy vs. Lease analysis
        """)

        if st.button("🧮 Calculate Single Car Costs", key="nav_single", use_container_width=True):
            st.switch_page("pages/4______Single_Car_Ownership_Calculator.py")

    with col2:
        st.markdown("""
        ### ⚖️ Multi-Vehicle Comparison
        **Perfect for:** Shoppers comparing multiple options

        Compare up to 5 vehicles side-by-side:
        - 📊 Interactive cost comparison charts
        - 📋 Feature-by-feature analysis
        - 🎯 Automated recommendations
        - 📄 Export detailed reports
        - ✅ Pros and cons breakdown
        """)

        if st.button("⚖️ Compare Multiple Vehicles", key="nav_compare", use_container_width=True):
            st.switch_page("pages/5_______Multi_Vehicle_Comparison.py")

    st.markdown("---")

    # Additional Tools Section
    st.subheader("🛠️ Additional Tools")

    tool_col1, tool_col2, tool_col3 = st.columns(3)

    with tool_col1:
        st.markdown("""
        ### 🎯 Car Survey
        **Not sure what type of car fits your lifestyle?**

        Take our quick personality quiz to discover which vehicle
        type matches your needs, preferences, and lifestyle!

        - ✨ Fun, interactive quiz
        - 🚗 Personalized recommendations
        - ⏱️ Takes just 2 minutes
        """)

        if st.button("🎯 Take the Car Survey", key="nav_survey", use_container_width=True):
            st.switch_page("pages/2____Car_Survey.py")

    with tool_col2:
        st.markdown("""
        ### 💵 Salary Calculator
        **Wondering if you can afford a specific vehicle?**

        Calculate the minimum salary you need to comfortably
        afford your desired car based on the 20/4/10 rule.

        - 💰 Income requirements
        - 📈 Affordability analysis
        - 🎯 Financial guidance
        """)

        if st.button("💵 Check Salary Requirements", key="nav_salary", use_container_width=True):
            st.switch_page("pages/3_____Salary_Calculator.py")

    with tool_col3:
        st.markdown("""
        ### ✅ Car Buying Checklist
        **Buying a used car? Know what to look for!**

        Get a maintenance checklist based on the car's mileage
        and critical questions to ask the seller.

        - 🔧 Maintenance history needed
        - 📋 Inspection questions
        - 💡 Buying insights
        """)

        if st.button("✅ Get Buying Checklist", key="nav_checklist", use_container_width=True):
            st.switch_page("pages/8_________Car_Buying_Checklist.py")

    st.markdown("---")

    # Why Choose CashPedal
    st.subheader("✨ Why Choose CashPedal?")

    feat_col1, feat_col2, feat_col3 = st.columns(3)

    with feat_col1:
        st.markdown("""
        **📍 Accurate & Location-Based**
        - 🗺️ ZIP code-specific estimates
        - ⛽ Regional fuel prices
        - 💵 State tax calculations
        - 🛡️ Local insurance rates

        *Get costs tailored to YOUR area*
        """)

    with feat_col2:
        st.markdown("""
        **📊 Powered by Real Data**
        - 🔬 Advanced reliability modeling
        - 🌡️ Climate-adjusted maintenance
        - 📈 Market depreciation data
        - 📉 Historical cost trends

        *Based on real-world data, not guesses*
        """)

    with feat_col3:
        st.markdown("""
        **📋 Comprehensive & Clear**
        - 📅 Monthly cost breakdown
        - ⏰ 5-year projections
        - 📄 Export detailed reports
        - 📊 Visual comparisons

        *Understand every dollar you'll spend*
        """)

    # Sidebar
    with st.sidebar:
        st.header("📱 Navigation")
        st.info("Use the sidebar menu or the buttons on this page to get started!")

        st.markdown("---")
        st.header("📊 Session Status")
        if hasattr(st.session_state, 'comparison_vehicles') and st.session_state.comparison_vehicles:
            st.success(f"✔ {len(st.session_state.comparison_vehicles)} vehicles in comparison")
        else:
            st.info("No vehicles added to comparison yet")

        st.markdown("---")
        st.header("🔗 Quick Access")
        st.markdown("""
        **Main Tools:**
        - 🧮 Single Car Calculator
        - ⚖️ Multi-Vehicle Comparison

        **Planning Tools:**
        - 🎯 Car Survey
        - 💵 Salary Calculator
        - ✅ Car Buying Checklist

        **More:**
        - 📖 About & FAQ
        """)

    # How to Use - Made more engaging
    st.markdown("---")
    st.subheader("🚀 Getting Started is Easy!")

    step_col1, step_col2, step_col3, step_col4, step_col5 = st.columns(5)

    with step_col1:
        st.markdown("""
        **1️⃣ Location**

        📍 Enter your ZIP code

        *Get accurate local costs*
        """)

    with step_col2:
        st.markdown("""
        **2️⃣ Vehicle**

        🚗 Choose your car

        *From our database*
        """)

    with step_col3:
        st.markdown("""
        **3️⃣ Configure**

        ⚙️ Set your options

        *Financing, mileage, etc.*
        """)

    with step_col4:
        st.markdown("""
        **4️⃣ Analyze**

        📊 Review breakdown

        *See all the costs*
        """)

    with step_col5:
        st.markdown("""
        **5️⃣ Compare**

        ⚖️ Compare options

        *Make the best choice*
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

    st.markdown("---")
    st.markdown(get_footer_html(), unsafe_allow_html=True)

if __name__ == "__main__":
    main()
