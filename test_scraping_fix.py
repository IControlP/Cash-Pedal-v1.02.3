"""
Test script to verify the scraping fix
"""

from car_buying_checklist import CarBuyingChecklist

# Test URL from the user's report
test_url = "https://www.chulavistakia.com/viewdetails/Used/4T1DAACK5SU558323?store=CVK100&utm_source=google&utm_medium=cpc&utm_campaign=22219675583&utm_content=&utm_term=&gad_source=1&gad_campaignid=22213254213&gbraid=0AAAAABPE5ntekdvDDzDSWjn0iBg8FQHHU&gclid=CjwKCAiAtLvMBhB_EiwA1u6_PtOrnm-wxzBgJFlLV-l1UXVEBaQ2vG-eJ_F3nUE0irvFifAWdsvVZhoC6aEQAvD_BwE"

print("Testing URL extraction...")
print(f"URL: {test_url[:80]}...")
print()

checklist = CarBuyingChecklist()
car_info = checklist.extract_car_info_from_url(test_url)

print("Extraction Results:")
print("-" * 50)
print(f"Success: {car_info.get('extraction_success')}")
print(f"Year: {car_info.get('year')}")
print(f"Make: {car_info.get('make')}")
print(f"Model: {car_info.get('model')}")
print(f"Trim: {car_info.get('trim')}")
print(f"Mileage: {car_info.get('mileage')}")

if car_info.get('error'):
    print(f"Error: {car_info.get('error')}")

# Expected values for 2025 Toyota Camry LE with 559 miles
expected = {
    'year': 2025,
    'make': 'Toyota',
    'model': 'Camry',
    'mileage': 559
}

print()
print("Expected vs Actual:")
print("-" * 50)
success = True
for key, expected_value in expected.items():
    actual_value = car_info.get(key)
    match = "✓" if actual_value == expected_value else "✗"
    print(f"{match} {key}: Expected '{expected_value}', Got '{actual_value}'")
    if actual_value != expected_value:
        success = False

if success:
    print("\n✅ All extraction tests PASSED!")
else:
    print("\n⚠️ Some extraction tests FAILED")

# LE trim should also be extracted (if present in the page)
if car_info.get('trim'):
    print(f"\n✓ Trim extracted: {car_info.get('trim')}")
else:
    print("\n⚠️ Trim not extracted (this may be acceptable)")
