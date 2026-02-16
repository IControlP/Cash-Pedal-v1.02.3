"""
Wheel-Zard Analytics Dashboard
View and analyze user questions for feature development
"""

import csv
import os
import sys
from collections import Counter
from datetime import datetime
from pathlib import Path

import pandas as pd
import streamlit as st

# Add parent directory to path for imports
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from session_manager import initialize_session_state
from theme_utils import apply_theme, get_footer_html
from terms_agreement import require_terms_acceptance

# CRITICAL: Require terms acceptance BEFORE page config
if not require_terms_acceptance():
    st.stop()

st.set_page_config(
    page_title="Wheel-Zard Analytics - CashPedal",
    page_icon="📊",
    layout="wide",
    initial_sidebar_state="expanded",
)

# Constants
LOGS_DIR = Path("data/wheel_zard_logs")
QUESTIONS_LOG_FILE = LOGS_DIR / "user_questions.csv"

# Admin password (change this to your secure password)
ADMIN_PASSWORD = "CashPedal2026!"  # TODO: Change this password for production


def check_authentication():
    """Check if user is authenticated to view analytics."""
    if 'analytics_authenticated' not in st.session_state:
        st.session_state.analytics_authenticated = False

    return st.session_state.analytics_authenticated


def authenticate_user():
    """Display login form and authenticate user."""
    st.markdown('<p class="main-header">🔒 Analytics Dashboard Login</p>', unsafe_allow_html=True)
    st.markdown('<p class="sub-header">Admin Access Only</p>', unsafe_allow_html=True)
    st.markdown("---")

    st.warning("⚠️ This dashboard is for admin use only. Please enter the password to continue.")

    with st.form("login_form"):
        password = st.text_input("Password", type="password")
        submit = st.form_submit_button("Login")

        if submit:
            if password == ADMIN_PASSWORD:
                st.session_state.analytics_authenticated = True
                st.success("✅ Authentication successful! Redirecting...")
                st.rerun()
            else:
                st.error("❌ Invalid password. Access denied.")

    st.markdown("---")
    st.info("💡 **Note:** This dashboard contains sensitive user data and is password-protected for privacy.")

    # Back button
    if st.button("🏠 Back to Home"):
        st.switch_page("main.py")


def load_question_logs():
    """Load question logs from CSV file."""
    if not QUESTIONS_LOG_FILE.exists():
        return pd.DataFrame(columns=['timestamp', 'question', 'session_id', 'response_type'])

    try:
        df = pd.read_csv(QUESTIONS_LOG_FILE)
        df['timestamp'] = pd.to_datetime(df['timestamp'])
        return df
    except Exception as e:
        st.error(f"Error loading logs: {e}")
        return pd.DataFrame(columns=['timestamp', 'question', 'session_id', 'response_type'])


def get_question_keywords(questions):
    """Extract common keywords from questions."""
    # Common stop words to ignore
    stop_words = {'i', 'me', 'my', 'myself', 'we', 'our', 'ours', 'ourselves', 'you', 'your', 'yours',
                  'yourself', 'yourselves', 'he', 'him', 'his', 'himself', 'she', 'her', 'hers',
                  'herself', 'it', 'its', 'itself', 'they', 'them', 'their', 'theirs', 'themselves',
                  'what', 'which', 'who', 'whom', 'this', 'that', 'these', 'those', 'am', 'is', 'are',
                  'was', 'were', 'be', 'been', 'being', 'have', 'has', 'had', 'having', 'do', 'does',
                  'did', 'doing', 'a', 'an', 'the', 'and', 'but', 'if', 'or', 'because', 'as', 'until',
                  'while', 'of', 'at', 'by', 'for', 'with', 'about', 'against', 'between', 'into',
                  'through', 'during', 'before', 'after', 'above', 'below', 'to', 'from', 'up', 'down',
                  'in', 'out', 'on', 'off', 'over', 'under', 'again', 'further', 'then', 'once', 'can',
                  'should', 'would', 'could'}

    all_words = []
    for question in questions:
        words = question.lower().split()
        # Filter out stop words and short words
        filtered_words = [w.strip('?!.,') for w in words if w.lower() not in stop_words and len(w) > 3]
        all_words.extend(filtered_words)

    return Counter(all_words).most_common(20)


def main():
    """Render the Analytics Dashboard."""
    initialize_session_state()
    apply_theme()

    # Check authentication first
    if not check_authentication():
        authenticate_user()
        return

    # Header
    st.markdown('<p class="main-header">📊 Wheel-Zard Analytics Dashboard</p>', unsafe_allow_html=True)
    st.markdown('<p class="sub-header">User Question Analytics for Feature Development</p>', unsafe_allow_html=True)
    st.markdown("---")

    # Load data
    df = load_question_logs()

    # Overview Metrics
    st.header("📈 Overview")
    col1, col2, col3, col4 = st.columns(4)

    with col1:
        st.metric("Total Questions", len(df))

    with col2:
        unique_sessions = df['session_id'].nunique() if not df.empty else 0
        st.metric("Unique Sessions", unique_sessions)

    with col3:
        if not df.empty:
            avg_per_session = len(df) / unique_sessions if unique_sessions > 0 else 0
            st.metric("Avg Questions/Session", f"{avg_per_session:.1f}")
        else:
            st.metric("Avg Questions/Session", "0")

    with col4:
        if not df.empty and 'timestamp' in df.columns:
            today_count = len(df[df['timestamp'].dt.date == datetime.now().date()])
            st.metric("Questions Today", today_count)
        else:
            st.metric("Questions Today", "0")

    st.markdown("---")

    if df.empty:
        st.info("📭 No questions logged yet. Questions will appear here once users start chatting with Wheel-Zard!")

        st.markdown("---")
        st.subheader("💡 How Question Logging Works")
        st.markdown("""
        **Every question asked in Wheel-Zard is automatically logged with:**
        - Timestamp of when the question was asked
        - The exact question text
        - Session ID to track conversation flows
        - Response type (quick response, full GPT redirect, etc.)

        **Use this data to:**
        - 🎯 Identify most common user needs
        - 🚀 Prioritize new feature development
        - 📊 Understand user behavior patterns
        - 💡 Improve responses and guidance
        """)
    else:
        # Recent Questions
        st.header("💬 Recent Questions")
        recent_df = df.sort_values('timestamp', ascending=False).head(20)

        for idx, row in recent_df.iterrows():
            with st.expander(f"🕒 {row['timestamp'].strftime('%Y-%m-%d %H:%M:%S')} - Session: {row['session_id'][:8]}..."):
                st.markdown(f"**Question:** {row['question']}")
                st.markdown(f"**Response Type:** `{row['response_type']}`")

        st.markdown("---")

        # Popular Keywords
        st.header("🔍 Most Common Keywords")
        st.markdown("*These keywords appear most frequently in user questions*")

        keywords = get_question_keywords(df['question'].tolist())

        if keywords:
            col1, col2 = st.columns(2)

            with col1:
                st.subheader("Top 10 Keywords")
                for i, (word, count) in enumerate(keywords[:10], 1):
                    st.markdown(f"{i}. **{word}** ({count} times)")

            with col2:
                st.subheader("Keywords 11-20")
                for i, (word, count) in enumerate(keywords[10:20], 11):
                    st.markdown(f"{i}. **{word}** ({count} times)")

        st.markdown("---")

        # Question Timeline
        st.header("📅 Question Timeline")
        if 'timestamp' in df.columns:
            df['date'] = df['timestamp'].dt.date
            daily_counts = df.groupby('date').size().reset_index(name='count')

            st.line_chart(daily_counts.set_index('date')['count'])

        st.markdown("---")

        # Full Data Export
        st.header("📥 Export Data")
        col1, col2 = st.columns([3, 1])

        with col1:
            st.markdown("Download the full question log for deeper analysis in Excel, Google Sheets, or your analytics tool.")

        with col2:
            csv_data = df.to_csv(index=False)
            st.download_button(
                label="📥 Download CSV",
                data=csv_data,
                file_name=f"wheel_zard_questions_{datetime.now().strftime('%Y%m%d')}.csv",
                mime="text/csv",
                width="stretch"
            )

        st.markdown("---")

        # All Questions Table
        st.header("📋 All Questions")
        st.dataframe(
            df[['timestamp', 'question', 'session_id', 'response_type']],
            width="stretch",
            height=400
        )

    # Sidebar
    with st.sidebar:
        st.header("🔒 Admin Dashboard")
        st.success("✅ Authenticated as Admin")

        if st.button("🚪 Logout", use_container_width=True, type="secondary"):
            st.session_state.analytics_authenticated = False
            st.rerun()

        st.markdown("---")

        st.header("📊 Analytics Info")
        st.markdown("""
        This dashboard shows all questions asked by users in the Wheel-Zard chat interface.

        **Use this data to:**
        - Identify feature gaps
        - Understand user needs
        - Improve response quality
        - Prioritize development
        """)

        st.markdown("---")

        st.header("🔗 Quick Links")
        if st.button("🧙 Back to Wheel-Zard", width="stretch"):
            st.switch_page("pages/9__________Wheel_Zard_Agent.py")

        if st.button("🏠 Home", width="stretch"):
            st.switch_page("main.py")

        st.markdown("---")

        st.header("📈 Data Location")
        st.code(str(QUESTIONS_LOG_FILE))

        if QUESTIONS_LOG_FILE.exists():
            file_size = QUESTIONS_LOG_FILE.stat().st_size
            st.info(f"📁 File size: {file_size:,} bytes")

    # Footer
    st.markdown("---")
    st.markdown(get_footer_html(), unsafe_allow_html=True)


if __name__ == "__main__":
    main()
