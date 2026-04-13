# Command Center — Setup Guide (20 min)

## Step 1: Create Firebase Project (free)

1. Go to https://console.firebase.google.com
2. Click "Create a project" → name: `command-center` → Continue
3. Disable Google Analytics → Create Project

### Enable Auth:
4. Left sidebar → Build → Authentication → Get Started
5. Click Google → Enable → Select your email → Save

### Enable Firestore:
6. Left sidebar → Build → Firestore Database → Create Database
7. "Start in test mode" → Next → Choose nearest location → Enable

### Get Config:
8. Gear icon (top left) → Project Settings
9. Scroll to "Your apps" → Click web icon `</>`
10. Name: `tracker` → Register App
11. Copy the `firebaseConfig` object

## Step 2: Add Config

Open `src/firebase.js` → replace the placeholder with your config:

```js
const firebaseConfig = {
  apiKey: "AIzaSy...",
  authDomain: "your-project.firebaseapp.com",
  projectId: "your-project-id",
  storageBucket: "your-project.appspot.com",
  messagingSenderId: "123456789",
  appId: "1:123456789:web:abc123"
};
```

## Step 3: Upload to GitHub

1. github.com → Sign in → "+" → New repository
2. Name: `command-center` → Public → Create
3. Upload ALL files from this folder (drag & drop)
4. Click "Commit changes"

## Step 4: Deploy on Vercel (free)

1. vercel.com → Sign up with GitHub
2. "Add New Project" → Import `command-center`
3. Framework: Vite (auto-detects)
4. Click Deploy → wait 1-2 min
5. You get a URL like `command-center-xxx.vercel.app`

## Step 5: Secure Firestore

In Firebase Console → Firestore → Rules tab → replace with:

```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /users/{userId} {
      allow read, write: if request.auth != null && request.auth.uid == userId;
    }
  }
}
```
Click Publish.

## Step 6: Add to Home Screen

Open your Vercel URL on phone:
- Chrome: Menu (⋮) → "Add to Home Screen"
- Safari: Share → "Add to Home Screen"

## Updating

Edit files on GitHub → Vercel auto-deploys in 30 sec.

## Troubleshooting

- "Auth domain not authorized": Firebase Console → Authentication → Settings → Add your Vercel domain
- Blank screen: Check browser console (F12), likely wrong Firebase config
- Data not syncing: Check Firestore rules
