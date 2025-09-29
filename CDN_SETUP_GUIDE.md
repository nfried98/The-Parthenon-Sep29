# Firebase CDN Setup Guide for The Parthenon Casino

This implementation uses Firebase CDN imports (like the ref folder) instead of ES6 modules, making it easier to deploy and run without build tools.

## 🚀 Quick Setup

### 1. Update Firebase Configuration

Edit `firebase-config.js` and replace the placeholder values with your actual Firebase project configuration:

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

### 2. Set Up Firebase Project

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Create a new project or select existing one
3. Enable Authentication (Email/Password)
4. Create Firestore Database (test mode initially)
5. Copy your project configuration

### 3. Deploy Firestore Rules

Use the provided `firestore.rules` and `firestore.indexes.json` files:

```bash
# Deploy rules
firebase deploy --only firestore:rules

# Deploy indexes
firebase deploy --only firestore:indexes
```

### 4. Deploy Application

```bash
# Deploy everything
firebase deploy

# Or just hosting
firebase deploy --only hosting
```

## 📁 File Structure

```
The-Parthenon-Sep28/
├── firebase-config.js          # Firebase configuration
├── script.js                   # Main application logic
├── home.html                   # Homepage with auth
├── blackjack.html             # Blackjack game
├── plinko.html                # Plinko game
├── mines.html                 # Mines game
├── style.css                  # Main styles
├── homepage.css               # Homepage styles
├── game-pages.css             # Game page styles
├── firestore.rules            # Security rules
├── firestore.indexes.json     # Database indexes
├── firebase.json              # Firebase configuration
└── images/                    # Game assets
```

## 🔧 How It Works

### CDN Implementation Pattern

1. **Firebase CDN Scripts**: Loaded in HTML files
2. **Dynamic Imports**: Firebase methods imported as needed
3. **Global Variables**: Firebase services available globally
4. **No Build Step**: Works directly in browser

### Authentication Flow

1. User visits homepage
2. Firebase loads via CDN
3. Auth popup appears for new users
4. User signs up/in with email/password
5. Balance syncs with Firestore
6. Leaderboard updates in real-time

### Balance Management

- **Local Storage**: Fallback for offline play
- **Firestore Sync**: Real-time balance updates
- **History Tracking**: All balance changes logged
- **Leaderboard**: Top players by balance

## 🛡️ Security Features

### Firestore Rules

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

### Data Protection

- Users can only modify their own data
- Balance history is tracked for transparency
- Authentication required for all operations
- Real-time validation and error handling

## 🎮 Features Included

✅ **User Authentication**
- Email/password sign up and sign in
- Secure logout functionality
- Real-time auth state management

✅ **Balance Management**
- Real-time balance synchronization
- Local storage fallback
- Balance history tracking

✅ **Leaderboard System**
- Top 10 players by balance
- Real-time updates
- Beautiful gold/silver/bronze styling

✅ **Game Integration**
- All games sync with user balance
- Consistent balance management
- Real-time updates across games

✅ **Responsive Design**
- Mobile-friendly interface
- Ancient Greek luxury theme
- Smooth animations and transitions

## 🚀 Deployment Options

### Option 1: Firebase Hosting (Recommended)

```bash
# Install Firebase CLI
npm install -g firebase-tools

# Login and initialize
firebase login
firebase init

# Deploy
firebase deploy
```

### Option 2: Any Static Hosting

- Upload all files to any static hosting service
- No build process required
- Works with GitHub Pages, Netlify, Vercel, etc.

### Option 3: Local Development

```bash
# Simple HTTP server
python -m http.server 8000

# Or Node.js
npx http-server

# Or PHP
php -S localhost:8000
```

## 🔍 Testing

1. **Create Account**: Test user registration
2. **Sign In/Out**: Test authentication flow
3. **Play Games**: Test balance synchronization
4. **Leaderboard**: Test real-time updates
5. **Balance History**: Test data persistence

## 🐛 Troubleshooting

### Common Issues

1. **Firebase Not Loading**
   - Check internet connection
   - Verify CDN URLs are accessible
   - Check browser console for errors

2. **Authentication Errors**
   - Verify Firebase project configuration
   - Check Authentication is enabled
   - Verify email/password method is enabled

3. **Firestore Errors**
   - Check security rules are deployed
   - Verify database is created
   - Check user permissions

4. **Balance Not Syncing**
   - Check user is authenticated
   - Verify Firestore rules allow writes
   - Check browser console for errors

### Debug Mode

Open browser console (F12) to see:
- Firebase initialization logs
- Authentication state changes
- Firestore operations
- Error messages and stack traces

## 📈 Performance

- **CDN Loading**: Firebase loads from Google's CDN
- **Lazy Imports**: Only load Firebase methods when needed
- **Caching**: Browser caches Firebase scripts
- **Optimized Queries**: Firestore indexes for fast leaderboard

## 🔄 Updates

To update Firebase version:
1. Change CDN URLs in HTML files
2. Update any deprecated methods
3. Test thoroughly before deploying

## 📞 Support

- Check Firebase Console for project status
- Review Firestore rules and indexes
- Monitor authentication logs
- Check hosting deployment status

Your Parthenon Casino is now ready for production with Firebase CDN! 🎰✨
