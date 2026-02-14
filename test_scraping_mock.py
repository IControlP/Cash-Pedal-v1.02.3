"""
Mock test for scraping with simulated HTML content
"""

from car_buying_checklist import CarBuyingChecklist
from bs4 import BeautifulSoup

# Create sample HTML that mimics a dealer listing page
sample_html = """
<!DOCTYPE html>
<html>
<head>
    <title>2025 Toyota Camry LE FWD CVT - Chula Vista Kia</title>
    <meta name="description" content="Check out this 2025 Toyota Camry LE with 559 miles. Available at Chula Vista Kia.">
</head>
<body>
    <div class="vehicle-details">
        <h1>2025 Toyota Camry LE</h1>
        <div class="specs">
            <p>Year: 2025</p>
            <p>Make: Toyota</p>
            <p>Model: Camry</p>
            <p>Trim: LE</p>
            <p>Transmission: CVT</p>
            <p>Drivetrain: FWD</p>
            <p>Mileage: 559 miles</p>
            <p>VIN: 4T1DAACK5SU558323</p>
        </div>
    </div>
</body>
</html>
"""

print("Testing extraction with mock HTML...")
print()

# Create checklist instance
checklist = CarBuyingChecklist()

# Parse HTML
soup = BeautifulSoup(sample_html, 'html.parser')

# Get title text
title_text = ''
title_tag = soup.find('title')
if title_tag:
    title_text = title_tag.get_text().lower()

# Get meta description
meta_desc = ''
meta_tag = soup.find('meta', attrs={'name': 'description'})
if meta_tag and meta_tag.get('content'):
    meta_desc = meta_tag.get('content').lower()

# Combine
priority_text = title_text + ' ' + meta_desc
text_content = soup.get_text().lower()

print("Title:", title_text)
print("Meta:", meta_desc)
print()

# Test individual extraction methods
print("Testing individual extractors:")
print("-" * 50)

year = checklist._extract_year(priority_text, soup) or checklist._extract_year(text_content, soup)
print(f"Year: {year}")

make = checklist._extract_make(priority_text, soup) or checklist._extract_make(text_content, soup)
print(f"Make: {make}")

model = checklist._extract_model(priority_text, soup) or checklist._extract_model(text_content, soup)
print(f"Model: {model}")

trim = checklist._extract_trim(priority_text, soup) or checklist._extract_trim(text_content, soup)
print(f"Trim: {trim}")

mileage = checklist._extract_mileage(priority_text, soup) or checklist._extract_mileage(text_content, soup)
print(f"Mileage: {mileage}")

# Expected values for 2025 Toyota Camry LE with 559 miles
expected = {
    'year': 2025,
    'make': 'Toyota',
    'model': 'Camry',
    'mileage': 559
}

print()
print("Validation:")
print("-" * 50)
results = {
    'year': year,
    'make': make,
    'model': model,
    'mileage': mileage,
    'trim': trim
}

success = True
for key, expected_value in expected.items():
    actual_value = results.get(key)
    match = "✓" if actual_value == expected_value else "✗"
    print(f"{match} {key}: Expected '{expected_value}', Got '{actual_value}'")
    if actual_value != expected_value:
        success = False

if results.get('trim'):
    print(f"✓ Bonus: Trim extracted: {results.get('trim')}")

if success and results.get('model'):
    print("\n✅ All critical extraction tests PASSED!")
    print("   Model extraction is now working!")
else:
    print("\n⚠️ Some extraction tests FAILED")
