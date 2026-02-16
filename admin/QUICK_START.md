# 🚀 Quick Start - Admin Dashboard

## Local Access (Development)

```bash
cd Cash-Pedal-v1.02.3
streamlit run admin/analytics_dashboard.py --server.port 8502
```

Then open: `http://localhost:8502`

**Password:** `CashPedal2026!` (change this in production!)

---

## Railway Access (Production)

### Option 1: Separate Railway Service (Recommended)

1. Create new Railway service
2. Start command: `streamlit run admin/analytics_dashboard.py --server.port $PORT`
3. Get private URL (e.g., `https://cashpedal-admin.up.railway.app`)
4. Keep URL secret!

### Option 2: Same Deployment, Different Port

Only works for local deployments, not Railway cloud.

---

## Change Password

Edit `admin/analytics_dashboard.py` line 34:

```python
ADMIN_PASSWORD = "YourNewSecurePassword!"
```

Or use environment variable:

```bash
# Railway
ADMIN_PASSWORD=YourNewPassword

# Code change needed:
ADMIN_PASSWORD = os.getenv("ADMIN_PASSWORD", "CashPedal2026!")
```

---

## File Structure

```
Cash-Pedal-v1.02.3/
├── admin/
│   ├── analytics_dashboard.py   # Admin dashboard app
│   ├── README.md                 # Full documentation
│   └── QUICK_START.md           # This file
├── pages/
│   ├── 9__________Wheel_Zard_Agent.py  # NO admin link here
│   └── ...other pages...
└── data/
    └── wheel_zard_logs/
        └── user_questions.csv   # Question data
```

---

## Key Points

✅ **Analytics page is now HIDDEN from users**
✅ **Not visible in sidebar navigation**
✅ **Password protected**
✅ **Separate deployment recommended**

❌ **Don't put this back in `pages/` directory**
❌ **Don't share admin URL publicly**
❌ **Don't use default password in production**

---

See `admin/README.md` for detailed documentation.
