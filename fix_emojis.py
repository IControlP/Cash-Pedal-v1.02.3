#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Automatic Emoji Fixer for CashPedal.io
Fixes Windows-1252 mojibake corruption by replacing corrupted byte sequences
"""

import os
import sys

# Comprehensive mapping of corrupted byte sequences to proper UTF-8
EMOJI_FIXES = {
    # Page icons
    b'\xc3\xb0\xc5\xb8\x94\xa7': b'\xf0\x9f\x94\xa7',  # 🔧 wrench
    b'\xc3\xa2\xc5\xa1\x96\xc3\xaf\xc2\xb8\x8f': b'\xe2\x9a\x96\xef\xb8\x8f',  # ⚖️ scales
    b'\xc3\xa2\x84\xb9\xc3\xaf\xc2\xb8\x8f': b'\xe2\x84\xb9\xef\xb8\x8f',  # ℹ️ information
    b'\xc3\xb0\xc5\xb8\x8e\xaf': b'\xf0\x9f\x8e\xaf',  # 🎯 target
    b'\xc3\xb0\xc5\xb8\x92\xb0': b'\xf0\x9f\x92\xb0',  # 💰 money bag
    b'\xc3\xb0\xc5\xb8\x9a\x97': b'\xf0\x9f\x9a\x97',  # 🚗 car
    
    # Common UI emojis
    b'\xc3\xb0\xc5\xb8\x93\x8b': b'\xf0\x9f\x93\x8b',  # 📋 clipboard
    b'\xc3\xb0\xc5\xb8\x93\x8a': b'\xf0\x9f\x93\x8a',  # �Š bar chart  
    b'\xc3\xa2\x9c\x85': b'\xe2\x9c\x85',  # ✅ checkmark
    b'\xc3\xb0\xc5\xb8\x92\xa1': b'\xf0\x9f\x92\xa1',  # 💡 lightbulb
    b'\xc3\xa2\x9e\x95': b'\xe2\x9e\x95',  # ➕ plus
    b'\xc3\xa2\x9c\xa8': b'\xe2\x9c\xa8',  # ✨ sparkles
    b'\xc3\xa2\x86\x92': b'\xe2\x86\x92',  # → arrow
    b'\xc3\xb0\xc5\xb8\x8f\x86': b'\xf0\x9f\x8f\x86',  # 🏆 trophy
    b'\xc3\xb0\xc5\xb8\x97\x91\xc3\xaf\xc2\xb8\x8f': b'\xf0\x9f\x97\x91\xef\xb8\x8f',  # 🗑️ trash
    b'\xc3\xb0\xc5\xb8\x94\x84': b'\xf0\x9f\x94\x84',  # 🔄 refresh
    
    # Affiliate page emojis
    b'\xc3\xb0\xc5\xb8\x9a\x99': b'\xf0\x9f\x9a\x99',  # 🚙 SUV
    b'\xc3\xb0\xc5\xb8\x9a\x98': b'\xf0\x9f\x9a\x98',  # 🚘 car
    b'\xc3\xb0\xc5\xb8\x92\xb3': b'\xf0\x9f\x92\xb3',  # 💳 credit card
    b'\xc3\xb0\xc5\xb8\x8f\xa6': b'\xf0\x9f\x8f\xa6',  # 🏦 bank
    b'\xc3\xb0\xc5\xb8\x9b\xa1\xc3\xaf\xc2\xb8\x8f': b'\xf0\x9f\x9b\xa1\xef\xb8\x8f',  # 🛡️ shield
    b'\xc3\xb0\xc5\xb8\xa6\x8e': b'\xf0\x9f\xa6\x8e',  # 🦎 lizard
    b'\xc3\xb0\xc5\xb8\xa6\x93': b'\xf0\x9f\xa6\x93',  # 🦓 zebra
    b'\xc3\xb0\xc5\xb8\x92\x99': b'\xf0\x9f\x92\x99',  # 💙 blue heart
    b'\xc3\xb0\xc5\xb8\x9b\x9e': b'\xf0\x9f\x9b\x9e',  # 🛞 tire
    b'\xc3\xb0\xc5\xb8\xa7\xaa': b'\xf0\x9f\xa7\xaa',  # 🧪 test tube
    
    # Quiz emojis
    b'\xc3\xb0\xc5\xb8\x98\x8a': b'\xf0\x9f\x98\x8a',  # 😊 smile
    b'\xc3\xb0\xc5\xb8\x98\xac': b'\xf0\x9f\x98\xac',  # 😬 grimace
    b'\xc3\xb0\xc5\xb8\xa4\xb7': b'\xf0\x9f\xa4\xb7',  # 🤷 shrug
    b'\xc3\xb0\xc5\xb8\x98\x8d': b'\xf0\x9f\x98\x8d',  # 😍 heart eyes
    b'\xc3\xb0\xc5\xb8\x98\x90': b'\xf0\x9f\x98\x90',  # 😐 neutral
    
    # More emojis
    b'\xc3\xb0\xc5\xb8\x93\x85': b'\xf0\x9f\x93\x85',  # 📅 calendar
    b'\xc3\xb0\xc5\xb8\x92\x8e': b'\xf0\x9f\x92\x8e',  # 💎 gem
    b'\xc3\xb0\xc5\xb8\x92\x9a': b'\xf0\x9f\x92\x9a',  # 💚 green heart
    b'\xc3\xa2\x9a\xa0\xc3\xaf\xc2\xb8\x8f': b'\xe2\x9a\xa0\xef\xb8\x8f',  # ⚠️ warning
    b'\xc3\xb0\xc5\xb8\x93\xa7': b'\xf0\x9f\x93\xa7',  # 📧 email
    b'\xc3\xa2\x9b\xbd': b'\xe2\x9b\xbd',  # ⛽ fuel
    b'\xc3\xb0\xc5\xb8\x93\x89': b'\xf0\x9f\x93\x89',  # 📉 chart decreasing
}

def fix_emojis_in_file(filepath):
    """Fix emoji corruption in a single file"""
    # Read file as bytes
    with open(filepath, 'rb') as f:
        content = f.read()
    
    original_size = len(content)
    fixes_applied = {}
    
    # Apply all fixes
    for corrupted, correct in EMOJI_FIXES.items():
        if corrupted in content:
            count = content.count(corrupted)
            content = content.replace(corrupted, correct)
            try:
                emoji = correct.decode('utf-8')
                fixes_applied[emoji] = count
            except:
                fixes_applied[correct.hex()] = count
    
    # Write back
    if fixes_applied:
        with open(filepath, 'wb') as f:
            f.write(content)
        return True, fixes_applied
    
    return False, {}

def main():
    """Fix all page files"""
    files_to_fix = [
        '1___Single_Vehicle_Calculator.py',
        '2____Multi_Vehicle_Comparison.py',
        '3_____About.py',
        '4_____Find_Your_Car.py',
        '5_______Salary_Calculator.py',
        '6________Take_it_to_the_next_gear.py',
        'main.py',
        'terms_agreement.py',
    ]
    
    print("CashPedal Emoji Fixer")
    print("=" * 70)
    print()
    
    fixed_count = 0
    
    for filename in files_to_fix:
        if not os.path.exists(filename):
            print(f"⚠️  {filename}: not found")
            continue
        
        was_fixed, fixes = fix_emojis_in_file(filename)
        
        if was_fixed:
            print(f"✓ {filename}")
            for emoji, count in fixes.items():
                print(f"    {emoji}: {count}x")
            fixed_count += 1
        else:
            print(f"  {filename}: already correct")
    
    print()
    print("=" * 70)
    print(f"Fixed {fixed_count} files!")

if __name__ == "__main__":
    main()
