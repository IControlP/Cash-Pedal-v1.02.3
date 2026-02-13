"""
Theme Utilities for CashPedal
Handles theming using Streamlit's native config.toml system
Provides minimal CSS enhancements for brand consistency
"""

import streamlit as st
from pathlib import Path


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

    /* Logo container styling */
    .logo-container {{
        display: flex;
        justify-content: center;
        align-items: center;
        padding: 2rem 0 1rem 0;
    }}

    .logo-container svg {{
        max-width: 100%;
        height: auto;
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

    /* Sidebar navigation links - Light mode */
    [data-testid="stSidebarNav"] ul {{
        padding: 0 !important;
    }}

    [data-testid="stSidebarNav"] li {{
        list-style: none !important;
    }}

    [data-testid="stSidebarNav"] a {{
        color: {light["text"]} !important;
        text-decoration: none !important;
        padding: 0.5rem 1rem !important;
        display: block !important;
        border-radius: 6px !important;
        font-weight: 500 !important;
        transition: all 0.2s ease !important;
    }}

    [data-testid="stSidebarNav"] a:hover {{
        background-color: {light["card_bg"]} !important;
        color: {light["primary"]} !important;
    }}

    [data-testid="stSidebarNav"] a[aria-current="page"] {{
        background-color: {light["primary"]} !important;
        color: white !important;
        font-weight: 600 !important;
    }}

    /* Sidebar navigation links - Dark mode */
    @media (prefers-color-scheme: dark) {{
        [data-testid="stSidebarNav"] a {{
            color: {dark["text"]} !important;
        }}

        [data-testid="stSidebarNav"] a:hover {{
            background-color: {dark["card_bg"]} !important;
            color: {dark["primary"]} !important;
        }}

        [data-testid="stSidebarNav"] a[aria-current="page"] {{
            background-color: {dark["primary"]} !important;
            color: {dark["background"]} !important;
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


def get_logo_html(center: bool = True) -> str:
    """
    Get the CashPedal logo HTML for the hero section.

    Args:
        center: Whether to center the logo (default: True)

    Returns:
        HTML string with the logo and tagline
    """
    import base64

    assets_dir = Path(__file__).parent / "assets"
    logo_path = assets_dir / "logo.svg"

    # Read and encode the SVG content as base64 for better compatibility
    if logo_path.exists():
        with open(logo_path, "rb") as f:
            logo_data = base64.b64encode(f.read()).decode()
        logo_html = f'<img src="data:image/svg+xml;base64,{logo_data}" style="max-width: 400px; width: 100%; height: auto;" alt="CashPedal Logo">'
    else:
        # Fallback if logo file doesn't exist
        logo_html = '<p class="main-header">🚗 CashPedal</p><p class="sub-header">Make Smarter Vehicle Ownership Decisions</p>'

    alignment = "center" if center else "left"

    return f"""
    <div style="text-align: {alignment}; padding: 2rem 0 1rem 0;">
        {logo_html}
    </div>
    """


def get_footer_html(version: str = "1.02.3") -> str:
    """
    Get the standard CashPedal footer HTML with branding.

    Args:
        version: Version number to display

    Returns:
        HTML string for the footer
    """
    return f"""
    <div class="footer" style="
        text-align: center;
        padding: 2rem 0 1rem 0;
        margin-top: 3rem;
        border-top: 2px solid #D0C9E0;
    ">
        <div style="margin-bottom: 1rem;">
            <strong style="color: #F5A623; font-size: 16px;">CashPedal</strong>
            <span style="color: #666666; font-size: 14px;"> - Vehicle TCO Calculator v{version}</span>
        </div>
        <div style="color: #666666; font-size: 12px; margin-bottom: 0.5rem;">
            Make Smarter Vehicle Ownership Decisions
        </div>
        <div style="color: #666666; font-size: 12px;">
            Powered by Streamlit |
            <a href='https://www.cashpedal.io' style="color: #F5A623; text-decoration: none;">www.cashpedal.io</a>
        </div>
        <div style="color: #999999; font-size: 11px; margin-top: 1rem;">
            © 2026 CashPedal. All rights reserved.
        </div>
    </div>
    """
