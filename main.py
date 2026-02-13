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

        **How to use:** Enter your ZIP code, select a vehicle from our database, configure purchase details (price, down payment, loan term), set annual mileage, and review the comprehensive 5-year cost breakdown.
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

        **How to use:** Add 2-5 vehicles with their details (same process as single calculator), then view side-by-side comparisons of total costs, monthly expenses, and key metrics with interactive charts and data export options.
        """)

        if st.button("⚖️ Compare Multiple Vehicles", key="nav_compare", use_container_width=True):
            st.switch_page("pages/5_______Multi_Vehicle_Comparison.py")

    st.markdown("---")

    # AI Agent Section
    st.subheader("🤖 AI-Powered Assistant")

    ai_col1, ai_col2 = st.columns(2)

    with ai_col1:
        st.markdown("""
        ### 🧙 Wheel-Zard AI Agent
        **Your intelligent vehicle advisor powered by ChatGPT**

        Get personalized recommendations and insights for your car buying journey:
        - 💬 Chat with an AI expert about vehicle ownership
        - 🎯 Personalized recommendations based on your needs
        - 📊 Data-driven insights from CashPedal's database
        - 💡 Smart answers to all your car buying questions
        - 🔍 Navigate complex decisions with AI guidance

        **How to use:** Simply type your question and get instant AI-powered advice on vehicle selection, budgeting, and ownership decisions.
        """)

        if st.button("🧙 Chat with Wheel-Zard", key="nav_wheel_zard", use_container_width=True):
            st.switch_page("pages/9__________Wheel_Zard_Agent.py")

    with ai_col2:
        st.markdown("""
        ### 📊 Wheel-Zard Analytics
        **Track and analyze user questions for insights**

        Analytics dashboard for understanding user behavior:
        - 📈 View all questions asked by users
        - 🔍 Identify most common keywords and topics
        - 📅 Track question trends over time
        - 📥 Export data for deeper analysis
        - 💡 Discover feature gaps and user needs

        **How to use:** Access the analytics dashboard to see what questions users are asking, identify patterns, and download data for external analysis.
        """)

        if st.button("📊 View Analytics Dashboard", key="nav_analytics", use_container_width=True):
            st.switch_page("pages/10___________Wheel_Zard_Analytics.py")

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

        **How to use:** Answer questions about your daily commute, family size, budget priorities, and lifestyle preferences. Get matched with ideal vehicle types based on your responses.
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

        **How to use:** Enter the vehicle price and loan details. The calculator applies the 20/4/10 rule (20% down, 4-year max loan, 10% of income) to determine minimum required salary for responsible ownership.
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

        **How to use:** Enter the vehicle's current mileage to get a detailed list of maintenance items that should have been completed and key questions to ask the seller.
        """)

        if st.button("✅ Get Buying Checklist", key="nav_checklist", use_container_width=True):
            st.switch_page("pages/8_________Car_Buying_Checklist.py")

    st.markdown("---")

    # Resources & Information Section
    st.subheader("📚 Resources & Information")

    res_col1, res_col2 = st.columns(2)

    with res_col1:
        st.markdown("""
        ### 🚗 Take it to the Next Gear
        **Trusted resources for your car buying journey**

        Access curated affiliate resources for every step:
        - 🏪 Vehicle shopping platforms (CarMax, Carvana, AutoTrader)
        - 💰 Financing options (LendingTree, Capital One)
        - 🛡️ Insurance comparison tools (The Zebra, GEICO)
        - 🔧 Maintenance services (RepairPal, Tire Rack)

        **How to use:** Browse organized categories of trusted partners for shopping, financing, insurance, and maintenance. Each resource includes a description to help you choose the right service.
        """)

        if st.button("🚗 Explore Resources", key="nav_resources", use_container_width=True):
            st.switch_page("pages/7_________Take_it_to_the_next_gear.py")

    with res_col2:
        st.markdown("""
        ### ℹ️ About & FAQ
        **Learn how CashPedal works**

        Understand our methodology and features:
        - 📖 What we do and how it works
        - 🔍 What's included in our calculations
        - ⚠️ Important disclaimers
        - ❓ Frequently asked questions
        - 📊 Step-by-step usage guide

        **How to use:** Read this page to understand CashPedal's cost estimation methodology, data sources, and what factors are included in vehicle ownership calculations.
        """)

        if st.button("ℹ️ Learn More About CashPedal", key="nav_about", use_container_width=True):
            st.switch_page("pages/6________About.py")

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
        # Add logo at the top of sidebar
        logo_path = ASSETS_DIR / "logo_sidebar.svg"
        if logo_path.exists():
            st.image(str(logo_path), use_container_width=True)
            st.markdown("<div style='margin-bottom: 1.5rem;'></div>", unsafe_allow_html=True)

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
        - 🧮 Single Car Calculator - Calculate TCO for one vehicle
        - ⚖️ Multi-Vehicle Comparison - Compare up to 5 vehicles

        **AI Assistant:**
        - 🧙 Wheel-Zard Agent - Ask AI about cars
        - 📊 Analytics Dashboard - View user question trends

        **Planning Tools:**
        - 🎯 Car Survey - Find your ideal vehicle type
        - 💵 Salary Calculator - Check affordability
        - ✅ Car Buying Checklist - Used car inspection guide

        **Resources:**
        - 🚗 Next Gear Resources - Shopping & financing partners
        - ℹ️ About & FAQ - Learn how CashPedal works
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
