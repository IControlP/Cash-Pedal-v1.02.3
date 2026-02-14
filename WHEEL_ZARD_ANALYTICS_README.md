# 🔒 Wheel-Zard Analytics Dashboard - Admin Access

## Overview
The Wheel-Zard Analytics Dashboard is password-protected and hidden from regular users. Only site owners/admins can access this dashboard to view user question analytics.

## 🔐 Accessing the Dashboard

### Method 1: Direct URL
Navigate directly to the analytics page in your browser:
```
/10___________Wheel_Zard_Analytics
```

### Method 2: Streamlit Navigation
From your Streamlit app's sidebar navigation menu, select:
```
10___________Wheel_Zard_Analytics
```

## 🔑 Login Credentials

**Default Password:** `CashPedal2026!`

⚠️ **IMPORTANT:** For production deployment, you MUST change this password!

### Changing the Password

1. Open the file: `pages/10___________Wheel_Zard_Analytics.py`
2. Find this line (around line 29):
   ```python
   ADMIN_PASSWORD = "CashPedal2026!"  # TODO: Change this password for production
   ```
3. Change `"CashPedal2026!"` to your secure password
4. Save the file

### Password Best Practices
- Use at least 12 characters
- Include uppercase, lowercase, numbers, and symbols
- Don't share the password
- Change it periodically
- Don't commit the password to public repositories

## 🛡️ Security Features

✅ **Password Protection** - Dashboard requires authentication
✅ **Hidden from Users** - No public links or navigation buttons
✅ **Session-Based Auth** - Login persists during browser session
✅ **Logout Feature** - Secure logout button in sidebar

## 📊 Dashboard Features

Once logged in, you can:
- View total questions and session metrics
- See recent user questions
- Analyze popular keywords
- View question timeline charts
- Export data to CSV
- Review all questions in a table

## 🚪 Logging Out

To log out:
1. Click the "🚪 Logout" button in the sidebar
2. You'll be redirected to the login page
3. Session authentication will be cleared

## 📍 Data Location

All question logs are stored in:
```
data/wheel_zard_logs/user_questions.csv
```

## 🔒 Privacy Notes

- The dashboard is completely hidden from regular users
- No links appear in the public interface
- Users cannot access it without the password
- All data is stored locally on your server
- No data is sent to external services

## 🆘 Troubleshooting

### Forgot Password?
1. Open `pages/10___________Wheel_Zard_Analytics.py`
2. Check the `ADMIN_PASSWORD` variable
3. Reset it to a new password

### Can't Access Dashboard?
1. Ensure you're navigating to the correct URL
2. Check that the file exists: `pages/10___________Wheel_Zard_Analytics.py`
3. Verify Streamlit is running properly
4. Clear browser cache and try again

### Authentication Not Working?
1. Clear browser cookies
2. Close and reopen browser
3. Restart Streamlit app
4. Check for typos in password

## 📝 For Production Deployment

Before deploying to production:

1. ✅ Change the default password
2. ✅ Consider using environment variables for the password:
   ```python
   ADMIN_PASSWORD = os.getenv("ANALYTICS_PASSWORD", "default_password")
   ```
3. ✅ Add the password to `.gitignore` or use secrets management
4. ✅ Set up proper database backup for question logs
5. ✅ Consider adding multi-user support with unique passwords
6. ✅ Implement login attempt limiting (optional)
7. ✅ Add audit logging for admin access (optional)

## 🔗 Related Files

- Analytics Dashboard: `pages/10___________Wheel_Zard_Analytics.py`
- Wheel-Zard Agent: `pages/9__________Wheel_Zard_Agent.py`
- Question Logs: `data/wheel_zard_logs/user_questions.csv`

---

**Remember:** The analytics dashboard is for admin eyes only! Keep your password secure and change it regularly.
