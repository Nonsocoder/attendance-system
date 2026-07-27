# 🎓 Cloud-Based Lecture Attendance Management System

A full-stack web application built with React.js, Node.js, Express, and Firebase Firestore.

## 📁 Project Structure

```
attendance-system/
├── backend/
│   ├── config/
│   │   └── firebase.js          # Firebase Admin SDK setup
│   ├── controllers/
│   │   ├── authController.js    # Register, Login, Profile
│   │   ├── courseController.js  # Create courses, Enroll students
│   │   └── attendanceController.js  # Sessions, QR, Mark attendance
│   ├── middleware/
│   │   └── auth.js              # JWT verification, Role checks
│   ├── routes/
│   │   ├── authRoutes.js
│   │   ├── courseRoutes.js
│   │   └── attendanceRoutes.js
│   ├── .env.example             # Copy to .env and fill values
│   ├── package.json
│   └── server.js                # Entry point
│
└── frontend/
    ├── public/
    │   └── index.html           # Includes jsQR CDN for scanning
    ├── src/
    │   ├── components/
    │   │   ├── Auth/
    │   │   │   ├── Login.js
    │   │   │   └── Register.js
    │   │   ├── Attendance/
    │   │   │   ├── CreateSession.js   # Lecturer: generate QR
    │   │   │   ├── QRScanner.js       # Student: scan QR
    │   │   │   └── SessionAttendance.js
    │   │   ├── Dashboard/
    │   │   │   ├── LecturerDashboard.js
    │   │   │   └── StudentDashboard.js
    │   │   └── Reports/
    │   │       └── CourseSummary.js
    │   ├── context/
    │   │   └── AuthContext.js    # Global auth state (React Context)
    │   ├── utils/
    │   │   └── api.js            # All API calls centralized
    │   ├── App.js                # Router & role-based rendering
    │   ├── App.css               # All styles
    │   └── index.js
    ├── .env
    └── package.json
```

---

## 🚀 SETUP GUIDE (Step by Step)

### STEP 1: Install Node.js
Download from https://nodejs.org — install version 18 or higher.

### STEP 2: Set Up Firebase

1. Go to https://console.firebase.google.com
2. Click "Add project" → name it "attendance-system"
3. Disable Google Analytics (not needed) → Create project
4. Click "Firestore Database" → Create database → Start in test mode → Next → Enable
5. Click the ⚙️ gear icon → "Project settings"
6. Go to "Service accounts" tab
7. Click "Generate new private key" → Download the JSON file
8. Open the JSON file — you'll need these values for your .env:
   - `project_id`  → FIREBASE_PROJECT_ID
   - `private_key` → FIREBASE_PRIVATE_KEY
   - `client_email`→ FIREBASE_CLIENT_EMAIL

### STEP 3: Set Up the Backend

```bash
cd attendance-system/backend

# Install dependencies
npm install

# Create your .env file
cp .env.example .env
```

Now open `.env` and fill in your values:
```
PORT=5000
JWT_SECRET=make_this_a_long_random_string_like_abc123xyz789
FIREBASE_PROJECT_ID=your-project-id-from-firebase
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...paste key here...\n-----END PRIVATE KEY-----\n"
FIREBASE_CLIENT_EMAIL=firebase-adminsdk-xxxxx@your-project.iam.gserviceaccount.com
FRONTEND_URL=http://localhost:3000
```

⚠️ IMPORTANT: The private key has `\n` characters — keep them!

Start the backend:
```bash
npm run dev
```

You should see: `Running at http://localhost:5000`

Test it: Open http://localhost:5000/api/health in your browser. You should see JSON.

### STEP 4: Set Up the Frontend

```bash
cd attendance-system/frontend

npm install
npm start
```

Your browser will open http://localhost:3000 automatically!

---

## 🎯 How to Use the System

### As a Lecturer:
1. Register with role "Lecturer"
2. Go to "My Courses" → Create a course (e.g., "CSC101 - Intro to Programming")
3. Go to "Sessions" → Select your course → Create a session
4. A QR code will appear on screen — show it to students during class
5. After class, view who attended

### As a Student:
1. Register with role "Student" (fill in Student ID and Department)
2. Go to "Enroll" tab → Enroll in your courses
3. When in class, click "📷 Scan QR Code"
4. Take a photo of the QR code displayed by your lecturer
5. Your attendance is marked instantly!

---

## 📊 Firestore Database Collections

| Collection    | What it stores              |
|---------------|-----------------------------|
| users         | All user accounts           |
| courses       | Course information          |
| enrollments   | Student-course links        |
| sessions      | Individual lecture sessions |
| attendance    | Attendance records          |

---

## 🌐 API Endpoints Reference

### Auth
- POST `/api/auth/register` — Create account
- POST `/api/auth/login`    — Login
- GET  `/api/auth/profile`  — Get logged-in user (protected)

### Courses
- GET  `/api/courses`                    — List all courses
- POST `/api/courses`                    — Create course (lecturer only)
- GET  `/api/courses/my-courses`         — Student's enrolled courses
- POST `/api/courses/:id/enroll`         — Enroll in a course (student only)

### Attendance
- POST `/api/attendance/session`         — Create session + QR (lecturer)
- POST `/api/attendance/mark`            — Mark attendance (student)
- GET  `/api/attendance/session/:id`     — View session attendance (lecturer)
- GET  `/api/attendance/sessions/:courseId` — List all sessions (lecturer)
- GET  `/api/attendance/my-attendance`   — Student's own records
- GET  `/api/attendance/summary/:courseId`  — Stats per student (lecturer)

---

## 🚀 Deployment (Make it Live on the Internet)

### Backend → Deploy to Render (Free)
1. Push your project to GitHub
2. Go to https://render.com → New → Web Service
3. Connect your GitHub repo → Select the `backend` folder
4. Set Build Command: `npm install`
5. Set Start Command: `npm start`
6. Add all your environment variables from `.env`
7. Deploy!

### Frontend → Deploy to Vercel (Free)
1. Go to https://vercel.com → New Project
2. Connect your GitHub repo → Select the `frontend` folder
3. Set `REACT_APP_API_URL` to your Render backend URL
4. Deploy!

---

## 🔧 Troubleshooting

**"Cannot connect to Firebase"**
→ Check your .env values — especially the private key formatting

**"CORS error in browser"**
→ Make sure FRONTEND_URL in backend .env matches exactly where your React app runs

**"QR code won't scan"**
→ Use the "Paste QR Data" option during development/testing. For real scanning, deploy to HTTPS.

**"Port 5000 already in use"**
→ Change PORT in .env to 5001
