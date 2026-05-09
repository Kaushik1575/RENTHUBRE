# 🚀 Manual Backend Deployment Guide

## ✅ Your Backend is Already Deployed!

**Live URL**: https://backend-pearl-psi-33.vercel.app

---

## 📋 Step-by-Step Manual Deployment Process

### **Step 1: Add Environment Variables (REQUIRED)**

Your backend won't work without environment variables. Choose one method:

#### **Method A: Via Vercel Dashboard (Recommended)**

1. **Open Vercel Dashboard**:
   - Go to: https://vercel.com/dashboard
   - Login with your account

2. **Select Your Project**:
   - Click on the **"backend"** project

3. **Add Environment Variables**:
   - Click **Settings** (top menu)
   - Click **Environment Variables** (left sidebar)
   - Click **Add New** button

4. **Add Each Variable**:
   Copy these from your local `.env` file and add them one by one:

   ```
   SUPABASE_URL
   SUPABASE_KEY
   JWT_SECRET
   RAZORPAY_KEY_ID
   RAZORPAY_KEY_SECRET
   RESEND_API_KEY
   TWILIO_ACCOUNT_SID
   TWILIO_AUTH_TOKEN
   TWILIO_PHONE_NUMBER
   GEMINI_API_KEY
   ```

   Also add these:
   ```
   FRONTEND_URL = https://rent-hub-r.vercel.app
   NODE_ENV = production
   ```

5. **Redeploy**:
   - After adding all variables, Vercel will ask you to redeploy
   - Click **Redeploy** button

---

#### **Method B: Via CLI (Faster)**

Open PowerShell in the backend folder and run:

```powershell
# Navigate to backend folder
cd c:\Users\dask6\OneDrive\Desktop\RentHub\RentHubR\backend

# Add each environment variable (replace with your actual values)
vercel env add SUPABASE_URL production
vercel env add SUPABASE_KEY production
vercel env add JWT_SECRET production
vercel env add RAZORPAY_KEY_ID production
vercel env add RAZORPAY_KEY_SECRET production
vercel env add RESEND_API_KEY production
vercel env add TWILIO_ACCOUNT_SID production
vercel env add TWILIO_AUTH_TOKEN production
vercel env add TWILIO_PHONE_NUMBER production
vercel env add GEMINI_API_KEY production
vercel env add FRONTEND_URL production
vercel env add NODE_ENV production

# Then redeploy
vercel --prod
```

---

### **Step 2: Update Frontend to Use New Backend URL**

Your frontend needs to know about the new backend URL.

1. **Find your frontend environment file**:
   - Location: `c:\Users\dask6\OneDrive\Desktop\RentHub\RentHubR\frontend\.env`

2. **Update the API URL**:
   ```
   VITE_API_URL=https://backend-pearl-psi-33.vercel.app
   ```

3. **Redeploy your frontend**:
   ```powershell
   cd c:\Users\dask6\OneDrive\Desktop\RentHub\RentHubR\frontend
   vercel --prod
   ```

---

### **Step 3: Test Your Backend**

After adding environment variables and redeploying, test your backend:

1. **Test Health Check**:
   - Open: https://backend-pearl-psi-33.vercel.app/api/vehicles
   - You should see vehicle data (or an empty array)

2. **Test from Frontend**:
   - Open your frontend: https://rent-hub-r.vercel.app
   - Try logging in or viewing vehicles
   - Check browser console for any errors

---

## 🔄 How to Redeploy in Future

Whenever you make changes to your backend code:

```powershell
# Navigate to backend folder
cd c:\Users\dask6\OneDrive\Desktop\RentHub\RentHubR\backend

# Deploy to production
vercel --prod
```

That's it! Vercel will:
1. Upload your code
2. Build it
3. Deploy it
4. Give you a new URL (or update the existing one)

---

## 🛠️ Troubleshooting

### Backend Returns 500 Error
- **Cause**: Missing environment variables
- **Fix**: Add all environment variables in Vercel dashboard

### Backend Returns 404 Error
- **Cause**: Route configuration issue
- **Fix**: Check `vercel.json` file exists in backend folder

### Frontend Can't Connect to Backend
- **Cause**: Wrong API URL in frontend
- **Fix**: Update `VITE_API_URL` in frontend `.env` file

### Changes Not Reflecting
- **Cause**: Need to redeploy
- **Fix**: Run `vercel --prod` again

---

## 📝 Quick Reference

**Your Backend URL**: https://backend-pearl-psi-33.vercel.app

**Deploy Command**: `vercel --prod`

**View Logs**: `vercel logs [deployment-url]`

**View Deployments**: https://vercel.com/dashboard

---

## ✅ Checklist

- [ ] Backend deployed to Vercel ✅ (Already done!)
- [ ] Environment variables added to Vercel
- [ ] Backend redeployed after adding env vars
- [ ] Frontend updated with new backend URL
- [ ] Frontend redeployed
- [ ] Tested backend endpoints
- [ ] Tested frontend connection

---

**Need Help?** Check the Vercel dashboard for deployment logs and errors.
