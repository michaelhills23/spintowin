# SpinToWin React App

React rebuild of SpinToWin using Vite, React Router, and Firebase.

## Features

✅ Project setup with Vite
✅ Firebase configuration
✅ AuthContext with Firebase Auth (email/password + Google)
✅ useWheels hook for CRUD operations
✅ useAnalytics hook for spin tracking
✅ WheelCanvas component (canvas rendering)
✅ WheelSpinner component (spin animations)
✅ Login page
✅ Dashboard page
✅ WheelEditor page with tabs (Segments, Settings, Share, Analytics)
✅ PublicSpin page with confetti effect
✅ Toast notifications
✅ Segment modal for add/edit
✅ CSS styling (dark theme)
✅ React Router with private routes
✅ Fully responsive design

## Running the App

```bash
npm run dev
```

Visit http://localhost:5173

## Building

```bash
npm run build
```

Deploy the `dist` folder to GitHub Pages or any static host.

## Firebase Rules

Use the same Firestore security rules from the vanilla version.