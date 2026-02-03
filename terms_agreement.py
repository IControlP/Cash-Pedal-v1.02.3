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
    """Get PostgreSQL connection URL from environment
    
    Railway provides multiple URL formats:
    - DATABASE_URL: Public URL (may be socket-based)
    - DATABASE_PRIVATE_URL: Internal network URL (TCP/IP)
    
    We prefer DATABASE_PRIVATE_URL for container-to-container communication.
    """
    
    # First, try Railway's private internal network URL (preferred)
    private_url = os.environ.get('DATABASE_PRIVATE_URL', '').strip()
    if private_url and private_url != '' and private_url != '<empty string>':
        return private_url
    
    # Fall back to DATABASE_URL
    db_url = os.environ.get('DATABASE_URL', '').strip()
    
    if not db_url or db_url == '' or db_url == '<empty string>':
        return None
    
    # If DATABASE_URL is socket-based, we need to convert it
    # Railway socket format: postgresql://user:pass@/db?host=/var/run/postgresql
    if 'host=/var/run/postgresql' in db_url or '.s.PGSQL' in db_url:
        import re
        
        # Try to extract and reconstruct as TCP/IP
        # Pattern: postgresql://username:password@[host]/database[?params]
        pattern = r'postgresql://([^:]+):([^@]+)@[^/]*/([^?]+)'
        match = re.search(pattern, db_url)
        
        if match:
            username = match.group(1)
            password = match.group(2)
            database = match.group(3)
            
            # Construct TCP/IP URL
            # Railway's internal PostgreSQL hostname is typically the service name
            # Try common Railway patterns
            tcp_url = f'postgresql://{username}:{password}@postgres.railway.internal:5432/{database}'
            
            print(f"âš ï¸ Converted socket-based URL to TCP/IP")
            print(f"   Original: {db_url[:50]}...")
            print(f"   Converted: {tcp_url[:50]}...")
            
            return tcp_url
    
    return db_url

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
    """Initialize session state with query param persistence"""
    # Check URL query parameters for acceptance flag
    query_params = st.query_params
    terms_param = query_params.get("terms_accepted", None)
    
    if 'terms_accepted' not in st.session_state:
        # Check if URL indicates acceptance
        st.session_state.terms_accepted = (terms_param == "true")
    if 'terms_version_accepted' not in st.session_state:
        if terms_param == "true":
            st.session_state.terms_version_accepted = TERMS_VERSION
        else:
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
# TERMS FULL-SCREEN DISPLAY (NON-BYPASSABLE)
# ======================

def show_terms_fullscreen():
    """Display non-bypassable full-screen terms acceptance"""
    
    # Hide all normal page content and sidebar
    st.markdown("""
    <style>
    /* Hide main content */
    .main .block-container {
        display: none !important;
    }
    
    /* Hide sidebar */
    section[data-testid="stSidebar"] {
        display: none !important;
    }
    
    /* Hide header */
    header[data-testid="stHeader"] {
        display: none !important;
    }
    
    /* Full screen overlay */
    .terms-fullscreen-overlay {
        position: fixed !important;
        top: 0 !important;
        left: 0 !important;
        width: 100vw !important;
        height: 100vh !important;
        background: white !important;
        z-index: 999999 !important;
        overflow-y: auto !important;
        padding: 20px !important;
    }
    
    .terms-content-wrapper {
        max-width: 900px !important;
        margin: 0 auto !important;
        padding: 40px 30px !important;
    }
    
    .terms-header {
        text-align: center;
        margin-bottom: 30px;
    }
    
    .terms-header h1 {
        color: #1f77b4;
        margin-bottom: 10px;
        font-size: 2.5rem;
    }
    
    .terms-checkbox-box {
        margin: 20px 0;
        padding: 15px;
        background: #f8f9fa;
        border-radius: 8px;
        border-left: 4px solid #1f77b4;
    }
    </style>
    """, unsafe_allow_html=True)
    
    # Create full-screen container
    st.markdown('<div class="terms-fullscreen-overlay"><div class="terms-content-wrapper">', unsafe_allow_html=True)
    
    # Header  
    st.markdown("""
    <div class="terms-header">
        <h1>Welcome to CashPedal</h1>
        <p style="font-size: 1.1rem; color: #666;">
            Please review and accept our Terms and Conditions to continue
        </p>
    </div>
    """, unsafe_allow_html=True)
    
    # Display terms in scrollable container
    with st.expander("View Full Terms and Conditions (Click to Expand)", expanded=False):
        st.markdown(TERMS_AND_CONDITIONS)
    
    st.markdown("---")
    
    # Required acknowledgments
    st.markdown("### Required Acknowledgments")
    st.markdown("**You must check all boxes to proceed:**")
    
    # Checkbox 1
    st.markdown('<div class="terms-checkbox-box">', unsafe_allow_html=True)
    disclaimer_check = st.checkbox(
        "**I understand that CashPedal provides cost estimates for informational and educational purposes only. These are approximations and not guarantees.**",
        key="disclaimer_ack",
        value=False
    )
    st.markdown('</div>', unsafe_allow_html=True)
    
    # Checkbox 2
    st.markdown('<div class="terms-checkbox-box">', unsafe_allow_html=True)
    liability_check = st.checkbox(
        "**I acknowledge the limitation of liability and assumption of risk. CashPedal is not liable for any decisions I make based on these estimates.**",
        key="liability_ack",
        value=False
    )
    st.markdown('</div>', unsafe_allow_html=True)
    
    # Checkbox 3
    st.markdown('<div class="terms-checkbox-box">', unsafe_allow_html=True)
    consent_check = st.checkbox(
        "**I have read, understood, and agree to be bound by the complete Terms and Conditions above.**",
        key="final_consent_ack",
        value=False
    )
    st.markdown('</div>', unsafe_allow_html=True)
    
    # Accept button
    st.markdown("---")
    
    all_checked = disclaimer_check and liability_check and consent_check
    
    if not all_checked:
        st.warning("Please check all three boxes above to accept the terms and continue.")
    
    # Show last error if any
    if 'last_db_error' in st.session_state and st.session_state.last_db_error:
        with st.expander("Database Error Details", expanded=False):
            st.error(st.session_state.last_db_error)
            st.info("Don't worry - your consent was saved to backup storage and the app will work normally.")
    
    # Button container
    col1, col2, col3 = st.columns([1, 2, 1])
    with col2:
        if st.button(
            "I Accept These Terms - Continue to CashPedal", 
            type="primary",
            disabled=not all_checked,
            use_container_width=True,
            key="accept_terms_button"
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
                
                # Set query parameter to persist acceptance across page loads
                st.query_params["terms_accepted"] = "true"
                
                st.success("Terms accepted! Loading application...")
                st.rerun()
            else:
                st.error(f"Failed to save consent: {error_msg}")
                st.info("Please try again or contact support@cashpedal.io")
    
    st.markdown("---")
    st.markdown("""
    <p style="text-align: center; color: #666; font-size: 0.9rem;">
        Questions about our terms? Contact <strong>support@cashpedal.io</strong>
    </p>
    """, unsafe_allow_html=True)
    
    st.markdown('</div></div>', unsafe_allow_html=True)

# ======================
# MAIN FUNCTION
# ======================

def require_terms_acceptance() -> bool:
    """
    Call at start of every page - BEFORE any page configuration.
    
    This function MUST be called before st.set_page_config() to ensure
    the terms are displayed on every page load.
    
    Usage:
        from terms_agreement import require_terms_acceptance
        
        # BEFORE st.set_page_config()
        if not require_terms_acceptance():
            st.stop()
        
        st.set_page_config(...)
        
        def main():
            # Rest of page code
    """
    initialize_terms_state()
    
    if not has_accepted_terms():
        show_terms_fullscreen()
        st.stop()
        return False
    return True

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
    
    # Check both URL types
    db_url = os.environ.get('DATABASE_URL', '').strip()
    private_url = os.environ.get('DATABASE_PRIVATE_URL', '').strip()
    
    st.write("#### Environment Variables")
    
    # Check DATABASE_PRIVATE_URL
    if private_url and private_url != '' and private_url != '<empty string>':
        st.success("âœ… **DATABASE_PRIVATE_URL:** Set (preferred for Railway)")
        st.code(private_url[:80] + "...", language="text")
    elif 'DATABASE_PRIVATE_URL' in os.environ:
        st.error("âŒ **DATABASE_PRIVATE_URL:** Empty string (variable exists but has no value)")
        st.warning("**FIX:** Delete this variable and add it manually with the actual PostgreSQL URL")
    else:
        st.warning("âš ï¸ **DATABASE_PRIVATE_URL:** Not set")
    
    # Check DATABASE_URL
    if db_url and db_url != '' and db_url != '<empty string>':
        if 'socket' in db_url or '/var/run/postgresql' in db_url:
            st.error("âŒ **DATABASE_URL:** Socket-based (won't work in containers)")
            st.code(db_url[:80] + "...", language="text")
        else:
            st.info("â„¹ï¸ **DATABASE_URL:** Set")
            st.code(db_url[:80] + "...", language="text")
    elif 'DATABASE_URL' in os.environ:
        st.error("âŒ **DATABASE_URL:** Empty string (variable exists but has no value)")
        st.warning("**FIX:** Delete this variable and add it manually with the actual PostgreSQL URL")
    else:
        st.error("âŒ **DATABASE_URL:** Not set")
    
    # Show which URL is being used
    final_url = get_database_url()
    if final_url:
        st.write("---")
        st.write("#### Active Connection String")
        if private_url and final_url == private_url:
            st.success("âœ… Using **DATABASE_PRIVATE_URL** (best for Railway)")
        elif 'railway.internal' in final_url:
            st.info("â„¹ï¸ Using **converted TCP/IP URL** (socket URL was converted)")
        else:
            st.info("â„¹ï¸ Using **DATABASE_URL**")
        
        st.code(final_url[:80] + "...", language="text")
    else:
        st.error("âŒ **No valid database URL found!**")
        st.write("---")
        st.write("### ðŸ”§ How to Fix This")
        st.markdown("""
        **Problem:** Variable references showing `<empty string>`
        
        **Solution:**
        1. Go to your **PostgreSQL service** in Railway
        2. Click "Variables" tab
        3. Find `DATABASE_PRIVATE_URL` and click ðŸ‘ï¸ to reveal
        4. **Copy the entire URL**
        5. Go to your **Streamlit service** (this service)
        6. Variables tab â†’ Remove the empty `DATABASE_PRIVATE_URL`
        7. Click "+ New Variable"
        8. Name: `DATABASE_PRIVATE_URL`
        9. Value: **Paste the URL you copied**
        10. Add and redeploy
        
        See **RAILWAY_MANUAL_URL_SETUP.md** for detailed instructions.
        """)
    
    st.write("---")
    st.write(f"**PostgreSQL available:** {is_postgres_available()}")
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
            st.success(f"âœ… PostgreSQL connection successful!")
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
                st.success("âœ… Table 'consent_records' exists")
                
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
                st.warning("âš ï¸ Table 'consent_records' does not exist - will be created on first use")
            
            conn.close()
            
        except Exception as e:
            st.error(f"âŒ PostgreSQL connection failed!")
            st.code(f"{type(e).__name__}: {str(e)}", language="text")
            
            # Provide specific guidance based on error
            error_str = str(e)
            if 'empty' in error_str.lower() or 'invalid dsn' in error_str.lower():
                st.warning("**Issue:** Empty or invalid connection string")
                st.info("**Solution:** Follow the steps above to manually add the PostgreSQL URL")
            elif 'socket' in error_str or '/var/run/postgresql' in error_str:
                st.warning("**Issue:** Socket-based connection not working in container")
                st.info("**Solution:** Use DATABASE_PRIVATE_URL instead of DATABASE_URL")
            elif 'password authentication failed' in error_str:
                st.warning("**Issue:** Incorrect database credentials")
            elif 'could not connect' in error_str or 'connection refused' in error_str:
                st.warning("**Issue:** Cannot reach PostgreSQL service")
                st.info("Make sure both services are in the same Railway project")
    else:
        st.warning("âš ï¸ PostgreSQL not configured - using JSON fallback")
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
