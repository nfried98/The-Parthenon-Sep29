# Firebase Setup Instructions for The Parthenon Casino

## Prerequisites
1. A Google account
2. Node.js installed on your system

## Step 1: Create a Firebase Project

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Click "Create a project" or "Add project"
3. Enter project name: "the-parthenon-casino" (or your preferred name)
4. Enable Google Analytics (optional)
5. Click "Create project"

## Step 2: Enable Authentication

1. In your Firebase project, go to "Authentication" in the left sidebar
2. Click "Get started"
3. Go to "Sign-in method" tab
4. Enable "Email/Password" authentication
5. Click "Save"

## Step 3: Create Firestore Database

1. Go to "Firestore Database" in the left sidebar
2. Click "Create database"
3. Choose "Start in test mode" (for development)
4. Select a location for your database
5. Click "Done"

## Step 4: Set Up Firestore Security Rules

1. In Firestore Database, go to "Rules" tab
2. Replace the existing rules with the following:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Users can read all user documents for leaderboard, but only write their own
    match /users/{userId} {
      allow read: if request.auth != null;
      allow write: if request.auth != null && request.auth.uid == userId;
    }
    
    // Balance history rules
    match /balanceHistory/{historyId} {
      allow read: if request.auth != null;
      allow write: if request.auth != null && request.auth.uid == request.resource.data.userId;
    }
  }
}
```

3. Click "Publish"

## Step 5: Get Firebase Configuration

1. Go to "Project settings" (gear icon in left sidebar)
2. Scroll down to "Your apps" section
3. Click "Web" icon (</>) to add a web app
4. Enter app nickname: "The Parthenon Casino"
5. Check "Also set up Firebase Hosting" (optional)
6. Click "Register app"
7. Copy the Firebase configuration object

## Step 6: Update Firebase Configuration

1. Open `firebase-config.js` in your project
2. Replace the placeholder values with your actual Firebase configuration:

```javascript
const firebaseConfig = {
    apiKey: "your-actual-api-key",
    authDomain: "your-project-id.firebaseapp.com",
    projectId: "your-actual-project-id",
    storageBucket: "your-project-id.appspot.com",
    messagingSenderId: "your-actual-sender-id",
    appId: "your-actual-app-id"
};
```

## Step 7: Install Dependencies

Run the following command in your project directory:

```bash
npm install
```

## Step 8: Test the Setup

1. Open `home.html` in your browser
2. Try creating a new account
3. Check if the user appears in Firestore Database
4. Verify that the leaderboard loads correctly

## Troubleshooting

### Common Issues:

1. **CORS Error**: Make sure you're running the project through a local server (not opening HTML files directly)
   - Use `npm run dev` or `python -m http.server` or similar

2. **Authentication Not Working**: 
   - Check that Email/Password is enabled in Firebase Authentication
   - Verify your Firebase configuration is correct

3. **Firestore Permission Denied**:
   - Check that your security rules are published correctly
   - Ensure the user is authenticated before trying to read/write data

4. **Module Import Errors**:
   - Make sure all HTML files use `type="module"` for script tags
   - Check that Firebase dependencies are installed

### Development vs Production:

- **Development**: Use test mode for Firestore (allows all reads/writes)
- **Production**: Use the security rules provided above for proper access control

## Features Included:

✅ User Authentication (Sign In/Sign Up)  
✅ User Data Storage in Firestore  
✅ Balance Synchronization  
✅ Balance History Tracking  
✅ Leaderboard System  
✅ Real-time UI Updates  
✅ Error Handling  
✅ Responsive Design  

## Security Notes:

- The provided Firestore rules ensure users can only modify their own data
- Balance history is tracked for audit purposes
- All authentication is handled securely by Firebase
- User passwords are never stored in your application

## Next Steps:

1. Set up Firebase Hosting for production deployment
2. Add email verification for new accounts
3. Implement password reset functionality
4. Add more detailed user profiles
5. Set up analytics and monitoring
