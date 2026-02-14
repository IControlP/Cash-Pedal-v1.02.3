# Playwright Setup for Enhanced Scraping

## Quick Install

```bash
# Install Python package
pip install playwright

# Install Chromium browser
playwright install chromium
```

## What It Does

- **Automatic Fallback**: When sites block simple requests (403), Playwright automatically tries browser automation
- **Free & Open Source**: No API keys or monthly fees
- **Works Like a Browser**: Renders JavaScript, bypasses most bot detection
- **Fast**: ~3-5 seconds per page

## How It Works

1. **First Attempt**: Fast HTTP request (0.5s)
2. **If Blocked (403)**: Automatically uses Playwright browser (3-5s)
3. **Extraction**: Same logic works on both methods

## No Installation?

If Playwright isn't installed, the scraper will:
- Try the fast HTTP method
- Show clear error message if blocked
- Suggest installing Playwright with exact command

## Usage

No code changes needed - it's automatic! Just install and it works.

```bash
pip install playwright && playwright install chromium
```

That's it! 🚀
