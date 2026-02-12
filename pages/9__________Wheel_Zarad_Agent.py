"""
Wheel-Zarad ChatGPT Agent Page
AI-powered vehicle advisor for personalized car buying guidance
"""

import os
import sys

import streamlit as st

# Add parent directory to path for imports
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from session_manager import initialize_session_state
from theme_utils import apply_theme, get_footer_html

st.set_page_config(
    page_title="Wheel-Zarad Agent - CashPedal",
    page_icon="🤖",
    layout="wide",
    initial_sidebar_state="expanded",
)


def initialize_wheel_zarad_state():
    """Initialize chat state for Wheel-Zarad agent."""
    if 'wheel_zarad_messages' not in st.session_state:
        st.session_state.wheel_zarad_messages = [
            {
                "role": "assistant",
                "content": """👋 Hello! I'm **Wheel-Zarad**, your AI-powered vehicle advisor!

I'm here to help you navigate your car buying journey using CashPedal's comprehensive data pool. I can assist you with:

🚗 **Vehicle Recommendations** - Find the perfect car for your needs and budget
💰 **Cost Analysis** - Understand total ownership costs and affordability
⛽ **Fuel Efficiency** - Compare gas vs. electric vehicles
🔧 **Maintenance Insights** - Learn about long-term reliability and costs
📊 **Comparison Guidance** - Help you compare multiple vehicles
🎯 **Buying Advice** - Tips for negotiating and making smart decisions

**How can I help you today?**"""
            }
        ]


def get_wheel_zarad_response(user_message):
    """
    Get response from Wheel-Zarad agent.
    This is a placeholder that will be replaced with actual ChatGPT integration.
    """
    # Placeholder response - will be replaced with actual API integration
    responses = {
        "hello": "Hello! How can I assist you with your car buying journey today?",
        "hi": "Hi there! I'm ready to help you find the perfect vehicle. What are you looking for?",
        "help": """I can help you with:
- Finding vehicles within your budget
- Comparing total cost of ownership
- Understanding fuel and maintenance costs
- Analyzing buy vs. lease options
- Recommending vehicles based on your needs

What specific aspect would you like to explore?""",
        "default": """Thank you for your question! I'm currently in setup mode.

Once the ChatGPT integration is complete, I'll be able to provide detailed, personalized advice using CashPedal's comprehensive vehicle ownership data.

For now, you can explore CashPedal's other tools:
- 🧮 Single Car Ownership Calculator
- ⚖️ Multi-Vehicle Comparison
- 💵 Salary Calculator
- ✅ Car Buying Checklist

Is there anything specific about these tools I can help you understand?"""
    }

    # Simple keyword matching for placeholder responses
    message_lower = user_message.lower()
    if any(greeting in message_lower for greeting in ["hello", "hi", "hey"]):
        return responses.get("hello")
    elif "help" in message_lower or "what can you do" in message_lower:
        return responses.get("help")
    else:
        return responses.get("default")


def display_chat_interface():
    """Display the chat interface with message history."""
    # Display chat history
    for message in st.session_state.wheel_zarad_messages:
        with st.chat_message(message["role"]):
            st.markdown(message["content"])

    # Chat input
    if prompt := st.chat_input("Ask Wheel-Zarad about your car buying journey..."):
        # Add user message to chat history
        st.session_state.wheel_zarad_messages.append({
            "role": "user",
            "content": prompt
        })

        # Display user message
        with st.chat_message("user"):
            st.markdown(prompt)

        # Get and display assistant response
        response = get_wheel_zarad_response(prompt)
        st.session_state.wheel_zarad_messages.append({
            "role": "assistant",
            "content": response
        })

        with st.chat_message("assistant"):
            st.markdown(response)

        # Rerun to update the interface
        st.rerun()


def main():
    """Render the Wheel-Zarad Agent page."""
    initialize_session_state()
    initialize_wheel_zarad_state()
    apply_theme()

    # Header Section
    st.markdown('<p class="main-header">🤖 Wheel-Zarad AI Agent</p>', unsafe_allow_html=True)
    st.markdown('<p class="sub-header">Your Intelligent Vehicle Advisor</p>', unsafe_allow_html=True)
    st.markdown("---")

    # Info Banner
    st.info("""
    💡 **About Wheel-Zarad**: This AI agent uses CashPedal's comprehensive vehicle ownership data
    to provide personalized insights and recommendations for your car buying journey.
    Ask questions, get advice, and make informed decisions!
    """)

    st.markdown("---")

    # Chat Interface
    display_chat_interface()

    # Sidebar
    with st.sidebar:
        st.header("🤖 About Wheel-Zarad")
        st.markdown("""
        Wheel-Zarad is your AI-powered vehicle advisor, designed to help you make
        informed decisions using CashPedal's extensive data pool.
        """)

        st.markdown("---")

        st.header("💬 What You Can Ask")
        st.markdown("""
        **Vehicle Recommendations:**
        - "What car should I buy for under $30,000?"
        - "Best reliable SUV for families?"

        **Cost Analysis:**
        - "How much does it cost to own a Tesla?"
        - "Compare Honda Civic vs Toyota Corolla costs"

        **Buying Guidance:**
        - "Should I buy new or used?"
        - "When is the best time to buy a car?"

        **Maintenance & Reliability:**
        - "Most reliable cars for long-term ownership?"
        - "What are typical maintenance costs?"
        """)

        st.markdown("---")

        st.header("🔗 Quick Tools")
        if st.button("🧮 Single Car Calculator", use_container_width=True):
            st.switch_page("pages/4______Single_Car_Ownership_Calculator.py")

        if st.button("⚖️ Compare Vehicles", use_container_width=True):
            st.switch_page("pages/5_______Multi_Vehicle_Comparison.py")

        if st.button("🎯 Car Survey", use_container_width=True):
            st.switch_page("pages/2____Car_Survey.py")

        if st.button("💵 Salary Calculator", use_container_width=True):
            st.switch_page("pages/3_____Salary_Calculator.py")

        st.markdown("---")

        st.header("⚙️ Chat Controls")
        if st.button("🗑️ Clear Chat History", use_container_width=True):
            st.session_state.wheel_zarad_messages = [
                st.session_state.wheel_zarad_messages[0]  # Keep welcome message
            ]
            st.rerun()

        # Display message count
        message_count = len(st.session_state.wheel_zarad_messages) - 1  # Exclude welcome
        st.info(f"💬 Messages: {message_count}")

    # Footer
    st.markdown("---")
    st.markdown("""
    <div style="text-align: center; padding: 10px; background-color: rgba(245, 166, 35, 0.1); border-radius: 5px; margin: 10px 0;">
        <p style="margin: 0; font-size: 14px;">
            🔧 <strong>Integration Status:</strong> UI Ready - ChatGPT integration coming soon!
        </p>
    </div>
    """, unsafe_allow_html=True)

    st.markdown("---")
    st.markdown(get_footer_html(), unsafe_allow_html=True)


if __name__ == "__main__":
    main()
