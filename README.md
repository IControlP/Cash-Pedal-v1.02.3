# Railway Deployment Configuration Files

## 📦 What's Included

This package contains all the configuration files needed to deploy your Vehicle TCO Calculator to Railway with your custom Namecheap domain.

### Configuration Files Created:

1. **`.streamlit/config.toml`** - Streamlit production configuration
2. **`Procfile`** - Railway start command
3. **`railway.toml`** - Railway deployment settings
4. **`main.py`** - Updated with corrected import paths
5. **`.gitignore`** - Git ignore rules

### Documentation Files:

1. **`RAILWAY_DEPLOYMENT_GUIDE.md`** - Complete deployment walkthrough
2. **`DEPLOYMENT_CHECKLIST.md`** - Pre-deployment verification checklist
3. **`TROUBLESHOOTING_GUIDE.md`** - Solutions to common issues

---

## 🚀 Quick Start (3 Steps)

### Step 1: Add Files to Your GitHub Repository

Copy these files to your repository root:

```
your-repo/
├── .streamlit/
│   └── config.toml          ← Copy this
├── main.py                   ← Replace existing file
├── Procfile                  ← Copy this (new file)
├── railway.toml              ← Copy this (new file)
├── .gitignore                ← Copy this
├── requirements.txt          ← You already have this
└── [all your .py files]      ← Keep in root directory
```

**Important:** All Python files should remain in the root directory (no subdirectories).

**Commit and push:**
```bash
git add .
git commit -m "Configure for Railway deployment"
git push origin main
```

### Step 2: Deploy to Railway

1. Go to [railway.app](https://railway.app)
2. Click "New Project" → "Deploy from GitHub repo"
3. Select your repository
4. Wait for build to complete
5. Click the generated URL to verify it works

### Step 3: Connect Your Namecheap Domain

**In Railway:**
1. Settings → Domains → Add a domain
2. Enter your domain (e.g., `www.yourdomain.com`)
3. Note the CNAME target shown (e.g., `your-app.railway.app`)

**In Namecheap:**
1. Domain List → Manage → Advanced DNS
2. Add CNAME Record:
   ```
   Type: CNAME Record
   Host: www
   Value: your-app.railway.app
   TTL: Automatic
   ```
3. Save changes
4. Wait 15-60 minutes for DNS propagation

**Done!** Your app will be live at your custom domain with automatic HTTPS.

---

## 📋 What Was Fixed

### Main Problem: Import Path Mismatch

**Before (Not Working):**
```python
from ui.calculator_display import display_calculator
from utils.session_manager import initialize_session_state
from services.prediction_service import PredictionService
```

These imports expected files to be in `ui/`, `utils/`, and `services/` subdirectories, but your files are actually in the root directory.

**After (Working):**
```python
from calculator_display import display_calculator
from session_manager import initialize_session_state
from prediction_service import PredictionService
```

Now imports match your actual file structure.

### Additional Fixes:

1. **Added Streamlit Production Config** (`.streamlit/config.toml`)
   - Disables CORS for custom domain
   - Sets headless mode for server deployment
   - Configures proper port binding

2. **Added Railway Start Command** (`Procfile`)
   - Tells Railway how to start your app
   - Uses Railway's dynamic PORT variable
   - Ensures proper server configuration

3. **Added Railway Configuration** (`railway.toml`)
   - Specifies build settings
   - Configures health checks
   - Sets restart policy

---

## ⚠️ Important Notes

### File Structure Must Be:
```
✅ CORRECT - All files in root:
repo/
├── main.py
├── calculator_display.py
├── comparison_display.py
├── session_manager.py
└── [etc...]

❌ WRONG - Files in subdirectories:
repo/
├── ui/
│   └── calculator_display.py
├── utils/
│   └── session_manager.py
└── main.py
```

### Railway Requirements:
- **Starter Plan** ($5/month) required for:
  - Custom domains
  - Always-on (no sleep mode)
  - 500 hours/month execution time

### DNS Propagation:
- Can take 15 minutes to 48 hours
- Usually completes in 30 minutes
- Be patient! This is the #1 cause of "not working"

---

## 🔍 Verify Everything Works

### 1. Local Test (Before Deploying)
```bash
pip install -r requirements.txt
streamlit run main.py
```
Open http://localhost:8501 and verify:
- ✅ App loads without errors
- ✅ Calculator works
- ✅ Comparison mode works
- ✅ No import errors in terminal

### 2. Railway Test
After deployment, verify:
- ✅ Railway build succeeds
- ✅ App accessible via Railway URL
- ✅ All features work

### 3. Custom Domain Test
After DNS propagation:
- ✅ Domain resolves to Railway
- ✅ HTTPS works (green padlock)
- ✅ All features work on custom domain

---

## 📖 Documentation Guide

### For Your First Deployment:
1. **Start here:** `RAILWAY_DEPLOYMENT_GUIDE.md`
   - Step-by-step instructions
   - Complete setup walkthrough
   - Everything you need to know

2. **Then check:** `DEPLOYMENT_CHECKLIST.md`
   - Verify you haven't missed anything
   - Pre-deployment checks
   - Post-deployment verification

### When Something Goes Wrong:
3. **Consult:** `TROUBLESHOOTING_GUIDE.md`
   - Common issues and solutions
   - DNS debugging
   - Error fixes

---

## 🎯 Expected Timeline

| Step | Time Required | What's Happening |
|------|---------------|------------------|
| Git push | 1 minute | Upload to GitHub |
| Railway build | 2-5 minutes | Install dependencies, build app |
| Railway deploy | 1 minute | Start your app |
| Test Railway URL | Immediate | Verify functionality |
| Add domain in Railway | 1 minute | Configure domain settings |
| Configure DNS | 5 minutes | Update Namecheap settings |
| DNS propagation | 15 min - 48 hours | Wait for DNS to update worldwide |
| SSL provisioning | 5-15 minutes | After DNS verifies |
| **Total** | **30 min - 48 hours** | **Usually < 2 hours** |

---

## ✅ Success Criteria

Your deployment is successful when:

1. ✅ **Railway URL works:** `https://your-app.railway.app` loads your app
2. ✅ **Custom domain resolves:** Your domain points to Railway
3. ✅ **HTTPS is active:** Green padlock in browser
4. ✅ **App functions correctly:** All features work
5. ✅ **Always online:** No sleep mode (Starter plan or higher)

---

## 🆘 Need Help?

### Quick Fixes for Common Issues:

**"Site can't be reached"**
→ DNS not configured or still propagating (wait longer)

**"ModuleNotFoundError"**
→ Wrong imports in main.py (use the provided version)

**"App crashes on startup"**
→ Check Railway logs for errors

**"Not secure" warning**
→ SSL not provisioned yet (wait 10-15 minutes)

### Get Detailed Help:
- See `TROUBLESHOOTING_GUIDE.md` for solutions
- Check Railway logs: Dashboard → Deployments → Logs
- Railway Discord: https://discord.gg/railway

---

## 🎓 Learning Resources

### Railway Documentation:
- Getting Started: https://docs.railway.app/getting-started
- Custom Domains: https://docs.railway.app/deploy/deployments#custom-domains
- Environment Variables: https://docs.railway.app/develop/variables

### Streamlit Deployment:
- Deployment Guide: https://docs.streamlit.io/deploy
- Configuration: https://docs.streamlit.io/library/advanced-features/configuration

### DNS & Domains:
- DNS Checker: https://www.whatsmydns.net/
- Namecheap DNS Guide: https://www.namecheap.com/support/knowledgebase/

---

## 🔄 Updating Your App

After initial deployment, to push updates:

```bash
# Make your changes
git add .
git commit -m "Update: [describe changes]"
git push origin main
```

Railway automatically:
1. Detects the push
2. Rebuilds your app
3. Deploys the new version
4. Your custom domain continues working

No need to reconfigure anything!

---

## 💡 Pro Tips

1. **Test locally first** - Catch errors before deploying
2. **Use Railway logs** - First place to check when debugging
3. **Be patient with DNS** - Propagation takes time
4. **Keep requirements.txt updated** - Missing deps cause crashes
5. **Monitor after deployment** - Check logs for first 24 hours
6. **Use environment variables** - For API keys, secrets, config

---

## 📞 Support Contacts

| Service | Support Method | Response Time |
|---------|---------------|---------------|
| Railway | Discord / GitHub | Minutes to hours |
| Namecheap | Live Chat (24/7) | Immediate |
| Streamlit | Community Forum | Hours to days |

---

## 🎉 You're Ready!

Everything you need is here. Follow the guides, work through the checklist, and you'll have your app deployed with a custom domain in no time.

**Recommended order:**
1. Read `RAILWAY_DEPLOYMENT_GUIDE.md`
2. Work through `DEPLOYMENT_CHECKLIST.md`
3. Keep `TROUBLESHOOTING_GUIDE.md` handy
4. Deploy and celebrate! 🚀

---

**Questions?** Start with the guides - they answer 95% of common questions!

**Good luck with your deployment!** 🎯
