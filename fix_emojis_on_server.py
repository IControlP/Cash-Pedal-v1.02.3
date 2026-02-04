#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
CashPedal Emoji Fix Script - Run this on your Railway server
This script fixes emoji corruption by replacing corrupted text with proper Unicode
"""

import os
import re

# Unicode escape sequences for all emojis (these cannot be corrupted)
EMOJIS = {
    'wrench': '\U0001F527',  # 🔧
    'scales': '\u2696\uFE0F',  # ⚖️
    'info': '\u2139\uFE0F',  # ℹ️
    'target': '\U0001F3AF',  # 🎯
    'money_bag': '\U0001F4B0',  # 💰
    'car': '\U0001F697',  # 🚗
    'clipboard': '\U0001F4CB',  # 📋
    'chart': '\U0001F4CA',  # 📊
    'checkmark': '\u2705',  # ✅
    'lightbulb': '\U0001F4A1',  # 💡
    'speech_balloon': '\U0001F5EF\uFE0F',  # 🗯️
    'lightning': '\u26A1',  # ⚡
    'calendar': '\U0001F4C5',  # 📅
    'plus': '\u2795',  # ➕
    'refresh': '\U0001F504',  # 🔄
    'trash': '\U0001F5D1\uFE0F',  # 🗑️
    'sparkles': '\u2728',  # ✨
    'trophy': '\U0001F3C6',  # 🏆
    'gem': '\U0001F48E',  # 💎
    'green_heart': '\U0001F49A',  # 💚
    'warning': '\u26A0\uFE0F',  # ⚠️
    'email': '\U0001F4E7',  # 📧
    'fuel': '\u26FD',  # ⛽
    'chart_down': '\U0001F4C9',  # 📉
    'suv': '\U0001F699',  # 🚙
    'sedan': '\U0001F698',  # 🚘
    'credit_card': '\U0001F4B3',  # 💳
    'bank': '\U0001F3E6',  # 🏦
    'shield': '\U0001F6E1\uFE0F',  # 🛡️
    'lizard': '\U0001F98E',  # 🦎
    'zebra': '\U0001F993',  # 🦓
    'blue_heart': '\U0001F499',  # 💙
    'tire': '\U0001F6DE',  # 🛞
    'test_tube': '\U0001F9EA',  # 🧪
    'smile': '\U0001F60A',  # 😊
    'grimace': '\U0001F62C',  # 😬
    'shrug': '\U0001F937',  # 🤷
    'heart_eyes': '\U0001F60D',  # 😍
    'neutral': '\U0001F610',  # 😐
}

# Patterns to find and replace
REPLACEMENTS = {
    # Page icons in page_icon=" " quotes
    r'page_icon="[^"]*?"': {
        'pattern': r'page_icon="([^"]*?)"',
        'files': [
            ('1___Single_Vehicle_Calculator.py', f'page_icon="{EMOJIS["wrench"]}"'),
            ('2____Multi_Vehicle_Comparison.py', f'page_icon="{EMOJIS["scales"]}"'),
            ('3_____About.py', f'page_icon="{EMOJIS["info"]}"'),
            ('4_____Find_Your_Car.py', f'page_icon="{EMOJIS["target"]}"'),
            ('5_______Salary_Calculator.py', f'page_icon="{EMOJIS["money_bag"]}"'),
            ('6________Take_it_to_the_next_gear.py', f'page_icon="{EMOJIS["car"]}"'),
        ]
    },
    
    # Content patterns - find corrupted text and replace
    'corrupted_speech_lightning': {
        'pattern': r'[ÃÂÅ]{1,20}[\x80-\xFF]{0,10} ZIP Code',
        'replacement': f'{EMOJIS["speech_balloon"]}{EMOJIS["calendar"]} ZIP Code',
        'files': ['calculator_display.py', 'input_forms.py']
    },
    'corrupted_lightning_ev': {
        'pattern': r'[ÃÂÅ]{1,20}[\x80-\xFF]{0,10} EV Support',
        'replacement': f'{EMOJIS["lightning"]} EV Support',
        'files': ['calculator_display.py', 'input_forms.py']
    },
    'corrupted_chart': {
        'pattern': r'[ÃÂÅ]{1,20}[\x80-\xFF]{0,10} All Forms',
        'replacement': f'{EMOJIS["chart"]} All Forms',
        'files': ['calculator_display.py']
    },
}

def fix_file(filepath):
    """Fix a single file"""
    if not os.path.exists(filepath):
        return False, "File not found"
    
    try:
        with open(filepath, 'r', encoding='utf-8', errors='replace') as f:
            content = f.read()
        
        original = content
        changes = []
        
        # Fix page_icon if this is a page file
        filename = os.path.basename(filepath)
        if '___' in filename:
            for file_pattern, replacement in REPLACEMENTS[r'page_icon="[^"]*?"']['files']:
                if filename == file_pattern:
                    old_match = re.search(r'page_icon="([^"]*?)"', content)
                    if old_match:
                        content = re.sub(r'page_icon="[^"]*?"', replacement, content)
                        changes.append(f"Fixed page_icon to {replacement}")
        
        # Fix content patterns
        for key, config in REPLACEMENTS.items():
            if key.startswith('corrupted_'):
                if filename in config['files']:
                    matches = re.findall(config['pattern'], content)
                    if matches:
                        content = re.sub(config['pattern'], config['replacement'], content)
                        changes.append(f"Fixed {len(matches)} occurrences of {key}")
        
        if content != original:
            with open(filepath, 'w', encoding='utf-8') as f:
                f.write(content)
            return True, changes
        else:
            return False, ["No changes needed"]
            
    except Exception as e:
        return False, [f"Error: {str(e)}"]

def main():
    """Main fix function"""
    print("="*70)
    print("CashPedal Emoji Fix Script")
    print("="*70)
    print()
    
    files_to_fix = [
        '1___Single_Vehicle_Calculator.py',
        '2____Multi_Vehicle_Comparison.py',
        '3_____About.py',
        '4_____Find_Your_Car.py',
        '5_______Salary_Calculator.py',
        '6________Take_it_to_the_next_gear.py',
        'calculator_display.py',
        'input_forms.py',
        'main.py',
    ]
    
    fixed_count = 0
    
    for filename in files_to_fix:
        success, messages = fix_file(filename)
        if success:
            print(f"✓ {filename}")
            for msg in messages:
                print(f"    {msg}")
            fixed_count += 1
        else:
            print(f"  {filename}: {messages[0]}")
    
    print()
    print("="*70)
    print(f"Fixed {fixed_count} files!")
    print("="*70)

if __name__ == "__main__":
    main()
