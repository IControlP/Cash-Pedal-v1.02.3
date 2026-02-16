# 🔒 CashPedal Admin Dashboard

## Overview

The Admin Dashboard provides analytics and insights for the Wheel-Zard chatbot. It is **completely hidden** from regular users and only accessible to site administrators.

## 🎯 Key Features

- **Invisible to Users**: Not listed in the main app navigation
- **Password Protected**: Requires admin password to access
- **Session-Based Auth**: Stays authenticated during browser session
- **Question Analytics**: View all user questions and conversation patterns
- **Feature Insights**: Identify what users are asking for most

---

## 🚀 How to Access the Admin Dashboard

### Option 1: Local Development (Recommended for Testing)

If you're running CashPedal locally:

```bash
# Navigate to your project directory
cd Cash-Pedal-v1.02.3

# Run the admin dashboard on a different port
streamlit run admin/analytics_dashboard.py --server.port 8502
```

Then open your browser to: `http://localhost:8502`

**Default Password:** `CashPedal2026!`

### Option 2: Railway Deployment (Separate Service)

For Railway deployments, you have two approaches:

#### Approach A: Separate Railway Service (Most Secure)

1. **Create a new Railway service** for the admin dashboard
2. **Set the start command** to:
   ```bash
   streamlit run admin/analytics_dashboard.py --server.port $PORT
   ```
3. **Add authentication** via Railway environment variables
4. **Access via private URL** that only admins know

**Railway Configuration:**
```toml
# railway.toml (for admin service)
[build]
builder = "nixpacks"

[deploy]
startCommand = "streamlit run admin/analytics_dashboard.py --server.port $PORT"
```

#### Approach B: Port-Based Access (Local Deployment Only)

For local Railway deployments (not cloud), you can run it on a different port:

```bash
streamlit run admin/analytics_dashboard.py --server.port 8502
```

### Option 3: Environment Variable Toggle (Advanced)

Create a separate admin-enabled deployment:

1. **Set environment variable** in Railway:
   ```
   ENABLE_ADMIN_DASHBOARD=true
   ```

2. **Create conditional page** that only loads when `ENABLE_ADMIN_DASHBOARD=true`

3. **Deploy separate instance** with admin dashboard enabled

---

## 🔐 Security Considerations

### Change the Default Password

**IMPORTANT:** The default password is `CashPedal2026!`

To change it:

1. Open `admin/analytics_dashboard.py`
2. Find line ~34:
   ```python
   ADMIN_PASSWORD = "CashPedal2026!"  # TODO: Change this password for production
   ```
3. Change to your secure password:
   ```python
   ADMIN_PASSWORD = "YourSecurePassword123!"
   ```

### Best Practices

✅ **DO:**
- Change the default password immediately
- Use environment variables for passwords in production
- Keep admin URLs private
- Use HTTPS for all deployments
- Monitor access logs
- Logout when finished

❌ **DON'T:**
- Share admin URLs publicly
- Use weak passwords
- Leave authentication session open on shared computers
- Commit passwords to git (use environment variables)

---

## 📊 What Data Can You See?

### Analytics Dashboard Features

1. **Overview Metrics**
   - Total questions asked
   - Unique user sessions
   - Average questions per session
   - Questions today

2. **Recent Questions**
   - Last 20 questions with timestamps
   - Session tracking
   - Response type logging

3. **Keyword Analysis**
   - Most common words in questions
   - Feature request identification
   - User pain point discovery

4. **Timeline Charts**
   - Daily question volume
   - Usage patterns over time

5. **Data Export**
   - Download full CSV of all questions
   - Analyze in Excel or other tools

---

## 🗂️ Data Location

All question logs are stored in:
```
data/wheel_zard_logs/user_questions.csv
```

**CSV Format:**
```csv
timestamp,question,session_id,response_type
2024-02-14 10:30:45,What car should I buy?,20240214_103042_123456,quick_response
```

---

## 🛠️ Railway Deployment Guide

### Step 1: Set Up Admin Service on Railway

1. **Go to Railway Dashboard**
2. **Create New Project** or use existing one
3. **Add New Service** → "Empty Service"
4. **Connect GitHub Repo**

### Step 2: Configure Start Command

In Railway service settings:

**Start Command:**
```bash
streamlit run admin/analytics_dashboard.py --server.port $PORT
```

### Step 3: Environment Variables

Add these environment variables in Railway:

```bash
# Optional: Override default password
ADMIN_PASSWORD=YourSecurePasswordHere

# Streamlit configuration
STREAMLIT_SERVER_PORT=$PORT
STREAMLIT_SERVER_ADDRESS=0.0.0.0
```

### Step 4: Generate Domain

Railway will generate a URL like:
```
https://cashpedal-admin-production.up.railway.app
```

**Keep this URL private!** Only share with administrators.

### Step 5: Access

1. Navigate to your admin Railway URL
2. Enter password
3. View analytics

---

## 🔧 Environment Variable Password (Optional)

To use environment variables for password:

### 1. Update `admin/analytics_dashboard.py`

Change line ~34 from:
```python
ADMIN_PASSWORD = "CashPedal2026!"
```

To:
```python
ADMIN_PASSWORD = os.getenv("ADMIN_PASSWORD", "CashPedal2026!")
```

### 2. Set Environment Variable

**Railway:**
```bash
ADMIN_PASSWORD=YourSecurePassword123!
```

**Local (.env file):**
```bash
ADMIN_PASSWORD=YourSecurePassword123!
```

**Local (command line):**
```bash
ADMIN_PASSWORD=YourSecurePassword123! streamlit run admin/analytics_dashboard.py
```

---

## 📖 Usage Examples

### Scenario 1: Check Today's Questions

1. Access admin dashboard
2. Login with password
3. Look at "Questions Today" metric
4. Review "Recent Questions" section

### Scenario 2: Identify Feature Requests

1. Access admin dashboard
2. Check "Most Common Keywords"
3. Look for patterns (e.g., "lease", "financing", "insurance")
4. Prioritize features based on frequency

### Scenario 3: Export Data for Analysis

1. Access admin dashboard
2. Scroll to "Export Data" section
3. Click "Download CSV"
4. Open in Excel or Google Sheets
5. Create pivot tables and charts

---

## 🚨 Troubleshooting

### "Password incorrect" - Reset Password

1. Check `admin/analytics_dashboard.py` line 34
2. Verify password is correct
3. If using environment variable, check Railway settings
4. Clear browser cache and try again

### Can't Access on Railway

1. **Verify start command** is set correctly
2. **Check logs** in Railway dashboard
3. **Ensure port binding** uses `$PORT`
4. **Test locally first** with `streamlit run admin/analytics_dashboard.py`

### Navigation Links Don't Work

This is expected! The admin dashboard is separate from the main app.
- To return to main app, navigate to your main CashPedal URL
- Or run `streamlit run main.py` locally

### No Questions Appearing

1. **Check data file exists**: `data/wheel_zard_logs/user_questions.csv`
2. **Verify users are asking questions** in Wheel-Zard
3. **Check file permissions** on Railway
4. **Look for logging errors** in main app

---

## 🔄 Updating the Dashboard

To add new features or modify the dashboard:

1. Edit `admin/analytics_dashboard.py`
2. Test locally: `streamlit run admin/analytics_dashboard.py`
3. Commit changes to git
4. Railway will auto-deploy if connected to GitHub

---

## 📞 Support

If you encounter issues:

1. Check Railway logs for errors
2. Verify data file exists and has content
3. Test locally first before deploying
4. Review environment variables
5. Check password is correct

---

## 🎓 Why This Approach?

### Why Not in `pages/` Directory?

Streamlit automatically displays all files in `pages/` in the sidebar navigation. By moving the admin dashboard to `admin/`, it's completely invisible to regular users.

### Why Separate Railway Service?

1. **Security**: Completely isolated from user app
2. **Performance**: Doesn't affect main app performance
3. **Access Control**: Different URL that can be kept private
4. **Scalability**: Can be deployed independently

### Why Password Protection?

Even though the admin dashboard is hidden, password protection adds an extra security layer in case the URL is discovered.

---

## ✅ Quick Checklist

Before deploying to production:

- [ ] Changed default password
- [ ] Set up environment variable for password
- [ ] Tested locally
- [ ] Configured Railway service
- [ ] Verified data logging works
- [ ] Kept admin URL private
- [ ] Documented access for other admins
- [ ] Set up HTTPS/SSL
- [ ] Tested logout functionality
- [ ] Backed up question logs

---

## 📝 Summary

**For Development:**
```bash
streamlit run admin/analytics_dashboard.py --server.port 8502
```

**For Production (Railway):**
- Create separate Railway service
- Set start command: `streamlit run admin/analytics_dashboard.py --server.port $PORT`
- Keep URL private
- Change default password

**Default Password:** `CashPedal2026!` (CHANGE THIS!)

---

**🎉 You're all set! Your analytics dashboard is now completely hidden from users and secure for admin-only access.**
