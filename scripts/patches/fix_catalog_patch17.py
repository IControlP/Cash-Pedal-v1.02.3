#!/usr/bin/env python3
"""Patch 17: MY2027 pricing refresh, revived models, and missing high-volume models.

Run from the repo root: python3 scripts/patches/fix_catalog_patch17.py

All prices are base MSRP excluding destination (the database convention); where
a source quoted a destination-inclusive figure the stated destination charge was
subtracted, as noted per entry. Sources are secondary (press coverage of
manufacturer announcements, dealer-group and pricing-guide pages) gathered by
web search in Oct 2026; the manufacturer sites themselves were not reachable
from the tooling. Spot-check against the build-and-price site before relying
on any single figure.

Only model years with per-trim pricing were added. Models whose 2027 pricing
was unpublished or only given as a range stay on the staleness worklist.

New-model specs (horsepower, seats, cargo) are approximate base-trim figures
from published spec sheets; mpg is filled afterwards by fetch_epa_mpg.py.
"""
import copy
import json

SRC = "src/data/vehicles.json"
with open(SRC) as f:
    data = json.load(f)

corrected = copy.deepcopy(data)
changes = []


def set_year(make, model, year, trims):
    """Add or replace one model year and extend production_years to cover it."""
    m = corrected[make][model]
    replaced = str(year) in m["trims_by_year"]
    m["trims_by_year"][str(year)] = trims
    m["trims_by_year"] = dict(sorted(m["trims_by_year"].items()))
    m["production_years"][1] = max(m["production_years"][1], year)
    changes.append(f"  {make} {model} {year}: {'replaced' if replaced else 'added'} ({len(trims)} trims)")


def add_model(make, model, vtype, start, specs, years, is_ev=False):
    corrected[make][model] = {
        "type": vtype,
        "is_ev": is_ev,
        "production_years": [start, max(years)],
        "trims_by_year": {str(y): years[y] for y in sorted(years)},
        "mpg": None,
        "specs": specs,
    }
    changes.append(f"  {make} {model}: new model, MY{min(years)}-{max(years)}")


# ---------------------------------------------------- existing models: new years

# GM Authority '2027 Buick Enclave pricing uncovered' Jul 2026 (FWD, $1,995 destination removed)
set_year('Buick', 'Enclave', 2027, {"Enclave Preferred": 46600, "Enclave Sport Touring": 50100, "Enclave Avenir": 60200})

# Corvette Blogger / TFLcar 2027 Corvette pricing Apr 2026 (1LT/1LZ coupes, excl. $2,495 destination; Grand Sport replaces E-Ray)
set_year('Chevrolet', 'Corvette', 2027, {"Corvette Stingray": 71000, "Corvette Stingray Convertible": 78000, "Corvette Grand Sport": 86000, "Corvette Grand Sport X": 109700, "Corvette Z06": 118900, "Corvette ZR1": 194700, "Corvette ZR1X": 224900})

# GM Authority '2027 Chevy Equinox configurator live' Jun 2026 (excl. destination)
set_year('Chevrolet', 'Equinox', 2027, {"Equinox LT": 29000, "Equinox RS": 33900, "Equinox ACTIV": 33900})

# GM Authority '2025 Chevy Malibu pricing uncovered' (incl. $1,195 destination, removed here); final model year
set_year('Chevrolet', 'Malibu', 2025, {"Malibu LS": 25800, "Malibu LT": 28100, "Malibu 2LT": 31500})

# AutomotiveAddicts/GM Authority 2027 Tahoe pricing (2WD where offered; High Country 4WD; excl. $2,795 destination)
set_year('Chevrolet', 'Tahoe', 2027, {"Tahoe LS": 61200, "Tahoe LT": 64200, "Tahoe RST": 69600, "Tahoe Premier": 76100, "Tahoe High Country": 84200})

# GM Authority '2027 Chevy Traverse pricing uncovered' Jun 2026 (FWD where offered; destination $1,995 removed)
set_year('Chevrolet', 'Traverse', 2027, {"Traverse LT": 40800, "Traverse Z71": 49100, "Traverse RS": 55800, "Traverse High Country": 56100})

# Carscoops / Mopar Insiders 2027 Pacifica pricing May 2026 (FWD, excl. $1,995 destination)
set_year('Chrysler', 'Pacifica', 2027, {"Pacifica LX": 41495, "Pacifica Select": 43545, "Pacifica Limited": 47995, "Pacifica Pinnacle": 54910})

# Mopar Insiders 'The Chrysler Voyager is back' ($41,990 incl. $1,995 destination)
set_year('Chrysler', 'Voyager', 2025, {"Voyager LX": 39995})

# Mopar Insiders 2026 Voyager (excl. $1,995 destination)
set_year('Chrysler', 'Voyager', 2026, {"Voyager LX": 39995})

# Mopar Insiders '2026 Dodge Charger SIXPACK Buyer's Guide' (excl. $1,995 destination). Gas Charger returns after the 2024-2025 EV-only gap
set_year('Dodge', 'Charger', 2026, {"Charger Sixpack R/T 2-Door": 49995, "Charger Sixpack R/T 4-Door": 51995, "Charger Sixpack Scat Pack 2-Door": 55690, "Charger Sixpack Scat Pack 4-Door": 57690})

# GM Authority '2027 GMC Acadia pricing uncovered' Jul 2026 (FWD where offered; $1,995 destination removed)
set_year('GMC', 'Acadia', 2027, {"Acadia Elevation": 43600, "Acadia AT4": 52400, "Acadia Denali": 55900, "Acadia Denali Ultimate": 63400})

# GM Authority '2027 GMC Terrain configurator live' Jun 2026 (FWD where offered; $1,995 destination removed)
set_year('GMC', 'Terrain', 2027, {"Terrain Elevation": 30400, "Terrain AT4": 39100, "Terrain Denali": 42200})

# Cars.com 'How Much Is the 2027 Honda CR-V?' (excl. $1,395 destination)
set_year('Honda', 'CR-V', 2027, {"CR-V LX": 31520, "CR-V EX": 33550, "CR-V EX-L": 35800, "CR-V Hybrid Sport": 36030, "CR-V Hybrid Sport-L": 39125, "CR-V Hybrid TrailSport": 39200, "CR-V Hybrid Sport Touring": 42950})

# Derived: 2027 pricing above, which the source states is +$400 per trim over 2026. The 2025 refresh dropped the LX.
set_year('Honda', 'Odyssey', 2026, {"Odyssey EX-L": 42795, "Odyssey Sport-L": 43895, "Odyssey Touring": 47495, "Odyssey Elite": 51695})

# Fisher Honda '2027 Honda Odyssey trim levels' / Honda pricing (excl. destination); each trim +$400 vs 2026
set_year('Honda', 'Odyssey', 2027, {"Odyssey EX-L": 43195, "Odyssey Sport-L": 44295, "Odyssey Touring": 47895, "Odyssey Elite": 52095})

# InsideEVs/Electrek: Hyundai cut 2026 Ioniq 5 MSRPs $7,600-$9,800 on Oct 1 2025 (excl. $1,600 freight); Limited is AWD
set_year('Hyundai', 'Ioniq 5', 2026, {"Ioniq 5 SE Standard Range": 35000, "Ioniq 5 SE": 37500, "Ioniq 5 SE AWD": 41000, "Ioniq 5 SEL": 39800, "Ioniq 5 SEL AWD": 43300, "Ioniq 5 XRT AWD": 46275, "Ioniq 5 Limited": 48975})

# Electrek 'Hyundai Ioniq 5 prices rise $250 for 2027, starting at $35,250' Aug 18 2026 (excl. destination); Limited is AWD
set_year('Hyundai', 'Ioniq 5', 2027, {"Ioniq 5 SE Standard Range": 35250, "Ioniq 5 SE": 37750, "Ioniq 5 SE AWD": 41250, "Ioniq 5 SEL": 40200, "Ioniq 5 SEL AWD": 44700, "Ioniq 5 XRT AWD": 46525, "Ioniq 5 Limited": 49125})

# AutomotiveAddicts 2027 Kona pricing (FWD, excl. destination); SEL Premium price not published in source
set_year('Hyundai', 'Kona', 2027, {"Kona SE": 25500, "Kona SEL Sport": 26825, "Kona Limited": 32585})

# Hyundai USA via TrueCar/AutomotiveAddicts 2027 Palisade (FWD, excl. $1,600 destination)
set_year('Hyundai', 'Palisade', 2027, {"Palisade SE": 39735, "Palisade SEL": 42240, "Palisade SEL Premium": 45600, "Palisade Limited": 50070, "Palisade Calligraphy": 54860, "Palisade Hybrid SEL": 44560, "Palisade Hybrid Limited": 51100})

# AutomotiveAddicts 2027 Santa Fe / Santa Fe Hybrid pricing (excl. destination)
set_year('Hyundai', 'Santa Fe', 2027, {"Santa Fe SE": 35050, "Santa Fe SEL": 37865, "Santa Fe XRT": 42015, "Santa Fe Limited": 44765, "Santa Fe Calligraphy": 47915, "Santa Fe Hybrid SE": 38300, "Santa Fe Hybrid SEL": 40590, "Santa Fe Hybrid Limited": 47600, "Santa Fe Hybrid Calligraphy": 50600})

# KBB '2027 Jeep Grand Cherokee Upland' / Carscoops (destination $1,995 removed)
set_year('Jeep', 'Grand Cherokee', 2027, {"Grand Cherokee Laredo": 39520, "Grand Cherokee Laredo Upland": 47995, "Grand Cherokee Limited": 44960, "Grand Cherokee Trailhawk": 53000, "Grand Cherokee Overland": 55900, "Grand Cherokee Summit": 60900})

# Cars.com 'How Much Is the 2027 Kia K5?' / Carscoops Sep 2026 (excl. $1,245 destination; EX dropped)
set_year('Kia', 'K5', 2027, {"K5 LXS": 27690, "K5 GT-Line": 28690, "K5 GT": 33790})

# AutoGuide '2027 Kia Niro Pricing Announced' (hybrid only for 2027, excl. $1,495 destination)
set_year('Kia', 'Niro', 2027, {"Niro LX": 29890, "Niro S": 30590, "Niro EX": 31390, "Niro SX": 35440, "Niro SX Touring": 38990})

# Carscoops/Motor1 2027 Kia Seltos pricing (FWD where offered, excl. $1,495 destination)
set_year('Kia', 'Seltos', 2027, {"Seltos LX": 24990, "Seltos S": 26390, "Seltos EX": 28390, "Seltos X-Line S": 28990, "Seltos X-Line SX": 32790})

# AutoGuide 'Kia Announces Pricing For 2027 Sportage' + Kia HEV/PHEV pricing release (FWD where offered, excl. $1,495 destination)
set_year('Kia', 'Sportage', 2027, {"Sportage LX": 28990, "Sportage EX": 30790, "Sportage SX": 34590, "Sportage X-Line": 34790, "Sportage SX Prestige": 36590, "Sportage X-Pro Prestige": 39890, "Sportage Hybrid LX": 30590, "Sportage Hybrid S": 31290, "Sportage Hybrid EX": 32290, "Sportage Hybrid X-Line": 35790, "Sportage Hybrid SX Prestige": 40690, "Sportage Plug-In Hybrid X-Line": 40590, "Sportage Plug-In Hybrid X-Line Prestige": 47390})

# AutoGuide 'Kia Prices 2027 Telluride' + Kia America HEV pricing release (excl. $1,545 destination; FWD where offered)
set_year('Kia', 'Telluride', 2027, {"Telluride LX": 39190, "Telluride S": 42090, "Telluride EX": 43790, "Telluride SX": 48790, "Telluride SX-Prestige": 53890, "Telluride X-Pro SX-Prestige": 56790, "Telluride Hybrid EX": 46490, "Telluride Hybrid SX": 51490, "Telluride Hybrid SX-Prestige": 56590})

# AutomotiveAddicts 2026 Murano pricing (AWD standard, excl. $1,495 destination)
set_year('Nissan', 'Murano', 2026, {"Murano SV": 41670, "Murano SL": 46760, "Murano Platinum": 49800})

# AutoGuide '2027 Nissan Sentra Adds Midnight Edition Package' (excl. $1,245 destination)
set_year('Nissan', 'Sentra', 2027, {"Sentra S": 22890, "Sentra SV": 23590, "Sentra SR": 24990, "Sentra SL": 27990})

# Edmunds '2027 Rivian pricing' / Notebookcheck (excl. destination; new Premium/Performance/Quad trim structure)
set_year('Rivian', 'R1S', 2027, {"R1S Premium": 83990, "R1S Performance": 106990, "R1S Quad": 121990})

# Edmunds '2027 Rivian pricing' / Notebookcheck (excl. destination; new Premium/Performance/Quad trim structure)
set_year('Rivian', 'R1T', 2027, {"R1T Premium": 79990, "R1T Performance": 100990, "R1T Quad": 115990})

# Subaru of America press release 2455, Jun 11 2026 (excl. $1,495 destination)
set_year('Subaru', 'Ascent', 2027, {"Premium": 40795, "Limited": 47985, "Limited Bronze Edition": 49095, "Touring": 51165})

# Subaru of America press release 2450, Jun 4 2026 (excl. $1,245 destination)
set_year('Subaru', 'BRZ', 2027, {"Limited": 36140, "tS": 38770})

# TFLcar '2027 Subaru Crosstrek Prices Hold Steady' Jul 2026 (excl. $1,475 destination)
set_year('Subaru', 'Crosstrek', 2027, {"Base": 26995, "Premium": 27995, "Limited": 32995, "Wilderness": 33795, "Sport Hybrid": 33995, "Limited Hybrid": 35995})

# Carscoops '2027 Toyota Corolla' Aug 2026 (excl. $1,295 destination)
set_year('Toyota', 'Corolla', 2027, {"LE": 23325, "SE": 25765, "XSE": 29040, "Hybrid LE": 25175, "Hybrid LE AWD": 26575, "Hybrid SE": 27615, "Hybrid SE AWD": 29015, "Hybrid XLE": 29540})

# Carscoops '2027 Toyota Land Cruiser pricing' Apr 2026 (excl. $1,495 destination)
set_year('Toyota', 'Land Cruiser', 2027, {"Land Cruiser 1958": 57880, "Land Cruiser": 62725})

# Carscoops 2027 Prius pricing (excl. $1,295 destination)
set_year('Toyota', 'Prius', 2027, {"Prius LE": 28755, "Prius XLE": 32200, "Prius XLE AWD": 33600, "Prius Nightshade": 33005, "Prius Limited": 35770, "Prius Prime SE": 33980, "Prius Prime XSE": 37230, "Prius Prime XSE Premium": 40675})

# Edmunds/TrueCar 2026 Toyota bZ (renamed from bZ4X; Toyota cut prices with the refresh; excl. destination)
set_year('Toyota', 'bZ4X', 2026, {"XLE FWD": 34900, "XLE AWD": 39900, "Limited FWD": 43300, "Limited AWD": 45300})

# VW of America via AutoGuide/Carscoops 'pricing of all-new 2027 Atlas' Jul 2026 (excl. $1,525 destination)
set_year('Volkswagen', 'Atlas', 2027, {"Atlas SE FWD": 41610, "Atlas SE 4Motion": 43610, "Atlas SE Technology FWD": 45610, "Atlas SE Technology 4Motion": 47610, "Atlas SEL R-Line 4Motion": 52110, "Atlas SEL Premium R-Line 4Motion": 56610})

# ------------------------------------------------------------------ new models

# MY2026: GM Authority '2026 Cadillac Lyriq pricing uncovered' Jul 2025 (excl. destination)
add_model('Cadillac', 'Lyriq', 'ev_suv', 2023, {"horsepower": 365, "seats": 5, "cargo_cu_ft": 28.0},
          {2026: {"Lyriq Luxury": 59200, "Lyriq Sport": 59700, "Lyriq Premium Luxury": 63200, "Lyriq Premium Sport": 63700, "Lyriq Signature Luxury": 67800, "Lyriq Signature Sport": 68300}}, is_ev=True)

# MY2024: Ford Authority/Yahoo '2024 Ford Bronco Sport prices cut' (incl. $1,595 destination, removed here)
# MY2025: Akins Ford / CarEdge 2025 Bronco Sport pricing (excl. destination)
# MY2026: AutomotiveAddicts/TrueCar 2026 Bronco Sport (incl. $1,995 destination, removed here; Free Wheeling dropped)
add_model('Ford', 'Bronco Sport', 'suv', 2021, {"horsepower": 180, "seats": 5, "cargo_cu_ft": 32.5},
          {2024: {"Big Bend": 29795, "Heritage": 32095, "Free Wheeling": 32395, "Outer Banks": 33935, "Badlands": 38390}, 2025: {"Big Bend": 29995, "Free Wheeling": 33135, "Heritage": 33395, "Outer Banks": 35295, "Badlands": 40115}, 2026: {"Big Bend": 31845, "Heritage": 34145, "Outer Banks": 36945, "Badlands": 40265}})

# MY2022: Ford launch pricing (Jalopnik/Ford Authority), excl. destination
# MY2026: Ford Authority '2026 Ford Maverick prices drop' Nov 2025 (excl. destination)
# MY2024: Autoblog 2024 Ford Maverick pricing (excl. destination)
# MY2027: Ford Authority / AutoGuide 2027 Maverick pricing Aug 2026 (excl. destination; XL and Lariat hybrid-only)
# MY2023: Ford Authority '2023 Ford Maverick prices increase' Sep 2022 / Autoblog (excl. destination)
# MY2025: Ford Authority '2025 Ford Maverick prices have increased' Feb 2025 (excl. destination)
add_model('Ford', 'Maverick', 'truck', 2022, {"horsepower": 191, "seats": 5, "cargo_cu_ft": 33.3},
          {2022: {"Maverick XL": 19995, "Maverick XLT": 22280, "Maverick Lariat": 25490}, 2023: {"Maverick XL": 22195, "Maverick XLT": 24855, "Maverick Lariat": 28355}, 2024: {"Maverick XL": 23815, "Maverick XLT": 26315, "Maverick Lariat": 34855}, 2025: {"Maverick XL": 26995, "Maverick XLT": 29495, "Maverick Lariat": 37290, "Maverick Lobo": 35255}, 2026: {"Maverick XL": 27145, "Maverick XL Hybrid": 28145, "Maverick XLT": 29645, "Maverick XLT Hybrid": 30645, "Maverick Lariat": 35870, "Maverick Lariat Hybrid": 38090}, 2027: {"Maverick XL Hybrid": 28145, "Maverick XLT": 30745, "Maverick Lobo": 32155, "Maverick Lobo High": 37155}})

# MY2024: Ford Authority '2025 Ford Ranger lineup gets modest price bumps' (SuperCrew 4x2, excl. destination)
# MY2025: Ford Authority '2025 Ford Ranger lineup gets modest price bumps' (SuperCrew 4x2, excl. $1,595 destination)
add_model('Ford', 'Ranger', 'truck', 2019, {"horsepower": 270, "seats": 5, "cargo_cu_ft": 45.0},
          {2024: {"Ranger XL": 32720, "Ranger XLT": 36160, "Ranger Lariat": 43680, "Ranger Raptor": 55620}, 2025: {"Ranger XL": 32980, "Ranger XLT": 36010, "Ranger Lariat": 43780, "Ranger Raptor": 55720}})

# MY2023: iSeeCars HR-V price by year (FWD, excl. destination)
# MY2024: iSeeCars HR-V price by year (FWD, excl. destination)
# MY2025: iSeeCars HR-V price by year (FWD, excl. destination)
# MY2026: iSeeCars HR-V price by year (FWD, excl. destination)
# MY2027: iSeeCars HR-V price by year (FWD, excl. destination)
add_model('Honda', 'HR-V', 'suv', 2016, {"horsepower": 158, "seats": 5, "cargo_cu_ft": 24.4},
          {2023: {"HR-V LX": 23800, "HR-V Sport": 25900, "HR-V EX-L": 27900}, 2024: {"HR-V LX": 24600, "HR-V Sport": 26700, "HR-V EX-L": 28700}, 2025: {"HR-V LX": 25400, "HR-V Sport": 27500, "HR-V EX-L": 29500}, 2026: {"HR-V LX": 26500, "HR-V Sport": 28300, "HR-V EX-L": 30350}, 2027: {"HR-V LX": 26600, "HR-V Sport": 28400, "HR-V EX-L": 30450}})

# MY2024: Autoblog 2024 Santa Cruz pricing (FWD where offered, excl. destination)
# MY2026: Autofinder/Edwards 2026 Santa Cruz pricing (excl. destination)
add_model('Hyundai', 'Santa Cruz', 'truck', 2022, {"horsepower": 191, "seats": 5, "cargo_cu_ft": 27.0},
          {2024: {"Santa Cruz SE": 26900, "Santa Cruz SEL": 29650, "Santa Cruz Night": 38460, "Santa Cruz XRT": 40100, "Santa Cruz Limited": 41320}, 2026: {"Santa Cruz SE": 29750, "Santa Cruz SEL": 31400, "Santa Cruz SEL Activity": 34450, "Santa Cruz XRT": 41350, "Santa Cruz Limited": 43700}})

# MY2022: iSeeCars 2022 Carnival price (excl. destination)
# MY2025: Kia America 2025 Carnival pricing release via Automotive World (excl. $1,395 destination)
# MY2026: Kia America 'Announces 2026 Carnival Pricing' (FWD, excl. $1,435 destination)
add_model('Kia', 'Carnival', 'minivan', 2022, {"horsepower": 287, "seats": 8, "cargo_cu_ft": 40.2},
          {2022: {"Carnival LX": 32300, "Carnival EX": 37800, "Carnival SX": 41300, "Carnival SX Prestige": 46300}, 2025: {"Carnival LX": 36500, "Carnival LXS": 38500, "Carnival EX": 40700, "Carnival SX": 45600, "Carnival SX Prestige": 50600, "Carnival Hybrid LXS": 40500, "Carnival Hybrid EX": 42700, "Carnival Hybrid SX": 47600, "Carnival Hybrid SX Prestige": 52600}, 2026: {"Carnival LX": 36990, "Carnival LXS": 38990, "Carnival EX": 41190, "Carnival SX": 46090, "Carnival SX Prestige": 51090, "Carnival Hybrid LXS": 40990, "Carnival Hybrid EX": 43190, "Carnival Hybrid SX": 48090, "Carnival Hybrid SX Prestige": 53090}})

# MY2024: Rusnak/MB Foothill 2024 GLE pricing (excl. destination)
# MY2025: MB Laguna '2025 Mercedes-Benz GLE Price' (excl. destination)
add_model('Mercedes-Benz', 'GLE', 'suv_large', 2016, {"horsepower": 255, "seats": 5, "cargo_cu_ft": 33.3},
          {2024: {"GLE 350 4MATIC": 62650, "GLE 450 4MATIC": 69500}, 2025: {"GLE 350 4MATIC": 64350, "GLE 450 4MATIC": 71350}})

# MY2022: iSeeCars Frontier price by year (S King Cab 4x2, SV, PRO-4X Crew 4x4; excl. destination)
# MY2023: iSeeCars Frontier price by year (S King Cab 4x2, SV, PRO-4X Crew 4x4; excl. destination)
# MY2024: iSeeCars Frontier price by year (S King Cab 4x2, SV, PRO-4X Crew 4x4; excl. destination)
# MY2025: iSeeCars Frontier price by year (S King Cab 4x2, SV, PRO-4X Crew 4x4; excl. destination)
# MY2026: iSeeCars Frontier price by year (S King Cab 4x2, SV, PRO-4X Crew 4x4; excl. destination)
add_model('Nissan', 'Frontier', 'truck', 2005, {"horsepower": 310, "seats": 5, "cargo_cu_ft": 33.5},
          {2022: {"Frontier S": 28690, "Frontier SV": 31390, "Frontier PRO-4X": 38120}, 2023: {"Frontier S": 29570, "Frontier SV": 32270, "Frontier PRO-4X": 39100}, 2024: {"Frontier S": 30510, "Frontier SV": 33210, "Frontier PRO-4X": 40040}, 2025: {"Frontier S": 32050, "Frontier SV": 36190, "Frontier PRO-4X": 41770}, 2026: {"Frontier S": 32150, "Frontier SV": 36190, "Frontier PRO-4X": 41870}})

# MY2025: KBB/iSeeCars 2025 Kicks pricing (FWD, excl. $1,390 destination)
# MY2026: KBB '2026 Nissan Kicks starts at $23,925'/iSeeCars (FWD, excl. $1,495 destination)
add_model('Nissan', 'Kicks', 'suv', 2018, {"horsepower": 141, "seats": 5, "cargo_cu_ft": 30.0},
          {2025: {"Kicks S": 21830, "Kicks SV": 23680, "Kicks SR": 26180}, 2026: {"Kicks S": 22730, "Kicks SV": 24470, "Kicks SR": 26960}})

# MY2024: Carscoops '2025 Nissan Versa gets $1k price hike' (2024 baseline, excl. destination)
# MY2025: Carscoops '2025 Nissan Versa gets $1k price hike' Sep 2024 (excl. destination)
add_model('Nissan', 'Versa', 'sedan', 2007, {"horsepower": 122, "seats": 5, "cargo_cu_ft": 15.0},
          {2024: {"Versa S": 16130, "Versa SV": 19420, "Versa SR": 20140}, 2025: {"Versa S": 17190, "Versa SV": 20490, "Versa SR": 21190}})

# MY2024: iSeeCars 2024 Corolla Cross price (FWD, excl. destination)
# MY2026: iSeeCars 2026 Corolla Cross price (FWD, excl. destination)
# MY2023: Autoblog/Motor1 2023 Corolla Cross + Hybrid pricing (FWD gas, AWD hybrid; excl. destination)
# MY2025: KBB '2025 Toyota Corolla Cross starts at $25,385' incl. $1,395 destination, removed here
add_model('Toyota', 'Corolla Cross', 'suv', 2022, {"horsepower": 169, "seats": 5, "cargo_cu_ft": 24.9},
          {2023: {"L": 23610, "LE": 25940, "XLE": 27715, "Hybrid S": 27970, "Hybrid SE": 29290, "Hybrid XSE": 31065}, 2024: {"L": 23860, "LE": 26190, "XLE": 28085}, 2025: {"L": 23990, "LE": 26320, "XLE": 28215, "Hybrid S": 28350, "Hybrid SE": 29670, "Hybrid XSE": 31535}, 2026: {"L": 25235, "LE": 27565, "XLE": 30160}})

# MY2024: Toyota 2024 Grand Highlander pricing via KBB/Carscoops (FWD where offered, excl. destination)
# MY2025: AutoGuide/Motor1 2025 Grand Highlander pricing (FWD where offered, excl. destination)
# MY2026: Carscoops 2026 Grand Highlander pricing (FWD where offered, excl. destination)
add_model('Toyota', 'Grand Highlander', 'suv_large', 2024, {"horsepower": 265, "seats": 8, "cargo_cu_ft": 20.6},
          {2024: {"XLE": 43070, "Limited": 47860, "Platinum": 53545, "Hybrid XLE": 44670, "Hybrid Limited": 51060, "Hybrid MAX Limited": 54040, "Hybrid MAX Platinum": 58125}, 2025: {"LE": 42310, "XLE": 45080, "Limited": 49810, "Platinum": 55495, "Hybrid LE": 45660, "Hybrid XLE": 46830, "Hybrid Limited": 53160, "Hybrid Nightshade": 54060, "Hybrid MAX Limited": 56140, "Hybrid MAX Platinum": 60225}, 2026: {"LE": 41360, "XLE": 44130, "Limited": 48860, "Platinum": 54545, "Hybrid LE": 44710, "Hybrid XLE": 45880, "Hybrid Limited": 52210, "Hybrid MAX Limited": 55190, "Hybrid MAX Platinum": 59275}})

# MY2024: iSeeCars 2024 Taos price (FWD where offered, excl. destination)
# MY2025: iSeeCars 2025 Taos price (FWD where offered, excl. destination)
# MY2026: iSeeCars 2026 Taos price (FWD where offered, excl. destination)
add_model('Volkswagen', 'Taos', 'suv', 2022, {"horsepower": 174, "seats": 5, "cargo_cu_ft": 27.9},
          {2024: {"Taos S": 23995, "Taos SE": 28165, "Taos SE Black": 30365, "Taos SEL 4Motion": 33515}, 2025: {"Taos S": 25495, "Taos SE": 28395, "Taos SE Black": 30645, "Taos SEL 4Motion": 35195}, 2026: {"Taos S": 26500, "Taos SE": 29260, "Taos SE Black": 31510, "Taos SEL 4Motion": 35900}})

# keep each make's models in their original order, new ones appended
with open(SRC, "w") as f:
    json.dump(corrected, f, indent=2)
    f.write("\n")

print(f"Patch 17: {len(changes)} change(s):")
for c in changes:
    print(c)
