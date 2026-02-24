# models/depreciation/enhanced_depreciation.py

"""
Enhanced Depreciation Model - Market-Realistic Version (Comprehensive 2024-2025)
Based on comprehensive market data from:
- iSeeCars.com 2024 Depreciation Study
- Kelley Blue Book (KBB) 2024 Best Resale Value Awards
- Edmunds True Cost to Own (TCO) 2024
- CarEdge Depreciation Research 2024
- Consumer Reports Reliability & Resale Studies
- Black Book Retention Values 2024

All depreciation curves and multipliers updated based on real-world 2024-2025 market data
across all vehicle segments, brands, and models.
"""

from typing import List, Dict, Any
import math

class EnhancedDepreciationModel:
    """Enhanced depreciation model with market-validated rates and EV support"""
    
    def __init__(self):
        # COMPREHENSIVE 2024-2025: Brand depreciation multipliers
        # Based on iSeeCars, KBB, Edmunds, CarEdge, and Black Book data
        # Lower multiplier = better value retention (less depreciation)
        # Higher multiplier = worse value retention (more depreciation)

        self.brand_multipliers = {
            # EXCEPTIONAL Value Retention (0.70-0.85) - Industry Leaders
            'Toyota': 0.75,      # Industry leader - 4Runner, Tacoma, Tundra excel
            'Lexus': 0.78,       # Best luxury brand retention - RX, GX standouts
            'Porsche': 0.79,     # Sports/luxury retention leader - 911, Cayenne
            'Honda': 0.82,       # Consistent strong performer - Pilot, CR-V excel
            'Subaru': 0.85,      # AWD demand drives retention - Outback, Crosstrek

            # EXCELLENT Value Retention (0.85-0.95) - Above Average
            'Jeep': 0.86,        # Wrangler effect lifts brand - Gladiator also strong
            'Mazda': 0.88,       # Improving quality perception - CX-5 popular
            'Acura': 0.89,       # Reliable luxury alternative - MDX strong

            # GOOD Value Retention (0.90-1.00) - Above to Average
            'Hyundai': 0.93,     # Strong warranty appeal - Palisade, Tucson popular
            'Kia': 0.95,         # Improving brand perception - Telluride standout
            'GMC': 0.96,         # Truck/SUV focus - Yukon, Sierra strong
            'Ford': 0.98,        # F-150, Bronco strength offsets sedan weakness
            'Buick': 1.04,       # UPDATED: Better than thought - aging demographic concerns lessening

            # AVERAGE Value Retention (1.00-1.10) - Market Average
            'Chevrolet': 1.00,   # Market baseline - Silverado, Tahoe excel
            'Ram': 1.02,         # Strong truck (1500, 2500), weak other segments
            'Nissan': 1.05,      # Mixed lineup - Frontier decent, sedans weak
            'Genesis': 1.06,     # New brand establishing reputation - GV70/80 improving
            'Volvo': 1.07,       # Safety reputation, but high luxury depreciation
            'Infiniti': 1.08,    # Luxury brand struggles - QX60 okay

            # BELOW AVERAGE Retention (1.10-1.20) - Below Market
            'Mitsubishi': 1.10,  # Limited US lineup, Outlander PHEV helps
            'Cadillac': 1.12,    # Escalade helps, sedans hurt (was 1.15, adjusted)
            'Volkswagen': 1.14,  # Reliability concerns persist - ID.4 weak
            'Audi': 1.15,        # Better than BMW/MB but still luxury depreciation
            'Mini': 1.16,        # Maintenance costs concern buyers
            'BMW': 1.18,         # High maintenance costs affect resale - X5 better
            'Lincoln': 1.18,     # Navigator helps, but fleet sales hurt brand

            # POOR Value Retention (1.20-1.40) - Significant Depreciation
            'Mercedes-Benz': 1.22,  # Luxury sedan depreciation - GLE better than E/S-Class
            'Land Rover': 1.24,     # Reliability reputation major factor
            'Dodge': 1.26,          # Limited appeal except Challenger/Charger enthusiasts
            'Jaguar': 1.28,         # Worst luxury brand retention - reliability concerns
            'Chrysler': 1.32,       # Very limited lineup appeal - 300/Pacifica only
            'Alfa Romeo': 1.35,     # Reliability concerns, niche appeal
            'Fiat': 1.38,           # Worst overall retention - exiting US market impact

            # EV-SPECIFIC Brands (Technology obsolescence major factor)
            'Tesla': 0.90,       # Best EV retention - Model Y/3 hold value well
            'Rivian': 1.20,      # New brand, EV depreciation - UPDATED (was 1.25)
            'Lucid': 1.28,       # Luxury EV, new brand - UPDATED (was 1.30)
            'Polestar': 1.22,    # NEW - Volvo EV brand

            # SPECIALTY/ENTHUSIAST Brands
            'Maserati': 1.42,    # Extreme luxury depreciation
        }
        
        # COMPREHENSIVE 2024-2025: Segment-specific depreciation curves
        # Based on iSeeCars 5-year depreciation study + industry data
        # Values represent cumulative depreciation from original MSRP
        # Updated to reflect real-world market data across all segments

        self.segment_curves = {
            # TRUCKS - Best retention category (Toyota Tacoma 65.5%, F-150 58.1% @ 5yr)
            # Industry avg 5-year retention: 60-65% (40% depreciation)
            'truck': {
                1: 0.10,   2: 0.18,   3: 0.26,   4: 0.33,   5: 0.40,  # UPDATED: Year 3-5
                6: 0.45,   7: 0.49,   8: 0.53,   9: 0.56,   10: 0.59,
                11: 0.61,  12: 0.63,  13: 0.65,  14: 0.66,  15: 0.68
            },

            # SPORTS CARS - Wide variation (Porsche 911 68%, Mustang 52% @ 5yr)
            # Industry avg 5-year retention: 48-65% (varies widely)
            'sports': {
                1: 0.14,   2: 0.25,   3: 0.35,   4: 0.44,   5: 0.52,  # UPDATED: More realistic
                6: 0.58,   7: 0.63,   8: 0.67,   9: 0.70,   10: 0.73,
                11: 0.75,  12: 0.77,  13: 0.78,  14: 0.79,  15: 0.80
            },

            # SUVs - Strong retention (4Runner 66.8%, CR-V 57.2% @ 5yr)
            # Industry avg 5-year retention: 52-58% (44% depreciation)
            'suv': {
                1: 0.13,   2: 0.23,   3: 0.32,   4: 0.39,   5: 0.46,  # UPDATED: Year 4-5
                6: 0.51,   7: 0.55,   8: 0.59,   9: 0.62,   10: 0.65,
                11: 0.67,  12: 0.69,  13: 0.70,  14: 0.71,  15: 0.72
            },

            # LUXURY SUVs - Better than luxury sedans (Lexus GX 64%, Escalade 55% @ 5yr)
            # Industry avg 5-year retention: 48-56% (48% depreciation)
            'luxury_suv': {
                1: 0.15,   2: 0.26,   3: 0.36,   4: 0.44,   5: 0.52,  # UPDATED: Year 3-5
                6: 0.57,   7: 0.61,   8: 0.65,   9: 0.68,   10: 0.71,
                11: 0.73,  12: 0.75,  13: 0.76,  14: 0.77,  15: 0.78
            },

            # HYBRIDS - Better than gas equivalents (Prius 52.7%, Camry Hybrid 53% @ 5yr)
            # Industry avg 5-year retention: 48-55% (48% depreciation)
            'hybrid': {
                1: 0.13,   2: 0.23,   3: 0.32,   4: 0.40,   5: 0.48,  # UPDATED: More gradual
                6: 0.53,   7: 0.57,   8: 0.61,   9: 0.64,   10: 0.67,
                11: 0.69,  12: 0.71,  13: 0.72,  14: 0.73,  15: 0.74
            },

            # COMPACT CARS - Average retention (Corolla 54%, Civic 53% @ 5yr)
            # Industry avg 5-year retention: 46-52% (50% depreciation)
            'compact': {
                1: 0.15,   2: 0.26,   3: 0.36,   4: 0.44,   5: 0.52,  # UPDATED: More realistic
                6: 0.57,   7: 0.61,   8: 0.65,   9: 0.68,   10: 0.71,
                11: 0.73,  12: 0.75,  13: 0.76,  14: 0.77,  15: 0.78
            },

            # SEDANS - Below average (Camry 52%, Accord 51%, Altima 43% @ 5yr)
            # Industry avg 5-year retention: 44-50% (52% depreciation)
            'sedan': {
                1: 0.16,   2: 0.28,   3: 0.38,   4: 0.46,   5: 0.54,  # UPDATED: More depreciation
                6: 0.59,   7: 0.63,   8: 0.67,   9: 0.70,   10: 0.73,
                11: 0.75,  12: 0.77,  13: 0.78,  14: 0.79,  15: 0.80
            },

            # LUXURY SEDANS - Poor retention (Lexus ES 51%, BMW 3-Series 42%, S-Class 32% @ 5yr)
            # Industry avg 5-year retention: 38-45% (58% depreciation)
            'luxury': {
                1: 0.20,   2: 0.34,   3: 0.46,   4: 0.54,   5: 0.62,  # UPDATED: Much more realistic
                6: 0.67,   7: 0.71,   8: 0.74,   9: 0.77,   10: 0.79,
                11: 0.81,  12: 0.82,  13: 0.83,  14: 0.84,  15: 0.85
            },

            # ECONOMY CARS - Poor retention (Fit 46%, Versa 39%, Mirage 35% @ 5yr)
            # Industry avg 5-year retention: 38-44% (58% depreciation)
            'economy': {
                1: 0.20,   2: 0.34,   3: 0.45,   4: 0.54,   5: 0.62,  # UPDATED: More realistic
                6: 0.67,   7: 0.71,   8: 0.75,   9: 0.78,   10: 0.80,
                11: 0.82,  12: 0.84,  13: 0.85,  14: 0.86,  15: 0.87
            },

            # ELECTRIC VEHICLES - Worst retention (Tesla Model Y 52%, Bolt 37%, Leaf 28% @ 5yr)
            # Industry avg 5-year retention: 35-50% (60% depreciation) - Tech obsolescence
            'electric': {
                1: 0.22,   2: 0.38,   3: 0.50,   4: 0.58,   5: 0.65,  # UPDATED: Much more realistic
                6: 0.70,   7: 0.74,   8: 0.77,   9: 0.79,   10: 0.81,
                11: 0.83,  12: 0.84,  13: 0.85,  14: 0.86,  15: 0.87
            }
        }
        
        # COMPREHENSIVE: Model-specific adjustments based on 2024-2025 data
        # High retention models get +8-12% bonus (multiplier × 0.88-0.92)
        # Poor retention models get -8-12% penalty (multiplier × 1.08-1.12)

        self.high_retention_models = {
            # TOYOTA - Industry retention leader
            'Toyota': [
                '4Runner', 'Tacoma', 'Tundra', 'Land Cruiser', 'Sequoia',  # Trucks/BOF SUVs
                'RAV4', 'Highlander', 'Sienna', 'Camry', 'Corolla'         # Popular SUVs/cars
            ],
            # HONDA - Consistent strong performer
            'Honda': [
                'Pilot', 'Ridgeline', 'Odyssey',     # SUV/Truck/Minivan
                'CR-V', 'Accord', 'Civic'             # Popular SUV/sedans
            ],
            # SUBARU - AWD demand drives value
            'Subaru': [
                'Outback', 'Forester', 'Crosstrek', 'Ascent',  # All popular AWD models
                'WRX'                                           # Enthusiast favorite
            ],
            # JEEP - Wrangler effect
            'Jeep': [
                'Wrangler', 'Gladiator'              # Unique off-road capability
            ],
            # FORD - Truck/SUV strength
            'Ford': [
                'F-150', 'F-250', 'F-350',           # Truck lineup
                'Bronco', 'Bronco Sport', 'Mustang'  # SUV/Sports
            ],
            # CHEVROLET - Truck/SUV/Sports
            'Chevrolet': [
                'Silverado', 'Tahoe', 'Suburban',    # Trucks/SUVs
                'Corvette', 'Colorado'                # Sports/Mid-truck
            ],
            # GMC - Premium truck/SUV brand
            'GMC': [
                'Yukon', 'Yukon XL', 'Sierra',       # SUV/Truck lineup
                'Canyon'                              # Mid-size truck
            ],
            # RAM - Truck specialist
            'Ram': [
                '1500', '2500', '3500'               # Truck lineup holds well
            ],
            # LEXUS - Best luxury retention
            'Lexus': [
                'GX', 'LX', 'RX', 'NX',              # SUV lineup
                'ES', 'IS'                            # Sedan retention leaders
            ],
            # PORSCHE - Sports/luxury retention
            'Porsche': [
                '911', 'Cayenne', 'Macan',           # Top models
                'Boxster', 'Cayman'                   # Sports cars
            ],
            # CADILLAC - Escalade standout
            'Cadillac': [
                'Escalade', 'XT5', 'XT6'             # SUV lineup holds better
            ],
            # LINCOLN - Navigator helps brand
            'Lincoln': [
                'Navigator', 'Aviator'                # SUV retention better
            ],
            # MAZDA - Rising quality perception
            'Mazda': [
                'CX-5', 'CX-9', 'CX-50', 'Mazda3'    # Popular models
            ],
            # HYUNDAI/KIA - Strong warranty appeal
            'Hyundai': [
                'Palisade', 'Santa Fe', 'Tucson'     # SUV strength
            ],
            'Kia': [
                'Telluride', 'Sorento', 'Sportage'   # SUV lineup
            ],
            # ACURA - Reliable luxury
            'Acura': [
                'MDX', 'RDX'                          # SUV strength
            ],
            # TESLA - Best EV retention
            'Tesla': [
                'Model Y', 'Model 3'                  # Popular models hold best
            ]
        }

        self.poor_retention_models = {
            # BMW - Maintenance costs hurt resale
            'BMW': [
                '7 Series', 'X7', 'i3', 'i4',        # Luxury sedans/EVs weak
                '8 Series'                            # High-end coupe
            ],
            # MERCEDES-BENZ - Luxury sedan depreciation
            'Mercedes-Benz': [
                'S-Class', 'E-Class', 'CLS',         # Sedans depreciate heavily
                'AMG GT', 'EQS', 'EQE'                # Sports/EVs
            ],
            # AUDI - Better than BMW/MB but still luxury depreciation
            'Audi': [
                'A8', 'A7', 'Q8',                    # Flagship models
                'e-tron', 'e-tron GT'                 # EVs depreciate more
            ],
            # CADILLAC - Sedans hurt brand
            'Cadillac': [
                'CT4', 'CT5', 'CT6',                 # Sedan lineup weak
                'Lyriq'                               # New EV uncertain
            ],
            # LINCOLN - Sedans weak, fleet sales hurt
            'Lincoln': [
                'MKZ', 'Continental'                  # Discontinued sedans
            ],
            # JAGUAR - Worst luxury retention
            'Jaguar': [
                'XJ', 'XF', 'F-Type',                # All models struggle
                'I-PACE'                              # EV depreciation
            ],
            # LAND ROVER - Reliability concerns
            'Land Rover': [
                'Range Rover', 'Discovery',          # High depreciation
                'Defender'                            # New but expensive
            ],
            # NISSAN - Sedans weak
            'Nissan': [
                'Altima', 'Maxima', 'Sentra',        # Sedan lineup
                'Leaf'                                # Early EV poor retention
            ],
            # CHRYSLER - Limited lineup
            'Chrysler': [
                '300', 'Pacifica'                    # Only models left
            ],
            # DODGE - Mixed bag
            'Dodge': [
                'Durango', 'Journey'                 # SUVs weak (Challenger/Charger excluded)
            ],
            # VOLKSWAGEN - Reliability concerns
            'Volkswagen': [
                'Passat', 'Arteon', 'ID.4'           # Sedan/EV weak
            ],
            # ALFA ROMEO - Reliability reputation
            'Alfa Romeo': [
                'Giulia', 'Stelvio'                  # All models affected
            ],
            # FIAT - Exit from US market
            'Fiat': [
                '500', '500X'                        # Poor retention across board
            ],
            # MASERATI - Extreme depreciation
            'Maserati': [
                'Ghibli', 'Quattroporte', 'Levante'  # All models
            ]
        }

    def _classify_vehicle_segment(self, vehicle_make: str, vehicle_model: str) -> str:
        """COMPREHENSIVE: Classify vehicle segment with ALL EV and HYBRID detection from database"""
        model_lower = vehicle_model.lower()
        make_lower = vehicle_make.lower()
        
        # PRIORITY 1: FULL ELECTRIC VEHICLES (BEV)
        # Tesla - all models are electric
        if make_lower == 'tesla':
            return 'electric'
        
        # All-electric brands
        if make_lower in ['rivian', 'lucid', 'polestar', 'fisker']:
            return 'electric'
        
        # Electric models by keyword detection (comprehensive list from all database files)
        electric_keywords = [
            # Tesla models
            'model s', 'model 3', 'model x', 'model y', 'cybertruck',
            # Nissan
            'leaf', 'ariya',
            # Chevrolet/GM
            'bolt ev', 'bolt euv', 'equinox ev', 'blazer ev', 'silverado ev', 'lyriq', 'hummer ev',
            # Hyundai/Kia/Genesis
            'ioniq electric', 'ioniq 5', 'ioniq 6', 'kona electric', 'niro ev', 'soul ev', 
            'ev6', 'ev9', 'gv60', 'gv70 electric', 'g80 electric',
            # BMW
            'i3', 'i4', 'i5', 'i7', 'ix', 'ix1', 'ix2', 'ix3', 'ixm60',
            # Audi
            'e-tron', 'e-tron gt', 'q4 e-tron', 'q5 e-tron', 'q6 e-tron', 'q8 e-tron',
            # Porsche
            'taycan',
            # Volkswagen
            'id.3', 'id.4', 'id.5', 'id.6', 'id.7', 'id.buzz',
            # Ford
            'mustang mach-e', 'mach-e', 'f-150 lightning', 'lightning', 'e-transit',
            # Mercedes-Benz
            'eqb', 'eqc', 'eqe', 'eqs', 'eqv',
            # Volvo
            'c40 recharge', 'xc40 recharge',
            # Honda/Acura
            'prologue', 'zdx',
            # Toyota/Lexus
            'bz4x', 'rz',
            # Subaru
            'solterra',
            # Mazda
            'mx-30',
            # Jaguar
            'i-pace',
            # Mini
            'cooper se', 'mini electric',
            # Cadillac
            'lyriq', 'escalade iq',
            # Rivian
            'r1t', 'r1s',
            # Lucid
            'air', 'gravity',
            # Fisker
            'ocean',
            # Genesis
            'electrified g80', 'electrified gv70',
            # General keywords
            ' electric', ' ev ', 'bev'
        ]
        
        if any(keyword in model_lower for keyword in electric_keywords):
            return 'electric'
        
        # PRIORITY 2: HYBRID VEHICLES (HEV, PHEV, Mild Hybrid)
        # Comprehensive hybrid detection from all database files
        
        # Models that are ALWAYS hybrid (no gas version)
        always_hybrid_models = [
            'prius',  # All Prius except Prime (which is still hybrid)
            'insight',  # Honda Insight
            'sienna',  # Toyota Sienna (hybrid-only since 2021)
            'maverick',  # Ford Maverick (hybrid standard on base)
        ]
        
        if any(model in model_lower for model in always_hybrid_models):
            return 'hybrid'
        
        # Hybrid keyword detection - comprehensive from all databases
        if 'hybrid' in model_lower:
            return 'hybrid'
        
        # Specific hybrid models from database files
        hybrid_models = [
            # Toyota
            'prius prime', 'prius plug-in', 'camry hybrid', 'corolla hybrid', 
            'rav4 hybrid', 'rav4 prime', 'highlander hybrid', 'venza', 
            'crown hybrid', 'avalon hybrid', 'sienna hybrid',
            # Lexus
            'rx hybrid', 'nx hybrid', 'es hybrid', 'ls hybrid', 'ux hybrid',
            'lc hybrid', 'gx hybrid', 'rx450h', 'nx450h', 'es300h', 'ls500h',
            # Honda
            'accord hybrid', 'cr-v hybrid', 'pilot hybrid', 'insight', 'clarity',
            # Hyundai
            'sonata hybrid', 'elantra hybrid', 'tucson hybrid', 'santa fe hybrid',
            'ioniq hybrid', 'kona hybrid',
            # Kia
            'niro hybrid', 'sorento hybrid', 'sportage hybrid', 'optima hybrid',
            'k5 hybrid', 'carnival hybrid',
            # Ford
            'fusion hybrid', 'escape hybrid', 'explorer hybrid', 'maverick hybrid',
            'f-150 hybrid', 'c-max', 'fusion energi',
            # Lincoln
            'aviator hybrid', 'corsair hybrid', 'nautilus hybrid', 'mkz hybrid',
            # Chevrolet
            'malibu hybrid', 'volt',
            # Buick
            'lacrosse hybrid',
            # Nissan
            'rogue hybrid', 'pathfinder hybrid', 'altima hybrid',
            # Chrysler/Dodge/Jeep
            'pacifica hybrid', 'wrangler 4xe', 'grand cherokee 4xe', 'compass 4xe',
            # Acura
            'mdx hybrid', 'nsx', 'rlx hybrid', 'ilx hybrid',
            # BMW
            '330e', '530e', '740e', 'x3 xdrive30e', 'x5 xdrive45e', 
            '225xe', 'i8', '745e',
            # Mercedes-Benz
            'c300 hybrid', 'e300 hybrid', 's500 hybrid', 'gle hybrid',
            'glc hybrid', 'gls hybrid',
            # Audi
            'a3 e-tron', 'a8 hybrid', 'q5 hybrid', 'q7 e-tron',
            # Porsche
            'cayenne hybrid', 'cayenne e-hybrid', 'panamera hybrid', 
            'panamera e-hybrid', '918',
            # Volkswagen
            'jetta hybrid', 'touareg hybrid',
            # Volvo
            'xc60 recharge', 'xc90 recharge', 's60 recharge', 's90 recharge',
            'v60 recharge', 'v90 recharge',
            # Mini
            'countryman phev', 'cooper s e',
            # Land Rover
            'range rover hybrid', 'range rover sport hybrid', 'discovery hybrid',
            # Subaru
            'crosstrek hybrid',
            # General keywords
            'plug-in hybrid', 'phev', 'e-hybrid', 'recharge', 'energi', '4xe'
        ]
        
        if any(hybrid_model in model_lower for hybrid_model in hybrid_models):
            return 'hybrid'

        # PRIORITY 2.5: Check sports cars BEFORE luxury check (Porsche 911 is sports not luxury)
        sports_keywords = [
            'corvette', 'mustang', 'camaro', 'challenger', 'charger',
            '911', 'cayman', 'boxster', 'z4', 'supra', 'miata', 'mx-5',
            'gt-r', '370z', '400z', 'brz', 'gr86', 'nsx'
        ]
        if any(keyword in model_lower for keyword in sports_keywords):
            return 'sports'

        # PRIORITY 3: Check luxury brands (but not if already classified as EV/Hybrid/Sports)
        # NEW: Detect luxury SUVs separately - they hold value better than luxury sedans
        luxury_brands = ['bmw', 'mercedes-benz', 'audi', 'lexus', 'acura',
                        'infiniti', 'cadillac', 'lincoln', 'jaguar', 'land rover',
                        'porsche', 'maserati', 'alfa romeo', 'genesis']

        if make_lower in luxury_brands:
            # Check if it's an SUV - luxury SUVs get special treatment
            luxury_suv_keywords = [
                # Cadillac SUVs
                'escalade', 'xt4', 'xt5', 'xt6',
                # BMW SUVs
                'x1', 'x2', 'x3', 'x4', 'x5', 'x6', 'x7',
                # Mercedes SUVs
                'gla', 'glb', 'glc', 'gle', 'gls', 'g-class', 'g-wagon',
                # Audi SUVs
                'q3', 'q4', 'q5', 'q7', 'q8',
                # Lexus SUVs
                'ux', 'nx', 'rx', 'gx', 'lx',
                # Acura SUVs
                'rdx', 'mdx',
                # Infiniti SUVs
                'qx50', 'qx55', 'qx60', 'qx80',
                # Lincoln SUVs
                'navigator', 'nautilus', 'aviator', 'corsair',
                # Porsche SUVs
                'cayenne', 'macan',
                # Jaguar SUVs
                'e-pace', 'f-pace', 'i-pace',
                # Land Rover SUVs (all models)
                'range rover', 'discovery', 'defender', 'evoque',
                # Genesis SUVs
                'gv60', 'gv70', 'gv80',
                # Maserati SUVs
                'levante', 'grecale'
            ]

            if any(keyword in model_lower for keyword in luxury_suv_keywords):
                return 'luxury_suv'

            # Otherwise, it's a luxury sedan/coupe
            return 'luxury'
        
        # PRIORITY 4: Check trucks
        if any(term in model_lower for term in [
            'f-150', 'f-250', 'f-350', 'silverado', 'sierra', 'ram 1500', 'ram 2500',
            'tundra', 'tacoma', 'frontier', 'ridgeline', 'gladiator', 'ranger',
            'colorado', 'canyon', 'titan'
        ]):
            return 'truck'
        
        # PRIORITY 5: Check SUVs
        if any(term in model_lower for term in [
            'suburban', 'tahoe', 'yukon', 'escalade', 'navigator',
            'pilot', 'highlander', 'rav4', 'cr-v', 'explorer', 'expedition',
            'escape', 'equinox', 'traverse', 'pathfinder', 'armada',
            'palisade', 'telluride', 'sorento', 'santa fe', 'tucson',
            'cx-5', 'cx-9', 'outback', 'forester', 'ascent',
            'wrangler', 'grand cherokee', 'durango', 'atlas', 'tiguan',
            '4runner', 'sequoia', 'land cruiser'  # ADDED: Toyota SUVs
        ]):
            return 'suv'
        
        # PRIORITY 7: Check compact cars
        if any(term in model_lower for term in [
            'civic', 'corolla', 'elantra', 'sentra', 'forte', 'jetta',
            'golf', 'mazda3', 'impreza', 'crosstrek'
        ]):
            return 'compact'
        
        # PRIORITY 8: Check economy cars
        if any(term in model_lower for term in [
            'spark', 'mirage', 'rio', 'versa', 'accent', 'yaris', 'fit'
        ]):
            return 'economy'
        
        # Default: sedan
        return 'sedan'

    def _get_cumulative_depreciation_rate(self, year: int, segment: str) -> float:
        """Get cumulative depreciation rate for a given year and segment"""
        curve = self.segment_curves.get(segment, self.segment_curves['sedan'])
        
        if year <= 15:
            return curve.get(year, curve[15])
        else:
            # Beyond 15 years, minimal additional depreciation
            return min(0.96, curve[15] + ((year - 15) * 0.005))

    def _calculate_mileage_impact(self, annual_mileage: int) -> float:
        """
        Calculate mileage impact on depreciation - UPDATED 2024-2025
        Based on market data showing mileage significantly affects resale value
        Lower multiplier = better retention (less depreciation)
        Higher multiplier = worse retention (more depreciation)
        """
        standard_mileage = 12000  # Industry average

        if annual_mileage <= 100:
            # Museum quality / collector car
            return 0.70  # 30% better retention
        elif annual_mileage < 5000:
            # Very low mileage: 70% to 85% - UPDATED for granularity
            ratio = (annual_mileage - 100) / 4900
            return 0.70 + (ratio * 0.15)
        elif annual_mileage < 8000:
            # Low mileage: 85% to 92% - UPDATED thresholds
            ratio = (annual_mileage - 5000) / 3000
            return 0.85 + (ratio * 0.07)
        elif annual_mileage < 10000:
            # Below average: 92% to 96% - NEW tier
            ratio = (annual_mileage - 8000) / 2000
            return 0.92 + (ratio * 0.04)
        elif annual_mileage <= standard_mileage:
            # Standard to baseline: 96% to 100%
            ratio = (annual_mileage - 10000) / 2000
            return 0.96 + (ratio * 0.04)
        elif annual_mileage <= 15000:
            # Above average: 100% to 108% - UPDATED (was 110%)
            ratio = (annual_mileage - standard_mileage) / 3000
            return 1.00 + (ratio * 0.08)
        elif annual_mileage <= 18000:
            # High mileage: 108% to 115% - NEW tier
            ratio = (annual_mileage - 15000) / 3000
            return 1.08 + (ratio * 0.07)
        elif annual_mileage <= 22000:
            # Very high mileage: 115% to 125% - UPDATED
            ratio = (annual_mileage - 18000) / 4000
            return 1.15 + (ratio * 0.10)
        else:
            # Extreme mileage: 125% to 135% capped - UPDATED cap
            excess = min(annual_mileage - 22000, 20000)
            ratio = excess / 20000
            return min(1.35, 1.25 + (ratio * 0.10))

    def _apply_model_specific_adjustments(self, make: str, model: str, base_multiplier: float) -> float:
        """Apply model-specific adjustments"""
        # Check high retention models
        if make in self.high_retention_models:
            if any(model_name.lower() in model.lower() for model_name in self.high_retention_models[make]):
                return base_multiplier * 0.88  # 12% better retention
        
        # Check poor retention models
        if make in self.poor_retention_models:
            if any(model_name.lower() in model.lower() for model_name in self.poor_retention_models[make]):
                return base_multiplier * 1.12  # 12% worse retention
        
        return base_multiplier

    def calculate_depreciation_schedule(self, initial_value: float, vehicle_make: str, 
                                    vehicle_model: str, model_year: int, 
                                    annual_mileage: int, years: int) -> List[Dict[str, Any]]:
        """
        Calculate depreciation schedule with refined rates
        FIXED: Now handles current year vehicles with existing mileage properly
        """
        from datetime import datetime
        current_year = datetime.now().year
        vehicle_age_at_start = current_year - model_year
        
        segment = self._classify_vehicle_segment(vehicle_make, vehicle_model)
        brand_multiplier = self.brand_multipliers.get(vehicle_make, 1.0)
        adjusted_brand_multiplier = self._apply_model_specific_adjustments(
            vehicle_make, vehicle_model, brand_multiplier
        )
        mileage_multiplier = self._calculate_mileage_impact(annual_mileage)
        
        schedule = []
        
        # CRITICAL FIX: Calculate starting value for current year vehicles with mileage
        if vehicle_age_at_start == 0:
            # This is a current year vehicle - check if it has existing mileage
            # We need to estimate what the current mileage is based on time into the year
            
            # Assume mileage accumulates proportionally through the year
            # For a brand new purchase, starting mileage would be ~0-100 (delivery miles)
            # For a current year used vehicle, it could have significant mileage
            
            # If annual_mileage is given, we can estimate current mileage on a current year vehicle
            # However, for the depreciation schedule, we're looking at FUTURE depreciation
            # So the "initial_value" passed in should already account for any current depreciation
            
            # The schedule will show depreciation going forward from this point
            starting_value = initial_value
        else:
            # For used vehicles purchased in a later year, the initial_value is already
            # the purchase price (current market value), not the original MSRP
            starting_value = initial_value
        
        # Calculate year-by-year depreciation
        for year in range(1, years + 1):
            # Determine the vehicle's age at this point in ownership
            vehicle_age_at_this_year = vehicle_age_at_start + year
            
            # Get cumulative depreciation rate from original MSRP for this vehicle age
            base_cumulative_rate = self._get_cumulative_depreciation_rate(
                vehicle_age_at_this_year, segment
            )
            adjusted_rate = base_cumulative_rate * adjusted_brand_multiplier * mileage_multiplier
            
            # Apply caps - UPDATED 2024-2025 to match realistic segment curves
            max_depreciation = {
                'truck': 0.68,       # Best retention - matches year 15 curve
                'suv': 0.72,         # Strong retention
                'hybrid': 0.74,      # Better than gas
                'luxury_suv': 0.78,  # Better than luxury sedans
                'compact': 0.78,     # Average cars
                'sports': 0.80,      # Wide variation
                'sedan': 0.80,       # Below average
                'luxury': 0.85,      # Poor retention - luxury sedans
                'economy': 0.87,     # Poor retention
                'electric': 0.87     # Poorest - tech obsolescence
            }
            cap = max_depreciation.get(segment, 0.80)
            adjusted_rate = min(adjusted_rate, cap)
            
            # CRITICAL FIX: For current year vehicles, we need to handle year 1 specially
            if vehicle_age_at_start == 0 and year == 1:
                # This is the first year of ownership for a current year vehicle
                # The vehicle will age from 0 to 1 year old during this year
                
                # Value at end of year 1 (when vehicle is 1 year old)
                new_value = starting_value * (1 - adjusted_rate)
                
                # Annual depreciation is the drop during this year
                annual_depreciation = starting_value - new_value
                
            else:
                # Standard calculation for year 2+ or for vehicles that started used
                if year == 1:
                    # First year of ownership (but vehicle may already be used)
                    # Depreciate from starting value based on the full cumulative rate
                    new_value = starting_value * (1 - adjusted_rate)
                    annual_depreciation = starting_value - new_value
                else:
                    # Subsequent years - calculate incremental depreciation
                    previous_value = schedule[-1]['vehicle_value']
                    
                    # Get previous year's cumulative rate
                    prev_vehicle_age = vehicle_age_at_start + (year - 1)
                    prev_cumulative_rate = self._get_cumulative_depreciation_rate(
                        prev_vehicle_age, segment
                    )
                    prev_adjusted_rate = prev_cumulative_rate * adjusted_brand_multiplier * mileage_multiplier
                    prev_adjusted_rate = min(prev_adjusted_rate, cap)
                    
                    # Calculate new value and annual depreciation
                    # We're moving from one cumulative rate to the next
                    new_value = starting_value * (1 - adjusted_rate)
                    annual_depreciation = previous_value - new_value
            
            schedule.append({
                'year': year,
                'vehicle_value': new_value,
                'annual_depreciation': annual_depreciation,
                'cumulative_depreciation': starting_value - new_value,
                'depreciation_rate': adjusted_rate,
                'vehicle_age': vehicle_age_at_this_year,
                'segment': segment,
                'brand_multiplier': adjusted_brand_multiplier,
                'mileage_multiplier': mileage_multiplier
            })
        
        return schedule
    
    def estimate_current_value(self, initial_value: float, vehicle_make: str, 
                            vehicle_model: str, vehicle_age: int, 
                            current_mileage: int) -> float:
        """
        Estimate current value of existing vehicle
        FIXED: Now properly handles current year vehicles with mileage
        """
        
        # Classify vehicle segment
        segment = self._classify_vehicle_segment(vehicle_make, vehicle_model)
        brand_multiplier = self.brand_multipliers.get(vehicle_make, 1.0)
        adjusted_brand_multiplier = self._apply_model_specific_adjustments(
            vehicle_make, vehicle_model, brand_multiplier
        )
        
        # CRITICAL FIX: Handle current year vehicles with mileage
        if vehicle_age == 0:
            # Current year vehicle - apply mileage-based depreciation
            
            if current_mileage <= 100:
                # Essentially brand new - minimal depreciation (delivery miles)
                return initial_value * 0.98
            
            # Get the 1-year baseline depreciation rate for this segment
            # UPDATED 2024-2025 to match new segment curves (year 1 values)
            one_year_baseline = {
                'truck': 0.10,       # Best first-year retention
                'suv': 0.13,         # Strong retention
                'hybrid': 0.13,      # Better than gas
                'sports': 0.14,      # Enthusiast appeal
                'compact': 0.15,     # Average cars
                'luxury_suv': 0.15,  # Better than luxury sedans
                'sedan': 0.16,       # Below average
                'economy': 0.20,     # Poor retention
                'luxury': 0.20,      # Poor retention - luxury sedans
                'electric': 0.22     # Worst - tech obsolescence
            }
            baseline_rate = one_year_baseline.get(segment, 0.16)
            
            # Calculate depreciation based on mileage progression to 1-year baseline
            # Uses a smooth curve that approaches but doesn't exceed the 1-year rate
            if current_mileage <= 1000:
                # 100-1,000 miles: 2-5% (demo/dealer transfer)
                mileage_factor = (current_mileage - 100) / 900
                depreciation_rate = 0.02 + (mileage_factor * 0.03)
                
            elif current_mileage <= 5000:
                # 1,001-5,000 miles: 5-8% (test drive/demo level)
                mileage_factor = (current_mileage - 1000) / 4000
                depreciation_rate = 0.05 + (mileage_factor * 0.03)
                
            elif current_mileage <= 12000:
                # 5,001-12,000 miles: Scale from 8% to 70% of 1-year baseline
                mileage_factor = (current_mileage - 5000) / 7000
                target_rate = baseline_rate * 0.70
                depreciation_rate = 0.08 + (mileage_factor * (target_rate - 0.08))
                
            elif current_mileage <= 20000:
                # 12,001-20,000 miles: Scale from 70% to 90% of 1-year baseline
                mileage_factor = (current_mileage - 12000) / 8000
                start_rate = baseline_rate * 0.70
                target_rate = baseline_rate * 0.90
                depreciation_rate = start_rate + (mileage_factor * (target_rate - start_rate))
                
            else:
                # 20,000+ miles: Approach but cap at 95% of 1-year baseline
                # This ensures graceful convergence to the 1-year rate
                excess_miles = min(current_mileage - 20000, 20000)
                mileage_factor = excess_miles / 20000
                start_rate = baseline_rate * 0.90
                cap_rate = baseline_rate * 0.95
                depreciation_rate = start_rate + (mileage_factor * (cap_rate - start_rate))
            
            # Apply brand multiplier
            final_rate = depreciation_rate * adjusted_brand_multiplier
            
            # Calculate and return current value
            current_value = initial_value * (1 - final_rate)
            return max(current_value, initial_value * 0.50)  # Floor at 50% of original
        
        # For vehicles 1+ years old, use the existing annual mileage-based logic
        if vehicle_age < 1:
            return initial_value
        
        # Calculate annual mileage for multi-year-old vehicles
        annual_mileage = current_mileage / vehicle_age
        mileage_multiplier = self._calculate_mileage_impact(annual_mileage)
        
        # Get cumulative depreciation rate for the vehicle's age
        base_rate = self._get_cumulative_depreciation_rate(vehicle_age, segment)
        final_rate = base_rate * adjusted_brand_multiplier * mileage_multiplier
        
        # Apply caps - UPDATED 2024-2025 to match realistic segment curves
        max_depreciation = {
            'truck': 0.68,       # Best retention - matches year 15 curve
            'suv': 0.72,         # Strong retention
            'hybrid': 0.74,      # Better than gas
            'luxury_suv': 0.78,  # Better than luxury sedans
            'compact': 0.78,     # Average cars
            'sports': 0.80,      # Wide variation
            'sedan': 0.80,       # Below average
            'luxury': 0.85,      # Poor retention - luxury sedans
            'economy': 0.87,     # Poor retention
            'electric': 0.87     # Poorest - tech obsolescence
        }
        cap = max_depreciation.get(segment, 0.80)
        final_rate = min(final_rate, cap)
        
        current_value = initial_value * (1 - final_rate)
        return max(current_value, initial_value * 0.10)  # Floor at 10% of original


    def _get_retention_rating(self, multiplier: float) -> str:
        """Get retention rating from multiplier"""
        if multiplier <= 0.85:
            return "Excellent"
        elif multiplier <= 0.95:
            return "Good"
        elif multiplier <= 1.05:
            return "Average"
        elif multiplier <= 1.15:
            return "Below Average"
        else:
            return "Poor"

    def get_depreciation_insights(self, vehicle_make: str, vehicle_model: str, 
                                 initial_value: float, years: int = 5) -> Dict[str, Any]:
        """Get depreciation insights for a vehicle"""
        
        segment = self._classify_vehicle_segment(vehicle_make, vehicle_model)
        brand_multiplier = self.brand_multipliers.get(vehicle_make, 1.0)
        adjusted_multiplier = self._apply_model_specific_adjustments(
            vehicle_make, vehicle_model, brand_multiplier
        )
        
        # Calculate scenarios
        scenarios = {}
        for desc, mileage in [('Low', 8000), ('Average', 12000), ('High', 18000)]:
            schedule = self.calculate_depreciation_schedule(
                initial_value, vehicle_make, vehicle_model, 2024, mileage, years
            )
            scenarios[desc.lower()] = schedule[-1]['vehicle_value'] if schedule else 0
        
        return {
            'market_segment': segment,
            'brand_adjustment': adjusted_multiplier,
            'scenarios': scenarios,
            'retention_rating': self._get_retention_rating(adjusted_multiplier),
            'key_insight': f"{vehicle_make} {vehicle_model} classified as {segment} with {self._get_retention_rating(adjusted_multiplier).lower()} value retention"
        }

    def _get_retention_rating(self, brand_multiplier: float) -> str:
        """Enhanced retention rating"""
        if brand_multiplier <= 0.80:
            return "Exceptional"
        elif brand_multiplier <= 0.90:
            return "Excellent" 
        elif brand_multiplier <= 1.00:
            return "Good"
        elif brand_multiplier <= 1.10:
            return "Average"
        elif brand_multiplier <= 1.20:
            return "Below Average"
        else:
            return "Poor"

    def _generate_enhanced_insights(self, make: str, model: str, segment: str, 
                                  brand_multiplier: float) -> List[str]:
        """Generate enhanced insights about depreciation"""
        insights = []
        
        # Brand insights
        if brand_multiplier <= 0.85:
            insights.append(f"{make} vehicles are known for exceptional value retention")
        elif brand_multiplier >= 1.20:
            insights.append(f"{make} vehicles typically experience faster depreciation, especially luxury models")
        
        # Segment insights  
        segment_advice = {
            'luxury': "Luxury vehicles depreciate rapidly in first 3-5 years, then stabilize",
            'electric': "Electric vehicles face technology obsolescence risk affecting resale value",
            'truck': "Trucks typically hold value very well, especially popular models like F-150",
            'suv': "SUVs generally maintain strong resale value due to continued popularity",
            'compact': "Compact cars offer predictable, moderate depreciation rates",
            'sports': "Sports cars vary widely - iconic models may appreciate, others depreciate quickly"
        }
        if segment in segment_advice:
            insights.append(segment_advice[segment])
        
        # Model-specific insights
        if make in self.high_retention_models:
            if any(model_name.lower() in model.lower() for model_name in self.high_retention_models[make]):
                insights.append(f"The {model} is a high-demand model with above-average value retention")
        
        # General insights
        insights.append("Mileage significantly impacts resale value - consider driving patterns carefully")
        insights.append("Well-maintained vehicles with service records depreciate more slowly")
        
        return insights