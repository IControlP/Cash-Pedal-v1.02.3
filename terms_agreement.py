# -*- coding: utf-8 -*-
"""
Terms and Conditions Agreement with PostgreSQL Storage
Fixed: Non-bypassable + better database error handling
"""

import streamlit as st
import os
import json
import hashlib
import uuid
from datetime import datetime, timezone
from typing import Optional, Dict, Any, List

# ======================
# CONFIGURATION
# ======================

TERMS_VERSION = "1.0.0"
TERMS_LAST_UPDATED = "January 2025"
CONSENT_LOG_FILE = "user_data/consent_log.json"

# ======================
# TERMS TEXT
# ======================

TERMS_AND_CONDITIONS = """
## Terms and Conditions

**Version {version} - Last Updated: {last_updated}**

### 1. Acceptance of Terms

By accessing and using CashPedal.io ("the Service"), you acknowledge that you have read, 
understood, and agree to be bound by these Terms and Conditions. If you do not agree 
to these terms, you must not use the Service.

### 2. Service Description

CashPedal provides vehicle Total Cost of Ownership (TCO) calculations and estimates 
for informational purposes only.

### 3. Disclaimer of Warranties

**THE SERVICE IS PROVIDED "AS IS" WITHOUT WARRANTIES OF ANY KIND.**

- All estimates are approximations based on statistical models
- Actual costs may vary significantly
- We do not guarantee accuracy, completeness, or reliability

### 4. Not Financial Advice

**CashPedal does NOT provide financial, legal, or professional advice.**

- Information is for educational purposes only
- Consult qualified professionals before making financial decisions
- Reliance on this information is at your own risk

### 5. Limitation of Liability

**TO THE MAXIMUM EXTENT PERMITTED BY LAW:**

- CashPedal shall not be liable for any direct, indirect, incidental, special, 
  consequential, or punitive damages
- We are not liable for decisions made based on our estimates
- Our total liability shall not exceed the amount paid for the Service (if any)

### 6. Indemnification

You agree to indemnify and hold harmless CashPedal from any claims, damages, or 
expenses arising from your use of the Service or violation of these Terms.

### 7. Assumption of Risk

By using this Service, you acknowledge that:
- Vehicle decisions involve financial risks
- Estimates are not guarantees
- You are responsible for verifying information

### 8. Privacy

- We log your acceptance of these Terms for legal compliance
- We do not sell your personal information

### 9. Modifications

We may modify these Terms at any time. Continued use constitutes acceptance.

### 10. Contact

Questions? Email **support@cashpedal.io**

---

**BY CLICKING "I ACCEPT", YOU ACKNOWLEDGE THAT YOU HAVE READ, UNDERSTOOD, AND 
AGREE TO BE BOUND BY THESE TERMS AND CONDITIONS.**
""".format(version=TERMS_VERSION, last_updated=TERMS_LAST_UPDATED)

# ======================
# DATABASE FUNCTIONS
# ======================

def get_database_url() -> Optional[str]:
    """Get PostgreSQL connection URL"""
    return os.environ.get('DATABASE_URL')

def is_postgres_available() -> bool:
    """Check if PostgreSQL is configured"""
    return get_database_url() is not None

def init_postgres_table() -> bool:
    """Create table if not exists - returns success status"""
    try:
        import psycopg2
        conn = psycopg2.connect(get_database_url())
        cursor = conn.cursor()
        
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS consent_records (
                id SERIAL PRIMARY KEY,
                record_id VARCHAR(36) UNIQUE NOT NULL,
                session_id VARCHAR(36) NOT NULL,
                timestamp_utc TIMESTAMP WITH TIME ZONE NOT NULL,
                terms_version VARCHAR(20) NOT NULL,
                ip_address VARCHAR(45),
                user_agent TEXT,
                disclaimers_acknowledged BOOLEAN DEFAULT FALSE,
                liability_acknowledged BOOLEAN DEFAULT FALSE,
                final_consent_given BOOLEAN DEFAULT FALSE,
                consent_method VARCHAR(50),
                terms_text_hash VARCHAR(64),
                integrity_hash VARCHAR(64),
                created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
            )
        ''')
        
        conn.commit()
        conn.close()
        return True
    except Exception as e:
        st.error(f"Database init error: {e}")
        return False

def save_consent_to_postgres(record: Dict[str, Any]) -> bool:
    """Save to PostgreSQL"""
    try:
        import psycopg2
        
        # Initialize table first
        if not init_postgres_table():
            return False
        
        conn = psycopg2.connect(get_database_url())
        cursor = conn.cursor()
        
        cursor.execute('''
            INSERT INTO consent_records (
                record_id, session_id, timestamp_utc, terms_version,
                ip_address, user_agent, disclaimers_acknowledged,
                liability_acknowledged, final_consent_given,
                consent_method, terms_text_hash, integrity_hash
            ) VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
        ''', (
            record['record_id'],
            record['session_id'],
            record['timestamp_utc'],
            record['terms_version'],
            record['ip_address'],
            record['user_agent'],
            record['consent_checkboxes']['disclaimers_acknowledged'],
            record['consent_checkboxes']['liability_acknowledged'],
            record['consent_checkboxes']['final_consent_given'],
            record['consent_method'],
            record['terms_text_hash'],
            record['integrity_hash']
        ))
        
        conn.commit()
        conn.close()
        return True
    except Exception as e:
        st.error(f"Database save error: {e}")
        return False

def save_consent_to_json(record: Dict[str, Any]) -> bool:
    """Fallback: Save to JSON file"""
    try:
        os.makedirs(os.path.dirname(CONSENT_LOG_FILE), exist_ok=True)
        
        records = []
        if os.path.exists(CONSENT_LOG_FILE):
            try:
                with open(CONSENT_LOG_FILE, 'r', encoding='utf-8') as f:
                    records = json.load(f)
            except:
                records = []
        
        records.append(record)
        
        with open(CONSENT_LOG_FILE, 'w', encoding='utf-8') as f:
            json.dump(records, f, indent=2, default=str)
        return True
    except Exception as e:
        st.error(f"JSON save error: {e}")
        return False

# ======================
# SESSION STATE
# ======================

def initialize_terms_state():
    """Initialize session state"""
    if 'terms_accepted' not in st.session_state:
        st.session_state.terms_accepted = False
    if 'terms_version_accepted' not in st.session_state:
        st.session_state.terms_version_accepted = None
    if 'session_id' not in st.session_state:
        st.session_state.session_id = str(uuid.uuid4())
    if 'consent_record_id' not in st.session_state:
        st.session_state.consent_record_id = None

def has_accepted_terms() -> bool:
    """Check if user accepted current T&C version"""
    initialize_terms_state()
    return (st.session_state.terms_accepted and 
            st.session_state.terms_version_accepted == TERMS_VERSION)

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

def generate_integrity_hash(record: Dict[str, Any]) -> str:
    """Generate tamper-detection hash"""
    hash_string = f"{record['session_id']}|{record['timestamp_utc']}|{record['terms_version']}|{record['ip_address']}"
    return hashlib.sha256(hash_string.encode()).hexdigest()

# ======================
# SAVE CONSENT
# ======================

def save_consent_record(
    disclaimers_checked: bool,
    liability_checked: bool,
    final_consent_checked: bool
) -> Optional[str]:
    """Save consent record - tries PostgreSQL then JSON fallback"""
    
    record_id = str(uuid.uuid4())
    timestamp = datetime.now(timezone.utc)
    
    record = {
        'record_id': record_id,
        'session_id': st.session_state.session_id,
        'timestamp_utc': timestamp.isoformat(),
        'terms_version': TERMS_VERSION,
        'ip_address': get_client_ip(),
        'user_agent': get_user_agent(),
        'consent_checkboxes': {
            'disclaimers_acknowledged': disclaimers_checked,
            'liability_acknowledged': liability_checked,
            'final_consent_given': final_consent_checked
        },
        'consent_method': 'explicit_checkbox_and_button',
        'terms_text_hash': hashlib.sha256(TERMS_AND_CONDITIONS.encode()).hexdigest()
    }
    record['integrity_hash'] = generate_integrity_hash(record)
    
    # Try PostgreSQL first
    if is_postgres_available():
        if save_consent_to_postgres(record):
            return record_id
        # If PostgreSQL fails, fall through to JSON
    
    # Fallback to JSON
    if save_consent_to_json(record):
        return record_id
    
    return None

# ======================
# FULL PAGE TERMS (NON-BYPASSABLE)
# ======================

def show_terms_fullpage():
    """
    Display T&C as full page blocker - CANNOT be bypassed
    This replaces the dialog approach
    """
    
    # Block the entire page with terms
    st.markdown("# Terms and Conditions")
    st.markdown(f"**Version {TERMS_VERSION}** - You must accept to use CashPedal.")
    
    st.markdown("---")
    
    # Scrollable terms
    with st.container(height=400):
        st.markdown(TERMS_AND_CONDITIONS)
    
    st.markdown("---")
    st.markdown("### Please confirm:")
    
    disclaimer_check = st.checkbox(
        "I understand all estimates are **approximations only** and may differ from actual costs.",
        key="disclaimer_checkbox"
    )
    
    liability_check = st.checkbox(
        "I understand CashPedal is **not liable** for any decisions I make based on this information.",
        key="liability_checkbox"
    )
    
    consent_check = st.checkbox(
        "I have **read and agree** to the Terms and Conditions.",
        key="consent_checkbox"
    )
    
    st.markdown("---")
    
    all_checked = disclaimer_check and liability_check and consent_check
    
    if not all_checked:
        st.warning("Please check all three boxes above to continue.")
    
    col1, col2, col3 = st.columns([1, 2, 1])
    
    with col2:
        if st.button(
            "I Accept the Terms and Conditions",
            type="primary",
            use_container_width=True,
            disabled=not all_checked
        ):
            # Save to database
            record_id = save_consent_record(
                disclaimers_checked=disclaimer_check,
                liability_checked=liability_check,
                final_consent_checked=consent_check
            )
            
            if record_id:
                st.session_state.terms_accepted = True
                st.session_state.terms_version_accepted = TERMS_VERSION
                st.session_state.consent_record_id = record_id
                st.rerun()
            else:
                st.error("Failed to save your acceptance. Please try again.")
    
    # Show storage status for debugging (can remove in production)
    with st.expander("Debug Info", expanded=False):
        st.write(f"PostgreSQL available: {is_postgres_available()}")
        st.write(f"DATABASE_URL set: {get_database_url() is not None}")
        st.write(f"Session ID: {st.session_state.session_id}")

# ======================
# MAIN FUNCTION
# ======================

def require_terms_acceptance() -> bool:
    """
    Call at start of every page.
    Shows FULL PAGE terms if not accepted - cannot be bypassed.
    
    Usage:
        from terms_agreement import require_terms_acceptance
        
        def main():
            if not require_terms_acceptance():
                st.stop()
            
            # ... your page code (only runs after acceptance)
    """
    initialize_terms_state()
    
    if not has_accepted_terms():
        show_terms_fullpage()
        st.stop()  # Prevent ANY other content from showing
        return False
    
    return True

# ======================
# ADMIN FUNCTIONS
# ======================

def get_consent_count() -> int:
    """Get total consent records"""
    if is_postgres_available():
        try:
            import psycopg2
            conn = psycopg2.connect(get_database_url())
            cursor = conn.cursor()
            cursor.execute('SELECT COUNT(*) FROM consent_records')
            count = cursor.fetchone()[0]
            conn.close()
            return count
        except:
            pass
    
    if os.path.exists(CONSENT_LOG_FILE):
        try:
            with open(CONSENT_LOG_FILE, 'r') as f:
                return len(json.load(f))
        except:
            pass
    return 0

def reset_terms_session():
    """Reset session - for testing only"""
    st.session_state.terms_accepted = False
    st.session_state.terms_version_accepted = None
    st.session_state.consent_record_id = None
