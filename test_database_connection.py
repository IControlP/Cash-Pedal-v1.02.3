# -*- coding: utf-8 -*-
"""
Database Connection Test Page
Quick diagnostic tool for PostgreSQL setup
"""

import streamlit as st
from terms_agreement import (
    show_database_debug_info,
    initialize_terms_state,
    get_consent_count,
    reset_terms_session
)

st.set_page_config(
    page_title="Database Debug - CashPedal",
    page_icon="🔧",
    layout="centered"
)

st.title("🔧 Database Connection Debug")

# Initialize session
initialize_terms_state()

# Show debug information
show_database_debug_info()

st.markdown("---")

# Show consent count
st.write("### Consent Records")
count = get_consent_count()
st.metric("Total Consents Logged", count)

st.markdown("---")

# Testing tools
st.write("### Testing Tools")

col1, col2, col3 = st.columns(3)

with col1:
    if st.button("Reset Session", type="secondary"):
        reset_terms_session()
        st.success("Session reset! Refresh page to see terms dialog.")

with col2:
    if st.button("Test Database Write", type="primary"):
        from terms_agreement import test_database_write
        success, error_msg, record_id = test_database_write()
        if success:
            st.success(f"✅ Test write successful! Record ID: {record_id[:8]}...")
        else:
            st.error(f"❌ Test write failed: {error_msg}")

with col3:
    if st.button("Refresh", type="primary"):
        st.rerun()

st.markdown("---")

# Instructions
st.write("### How to Fix PostgreSQL Connection")

st.markdown("""
If you see `PostgreSQL available: False`, follow these steps on Railway:

1. **Add PostgreSQL Service**
   - Go to Railway dashboard
   - Click "+ New" → "Database" → "Add PostgreSQL"
   - Railway will provision the database

2. **Verify Environment Variable**
   - Click on your Streamlit service
   - Go to "Variables" tab
   - Check for `DATABASE_URL` (should appear automatically)

3. **Redeploy**
   - Push new code or trigger manual deploy
   - Check this page again

4. **Expected Result**
   - ✅ PostgreSQL connection successful!
   - Consent records will be stored permanently
""")
