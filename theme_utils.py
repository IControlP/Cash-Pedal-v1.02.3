"""
Theme Utilities for CashPedal
Handles device detection (mobile/desktop) and theme management (light/dark mode)
Provides consistent styling across all pages using pure CSS media queries
"""

import streamlit as st

# CashPedal Theme Colors
THEME_COLORS = {
    # Dark mode colors
    "dark": {
        "primary": "#F5A623",
        "primary_light": "#FFB84D",
        "background": "#1A1625",
        "secondary_bg": "#2D2640",
        "card_bg": "#352F4D",
        "text": "#FAFAFA",
        "text_secondary": "#E0E0E0",
        "text_muted": "#B8B5C4",
        "border": "#4A4363",
    },
    # Light mode colors
    "light": {
        "primary": "#D4880F",
        "primary_light": "#F5A623",
        "background": "#FFFFFF",
        "secondary_bg": "#F5F3F9",
        "card_bg": "#EDE9F5",
        "text": "#1A1625",
        "text_secondary": "#333333",
        "text_muted": "#666666",
        "border": "#D0C9E0",
    }
}


def get_theme_css():
    """
    Generate CSS that responds to device type and theme preference.
    Uses pure CSS media queries for reliable cross-browser support.
    """
    dark = THEME_COLORS["dark"]
    light = THEME_COLORS["light"]
    
    css = f"""
    <style>
    /* =============================================
       LIGHT MODE (Default for desktop)
       ============================================= */
    
    .main-header {{
        font-size: 2.5rem;
        font-weight: bold;
        color: {light["primary"]};
        text-align: center;
        margin-bottom: 0.5rem;
    }}
    
    .sub-header {{
        font-size: 1.2rem;
        color: {light["text_muted"]};
        text-align: center;
        margin-bottom: 2rem;
    }}
    
    .feature-card {{
        background: linear-gradient(145deg, {light["card_bg"]}, {light["secondary_bg"]});
        padding: 1.5rem;
        border-radius: 12px;
        border-left: 4px solid {light["primary"]};
        margin-bottom: 1rem;
        color: {light["text"]};
        box-shadow: 0 4px 15px rgba(0, 0, 0, 0.08);
        transition: all 0.3s ease;
    }}
    
    .feature-card:hover {{
        box-shadow: 0 6px 25px rgba(212, 136, 15, 0.15);
        transform: translateY(-2px);
    }}
    
    .feature-card h3 {{
        color: {light["primary"]};
        margin-top: 0;
        margin-bottom: 0.75rem;
        font-size: 1.25rem;
    }}
    
    .feature-card p {{
        color: {light["text"]};
        margin-bottom: 0.5rem;
        line-height: 1.5;
    }}
    
    .feature-card li {{
        color: {light["text_secondary"]};
        margin-bottom: 0.25rem;
        line-height: 1.4;
    }}
    
    .feature-card ul {{
        margin-bottom: 0;
        padding-left: 1.5rem;
    }}
    
    .key-feature-title {{
        color: {light["primary"]};
        font-weight: 600;
    }}
    
    .footer {{
        text-align: center;
        color: {light["text_muted"]};
        font-size: 12px;
        padding: 1rem 0;
    }}
    
    .footer a {{
        color: {light["primary"]};
        text-decoration: none;
    }}
    
    .footer a:hover {{
        text-decoration: underline;
    }}

    /* =============================================
       DARK MODE (System preference)
       ============================================= */
    
    @media (prefers-color-scheme: dark) {{
        .main-header {{
            color: {dark["primary"]};
            text-shadow: 0 0 30px rgba(245, 166, 35, 0.4);
        }}
        
        .sub-header {{
            color: {dark["text_muted"]};
        }}
        
        .feature-card {{
            background: linear-gradient(145deg, {dark["card_bg"]}, {dark["secondary_bg"]});
            color: {dark["text"]};
            box-shadow: 0 4px 20px rgba(0, 0, 0, 0.4);
            border-left-color: {dark["primary"]};
        }}
        
        .feature-card:hover {{
            box-shadow: 0 8px 30px rgba(245, 166, 35, 0.25);
        }}
        
        .feature-card h3 {{
            color: {dark["primary"]};
        }}
        
        .feature-card p {{
            color: {dark["text"]};
        }}
        
        .feature-card li {{
            color: {dark["text_muted"]};
        }}
        
        .key-feature-title {{
            color: {dark["primary"]};
        }}
        
        .footer {{
            color: {dark["text_muted"]};
        }}
        
        .footer a {{
            color: {dark["primary"]};
        }}
    }}

    /* =============================================
       MOBILE RESPONSIVE (max-width: 768px)
       ============================================= */
    
    @media screen and (max-width: 768px) {{
        .main-header {{
            font-size: 1.8rem;
        }}
        
        .sub-header {{
            font-size: 1rem;
            margin-bottom: 1.5rem;
        }}
        
        .feature-card {{
            padding: 1rem;
            margin-bottom: 0.75rem;
            border-radius: 10px;
        }}
        
        .feature-card h3 {{
            font-size: 1.1rem;
            margin-bottom: 0.5rem;
        }}
        
        .feature-card p {{
            font-size: 0.95rem;
        }}
        
        .feature-card li {{
            font-size: 0.9rem;
        }}
        
        .feature-card ul {{
            padding-left: 1.2rem;
        }}
        
        /* Mobile-optimized form inputs */
        .stSelectbox > div > div {{
            min-height: 48px !important;
        }}
        
        .stSelectbox [data-baseweb="select"] {{
            min-height: 48px !important;
        }}
        
        .stSelectbox [data-baseweb="select"] > div {{
            min-height: 46px !important;
            padding: 8px 12px !important;
        }}
        
        .stNumberInput input {{
            min-height: 48px !important;
            font-size: 16px !important; /* Prevents iOS zoom */
        }}
        
        .stTextInput input {{
            min-height: 48px !important;
            font-size: 16px !important; /* Prevents iOS zoom */
        }}
        
        /* Larger touch targets for buttons */
        .stButton > button {{
            min-height: 48px !important;
            font-size: 1rem !important;
        }}
        
        /* Better spacing for mobile columns */
        [data-testid="column"] {{
            padding: 0.25rem !important;
        }}
        
        /* Radio buttons - larger touch targets */
        .stRadio > div {{
            gap: 0.5rem !important;
        }}
        
        .stRadio label {{
            padding: 12px 16px !important;
            min-height: 44px !important;
        }}
        
        /* Checkbox - larger touch target */
        .stCheckbox label {{
            padding: 12px 0 !important;
            min-height: 44px !important;
        }}
        
        /* Slider improvements */
        .stSlider > div > div > div {{
            height: 8px !important;
        }}
        
        .stSlider [data-baseweb="slider"] div[role="slider"] {{
            width: 28px !important;
            height: 28px !important;
        }}
    }}

    /* =============================================
       INPUT FIELD TEXT VISIBILITY FIX
       Ensures text is not clipped in number inputs,
       text inputs, and select boxes on all screen sizes
       ============================================= */

    .stNumberInput input {{
        height: auto !important;
        min-height: 42px !important;
        padding: 8px 12px !important;
        line-height: 1.6 !important;
        font-size: 14px !important;
        box-sizing: border-box !important;
    }}

    .stTextInput input {{
        height: auto !important;
        min-height: 42px !important;
        padding: 8px 12px !important;
        line-height: 1.6 !important;
        font-size: 14px !important;
        box-sizing: border-box !important;
    }}

    .stSelectbox [data-baseweb="select"] {{
        min-height: 42px !important;
    }}

    .stSelectbox [data-baseweb="select"] > div {{
        min-height: 40px !important;
        padding: 6px 12px !important;
        line-height: 1.6 !important;
        font-size: 14px !important;
        box-sizing: border-box !important;
        display: flex !important;
        align-items: center !important;
    }}

    /* =============================================
       STREAMLIT COMPONENT OVERRIDES
       ============================================= */

    /* Button styling - Light mode */
    .stButton > button {{
        background: linear-gradient(135deg, {light["primary"]}, #C07800) !important;
        color: white !important;
        border: none !important;
        font-weight: 600 !important;
        border-radius: 8px !important;
        transition: all 0.3s ease !important;
        box-shadow: 0 2px 8px rgba(212, 136, 15, 0.3) !important;
    }}
    
    .stButton > button:hover {{
        background: linear-gradient(135deg, {light["primary_light"]}, {light["primary"]}) !important;
        box-shadow: 0 4px 15px rgba(212, 136, 15, 0.5) !important;
        transform: translateY(-1px) !important;
    }}
    
    .stButton > button:active {{
        transform: translateY(0) !important;
    }}
    
    /* Button styling - Dark mode */
    @media (prefers-color-scheme: dark) {{
        .stButton > button {{
            background: linear-gradient(135deg, {dark["primary"]}, #E09000) !important;
            color: {dark["background"]} !important;
            box-shadow: 0 2px 8px rgba(245, 166, 35, 0.3) !important;
        }}
        
        .stButton > button:hover {{
            background: linear-gradient(135deg, {dark["primary_light"]}, {dark["primary"]}) !important;
            box-shadow: 0 4px 15px rgba(245, 166, 35, 0.5) !important;
        }}
    }}
    
    /* Metric styling */
    [data-testid="stMetricValue"] {{
        color: {light["primary"]} !important;
    }}
    
    @media (prefers-color-scheme: dark) {{
        [data-testid="stMetricValue"] {{
            color: {dark["primary"]} !important;
        }}
    }}
    
    /* Sidebar styling */
    [data-testid="stSidebar"] > div:first-child {{
        background-color: {light["secondary_bg"]};
    }}
    
    @media (prefers-color-scheme: dark) {{
        [data-testid="stSidebar"] > div:first-child {{
            background-color: {dark["secondary_bg"]};
        }}
    }}
    
    /* Info/Warning box styling */
    .stAlert {{
        border-radius: 10px !important;
    }}
    
    /* Divider styling */
    hr {{
        border-color: {light["border"]} !important;
        opacity: 0.5;
    }}
    
    @media (prefers-color-scheme: dark) {{
        hr {{
            border-color: {dark["border"]} !important;
        }}
    }}
    
    /* Link styling */
    a {{
        color: {light["primary"]};
    }}
    
    @media (prefers-color-scheme: dark) {{
        a {{
            color: {dark["primary"]};
        }}
    }}
    
    /* Table styling for About page */
    table {{
        border-collapse: collapse;
        width: 100%;
    }}
    
    th, td {{
        padding: 12px;
        text-align: left;
        border-bottom: 1px solid {light["border"]};
    }}
    
    th {{
        background-color: {light["secondary_bg"]};
        color: {light["primary"]};
        font-weight: 600;
    }}
    
    @media (prefers-color-scheme: dark) {{
        th, td {{
            border-bottom-color: {dark["border"]};
        }}
        
        th {{
            background-color: {dark["secondary_bg"]};
            color: {dark["primary"]};
        }}
    }}
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
