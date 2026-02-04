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
    st.title("Ã°Å¸Å¡â€” Take it to the Next Gear")
    st.markdown("Ready to make your move? Check out these trusted automotive resources.")
    st.markdown("---")

    # FlexOffers Partner Verification Number
    st.markdown("""
    <div style="text-align: center; padding: 20px; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); border-radius: 10px; margin: 20px 0;">
        <p style="color: white; font-size: 14px; margin: 0;">FlexOffers Partner Verification</p>
        <p style="color: white; font-size: 32px; font-weight: bold; margin: 10px 0; letter-spacing: 3px;">1523685</p>
        <p style="color: white; font-size: 12px; margin: 0; opacity: 0.9;">Verified Affiliate Partner</p>
    </div>
    """, unsafe_allow_html=True)


    # FlexOffers Verification Number
    st.markdown("""
    <div style="text-align: center; padding: 20px; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); border-radius: 10px; margin: 20px 0;">
        <p style="color: white; font-size: 14px; margin: 0;">FlexOffers Partner Verification</p>
        <p style="color: white; font-size: 32px; font-weight: bold; margin: 10px 0; letter-spacing: 3px;">1523685</p>
        <p style="color: white; font-size: 12px; margin: 0; opacity: 0.9;">Verified Affiliate Partner</p>
    </div>
    """, unsafe_allow_html=True)
    
    
    # Sidebar
    with st.sidebar:
        st.header("ÃƒÂ°Ã…Â¸Ã¢â‚¬Å“Ã¢â‚¬Â¹ Page Sections")
        st.markdown("""
        - [Vehicle Shopping](#vehicle-shopping)
        - [Financing](#financing-resources)
        - [Insurance](#insurance-quotes)
        - [Auto Care](#auto-care-maintenance)
        - [Reviews & Research](#reviews-research)
        """)
        
        st.markdown("---")
        
        st.header("ÃƒÂ°Ã…Â¸Ã¢â‚¬Å“Ã¢â‚¬Â¹ Quick Links")
        if st.button("Ã°Å¸â€œÂ§ Calculator"):
            st.switch_page("pages/1___Single_Vehicle_Calculator.py")
        if st.button("ÃƒÂ¢Ã…Â¡Ã¢â‚¬â€œÃƒÂ¯Ã‚Â¸Ã‚Â Comparison"):
            st.switch_page("pages/2____Multi_Vehicle_Comparison.py")
        if st.button("ÃƒÂ°Ã…Â¸Ã…Â½Ã‚Â¯ Find Your Car"):
            st.switch_page("pages/4_____Find_Your_Car.py")
    
    # Introduction
    st.info("""
    **How to Use This Page**
    
    We've curated trusted automotive resources to help you through every step of 
    vehicle ownership. From shopping for your next car to maintaining the one you have, 
    these partners offer quality services and competitive pricing.
    
    *Disclosure: CashPedal may receive compensation when you use these links, 
    which helps us keep our calculator free and up-to-date.*
    """)
    
    st.markdown("---")
    
    # Vehicle Shopping Section
    st.header("ÃƒÂ°Ã…Â¸Ã¢â‚¬Å“Ã¢â‚¬Â¹ Vehicle Shopping")
    st.markdown("Find your perfect vehicle with these trusted marketplaces:")
    
    col1, col2 = st.columns(2)
    
    with col1:
        st.markdown("""
        ### Ã°Å¸Å¡â€” CarMax
        **Nation's Largest Used Car Retailer**
        
        - 7-day money-back guarantee
        - No-haggle pricing
        - 30-day/1,500-mile limited warranty
        - Over 200 locations nationwide
        
        Perfect for buyers who want a straightforward, pressure-free experience 
        with quality certified pre-owned vehicles.
        """)
        
        # Placeholder for affiliate link button
        if st.button("Ã°Å¸Å¡â€” Shop CarMax", key="carmax"):
            st.info("Affiliate link would open here")
        
        st.markdown("---")
        
        st.markdown("""
        ### ÃƒÂ°Ã…Â¸Ã…Â¡Ã¢â€žÂ¢ Carvana
        **Buy a Car Online - Delivered to Your Door**
        
        - Fully online car buying experience
        - Home delivery or pickup at vending machines
        - 7-day return policy
        - Virtual 360Ãƒâ€šÃ‚Â° car tours
        
        Ideal for tech-savvy buyers who prefer a completely digital 
        car-buying experience.
        """)
        
        if st.button("ÃƒÂ°Ã…Â¸Ã…Â¡Ã¢â€žÂ¢ Browse Carvana", key="carvana"):
            st.info("Affiliate link would open here")
    
    with col2:
        st.markdown("""
        ### Ã°Å¸Å¡â€” Cars.com
        **Search Millions of Listings**
        
        - Aggregates inventory from dealers nationwide
        - Advanced search filters
        - Dealer reviews and ratings
        - Price analysis tools
        
        Best for buyers who want to compare inventory across multiple 
        dealers in one place.
        """)
        
        if st.button("Ã°Å¸Å¡â€” Search Cars.com", key="cars_com"):
            st.info("Affiliate link would open here")
        
        st.markdown("---")
        
        st.markdown("""
        ### ÃƒÂ°Ã…Â¸Ã…Â¡Ã‹Å“ Autotrader
        **Find Your Perfect Car**
        
        - Extensive new and used inventory
        - Expert reviews and advice
        - Fair market value pricing
        - Dealer and private party listings
        
        Great for researching vehicle values and finding both dealer 
        and private party options.
        """)
        
        if st.button("ÃƒÂ°Ã…Â¸Ã…Â¡Ã‹Å“ Visit Autotrader", key="autotrader"):
            st.info("Affiliate link would open here")
    
    st.markdown("---")
    
    # Financing Section
    st.header("ÃƒÂ°Ã…Â¸Ã¢â‚¬Å“Ã¢â‚¬Â¹ Financing Resources")
    st.markdown("Get pre-approved and secure competitive rates:")
    
    col1, col2 = st.columns(2)
    
    with col1:
        st.markdown("""
        ### Ã°Å¸â€™Â³ LendingTree
        **Compare Auto Loan Offers**
        
        - Compare offers from multiple lenders
        - Get pre-qualified in minutes
        - No impact to credit score for checking rates
        - New and used car financing
        
        Rates as low as 5.99% APR for qualified buyers.
        """)
        
        if st.button("Ã°Å¸â€™Â³ Compare Rates", key="lendingtree"):
            st.info("Affiliate link would open here")
    
    with col2:
        st.markdown("""
        ### Ã°Å¸ÂÂ¦ Capital One Auto Navigator
        **Pre-Qualify Before You Shop**
        
        - Get pre-qualified without dealer visit
        - Know your purchasing power
        - No impact to credit score
        - Reusable for 45 days
        
        Shop with confidence knowing your budget.
        """)
        
        if st.button("Ã°Å¸ÂÂ¦ Get Pre-Qualified", key="capital_one"):
            st.info("Affiliate link would open here")
    
    st.markdown("---")
    
    # Insurance Section
    st.header("ÃƒÂ°Ã…Â¸Ã¢â‚¬ÂºÃ‚Â¡ÃƒÂ¯Ã‚Â¸Ã‚Â Insurance Quotes")
    st.markdown("Protect your investment with competitive insurance rates:")
    
    col1, col2 = st.columns(2)
    
    with col1:
        st.markdown("""
        ### ÃƒÂ°Ã…Â¸Ã‚Â¦Ã¢â‚¬Å“ The Zebra
        **Compare Quotes from 200+ Insurers**
        
        - Free, no-obligation quotes
        - Compare rates in minutes
        - Unbiased recommendations
        - Save an average of $368/year
        
        Get the coverage you need at a price you'll love.
        """)
        
        if st.button("ÃƒÂ°Ã…Â¸Ã‚Â¦Ã¢â‚¬Å“ Compare Insurance", key="zebra"):
            st.info("Affiliate link would open here")
    
    with col2:
        st.markdown("""
        ### ÃƒÂ°Ã…Â¸Ã‚Â¦Ã…Â½ GEICO
        **15 Minutes Could Save You 15% or More**
        
        - Quick online quotes
        - 24/7 customer service
        - Mobile app for claims
        - Multiple discount opportunities
        
        Trusted by millions of drivers nationwide.
        """)
        
        if st.button("ÃƒÂ°Ã…Â¸Ã‚Â¦Ã…Â½ Get GEICO Quote", key="geico"):
            st.info("Affiliate link would open here")
    
    st.markdown("---")
    
    # Auto Care Section
    st.header("ÃƒÂ°Ã…Â¸Ã¢â‚¬Å“Ã¢â‚¬Â¹ Auto Care & Maintenance")
    st.markdown("Keep your vehicle running smoothly:")
    
    col1, col2 = st.columns(2)
    
    with col1:
        st.markdown("""
        ### Ã°Å¸â€œÂ§ RepairPal
        **Fair Price Estimates & Certified Shops**
        
        - Get repair estimates instantly
        - Find certified mechanics near you
        - Read verified customer reviews
        - 12-month/12,000-mile warranty
        
        Take the guesswork out of auto repairs.
        """)
        
        if st.button("Ã°Å¸â€œÂ§ Find a Shop", key="repairpal"):
            st.info("Affiliate link would open here")
        
        st.markdown("---")
        
        st.markdown("""
        ### ÃƒÂ°Ã…Â¸Ã…Â¡Ã‹Å“ RockAuto
        **Discount Auto Parts**
        
        - Huge selection of parts
        - Wholesale pricing
        - Ship worldwide
        - Detailed fitment information
        
        Save money on DIY repairs and maintenance.
        """)
        
        if st.button("Ã°Å¸â€œÂ§ Shop Parts", key="rockauto"):
            st.info("Affiliate link would open here")
    
    with col2:
        st.markdown("""
        ### Ã°Å¸Â§Âª Chemical Guys
        **Premium Car Care Products**
        
        - Professional-grade detailing supplies
        - Car wash and wax products
        - Interior care solutions
        - How-to guides and videos
        
        Keep your car looking showroom fresh.
        """)
        
        if st.button("Ã°Å¸Â§Âª Shop Chemical Guys", key="chemical_guys"):
            st.info("Affiliate link would open here")
        
        st.markdown("---")
        
        st.markdown("""
        ### ÃƒÂ°Ã…Â¸Ã¢â‚¬ÂºÃ…Â¾ Tire Rack
        **Tires, Wheels & Accessories**
        
        - Expert tire recommendations
        - Free shipping on orders over $50
        - Installation partner network
        - Comprehensive tire testing
        
        Find the perfect tires for your vehicle and driving style.
        """)
        
        if st.button("ÃƒÂ°Ã…Â¸Ã¢â‚¬ÂºÃ…Â¾ Shop Tires", key="tire_rack"):
            st.info("Affiliate link would open here")
    
    st.markdown("---")
    
    # Reviews & Research Section
    st.header("ÃƒÂ°Ã…Â¸Ã¢â‚¬Å“Ã¢â‚¬Â¹ Reviews & Research")
    st.markdown("Make informed decisions with expert insights:")
    
    col1, col2 = st.columns(2)
    
    with col1:
        st.markdown("""
        ### ÃƒÂ°Ã…Â¸Ã¢â‚¬ÂÃ¢â‚¬â€ Edmunds
        **Expert Reviews & Advice**
        
        - In-depth vehicle reviews
        - True Market Value pricing
        - Expert buying advice
        - Comparison tools
        
        Trusted automotive resource for over 50 years.
        """)
        
        if st.button("ÃƒÂ°Ã…Â¸Ã¢â‚¬ÂÃ¢â‚¬â€ Read Reviews", key="edmunds"):
            st.info("Affiliate link would open here")
    
    with col2:
        st.markdown("""
        ### ÃƒÂ°Ã…Â¸Ã¢â‚¬ÂÃ¢â‚¬â€ MotorTrend
        **Video Reviews & Expert Testing**
        
        - Professional vehicle testing
        - Video reviews and comparisons
        - Car of the Year awards
        - Latest automotive news
        
        See vehicles put through their paces by experts.
        """)
        
        if st.button("ÃƒÂ°Ã…Â¸Ã¢â‚¬ÂÃ¢â‚¬â€ Watch Reviews", key="motortrend"):
            st.info("Affiliate link would open here")
    
    st.markdown("---")
    
    # Extended Warranty Section
    st.header("ÃƒÂ°Ã…Â¸Ã¢â‚¬ÂºÃ‚Â¡ÃƒÂ¯Ã‚Â¸Ã‚Â Extended Warranties & Protection")
    st.markdown("Peace of mind for your investment:")
    
    col1, col2 = st.columns(2)
    
    with col1:
        st.markdown("""
        ### ÃƒÂ°Ã…Â¸Ã¢â‚¬ÂÃ¢â‚¬â€ Endurance
        **Extended Vehicle Protection**
        
        - Coverage for vehicles up to 200K miles
        - 30-day money-back guarantee
        - Flexible payment options
        - 24/7 roadside assistance
        
        Protect yourself from unexpected repair costs.
        """)
        
        if st.button("ÃƒÂ°Ã…Â¸Ã¢â‚¬â„¢Ã¢â€žÂ¢ Get Quote", key="endurance"):
            st.info("Affiliate link would open here")
    
    with col2:
        st.markdown("""
        ### ÃƒÂ°Ã…Â¸Ã¢â‚¬ÂºÃ‚Â¡ÃƒÂ¯Ã‚Â¸Ã‚Â CarShield
        **Vehicle Service Contracts**
        
        - Customizable coverage plans
        - Pay deductible only
        - Rental car reimbursement
        - Covers high-tech components
        
        Affordable protection for your vehicle.
        """)
        
        if st.button("ÃƒÂ°Ã…Â¸Ã¢â‚¬ÂÃ¢â‚¬â€ Learn More", key="carshield"):
            st.info("Affiliate link would open here")
    
    st.markdown("---")
    
    # Disclaimer Section
    st.warning("""
    **Affiliate Disclosure**
    
    CashPedal participates in affiliate marketing programs. When you click on links 
    and make a purchase or sign up for services, we may receive a commission at no 
    additional cost to you. This helps us maintain and improve our free TCO calculator.
    
    We only recommend products and services we believe provide value to our users. 
    Our editorial content is not influenced by affiliate partnerships. Always do your 
    own research and compare options before making any financial decisions.
    
    **Important:** Prices, rates, and offers may vary and are subject to change. 
    Always verify current terms directly with the provider before committing.
    """)
    
    # Tips Section
    st.markdown("---")
    st.header("ÃƒÂ°Ã…Â¸Ã¢â‚¬Å“Ã¢â‚¬Â¹ Smart Shopping Tips")
    
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
