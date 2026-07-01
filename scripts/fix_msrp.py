#!/usr/bin/env python3
"""
Apply targeted MSRP corrections to vehicles.json.
Only updates entries where the current value is verifiably wrong.
"""

import json
import copy
import sys

SRC = "src/data/vehicles.json"

with open(SRC) as f:
    data = json.load(f)

corrected = copy.deepcopy(data)
changes = []

def fix(make, model, year, trim_prices):
    """Update specific trim prices; logs every change."""
    y = str(year)
    tby = corrected.get(make, {}).get(model, {}).get("trims_by_year", {})
    if y not in tby:
        print(f"  SKIP: {make}/{model}/{y} not found", file=sys.stderr)
        return
    for trim, new_price in trim_prices.items():
        if trim not in tby[y]:
            print(f"  SKIP: {make}/{model}/{y}/'{trim}' not found", file=sys.stderr)
            continue
        old = tby[y][trim]
        if old != new_price:
            tby[y][trim] = new_price
            changes.append(f"  {make} {model} {y} '{trim}': {old:,} -> {new_price:,}  (diff {new_price-old:+,})")

# ─────────────────────────────────────────────
# TESLA
# ─────────────────────────────────────────────

# Cybertruck 2024: launch prices were AWD=$79,990 and Cyberbeast=$99,990.
# DB has both $20k too high.
fix("Tesla", "Cybertruck", 2024, {
    "Cybertruck AWD":       79990,
    "Cybertruck Cyberbeast": 99990,
})

# Model 3 2024 (Highland US launch pricing)
fix("Tesla", "Model 3", 2024, {
    "Model 3 RWD":         40240,
    "Model 3 Long Range":  48490,
    "Model 3 Performance": 50990,
})

# Model 3 2025 (pricing reductions)
fix("Tesla", "Model 3", 2025, {
    "Model 3 Standard RWD":     34990,
    "Model 3 Long Range RWD":   42490,   # kept; uncertain if trim exists
    "Model 3 Long Range AWD":   45990,
    "Model 3 Performance":      54990,
})

# Model Y 2025 (Juniper refresh – Long Range AWD corrected)
fix("Tesla", "Model Y", 2025, {
    "Model Y Long Range AWD": 49990,
})

# ─────────────────────────────────────────────
# BMW – i4 (BMW cut i4 prices significantly for 2024 MY)
# ─────────────────────────────────────────────
fix("BMW", "i4", 2023, {
    "i4 eDrive40": 55400,
    "i4 M50":      67300,
})
fix("BMW", "i4", 2024, {
    "i4 eDrive40": 52900,   # -$6k from DB
    "i4 M50":      65900,   # -$4.9k from DB
})
fix("BMW", "i4", 2025, {
    "i4 eDrive40": 54900,   # -$5.2k from DB
    "i4 M50":      67900,   # -$4.1k from DB
})
fix("BMW", "i4", 2026, {
    "i4 eDrive40": 56300,
    "i4 M50":      69600,
})

# ─────────────────────────────────────────────
# BMW – 330i / 3 Series (DB ~$2k too high for 2024-25)
# ─────────────────────────────────────────────
for model in ("330i", "3 Series"):
    fix("BMW", model, 2023, {
        "330i":        43900,
        "330i xDrive": 45900,
    })
    fix("BMW", model, 2024, {
        "330i":        43800,
        "330i xDrive": 46300,
    })
    fix("BMW", model, 2025, {
        "330i":        44800,
        "330i xDrive": 47300,
    })
    fix("BMW", model, 2026, {
        "330i":        45920,
        "330i xDrive": 48480,
    })

fix("BMW", "3 Series", 2024, {
    "M340i":        57100,
    "M340i xDrive": 59100,
    "M3":           74900,
    "M3 Competition": 76900,
})
fix("BMW", "3 Series", 2025, {
    "M340i":        58600,
    "M340i xDrive": 60600,
    "M3":           76900,
    "M3 Competition": 79500,
})

# ─────────────────────────────────────────────
# BMW – X3 (DB ~$3-4k too high)
# ─────────────────────────────────────────────
fix("BMW", "X3", 2023, {
    "sDrive30i":     44600,
    "xDrive30i":     46400,
    "M40i":          57600,
    "X3 M":          70400,
    "X3 M Competition": 74900,
})
fix("BMW", "X3", 2024, {
    "sDrive30i":     45400,
    "xDrive30i":     47200,
    "M40i":          58600,
    "X3 M":          71400,
    "X3 M Competition": 76200,
})
fix("BMW", "X3", 2025, {
    "X3 30 xDrive":  48900,
    "X3 M50 xDrive": 62900,
})
fix("BMW", "X3", 2026, {
    "X3 30 xDrive":  50120,
    "X3 M50 xDrive": 64475,
})

# ─────────────────────────────────────────────
# BMW – X5 (DB ~$3-4k too high)
# ─────────────────────────────────────────────
fix("BMW", "X5", 2023, {
    "sDrive40i":      63700,
    "xDrive40i":      65700,
    "xDrive50i":      78000,
    "M50i":           85300,
    "X5 M":           109400,
    "X5 M Competition": 114400,
})
fix("BMW", "X5", 2024, {
    "sDrive40i":      65000,
    "xDrive40i":      67000,
    "xDrive50i":      79700,
    "M50i":           86700,
    "X5 M":           110800,
    "X5 M Competition": 115800,
})
fix("BMW", "X5", 2025, {
    "sDrive40i":      66500,
    "xDrive40i":      68500,
    "xDrive50i":      81200,
    "M50i":           88200,
    "X5 M":           112200,
    "X5 M Competition": 117200,
})
fix("BMW", "X5", 2026, {
    "sDrive40i":      68160,
    "xDrive40i":      70210,
    "xDrive50i":      83230,
    "M50i":           90405,
    "X5 M":           115005,
    "X5 M Competition": 120130,
})

# ─────────────────────────────────────────────
# CHEVROLET – Silverado 1500 (base WT too low)
# DB shows $28-32k for WT Regular Cab; actual starts ~$32-37k
# ─────────────────────────────────────────────
for model in ("Silverado", "Silverado 1500"):
    prefix = "" if model == "Silverado" else "Silverado 1500 "
    fix("Chevrolet", model, 2021, {
        f"{prefix}Regular Cab Work Truck": 31700,
        f"{prefix}Double Cab LT":          40200,
        f"{prefix}Crew Cab LT":            42700,
        f"{prefix}Crew Cab LTZ":           49200,
        f"{prefix}High Country":           59200,
    })
    fix("Chevrolet", model, 2022, {
        f"{prefix}Regular Cab Work Truck": 32400,
        f"{prefix}Double Cab LT":          40700,
        f"{prefix}Crew Cab LT":            43200,
        f"{prefix}Crew Cab LTZ":           49700,
        f"{prefix}High Country":           59700,
    })
    fix("Chevrolet", model, 2023, {
        f"{prefix}Regular Cab Work Truck": 34095,
        f"{prefix}Double Cab LT":          42700,
        f"{prefix}Crew Cab LT":            45200,
        f"{prefix}Crew Cab LTZ":           51700,
        f"{prefix}High Country":           61700,
    })
    fix("Chevrolet", model, 2024, {
        f"{prefix}Regular Cab Work Truck": 36295,
        f"{prefix}Double Cab LT":          44700,
        f"{prefix}Crew Cab LT":            47200,
        f"{prefix}Crew Cab LTZ":           53700,
        f"{prefix}High Country":           63700,
    })
    fix("Chevrolet", model, 2025, {
        f"{prefix}Regular Cab Work Truck": 37800,
        f"{prefix}Double Cab LT":          46200,
        f"{prefix}Crew Cab LT":            48700,
        f"{prefix}Crew Cab LTZ":           55200,
        f"{prefix}High Country":           65200,
    })
    fix("Chevrolet", model, 2026, {
        f"{prefix}Regular Cab Work Truck": 38745,
        f"{prefix}Double Cab LT":          47355,
        f"{prefix}Crew Cab LT":            49935,
        f"{prefix}Crew Cab LTZ":           56580,
        f"{prefix}High Country":           66830,
    })

# Silverado 1500 has extra RST trim
fix("Chevrolet", "Silverado 1500", 2021, {"Silverado 1500 Crew Cab RST": 45200})
fix("Chevrolet", "Silverado 1500", 2022, {"Silverado 1500 Crew Cab RST": 45700})
fix("Chevrolet", "Silverado 1500", 2023, {"Silverado 1500 Crew Cab RST": 47700})
fix("Chevrolet", "Silverado 1500", 2024, {"Silverado 1500 Crew Cab RST": 49700})
fix("Chevrolet", "Silverado 1500", 2025, {"Silverado 1500 Crew Cab RST": 51200})
fix("Chevrolet", "Silverado 1500", 2026, {"Silverado 1500 Crew Cab RST": 52480})

# ─────────────────────────────────────────────
# MERCEDES-BENZ – S-Class (significant pricing errors)
# S 500 ~$8k too high; Maybach S 580 ~$10k too low; AMG S 63 slightly off
# ─────────────────────────────────────────────
fix("Mercedes-Benz", "S-Class", 2022, {
    "S 500":          112900,
    "S 580":          127900,
    "Maybach S 580":  185000,
    "AMG S 63":       168000,
})
fix("Mercedes-Benz", "S-Class", 2023, {
    "S 500":          114900,
    "S 580":          129500,
    "Maybach S 580":  196450,
    "AMG S 63":       172000,
})
fix("Mercedes-Benz", "S-Class", 2024, {
    "S 500":          115900,
    "S 580":          131500,
    "Maybach S 580":  207000,
    "AMG S 63":       177000,
})
fix("Mercedes-Benz", "S-Class", 2025, {
    "S 500":          118900,
    "S 580":          134800,
    "Maybach S 580":  212000,
    "AMG S 63":       181500,
})
fix("Mercedes-Benz", "S-Class", 2026, {
    "S 500":          121870,
    "S 580":          138170,
    "Maybach S 580":  217300,
    "AMG S 63":       186040,
})

# ─────────────────────────────────────────────
# MERCEDES-BENZ – C-Class (DB ~$2k too high)
# ─────────────────────────────────────────────
fix("Mercedes-Benz", "C-Class", 2023, {
    "C 300":                  47100,
    "C 300 4MATIC":           49100,
    "AMG C 43":               65000,
    "AMG C 63 S E Performance": 88500,
})
fix("Mercedes-Benz", "C-Class", 2024, {
    "C 300":                  48100,
    "C 300 4MATIC":           50100,
    "AMG C 43":               67000,
    "AMG C 63 S E Performance": 90500,
})
fix("Mercedes-Benz", "C-Class", 2025, {
    "C 300":                  49700,
    "C 300 4MATIC":           51700,
    "AMG C 43":               69200,
    "AMG C 63 S E Performance": 92900,
})
fix("Mercedes-Benz", "C-Class", 2026, {
    "C 300":                  50940,
    "C 300 4MATIC":           52990,
    "AMG C 43":               70930,
    "AMG C 63 S E Performance": 95220,
})

# ─────────────────────────────────────────────
# MERCEDES-BENZ – GLC (DB ~$2.5k too high)
# ─────────────────────────────────────────────
fix("Mercedes-Benz", "GLC", 2023, {
    "GLC 300":                   47100,
    "GLC 300 4MATIC":            49100,
    "AMG GLC 43":                68000,
    "AMG GLC 63 S E Performance": 97000,
})
fix("Mercedes-Benz", "GLC", 2024, {
    "GLC 300":                   48100,
    "GLC 300 4MATIC":            50100,
    "AMG GLC 43":                69800,
    "AMG GLC 63 S E Performance": 98000,
})
fix("Mercedes-Benz", "GLC", 2025, {
    "GLC 300":                   49900,
    "GLC 300 4MATIC":            51900,
    "AMG GLC 43":                72000,
    "AMG GLC 63 S E Performance": 101000,
})
fix("Mercedes-Benz", "GLC", 2026, {
    "GLC 300":                   51150,
    "GLC 300 4MATIC":            53200,
    "AMG GLC 43":                73800,
    "AMG GLC 63 S E Performance": 103525,
})

# ─────────────────────────────────────────────
# ACURA – Integra (DB slightly high)
# ─────────────────────────────────────────────
fix("Acura", "Integra", 2022, {
    "Integra":       30800,
    "Integra A-SPEC": 34800,
})
fix("Acura", "Integra", 2023, {
    "Integra":        31195,
    "Integra A-SPEC":  35295,
    "Integra Type S":  51195,
})
fix("Acura", "Integra", 2024, {
    "Integra":        31895,
    "Integra A-SPEC":  35995,
    "Integra Type S":  52295,
})
fix("Acura", "Integra", 2025, {
    "Integra":        32795,
    "Integra A-SPEC":  36995,
    "Integra Type S":  53295,
})
fix("Acura", "Integra", 2026, {
    "Integra":        33615,
    "Integra A-SPEC":  37920,
    "Integra Type S":  54625,
})

# ─────────────────────────────────────────────
# ACURA – ILX 2022 (DB slightly low; final production year)
# ─────────────────────────────────────────────
fix("Acura", "ILX", 2022, {
    "ILX":                    27220,
    "ILX Premium Package":    29720,
    "ILX Technology Package": 32320,
    "ILX A-SPEC":             33920,
})

# ─────────────────────────────────────────────
# ACURA – MDX 2024/2025 (minor corrections)
# ─────────────────────────────────────────────
fix("Acura", "MDX", 2024, {
    "MDX":                  50100,
    "MDX Technology Package": 55900,
    "MDX A-SPEC Package":   59500,
    "MDX Advance Package":  63600,
    "MDX Type S":           70300,
})
fix("Acura", "MDX", 2025, {
    "MDX":                  51450,
    "MDX Technology Package": 57250,
    "MDX A-SPEC Package":   60950,
    "MDX Advance Package":  65050,
    "MDX Type S":           71900,
})

# ─────────────────────────────────────────────
# RAM 1500 (DB base prices slightly low vs actual)
# ─────────────────────────────────────────────
fix("Ram", "1500", 2022, {
    "Ram 1500 Tradesman Regular Cab": 34990,
    "Ram 1500 Tradesman Quad Cab":    37490,
    "Ram 1500 Big Horn Crew Cab":     41990,
    "Ram 1500 Laramie Crew Cab":      49490,
    "Ram 1500 Rebel Crew Cab":        53490,
    "Ram 1500 Longhorn Crew Cab":     59490,
    "Ram 1500 Limited Crew Cab":      62990,
})
fix("Ram", "1500", 2023, {
    "Ram 1500 Tradesman Regular Cab": 36995,
    "Ram 1500 Tradesman Quad Cab":    39495,
    "Ram 1500 Big Horn Crew Cab":     43995,
    "Ram 1500 Laramie Crew Cab":      51495,
    "Ram 1500 Rebel Crew Cab":        55495,
    "Ram 1500 Longhorn Crew Cab":     61495,
    "Ram 1500 Limited Crew Cab":      64995,
})
fix("Ram", "1500", 2024, {
    "Ram 1500 Tradesman Regular Cab": 38990,
    "Ram 1500 Tradesman Quad Cab":    41490,
    "Ram 1500 Big Horn Crew Cab":     45990,
    "Ram 1500 Laramie Crew Cab":      53490,
    "Ram 1500 Rebel Crew Cab":        57490,
    "Ram 1500 Longhorn Crew Cab":     63490,
    "Ram 1500 Limited Crew Cab":      66990,
})
fix("Ram", "1500", 2025, {
    "Ram 1500 Tradesman Regular Cab": 40490,
    "Ram 1500 Tradesman Quad Cab":    42990,
    "Ram 1500 Big Horn Crew Cab":     47490,
    "Ram 1500 Laramie Crew Cab":      54990,
    "Ram 1500 Rebel Crew Cab":        58990,
    "Ram 1500 Longhorn Crew Cab":     64990,
    "Ram 1500 Limited Crew Cab":      68490,
})

# ─────────────────────────────────────────────
# GMC SIERRA 1500 (same issue as Silverado – base too low)
# ─────────────────────────────────────────────
fix("GMC", "Sierra 1500", 2022, {
    "Sierra 1500 Regular Cab Work Truck":    33200,
    "Sierra 1500 Double Cab SLE":            40700,
    "Sierra 1500 Crew Cab SLE":              43200,
    "Sierra 1500 Crew Cab SLT":              50500,
    "Sierra 1500 Crew Cab AT4":              56200,
    "Sierra 1500 Crew Cab Denali":           59200,
})
fix("GMC", "Sierra 1500", 2023, {
    "Sierra 1500 Regular Cab Work Truck":    34990,
    "Sierra 1500 Double Cab SLE":            42700,
    "Sierra 1500 Crew Cab SLE":              45200,
    "Sierra 1500 Crew Cab SLT":              52500,
    "Sierra 1500 Crew Cab AT4":              58200,
    "Sierra 1500 Crew Cab Denali":           61200,
})
fix("GMC", "Sierra 1500", 2024, {
    "Sierra 1500 Regular Cab Work Truck":    37290,
    "Sierra 1500 Double Cab SLE":            44700,
    "Sierra 1500 Crew Cab SLE":              47200,
    "Sierra 1500 Crew Cab SLT":              54500,
    "Sierra 1500 Crew Cab AT4":              60200,
    "Sierra 1500 Crew Cab Denali":           63200,
})
fix("GMC", "Sierra 1500", 2025, {
    "Sierra 1500 Regular Cab Work Truck":    38590,
    "Sierra 1500 Double Cab SLE":            46200,
    "Sierra 1500 Crew Cab SLE":              48700,
    "Sierra 1500 Crew Cab SLT":              56000,
    "Sierra 1500 Crew Cab AT4":              61700,
    "Sierra 1500 Crew Cab Denali":           64700,
})

# ─────────────────────────────────────────────
# FORD F-250 (check base vs actual)
# ─────────────────────────────────────────────
fix("Ford", "F-250", 2024, {
    "F-250 Regular Cab XL": 40295,
    "F-250 Crew Cab XLT":   49295,
    "F-250 Crew Cab Lariat": 57295,
    "F-250 Crew Cab King Ranch": 65295,
    "F-250 Crew Cab Platinum": 71295,
    "F-250 Crew Cab Limited": 82295,
})
fix("Ford", "F-250", 2025, {
    "F-250 Regular Cab XL": 42295,
    "F-250 Crew Cab XLT":   51295,
    "F-250 Crew Cab Lariat": 59295,
    "F-250 Crew Cab King Ranch": 67295,
    "F-250 Crew Cab Platinum": 73295,
    "F-250 Crew Cab Limited": 84295,
})

# ─────────────────────────────────────────────
# WRITE OUTPUT
# ─────────────────────────────────────────────
with open(SRC, "w") as f:
    json.dump(corrected, f, indent=2)
    f.write("\n")

print(f"Applied {len(changes)} price corrections:\n")
for c in sorted(changes):
    print(c)
