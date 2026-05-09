# RentHub Backend - Vercel Deployment Guide

## Prerequisites
- Vercel account (sign up at https://vercel.com)
- Vercel CLI installed: `npm install -g vercel`

## Deployment Steps

### Option 1: Deploy via Vercel CLI (Recommended)

1. **Navigate to the backend directory:**
   ```bash
   cd c:\Users\dask6\OneDrive\Desktop\RentHub\RentHubR\backend
   ```

2. **Login to Vercel:**
   ```bash
   vercel login
   ```

3. **Deploy to Vercel:**
   ```bash
   vercel
   ```
   - Follow the prompts
   - When asked "Link to existing project?" → Choose NO (first time)
   - Project name: `renthub-backend` (or your preferred name)
   - Directory: `.` (current directory)

4. **Deploy to Production:**
   ```bash
   vercel --prod
   ```

### Option 2: Deploy via Vercel Dashboard

1. Go to https://vercel.com/new
2. Import your Git repository
3. Set the **Root Directory** to `backend`
4. Click **Deploy**

## Environment Variables

After deployment, you MUST add your environment variables in the Vercel dashboard:

1. Go to your project in Vercel Dashboard
2. Navigate to **Settings** → **Environment Variables**
3. Add the following variables:

```
SUPABASE_URL=your_supabase_url
SUPABASE_KEY=your_supabase_key
JWT_SECRET=your_jwt_secret
RAZORPAY_KEY_ID=your_razorpay_key
RAZORPAY_KEY_SECRET=your_razorpay_secret
RESEND_API_KEY=your_resend_api_key
TWILIO_ACCOUNT_SID=your_twilio_sid
TWILIO_AUTH_TOKEN=your_twilio_token
TWILIO_PHONE_NUMBER=your_twilio_phone
GEMINI_API_KEY=your_gemini_api_key
FRONTEND_URL=https://rent-hub-r.vercel.app
NODE_ENV=production
```

4. **Redeploy** after adding environment variables

## Update Frontend API URL

After deployment, update your frontend to use the new backend URL:

1. Get your backend URL from Vercel (e.g., `https://renthub-backend.vercel.app`)
2. Update your frontend environment variables to point to this URL

## Important Notes

- **Serverless Functions**: Vercel runs your backend as serverless functions
- **Cold Starts**: First request after inactivity may be slower
- **Execution Time Limit**: Free tier has 10-second timeout per request
- **File Uploads**: For file uploads, consider using Supabase Storage directly
- **Scheduled Jobs**: The scheduler will run on each request in serverless mode

## Troubleshooting

### Check Deployment Logs
```bash
vercel logs [deployment-url]
```

### Test Your API
```bash
curl https://your-backend-url.vercel.app/api/vehicles
```

### Common Issues
1. **500 Error**: Check environment variables are set correctly
2. **404 Error**: Verify `vercel.json` routes configuration
3. **Timeout**: Optimize database queries or upgrade Vercel plan

## Local Development

To run locally (unchanged):
```bash
npm run dev
```

The server will run on http://localhost:3005
