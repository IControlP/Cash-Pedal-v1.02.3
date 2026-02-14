"""
Car Buying Checklist - Generates maintenance checklist based on vehicle info
Extracts car details from URLs or manual input and provides maintenance history checklist
"""

import re
from typing import Dict, Any, List, Optional, Tuple
import requests
from bs4 import BeautifulSoup
from maintenance.maintenance_utils import MaintenanceCalculator


class CarBuyingChecklist:
    """Generates car buying checklists with maintenance items based on mileage"""

    def __init__(self):
        self.maintenance_calculator = MaintenanceCalculator()

    def extract_car_info_from_url(self, url: str) -> Dict[str, Any]:
        """
        Extract car information from a URL (e.g., Craigslist, AutoTrader, CarGurus)
        Returns dict with make, model, year, mileage, trim, and other details
        """
        try:
            # Enhanced headers to appear more like a real browser
            headers = {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36',
                'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
                'Accept-Language': 'en-US,en;q=0.5',
                'Accept-Encoding': 'gzip, deflate, br',
                'DNT': '1',
                'Connection': 'keep-alive',
                'Upgrade-Insecure-Requests': '1',
                'Sec-Fetch-Dest': 'document',
                'Sec-Fetch-Mode': 'navigate',
                'Sec-Fetch-Site': 'none',
                'Cache-Control': 'max-age=0'
            }
            response = requests.get(url, headers=headers, timeout=15, allow_redirects=True)
            response.raise_for_status()

            soup = BeautifulSoup(response.content, 'html.parser')

            # Try to extract from title and meta tags first (usually more structured)
            title_text = ''
            title_tag = soup.find('title')
            if title_tag:
                title_text = title_tag.get_text().lower()

            # Get meta description
            meta_desc = ''
            meta_tag = soup.find('meta', attrs={'name': 'description'})
            if meta_tag and meta_tag.get('content'):
                meta_desc = meta_tag.get('content').lower()

            # Combine title, meta, and full text for extraction
            priority_text = title_text + ' ' + meta_desc
            text_content = soup.get_text().lower()
            full_text = priority_text + ' ' + text_content

            # Extract information using regex patterns
            # Try priority text first, fallback to full text
            make = self._extract_make(priority_text, soup) or self._extract_make(text_content, soup)
            model = self._extract_model(priority_text, soup) or self._extract_model(text_content, soup)
            year = self._extract_year(priority_text, soup) or self._extract_year(text_content, soup)
            mileage = self._extract_mileage(priority_text, soup) or self._extract_mileage(text_content, soup)
            trim = self._extract_trim(priority_text, soup) or self._extract_trim(text_content, soup)

            car_info = {
                'make': make,
                'model': model,
                'year': year,
                'mileage': mileage,
                'trim': trim,
                'url': url,
                'extraction_success': True,
                'debug_info': {
                    'title': title_text[:100] if title_text else 'None',
                    'meta_desc': meta_desc[:100] if meta_desc else 'None',
                    'found_make': bool(make),
                    'found_model': bool(model),
                    'found_year': bool(year),
                    'found_mileage': bool(mileage)
                }
            }

            return car_info

        except requests.exceptions.HTTPError as e:
            error_msg = f"HTTP Error {e.response.status_code}: "
            if e.response.status_code == 403:
                error_msg += "Access denied. The website may be blocking automated requests. Try copying the listing details manually."
            elif e.response.status_code == 404:
                error_msg += "Listing not found. The URL may be invalid or the listing has been removed."
            else:
                error_msg += "Unable to access the page."

            return {
                'make': None,
                'model': None,
                'year': None,
                'mileage': None,
                'trim': None,
                'url': url,
                'extraction_success': False,
                'error': error_msg
            }
        except requests.exceptions.Timeout:
            return {
                'make': None,
                'model': None,
                'year': None,
                'mileage': None,
                'trim': None,
                'url': url,
                'extraction_success': False,
                'error': "Request timed out. The website may be slow or unavailable."
            }
        except Exception as e:
            return {
                'make': None,
                'model': None,
                'year': None,
                'mileage': None,
                'trim': None,
                'url': url,
                'extraction_success': False,
                'error': f"Extraction failed: {str(e)}"
            }

    def _extract_year(self, text: str, soup: BeautifulSoup) -> Optional[int]:
        """Extract year from text"""
        # Look for 4-digit year between 1990 and current year + 1
        year_pattern = r'\b(19[9]\d|20[0-2]\d)\b'
        matches = re.findall(year_pattern, text)
        if matches:
            # Return the most common year found
            years = [int(y) for y in matches if 1990 <= int(y) <= 2027]
            if years:
                return max(set(years), key=years.count)
        return None

    def _extract_mileage(self, text: str, soup: BeautifulSoup) -> Optional[int]:
        """Extract mileage from text"""
        # Look for mileage patterns
        mileage_patterns = [
            r'(\d{1,3}(?:,\d{3})*)\s*(?:miles|mi|km)',
            r'mileage[:\s]+(\d{1,3}(?:,\d{3})*)',
            r'odometer[:\s]+(\d{1,3}(?:,\d{3})*)'
        ]

        for pattern in mileage_patterns:
            matches = re.findall(pattern, text, re.IGNORECASE)
            if matches:
                # Clean and convert to int
                mileage_str = matches[0].replace(',', '')
                mileage = int(mileage_str)
                # Sanity check: reasonable mileage range
                if 0 <= mileage <= 500000:
                    return mileage
        return None

    def _extract_make(self, text: str, soup: BeautifulSoup) -> Optional[str]:
        """Extract car make from text"""
        common_makes = [
            'Toyota', 'Honda', 'Ford', 'Chevrolet', 'Nissan', 'BMW', 'Mercedes-Benz',
            'Audi', 'Volkswagen', 'Mazda', 'Subaru', 'Hyundai', 'Kia', 'Lexus',
            'Acura', 'Infiniti', 'Cadillac', 'Buick', 'GMC', 'Dodge', 'Chrysler',
            'Jeep', 'Ram', 'Tesla', 'Volvo', 'Porsche', 'Mitsubishi', 'Genesis',
            'Rivian', 'Lucid'
        ]

        for make in common_makes:
            if make.lower() in text:
                return make
        return None

    def _extract_model(self, text: str, soup: BeautifulSoup) -> Optional[str]:
        """Extract car model from text"""
        # Make-specific model lists
        make_models = {
            'Toyota': ['Camry', 'Corolla', 'RAV4', 'Highlander', 'Tacoma', 'Tundra', '4Runner',
                      'Sienna', 'Prius', 'Avalon', 'C-HR', 'Venza', 'Sequoia', 'Land Cruiser',
                      'GR86', 'Supra', 'Mirai', 'Crown', 'Grand Highlander', 'bZ4X'],
            'Honda': ['Civic', 'Accord', 'CR-V', 'Pilot', 'Odyssey', 'Ridgeline', 'HR-V',
                     'Passport', 'Insight', 'Fit', 'Clarity'],
            'Ford': ['F-150', 'F-250', 'F-350', 'Mustang', 'Explorer', 'Escape', 'Edge', 'Expedition',
                    'Bronco', 'Ranger', 'Maverick', 'EcoSport', 'Flex', 'Transit', 'Super Duty'],
            'Chevrolet': ['Silverado', 'Equinox', 'Tahoe', 'Suburban', 'Traverse', 'Malibu', 'Camaro',
                         'Blazer', 'Trax', 'Colorado', 'Corvette', 'Bolt', 'Trailblazer'],
            'Nissan': ['Altima', 'Sentra', 'Rogue', 'Pathfinder', 'Murano', 'Maxima', 'Frontier',
                      'Titan', 'Kicks', 'Armada', 'Versa', 'Leaf', 'Ariya', 'Z'],
            'BMW': ['3 Series', '5 Series', '7 Series', 'X3', 'X5', 'X7', 'X1', 'X2', 'X4', 'X6',
                   'M3', 'M5', 'i4', 'iX', 'Z4', '2 Series', '4 Series', '8 Series'],
            'Mercedes-Benz': ['C-Class', 'E-Class', 'S-Class', 'GLA', 'GLB', 'GLC', 'GLE', 'GLS',
                             'A-Class', 'CLA', 'CLS', 'G-Class', 'AMG GT', 'EQS', 'EQE', 'EQB'],
            'Audi': ['A3', 'A4', 'A5', 'A6', 'A7', 'A8', 'Q3', 'Q5', 'Q7', 'Q8', 'e-tron', 'TT', 'R8'],
            'Hyundai': ['Elantra', 'Sonata', 'Tucson', 'Santa Fe', 'Palisade', 'Kona', 'Venue',
                       'Ioniq', 'Santa Cruz', 'Accent'],
            'Kia': ['Forte', 'K5', 'Optima', 'Sportage', 'Sorento', 'Telluride', 'Soul', 'Seltos',
                   'Carnival', 'Stinger', 'EV6', 'Niro'],
            'Mazda': ['Mazda3', 'Mazda6', 'CX-3', 'CX-5', 'CX-9', 'CX-30', 'CX-50', 'CX-90', 'MX-5 Miata'],
            'Subaru': ['Outback', 'Forester', 'Crosstrek', 'Impreza', 'Legacy', 'Ascent', 'WRX', 'BRZ', 'Solterra'],
            'Volkswagen': ['Jetta', 'Passat', 'Golf', 'Tiguan', 'Atlas', 'Taos', 'ID.4', 'Arteon', 'GTI'],
            'Lexus': ['ES', 'IS', 'LS', 'GS', 'RX', 'NX', 'GX', 'LX', 'UX', 'LC', 'RC'],
            'Tesla': ['Model 3', 'Model S', 'Model X', 'Model Y', 'Cybertruck'],
            'Jeep': ['Wrangler', 'Grand Cherokee', 'Cherokee', 'Compass', 'Renegade', 'Gladiator', 'Wagoneer', 'Grand Wagoneer'],
            'Ram': ['1500', '2500', '3500', 'ProMaster'],
            'GMC': ['Sierra', 'Canyon', 'Terrain', 'Acadia', 'Yukon', 'Hummer EV'],
            'Cadillac': ['Escalade', 'XT4', 'XT5', 'XT6', 'CT4', 'CT5', 'Lyriq'],
            'Dodge': ['Charger', 'Challenger', 'Durango', 'Hornet'],
            'Acura': ['Integra', 'TLX', 'MDX', 'RDX', 'NSX'],
            'Infiniti': ['Q50', 'Q60', 'QX50', 'QX55', 'QX60', 'QX80'],
            'Volvo': ['S60', 'S90', 'V60', 'V90', 'XC40', 'XC60', 'XC90', 'C40'],
            'Porsche': ['911', 'Cayenne', 'Macan', 'Panamera', 'Taycan', 'Boxster', 'Cayman'],
            'Genesis': ['G70', 'G80', 'G90', 'GV70', 'GV80'],
            'Mitsubishi': ['Outlander', 'Eclipse Cross', 'Mirage', 'Outlander Sport'],
        }

        # First, try to find the make in the text
        detected_make = None
        for make in make_models.keys():
            if make.lower() in text:
                detected_make = make
                break

        # If no make detected, try all models from all makes
        if not detected_make:
            all_models = []
            for models in make_models.values():
                all_models.extend(models)

            for model in all_models:
                # Use word boundary to avoid partial matches
                pattern = r'\b' + re.escape(model.lower()) + r'\b'
                if re.search(pattern, text):
                    return model
        else:
            # Search for models specific to the detected make
            for model in make_models.get(detected_make, []):
                # Use word boundary to avoid partial matches
                pattern = r'\b' + re.escape(model.lower()) + r'\b'
                if re.search(pattern, text):
                    return model

        return None

    def _extract_trim(self, text: str, soup: BeautifulSoup) -> Optional[str]:
        """Extract trim level from text"""
        # Priority 1: Actual trim levels (search these first)
        trim_levels = [
            'Platinum', 'Limited', 'Premium', 'Luxury', 'Sport', 'Touring', 'Base',
            'SE', 'SEL', 'SXT', 'SRT', 'EX', 'EX-L', 'LX', 'LE', 'XLE', 'XSE',
            'SR', 'SR5', 'TRD Pro', 'TRD Sport', 'TRD Off-Road', 'Nightshade',
            'RS', 'SS', 'LT', 'LTZ', 'LS', 'Premier', 'High Country',
            'GT', 'GT-Line', 'SX', 'S', 'Prestige', 'Technik', 'Komfort',
            'M Sport', 'xDrive', 'sDrive', 'AMG', 'Hybrid', 'Plug-in Hybrid'
        ]

        # Priority 2: Drivetrain/transmission (only if no trim found)
        drivetrain_options = [
            'FWD', 'AWD', '4WD', 'RWD', '2WD', '4x4', '4x2',
            'CVT', 'Automatic', 'Manual'
        ]

        # Sort by length (longest first) to match multi-word trims first
        trim_levels.sort(key=len, reverse=True)
        drivetrain_options.sort(key=len, reverse=True)

        # Try to find actual trim levels first
        for trim in trim_levels:
            # Use word boundary for better matching
            pattern = r'\b' + re.escape(trim) + r'\b'
            if re.search(pattern, text, re.IGNORECASE):
                return trim

        # If no trim found, check drivetrain (lower priority)
        for option in drivetrain_options:
            pattern = r'\b' + re.escape(option) + r'\b'
            if re.search(pattern, text, re.IGNORECASE):
                return option

        return None

    def generate_maintenance_checklist(self, make: str, model: str, year: int,
                                      mileage: int, trim: str = '') -> Dict[str, Any]:
        """
        Generate a comprehensive maintenance checklist for a car purchase
        Returns what maintenance SHOULD have been done based on mileage
        """

        current_year = 2026
        vehicle_age = current_year - year

        # Get maintenance schedule from start to current mileage
        schedule = self.maintenance_calculator.get_maintenance_schedule(
            annual_mileage=12000,  # Average
            years=max(1, vehicle_age),
            starting_mileage=0,
            vehicle_make=make,
            vehicle_model=model
        )

        # Compile all services that should have been done by now
        services_due = []
        total_expected_cost = 0

        for year_data in schedule:
            if year_data['total_mileage'] <= mileage:
                for service in year_data['services']:
                    services_due.append({
                        'service_name': service['service'],
                        'due_at_mileage': service['due_at_mileage'],
                        'cost': service['total_cost'],
                        'interval': service['interval'],
                        'category': self._categorize_service(service['service'])
                    })
                    total_expected_cost += service['total_cost']

        # Get upcoming services (next 12k miles)
        upcoming_services = self._get_upcoming_services(make, model, mileage)

        # Get recent services (prior 12 months / ~12k miles)
        recent_services = self._get_recent_services(make, model, mileage)

        # Generate insights
        insights = self._generate_buying_insights(
            make, model, year, mileage, vehicle_age, services_due
        )

        # Categorize services
        categorized_services = self._categorize_services_list(services_due)

        return {
            'vehicle_info': {
                'make': make,
                'model': model,
                'year': year,
                'mileage': mileage,
                'trim': trim,
                'age': vehicle_age
            },
            'services_due': services_due,
            'categorized_services': categorized_services,
            'total_expected_maintenance_cost': total_expected_cost,
            'upcoming_services': upcoming_services,
            'recent_services': recent_services,
            'insights': insights,
            'checklist_questions': self._get_inspection_questions(make, vehicle_age, mileage)
        }

    def _categorize_service(self, service_name: str) -> str:
        """Categorize a service for display"""
        service_lower = service_name.lower()

        if 'oil' in service_lower:
            return 'Oil & Fluids'
        elif any(x in service_lower for x in ['tire', 'brake', 'shock']):
            return 'Wear Items'
        elif any(x in service_lower for x in ['spark', 'timing', 'belt', 'water']):
            return 'Major Service'
        elif any(x in service_lower for x in ['filter', 'wiper', 'inspection']):
            return 'Basic Maintenance'
        elif any(x in service_lower for x in ['battery', 'ev', 'hybrid']):
            return 'Electrical'
        else:
            return 'Other'

    def _categorize_services_list(self, services: List[Dict]) -> Dict[str, List[Dict]]:
        """Group services by category"""
        categorized = {}
        for service in services:
            category = service['category']
            if category not in categorized:
                categorized[category] = []
            categorized[category].append(service)

        # Sort within each category by mileage
        for category in categorized:
            categorized[category].sort(key=lambda x: x['due_at_mileage'])

        return categorized

    def _get_upcoming_services(self, make: str, model: str,
                               current_mileage: int) -> List[Dict[str, Any]]:
        """Get services due in the next 12,000 miles"""

        # Get services for next year
        schedule = self.maintenance_calculator.get_maintenance_schedule(
            annual_mileage=12000,
            years=1,
            starting_mileage=current_mileage,
            vehicle_make=make,
            vehicle_model=model
        )

        upcoming = []
        if schedule:
            for service in schedule[0]['services']:
                upcoming.append({
                    'service_name': service['service'],
                    'due_at_mileage': service['due_at_mileage'],
                    'cost': service['total_cost'],
                    'miles_until_due': service['due_at_mileage'] - current_mileage
                })

        return sorted(upcoming, key=lambda x: x['miles_until_due'])

    def _get_recent_services(self, make: str, model: str,
                            current_mileage: int) -> List[Dict[str, Any]]:
        """Get services that should have been done in the prior 12 months (~12,000 miles)"""

        # Calculate the mileage range for the prior year
        prior_year_start_mileage = max(0, current_mileage - 12000)

        # Get all applicable services for this vehicle
        applicable_services = self.maintenance_calculator.get_applicable_services(make, model)

        recent = []

        for service_type in applicable_services:
            # Get service interval
            interval = self.maintenance_calculator.get_service_interval(service_type, make)

            # Calculate how many times this service should have been done in the prior 12k miles
            # Check if a service was due within the prior year range
            last_service_due = (current_mileage // interval) * interval

            # If the last service due is within the prior 12 months
            if prior_year_start_mileage <= last_service_due <= current_mileage:
                base_cost = self.maintenance_calculator.service_costs.get(service_type, 50)

                recent.append({
                    'service_name': service_type.replace('_', ' ').title(),
                    'due_at_mileage': last_service_due,
                    'cost': base_cost,
                    'interval': interval,
                    'miles_ago': current_mileage - last_service_due,
                    'category': self._categorize_service(service_type.replace('_', ' ').title())
                })

        return sorted(recent, key=lambda x: x['miles_ago'])

    def _generate_buying_insights(self, make: str, model: str, year: int,
                                  mileage: int, age: int,
                                  services_due: List[Dict]) -> List[str]:
        """Generate insights for the buyer"""
        insights = []

        # Mileage insights
        avg_annual_mileage = mileage / max(age, 1)
        if avg_annual_mileage > 15000:
            insights.append(f"High mileage vehicle ({avg_annual_mileage:,.0f} miles/year avg) - expect more wear")
        elif avg_annual_mileage < 8000:
            insights.append(f"Low mileage vehicle ({avg_annual_mileage:,.0f} miles/year avg) - good condition likely")
        else:
            insights.append(f"Average mileage ({avg_annual_mileage:,.0f} miles/year avg)")

        # Age insights
        if age <= 3:
            insights.append("Still under typical manufacturer warranty period")
        elif age <= 5:
            insights.append("Out of basic warranty - check extended warranty options")
        else:
            insights.append("Older vehicle - thorough pre-purchase inspection recommended")

        # Major service milestones
        if 55000 <= mileage <= 65000:
            insights.append("⚠ Near 60k mile major service milestone")
        elif 85000 <= mileage <= 95000:
            insights.append("⚠ Near 90k mile major service milestone (timing belt if applicable)")
        elif 95000 <= mileage <= 105000:
            insights.append("⚠ Near 100k mile major service milestone")

        # Brand-specific insights
        brand_multiplier = self.maintenance_calculator.brand_multipliers.get(make, 1.0)
        if brand_multiplier < 0.95:
            insights.append(f"{make} has excellent reliability ratings")
        elif brand_multiplier > 1.3:
            insights.append(f"{make} has higher than average maintenance costs")

        # Service history importance
        critical_services = [s for s in services_due if 'timing' in s['service_name'].lower()
                           or 'transmission' in s['service_name'].lower()]
        if critical_services:
            insights.append("⚠ Ask for proof of critical maintenance services")

        return insights

    def _get_inspection_questions(self, make: str, age: int,
                                  mileage: int) -> List[Dict[str, str]]:
        """Generate inspection questions to ask the seller"""
        questions = []

        # Always ask these
        questions.extend([
            {
                'category': 'Service History',
                'question': 'Can you provide complete service records?',
                'importance': 'Critical',
                'why': 'Verifies proper maintenance and identifies potential issues'
            },
            {
                'category': 'Service History',
                'question': 'When was the last oil change performed?',
                'importance': 'High',
                'why': 'Indicates how well the vehicle has been maintained'
            },
            {
                'category': 'Wear Items',
                'question': 'How much tread is left on the tires? When were they replaced?',
                'importance': 'High',
                'why': 'Tires are expensive to replace ($400-$1200)'
            },
            {
                'category': 'Wear Items',
                'question': 'When were the brakes last serviced?',
                'importance': 'High',
                'why': 'Brake replacement can cost $300-$800'
            }
        ])

        # Mileage-specific questions
        if mileage > 60000:
            questions.append({
                'category': 'Major Service',
                'question': 'Has the 60k mile major service been completed?',
                'importance': 'High',
                'why': 'Major service includes transmission fluid, coolant, and other critical items'
            })

        if mileage > 90000:
            questions.append({
                'category': 'Major Service',
                'question': 'Has the timing belt been replaced? (if applicable)',
                'importance': 'Critical',
                'why': 'Timing belt failure can cause catastrophic engine damage ($2000-$5000)'
            })

        # Age-specific questions
        if age > 5:
            questions.append({
                'category': 'Electrical',
                'question': 'Has the battery been replaced? How old is the current battery?',
                'importance': 'Medium',
                'why': 'Batteries typically last 4-6 years ($100-$200 to replace)'
            })

        # Brand-specific questions
        if make in ['BMW', 'Mercedes-Benz', 'Audi']:
            questions.extend([
                {
                    'category': 'Specialized',
                    'question': 'Are there any warning lights on the dashboard?',
                    'importance': 'Critical',
                    'why': 'German luxury cars have complex electronics; repairs can be very expensive'
                },
                {
                    'category': 'Service History',
                    'question': 'Was the vehicle serviced at a dealership or specialist?',
                    'importance': 'High',
                    'why': 'These brands require specialized knowledge and tools'
                }
            ])

        if make == 'Tesla':
            questions.extend([
                {
                    'category': 'Battery',
                    'question': 'What is the battery health/degradation percentage?',
                    'importance': 'Critical',
                    'why': 'Battery replacement can cost $10,000-$20,000'
                },
                {
                    'category': 'Software',
                    'question': 'Are all software updates current?',
                    'importance': 'Medium',
                    'why': 'Tesla updates add features and fix issues'
                }
            ])

        return questions


def format_currency(amount: float) -> str:
    """Format currency for display"""
    return f"${amount:,.0f}"


def format_mileage(mileage: int) -> str:
    """Format mileage for display"""
    return f"{mileage:,} miles"
