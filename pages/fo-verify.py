"""
FlexOffers HTML Verification File
This page will be accessible at: https://cashpedal.io/fo-verify

Note: Streamlit routes pages by filename, so this page is accessible without .py extension
"""

import streamlit as st

# Complete page configuration - use minimal setup
st.set_page_config(
    page_title="",
    page_icon="✓",
    layout="centered",
    initial_sidebar_state="collapsed"
)

# Hide ALL Streamlit UI elements to make it look like a plain HTML page
hide_everything = """
<style>
    /* Hide Streamlit branding and UI */
    #MainMenu {visibility: hidden !important;}
    footer {visibility: hidden !important;}
    header {visibility: hidden !important;}
    .stApp > header {visibility: hidden !important;}
    [data-testid="stToolbar"] {visibility: hidden !important;}
    [data-testid="stDecoration"] {visibility: hidden !important;}
    [data-testid="stStatusWidget"] {visibility: hidden !important;}
    #stDecoration {display: none !important;}
    
    /* Hide sidebar completely */
    [data-testid="stSidebar"] {display: none !important;}
    [data-testid="collapsedControl"] {display: none !important;}
    
    /* Make background white and clean */
    .stApp {background-color: white !important;}
    .main .block-container {
        padding: 20px !important;
        max-width: 100% !important;
    }
    
    /* Hide all Streamlit elements */
    .stMarkdown {padding: 0 !important;}
</style>

<!-- Add the verification meta tag -->
<meta name="fo-verify" content="df7203c6-f078-4576-8957-fdf45f55a848">
"""

st.markdown(hide_everything, unsafe_allow_html=True)

# Display the verification message
st.markdown("""
<h2>This file is used to verify website ownership only.</h2>
""", unsafe_allow_html=True)
