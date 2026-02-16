# -*- coding: utf-8 -*-
"""
User Data Collection Modal
Collects user contact information after 6th TCO calculation

Storage: PostgreSQL (Railway) with localStorage persistence
"""

import streamlit as st
import streamlit.components.v1 as components
import os
import json
import uuid
from datetime import datetime, timezone
from typing import Optional, Dict, Any
import re

# ======================
# CONFIGURATION
# ======================

# Use same database connection as terms_agreement
from terms_agreement import get_database_url, is_postgres_available

# Fallback for local development
USER_DATA_LOG_FILE = "user_data/user_collection_log.json"

# Trigger after N calculations
CALCULATION_TRIGGER_COUNT = 6

# ======================
# DATABASE SETUP
# ======================

def init_user_data_table():
    """Create user_data_collection table if it doesn't exist"""
    import psycopg2

    conn = psycopg2.connect(get_database_url())
    cursor = conn.cursor()

    cursor.execute('''
        CREATE TABLE IF NOT EXISTS user_data_collection (
            id SERIAL PRIMARY KEY,
            record_id VARCHAR(36) UNIQUE NOT NULL,
            session_id VARCHAR(36) NOT NULL,
            timestamp_utc TIMESTAMP WITH TIME ZONE NOT NULL,
            first_name VARCHAR(100) NOT NULL,
            last_name VARCHAR(100) NOT NULL,
            email VARCHAR(255) NOT NULL,
            calculation_count INTEGER NOT NULL,
            ip_address VARCHAR(45),
            user_agent TEXT,
            created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
        )
    ''')

    cursor.execute('''
        CREATE INDEX IF NOT EXISTS idx_user_data_timestamp
        ON user_data_collection(timestamp_utc)
    ''')

    cursor.execute('''
        CREATE INDEX IF NOT EXISTS idx_user_data_email
        ON user_data_collection(email)
    ''')

    conn.commit()
    conn.close()

# ======================
# SESSION STATE
# ======================

def _inject_localstorage_check_user_data():
    """Inject JS to check localStorage for submitted user data"""
    components.html("""
    <script>
    (function() {
        try {
            var submitted = localStorage.getItem('cashpedal_user_data_submitted');
            var calcCount = localStorage.getItem('cashpedal_calculation_count');
            if (!calcCount) {
                localStorage.setItem('cashpedal_calculation_count', '0');
            }
            if (submitted === 'true') {
                var url = new URL(window.parent.location.href);
                if (url.searchParams.get('user_data_submitted') !== 'true') {
                    url.searchParams.set('user_data_submitted', 'true');
                    window.parent.location.replace(url.toString());
                }
            }
        } catch(e) {}
    })();
    </script>
    """, height=0)

def _inject_localstorage_set_user_data():
    """Inject JS to mark user data as submitted in localStorage"""
    components.html("""
    <script>
    (function() {
        try {
            localStorage.setItem('cashpedal_user_data_submitted', 'true');
        } catch(e) {}
    })();
    </script>
    """, height=0)

def _inject_increment_calculation_count():
    """Inject JS to increment calculation count in localStorage and sync to URL"""
    components.html("""
    <script>
    (function() {
        try {
            var count = parseInt(localStorage.getItem('cashpedal_calculation_count') || '0');
            count += 1;
            localStorage.setItem('cashpedal_calculation_count', count.toString());

            // Update query param to match
            var url = new URL(window.parent.location.href);
            url.searchParams.set('calc_count', count.toString());
            window.parent.history.replaceState({}, '', url.toString());
        } catch(e) {}
    })();
    </script>
    """, height=0)

def _inject_get_calculation_count():
    """Inject JS to sync calculation count from localStorage to query params"""
    components.html("""
    <script>
    (function() {
        try {
            var count = localStorage.getItem('cashpedal_calculation_count') || '0';
            var url = new URL(window.parent.location.href);
            var currentCount = url.searchParams.get('calc_count');

            // If counts don't match, update URL and reload to sync with Streamlit
            if (currentCount !== count) {
                url.searchParams.set('calc_count', count);
                window.parent.location.replace(url.toString());
            }
        } catch(e) {}
    })();
    </script>
    """, height=0)

def initialize_user_data_state():
    """Initialize session state for user data collection"""
    # Check query params
    query_params = st.query_params

    # Check if user already submitted
    user_data_param = query_params.get("user_data_submitted", None)
    if isinstance(user_data_param, list):
        user_data_param = user_data_param[0] if user_data_param else None

    if 'user_data_submitted' not in st.session_state:
        st.session_state.user_data_submitted = (user_data_param == "true")

    if user_data_param == "true":
        st.session_state.user_data_submitted = True

    if 'calculation_count' not in st.session_state:
        # Try to get from query params
        calc_count_param = query_params.get("calc_count", "0")
        if isinstance(calc_count_param, list):
            calc_count_param = calc_count_param[0] if calc_count_param else "0"
        try:
            st.session_state.calculation_count = int(calc_count_param)
        except:
            st.session_state.calculation_count = 0

    if 'user_data_record_id' not in st.session_state:
        st.session_state.user_data_record_id = None

    # Inject localStorage check
    if not st.session_state.user_data_submitted:
        _inject_localstorage_check_user_data()

    # Sync calculation count
    _inject_get_calculation_count()

def has_submitted_user_data() -> bool:
    """Check if user has submitted their data"""
    initialize_user_data_state()
    return st.session_state.user_data_submitted

def increment_calculation_count():
    """Increment calculation count and sync to localStorage"""
    initialize_user_data_state()
    st.session_state.calculation_count += 1
    _inject_increment_calculation_count()

    # Update query param
    st.query_params["calc_count"] = str(st.session_state.calculation_count)

def should_show_collector_form() -> bool:
    """Check if collector form should be shown"""
    initialize_user_data_state()

    # Don't show if already submitted
    if st.session_state.user_data_submitted:
        return False

    # Show after 6th calculation
    return st.session_state.calculation_count >= CALCULATION_TRIGGER_COUNT

# ======================
# CLIENT INFO
# ======================

def get_client_ip() -> str:
    """Get client IP address"""
    try:
        headers = st.context.headers if hasattr(st, 'context') else {}
        ip = (headers.get('X-Forwarded-For', '').split(',')[0].strip() or
              headers.get('X-Real-IP', '') or
              headers.get('CF-Connecting-IP', '') or
              'unknown')
        return ip
    except:
        return 'unavailable'

def get_user_agent() -> str:
    """Get browser info"""
    try:
        headers = st.context.headers if hasattr(st, 'context') else {}
        return headers.get('User-Agent', 'unavailable')
    except:
        return 'unavailable'

# ======================
# VALIDATION
# ======================

def validate_email(email: str) -> bool:
    """Validate email format"""
    pattern = r'^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$'
    return re.match(pattern, email) is not None

def validate_name(name: str) -> bool:
    """Validate name (at least 2 characters, letters only)"""
    return len(name.strip()) >= 2 and name.replace(' ', '').replace('-', '').replace("'", '').isalpha()

# ======================
# SAVE USER DATA
# ======================

def save_user_data_to_postgres(record: Dict[str, Any]) -> tuple[bool, Optional[str]]:
    """Save user data to PostgreSQL

    Returns:
        tuple: (success: bool, error_message: Optional[str])
    """
    import psycopg2

    try:
        init_user_data_table()

        conn = psycopg2.connect(get_database_url())
        cursor = conn.cursor()

        cursor.execute('''
            INSERT INTO user_data_collection (
                record_id, session_id, timestamp_utc, first_name,
                last_name, email, calculation_count, ip_address, user_agent
            ) VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s)
        ''', (
            record['record_id'],
            record['session_id'],
            record['timestamp_utc'],
            record['first_name'],
            record['last_name'],
            record['email'],
            record['calculation_count'],
            record['ip_address'],
            record['user_agent']
        ))

        conn.commit()
        conn.close()
        return True, None
    except Exception as e:
        error_msg = f"PostgreSQL error: {type(e).__name__}: {str(e)}"
        print(error_msg)
        return False, error_msg

def save_user_data_to_json(record: Dict[str, Any]) -> bool:
    """Fallback: Save user data to JSON file"""
    os.makedirs(os.path.dirname(USER_DATA_LOG_FILE), exist_ok=True)

    records = []
    if os.path.exists(USER_DATA_LOG_FILE):
        try:
            with open(USER_DATA_LOG_FILE, 'r', encoding='utf-8') as f:
                records = json.load(f)
        except:
            records = []

    records.append(record)

    try:
        with open(USER_DATA_LOG_FILE, 'w', encoding='utf-8') as f:
            json.dump(records, f, indent=2, default=str)
        return True
    except:
        return False

def save_user_data(
    first_name: str,
    last_name: str,
    email: str
) -> tuple[Optional[str], Optional[str]]:
    """Save user data to database

    Returns:
        tuple: (record_id: Optional[str], error_message: Optional[str])
    """

    record_id = str(uuid.uuid4())
    timestamp = datetime.now(timezone.utc)

    # Get session_id from main session state
    session_id = st.session_state.get('session_id', str(uuid.uuid4()))

    record = {
        'record_id': record_id,
        'session_id': session_id,
        'timestamp_utc': timestamp.isoformat(),
        'first_name': first_name.strip(),
        'last_name': last_name.strip(),
        'email': email.strip().lower(),
        'calculation_count': st.session_state.calculation_count,
        'ip_address': get_client_ip(),
        'user_agent': get_user_agent()
    }

    # Try PostgreSQL first, fall back to JSON
    if is_postgres_available():
        success, error_msg = save_user_data_to_postgres(record)
        if success:
            return record_id, None
        else:
            print(f"PostgreSQL save failed: {error_msg}")
            st.session_state.last_user_data_error = error_msg

    # Fallback to JSON
    if save_user_data_to_json(record):
        return record_id, None

    return None, "Failed to save user data to any storage"

# ======================
# COLLECTOR FORM MODAL
# ======================

@st.dialog("🎉 You're Making Smart Decisions!", width="large")
def show_collector_form_modal():
    """Display modal dialog to collect user data"""

    # Header message
    st.markdown("""
    <p style='text-align: center; color: #666; font-size: 1rem; line-height: 1.5; margin-bottom: 20px;'>
        You've completed <strong>6 vehicle calculations</strong>!
        To help us improve CashPedal and keep you updated with valuable insights,
        please share your contact information.
    </p>
    """, unsafe_allow_html=True)

    # Form fields
    with st.form("user_data_collection_form", clear_on_submit=False):
        col1, col2 = st.columns(2)

        with col1:
            first_name = st.text_input(
                "First Name *",
                key="collector_first_name",
                placeholder="John",
                max_chars=100
            )

        with col2:
            last_name = st.text_input(
                "Last Name *",
                key="collector_last_name",
                placeholder="Doe",
                max_chars=100
            )

        email = st.text_input(
            "Email Address *",
            key="collector_email",
            placeholder="john.doe@example.com",
            max_chars=255
        )

        st.markdown("---")

        # Privacy note
        st.markdown("""
        <p style="font-size: 0.85rem; color: #666; text-align: center; margin: 15px 0;">
            🔒 Your information is secure and will never be sold to third parties.
            We'll only use it to improve your CashPedal experience.
        </p>
        """, unsafe_allow_html=True)

        # Submit button
        col1, col2, col3 = st.columns([1, 2, 1])
        with col2:
            submit_button = st.form_submit_button(
                "Submit & Continue",
                type="primary",
                use_container_width=True
            )

        # Validation and submission
        if submit_button:
            errors = []

            # Validate first name
            if not first_name or not validate_name(first_name):
                errors.append("Please enter a valid first name (at least 2 letters)")

            # Validate last name
            if not last_name or not validate_name(last_name):
                errors.append("Please enter a valid last name (at least 2 letters)")

            # Validate email
            if not email or not validate_email(email):
                errors.append("Please enter a valid email address")

            if errors:
                for error in errors:
                    st.error(error)
            else:
                # Save data
                record_id, error_msg = save_user_data(
                    first_name=first_name,
                    last_name=last_name,
                    email=email
                )

                if record_id:
                    st.session_state.user_data_submitted = True
                    st.session_state.user_data_record_id = record_id

                    # Set query parameter
                    st.query_params["user_data_submitted"] = "true"

                    # Persist to localStorage
                    _inject_localstorage_set_user_data()

                    st.success("✅ Thank you! Your information has been saved.")
                    st.balloons()

                    # Small delay then rerun to close modal
                    import time
                    time.sleep(1)
                    st.rerun()
                else:
                    st.error(f"Failed to save your information: {error_msg}")
                    st.info("Please try again or contact support@cashpedal.io")

    # Show last error if any
    if 'last_user_data_error' in st.session_state and st.session_state.last_user_data_error:
        with st.expander("⚠️ Database Error Details", expanded=False):
            st.error(st.session_state.last_user_data_error)
            st.info("Don't worry - we'll save your data to backup storage.")

# ======================
# MAIN FUNCTIONS
# ======================

def check_and_show_collector_form():
    """Check if form should be shown and display it

    Call this after a successful calculation.
    """
    if should_show_collector_form():
        show_collector_form_modal()
        return True
    return False

# ======================
# ADMIN FUNCTIONS
# ======================

def get_user_data_count() -> int:
    """Get total user data records"""
    if is_postgres_available():
        import psycopg2
        try:
            conn = psycopg2.connect(get_database_url())
            cursor = conn.cursor()
            cursor.execute('SELECT COUNT(*) FROM user_data_collection')
            count = cursor.fetchone()[0]
            conn.close()
            return count
        except:
            pass

    # Fallback to JSON
    if os.path.exists(USER_DATA_LOG_FILE):
        try:
            with open(USER_DATA_LOG_FILE, 'r') as f:
                return len(json.load(f))
        except:
            pass
    return 0
