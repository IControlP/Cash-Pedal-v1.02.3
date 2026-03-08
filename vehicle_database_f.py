# vehicle_database_f.py - Manufacturers F (Ferrari, Ford, Fiat)
# Vehicle database for manufacturers starting with letter F

# =============================================================================
# F1 ANNUAL MILEAGE — derived from the 2025 FIA Formula 1 World Championship
#
# Methodology
# -----------
# Each race weekend contributes:
#   Normal weekend  : (FP1 + FP2 + FP3 + Qualifying + Race) laps × circuit_km
#   Sprint weekend  : (FP1 + Sprint Qualifying + Qualifying + Race) laps
#                     × circuit_km  +  sprint_race_km (≈100 km, fixed distance)
#
# Session lap estimates (conservative, based on published timing sheets):
#   FP1              28 laps   (60-minute session)
#   FP2              30 laps   (60-minute session, normal weekends only)
#   FP3              24 laps   (60-minute session, normal weekends only)
#   Qualifying       17 laps   (Q1 ≈ 7, Q2 ≈ 6, Q3 ≈ 4, combined outlaps)
#   Sprint Quali.    12 laps   (SQ1 ≈ 5, SQ2 ≈ 4, SQ3 ≈ 3, sprint weekends)
#   Sprint Race     100 km     (fixed distance per FIA regulation)
#
# Pre-season testing: Bahrain International Circuit, 3 days, ~100 laps/day
#
# Sources: FIA Sporting Regulations, official F1 timing data, Wikipedia.
# =============================================================================

_F1_SESSION = {
    'fp1': 28, 'fp2': 30, 'fp3': 24, 'qualifying': 17,
    'sprint_quali': 12, 'sprint_race_km': 100,
}

# 2025 FIA F1 calendar: (circuit_name, country, km_per_lap, race_laps, is_sprint)
_F1_2025_CIRCUITS = [
    ('Bahrain International Circuit',       'Bahrain',       5.412, 57, False),
    ('Jeddah Corniche Circuit',             'Saudi Arabia',  6.174, 50, False),
    ('Albert Park Circuit',                 'Australia',     5.278, 58, False),
    ('Suzuka Circuit',                      'Japan',         5.807, 53, False),
    ('Shanghai International Circuit',      'China',         5.451, 56, True ),  # Sprint
    ('Miami International Autodrome',       'United States', 5.412, 57, True ),  # Sprint
    ('Autodromo Enzo e Dino Ferrari',       'Italy (Imola)', 4.909, 63, False),
    ('Circuit de Monaco',                   'Monaco',        3.337, 78, False),
    ('Circuit de Barcelona-Catalunya',      'Spain',         4.675, 66, False),
    ('Circuit Gilles Villeneuve',           'Canada',        4.361, 70, False),
    ('Red Bull Ring',                       'Austria',       4.318, 71, True ),  # Sprint
    ('Silverstone Circuit',                 'Great Britain', 5.891, 52, False),
    ('Circuit de Spa-Francorchamps',        'Belgium',       7.004, 44, False),
    ('Hungaroring',                         'Hungary',       4.381, 70, False),
    ('Circuit Zandvoort',                   'Netherlands',   4.259, 72, False),
    ('Autodromo Nazionale Monza',           'Italy (Monza)', 5.793, 53, False),
    ('Baku City Circuit',                   'Azerbaijan',    6.003, 51, False),
    ('Marina Bay Street Circuit',           'Singapore',     4.940, 62, False),
    ('Circuit of the Americas',             'United States', 5.513, 56, True ),  # Sprint
    ('Autodromo Hermanos Rodriguez',        'Mexico',        4.304, 71, False),
    ('Autodromo Jose Carlos Pace',          'Brazil',        4.309, 71, True ),  # Sprint
    ('Las Vegas Street Circuit',            'United States', 6.120, 50, False),
    ('Lusail International Circuit',        'Qatar',         5.380, 57, True ),  # Sprint
    ('Yas Marina Circuit',                  'Abu Dhabi',     5.281, 58, False),
]

# Pre-season Bahrain test (3 days × 100 laps × 5.412 km = 1,623.6 km)
_F1_2025_PRESEASON_KM = 3 * 100 * 5.412

def _compute_f1_season_km(circuits, session, preseason_km):
    """Calculate total km for a full F1 season including all sessions."""
    total_km = preseason_km
    normal_non_race = session['fp1'] + session['fp2'] + session['fp3'] + session['qualifying']
    sprint_non_race = session['fp1'] + session['sprint_quali'] + session['qualifying']
    for _name, _country, track_km, race_laps, is_sprint in circuits:
        if is_sprint:
            total_km += (sprint_non_race + race_laps) * track_km + session['sprint_race_km']
        else:
            total_km += (normal_non_race + race_laps) * track_km
    return total_km

_F1_2025_TOTAL_KM = _compute_f1_season_km(_F1_2025_CIRCUITS, _F1_SESSION, _F1_2025_PRESEASON_KM)
# _F1_2025_TOTAL_KM ≈ 20,576 km → 12,783 miles

F1_TYPICAL_ANNUAL_MILES_2025 = round(_F1_2025_TOTAL_KM / 1.60934)

# Public summary dict — consumed by vehicle_database.get_vehicle_characteristics()
F1_2025_SEASON_DATA = {
    'season':         2025,
    'rounds':         len(_F1_2025_CIRCUITS),
    'sprint_rounds':  sum(1 for c in _F1_2025_CIRCUITS if c[4]),
    'total_km':       round(_F1_2025_TOTAL_KM, 1),
    'typical_annual_miles': F1_TYPICAL_ANNUAL_MILES_2025,
    'circuits':       _F1_2025_CIRCUITS,
    'session_laps':   _F1_SESSION,
    'preseason_km':   round(_F1_2025_PRESEASON_KM, 1),
}


MANUFACTURERS_F = {
    "Ferrari": {
        # -----------------------------------------------------------------------
        # Formula 1 Race Car - For the absolute speed enthusiast
        #
        # Purchase prices reflect the Ferrari "Client Racing" program for
        # previous-season F1 machinery. A current-season car cannot be purchased
        # directly; these are historical/previous-season examples.
        #
        # REALISTIC ANNUAL OPERATING COSTS (private owner, ~10 track days/year):
        #   Power unit service interval:  every ~1,500 km  (~$350,000/rebuild)
        #   Tires (Pirelli F1 slicks):    ~$8,000/set x 30 sets = $240,000
        #   Specialist F1 mechanics:      ~$400,000/year (2 full-time engineers)
        #   High-octane fuel (98 RON+):   ~$120/gal x 1,200 gal = $144,000
        #   Bodywork / carbon parts:      ~$500,000/year (inevitable damage)
        #   Secure climate storage:       ~$36,000/year
        #   Transport (race transporter): ~$200,000/year
        #   Specialty insurance:          ~$2,500,000/year
        #   Track rental & logistics:     ~$150,000/year
        #   -------------------------------------------
        #   ESTIMATED ANNUAL TOTAL:       ~$4,320,000+
        # -----------------------------------------------------------------------
        "SF-24": {
            "production_years": (2024, 2025),
            # Mileage = full 2025 FIA calendar (24 rounds, 6 sprint weekends)
            # Race km + all practice/qualifying sessions + pre-season Bahrain test
            # = ~20,576 km → computed via F1_TYPICAL_ANNUAL_MILES_2025
            "typical_annual_miles": F1_TYPICAL_ANNUAL_MILES_2025,
            "trims_by_year": {
                2024: {
                    # Full WDC-spec car (Charles Leclerc / Carlos Sainz livery)
                    # Sold via Ferrari Client Racing at end of season
                    "Client Racing - Race Spec":       4500000,
                    # Show car - non-running display model with full bodywork
                    "Client Racing - Show Car":        850000
                },
                2025: {
                    # 2025 SF-25 new-regulation car (estimated availability)
                    "Client Racing - Race Spec":       5200000,
                    "Client Racing - Show Car":        950000
                }
            }
        },
        "SF-23": {
            "production_years": (2023, 2024),
            # Mileage = 2024 FIA calendar (24 rounds, 6 sprint weekends)
            # Essentially identical structure to 2025 → 12,500 mi est.
            "typical_annual_miles": 12500,
            "trims_by_year": {
                2023: {
                    "Client Racing - Race Spec":       3800000,
                    "Client Racing - Show Car":        750000
                },
                2024: {
                    "Client Racing - Race Spec":       3500000,
                    "Client Racing - Show Car":        700000
                }
            }
        },
        "SF21": {
            "production_years": (2021, 2022),
            # Mileage = 2021 FIA calendar (23 rounds, 3 sprint weekends)
            # Fewer races + no FP2/FP3 replacement for most sprints → 11,800 mi est.
            "typical_annual_miles": 11800,
            "trims_by_year": {
                2021: {
                    "Client Racing - Race Spec":       2800000,
                    "Client Racing - Show Car":        600000
                },
                2022: {
                    "Client Racing - Race Spec":       2600000,
                    "Client Racing - Show Car":        575000
                }
            }
        }
    },
    "Ford": {
        "F-150": {
            "production_years": (2000, 2025),
            "trims_by_year": {
                2000: {
                    "Regular Cab": 16995,
                    "SuperCab XL": 18995,
                    "SuperCab XLT": 21995,
                    "SuperCrew XLT": 24995,
                    "Lariat": 28995
                },
                2005: {
                    "Regular Cab": 18995,
                    "SuperCab XL": 20995,
                    "SuperCab XLT": 23995,
                    "SuperCrew XLT": 26995,
                    "Lariat": 31995,
                    "King Ranch": 36995
                },
                2010: {
                    "Regular Cab": 22995,
                    "SuperCab XL": 24995,
                    "SuperCab XLT": 27995,
                    "SuperCrew XLT": 30995,
                    "Lariat": 35995,
                    "King Ranch": 40995,
                    "Platinum": 43995
                },
                2015: {
                    "Regular Cab": 26995,
                    "SuperCab XL": 28995,
                    "SuperCab XLT": 31995,
                    "SuperCrew XLT": 34995,
                    "Lariat": 39995,
                    "King Ranch": 48995,
                    "Platinum": 51995,
                    "Raptor": 49995
                },
                2020: {
                    "Regular Cab": 29995,
                    "SuperCab XL": 31995,
                    "SuperCab XLT": 34995,
                    "SuperCrew XLT": 37995,
                    "Lariat": 42995,
                    "King Ranch": 52995,
                    "Platinum": 55995,
                    "Limited": 58995,
                    "Raptor": 54995
                },
                2023: {
                    "Regular Cab": 33995,
                    "SuperCab XL": 35995,
                    "SuperCab XLT": 38995,
                    "SuperCrew XLT": 41995,
                    "Lariat": 46995,
                    "King Ranch": 56995,
                    "Platinum": 59995,
                    "Limited": 62995,
                    "Raptor": 68995
                },
                2024: {
                    "Regular Cab": 35995,
                    "SuperCab XL": 37995,
                    "SuperCab XLT": 40995,
                    "SuperCrew XLT": 43995,
                    "Lariat": 48995,
                    "King Ranch": 58995,
                    "Platinum": 61995,
                    "Limited": 64995,
                    "Raptor": 71995
                },
                2025: {
                    "Regular Cab": 37995,
                    "SuperCab XL": 39995,
                    "SuperCab XLT": 42995,
                    "SuperCrew XLT": 45995,
                    "Lariat": 50995,
                    "King Ranch": 60995,
                    "Platinum": 63995,
                    "Limited": 66995,
                    "Raptor": 74995
                },
                2026: {
                    "Regular Cab": 37995,
                    "SuperCab XL": 39995,
                    "SuperCab XLT": 42995,
                    "SuperCrew XLT": 45995,
                    "Lariat": 50995,
                    "King Ranch": 60995,
                    "Platinum": 63995,
                    "Limited": 66995,
                    "Raptor": 74995
                }
            }
        },
        "Mustang": {
            "production_years": (2000, 2025),
            "trims_by_year": {
                2000: {
                    "V6": 17995,
                    "GT": 21995,
                    "Cobra": 34995
                },
                2005: {
                    "V6": 19995,
                    "GT": 24995,
                    "GT Premium": 27995
                },
                2010: {
                    "V6": 22995,
                    "V6 Premium": 25995,
                    "GT": 29995,
                    "GT Premium": 32995,
                    "Shelby GT500": 48995
                },
                2015: {
                    "V6": 23995,
                    "EcoBoost": 25995,
                    "EcoBoost Premium": 29995,
                    "GT": 32995,
                    "GT Premium": 36995,
                    "Shelby GT350": 52995
                },
                2018: {
                    "EcoBoost": 26995,
                    "EcoBoost Premium": 30995,
                    "GT": 35995,
                    "GT Premium": 39995,
                    "Shelby GT350": 56995,
                    "Shelby GT500": 72995
                },
                2020: {
                    "EcoBoost": 27995,
                    "EcoBoost Premium": 31995,
                    "GT": 36995,
                    "GT Premium": 40995,
                    "Bullitt": 46995,
                    "Shelby GT350": 59995,
                    "Shelby GT500": 74995
                },
                2022: {
                    "EcoBoost": 29995,
                    "EcoBoost Premium": 33995,
                    "GT": 38995,
                    "GT Premium": 42995,
                    "Mach 1": 54995,
                    "Shelby GT500": 76995
                },
                2023: {
                    "EcoBoost": 31995,
                    "EcoBoost Premium": 35995,
                    "GT": 40995,
                    "GT Premium": 44995,
                    "Dark Horse": 52995,
                    "Shelby GT500": 78995
                },
                2024: {
                    "EcoBoost": 33995,
                    "EcoBoost Premium": 37995,
                    "GT": 42995,
                    "GT Premium": 46995,
                    "Dark Horse": 54995,
                    "Shelby GT500": 81995
                },
                2025: {
                    "EcoBoost": 35995,
                    "EcoBoost Premium": 39995,
                    "GT": 44995,
                    "GT Premium": 48995,
                    "Dark Horse": 56995,
                    "Shelby GT500": 84995
                },
                2026: {
                    "EcoBoost": 35995,
                    "EcoBoost Premium": 39995,
                    "GT": 44995,
                    "GT Premium": 48995,
                    "Dark Horse": 56995,
                    "Shelby GT500": 84995
                }
            }
        },
        "Explorer": {
            "production_years": (2000, 2025),
            "trims_by_year": {
                2000: {
                    "XLS": 22995,
                    "XLT": 26995,
                    "Eddie Bauer": 30995,
                    "Limited": 33995
                },
                2005: {
                    "XLS": 25995,
                    "XLT": 29995,
                    "Eddie Bauer": 33995,
                    "Limited": 36995
                },
                2010: {
                    "Base": 27995,
                    "XLT": 31995,
                    "Eddie Bauer": 35995,
                    "Limited": 38995
                },
                2011: {
                    "Base": 28995,
                    "XLT": 32995,
                    "Limited": 39995,
                    "Sport": 41995
                },
                2015: {
                    "Base": 31995,
                    "XLT": 35995,
                    "Limited": 42995,
                    "Sport": 44995,
                    "Platinum": 48995
                },
                2020: {
                    "Base": 34995,
                    "XLT": 38995,
                    "Limited": 45995,
                    "ST": 53995,
                    "Platinum": 56995
                },
                2022: {
                    "Base": 36995,
                    "XLT": 40995,
                    "Limited": 47995,
                    "ST": 55995,
                    "Platinum": 58995
                },
                2023: {
                    "Base": 38995,
                    "XLT": 42995,
                    "Limited": 49995,
                    "ST": 57995,
                    "Platinum": 60995
                },
                2024: {
                    "Base": 40995,
                    "XLT": 44995,
                    "Limited": 51995,
                    "ST": 59995,
                    "Platinum": 62995
                },
                2025: {
                    "Base": 42995,
                    "XLT": 46995,
                    "Limited": 53995,
                    "ST": 61995,
                    "Platinum": 64995
                },
                2026: {
                    "Base": 42995,
                    "XLT": 46995,
                    "Limited": 53995,
                    "ST": 61995,
                    "Platinum": 64995
                }
            }
        },
        "Escape": {
            "production_years": (2001, 2025),
            "trims_by_year": {
                2001: {
                    "XLS": 19995,
                    "XLT": 22995,
                    "Limited": 26995
                },
                2005: {
                    "XLS": 21995,
                    "XLT": 24995,
                    "Limited": 28995,
                    "Hybrid": 29995
                },
                2010: {
                    "XLS": 22995,
                    "XLT": 25995,
                    "Limited": 29995,
                    "Hybrid": 30995
                },
                2013: {
                    "S": 23995,
                    "SE": 26995,
                    "SEL": 30995,
                    "Titanium": 33995
                },
                2017: {
                    "S": 25995,
                    "SE": 28995,
                    "SEL": 32995,
                    "Titanium": 35995
                },
                2020: {
                    "S": 27995,
                    "SE": 30995,
                    "SEL": 34995,
                    "Titanium": 37995,
                    "Sport": 38995,
                    "Hybrid SE": 33995,
                    "Hybrid SEL": 36995,
                    "Hybrid Titanium": 38995
                },
                2021: {
                    "S": 28995,
                    "SE": 31995,
                    "SEL": 35995,
                    "Titanium": 38995,
                    "Sport": 39495,
                    "Hybrid SE": 34495,
                    "Hybrid SEL": 37495,
                    "Hybrid Titanium": 39495
                },
                2022: {
                    "S": 29995,
                    "SE": 32995,
                    "SEL": 36995,
                    "Titanium": 39995,
                    "Sport": 39995,
                    "Hybrid SE": 34995,
                    "Hybrid SEL": 37995,
                    "Hybrid Titanium": 39995

                },
                2023: {
                    "Active": 29495,
                    "ST-Line": 32995,
                    "ST-Line Elite": 35995,
                    "Platinum": 38995,
                    "Hybrid ST-Line": 36495,
                    "Hybrid ST-Line Elite": 39495,
                    "Hybrid Platinum": 41995
                },
                2024: {
                    "Active": 30495,
                    "ST-Line": 33995,
                    "ST-Line Elite": 36995,
                    "Platinum": 39995,
                    "Hybrid ST-Line": 37495,
                    "Hybrid ST-Line Elite": 40495,
                    "Hybrid Platinum": 42995
                },
                2025: {
                    "Active": 31495,
                    "ST-Line": 34995,
                    "ST-Line Elite": 37995,
                    "Platinum": 40995,
                    "Hybrid ST-Line": 38495,
                    "Hybrid ST-Line Elite": 41495,
                    "Hybrid Platinum": 43995
                },
                2026: {
                    "Active": 31495,
                    "ST-Line": 34995,
                    "ST-Line Elite": 37995,
                    "Platinum": 40995,
                    "Hybrid ST-Line": 38495,
                    "Hybrid ST-Line Elite": 41495,
                    "Hybrid Platinum": 43995
                }
            }
        },
        "Focus": {
            "production_years": (2000, 2018),
            "trims_by_year": {
                2000: {
                    "LX": 13995,
                    "SE": 15995,
                    "ZTS": 17995,
                    "ZX3": 16995
                },
                2005: {
                    "S": 14995,
                    "ZX3": 16995,
                    "ZX4": 17995,
                    "ZXW": 18995
                },
                2010: {
                    "S": 16995,
                    "SE": 18995,
                    "SEL": 21995,
                    "SES": 19995
                },
                2012: {
                    "S": 17995,
                    "SE": 19995,
                    "SEL": 22995,
                    "Titanium": 24995
                },
                2015: {
                    "S": 18995,
                    "SE": 20995,
                    "Titanium": 25995,
                    "ST": 26995,
                    "Electric": 31995
                },
                2016: {
                    "S": 19995,
                    "SE": 21995,
                    "Titanium": 26995,
                    "ST": 27995,
                    "RS": 36995,
                    "Electric": 32995
                },
                2017: {
                    "S": 20995,
                    "SE": 22995,
                    "Titanium": 27995,
                    "ST": 28995,
                    "RS": 37995,
                    "Electric": 33995
                },
                2018: {
                    "S": 21995,
                    "SE": 23995,
                    "Titanium": 28995,
                    "ST": 29995,
                    "RS": 38995,
                    "Electric": 34995
                }
            }
        },
        "Fusion": {
            "production_years": (2006, 2020),
            "trims_by_year": {
                2006: {
                    "S": 19995,
                    "SE": 22995,
                    "SEL": 25995
                },
                2010: {
                    "S": 21995,
                    "SE": 24995,
                    "SEL": 27995,
                    "Sport": 31995,
                    "Hybrid": 29995
                },
                2013: {
                    "S": 23995,
                    "SE": 26995,
                    "Titanium": 31995,
                    "Hybrid SE": 29995,
                    "Hybrid Titanium": 34995
                },
                2015: {
                    "S": 24995,
                    "SE": 27995,
                    "Titanium": 32995,
                    "Hybrid S": 28995,
                    "Hybrid SE": 30995,
                    "Hybrid Titanium": 35995,
                    "Energi SE": 32995,
                    "Energi Titanium": 37995
                },
                2017: {
                    "S": 25995,
                    "SE": 28995,
                    "Titanium": 33995,
                    "Sport": 36995,
                    "Hybrid SE": 31995,
                    "Hybrid Titanium": 36995,
                    "Energi SE": 33995,
                    "Energi Titanium": 38995
                },
                2019: {
                    "S": 26995,
                    "SE": 29995,
                    "SEL": 32995,
                    "Titanium": 34995,
                    "Sport": 37995,
                    "Hybrid SE": 32995,
                    "Hybrid SEL": 35995,
                    "Hybrid Titanium": 37995
                },
                2020: {
                    "S": 27995,
                    "SE": 30995,
                    "SEL": 33995,
                    "Titanium": 35995,
                    "Sport": 38995,
                    "Hybrid SE": 33995,
                    "Hybrid SEL": 36995,
                    "Hybrid Titanium": 38995
                }
            }
        },
        "Edge": {
            "production_years": (2007, 2025),
            "trims_by_year": {
                2007: {
                    "SE": 26995,
                    "SEL": 30995,
                    "Limited": 34995
                },
                2010: {
                    "SE": 28995,
                    "SEL": 32995,
                    "Limited": 36995,
                    "Sport": 39995
                },
                2015: {
                    "SE": 31995,
                    "SEL": 35995,
                    "Titanium": 39995,
                    "Sport": 42995
                },
                2019: {
                    "SE": 33995,
                    "SEL": 37995,
                    "Titanium": 41995,
                    "ST": 46995
                },
                2020: {
                    "SE": 34995,
                    "SEL": 38995,
                    "Titanium": 42995,
                    "ST": 47995
                },
                2021: {
                    "SE": 35995,
                    "SEL": 39995,
                    "Titanium": 43995,
                    "ST": 48995
                },
                2022: {
                    "SE": 36995,
                    "SEL": 40995,
                    "Titanium": 44995,
                    "ST": 49995
                },
                2023: {
                    "SE": 37995,
                    "SEL": 41995,
                    "Titanium": 45995,
                    "ST": 50995
                },
                2024: {
                    "SE": 38995,
                    "SEL": 42995,
                    "Titanium": 46995,
                    "ST": 51995
                },
                2025: {
                    "SE": 39995,
                    "SEL": 43995,
                    "Titanium": 47995,
                    "ST": 52995
                },
                2026: {
                    "SE": 39995,
                    "SEL": 43995,
                    "Titanium": 47995,
                    "ST": 52995
                }
            }
        },
        "Expedition": {
            "production_years": (2000, 2025),
            "trims_by_year": {
                2000: {
                    "XLS": 29995,
                    "XLT": 33995,
                    "Eddie Bauer": 37995,
                    "Limited": 40995
                },
                2005: {
                    "XLS": 32995,
                    "XLT": 36995,
                    "Eddie Bauer": 40995,
                    "Limited": 43995,
                    "King Ranch": 47995
                },
                2010: {
                    "XL": 34995,
                    "XLT": 38995,
                    "Eddie Bauer": 42995,
                    "Limited": 45995,
                    "King Ranch": 49995
                },
                2015: {
                    "XL": 38995,
                    "XLT": 42995,
                    "Limited": 49995,
                    "King Ranch": 53995,
                    "Platinum": 56995
                },
                2018: {
                    "XL": 51995,
                    "XLT": 55995,
                    "Limited": 62995,
                    "King Ranch": 66995,
                    "Platinum": 69995
                },
                2020: {
                    "XL": 53995,
                    "XLT": 57995,
                    "Limited": 64995,
                    "King Ranch": 68995,
                    "Platinum": 71995
                },
                2022: {
                    "XL": 56995,
                    "XLT": 60995,
                    "Limited": 67995,
                    "King Ranch": 71995,
                    "Platinum": 74995
                },
                2023: {
                    "XL": 58995,
                    "XLT": 62995,
                    "Limited": 69995,
                    "King Ranch": 73995,
                    "Platinum": 76995
                },
                2024: {
                    "XL": 60995,
                    "XLT": 64995,
                    "Limited": 71995,
                    "King Ranch": 75995,
                    "Platinum": 78995
                },
                2025: {
                    "XL": 62995,
                    "XLT": 66995,
                    "Limited": 73995,
                    "King Ranch": 77995,
                    "Platinum": 80995
                },
                2026: {
                    "XL": 62995,
                    "XLT": 66995,
                    "Limited": 73995,
                    "King Ranch": 77995,
                    "Platinum": 80995
                }
            }
        },
        "F-250": {
            "production_years": (2000, 2025),
            "trims_by_year": {
                2000: {
                    "Regular Cab XL": 23995,
                    "SuperCab XL": 26995,
                    "SuperCab XLT": 29995,
                    "Crew Cab XLT": 32995,
                    "Lariat": 36995
                },
                2010: {
                    "Regular Cab XL": 28995,
                    "SuperCab XL": 31995,
                    "SuperCab XLT": 34995,
                    "Crew Cab XLT": 37995,
                    "Lariat": 42995,
                    "King Ranch": 47995
                },
                2020: {
                    "Regular Cab XL": 35995,
                    "SuperCab XL": 38995,
                    "SuperCab XLT": 41995,
                    "Crew Cab XLT": 44995,
                    "Lariat": 49995,
                    "King Ranch": 56995,
                    "Platinum": 63995,
                    "Limited": 66995
                },
                2023: {
                    "Regular Cab XL": 39995,
                    "SuperCab XL": 42995,
                    "SuperCab XLT": 45995,
                    "Crew Cab XLT": 48995,
                    "Lariat": 53995,
                    "King Ranch": 60995,
                    "Platinum": 67995,
                    "Limited": 70995
                },
                2024: {
                    "Regular Cab XL": 41995,
                    "SuperCab XL": 44995,
                    "SuperCab XLT": 47995,
                    "Crew Cab XLT": 50995,
                    "Lariat": 55995,
                    "King Ranch": 62995,
                    "Platinum": 69995,
                    "Limited": 72995,
                    "Tremor": 58995
                },
                2025: {
                    "Regular Cab XL": 43995,
                    "SuperCab XL": 46995,
                    "SuperCab XLT": 49995,
                    "Crew Cab XLT": 52995,
                    "Lariat": 57995,
                    "King Ranch": 64995,
                    "Platinum": 71995,
                    "Limited": 74995,
                    "Tremor": 60995
                },
                2026: {
                    "Regular Cab XL": 43995,
                    "SuperCab XL": 46995,
                    "SuperCab XLT": 49995,
                    "Crew Cab XLT": 52995,
                    "Lariat": 57995,
                    "King Ranch": 64995,
                    "Platinum": 71995,
                    "Limited": 74995,
                    "Tremor": 60995
                }
            }
        },
        "Bronco": {
            "production_years": (2021, 2025),
            "trims_by_year": {
                2021: {
                    "Base": 31995,
                    "Big Bend": 34995,
                    "Black Diamond": 37995,
                    "Outer Banks": 40995,
                    "Badlands": 43995,
                    "Wildtrak": 49995,
                    "First Edition": 59995
                },
                2022: {
                    "Base": 33995,
                    "Big Bend": 36995,
                    "Black Diamond": 39995,
                    "Outer Banks": 42995,
                    "Badlands": 45995,
                    "Wildtrak": 51995,
                    "Raptor": 68995
                },
                2023: {
                    "Base": 35995,
                    "Big Bend": 38995,
                    "Black Diamond": 41995,
                    "Outer Banks": 44995,
                    "Badlands": 47995,
                    "Wildtrak": 53995,
                    "Raptor": 70995,
                    "Heritage": 46995
                },
                2024: {
                    "Base": 37995,
                    "Big Bend": 40995,
                    "Black Diamond": 43995,
                    "Outer Banks": 46995,
                    "Badlands": 49995,
                    "Wildtrak": 55995,
                    "Raptor": 72995,
                    "Heritage": 48995
                },
                2025: {
                    "Base": 39995,
                    "Big Bend": 42995,
                    "Black Diamond": 45995,
                    "Outer Banks": 48995,
                    "Badlands": 51995,
                    "Wildtrak": 57995,
                    "Raptor": 74995,
                    "Heritage": 50995
                },
                2026: {
                    "Base": 39995,
                    "Big Bend": 42995,
                    "Black Diamond": 45995,
                    "Outer Banks": 48995,
                    "Badlands": 51995,
                    "Wildtrak": 57995,
                    "Raptor": 74995,
                    "Heritage": 50995
                }
            }
        },
        "Ranger": {
            "production_years": (2000, 2011),
            "trims_by_year": {
                2000: {
                    "Regular Cab XL": 12995,
                    "SuperCab XL": 15995,
                    "SuperCab XLT": 18995,
                    "SuperCab Edge": 21995
                },
                2005: {
                    "Regular Cab XL": 14995,
                    "SuperCab XL": 17995,
                    "SuperCab XLT": 20995,
                    "SuperCab Edge": 23995,
                    "SuperCab FX4": 26995
                },
                2010: {
                    "Regular Cab XL": 17995,
                    "SuperCab XL": 20995,
                    "SuperCab XLT": 23995,
                    "SuperCab Sport": 26995
                },
                2011: {
                    "Regular Cab XL": 18995,
                    "SuperCab XL": 21995,
                    "SuperCab XLT": 24995,
                    "SuperCab Sport": 27995
                }
            }
        },
        "Taurus": {
            "production_years": (2000, 2019),
            "trims_by_year": {
                2000: {
                    "LX": 19995,
                    "SE": 21995,
                    "SES": 24995
                },
                2005: {
                    "SE": 22995,
                    "SEL": 25995,
                    "Limited": 28995
                },
                2010: {
                    "SE": 26995,
                    "SEL": 29995,
                    "Limited": 32995,
                    "SHO": 37995
                },
                2015: {
                    "SE": 28995,
                    "SEL": 31995,
                    "Limited": 34995,
                    "SHO": 41995
                },
                2017: {
                    "SE": 29995,
                    "SEL": 32995,
                    "Limited": 35995,
                    "SHO": 43995
                },
                2019: {
                    "SE": 30995,
                    "SEL": 33995,
                    "Limited": 36995,
                    "SHO": 44995
                }
            }
        }
    },
    "Fiat": {
        "500": {
            "production_years": (2011, 2019),
            "trims_by_year": {
                2011: {
                    "Pop": 15995,
                    "Sport": 17995,
                    "Lounge": 19995
                },
                2012: {
                    "Pop": 16995,
                    "Sport": 18995,
                    "Lounge": 20995,
                    "Abarth": 22995
                },
                2013: {
                    "Pop": 16995,
                    "Sport": 18995,
                    "Lounge": 20995,
                    "Abarth": 23995,
                    "Turbo": 19995
                },
                2014: {
                    "Pop": 17995,
                    "Sport": 19995,
                    "Lounge": 21995,
                    "Abarth": 24995,
                    "Turbo": 20995
                },
                2015: {
                    "Pop": 17995,
                    "Sport": 19995,
                    "Lounge": 21995,
                    "Abarth": 24995,
                    "Turbo": 20995
                },
                2016: {
                    "Pop": 17995,
                    "Easy": 19995,
                    "Lounge": 21995,
                    "Abarth": 25995
                },
                2017: {
                    "Pop": 17995,
                    "Easy": 19995,
                    "Lounge": 21995,
                    "Abarth": 25995
                },
                2018: {
                    "Pop": 17995,
                    "Easy": 19995,
                    "Lounge": 21995,
                    "Abarth": 25995
                },
                2019: {
                    "Pop": 17995,
                    "Lounge": 21995,
                    "Abarth": 25995
                }
            }
        },
        "500L": {
            "production_years": (2014, 2020),
            "trims_by_year": {
                2014: {
                    "Pop": 19995,
                    "Easy": 21995,
                    "Lounge": 24995
                },
                2015: {
                    "Pop": 20995,
                    "Easy": 22995,
                    "Lounge": 25995,
                    "Trekking": 24995
                },
                2016: {
                    "Pop": 20995,
                    "Easy": 22995,
                    "Lounge": 25995,
                    "Trekking": 24995
                },
                2017: {
                    "Pop": 20995,
                    "Easy": 22995,
                    "Lounge": 25995,
                    "Trekking": 24995
                },
                2018: {
                    "Pop": 20995,
                    "Easy": 22995,
                    "Lounge": 25995,
                    "Trekking": 24995
                },
                2019: {
                    "Pop": 20995,
                    "Lounge": 25995,
                    "Trekking": 24995
                },
                2020: {
                    "Pop": 20995,
                    "Lounge": 25995
                }
            }
        },
"500X": {
            "production_years": (2016, 2019),
            "trims_by_year": {
                2016: {
                    "Pop": 20995,
                    "Easy": 22995,
                    "Lounge": 25995,
                    "Trekking": 24995
                },
                2017: {
                    "Pop": 21995,
                    "Easy": 23995,
                    "Lounge": 26995,
                    "Trekking": 25995
                },
                2018: {
                    "Pop": 21995,
                    "Easy": 23995,
                    "Lounge": 26995,
                    "Trekking": 25995
                },
                2019: {
                    "Pop": 21995,
                    "Lounge": 26995,
                    "Trekking": 25995
                }
            }
        },
        "124 Spider": {
            "production_years": (2017, 2020),
            "trims_by_year": {
                2017: {
                    "Classica": 25995,
                    "Lusso": 28995,
                    "Abarth": 35995
                },
                2018: {
                    "Classica": 26995,
                    "Lusso": 29995,
                    "Abarth": 36995
                },
                2019: {
                    "Classica": 26995,
                    "Lusso": 29995,
                    "Abarth": 36995
                },
                2020: {
                    "Classica": 26995,
                    "Lusso": 29995,
                    "Abarth": 36995
                }
            }
        }
    }
}
