# Campus Equipment Lending Exchange

A web platform where students, researchers, and faculty can list, discover, borrow, return, and manage academic equipment across campus departments.

## Tech Stack
- **Backend**: Node.js & Express.js
- **Database & ODM**: MongoDB & Mongoose
- **Frontend / Templating**: EJS, Semantic HTML5, Vanilla CSS, Vanilla JavaScript
- **Deployment**: Vercel Serverless Functions (`api/index.js` and `vercel.json`)
- **Authentication & Security**: Password hashing (`bcryptjs`), Session management (`express-session` + `connect-mongo`), Role-based access control, OTP email verification, and Social OAuth (Google & Facebook).

## Core Features
1. **Academic Equipment Marketplace**: Multi-factor filtering by academic category, department, and live availability. Keyword search with regex partial matching.
2. **Borrow & Lending Lifecycle**: Request workflow with date ranges, purpose specification, lender approval/rejection, cancellation, and receipt confirmation.
3. **Active Loans & Returns**: Overdue status monitoring, return condition inspection notes, 48-hour return alerts, and deposit status tracking.
4. **Deposit & Escrow System**: Security deposits for delicate or high-value lab equipment held in campus escrow via UPI, marked as paid and refundable upon return.
5. **Peer Reviews & Ratings**: 1-to-5 star rating system with automated average calculation and student feedback.
6. **Campus AI Assistant**: Interactive chat interface providing instant answers about borrowing procedures, return rules, deposit guidelines, and equipment recommendations.
7. **Social Authentication**: Google & Facebook OAuth integration alongside existing local email/password registration with OTP verification.
8. **Role-Based Access Control**: Student, Teacher, and Administrator roles with protected administration panels.
9. **Automated Notifications**: In-app alerts for borrow requests, approvals, declines, return confirmations, and reminders.

## Project Structure
```text
├── api/
│   └── index.js             # Vercel serverless function entrypoint
├── config/
│   ├── db.js                # MongoDB connection handler with connection pooling
│   └── pickupConfig.js      # Campus pickup locations and date slot rules
├── controllers/
│   ├── adminController.js   # Administrator oversight and role moderation
│   ├── authController.js    # Local auth, OTP, and Google/Facebook OAuth handlers
│   ├── borrowController.js  # Borrow requests, approvals, and return cycle
│   ├── chatController.js    # AI Assistant chat handling
│   ├── equipmentController.js # Marketplace discovery and CRUD operations
│   ├── notificationController.js # Alerts and notification status
│   └── reviewController.js  # Equipment ratings and reviews
├── middleware/
│   ├── auth.js              # Authentication, authorization, and view locals
│   └── errorHandler.js      # Production error safety and 404 handler
├── models/
│   ├── BorrowRequest.js     # Lending transactions and loan states
│   ├── Equipment.js         # Equipment catalog item schema
│   ├── Notification.js      # User notification schema
│   ├── Otp.js               # One-time passcode schema with TTL index
│   ├── Review.js            # Rating and feedback schema
│   └── User.js              # User profile and credentials schema (extended for OAuth)
├── public/
│   ├── css/style.css        # Clean responsive styling & Campus Trust UI
│   └── js/main.js           # Client interaction, double-submit protection
├── routes/
│   ├── adminRoutes.js       # /admin routes
│   ├── authRoutes.js        # /auth routes (including /google and /facebook)
│   ├── borrowRoutes.js      # /borrow routes
│   ├── chatRoutes.js        # /chat routes
│   ├── equipmentRoutes.js   # /equipment routes
│   ├── indexRoutes.js       # / and /dashboard routes
│   ├── notificationRoutes.js# /notifications routes
│   └── reviewRoutes.js      # /reviews routes
├── services/
│   ├── aiService.js         # Knowledge base and query answering engine
│   ├── authService.js       # User registration, password check, and social user resolution
│   ├── notificationService.js # Notification creation helper
│   ├── oauthService.js      # Google and Meta OAuth2 token exchange & CSRF protection
│   └── otpService.js        # OTP generator, validator, and Gmail SMTP dispatcher
├── views/
│   ├── admin/dashboard.ejs  # Admin overview and user management
│   ├── auth/                # Login, signup, and OTP verification (with social buttons)
│   ├── borrow/              # Requests, returns, UPI payment, and pickup receipts
│   ├── equipment/           # Marketplace item details, add, and edit
│   ├── partials/            # Header, footer, alerts, and floating AI widget
│   ├── chat.ejs             # AI Assistant interface
│   ├── dashboard.ejs        # Borrower & lender summary with Trust Score
│   ├── error.ejs            # Friendly error display
│   ├── index.ejs            # Home landing page with 4-step flow
│   ├── marketplace.ejs      # Filterable equipment catalog
│   └── profile.ejs          # User account profile & Trust Score
├── app.js                   # Express application setup
├── server.js                # Standalone Node.js server entrypoint
├── package.json
└── vercel.json              # Vercel serverless routing configuration
```

## Social Authentication Setup Guide

### 1. Google OAuth 2.0 (Google Cloud Console)
1. Go to the [Google Cloud Console](https://console.cloud.google.com/).
2. Create or select an existing project.
3. In **APIs & Services** > **OAuth consent screen**:
   - User Type: **External**
   - App Name: `Campus Equipment Lending Exchange`
   - Scopes: `.../auth/userinfo.email`, `.../auth/userinfo.profile`, `openid`
4. In **Credentials** > **Create Credentials** > **OAuth client ID**:
   - Application type: **Web application**
   - Name: `Campus Lending Web Client`
   - **Authorized JavaScript origins**:
     - `http://localhost:3000` (Local)
     - `https://YOUR-DOMAIN.com` (Production)
   - **Authorized redirect URIs**:
     - `http://localhost:3000/auth/google/callback` (Local)
     - `https://YOUR-DOMAIN.com/auth/google/callback` (Production)
5. Copy your **Client ID** and **Client Secret** into your `.env`:
   ```env
   GOOGLE_CLIENT_ID=your_google_client_id.apps.googleusercontent.com
   GOOGLE_CLIENT_SECRET=your_google_client_secret
   GOOGLE_CALLBACK_URL=http://localhost:3000/auth/google/callback
   ```

### 2. Facebook Login (Meta for Developers)
1. Go to [developers.facebook.com](https://developers.facebook.com/) and register / sign in.
2. Click **My Apps** > **Create App**.
3. Select **Authenticate and request data from users with Facebook Login** (or Type: **Consumer**).
4. In **Facebook Login** > **Settings** (or Client OAuth Settings):
   - **Valid OAuth Redirect URIs**:
     - `http://localhost:3000/auth/facebook/callback` (Local)
     - `https://YOUR-DOMAIN.com/auth/facebook/callback` (Production)
   - Ensure **Client OAuth Login** and **Web OAuth Login** are enabled.
5. In **App Settings** > **Basic**:
   - Copy **App ID** and **App Secret** into your `.env`:
   ```env
   FACEBOOK_APP_ID=your_facebook_app_id
   FACEBOOK_APP_SECRET=your_facebook_app_secret
   FACEBOOK_CALLBACK_URL=http://localhost:3000/auth/facebook/callback
   ```

## Running Locally

1. **Clone & Install Dependencies**:
   ```bash
   npm install
   ```

2. **Configure Environment Variables**:
   Copy `.env.example` to `.env` and set your credentials:
   ```env
   PORT=3000
   NODE_ENV=development
   MONGODB_URI=mongodb://127.0.0.1:27017/campus_lending
   SESSION_SECRET=campus-equipment-lending-secret-key-2026

   # Social OAuth (Optional for testing, buttons will prompt if unset)
   GOOGLE_CLIENT_ID=
   GOOGLE_CLIENT_SECRET=
   GOOGLE_CALLBACK_URL=http://localhost:3000/auth/google/callback

   FACEBOOK_APP_ID=
   FACEBOOK_APP_SECRET=
   FACEBOOK_CALLBACK_URL=http://localhost:3000/auth/facebook/callback

   # Gmail OTP
   GMAIL_USER=your_email@gmail.com
   GMAIL_APP_PASSWORD=your_16_char_app_password
   ```

3. **Run Automated Test Suite**:
   ```bash
   npm test
   ```

4. **Start the Application**:
   ```bash
   npm start
   ```
   Open `http://localhost:3000` in your web browser.

## Deployment to Vercel

1. Push your repository to GitHub.
2. Import the project into Vercel.
3. Add Environment Variables in Vercel Project Settings:
   - `MONGODB_URI`
   - `SESSION_SECRET`
   - `NODE_ENV=production`
   - `GOOGLE_CLIENT_ID`
   - `GOOGLE_CLIENT_SECRET`
   - `GOOGLE_CALLBACK_URL=https://YOUR-DOMAIN.com/auth/google/callback`
   - `FACEBOOK_APP_ID`
   - `FACEBOOK_APP_SECRET`
   - `FACEBOOK_CALLBACK_URL=https://YOUR-DOMAIN.com/auth/facebook/callback`
4. Deploy! Requests are routed automatically via `vercel.json` and `api/index.js`.
