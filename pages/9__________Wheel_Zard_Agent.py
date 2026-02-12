"""
Wheel-Zard ChatGPT Agent Page
AI-powered vehicle advisor for personalized car buying guidance
"""

import csv
import os
import sys
from datetime import datetime
from pathlib import Path

import streamlit as st

# Add parent directory to path for imports
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from session_manager import initialize_session_state
from theme_utils import apply_theme, get_footer_html

st.set_page_config(
    page_title="Wheel-Zard Agent - CashPedal",
    page_icon="🧙",
    layout="wide",
    initial_sidebar_state="expanded",
)

# Constants
WHEEL_ZARD_GPT_URL = "https://chatgpt.com/g/g-698e3ceaa11c81919b86766878324f99-wheel-zard"
LOGS_DIR = Path("data/wheel_zard_logs")
QUESTIONS_LOG_FILE = LOGS_DIR / "user_questions.csv"


def ensure_logs_directory():
    """Create logs directory if it doesn't exist."""
    LOGS_DIR.mkdir(parents=True, exist_ok=True)

    # Create CSV file with headers if it doesn't exist
    if not QUESTIONS_LOG_FILE.exists():
        with open(QUESTIONS_LOG_FILE, 'w', newline='', encoding='utf-8') as f:
            writer = csv.writer(f)
            writer.writerow(['timestamp', 'question', 'session_id', 'response_type'])


def log_user_question(question, response_type="auto"):
    """Log user questions for analytics."""
    try:
        ensure_logs_directory()

        # Generate session ID if not exists
        if 'wheel_zard_session_id' not in st.session_state:
            st.session_state.wheel_zard_session_id = datetime.now().strftime("%Y%m%d_%H%M%S_%f")

        timestamp = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
        session_id = st.session_state.wheel_zard_session_id

        with open(QUESTIONS_LOG_FILE, 'a', newline='', encoding='utf-8') as f:
            writer = csv.writer(f)
            writer.writerow([timestamp, question, session_id, response_type])
    except Exception as e:
        # Silently fail - don't break user experience if logging fails
        print(f"Logging error: {e}")


def initialize_wheel_zard_state():
    """Initialize chat state for Wheel-Zard agent."""
    if 'wheel_zard_messages' not in st.session_state:
        st.session_state.wheel_zard_messages = [
            {
                "role": "assistant",
                "content": """👋 Hello! I'm **Wheel-Zard** 🧙, your AI-powered vehicle advisor!

I'm here to help you navigate your car buying journey using CashPedal's comprehensive data pool. I can assist you with:

🚗 **Vehicle Recommendations** - Find the perfect car for your needs and budget
💰 **Cost Analysis** - Understand total ownership costs and affordability
⛽ **Fuel Efficiency** - Compare gas vs. electric vehicles
🔧 **Maintenance Insights** - Learn about long-term reliability and costs
📊 **Comparison Guidance** - Help you compare multiple vehicles
🎯 **Buying Advice** - Tips for negotiating and making smart decisions

**Ask me anything about car buying!** For complex questions, I'll connect you with my full-powered GPT version.

**How can I help you today?**"""
            }
        ]


def get_wheel_zard_response(user_message):
    """
    Get response from Wheel-Zard agent with logging.
    Provides quick answers and links to full GPT for complex questions.
    """
    # Log the question
    log_user_question(user_message, "quick_response")

    message_lower = user_message.lower()

    # Quick responses for common questions
    if any(greeting in message_lower for greeting in ["hello", "hi", "hey", "good morning", "good afternoon"]):
        return "Hello! 👋 I'm ready to help you with your car buying journey. What would you like to know?"

    elif "help" in message_lower or "what can you do" in message_lower:
        return """I can help you with:
- 🚗 Finding vehicles within your budget
- 💰 Comparing total cost of ownership
- ⛽ Understanding fuel and maintenance costs
- 🤝 Analyzing buy vs. lease options
- 🎯 Recommending vehicles based on your needs

**For detailed analysis, click the button below to chat with my full-powered GPT version!** 🚀"""

    elif any(word in message_lower for word in ["thank", "thanks", "appreciate"]):
        return "You're very welcome! 😊 Feel free to ask more questions anytime. For in-depth advice, don't forget to try my full GPT version!"

    elif any(word in message_lower for word in ["budget", "afford", "cost", "price", "expensive", "cheap"]):
        return f"""💰 Great question about costs! I can give you some quick guidance:

**Quick Tips:**
- Consider total ownership costs, not just purchase price
- Use CashPedal's **Single Car Calculator** for detailed cost breakdown
- Compare multiple vehicles with the **Multi-Vehicle Comparison** tool

**For personalized budget advice based on your specific situation:**
👉 [**Chat with Full Wheel-Zard GPT**]({WHEEL_ZARD_GPT_URL})

I'll analyze your complete financial picture and recommend the best options!"""

    elif any(word in message_lower for word in ["recommend", "suggest", "best car", "which car", "what car"]):
        return f"""🚗 I'd love to help you find the perfect vehicle!

**Quick guidance:**
- Define your budget and must-have features
- Consider your daily commute and typical usage
- Think about 5-year ownership costs, not just purchase price

**For detailed personalized recommendations:**
👉 [**Chat with Full Wheel-Zard GPT**]({WHEEL_ZARD_GPT_URL})

Tell me about your lifestyle, budget, and preferences, and I'll find your ideal match! 🎯"""

    elif any(word in message_lower for word in ["electric", "ev", "tesla", "hybrid", "gas", "fuel"]):
        return f"""⚡ Great question about electric vs. gas vehicles!

**Quick considerations:**
- EVs: Lower fuel costs, less maintenance, higher upfront cost
- Gas: Lower purchase price, established infrastructure
- Hybrids: Best of both worlds for many drivers

**For a personalized EV vs. Gas analysis:**
👉 [**Chat with Full Wheel-Zard GPT**]({WHEEL_ZARD_GPT_URL})

I'll calculate the exact break-even point based on your driving habits! 🔋"""

    elif any(word in message_lower for word in ["lease", "buy", "finance", "loan"]):
        return f"""📋 Lease vs. Buy is a crucial decision!

**Quick comparison:**
- **Buy:** Build equity, no mileage limits, long-term savings
- **Lease:** Lower monthly payments, new car every few years, mileage restrictions

**For detailed lease vs. buy analysis:**
👉 [**Chat with Full Wheel-Zard GPT**]({WHEEL_ZARD_GPT_URL})

I'll run the numbers for your specific situation! 💰"""

    else:
        # Default response for complex questions
        return f"""Thanks for your question! 🤔

This is a great question that deserves a detailed answer. While I can provide quick tips here, I'd recommend chatting with my **full-powered GPT version** for:

✨ **Personalized Analysis** - Tailored to your specific situation
📊 **Data-Driven Insights** - Using CashPedal's comprehensive database
🎯 **Step-by-Step Guidance** - From research to purchase
💡 **Smart Recommendations** - Based on your unique needs

👉 [**Click here to chat with Full Wheel-Zard GPT**]({WHEEL_ZARD_GPT_URL})

**Or explore CashPedal's tools:**
- 🧮 Single Car Ownership Calculator
- ⚖️ Multi-Vehicle Comparison
- 💵 Salary Calculator
- ✅ Car Buying Checklist

What would you like to do? 😊"""


def display_chat_interface():
    """Display the chat interface with message history and logging."""
    # Display chat history
    for message in st.session_state.wheel_zard_messages:
        with st.chat_message(message["role"]):
            st.markdown(message["content"])

    # Chat input
    if prompt := st.chat_input("Ask Wheel-Zard about your car buying journey..."):
        # Add user message to chat history
        st.session_state.wheel_zard_messages.append({
            "role": "user",
            "content": prompt
        })

        # Display user message
        with st.chat_message("user"):
            st.markdown(prompt)

        # Get and display assistant response (with logging inside)
        response = get_wheel_zard_response(prompt)
        st.session_state.wheel_zard_messages.append({
            "role": "assistant",
            "content": response
        })

        with st.chat_message("assistant"):
            st.markdown(response)

        # Rerun to update the interface
        st.rerun()


def main():
    """Render the Wheel-Zard Agent page."""
    initialize_session_state()
    initialize_wheel_zard_state()
    apply_theme()

    # Header Section
    st.markdown('<p class="main-header">🧙 Wheel-Zard AI Agent</p>', unsafe_allow_html=True)
    st.markdown('<p class="sub-header">Your Intelligent Vehicle Advisor</p>', unsafe_allow_html=True)
    st.markdown("---")

    # Info Banner with GPT Link
    col1, col2 = st.columns([3, 1])
    with col1:
        st.info("""
        💡 **About Wheel-Zard**: Get quick answers here, or chat with my full-powered GPT
        for in-depth, personalized vehicle advice using CashPedal's comprehensive data!
        """)
    with col2:
        st.markdown("###")  # Spacing
        if st.button("🚀 Open Full GPT", use_container_width=True, type="primary"):
            st.markdown(f'<meta http-equiv="refresh" content="0; url={WHEEL_ZARD_GPT_URL}" />', unsafe_allow_html=True)
            st.link_button("Open Full Wheel-Zard GPT", WHEEL_ZARD_GPT_URL, use_container_width=True)

    st.markdown("---")

    # Chat Interface
    display_chat_interface()

    # Sidebar
    with st.sidebar:
        st.header("🧙 About Wheel-Zard")
        st.markdown("""
        Wheel-Zard is your AI-powered vehicle advisor, designed to help you make
        informed decisions using CashPedal's extensive data pool.

        **Two ways to get help:**
        - 💬 Quick answers here in the app
        - 🚀 Full GPT for detailed analysis
        """)

        st.markdown("---")

        # Full GPT Link in Sidebar
        st.header("🚀 Full-Powered GPT")
        st.markdown("""
        For complex questions and personalized guidance, use my full GPT version:
        """)
        if st.button("🧙 Open Full Wheel-Zard GPT", key="sidebar_gpt", use_container_width=True, type="primary"):
            st.link_button("Launch Full GPT", WHEEL_ZARD_GPT_URL, use_container_width=True)

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
            st.session_state.wheel_zard_messages = [
                st.session_state.wheel_zard_messages[0]  # Keep welcome message
            ]
            st.rerun()

        # Display message count
        message_count = len(st.session_state.wheel_zard_messages) - 1  # Exclude welcome
        st.info(f"💬 Messages: {message_count}")

        st.markdown("---")

        # Admin Analytics Link
        st.header("📊 Admin")
        if st.button("📊 View Analytics Dashboard", use_container_width=True):
            st.switch_page("pages/10___________Wheel_Zard_Analytics.py")

    # Footer
    st.markdown("---")
    st.markdown(f"""
    <div style="text-align: center; padding: 10px; background-color: rgba(245, 166, 35, 0.1); border-radius: 5px; margin: 10px 0;">
        <p style="margin: 0; font-size: 14px;">
            ✅ <strong>Question Logging Active</strong> - All questions are tracked for feature development
        </p>
    </div>
    """, unsafe_allow_html=True)

    st.markdown("---")
    st.markdown(get_footer_html(), unsafe_allow_html=True)


if __name__ == "__main__":
    main()
