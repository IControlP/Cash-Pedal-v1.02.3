# CLAUDE.md - AI Assistant Guide for CashPedal

## Project Overview

**CashPedal** (v1.02.3) is a Streamlit-based web application that calculates the **Total Cost of Ownership (TCO)** for vehicles. It helps consumers understand the true cost of buying or leasing a car — beyond the sticker price — by modeling depreciation, fuel, maintenance, insurance, taxes, and financing over a 5-year period.

**Live deployment:** Railway.app (auto-deploys from GitHub main branch)

## Tech Stack

- **Framework:** Streamlit >= 1.33.0
- **Language:** Python 3.12+
- **Data Processing:** Pandas, NumPy, SciPy (Weibull reliability models)
- **Visualization:** Plotly
- **Database:** PostgreSQL (psycopg2-binary) for consent logs
- **Web Scraping:** Playwright (stealth mode), BeautifulSoup, Requests
- **Deployment:** Railway.app (Nixpacks builder)

## Quick Start

```bash
# Install dependencies
pip install -r requirements.txt

# Run the app locally
streamlit run main.py

# Run admin dashboard (separate process, different port)
streamlit run admin/analytics_dashboard.py --server.port 8502
```

The app runs at `http://localhost:8501` by default.

## Project Structure

```
Cash-Pedal-v1.02.3/
├── main.py                          # App entry point (home page)
├── pages/                           # Streamlit multi-page app pages
│   ├── 2____Car_Survey.py
│   ├── 3_____Salary_Calculator.py
│   ├── 4______Single_Car_Ownership_Calculator.py
│   ├── 5_______Multi_Vehicle_Comparison.py
│   ├── 6________About.py
│   ├── 7_________Take_it_to_the_next_gear.py
│   ├── 8_________Car_Buying_Checklist.py
│   └── 9__________Wheel_Zard_Agent.py
├── admin/                           # Password-protected admin analytics dashboard
├── assets/                          # SVG logos and favicon
├── .streamlit/config.toml           # Streamlit server + theme config
├── maintenance/                     # Maintenance utility scripts
└── user_data/                       # Runtime user data (consent logs)
```

### Page naming convention

Streamlit orders sidebar pages alphabetically by filename. The numeric prefixes (2, 3, 4...) and underscores control the display order and indentation in the sidebar navigation.

### Source code layout

All Python source files live in the **project root** (flat structure, no `src/` directory). Files are organized by domain:

**Calculation engines:**
| File | Purpose |
|------|---------|
| `prediction_service.py` | Main TCO orchestrator — routes between lease/purchase calculations |
| `enhanced_depreciation.py` | Depreciation model with brand/segment-specific curves (75+ brands) |
| `maintenance_utils.py` | Weibull distribution-based maintenance cost forecasting (70+ component types) |
| `financial_analysis.py` | Loan amortization, lease payments, affordability metrics |
| `fuel_utils.py` | Gasoline fuel cost calculations with regional pricing |
| `electric_vehicle_utils.py` | EV-specific efficiency and charging costs |
| `advanced_insurance.py` | Regional insurance estimation (state rates, age, credit, vehicle type) |
| `lease_terms_calculator.py` | Lease residual values, money factors, monthly payment breakdowns |

**Vehicle data:**
| File | Purpose |
|------|---------|
| `vehicle_database.py` | Master orchestrator that aggregates all segmented databases |
| `vehicle_database_[a-v].py` | 18 segmented files by manufacturer first letter (make → model → year → trim) |
| `vehicle_specs_database.py` | Horsepower, MPG, seats, cargo space |
| `vehicle_mpg_database.py` | Fuel economy data |
| `vehicle_helpers.py` | EV detection, fuel type classification |
| `used_vehicle_estimator.py` | Used vehicle valuation |

**UI & display:**
| File | Purpose |
|------|---------|
| `input_forms.py` | All form components and input validation (largest file ~138KB) |
| `calculator_display.py` | Single vehicle calculator results UI |
| `comparison_display.py` | Multi-vehicle comparison results UI |
| `comparison_service.py` | Multi-vehicle comparison business logic |
| `recommendation_engine.py` | Automated vehicle recommendation scoring |
| `theme_utils.py` | Theme management, responsive CSS, dark/light mode |

**Services & utilities:**
| File | Purpose |
|------|---------|
| `session_manager.py` | Session state initialization and persistence across pages |
| `zip_code_utils.py` | 250+ metro areas with regional fuel prices, electricity rates, labor costs |
| `taxes_fees_utils.py` | State-specific taxes, registration fees, title costs |
| `salary_calculator_utils.py` | 20/4/10 rule affordability calculations |
| `car_buying_checklist.py` | Used car inspection checklist logic |
| `terms_agreement.py` | User consent/terms acceptance flow |
| `user_data_collector.py` | User data collection |

## Architecture

### Data flow

```
User Input → Input Forms → PredictionService (orchestrator)
  → Depreciation Engine
  → Maintenance Calculator (Weibull reliability)
  → Insurance Estimator
  → Fuel/Electric Cost Calculator
  → Lease Terms Calculator
  → Financial Analysis
→ Aggregated TCO Results → Calculator/Comparison Display
```

### Key patterns

- **Orchestrator:** `PredictionService` coordinates all specialized calculation engines. Each engine is independent and testable in isolation.
- **Segmented data:** Vehicle database is split across 18 files by manufacturer letter. `vehicle_database.py` acts as a facade with lazy imports and graceful fallbacks.
- **Session state:** Uses Streamlit's `st.session_state` with a `persistent_settings` nested dict managed by `session_manager.py` for cross-page persistence.
- **Graceful degradation:** All calculation engines use try/except with sensible defaults when data is missing.

### Regional cost adjustments

ZIP code input drives regional multipliers for fuel prices, electricity rates, mechanic labor rates, insurance costs, and tax rates. The lookup table in `zip_code_utils.py` covers 250+ US metro areas.

## Development Conventions

### Code style

- **Type hints:** Used extensively throughout (e.g., `def calculate(self, data: Dict[str, Any]) -> Dict[str, Any]:`)
- **Docstrings:** Triple-quote docstrings on classes and key methods
- **Error handling:** Try/except blocks with fallback defaults; user-facing errors shown via `st.error()` / `st.warning()`
- **Naming:** Snake_case for files and functions. Files named descriptively for their domain (e.g., `advanced_insurance.py`, `fuel_utils.py`)
- **No linter/formatter configured:** No flake8, black, ruff, or similar tooling in the project

### Streamlit-specific conventions

- UI rendering is in `calculator_display.py` and `comparison_display.py`, separate from business logic
- Forms use `st.form()` context managers with `st.form_submit_button()`
- Custom CSS is injected via `st.markdown(..., unsafe_allow_html=True)` in `theme_utils.py`
- Theme colors: primary `#F5A623` (orange), background `#F8F7F4`, text `#C07800`

### State management

- `session_manager.initialize_session_state()` must be called at the start of every page
- Persistent settings nest under `st.session_state.persistent_settings` with sub-keys: `location`, `personal_info`, `insurance`, `analysis_settings`
- Comparison vehicles stored in `st.session_state.comparison_vehicles`

## Testing

Tests are standalone Python scripts (no pytest/unittest framework configured):

```bash
python test_imports.py                      # Verify all imports work
python test_integration.py                  # End-to-end integration tests
python test_integration_simple.py           # Simplified integration tests
python test_comprehensive_depreciation.py   # Depreciation model validation
python test_database_connection.py          # PostgreSQL connectivity
python test_error_handling.py               # Error handling verification
python test_escalade_improvements.py        # Cadillac Escalade-specific tests
python test_scraping_fix.py                 # Web scraping functionality
python test_scraping_mock.py                # Mock scraping tests
```

There is no `pytest` in `requirements.txt`. Tests are run individually as scripts.

## Deployment

### Railway.app configuration

- **Builder:** Nixpacks (configured in `railway.toml`)
- **Start command:** `streamlit run main.py --server.port=$PORT --server.address=0.0.0.0 --server.enableCORS=false --server.enableXsrfProtection=true`
- **Health check:** `/_stcore/health` (300s timeout, 30s interval)
- **Restart policy:** On failure, max 10 retries

### Environment variables

| Variable | Purpose |
|----------|---------|
| `PORT` | Dynamic, set by Railway |
| `ADMIN_PASSWORD` | Optional override for admin dashboard auth |
| Database credentials | PostgreSQL connection for consent logs |

### Config files

- `Procfile` — Heroku-compatible start command (also used by Railway)
- `railway.toml` — Railway-specific build/deploy settings
- `.streamlit/config.toml` — Streamlit server, theme, and client settings

## Common Tasks for AI Assistants

### Adding a new vehicle make/model

1. Identify the correct `vehicle_database_[letter].py` file based on manufacturer first letter
2. Add make → model → year → trim data following the existing dict structure
3. Add specs in `vehicle_specs_database.py` and MPG data in `vehicle_mpg_database.py`
4. The master `vehicle_database.py` will pick it up automatically via lazy import

### Adding a new calculation factor

1. Create or modify the relevant engine file (e.g., `advanced_insurance.py`)
2. Integrate it into `prediction_service.py` where TCO is assembled
3. Update display in `calculator_display.py` and/or `comparison_display.py`

### Adding a new page

1. Create a file in `pages/` with the appropriate numeric prefix for ordering
2. Call `initialize_session_state()` and `apply_theme()` at the top
3. Add navigation buttons in `main.py` if desired

### Modifying regional data

- Fuel prices, electricity rates, labor rates: `zip_code_utils.py`
- State taxes and fees: `taxes_fees_utils.py`
- Insurance base rates: `advanced_insurance.py`

## Important Notes

- `input_forms.py` is the largest file (~138KB). Changes here should be targeted and careful.
- The vehicle database files are pure data (Python dicts). They are large but structurally simple.
- No build step is needed — Streamlit runs Python directly.
- The `.gitignore` only excludes `__pycache__/` and `*.pyc`. Be careful not to commit sensitive files (`.env`, credentials, etc.).
- The `Wheel-Zard Agent` page integrates with ChatGPT via API. It requires appropriate API keys in the environment.
- The admin dashboard (`admin/analytics_dashboard.py`) is password-protected and intended to run as a separate service.
