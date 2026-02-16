"""
Test error handling and debug information
"""

from car_buying_checklist import CarBuyingChecklist

print("Testing Error Handling Improvements")
print("=" * 60)

checklist = CarBuyingChecklist()

# Test 1: 403 Error (blocked site)
print("\n1. Testing with blocked site (403):")
print("-" * 60)
result = checklist.extract_car_info_from_url("https://www.chulavistakia.com/viewdetails/Used/4T1DAACK5SU558323")
print(f"Success: {result.get('extraction_success')}")
print(f"Error: {result.get('error')}")
if '403' in str(result.get('error', '')):
    print("✓ 403 error correctly detected and handled")

# Test 2: 404 Error (invalid URL)
print("\n2. Testing with invalid URL (404):")
print("-" * 60)
result = checklist.extract_car_info_from_url("https://www.example.com/nonexistent")
print(f"Success: {result.get('extraction_success')}")
print(f"Error: {result.get('error')}")
if '404' in str(result.get('error', '')) or 'error' in str(result.get('error', '')).lower():
    print("✓ Invalid URL correctly handled")

print("\n" + "=" * 60)
print("✅ Error handling tests complete!")
print("\nKey improvements:")
print("- Better HTTP headers to appear more like a real browser")
print("- Specific error messages for 403, 404, and timeout errors")
print("- Debug information to show what was found/not found")
print("- Helpful user guidance based on error type")
