"""
Theme Utilities for CashPedal
Handles theming using Streamlit's native config.toml system
Provides minimal CSS enhancements for brand consistency
"""

import streamlit as st


def get_theme_css():
    """
    Generate minimal CSS that enhances the native Streamlit theme.
    Main theming is now handled by .streamlit/config.toml for better compatibility.
    """

    css = """
    <style>
    /* Minimal CSS enhancements - main theme is in config.toml */

    /* Feature cards with brand styling */
    .feature-card {
        background: linear-gradient(145deg, #F5F3F9, #EDE9F5);
        padding: 1.5rem;
        border-radius: 12px;
        border-left: 4px solid #F5A623;
        margin-bottom: 1rem;
        box-shadow: 0 2px 10px rgba(0, 0, 0, 0.05);
        transition: all 0.3s ease;
    }

    .feature-card:hover {
        box-shadow: 0 4px 20px rgba(245, 166, 35, 0.2);
        transform: translateY(-2px);
    }

    .feature-card h3 {
        color: #F5A623;
        margin-top: 0;
        margin-bottom: 0.75rem;
        font-size: 1.25rem;
    }

    .feature-card p {
        color: #1A1625;
        margin-bottom: 0.5rem;
        line-height: 1.6;
    }

    .feature-card li {
        color: #333333;
        margin-bottom: 0.25rem;
        line-height: 1.5;
    }

    /* Page navigation styling for better visibility */
    [data-testid="stSidebarNav"] a {
        padding: 0.75rem 1rem !important;
        border-radius: 8px !important;
        margin: 4px 0 !important;
        font-weight: 500 !important;
        transition: all 0.2s ease !important;
    }

    [data-testid="stSidebarNav"] a:hover {
        background-color: #EDE9F5 !important;
        border-left: 3px solid #F5A623 !important;
    }

    [data-testid="stSidebarNav"] a[aria-current="page"] {
        background: linear-gradient(135deg, #F5A623, #E09000) !important;
        color: white !important;
        font-weight: 600 !important;
        box-shadow: 0 2px 8px rgba(245, 166, 35, 0.3) !important;
    }

    /* Info boxes styling */
    .stAlert {
        border-radius: 10px !important;
    }

    /* Button enhancements */
    .stButton > button {
        background: linear-gradient(135deg, #F5A623, #E09000) !important;
        color: white !important;
        border: none !important;
        font-weight: 600 !important;
        border-radius: 8px !important;
        padding: 0.5rem 1rem !important;
        transition: all 0.3s ease !important;
        box-shadow: 0 2px 8px rgba(245, 166, 35, 0.3) !important;
    }

    .stButton > button:hover {
        box-shadow: 0 4px 15px rgba(245, 166, 35, 0.5) !important;
        transform: translateY(-1px) !important;
    }

    /* Metric styling */
    [data-testid="stMetricValue"] {
        color: #F5A623 !important;
        font-weight: 600 !important;
    }

    /* Table styling */
    table {
        border-collapse: collapse;
        width: 100%;
    }

    th, td {
        padding: 12px;
        text-align: left;
        border-bottom: 1px solid #D0C9E0;
    }

    th {
        background-color: #F5F3F9;
        color: #F5A623;
        font-weight: 600;
    }

    /* Divider styling */
    hr {
        border-color: #D0C9E0 !important;
        opacity: 0.6;
    }

    /* Mobile responsive */
    @media screen and (max-width: 768px) {
        .feature-card {
            padding: 1rem;
            margin-bottom: 0.75rem;
        }

        .stButton > button {
            min-height: 48px !important;
        }

        .stNumberInput input,
        .stTextInput input {
            font-size: 16px !important; /* Prevents iOS zoom */
        }
    }
    </style>
    """
    return css


def apply_theme():
    """
    Apply the CashPedal theme to the current page.
    Call this at the beginning of each page's main function, after set_page_config.
    """
    st.markdown(get_theme_css(), unsafe_allow_html=True)


def get_footer_html(version: str = "1.02.3") -> str:
    """
    Get the standard CashPedal footer HTML.
    """
    return f"""
    <div class="footer">
    CashPedal - Vehicle TCO Calculator v{version} |
    Powered by Streamlit |
    <a href='https://www.cashpedal.io'>www.cashpedal.io</a>
    </div>
    """
