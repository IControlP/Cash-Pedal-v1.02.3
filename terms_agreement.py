# -*- coding: utf-8 -*-
"""
Terms and Conditions Agreement with PostgreSQL Storage
Permanent legal audit trail for protection

Storage: PostgreSQL (Railway) with JSON file fallback for local dev
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

# Fallback for local development
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
# DATABASE CONNECTION
# ======================

def get_database_url() -> Optional[str]:
    """Get PostgreSQL connection URL from environment"""
    return os.environ.get('DATABASE_URL')

def is_postgres_available() -> bool:
    """Check if PostgreSQL is configured"""
    return get_database_url() is not None

def init_postgres_table():
    """Create consent_records table if it doesn't exist"""
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
    
    cursor.execute('''
        CREATE INDEX IF NOT EXISTS idx_consent_timestamp 
        ON consent_records(timestamp_utc)
    ''')
    
    conn.commit()
    conn.close()

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
# SAVE CONSENT RECORD
# ======================

def save_consent_to_postgres(record: Dict[str, Any]) -> tuple[bool, Optional[str]]:
    """Save consent record to PostgreSQL
    
    Returns:
        tuple: (success: bool, error_message: Optional[str])
    """
    import psycopg2
    
    try:
        init_postgres_table()
        
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
        return True, None
    except Exception as e:
        error_msg = f"PostgreSQL error: {type(e).__name__}: {str(e)}"
        print(error_msg)  # Log to console
        return False, error_msg

def save_consent_to_json(record: Dict[str, Any]) -> bool:
    """Fallback: Save consent record to JSON file"""
    os.makedirs(os.path.dirname(CONSENT_LOG_FILE), exist_ok=True)
    
    records = []
    if os.path.exists(CONSENT_LOG_FILE):
        try:
            with open(CONSENT_LOG_FILE, 'r', encoding='utf-8') as f:
                records = json.load(f)
        except:
            records = []
    
    records.append(record)
    
    try:
        with open(CONSENT_LOG_FILE, 'w', encoding='utf-8') as f:
            json.dump(records, f, indent=2, default=str)
        return True
    except:
        return False

def save_consent_record(
    disclaimers_checked: bool,
    liability_checked: bool,
    final_consent_checked: bool
) -> tuple[Optional[str], Optional[str]]:
    """Save consent record to database
    
    Returns:
        tuple: (record_id: Optional[str], error_message: Optional[str])
    """
    
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
    
    # Try PostgreSQL first, fall back to JSON
    if is_postgres_available():
        success, error_msg = save_consent_to_postgres(record)
        if success:
            return record_id, None
        else:
            # Log the error but continue to JSON fallback
            print(f"PostgreSQL save failed: {error_msg}")
            # Return the error for display
            st.session_state.last_db_error = error_msg
    
    # Fallback to JSON (local development or if PostgreSQL fails)
    if save_consent_to_json(record):
        return record_id, None
    
    return None, "Failed to save consent record to any storage"

# ======================
# TERMS DIALOG
# ======================

@st.dialog("Terms and Conditions", width="large")
def show_terms_dialog():
    """Display T&C dialog with legal checkboxes"""
    
    st.markdown("### Please Review Our Terms and Conditions")
    st.markdown(f"**Version {TERMS_VERSION}** - You must accept to use CashPedal.")
    
    st.markdown("---")
    
    with st.container(height=350):
        st.markdown(TERMS_AND_CONDITIONS)
    
    st.markdown("---")
    st.markdown("#### Please confirm:")
    
    disclaimer_check = st.checkbox(
        "I understand all estimates are **approximations only** and may differ "
        "from actual costs.",
        key="disclaimer_checkbox"
    )
    
    liability_check = st.checkbox(
        "I understand CashPedal is **not liable** for any decisions I make "
        "based on this information.",
        key="liability_checkbox"
    )
    
    consent_check = st.checkbox(
        "I have **read and agree** to the Terms and Conditions.",
        key="consent_checkbox"
    )
    
    st.markdown("---")
    
    all_checked = disclaimer_check and liability_check and consent_check
    
    if not all_checked:
        st.warning("Please check all boxes to continue.")
    
    # Show last error if any
    if 'last_db_error' in st.session_state and st.session_state.last_db_error:
        with st.expander("⚠️ Database Error Details", expanded=True):
            st.error(st.session_state.last_db_error)
            st.info("Don't worry - your consent was saved to backup storage and the app will work normally.")
    
    col1, col2 = st.columns(2)
    
    with col1:
        if st.button(
            "I Accept",
            type="primary",
            use_container_width=True,
            disabled=not all_checked
        ):
            record_id, error_msg = save_consent_record(
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
                st.error(f"Failed to save consent: {error_msg}")
                st.info("Please try again or contact support@cashpedal.io")
    
    with col2:
        if st.button("Decline", use_container_width=True):
            st.error("You must accept the Terms to use CashPedal.")

# ======================
# MAIN FUNCTION
# ======================

def require_terms_acceptance() -> bool:
    """
    Call at start of every page.
    
    Usage:
        from terms_agreement import require_terms_acceptance
        
        def main():
            if not require_terms_acceptance():
                st.stop()
    """
    initialize_terms_state()
    
    if not has_accepted_terms():
        show_terms_dialog()
        return False
    return True

# ======================
# ADMIN FUNCTIONS
# ======================

def get_consent_count() -> int:
    """Get total consent records"""
    if is_postgres_available():
        import psycopg2
        try:
            conn = psycopg2.connect(get_database_url())
            cursor = conn.cursor()
            cursor.execute('SELECT COUNT(*) FROM consent_records')
            count = cursor.fetchone()[0]
            conn.close()
            return count
        except:
            pass
    
    # Fallback to JSON
    if os.path.exists(CONSENT_LOG_FILE):
        try:
            with open(CONSENT_LOG_FILE, 'r') as f:
                return len(json.load(f))
        except:
            pass
    return 0

def get_recent_consents(limit: int = 10) -> List[Dict]:
    """Get recent consent records"""
    if is_postgres_available():
        import psycopg2
        try:
            conn = psycopg2.connect(get_database_url())
            cursor = conn.cursor()
            cursor.execute('''
                SELECT record_id, timestamp_utc, ip_address, terms_version 
                FROM consent_records 
                ORDER BY timestamp_utc DESC 
                LIMIT %s
            ''', (limit,))
            rows = cursor.fetchall()
            conn.close()
            return [
                {'record_id': r[0], 'timestamp': r[1], 'ip': r[2], 'version': r[3]}
                for r in rows
            ]
        except:
            pass
    return []

def reset_terms_session():
    """Reset session - for testing only"""
    st.session_state.terms_accepted = False
    st.session_state.terms_version_accepted = None
    st.session_state.consent_record_id = None

def test_database_write():
    """Test function to manually try saving a test record"""
    test_record = {
        'record_id': str(uuid.uuid4()),
        'session_id': 'test-session-' + str(uuid.uuid4()),
        'timestamp_utc': datetime.now(timezone.utc).isoformat(),
        'terms_version': TERMS_VERSION,
        'ip_address': 'test-ip',
        'user_agent': 'test-agent',
        'consent_checkboxes': {
            'disclaimers_acknowledged': True,
            'liability_acknowledged': True,
            'final_consent_given': True
        },
        'consent_method': 'test_write',
        'terms_text_hash': hashlib.sha256(TERMS_AND_CONDITIONS.encode()).hexdigest()
    }
    test_record['integrity_hash'] = generate_integrity_hash(test_record)
    
    if is_postgres_available():
        success, error_msg = save_consent_to_postgres(test_record)
        return success, error_msg, test_record['record_id']
    else:
        return False, "PostgreSQL not available", None

# ======================
# DEBUG FUNCTION
# ======================

def show_database_debug_info():
    """Display database connection debug information"""
    st.write("### Database Debug Information")
    st.write(f"**PostgreSQL available:** {is_postgres_available()}")
    
    db_url = get_database_url()
    if db_url:
        # Hide sensitive connection string
        st.write(f"**DATABASE_URL:** Set (length: {len(db_url)} characters)")
    else:
        st.write("**DATABASE_URL:** Not set")
    
    st.write(f"**Session ID:** {st.session_state.session_id if 'session_id' in st.session_state else 'Not initialized'}")
    
    # Test PostgreSQL connection
    if is_postgres_available():
        st.write("---")
        st.write("### PostgreSQL Connection Test")
        
        try:
            import psycopg2
            conn = psycopg2.connect(get_database_url())
            cursor = conn.cursor()
            
            # Test 1: Get database version
            cursor.execute('SELECT version()')
            version = cursor.fetchone()[0]
            st.success(f"✅ PostgreSQL connection successful!")
            st.code(version, language="text")
            
            # Test 2: Check if table exists
            cursor.execute("""
                SELECT EXISTS (
                    SELECT FROM information_schema.tables 
                    WHERE table_name = 'consent_records'
                )
            """)
            table_exists = cursor.fetchone()[0]
            
            if table_exists:
                st.success("✅ Table 'consent_records' exists")
                
                # Test 3: Get table structure
                cursor.execute("""
                    SELECT column_name, data_type 
                    FROM information_schema.columns 
                    WHERE table_name = 'consent_records'
                    ORDER BY ordinal_position
                """)
                columns = cursor.fetchall()
                st.write("**Table Structure:**")
                for col_name, col_type in columns:
                    st.write(f"- `{col_name}`: {col_type}")
                
                # Test 4: Count records
                cursor.execute("SELECT COUNT(*) FROM consent_records")
                count = cursor.fetchone()[0]
                st.metric("Records in Database", count)
                
                # Test 5: Show last 3 records
                if count > 0:
                    cursor.execute("""
                        SELECT record_id, timestamp_utc, terms_version 
                        FROM consent_records 
                        ORDER BY timestamp_utc DESC 
                        LIMIT 3
                    """)
                    recent = cursor.fetchall()
                    st.write("**Recent Records:**")
                    for rec in recent:
                        st.write(f"- {rec[1].strftime('%Y-%m-%d %H:%M:%S')} UTC - Version {rec[2]} - ID: {rec[0][:8]}...")
            else:
                st.warning("⚠️ Table 'consent_records' does not exist - will be created on first use")
            
            conn.close()
            
        except Exception as e:
            st.error(f"❌ PostgreSQL connection failed!")
            st.code(f"{type(e).__name__}: {str(e)}", language="text")
            st.info("Common issues:\n- Database credentials incorrect\n- Database not accessible from Railway\n- Network connectivity issues")
    else:
        st.warning("⚠️ PostgreSQL not configured - using JSON fallback")
        st.write(f"**Fallback file:** {CONSENT_LOG_FILE}")
        if os.path.exists(CONSENT_LOG_FILE):
            st.write(f"**JSON file exists:** Yes")
            try:
                with open(CONSENT_LOG_FILE, 'r') as f:
                    records = json.load(f)
                st.metric("Records in JSON File", len(records))
            except:
                st.write("**JSON file status:** Exists but could not read")
        else:
            st.write(f"**JSON file exists:** No (will be created on first consent)")
    
    # Show last error if any
    if 'last_db_error' in st.session_state and st.session_state.last_db_error:
        st.write("---")
        st.write("### Last Database Error")
        st.error(st.session_state.last_db_error)
