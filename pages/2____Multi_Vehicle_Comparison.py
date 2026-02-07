"""
Multi-Vehicle Comparison Page
Handles side-by-side vehicle comparisons and recommendations
"""

import streamlit as st
import sys
import os

# Add parent directory to path for imports
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from session_manager import initialize_session_state, clear_session_state
from comparison_display import display_comparison

# Page configuration
st.set_page_config(
    page_title="Vehicle Comparison - CashPedal",
    page_icon="⚖",
    layout="wide",
    initial_sidebar_state="expanded"
)

def main():
    """Multi-Vehicle Comparison Page"""
    # Initialize session state
    initialize_session_state()
    
    # Page header
    st.title("⚖️ Multi-Vehicle Comparison")
    st.markdown("Compare up to 5 vehicles side by side to find the best value.")
    st.markdown("---")
    
    # Sidebar content specific to this page
    with st.sidebar:
        st.header("📋 Comparison Guide")
        
        # Show current comparison status
        vehicle_count = len(st.session_state.get('comparison_vehicles', []))
        
        if vehicle_count == 0:
            st.warning("No vehicles to compare")
            st.info("""
            **To add vehicles:**
            1. Go to Single Vehicle Calculator
            2. Configure and calculate a vehicle
            3. Click "Add to Comparison"
            """)
            if st.button("➕ Add a Vehicle"):
                st.switch_page("pages/1___Single_Vehicle_Calculator.py")
        else:
            st.success(f"✅ {vehicle_count} vehicle(s) ready")
            
            # List vehicles in comparison
            st.subheader("Vehicles in Comparison:")
            for i, vehicle in enumerate(st.session_state.comparison_vehicles):
                vehicle_name = vehicle.get('name', f'Vehicle {i+1}')
                st.markdown(f"**{i+1}.** {vehicle_name}")
            
            if vehicle_count < 5:
                st.caption(f"You can add {5 - vehicle_count} more vehicle(s)")
                if st.button("➕ Add Another Vehicle"):
                    st.switch_page("pages/1___Single_Vehicle_Calculator.py")
        
        st.markdown("---")
        
        # Session management
        st.header("🔄 Session Management")
        
        if vehicle_count > 0:
            if st.button("🗑️ Clear All Vehicles", type="secondary"):
                clear_session_state()
                st.rerun()
        
        st.markdown("---")
        
        # Comparison features
        st.header("✨ Comparison Features")
        st.markdown("""
        - 📊 Side-by-side cost tables
        - 📈 Interactive charts
        - 🏆 Value ranking
        - 👍 Pros/cons analysis
        - 📄 Export reports
        """)
    
    # Main content - call the comparison display function
    display_comparison()
    
    # Quick action buttons if no vehicles
    if vehicle_count < 2:
        st.markdown("---")
        st.subheader("🚀 Quick Actions")
        
        col1, col2, col3 = st.columns([1, 2, 1])
        with col2:
            st.info("Add at least 2 vehicles to see comparison results.")
            if st.button("🔧 Go to Single Vehicle Calculator", use_container_width=True):
                st.switch_page("pages/1___Single_Vehicle_Calculator.py")
    
    # Footer
    st.markdown("---")
    col1, col2, col3 = st.columns([1, 2, 1])
    with col2:
        st.markdown(
            """
            <div style='text-align: center; color: gray; font-size: 12px;'>
            CashPedal - Vehicle TCO Calculator v1.02.3
            </div>
            """, 
            unsafe_allow_html=True
        )

if __name__ == "__main__":
    main()
