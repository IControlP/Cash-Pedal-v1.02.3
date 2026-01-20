"""
Vehicle Total Cost of Ownership Calculator
Main Application Controller

This is the main entry point for the Streamlit application.
Handles routing, session management, and overall application flow.
"""

import streamlit as st
import sys
import os

# Add project root to path for imports
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

# Updated imports for root directory structure (no subdirectories)
from calculator_display import display_calculator
from comparison_display import display_comparison
from session_manager import initialize_session_state, clear_session_state
from prediction_service import PredictionService

# Page configuration
st.set_page_config(
    page_title="Vehicle TCO Calculator",
    page_icon="ðŸš—",
    layout="wide",
    initial_sidebar_state="expanded"
)

def main():
    """Main application entry point"""
    # Initialize session state
    initialize_session_state()
    
    # Application header
    st.title("ðŸš— Vehicle Total Cost of Ownership Calculator")
    st.markdown("---")
    
    # Sidebar navigation
    with st.sidebar:
        st.header("ðŸ“‹ Navigation")
        
        # Main navigation options
        page = st.radio(
            "Select Function:",
            ["ðŸ”§ Single Vehicle Calculator", "âš–ï¸ Multi-Vehicle Comparison"],
            help="Choose between analyzing a single vehicle or comparing multiple vehicles"
        )
        
        st.markdown("---")
        
        # Session management
        st.header("ðŸ”„ Session Management")
        
        # Display current session stats
        if hasattr(st.session_state, 'comparison_vehicles') and st.session_state.comparison_vehicles:
            st.success(f"ðŸ“Š {len(st.session_state.comparison_vehicles)} vehicles in comparison")
        
        # Clear session button
        if st.button("ðŸ—‘ï¸ Clear All Data", type="secondary"):
            clear_session_state()
            st.rerun()
        
        st.markdown("---")
        
        # Application info
        st.header("â„¹ï¸ About")
        st.info("""
        **Features:**
        - ZIP code-based auto-population
        - Lease vs Purchase analysis
        - Multi-vehicle comparison (up to 5)
        - Automated pros/cons analysis
        - Geographic cost adjustments
        - Export capabilities
        """)
        
        # Disclaimers
        st.markdown("---")
        st.header("âš ï¸ Disclaimers")
        st.warning("""
        **Important Notes:**
        - Estimates may vary from actual costs
        - Results based on current market data
        - Consult financial advisors for major decisions
        - Regional variations may apply
        """)
    
    # Main content area based on navigation
    if page == "ðŸ”§ Single Vehicle Calculator":
        display_calculator()
    elif page == "âš–ï¸ Multi-Vehicle Comparison":
        display_comparison()
    
    # Footer
    st.markdown("---")
    st.markdown(
        """
        <div style='text-align: center; color: gray; font-size: 12px;'>
        Vehicle TCO Calculator v1.02.2 | 
        Powered by Streamlit | 
        <a href='#' style='color: gray;'>Help & Support</a>
        </div>
        """, 
        unsafe_allow_html=True
    )

if __name__ == "__main__":
    main()
