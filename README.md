# Campus Exchange

> Draft — official template alignment pending.

## Peer-to-Peer Academic Equipment & Draftor Lending Exchange

Campus Exchange is a campus-focused peer-to-peer academic equipment lending
platform.

The platform allows senior students to list academic equipment while junior
students can discover, request, borrow, return and rate that equipment.

---

# 1. Problem Statement

Students frequently need academic equipment for:

- Engineering projects
- Laboratory work
- Assignments
- Prototypes
- Measurements
- Academic demonstrations

The required equipment may be expensive or difficult to access for short-term
academic use.

Campus Exchange provides a structured campus marketplace for sharing that
equipment.

---

# 2. Target Users

## LENDER

Usually senior students.

Capabilities planned:

- List equipment
- Upload photos
- Set equipment condition
- Set rental/free borrowing terms
- Define security deposit
- Approve or reject borrowing requests
- Manage listed equipment
- Accept returned equipment
- Rate borrowers

## BORROWER

Usually junior students.

Capabilities planned:

- Browse equipment
- Search equipment
- Filter equipment
- Request equipment
- Submit security deposit reference
- Return equipment
- Rate lender/equipment
- Maintain trust score

## ADMIN

Capabilities planned:

- Manage users
- Manage equipment
- Monitor transactions
- Monitor deposits
- Manage reports
- View platform statistics

---

# 3. Phase 1 Status

Phase 1 establishes the technical foundation.

Current implementation includes:

- Express server
- EJS rendering
- MongoDB connection foundation
- MVC routing/controller separation
- Global error handling
- Health endpoint
- Responsive base UI
- Vercel entry point
- Environment configuration
- Mandatory project documentation

Authentication and marketplace functionality are intentionally scheduled for
later phases.

---

# 4. Technology Stack

## Frontend

- HTML
- EJS
- CSS
- Vanilla JavaScript

## Backend

- Node.js
- Express.js

## Database

- MongoDB Atlas
- Mongoose

## Planned authentication

- Express Session
- MongoDB session store
- bcrypt/bcryptjs
- Nodemailer
- Institutional email OTP

## Deployment

- Vercel

---

# 5. Architecture

Current request flow:

Browser
↓
Routes
↓
Controllers
↓
Services
↓
Models
↓
MongoDB

Services and database models will be introduced as feature phases are
implemented.

---

# 6. Project Structure

```text
project-root/
│
├── api/
│   └── index.js
│
├── config/
│
├── controllers/
│
├── middleware/
│
├── models/
│
├── routes/
│
├── services/
│
├── utils/
│
├── views/
│
├── public/
│
├── tests/
│
├── docs/
│
├── .env.example
├── .gitignore
├── package.json
├── server.js
└── vercel.json