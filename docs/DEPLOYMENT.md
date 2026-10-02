# Campus Equipment Lending Exchange - Deployment Guide

## Prerequisites
- Node.js 18 or newer
- MongoDB Atlas cluster URI
- Vercel account

## Vercel Deployment Instructions

### Method 1: Git Integration (Recommended)
1. Push this repository to GitHub, GitLab, or Bitbucket.
2. Sign in to your [Vercel Dashboard](https://vercel.com).
3. Click **Add New...** &rarr; **Project** and import your repository.
4. Set the Framework Preset to **Other** (Vercel will detect `vercel.json` automatically).
5. In **Environment Variables**, provide:
   | Variable Name | Description | Example Value |
   |---------------|-------------|---------------|
   | `MONGODB_URI` | MongoDB Atlas Connection String | `mongodb+srv://user:pass@cluster.mongodb.net/campus?retryWrites=true&w=majority` |
   | `SESSION_SECRET` | Secret key for signing session cookies | `random_long_secure_string_here` |
   | `NODE_ENV` | Environment identifier | `production` |
   | `ADMIN_INVITE_CODE` | Code required to register admin role | `CAMPUS_ADMIN_SECURE_2026` |
   | `AI_ASSISTANT_NAME` | Display name of campus chatbot | `Campus Equipment Advisor` |
6. Click **Deploy**. Vercel will install dependencies and deploy the serverless function.

### Method 2: Vercel CLI
1. Install Vercel CLI locally:
   ```bash
   npm install -g vercel
   ```
2. Run deployment from the project directory:
   ```bash
   vercel
   ```
3. Follow prompts and add the required environment variables when prompted or in the dashboard.
4. For production rollout:
   ```bash
   vercel --prod
   ```

## Production Health & Verification Checklist
- [x] `vercel.json` directs incoming requests to `api/index.js`.
- [x] MongoDB connection uses serverless connection caching (`global.mongooseConnection`) in `config/db.js`.
- [x] Static files (`public/css/style.css`, `public/js/main.js`) served by Express.
- [x] Sessions persist via `connect-mongo` when `MONGODB_URI` is present.
- [x] Error middleware renders user-friendly pages without leaking system details.
