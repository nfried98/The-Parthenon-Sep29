// Firebase will be loaded via CDN and available globally

// Authentication and Account Management System
class CasinoAuth {
    constructor() {
        this.currentUser = null;
        this.isInitialized = false;
        this.auth = null;
        this.db = null;
        this.init();
    }

    async init() {
        try {
            // Wait for Firebase to be loaded
            await this.waitForFirebase();
            
            // Listen for authentication state changes
            const { onAuthStateChanged } = await import('https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js');
            onAuthStateChanged(this.auth, async (user) => {
                this.currentUser = user;
                if (user) {
                    console.log('User signed in:', user.email);
                    await this.loadUserData();
                    this.updateUIForLoggedInUser();
                } else {
                    console.log('User signed out');
                    this.updateUIForLoggedOutUser();
                }
                this.isInitialized = true;
            });
        } catch (error) {
            console.error('Auth initialization error:', error);
        }
    }

    async waitForFirebase() {
        // Wait for Firebase to be available globally
        while (!window.firebaseAuth || !window.firebaseDb) {
            await new Promise(resolve => setTimeout(resolve, 100));
        }
        this.auth = window.firebaseAuth;
        this.db = window.firebaseDb;
    }

    async signIn(email, password) {
        try {
            const { signInWithEmailAndPassword } = await import('https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js');
            const userCredential = await signInWithEmailAndPassword(this.auth, email, password);
            return { success: true, user: userCredential.user };
        } catch (error) {
            console.error('Sign in error:', error);
            return { success: false, error: this.getErrorMessage(error.code) };
        }
    }

    async signUp(email, password, username) {
        try {
            const { createUserWithEmailAndPassword, updateProfile } = await import('https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js');
            const userCredential = await createUserWithEmailAndPassword(this.auth, email, password);
            await updateProfile(userCredential.user, { displayName: username });
            
            // Create user document in Firestore
            await this.createUserDocument(userCredential.user, username);
            
            return { success: true, user: userCredential.user };
        } catch (error) {
            console.error('Sign up error:', error);
            return { success: false, error: this.getErrorMessage(error.code) };
        }
    }

    async signOut() {
        try {
            const { signOut } = await import('https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js');
            await signOut(this.auth);
            return { success: true };
        } catch (error) {
            console.error('Sign out error:', error);
            return { success: false, error: error.message };
        }
    }

    async createUserDocument(user, username) {
        try {
            const { setDoc, doc, addDoc, collection } = await import('https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js');
            const userDoc = {
                uid: user.uid,
                email: user.email,
                username: username,
                balance: 1000, // Starting balance
                createdAt: new Date(),
                lastLogin: new Date()
            };
            
            await setDoc(doc(this.db, 'users', user.uid), userDoc);
            
            // Create initial balance history entry
            await addDoc(collection(this.db, 'balanceHistory'), {
                userId: user.uid,
                balance: 1000,
                timestamp: new Date(),
                type: 'initial'
            });
            
            console.log('User document created');
        } catch (error) {
            console.error('Error creating user document:', error);
        }
    }

    async loadUserData() {
        if (!this.currentUser) return;
        
        try {
            const { getDoc, doc, setDoc, updateDoc } = await import('https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js');
            const userDocRef = doc(this.db, 'users', this.currentUser.uid);
            const userDoc = await getDoc(userDocRef);
            
            if (userDoc.exists()) {
                const userData = userDoc.data();
                // Update local balance with Firestore balance
                CasinoBalance.setBalance(userData.balance || 0);
                
                // Update last login
                await updateDoc(userDocRef, {
                    lastLogin: new Date()
                });
            } else {
                // User document doesn't exist, create it with initial balance
                const initialBalance = CasinoBalance.getBalance();
                await setDoc(userDocRef, {
                    uid: this.currentUser.uid,
                    email: this.currentUser.email,
                    username: this.currentUser.displayName || this.currentUser.email,
                    balance: initialBalance,
                    createdAt: new Date(),
                    lastLogin: new Date()
                });
                
                // Create initial balance history entry
                await this.saveBalanceHistory(initialBalance, 'initial');
            }
        } catch (error) {
            console.error('Error loading user data:', error);
        }
    }

    async saveUserBalance(balance) {
        if (!this.currentUser) return;
        
        try {
            const { writeBatch, doc, collection, serverTimestamp } = await import('https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js');

            const batch = writeBatch(this.db);
            const userDocRef = doc(this.db, 'users', this.currentUser.uid);
            const historyDocRef = doc(collection(this.db, 'balanceHistory'));

            // Upsert user doc without a pre-read
            batch.set(userDocRef, {
                uid: this.currentUser.uid,
                email: this.currentUser.email,
                username: this.currentUser.displayName || this.currentUser.email,
                balance: balance,
                lastUpdated: serverTimestamp()
            }, { merge: true });

            // Add balance history entry
            batch.set(historyDocRef, {
                userId: this.currentUser.uid,
                balance: balance,
                timestamp: serverTimestamp(),
                type: 'update'
            });

            await batch.commit();
        } catch (error) {
            console.error('Error saving user balance:', error);
        }
    }

    async saveBalanceHistory(balance, type = 'update') {
        if (!this.currentUser) return;
        
        try {
            const { addDoc, collection } = await import('https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js');
            await addDoc(collection(this.db, 'balanceHistory'), {
                userId: this.currentUser.uid,
                balance: balance,
                timestamp: new Date(),
                type: type
            });
        } catch (error) {
            console.error('Error saving balance history:', error);
        }
    }

    async getLeaderboard(limitCount = 10) {
        try {
            const { query, collection, orderBy, limit, getDocs } = await import('https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js');
            const q = query(
                collection(this.db, 'users'),
                orderBy('balance', 'desc'),
                limit(limitCount)
            );
            const querySnapshot = await getDocs(q);
            return querySnapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            }));
        } catch (error) {
            console.error('Error getting leaderboard:', error);
            return [];
        }
    }

    updateUIForLoggedInUser() {
        // Show user info in header
        const balanceContainer = document.querySelector('.balance-container');
        if (balanceContainer && this.currentUser) {
            const userInfo = document.createElement('div');
            userInfo.className = 'user-info';
            userInfo.innerHTML = `
                <span class="user-name">${this.currentUser.displayName || this.currentUser.email}</span>
                <button id="sign-out-btn" class="sign-out-btn">Sign Out</button>
            `;
            balanceContainer.appendChild(userInfo);
            
            // Add sign out functionality
            document.getElementById('sign-out-btn').addEventListener('click', () => {
                this.signOut();
            });
        }
        
        // Hide auth popup if open
        const authPopup = document.getElementById('auth-popup');
        if (authPopup) {
            authPopup.style.display = 'none';
        }
        
        // Load leaderboard
        this.loadLeaderboard();
    }

    updateUIForLoggedOutUser() {
        // Reset balance to zero when user signs out
        CasinoBalance.setBalance(0);
        
        // Remove user info from header
        const userInfo = document.querySelector('.user-info');
        if (userInfo) {
            userInfo.remove();
        }
        
        // Show auth popup
        const authPopup = document.getElementById('auth-popup');
        if (authPopup) {
            authPopup.style.display = 'flex';
        }
    }

    getErrorMessage(errorCode) {
        const errorMessages = {
            'auth/user-not-found': 'Incorrect email or password.',
            'auth/wrong-password': 'Incorrect email or password.',
            'auth/invalid-credential': 'Incorrect email or password.',
            'auth/invalid-email': 'Invalid email address.',
            'auth/user-disabled': 'This account has been disabled.',
            'auth/email-already-in-use': 'An account already exists with this email address.',
            'auth/weak-password': 'Password should be at least 6 characters.',
            'auth/too-many-requests': 'Too many failed attempts. Please try again later.',
            'auth/network-request-failed': 'Network error. Please check your connection.',
            'auth/operation-not-allowed': 'This sign-in method is not enabled.'
        };
        return errorMessages[errorCode] || 'Incorrect email or password.';
    }

    isUserLoggedIn() {
        return this.currentUser !== null;
    }

    getCurrentUser() {
        return this.currentUser;
    }

    async loadLeaderboard() {
        const leaderboardList = document.getElementById('leaderboard-list');
        if (!leaderboardList) return;

        try {
            const leaderboard = await this.getLeaderboard(10);
            
            if (leaderboard.length === 0) {
                leaderboardList.innerHTML = '<div class="leaderboard-error">No players found</div>';
                return;
            }

            leaderboardList.innerHTML = leaderboard.map((player, index) => {
                const rank = index + 1;
                const rankClass = rank <= 3 ? `rank-${rank}` : '';
                const displayName = player.username || player.email || 'Anonymous';
                const balance = Math.floor(player.balance || 0);
                
                return `
                    <div class="leaderboard-item" 
                         data-user-id="${player.id}" 
                         data-user-email="${player.email || displayName}"
                         onmouseenter="showBalanceHistory(event, '${player.id}', '${player.email || displayName}')"
                         onmouseleave="hideBalanceHistory()">
                        <div class="leaderboard-rank ${rankClass}">${rank}</div>
                        <div class="leaderboard-player">${displayName}</div>
                        <div class="leaderboard-balance">${balance.toLocaleString()} 🪙</div>
                    </div>
                `;
            }).join('');
        } catch (error) {
            console.error('Error loading leaderboard:', error);
            leaderboardList.innerHTML = '<div class="leaderboard-error">Failed to load leaderboard</div>';
        }
    }
}

// Enhanced CasinoBalance class with Firebase integration
class CasinoBalance {
    static getBalance() {
        const storedBalance = localStorage.getItem('casinoBalance');
        const sessionStarted = sessionStorage.getItem('casinoSessionStarted');
        
        // If no session is started (fresh page load), initialize with 0
        if (!sessionStarted) {
            sessionStorage.setItem('casinoSessionStarted', 'true');
            this.setBalance(0);
            return 0;
        }
        
        // If session exists, use stored balance or default to 0
        return parseInt(storedBalance) || 0;
    }

    static setBalance(amount) {
        const previous = parseInt(localStorage.getItem('casinoBalance')) || 0;
        if (previous === amount) {
            // No-op: avoid redundant UI updates and Firestore writes
            return;
        }
        localStorage.setItem('casinoBalance', amount);
        // Update all balance displays on the page
        const balanceElements = document.querySelectorAll('.balance-amount, .coin-balance');
        balanceElements.forEach(element => {
            element.textContent = Math.floor(amount);
        });
        
        // Save to Firebase if user is logged in
        if (window.casinoAuth && window.casinoAuth.isUserLoggedIn()) {
            window.casinoAuth.saveUserBalance(amount);
        }
    }

    static updateBalance(amount) {
        const currentBalance = this.getBalance();
        this.setBalance(currentBalance + amount);
    }
}

class Card {
    constructor(suit, value) {
        this.suit = suit;
        this.value = value;
    }

    get displayValue() {
        if (this.value === 1) return 'A';
        if (this.value === 11) return 'J';
        if (this.value === 12) return 'Q';
        if (this.value === 13) return 'K';
        return this.value.toString();
    }

    get numericValue() {
        if (this.value > 10) return 10;
        return this.value;
    }
}

class Deck {
    constructor() {
        this.cards = [];
        this.reset();
    }

    reset() {
        this.cards = [];
        const suits = ['♠', '♥', '♦', '♣'];
        for (let suit of suits) {
            for (let value = 1; value <= 13; value++) {
                this.cards.push(new Card(suit, value));
            }
        }
        this.shuffle();
    }

    shuffle() {
        for (let i = this.cards.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [this.cards[i], this.cards[j]] = [this.cards[j], this.cards[i]];
        }
    }

    draw() {
        return this.cards.pop();
    }
}

class BlackjackGame {
    constructor() {
        this.deck = new Deck();
        this.playerHand = [];
        this.dealerHand = [];
        this.balance = CasinoBalance.getBalance();
        this.currentBet = 10;
        this.gameInProgress = false;

        this.initializeElements();
        this.attachEventListeners();
        this.updateBalance();
    }

    initializeElements() {
        this.balanceElement = document.querySelector('.balance-amount');
        this.betElement = document.querySelector('.current-bet');
        this.dealerCardsElement = document.querySelector('.dealer-cards');
        this.playerCardsElement = document.querySelector('.player-cards');
        this.betBtn = document.querySelector('.bet-btn');
        this.hitBtn = document.querySelector('.hit-btn');
        this.standBtn = document.querySelector('.stand-btn');
        this.splitBtn = document.querySelector('.split-btn');
        this.betMaxBtn = document.querySelector('.bet-max');
        this.bet2xBtn = document.querySelector('.bet-2x');
        this.bet3xBtn = document.querySelector('.bet-3x');
        this.betHalfBtn = document.querySelector('.bet-half');
        // Render the deck card back
        const deckElem = document.querySelector('.deck');
        if (deckElem) {
            deckElem.innerHTML = '';
            deckElem.appendChild(this.createCardBackElement());
        }
    }

    attachEventListeners() {
        this.betBtn.addEventListener('click', () => {
            // If ace split is complete, finish the hands instead of starting new hand
            if (this.splitHands && this.splitResults[0] !== null && this.splitResults[1] !== null && this.betBtn.textContent === 'Continue') {
                this.finishSplitHands();
            } else {
                this.startNewHand();
            }
        });
        this.hitBtn.addEventListener('click', () => this.hit());
        this.standBtn.addEventListener('click', () => this.stand());
        this.splitBtn.addEventListener('click', () => this.splitHand());
        this.betMaxBtn.addEventListener('click', () => this.setMaxBet());
        this.bet2xBtn.addEventListener('click', () => this.multiplyBet(2));
        this.bet3xBtn.addEventListener('click', () => this.multiplyBet(3));
        this.betHalfBtn.addEventListener('click', () => this.multiplyBet(0.5));
        
        // Handle manual bet input
        this.betElement.addEventListener('input', (e) => {
            if (this.gameInProgress) return;
            let value = parseInt(e.target.value);
            if (isNaN(value)) value = 0;
            if (value < 0) value = 0;
            const currentBalance = CasinoBalance.getBalance();
            if (value > currentBalance) value = currentBalance;
            this.currentBet = value;
            e.target.value = value;
        });

        // Handle bet input blur
        this.betElement.addEventListener('blur', (e) => {
            let value = parseInt(e.target.value);
            if (isNaN(value) || value < 0) {
                value = 0;
                e.target.value = value;
            }
            const currentBalance = CasinoBalance.getBalance();
            if (value > currentBalance) {
                value = currentBalance;
                e.target.value = value;
            }
            this.currentBet = value;
        });
    }

    setMaxBet() {
        if (this.gameInProgress) return;
        // Get the current balance from CasinoBalance instead of using stale this.balance
        const currentBalance = CasinoBalance.getBalance();
        this.currentBet = currentBalance;
        this.betElement.value = this.currentBet;
        this.betElement.classList.add('highlight');
        setTimeout(() => this.betElement.classList.remove('highlight'), 500);
    }

    adjustBet(amount) {
        if (this.gameInProgress) return;
        const newBet = this.currentBet + amount;
        const currentBalance = CasinoBalance.getBalance();
        if (newBet >= 0 && newBet <= currentBalance) {
            this.currentBet = newBet;
            this.betElement.value = this.currentBet;
            this.betElement.classList.add('highlight');
            setTimeout(() => this.betElement.classList.remove('highlight'), 500);
        }
    }

    multiplyBet(multiplier) {
        if (this.gameInProgress) return;
        let newBet;
        
        if (multiplier === 0.5) {
            // For /2 button: handle odd numbers by splitting and betting the smaller
            const halfBet = this.currentBet / 2;
            if (halfBet % 1 !== 0) {
                // Odd number when divided by 2 (e.g., 15 / 2 = 7.5)
                // Split into two whole numbers and bet the smaller one
                newBet = Math.floor(halfBet); // 7.5 -> 7
            } else {
                // Even number when divided by 2 (e.g., 14 / 2 = 7)
                newBet = halfBet;
            }
        } else {
            // For 2x and 3x buttons: just multiply normally
            newBet = Math.floor(this.currentBet * multiplier);
        }
        
        const currentBalance = CasinoBalance.getBalance();
        if (newBet >= 1 && newBet <= currentBalance) {
            this.currentBet = newBet;
            this.betElement.value = this.currentBet;
            this.betElement.classList.add('highlight');
            setTimeout(() => this.betElement.classList.remove('highlight'), 500);
        }
    }

    updateBalance() {
        if (this.balanceElement) {
            this.balanceElement.textContent = Math.floor(this.balance);
        }
        // Update the coin tab at the top
        const coinTab = document.querySelector('.coin-balance');
        if (coinTab) coinTab.textContent = Math.floor(this.balance);
        // Save balance to localStorage
        CasinoBalance.setBalance(this.balance);
    }

    createCardBackElement() {
        const cardBack = document.createElement('div');
        cardBack.className = 'card card-back';
        cardBack.style.cssText = `
            background: linear-gradient(135deg, #fff8e1 0%, #f5e6c3 100%);
            width: 60px;
            height: 90px;
            border-radius: 8px;
            box-shadow: 0 4px 8px rgba(0,0,0,0.2), 0 0 0 2px #C5A572;
            position: relative;
            display: flex;
            align-items: center;
            justify-content: center;
            overflow: hidden;
        `;

        // Greek key pattern border
        const border = document.createElement('div');
        border.style.cssText = `
            position: absolute;
            inset: 4px;
            border: 2px solid #C5A572;
            border-radius: 4px;
            background: repeating-linear-gradient(
                45deg,
                #C5A572 0px,
                #C5A572 2px,
                transparent 2px,
                transparent 4px
            );
            pointer-events: none;
        `;
        cardBack.appendChild(border);

        // Column SVG image (centered)
        const column = document.createElement('img');
        column.src = 'images/column.svg';
        column.style.cssText = `
            width: 32px;
            height: 48px;
            position: absolute;
            left: 50%;
            top: 50%;
            transform: translate(-50%, -50%);
            z-index: 1;
            filter: invert(45%) sepia(40%) saturate(500%) hue-rotate(358deg) brightness(85%) contrast(95%);
        `;
        cardBack.appendChild(column);

        // Olive branch (top, flowy and elegant)
        const oliveTop = document.createElement('div');
        oliveTop.innerHTML = `
            <svg width="44" height="22" viewBox="0 0 44 22" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M4 18 Q22 2 40 18" stroke="#C5A572" stroke-width="2.2" fill="none"/>
                <ellipse cx="10" cy="13" rx="2.2" ry="1.1" fill="#C5A572"/>
                <ellipse cx="16" cy="9" rx="2.2" ry="1.1" fill="#C5A572"/>
                <ellipse cx="22" cy="6" rx="2.2" ry="1.1" fill="#C5A572"/>
                <ellipse cx="28" cy="9" rx="2.2" ry="1.1" fill="#C5A572"/>
                <ellipse cx="34" cy="13" rx="2.2" ry="1.1" fill="#C5A572"/>
            </svg>
        `;
        oliveTop.style.cssText = 'position:absolute; left:50%; top:2px; transform:translateX(-50%); z-index:2;';
        cardBack.appendChild(oliveTop);

        // Olive branch (bottom, mirrored)
        const oliveBottom = document.createElement('div');
        oliveBottom.innerHTML = `
            <svg width="44" height="22" viewBox="0 0 44 22" fill="none" xmlns="http://www.w3.org/2000/svg">
                <g transform="scale(1,-1) translate(0,-22)">
                    <path d="M4 18 Q22 2 40 18" stroke="#C5A572" stroke-width="2.2" fill="none"/>
                    <ellipse cx="10" cy="13" rx="2.2" ry="1.1" fill="#C5A572"/>
                    <ellipse cx="16" cy="9" rx="2.2" ry="1.1" fill="#C5A572"/>
                    <ellipse cx="22" cy="6" rx="2.2" ry="1.1" fill="#C5A572"/>
                    <ellipse cx="28" cy="9" rx="2.2" ry="1.1" fill="#C5A572"/>
                    <ellipse cx="34" cy="13" rx="2.2" ry="1.1" fill="#C5A572"/>
                </g>
            </svg>
        `;
        oliveBottom.style.cssText = 'position:absolute; left:50%; bottom:2px; transform:translateX(-50%); z-index:2;';
        cardBack.appendChild(oliveBottom);

        return cardBack;
    }

    createCardElement(card, noAnimations = false) {
        const cardElement = document.createElement('div');
        cardElement.className = 'card';
        
        if (card.suit === '?' && card.value === 0) {
            return this.createCardBackElement();
        }

        const isRed = card.suit === '♥' || card.suit === '♦';
        cardElement.style.cssText = `
            background: linear-gradient(135deg, #ffffff 0%, #f8f8f8 100%);
            color: ${isRed ? '#c62828' : '#2c3e50'};
            width: 60px;
            height: 90px;
            border-radius: 8px;
            box-shadow: 0 4px 8px rgba(0,0,0,0.2), 0 0 0 2px #C5A572;
            position: relative;
            display: flex;
            flex-direction: column;
            justify-content: center;
            align-items: center;
            overflow: hidden;
            ${noAnimations ? 'transition: none !important; opacity: 1 !important;' : ''}
        `;

        // Greek key pattern border
        const border = document.createElement('div');
        border.style.cssText = `
            position: absolute;
            inset: 4px;
            border: 2px solid #C5A572;
            border-radius: 4px;
            background: repeating-linear-gradient(
                45deg,
                #C5A572 0px,
                #C5A572 2px,
                transparent 2px,
                transparent 4px
            );
            pointer-events: none;
            opacity: 0.3;
        `;
        cardElement.appendChild(border);

        // Top-left corner
        const topLeft = document.createElement('div');
        topLeft.style.cssText = `
            position: absolute;
            top: 6px;
            left: 8px;
            font-size: 1.2rem;
            font-family: 'Cinzel', serif;
            font-weight: bold;
            text-align: left;
            line-height: 1;
            z-index: 2;
        `;
        topLeft.innerHTML = `${card.displayValue}${card.suit}`;

        // Bottom-right corner
        const bottomRight = document.createElement('div');
        bottomRight.style.cssText = `
            position: absolute;
            bottom: 6px;
            right: 8px;
            font-size: 1.2rem;
            font-family: 'Cinzel', serif;
            font-weight: bold;
            text-align: right;
            line-height: 1;
            transform: rotate(180deg);
            z-index: 2;
        `;
        bottomRight.innerHTML = `${card.displayValue}${card.suit}`;

        // Center suit
        const centerSuit = document.createElement('div');
        centerSuit.style.cssText = `
            position: absolute;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            font-size: 2rem;
            font-family: 'Cinzel', serif;
            color: inherit;
            z-index: 2;
        `;
        centerSuit.innerHTML = card.suit;

        cardElement.appendChild(topLeft);
        cardElement.appendChild(centerSuit);
        cardElement.appendChild(bottomRight);

        return cardElement;
    }

    calculateHandValue(hand) {
        let value = 0;
        let aces = 0;

        for (let card of hand) {
            if (card.value === 1) {
                aces++;
            } else {
                value += card.numericValue;
            }
        }

        for (let i = 0; i < aces; i++) {
            if (value + 11 <= 21) {
                value += 11;
            } else {
                value += 1;
            }
        }

        return value;
    }

    isNaturalBlackjack(hand) {
        return hand.length === 2 && this.calculateHandValue(hand) === 21;
    }

    async animateCardFlip(cardElement, newCard) {
        // Check if card is already squished down (from deal animation)
        const isAlreadySquished = cardElement.style.transform === 'scaleX(0)';
        
        if (!isAlreadySquished) {
            // Squish the face-down card first (for dealer's first card)
            cardElement.style.transition = 'transform 0.15s ease-in-out';
            cardElement.style.transform = 'scaleX(0)';
            await new Promise(resolve => setTimeout(resolve, 150));
        }
        
        // Replace with face-up card
        const newElement = this.createCardElement(newCard, true);
        cardElement.replaceWith(newElement);
        
        // Unsquish the face-up card
        newElement.style.transition = 'transform 0.15s ease-in-out';
        newElement.style.transform = 'scaleX(0)';
        
        // Force reflow
        newElement.offsetWidth;
        
        newElement.style.transform = 'scaleX(1)';
        
        await new Promise(resolve => setTimeout(resolve, 150));
        newElement.style.transition = '';
        newElement.style.transform = '';
    }

    async animateDealCardToHand(targetContainer, cardIndex, handOverride, noFade = false) {
        // Find the deck element
        const deck = document.querySelector('.deck');
        if (!deck) return;
        // Insert a placeholder card at the target index
        const placeholder = document.createElement('div');
        // Use the new card back for animation
        const tempCard = this.createCardBackElement();
        placeholder.className = tempCard.className;
        placeholder.style.cssText = tempCard.style.cssText;
        placeholder.innerHTML = tempCard.innerHTML;
        placeholder.style.opacity = '0'; // Always invisible
        if (cardIndex >= targetContainer.children.length) {
            targetContainer.appendChild(placeholder);
        } else {
            targetContainer.insertBefore(placeholder, targetContainer.children[cardIndex]);
        }
        // Get deck and placeholder positions (center points)
        const deckRect = deck.getBoundingClientRect();
        const phRect = placeholder.getBoundingClientRect();
        // Calculate gap between cards (from .dealer-cards or .player-cards)
        let gap = 0;
        const parentStyle = window.getComputedStyle(targetContainer);
        if (parentStyle && parentStyle.gap) {
            gap = parseFloat(parentStyle.gap) || 0;
        }
        const deckCenterX = deckRect.left + deckRect.width / 2;
        const deckCenterY = deckRect.top + deckRect.height / 2;
        const phCenterX = phRect.left + phRect.width / 2;
        const phCenterY = phRect.top + phRect.height / 2;
        // Create a card element to animate
        const animCard = this.createCardBackElement();
        animCard.className = 'dealing-card';
        animCard.style.position = 'fixed';
        animCard.style.left = `${deckCenterX - 30}px`;
        animCard.style.top = `${deckCenterY - 45}px`;
        animCard.style.width = '60px';
        animCard.style.height = '90px';
        animCard.style.borderRadius = '8px';
        animCard.style.transition = 'left 0.38s cubic-bezier(.7,1,.7,1), top 0.38s cubic-bezier(.7,1,.7,1), opacity 0.18s';
        document.body.appendChild(animCard);
        // Force reflow
        animCard.offsetWidth;
        // Animate directly to the placeholder center
        animCard.style.left = `${phCenterX - 30}px`;
        animCard.style.top = `${phCenterY - 45}px`;
        await new Promise(res => setTimeout(res, 400));
        
        if (!noFade) {
            animCard.style.opacity = '0';
            await new Promise(res => setTimeout(res, 120));
        }
        
        // Remove placeholder and insert real card in its place
        let realCard;
        if (handOverride) {
            realCard = this.createCardElement(handOverride[cardIndex]);
        } else {
            realCard = this.createCardElement(
                targetContainer === this.playerCardsElement
                    ? this.playerHand[this.playerHand.length - 1]
                    : (targetContainer === this.dealerCardsElement && cardIndex === 0
                        ? { suit: '?', value: 0 }
                        : this.dealerHand[this.dealerHand.length - 1])
            );
        }
        
        if (noFade) {
            // Check if this is the dealer's first card (should stay face-down, no animation)
            const isDealerFirstCard = targetContainer === this.dealerCardsElement && cardIndex === 0;
            
            if (isDealerFirstCard) {
                // Dealer's first card: just place it without animation
                placeholder.replaceWith(realCard);
            } else {
                // Use squish-down animation for all other cards
                animCard.style.transition = 'transform 0.15s ease-in-out';
                animCard.style.transform = 'scaleX(0)';
                await new Promise(res => setTimeout(res, 150)); // Wait for full squish
                placeholder.replaceWith(realCard);
                
                // Start unsquish animation and wait for it to complete
                realCard.style.transition = 'transform 0.15s ease-in-out';
                realCard.style.transform = 'scaleX(0)';
                
                // Force reflow
                realCard.offsetWidth;
                
                realCard.style.transform = 'scaleX(1)';
                await new Promise(res => setTimeout(res, 150)); // Wait for unsquish
                
                // Clean up transitions
                realCard.style.transition = '';
                realCard.style.transform = '';
            }
        } else {
            animCard.style.opacity = '0';
            await new Promise(res => setTimeout(res, 60));
            placeholder.replaceWith(realCard);
        }
        
        animCard.remove();
    }

    async animateCardReturnToDeck(cardElement) {
        // Find the deck element
        const deck = document.querySelector('.deck');
        if (!deck) return;
        
        // Get card and deck positions BEFORE hiding the original card
        const cardRect = cardElement.getBoundingClientRect();
        const deckRect = deck.getBoundingClientRect();
        
        // Hide the original card immediately
        cardElement.style.opacity = '0';
        
        // Create a clone of the card for animation
        const animCard = cardElement.cloneNode(true);
        animCard.style.position = 'fixed';
        animCard.style.left = `${cardRect.left}px`;
        animCard.style.top = `${cardRect.top}px`;
        animCard.style.width = `${cardRect.width}px`;
        animCard.style.height = `${cardRect.height}px`;
        animCard.style.transition = 'left 0.2s cubic-bezier(.7,1,.7,1), top 0.2s cubic-bezier(.7,1,.7,1), transform 0.2s cubic-bezier(.7,1,.7,1)';
        animCard.style.zIndex = '1';
        animCard.style.pointerEvents = 'none';
        animCard.style.opacity = '1';
        
        // Append to deck container (not body)
        deck.parentElement.appendChild(animCard);
        
        // Force reflow
        animCard.offsetWidth;
        
        // Animate to deck center position
        const deckCenterX = deckRect.left + deckRect.width / 2;
        const deckCenterY = deckRect.top + deckRect.height / 2 - 10;
        
        animCard.style.left = `${deckCenterX - cardRect.width / 2}px`;
        animCard.style.top = `${deckCenterY - cardRect.height / 2}px`;
        animCard.style.transform = 'rotate(180deg) scale(0.8)';
        
        // Wait for animation to complete
        await new Promise(resolve => setTimeout(resolve, 200));
        
        // Remove the animated card immediately (no fade)
        animCard.remove();
    }

    async clearExistingCards() {
        const playerCards = Array.from(this.playerCardsElement.children);
        const dealerCards = Array.from(this.dealerCardsElement.children);
        
        // Animate all existing cards returning to deck
        const animations = [];
        
        // Animate player cards
        for (let card of playerCards) {
            animations.push(this.animateCardReturnToDeck(card));
        }
        
        // Animate dealer cards
        for (let card of dealerCards) {
            animations.push(this.animateCardReturnToDeck(card));
        }
        
        // Wait for all animations to complete
        await Promise.all(animations);
        
        // Clear the card areas
        this.dealerCardsElement.innerHTML = '';
        this.playerCardsElement.innerHTML = '';
    }

    async startNewHand() {
        if (this.gameInProgress) return;
        
        // Check if user is signed in
        if (!window.casinoAuth || !window.casinoAuth.isUserLoggedIn()) {
            this.showSignInPrompt();
            return;
        }
        
        if (this.currentBet < 1) {
            this.showNotification('Minimum bet is 1');
            return;
        }
        const currentBalance = CasinoBalance.getBalance();
        if (this.currentBet > currentBalance) return;
        this.balance = currentBalance - this.currentBet;
        this.updateBalance();
        this.gameInProgress = true;
        this.deck.reset();
        this.playerHand = [];
        this.dealerHand = [];
        
        // Clear existing cards with animation if any exist
        await this.clearExistingCards();
        
        // Reset player cards area layout to default
        this.playerCardsElement.style.display = '';
        this.playerCardsElement.style.flexDirection = '';
        this.playerCardsElement.style.justifyContent = '';
        this.playerCardsElement.style.alignItems = '';
        this.playerCardsElement.style.gap = '';
        // Deal sequence: player, dealer, player, dealer (hidden)
        for (let i = 0; i < 2; i++) {
            // Player card
            this.playerHand.push(this.deck.draw());
            await this.animateDealCardToHand(this.playerCardsElement, this.playerHand.length - 1, null, true);
            // Dealer card
            this.dealerHand.push(this.deck.draw());
            await this.animateDealCardToHand(this.dealerCardsElement, this.dealerHand.length - 1, null, true);
        }
        this.updateSplitButtonState();
        this.betBtn.disabled = true;
        this.hitBtn.disabled = false;
        this.standBtn.disabled = false;
        this.updateSplitButtonState();
        
        // Check for natural blackjack
        if (this.isNaturalBlackjack(this.playerHand)) {
            await this.handleNaturalBlackjack();
        } else if (this.calculateHandValue(this.playerHand) === 21) {
            this.stand();
        }
    }

    async handleNaturalBlackjack() {
        // Disable all buttons immediately
        this.hitBtn.disabled = true;
        this.standBtn.disabled = true;
        this.splitBtn.disabled = true;
        
        // Check if dealer also has natural blackjack
        if (this.isNaturalBlackjack(this.dealerHand)) {
            // Both have natural blackjack - it's a push
            await this.endHand('tie');
            this.showNotification('Both have blackjack! Push!');
        } else {
            // Player wins with natural blackjack (1.5x payout)
            this.balance += Math.floor(this.currentBet * 2.5); // Original bet + 1.5x bonus
            await this.endHand('player');
            this.showNotification('Blackjack! You win!');
            this.showPlayerMessage('Blackjack!', '#FFD700', null, '#B8860B');
        }
    }

    async hit() {
        if (!this.gameInProgress) return;
        if (this.splitHands) {
            // In split mode, hit active hand
            const newCard = this.deck.draw();
            this.splitHands[this.splitActiveHand].push(newCard);
            // Animate the new card being dealt to the correct split hand
            // Find the correct handDiv in the DOM
            const handDivs = Array.from(this.playerCardsElement.querySelectorAll('.split-hand'));
            const handDiv = handDivs[this.splitActiveHand];
            if (handDiv) {
                await this.animateDealCardToHand(handDiv, handDiv.children.length, this.splitHands[this.splitActiveHand], true);
            }
            this.updateSplitUI();
            if (this.calculateHandValue(this.splitHands[this.splitActiveHand]) > 21) {
                this.showBustMessage(this.splitActiveHand);
                await new Promise(res => setTimeout(res, 800));
                this.splitResults[this.splitActiveHand] = 'bust';
                await this.nextSplitHand();
            }
            this.updateSplitButtonState();
            return;
        }
        this.playerHand.push(this.deck.draw());
        await this.animateDealCardToHand(this.playerCardsElement, this.playerHand.length - 1, null, true);
        if (this.calculateHandValue(this.playerHand) > 21) {
            this.showBustMessage();
            // Disable buttons immediately when player busts
            this.hitBtn.disabled = true;
            this.standBtn.disabled = true;
            this.splitBtn.disabled = true;
            setTimeout(async () => {
                await this.endHand('dealer');
            }, 1200);
        }
        this.updateSplitButtonState();
    }

    showBustMessage(splitHandIdx = null) {
        this.showPlayerMessage('Bust!', '#ff4444', splitHandIdx);
    }

    async stand() {
        if (!this.gameInProgress) return;
        if (this.splitHands) {
            this.splitResults[this.splitActiveHand] = this.calculateHandValue(this.splitHands[this.splitActiveHand]);
            await this.nextSplitHand();
            this.updateSplitButtonState();
            return;
        }
        
        // Disable buttons immediately when player stands
        this.hitBtn.disabled = true;
        this.standBtn.disabled = true;
        this.splitBtn.disabled = true;
        
        // Don't flip the card yet - keep it face down until dealer draws

        while (this.calculateHandValue(this.dealerHand) < 17) {
            // Flip the face-down card before drawing the first additional card
            if (this.dealerHand.length === 2) {
                // Find the face-down card (should be the first dealer card)
                const dealerCards = this.dealerCardsElement.children;
                if (dealerCards.length >= 2) {
                    const faceDownCard = dealerCards[0]; // First card is face-down
                    if (faceDownCard) {
                        await this.animateCardFlip(faceDownCard, this.dealerHand[0]);
                    }
                }
            }
            
            this.dealerHand.push(this.deck.draw());
            
            // Deal the card with animation (creates face-up card directly)
            await this.animateDealCardToHand(this.dealerCardsElement, this.dealerHand.length - 1, null, true);
        }

        const playerValue = this.calculateHandValue(this.playerHand);
        const dealerValue = this.calculateHandValue(this.dealerHand);

        if (dealerValue > 21) {
            await this.endHand('dealer-bust');
        } else if (dealerValue > playerValue) {
            await this.endHand('dealer');
        } else if (dealerValue < playerValue) {
            await this.endHand('player');
        } else {
            await this.endHand('tie');
        }
        this.updateSplitButtonState();
    }

    showNotification(message) {
        const notification = document.querySelector('.notification');
        notification.textContent = message;
        notification.style.display = 'block';
        notification.classList.remove('show');
        // Restart animation
        void notification.offsetWidth;
        notification.classList.add('show');
        setTimeout(() => {
            notification.style.display = 'none';
        }, 2500);
    }

    async endHand(winner) {
        this.gameInProgress = false;
        this.betBtn.disabled = false;
        this.hitBtn.disabled = true;
        this.standBtn.disabled = true;

        // First, flip the face-down card if it exists and hasn't been flipped yet
        if (this.dealerHand.length >= 2) {
            const dealerCards = this.dealerCardsElement.children;
            if (dealerCards.length >= 2) {
                const faceDownCard = dealerCards[0]; // First card is face-down
                if (faceDownCard && faceDownCard.classList.contains('card-back')) {
                    await this.animateCardFlip(faceDownCard, this.dealerHand[0]);
                }
            }
        }

        // Always reveal dealer's full hand
        this.dealerCardsElement.innerHTML = '';
        for (let card of this.dealerHand) {
            this.dealerCardsElement.appendChild(this.createCardElement(card));
        }

        if (winner === 'player') {
            this.balance += this.currentBet * 2;
            this.showNotification('You win!');
            this.showPlayerMessage('You Win!', '#FFD700', null, '#B8860B');
            this.showDealerMessage('Dealer Loses!', '#ff4444');
        } else if (winner === 'tie') {
            this.balance += this.currentBet;
            this.showNotification('Push!');
            this.showPlayerMessage('Push!', '#3399ff');
        } else if (winner === 'dealer-bust') {
            this.balance += this.currentBet * 2;
            this.showNotification('Dealer busts! You win!');
            this.showPlayerMessage('You Win!', '#FFD700', null, '#B8860B');
            this.showDealerMessage('Dealer Busts!', '#ff4444');
        } else {
            this.showNotification('Dealer wins!');
            this.showDealerMessage('Dealer Wins!', '#FFD700');
        }

        this.updateBalance();
        // Reset the deck for the next round
        this.deck.reset();
    }

    showPlayerMessage(msg, color, splitHandIdx = null, outline = null) {
        // If splitHandIdx is null, show overlay over the whole player hand area
        if (splitHandIdx === null) {
            const area = this.playerCardsElement.closest('.cards-area');
            let old = area.querySelector('.feedback-overlay');
            if (old) old.remove();
            let msgDiv = document.createElement('div');
            msgDiv.className = 'feedback-overlay';
            msgDiv.textContent = msg;
            msgDiv.style.position = 'absolute';
            msgDiv.style.left = '50%';
            msgDiv.style.top = '50%';
            msgDiv.style.transform = 'translate(-50%, -50%)';
            msgDiv.style.pointerEvents = 'none';
            msgDiv.style.color = color;
            msgDiv.style.fontFamily = "'Cinzel', serif";
            msgDiv.style.fontWeight = 'bold';
            msgDiv.style.fontSize = '2rem';
            if (outline) {
                msgDiv.style.textShadow = `0 0 10px ${outline}cc, 0 0 2px #fff, 0 0 4px ${outline}`;
            } else {
                msgDiv.style.textShadow = `0 0 10px ${color}cc, 0 0 2px #fff`;
            }
            msgDiv.style.animation = 'fadeInBust 0.5s';
            msgDiv.style.zIndex = 10;
            area.style.position = 'relative';
            area.appendChild(msgDiv);
            setTimeout(() => {
                if (msgDiv.parentNode) msgDiv.parentNode.removeChild(msgDiv);
            }, 1200);
        } else {
            // For split hands, overlay over the specific split-hand div
            const handDivs = Array.from(this.playerCardsElement.querySelectorAll('.split-hand'));
            const handDiv = handDivs[splitHandIdx];
            if (!handDiv) return;
            let old = handDiv.querySelector('.feedback-overlay');
            if (old) old.remove();
            let msgDiv = document.createElement('div');
            msgDiv.className = 'feedback-overlay';
            msgDiv.textContent = msg;
            msgDiv.style.position = 'absolute';
            msgDiv.style.left = '50%';
            msgDiv.style.top = '50%';
            msgDiv.style.transform = 'translate(-50%, -50%)';
            msgDiv.style.pointerEvents = 'none';
            msgDiv.style.color = color;
            msgDiv.style.fontFamily = "'Cinzel', serif";
            msgDiv.style.fontWeight = 'bold';
            msgDiv.style.fontSize = '2rem';
            if (outline) {
                msgDiv.style.textShadow = `0 0 10px ${outline}cc, 0 0 2px #fff, 0 0 4px ${outline}`;
            } else {
                msgDiv.style.textShadow = `0 0 10px ${color}cc, 0 0 2px #fff`;
            }
            msgDiv.style.animation = 'fadeInBust 0.5s';
            msgDiv.style.zIndex = 10;
            handDiv.style.position = 'relative';
            handDiv.appendChild(msgDiv);
            setTimeout(() => {
                if (msgDiv.parentNode) msgDiv.parentNode.removeChild(msgDiv);
            }, 1200);
        }
    }

    showDealerMessage(msg, color) {
        // Remove any existing overlay
        const area = this.dealerCardsElement.closest('.cards-area');
        let old = area.querySelector('.feedback-overlay');
        if (old) old.remove();
        let msgDiv = document.createElement('div');
        msgDiv.className = 'feedback-overlay';
        msgDiv.textContent = msg;
        msgDiv.style.color = color;
        msgDiv.style.fontFamily = "'Cinzel', serif";
        msgDiv.style.fontWeight = 'bold';
        msgDiv.style.fontSize = '2rem';
        msgDiv.style.textShadow = `0 0 10px ${color}cc, 0 0 2px #fff`;
        msgDiv.style.animation = 'fadeInBust 0.5s';
        area.appendChild(msgDiv);
        setTimeout(() => {
            if (msgDiv.parentNode) msgDiv.parentNode.removeChild(msgDiv);
        }, 1200);
    }

    splitHand() {
        // Only allow split if first two cards are same value and enough balance
        if (!this.gameInProgress || this.playerHand.length !== 2) return;
        if (this.playerHand[0].numericValue !== this.playerHand[1].numericValue) return;
        const currentBalance = CasinoBalance.getBalance();
        if (currentBalance < this.currentBet) {
            this.showNotification('Not enough balance to split!');
            return;
        }
        // Deduct second bet
        this.balance = currentBalance - this.currentBet;
        this.updateBalance();
        // Create two hands
        this.splitActiveHand = 0; // 0 or 1
        this.splitHands = [
            [this.playerHand[0]],
            [this.playerHand[1]]
        ];
        this.splitResults = [null, null];
        // Deal one card to each hand
        this.splitHands[0].push(this.deck.draw());
        this.splitHands[1].push(this.deck.draw());
        // If splitting aces, only one card per hand and auto-stand
        if (this.playerHand[0].value === 1 && this.playerHand[1].value === 1) {
            this.showNotification('Split aces: Only one card per hand!');
            this.playSplitHands(true);
        } else {
            this.showNotification('Playing split hands...');
            this.playSplitHands(false);
        }
        this.updateSplitButtonState();
    }

    async playSplitHands(isAceSplit) {
        // Clear player cards area
        this.playerCardsElement.innerHTML = '';
        this.playerCardsElement.style.display = 'flex';
        this.playerCardsElement.style.flexDirection = 'row';
        this.playerCardsElement.style.justifyContent = 'center';
        this.playerCardsElement.style.alignItems = 'center';
        this.playerCardsElement.style.gap = '0';

        // Create containers for each hand
        const handDivs = [document.createElement('div'), document.createElement('div')];
        for (let i = 0; i < 2; i++) {
            handDivs[i].className = 'split-hand';
            handDivs[i].style.display = 'flex';
            handDivs[i].style.flexDirection = 'row';
            handDivs[i].style.gap = '0.5rem';
            // Render the original card
            const cardElem0 = this.createCardElement(this.splitHands[i][0]);
            handDivs[i].appendChild(cardElem0);
        }

        // Create ghost card for spacing
        const ghost = document.createElement('div');
        ghost.className = 'card ghost-card';
        ghost.style.opacity = '0';
        ghost.style.width = '60px';
        ghost.style.height = '90px';
        ghost.style.margin = '0 1.5rem';

        // Insert ghost card between the two hands
        this.playerCardsElement.appendChild(handDivs[0]);
        this.playerCardsElement.appendChild(ghost);
        this.playerCardsElement.appendChild(handDivs[1]);

        // Deal one card to each hand (random from deck as normal)
        this.splitHands[0][1] = this.deck.draw();
        this.splitHands[1][1] = this.deck.draw();

        // Animate dealing the new card to each hand
        for (let i = 0; i < 2; i++) {
            await this.animateDealCardToHand(handDivs[i], 1, this.splitHands[i], true);
            // Add glow only to the active hand
            if (i === this.splitActiveHand) {
                for (let cardElem of handDivs[i].children) {
                    cardElem.style.boxShadow = '0 0 12px 2px #FFD700';
                }
            } else {
                // Ensure no glow on inactive hands
                for (let cardElem of handDivs[i].children) {
                    cardElem.style.boxShadow = '';
                }
            }
        }

        // If ace split, auto-stand both hands but let player see them
        if (isAceSplit) {
            this.splitResults[0] = this.calculateHandValue(this.splitHands[0]);
            this.splitResults[1] = this.calculateHandValue(this.splitHands[1]);
            // Disable all buttons since both hands are complete
            this.hitBtn.disabled = true;
            this.standBtn.disabled = true;
            this.splitBtn.disabled = true;
            // Update bet button to proceed to dealer
            this.betBtn.textContent = 'Continue';
            this.betBtn.disabled = false;
            // Show notification that both hands are complete
            this.showNotification('Ace split: Both hands complete!');
            return;
        }

        // Play out each hand
        this.hitBtn.disabled = false;
        this.standBtn.disabled = false;
        this.splitBtn.disabled = true;
        this.playerHand = this.splitHands[this.splitActiveHand];
        this.updateSplitUI();
    }

    updateSplitUI() {
        // Re-render both hands, highlight active
        this.playerCardsElement.innerHTML = '';
        this.playerCardsElement.style.display = 'flex';
        this.playerCardsElement.style.flexDirection = 'row';
        this.playerCardsElement.style.justifyContent = 'center';
        this.playerCardsElement.style.alignItems = 'center';
        this.playerCardsElement.style.gap = '0';

        const handDivs = [];
        for (let i = 0; i < 2; i++) {
            const handDiv = document.createElement('div');
            handDiv.className = 'split-hand';
            handDiv.style.display = 'flex';
            handDiv.style.flexDirection = 'row';
            handDiv.style.gap = '0.5rem';
            for (let j = 0; j < this.splitHands[i].length; j++) {
                const cardElem = this.createCardElement(this.splitHands[i][j]);
                // Only add glow to the currently active hand
                if (i === this.splitActiveHand) {
                    cardElem.style.boxShadow = '0 0 12px 2px #FFD700';
                } else {
                    // Ensure no glow on inactive hands
                    cardElem.style.boxShadow = '';
                }
                handDiv.appendChild(cardElem);
            }
            handDivs.push(handDiv);
        }

        // Insert ghost card between the two hands
        const ghost = document.createElement('div');
        ghost.className = 'card ghost-card';
        ghost.style.opacity = '0';
        ghost.style.width = '60px';
        ghost.style.height = '90px';
        ghost.style.margin = '0 1.5rem';

        this.playerCardsElement.appendChild(handDivs[0]);
        this.playerCardsElement.appendChild(ghost);
        this.playerCardsElement.appendChild(handDivs[1]);
    }

    async nextSplitHand() {
        // Move to next hand or finish
        if (this.splitActiveHand === 0) {
            this.splitActiveHand = 1;
            this.playerHand = this.splitHands[1];
            this.updateSplitUI();
            this.hitBtn.disabled = false;
            this.standBtn.disabled = false;
        } else {
            this.finishSplitHands();
        }
    }

    async finishSplitHands() {
        // Play dealer hand
        this.hitBtn.disabled = true;
        this.standBtn.disabled = true;
        this.splitBtn.disabled = true;
        
        // Always reveal the dealer's face-down card first
        const dealerCards = this.dealerCardsElement.children;
        if (dealerCards.length >= 2) {
            const faceDownCard = dealerCards[0]; // First card is face-down
            if (faceDownCard) {
                await this.animateCardFlip(faceDownCard, this.dealerHand[0]);
            }
        }
        
        // Now play dealer hand
        while (this.calculateHandValue(this.dealerHand) < 17) {
            this.dealerHand.push(this.deck.draw());
            
            // Deal the card with animation (creates face-up card directly)
            await this.animateDealCardToHand(this.dealerCardsElement, this.dealerHand.length - 1, null, true);
        }
        // Compare both hands to dealer
        let dealerBustShown = false;
        let totalWinnings = 0;
        let totalLosses = 0;
        
        for (let i = 0; i < 2; i++) {
            let playerValue = typeof this.splitResults[i] === 'number' ? this.splitResults[i] : this.calculateHandValue(this.splitHands[i]);
            let dealerValue = this.calculateHandValue(this.dealerHand);
            let bet = this.currentBet;
            
            if (playerValue === 'bust' || playerValue > 21) {
                this.showNotification(`Hand ${i + 1}: Bust!`);
                totalLosses += bet;
                this.showPlayerMessage('Bust!', '#ff4444', i);
            } else if (dealerValue > 21) {
                // Player wins when dealer busts
                totalWinnings += bet * 2; // Original bet + winnings
                this.showNotification(`Hand ${i + 1}: Dealer busts! You win!`);
                this.showPlayerMessage('You Win!', '#FFD700', i, '#B8860B');
                if (!dealerBustShown) {
                    this.showDealerMessage('Dealer Busts!', '#ff4444');
                    dealerBustShown = true;
                }
            } else if (playerValue > dealerValue) {
                // Player wins with higher value
                totalWinnings += bet * 2; // Original bet + winnings
                this.showNotification(`Hand ${i + 1}: You win!`);
                this.showPlayerMessage('You Win!', '#FFD700', i, '#B8860B');
                if (!dealerBustShown) {
                    this.showDealerMessage('Dealer Loses!', '#ff4444');
                    dealerBustShown = true;
                }
            } else if (playerValue < dealerValue) {
                // Player loses
                totalLosses += bet;
                this.showNotification(`Hand ${i + 1}: Dealer wins!`);
                this.showPlayerMessage('You Lose!', '#ff4444', i);
            } else {
                // Push - return original bet
                totalWinnings += bet;
                this.showNotification(`Hand ${i + 1}: Push!`);
                this.showPlayerMessage('Push!', '#3399ff', i);
            }
        }
        
        // Apply net change to balance
        this.balance += totalWinnings - totalLosses;
        this.updateBalance();
        this.splitHands = null;
        this.splitResults = null;
        this.splitActiveHand = null;
        this.gameInProgress = false;
        this.betBtn.disabled = false;
        this.hitBtn.disabled = true;
        this.standBtn.disabled = true;
    }

    updateSplitButtonState() {
        // Enable split if player has two cards of the same rank and enough balance, and not already split
        const currentBalance = CasinoBalance.getBalance();
        if (
            this.gameInProgress &&
            !this.splitHands &&
            this.playerHand.length === 2 &&
            this.playerHand[0].value === this.playerHand[1].value &&
            currentBalance >= this.currentBet
        ) {
            this.splitBtn.disabled = false;
        } else {
            this.splitBtn.disabled = true;
        }
    }

    showSignInPrompt() {
        this.showNotification('Please sign in to play games!', '#ff4444');
        
        // Show auth popup after a short delay
        setTimeout(() => {
            const authPopup = document.getElementById('auth-popup');
            if (authPopup) {
                authPopup.style.display = 'flex';
            }
        }, 1000);
    }
}

// Plinko Game Implementation
class PlinkoGame {
    constructor() {
        this.canvas = document.getElementById('plinko-canvas');
        if (!this.canvas) return; // Exit if not on plinko page
        
        this.ctx = this.canvas.getContext('2d');
        this.width = this.canvas.width;
        this.height = this.canvas.height;
        this.slots = 15;
        this.rows = 16;
        this.pegs = [];
        this.balls = [];
        this.bet = 10;
        this.balance = CasinoBalance.getBalance();
        this.isDropping = false;
        this.isAutoMode = false;
        this.autoInterval = null;
        this.payouts = [128, 32, 8, 2, 1, 0.5, 0.2, 0.2, 0.2, 0.5, 1, 2, 8, 32, 128];
        this.pegRadius = 6;
        this.ballRadius = 8;
        this.ballDropCount = 0; // Track number of balls dropped
        this.accumulatedWinnings = 0; // Track winnings during auto mode
        this.pendingAutoPayout = false; // Add to balance after all balls resolve
        this.autoPausedForFunds = false; // Auto paused awaiting payout to refill
        this.shouldResumeAfterPayout = false; // Resume auto after payout if possible
        this.userRequestedStop = false; // Explicit stop pressed by user
        
        this.balanceElement = document.querySelector('.balance-amount');
        this.notificationStack = document.querySelector('.plinko-notification-stack');
        this.betInput = document.getElementById('sidebar-bet-amount');
        this.betMultBtn = document.querySelector('.sidebar-bet-mult');
        this.betMaxBtn = document.querySelector('.sidebar-bet-max');
        this.betBtn = document.querySelector('.sidebar-bet-btn');
        this.manualTab = document.querySelector('.sidebar-tab[data-mode="manual"]');
        this.autoTab = document.querySelector('.sidebar-tab[data-mode="auto"]');
        this.winningsContainer = document.getElementById('winnings-container');
        this.winningsAmount = document.getElementById('winnings-amount');
        
        this.initPegs();
        this.initControls();
        this.updateBalance();
        this.updateWinningsDisplay();
        
        // Refresh balance when page becomes visible (in case user switched from another game)
        document.addEventListener('visibilitychange', () => {
            if (!document.hidden) {
                this.balance = CasinoBalance.getBalance();
                this.updateBalance();
            }
        });
        
        // Start animation loop to keep pegs visible
        this.startAnimationLoop();
    }

    initPegs() {
        this.pegs = [];
        // Equilateral triangle grid, 16 rows, 1 to 17 pegs per row
        const pegRows = this.rows;
        const pegCols = this.slots + 1; // There are always one more peg than slots in the last row
        const sidePadding = 12;
        const pegSpacingX = (this.width - 2 * sidePadding) / (pegCols - 1);
        const pegSpacingY = pegSpacingX * Math.sqrt(3) / 2;
        const totalHeight = pegSpacingY * (pegRows - 1);
        const yOffset = (this.height - totalHeight) / 2;
        this.lastRowPegXs = [];
        for (let row = 2; row < pegRows; row++) {
            let pegsInRow = row + 1;
            let y = yOffset + row * pegSpacingY;
            let totalWidth = (pegsInRow - 1) * pegSpacingX;
            let startX = (this.width - totalWidth) / 2;
            for (let col = 0; col < pegsInRow; col++) {
                let x = startX + col * pegSpacingX;
                this.pegs.push({ x, y });
                if (row === pegRows - 1) {
                    this.lastRowPegXs.push(x);
                }
            }
        }
        this.lastRowY = yOffset + (pegRows - 1) * pegSpacingY;
        this.pegSpacingX = pegSpacingX;
        this.sidePadding = sidePadding;
    }

    initControls() {
        const dropBtn = document.querySelector('.plinko-drop-btn');
        const betMinusBtn = document.querySelector('.plinko-bet-minus');
        const betPlusBtn = document.querySelector('.plinko-bet-plus');
        
        if (dropBtn) dropBtn.onclick = () => this.dropBall();
        if (betMinusBtn) betMinusBtn.onclick = () => this.adjustBet(-10);
        if (betPlusBtn) betPlusBtn.onclick = () => this.adjustBet(10);
        
        // Initialize mode tabs
        if (this.manualTab && this.autoTab) {
            this.manualTab.onclick = () => this.setMode('manual');
            this.autoTab.onclick = () => this.setMode('auto');
        }

        // Initialize bet/start button
        if (this.betBtn) {
            this.betBtn.onclick = () => {
                if (this.isAutoMode) {
                    this.toggleAutoDrop();
                } else {
                    const betInput = document.getElementById('sidebar-bet-amount');
                    let betValue = parseInt(betInput.value, 10);
                    if (isNaN(betValue) || betValue < 1) betValue = 1;
                    this.bet = betValue;
                    this.dropBall();
                }
            };
        }

        // Sidebar 2x button event
        if (this.betMultBtn) {
            this.betMultBtn.style.cursor = 'pointer';
            this.betMultBtn.onclick = () => {
                const betInput = document.getElementById('sidebar-bet-amount');
                let betValue = parseInt(betInput.value, 10);
                if (isNaN(betValue) || betValue < 1) betValue = 1;
                let doubled = betValue * 2;
                betInput.value = doubled;
                betInput.classList.add('highlight-bet');
                setTimeout(() => betInput.classList.remove('highlight-bet'), 200);
            };
        }

        // Sidebar Max button event
        if (this.betMaxBtn) {
            this.betMaxBtn.onclick = () => {
                this.betInput.value = Math.floor(this.balance);
                this.betInput.classList.add('highlight-bet');
                setTimeout(() => this.betInput.classList.remove('highlight-bet'), 200);
            };
        }

        this.setBetControlsEnabled(true);
        this.updateBetDisplay();
        this.updateBalance();
    }

    setMode(mode) {
        this.isAutoMode = mode === 'auto';
        if (this.manualTab && this.autoTab) {
            this.manualTab.classList.toggle('active', !this.isAutoMode);
            this.autoTab.classList.toggle('active', this.isAutoMode);
        }
        if (this.betBtn) {
            this.betBtn.textContent = this.isAutoMode ? 'Start' : 'Bet';
        }
        // Reset accumulated winnings UI when switching modes
        if (!this.isAutoMode) {
            this.accumulatedWinnings = 0;
            this.updateWinningsDisplay();
        }
        // Stop auto dropping if switching to manual mode
        if (!this.isAutoMode && this.autoInterval) {
            this.toggleAutoDrop();
        }
        // Ensure winnings container visibility reflects current mode immediately
        this.updateWinningsDisplay();
    }

    toggleAutoDrop() {
        // Consider paused/waiting states as 'running' for stop purposes
        if (this.autoInterval || this.autoPausedForFunds || this.pendingAutoPayout || this.shouldResumeAfterPayout) {
            clearInterval(this.autoInterval);
            this.autoInterval = null;
            this.betBtn.textContent = 'Start';
            // On stop: wait until all balls have completed before adding to balance
            this.userRequestedStop = true;
            if (this.balls.length > 0) {
                this.pendingAutoPayout = true;
            } else {
                this.addWinningsToBalance();
            }
            // Cancel any auto-resume intentions
            this.autoPausedForFunds = false;
            this.shouldResumeAfterPayout = false;
        } else {
            const betInput = document.getElementById('sidebar-bet-amount');
            let betValue = parseInt(betInput.value, 10);
            if (isNaN(betValue) || betValue < 1) betValue = 1;
            this.bet = betValue;
            // Reset accumulator on start of auto
            this.accumulatedWinnings = 0;
            this.updateWinningsDisplay();
            this.userRequestedStop = false;
            this.autoInterval = setInterval(() => {
                // Drop 3 balls per interval
                for (let i = 0; i < 3; i++) {
                    // Get fresh balance before checking
                    this.balance = CasinoBalance.getBalance();
                    
                    if (this.balance >= this.bet) {
                        this.dropBall();
                    } else {
                        // Pause auto: wait until existing balls resolve, then payout and try to resume
                        this.autoPausedForFunds = true;
                        // Only plan to resume if the user didn't press Stop
                        this.shouldResumeAfterPayout = !this.userRequestedStop;
                        if (this.balls.length > 0) {
                            this.pendingAutoPayout = true;
                        }
                        clearInterval(this.autoInterval);
                        this.autoInterval = null;
                        // Keep showing 'Stop' to indicate auto is still active (waiting)
                        this.betBtn.textContent = 'Stop';
                        // If there are no balls in flight, payout immediately and try to resume
                        if (this.balls.length === 0) {
                            this.addWinningsToBalance();
                            if (!this.userRequestedStop && this.balance >= this.bet) {
                                this.restartAutoInterval();
                            } else {
                                this.autoPausedForFunds = false;
                                this.shouldResumeAfterPayout = false;
                                this.showNotification('Not enough balance!', null);
                                // Truly stopped due to insufficient funds -> show Start
                                this.betBtn.textContent = 'Start';
                            }
                        }
                        break;
                    }
                }
            }, 200); // Drop balls every 200ms (15 times per second)
            this.betBtn.textContent = 'Stop';
        }
    }

    updateBalance() {
        if (this.balanceElement) {
            // Show actual balance only; accumulated shown separately
            this.balanceElement.textContent = Math.floor(this.balance);
        }
        // Update the coin tab at the top
        const coinTab = document.querySelector('.coin-balance');
        if (coinTab) coinTab.textContent = Math.floor(this.balance);
        // Save balance to localStorage
        CasinoBalance.setBalance(this.balance);
    }

    showNotification(message, color) {
        if (this.notificationStack) {
            const notif = document.createElement('div');
            notif.className = 'plinko-notification';
            notif.textContent = message;
            if (color) notif.style.setProperty('--notif-accent', color);
            this.notificationStack.prepend(notif);
            while (this.notificationStack.children.length > 8) {
                this.notificationStack.lastChild.remove();
            }
        }
    }

    adjustBet(amount) {
        if (this.isDropping) return;
        const newBet = this.bet + amount;
        if (newBet >= 10 && newBet <= 1000) {
            this.bet = newBet;
            this.updateBetDisplay();
        }
    }

    updateBetDisplay() {
        const betElement = document.querySelector('.plinko-current-bet');
        if (betElement) {
            betElement.textContent = this.bet;
        }
    }

    setBetControlsEnabled(enabled) {
        if (this.betInput) {
            this.betInput.disabled = !enabled;
            if (!enabled) {
                this.betInput.classList.add('bet-disabled');
            } else {
                this.betInput.classList.remove('bet-disabled');
            }
        }
        if (this.betMultBtn) {
            this.betMultBtn.style.pointerEvents = enabled ? 'auto' : 'none';
            this.betMultBtn.classList.toggle('bet-disabled', !enabled);
        }
        if (this.betMaxBtn) {
            this.betMaxBtn.style.pointerEvents = enabled ? 'auto' : 'none';
            this.betMaxBtn.classList.toggle('bet-disabled', !enabled);
        }
        // Also toggle the class on the input group container
        const betInputGroup = document.querySelector('.sidebar-bet-input-group');
        if (betInputGroup) {
            if (!enabled) {
                betInputGroup.classList.add('bet-disabled');
            } else {
                betInputGroup.classList.remove('bet-disabled');
            }
        }
    }

    dropBall() {
        if (this.balls.length > 100) return; // Increased from 40 to handle more balls
        
        // Check if user is signed in
        if (!window.casinoAuth || !window.casinoAuth.isUserLoggedIn()) {
            this.showSignInPrompt();
            return;
        }
        
        // Get fresh balance before checking
        this.balance = CasinoBalance.getBalance();
        
        if (this.balance < this.bet) {
            this.showNotification('Not enough balance!', null);
            return;
        }
        this.balance -= this.bet;
        this.updateBalance();
        const startX = this.width / 2;
        const firstPegY = this.pegs.length > 0 ? this.pegs[0].y : 40;
        const startY = firstPegY - 30;
        // Add slight random offset to starting position
        const randomOffset = (Math.random() - 0.5) * 20;
        // Increment drop count and set physics mode
        this.ballDropCount = (this.ballDropCount + 1) % 10;
        const useOldPhysics = this.ballDropCount === 0;
        this.balls.push({ 
            x: startX + randomOffset, 
            y: startY, 
            vx: 0, 
            vy: 0, 
            radius: this.ballRadius, 
            resolved: false,
            useOldPhysics
        });
        if (!this.isDropping) {
            this.isDropping = true;
            this.setBetControlsEnabled(false);
            this.animate();
        }
    }

    animate() {
        this.update();
        this.draw();
        if (this.balls.length > 0) {
            requestAnimationFrame(() => this.animate());
        } else {
            this.isDropping = false;
            this.setBetControlsEnabled(true);
            // If auto was stopped and winnings are pending, pay out now
            if (!this.autoInterval && this.pendingAutoPayout) {
                this.pendingAutoPayout = false;
                this.addWinningsToBalance();
                // If we paused due to funds, try to resume after payout
                if (this.shouldResumeAfterPayout && !this.userRequestedStop) {
                    this.shouldResumeAfterPayout = false;
                    this.autoPausedForFunds = false;
                    if (this.balance >= this.bet) {
                        this.restartAutoInterval();
                    } else {
                        this.showNotification('Not enough balance!', null);
                        // Cannot resume -> reflect stopped state
                        this.betBtn.textContent = 'Start';
                    }
                } else {
                    // Cleanup flags if user stopped
                    this.autoPausedForFunds = false;
                    this.shouldResumeAfterPayout = false;
                    // If user stopped, ensure button shows Start
                    if (this.betBtn) this.betBtn.textContent = 'Start';
                }
            }
        }
    }

    restartAutoInterval() {
        if (this.autoInterval) return;
        this.autoInterval = setInterval(() => {
            for (let i = 0; i < 3; i++) {
                this.balance = CasinoBalance.getBalance();
                if (this.balance >= this.bet) {
                    this.dropBall();
                } else {
                    this.autoPausedForFunds = true;
                    this.shouldResumeAfterPayout = !this.userRequestedStop;
                    if (this.balls.length > 0) {
                        this.pendingAutoPayout = true;
                    }
                    clearInterval(this.autoInterval);
                    this.autoInterval = null;
                    // Keep showing 'Stop' to indicate auto is still active (waiting)
                    this.betBtn.textContent = 'Stop';
                    if (this.balls.length === 0) {
                        this.addWinningsToBalance();
                        if (!this.userRequestedStop && this.balance >= this.bet) {
                            this.restartAutoInterval();
                        } else {
                            this.autoPausedForFunds = false;
                            this.shouldResumeAfterPayout = false;
                            this.showNotification('Not enough balance!', null);
                            // Reflect stopped state when cannot resume
                            this.betBtn.textContent = 'Start';
                        }
                    }
                    break;
                }
            }
        }, 200);
        this.betBtn.textContent = 'Stop';
    }

    startAnimationLoop() {
        // Start a continuous animation loop to keep pegs visible
        const animate = () => {
            this.draw();
            requestAnimationFrame(animate);
        };
        animate();
    }

    update() {
        for (let ball of this.balls) {
            if (ball.resolved) continue;
            if (ball.useOldPhysics) {
                // --- OLD PHYSICS ---
                if (!ball._oldPhysicsInitialized) {
                    ball._oldPhysicsInitialized = true;
                    ball.vx = 0;
                    ball.vy = 0;
                }
                // Gravity
                ball.vy += 0.35;
                // Move
                ball.vx += ball.vx * 0.01;
                ball.vy += ball.vy * 0.01;
                ball.x += ball.vx;
                ball.y += ball.vy;
                // Collide with pegs
                for (let peg of this.pegs) {
                    let dx = ball.x - peg.x;
                    let dy = ball.y - peg.y;
                    let dist = Math.sqrt(dx * dx + dy * dy);
                    if (dist < this.pegRadius + this.ballRadius) {
                        let overlap = this.pegRadius + this.ballRadius - dist;
                        let angle = Math.atan2(dy, dx);
                        // Increase random angle range
                        const randomAngle = (Math.random() - 0.5) * Math.PI / 2;
                        angle += randomAngle;
                        ball.x += Math.cos(angle) * overlap;
                        ball.y += Math.sin(angle) * overlap;
                        let speed = Math.sqrt(ball.vx * ball.vx + ball.vy * ball.vy) * 0.6;
                        ball.vx = Math.cos(angle) * speed * 0.85;
                        ball.vy = Math.sin(angle) * speed;
                        // Ensure minimum horizontal velocity
                        if (Math.abs(ball.vx) < 0.95) {
                            ball.vx = 0.95 * Math.sign(ball.vx || (Math.random() - 0.5));
                        }
                    }
                }
                // Collide with walls
                if (ball.x < ball.radius) {
                    ball.x = ball.radius;
                    ball.vx *= -0.65;
                }
                if (ball.x > this.width - ball.radius) {
                    ball.x = this.width - ball.radius;
                    ball.vx *= -0.65;
                }
                // Check for slots (just below last row)
                if (ball.y > this.lastRowY + this.pegSpacingX * Math.sqrt(3) / 2 / 2 && !ball.resolved) {
                    // Use midpoints between last row pegs for slot centers
                    let slot = -1;
                    for (let i = 0; i < this.lastRowPegXs.length - 1; i++) {
                        let mid = (this.lastRowPegXs[i] + this.lastRowPegXs[i + 1]) / 2;
                        let halfWidth = (this.lastRowPegXs[1] - this.lastRowPegXs[0]) / 2;
                        if (ball.x >= mid - halfWidth && ball.x < mid + halfWidth) {
                            slot = i;
                            break;
                        }
                    }
                    if (slot >= 0 && slot < this.slots) {
                        this.showPlinkoResult(slot);
                        ball.resolved = true;
                    }
                }
                // Remove resolved balls after a short delay
                if (ball.resolved && ball.y > this.height + 20) {
                    // Let resolved balls fall out of view
                    // (handled by the filter at the end of update)
                }
                continue;
            }
            // --- NEW PHYSICS ---
            if (!ball.state) {
                // Initialize state machine for the ball
                ball.state = 'drop';
                ball.pegIndex = 0;
                ball.dropTime = 0;
                // Start at the center peg of the first row
                let firstRow = 2;
                let pegsInFirstRow = firstRow + 1;
                let pegRowStart = 0;
                let centerIdx = Math.floor(pegsInFirstRow / 2);
                let pegInfo = { peg: this.pegs[pegRowStart + centerIdx], idx: centerIdx };
                ball.targetPeg = pegInfo.peg;
                ball.currentPegIdx = pegInfo.idx;
                ball.x = ball.targetPeg.x;
                // Set y to match old physics: right above the top peg
                const firstPegY = this.pegs.length > 0 ? this.pegs[0].y : 40;
                ball.y = firstPegY - 30;
                ball.startX = ball.x;
                ball.startY = ball.y;
                ball.bounceHeight = 18 + Math.random() * 8;
                // Pick initial direction randomly
                ball.direction = Math.random() < 0.5 ? -1 : 1;
            }
            if (ball.state === 'drop') {
                ball.dropTime += 1;
                const t = Math.min(1, ball.dropTime / 20);
                let targetY = ball.targetPeg.y - (this.pegRadius + this.ballRadius);
                ball.y = ball.startY + (targetY - ball.startY) * t;
                if (t >= 1) {
                    ball.state = 'bounce';
                    ball.bounceTime = 0;
                    ball.startX = ball.x;
                    ball.startY = ball.y;
                }
            } else if (ball.state === 'bounce') {
                ball.bounceTime += 1;
                const t = ball.bounceTime / 30;
                let nextPegInfo = this.getAdjacentPegForStep(ball.pegIndex, ball.currentPegIdx, ball.direction);
                if (!ball.nextTargetPeg) {
                    ball.nextTargetPeg = nextPegInfo.peg;
                    ball.nextPegIdx = nextPegInfo.idx;
                }
                ball.x = ball.startX + (ball.nextTargetPeg.x - ball.startX) * t;
                let targetY = ball.nextTargetPeg.y - (this.pegRadius + this.ballRadius);
                ball.y = ball.startY - ball.bounceHeight * (4 * t * (1 - t)) + (targetY - ball.startY) * t;
                if (ball.bounceTime >= 30) {
                    ball.x = ball.nextTargetPeg.x;
                    ball.y = ball.nextTargetPeg.y - (this.pegRadius + this.ballRadius);
                    ball.pegIndex++;
                    ball.currentPegIdx = ball.nextPegIdx;
                    if (ball.pegIndex < this.rows - 3) {
                        ball.state = 'bounce';
                        ball.bounceTime = 0;
                        ball.startX = ball.x;
                        ball.startY = ball.y;
                        ball.bounceHeight = 18 + Math.random() * 8;
                        ball.direction = Math.random() < 0.5 ? -1 : 1;
                        ball.nextTargetPeg = null;
                    } else {
                        // Final slot animation
                        // Find slot center below
                        let slotIdx = ball.currentPegIdx;
                        if (slotIdx < 0) slotIdx = 0;
                        if (slotIdx >= this.lastRowPegXs.length - 1) slotIdx = this.lastRowPegXs.length - 2;
                        let slotX = (this.lastRowPegXs[slotIdx] + this.lastRowPegXs[slotIdx + 1]) / 2;
                        let slotY = this.lastRowY + this.pegSpacingX * Math.sqrt(3) / 2 / 2;
                        ball.state = 'slot';
                        ball.slotTime = 0;
                        ball.slotStartX = ball.x;
                        ball.slotStartY = ball.y;
                        ball.slotTargetX = slotX;
                        ball.slotTargetY = slotY;
                    }
                }
            } else if (ball.state === 'slot') {
                ball.slotTime += 1;
                const t = Math.min(1, ball.slotTime / 30);
                // Animate to slot center with a bounce arc
                let slotBounceHeight = 18 + Math.random() * 8;
                ball.x = ball.slotStartX + (ball.slotTargetX - ball.slotStartX) * t;
                ball.y = ball.slotStartY - slotBounceHeight * (4 * t * (1 - t)) + (ball.slotTargetY - ball.slotStartY) * t;
                if (t >= 1) {
                    // Animate falling through slot
                    ball.state = 'fallthrough';
                    ball.fallThroughTime = 0;
                }
            } else if (ball.state === 'fallthrough') {
                ball.fallThroughTime += 1;
                ball.y += 6;
                if (ball.fallThroughTime === 1) {
                    // Pay out as soon as it enters the slot
                    let slot = this.getSlotForBall(ball.x);
                    if (slot >= 0 && slot < this.slots) {
                        this.showPlinkoResult(slot);
                    }
                }
                if (ball.y > this.height + 20) {
                    ball.resolved = true;
                }
            }
        }
        // Remove resolved balls after a short delay
        this.balls = this.balls.filter(ball => !(ball.resolved && ball.y > this.height + 20));
        for (let ball of this.balls) {
            if (ball.resolved) {
                ball.y += 5; // Let resolved balls fall out of view
            }
        }
    }

    showPlinkoResult(slot) {
        let payout = this.payouts[slot] || 0;
        let winAmount = this.bet * payout;
        // Round to 2 decimal places for display
        let roundedWinAmount = Math.round(winAmount * 100) / 100;
        let message = payout > 0 ? `Plinko: You won ${roundedWinAmount}!` : 'Plinko: No win!';
        // Determine color based on slot
        let color = '#fff8e1';
        if (payout >= 9) color = '#e74c3c';
        else if (payout >= 2) color = '#e67e22';
        else if (payout > 0.5) color = '#f1c40f';
        this.showNotification(message, color);
        if (payout > 0) {
            if (this.isAutoMode) {
                // Accumulate during auto mode to limit DB writes
                this.accumulatedWinnings += winAmount;
                this.updateWinningsDisplay();
            } else {
                // Manual mode: pay out immediately
                this.balance += winAmount;
                this.updateBalance();
            }
        }
    }

    draw() {
        this.ctx.clearRect(0, 0, this.width, this.height);
        // Draw pegs
        for (let peg of this.pegs) {
            this.ctx.beginPath();
            this.ctx.arc(peg.x, peg.y, this.pegRadius, 0, 2 * Math.PI);
            this.ctx.fillStyle = '#fff';
            this.ctx.strokeStyle = '#2C3E50';
            this.ctx.lineWidth = 2;
            this.ctx.fill();
            this.ctx.stroke();
        }
        // Draw slots (centered between last row of pegs)
        for (let i = 0; i < this.lastRowPegXs.length - 1; i++) {
            let mid = (this.lastRowPegXs[i] + this.lastRowPegXs[i + 1]) / 2;
            let slotWidth = (this.lastRowPegXs[1] - this.lastRowPegXs[0]);
            let slotX = mid - slotWidth / 2;
            let slotY = this.lastRowY + slotWidth * Math.sqrt(3) / 2 / 2;
            this.ctx.save();
            this.ctx.beginPath();
            this.ctx.rect(slotX, slotY, slotWidth, 30);
            // Color code rewards
            let payout = this.payouts[i] || 0;
            if (payout >= 9) this.ctx.fillStyle = '#e74c3c'; // red
            else if (payout >= 2) this.ctx.fillStyle = '#e67e22'; // orange
            else if (payout > 0.5) this.ctx.fillStyle = '#f1c40f'; // yellow
            else this.ctx.fillStyle = '#fff8e1';
            this.ctx.fill();
            this.ctx.strokeStyle = '#2C3E50';
            this.ctx.stroke();
            this.ctx.restore();
            // Draw payout text
            this.ctx.fillStyle = '#2C3E50';
            this.ctx.font = 'bold 1.1rem Cinzel, serif';
            this.ctx.textAlign = 'center';
            this.ctx.fillText(this.payouts[i] ? `${this.payouts[i]}x` : '', mid, slotY + 22);
        }
        // Draw ball
        for (let ball of this.balls) {
            this.ctx.beginPath();
            this.ctx.arc(ball.x, ball.y, this.ballRadius, 0, 2 * Math.PI);
            this.ctx.fillStyle = '#E74C3C'; // All balls are red
            this.ctx.strokeStyle = '#2C3E50';
            this.ctx.lineWidth = 2;
            this.ctx.fill();
            this.ctx.stroke();
        }
    }

    // Helper to get the peg for a given step
    getPegForStep(step, prevPegIdx) {
        // Use pegs from top to bottom, move left or right from previous peg
        let row = step + 2;
        let pegsInRow = row + 1;
        let pegRowStart = this.pegs.findIndex(p => Math.abs(p.y - (this.pegs[0].y + (row - 2) * this.pegSpacingX * Math.sqrt(3) / 2)) < 1);
        let idx;
        if (typeof prevPegIdx === 'number') {
            // Move left or right from previous peg
            let direction = Math.random() < 0.5 ? -1 : 1;
            idx = Math.max(0, Math.min(pegsInRow - 1, prevPegIdx + direction));
        } else {
            // First peg: start in the middle
            idx = Math.floor(pegsInRow / 2);
        }
        return { peg: this.pegs[pegRowStart + idx], idx };
    }
    getSlotForBall(x) {
        // Use midpoints between last row pegs for slot centers
        for (let i = 0; i < this.lastRowPegXs.length - 1; i++) {
            let mid = (this.lastRowPegXs[i] + this.lastRowPegXs[i + 1]) / 2;
            let halfWidth = (this.lastRowPegXs[1] - this.lastRowPegXs[0]) / 2;
            if (x >= mid - halfWidth && x < mid + halfWidth) {
                return i;
            }
        }
        return -1;
    }

    // Helper to get the adjacent peg for a given step and direction
    getAdjacentPegForStep(step, prevPegIdx, direction) {
        // Calculate the start index for the next row based on the row structure
        let row = step + 3; // next row
        let pegsInRow = row + 1;
        // Calculate the start index for the next row
        let pegRowStart = 0;
        for (let r = 2; r < row; r++) {
            pegRowStart += r + 1;
        }
        // Staggered mapping: left = same idx, right = idx+1
        let idx;
        if (direction < 0) {
            idx = prevPegIdx;
        } else {
            idx = prevPegIdx + 1;
        }
        if (idx < 0) idx = 0;
        if (idx >= pegsInRow) idx = pegsInRow - 1;
        return { peg: this.pegs[pegRowStart + idx], idx };
    }

    updateWinningsDisplay() {
        if (!this.winningsContainer) return;
        const shouldShow = this.isAutoMode || this.accumulatedWinnings > 0 || this.autoPausedForFunds || this.pendingAutoPayout;
        this.winningsContainer.style.display = shouldShow ? 'flex' : 'none';
        if (this.winningsAmount) {
            this.winningsAmount.textContent = Math.floor(this.accumulatedWinnings).toLocaleString();
        }
    }

    addWinningsToBalance() {
        if (this.accumulatedWinnings > 0) {
            this.balance += this.accumulatedWinnings;
            this.accumulatedWinnings = 0;
            this.updateBalance();
            this.updateWinningsDisplay();
        }
    }

    showSignInPrompt() {
        this.showNotification('Please sign in to play games!', '#ff4444');
        
        // Show auth popup after a short delay
        setTimeout(() => {
            const authPopup = document.getElementById('auth-popup');
            if (authPopup) {
                authPopup.style.display = 'flex';
            }
        }, 1000);
    }
}

// Mines Game Implementation
class MinesGame {
    constructor() {
        this.canvas = document.getElementById('mines-canvas');
        if (!this.canvas) return; // Exit if not on mines page
        
        this.ctx = this.canvas.getContext('2d');
        this.gridSize = 5; // 5x5 grid
        
        // Set canvas size to match display size
        this.resizeCanvas();
        
        // Add resize listener for responsive design
        window.addEventListener('resize', () => this.resizeCanvas());
        this.minesCount = 3;
        this.mines = [];
        this.revealedCells = [];
        this.gameState = 'waiting'; // 'waiting', 'playing', 'won', 'lost'
        this.showMines = false;
        this.cashOutPayout = 0;
        this.showLossMessage = false;
        this.dimOpacity = 0;
        this.textOpacity = 0;
        this.fadeInProgress = 0;
        this.bet = 10;
        this.balance = CasinoBalance.getBalance();
        this.isAutoMode = false;
        this.autoInterval = null;
        
        // Multiplier table for different diamonds cleared and mines
        this.multiplierTable = {
            1: { // 1 diamond cleared
                1: 1.03, 2: 1.08, 3: 1.12, 4: 1.18, 5: 1.24, 6: 1.30, 7: 1.37, 8: 1.46,
                9: 1.55, 10: 1.65, 11: 1.77, 12: 1.90, 13: 2.06, 14: 2.25, 15: 2.47,
                16: 2.75, 17: 3.09, 18: 3.54, 19: 4.12, 20: 4.95, 21: 6.19, 22: 8.25,
                23: 12.37, 24: 24.75
            },
            2: { // 2 diamonds cleared
                1: 1.08, 2: 1.17, 3: 1.29, 4: 1.41, 5: 1.56, 6: 1.74, 7: 1.94, 8: 2.18,
                9: 2.47, 10: 2.83, 11: 3.26, 12: 3.81, 13: 4.50, 14: 5.40, 15: 6.60,
                16: 8.25, 17: 10.61, 18: 14.14, 19: 19.80, 20: 29.70, 21: 49.50, 22: 99,
                23: 297
            },
            3: { // 3 diamonds cleared
                1: 1.12, 2: 1.29, 3: 1.50, 4: 1.76, 5: 2.00, 6: 2.35, 7: 2.79, 8: 3.35,
                9: 4.07, 10: 5.00, 11: 6.25, 12: 7.95, 13: 10.35, 14: 13.80, 15: 19.80,
                16: 29.70, 17: 49.50, 18: 99, 19: 227.70, 20: 682.10, 21: 2273.70, 22: 11368.50
            },
            4: { // 4 diamonds cleared
                1: 1.18, 2: 1.41, 3: 1.71, 4: 2.09, 5: 2.58, 6: 3.23, 7: 4.09, 8: 5.26,
                9: 6.88, 10: 9.17, 11: 12.51, 12: 17.52, 13: 25.30, 14: 37.95, 15: 59.64,
                16: 99.39, 17: 178.91, 18: 357.81, 19: 834.90, 20: 2504.70, 21: 12523.50
            },
            5: { // 5 diamonds cleared
                1: 1.24, 2: 1.56, 3: 2.00, 4: 2.58, 5: 3.39, 6: 4.52, 7: 6.14, 8: 8.50,
                9: 12.04, 10: 17.52, 11: 26.27, 12: 40.87, 13: 66.41, 14: 113.85, 15: 208.72,
                16: 417.45, 17: 939.26, 18: 2504.70, 19: 8766.45, 20: 52598.70
            },
            6: { // 6 diamonds cleared
                1: 1.30, 2: 1.74, 3: 2.35, 4: 3.23, 5: 4.52, 6: 6.46, 7: 9.44, 8: 14.17,
                9: 21.89, 10: 35.03, 11: 58.38, 12: 102.17, 13: 189.75, 14: 379.50, 15: 834.90,
                16: 2087.25, 17: 6261.75, 18: 25047, 19: 175329
            },
            7: { // 7 diamonds cleared
                1: 1.37, 2: 1.94, 3: 2.79, 4: 4.09, 5: 6.14, 6: 9.44, 7: 14.95, 8: 24.47,
                9: 41.60, 10: 73.95, 11: 138.66, 12: 277.33, 13: 600.87, 14: 1442.10, 15: 3965.77,
                16: 13219.25, 17: 59486.62, 18: 475893
            },
            8: { // 8 diamonds cleared
                1: 1.46, 2: 2.18, 3: 3.35, 4: 5.26, 5: 8.50, 6: 14.17, 7: 24.47, 8: 44.05,
                9: 83.20, 10: 166.40, 11: 356.56, 12: 831.98, 13: 2163.15, 14: 6489.45, 15: 23794.65,
                16: 118973.25, 17: 1070759.25
            },
            10: { // 10 diamonds cleared
                1: 1.65, 2: 2.83, 3: 5.00, 4: 9.17, 5: 17.52, 6: 35.03, 7: 73.95, 8: 166.40,
                9: 404.10, 10: 1077.61, 11: 3232.84, 12: 11314.94, 13: 49031.4, 14: 294188.4, 15: 3236072.4
            },
            11: { // 11 diamonds cleared
                1: 1.77, 2: 3.26, 3: 6.26, 4: 12.51, 5: 26.27, 6: 58.38, 7: 138.66, 8: 356.56,
                9: 1010.26, 10: 3232.84, 11: 12123.15, 12: 56574.69, 13: 367735.5, 14: 4412826
            },
            12: { // 12 diamonds cleared
                1: 1.90, 2: 3.81, 3: 7.96, 4: 17.52, 5: 40.87, 6: 102.17, 7: 277.33, 8: 831.98,
                9: 2828.73, 10: 11314.94, 11: 56574.69, 12: 396022.85, 13: 5148297
            },
            13: { // 13 diamonds cleared
                1: 2.06, 2: 4.50, 3: 10.35, 4: 25.30, 5: 66.41, 6: 189.75, 7: 600.87, 8: 2163.15,
                9: 9193.39, 10: 49031.4, 11: 367735.5, 12: 5148297
            },
            14: { // 14 diamonds cleared
                1: 2.25, 2: 5.40, 3: 13.80, 4: 37.95, 5: 113.85, 6: 379.50, 7: 1442.10, 8: 6489.45,
                9: 36773.55, 10: 294188.4, 11: 4412826
            },
            15: { // 15 diamonds cleared
                1: 2.47, 2: 6.60, 3: 18.97, 4: 59.64, 5: 208.72, 6: 834.90, 7: 3965.77, 8: 23794.65,
                9: 202254.52, 10: 3236072.4
            },
            16: { // 16 diamonds cleared
                1: 2.75, 2: 8.25, 3: 27.11, 4: 99.39, 5: 417.45, 6: 2087.25, 7: 13219.25, 8: 118973.25,
                9: 2022545.25
            },
            17: { // 17 diamonds cleared
                1: 3.09, 2: 10.61, 3: 40.66, 4: 178.91, 5: 939.26, 6: 6261.75, 7: 59486.62, 8: 1070759.25
            },
            18: { // 18 diamonds cleared
                1: 3.54, 2: 14.14, 3: 65.06, 4: 357.81, 5: 2504.70, 6: 25047, 7: 475893
            },
            19: { // 19 diamonds cleared
                1: 4.12, 2: 19.80, 3: 113.85, 4: 834.90, 5: 8766.45, 6: 175329
            },
            20: { // 20 diamonds cleared
                1: 4.95, 2: 29.70, 3: 227.70, 4: 2504.70, 5: 52598.70
            },
            21: { // 21 diamonds cleared
                1: 6.19, 2: 49.50, 3: 569.25, 4: 12523.50
            },
            22: { // 22 diamonds cleared
                1: 8.25, 2: 99, 3: 2277
            },
            23: { // 23 diamonds cleared
                1: 12.38, 2: 297
            },
            24: { // 24 diamonds cleared
                1: 24.75
            }
        };
        this.currentMultiplier = 1.0;
        this.multipliers = {
            1: 1.00,
            3: 1.50,
            5: 2.00,
            10: 3.00
        };
        
        this.balanceElement = document.querySelector('.balance-amount');
        this.notificationStack = document.querySelector('.mines-notification-stack');
        this.betInput = document.getElementById('sidebar-bet-amount');
        this.betMultBtn = document.querySelector('.sidebar-bet-mult');
        this.betMaxBtn = document.querySelector('.sidebar-bet-max');
        this.betBtn = document.querySelector('.sidebar-bet-btn');
        this.minesInput = document.getElementById('sidebar-mines-count');
        this.minesMinusBtn = document.querySelector('.sidebar-mines-minus');
        this.minesPlusBtn = document.querySelector('.sidebar-mines-plus');
        this.manualTab = document.querySelector('.sidebar-tab[data-mode="manual"]');
        this.autoTab = document.querySelector('.sidebar-tab[data-mode="auto"]');
        
        this.initControls();
        this.updateBalance();
        this.drawBoard();
        
        // Refresh balance when page becomes visible (in case user switched from another game)
        document.addEventListener('visibilitychange', () => {
            if (!document.hidden) {
                this.balance = CasinoBalance.getBalance();
                this.updateBalance();
            }
        });
        
        // Start animation loop
        this.startAnimationLoop();
    }

    resizeCanvas() {
        const container = this.canvas.parentElement;
        const containerRect = container.getBoundingClientRect();
        
        // Set canvas size to match container
        this.canvas.width = containerRect.width;
        this.canvas.height = containerRect.height;
        
        // Update dimensions
        this.width = this.canvas.width;
        this.height = this.canvas.height;
        this.cellSize = Math.min(this.width, this.height) / this.gridSize;
        
        // Center the grid
        this.gridOffsetX = (this.width - this.cellSize * this.gridSize) / 2;
        this.gridOffsetY = (this.height - this.cellSize * this.gridSize) / 2;
    }

    initControls() {
        // Bet input controls
        this.betInput.addEventListener('input', () => {
            this.bet = Math.max(1, parseInt(this.betInput.value) || 1);
            this.betInput.value = this.bet;
        });

        // Bet multiplier button
        this.betMultBtn.addEventListener('click', () => {
            if (this.gameState !== 'playing') {
                this.bet *= 2;
                this.betInput.value = this.bet;
            }
        });

        // Bet max button
        this.betMaxBtn.addEventListener('click', () => {
            if (this.gameState !== 'playing') {
                this.balance = CasinoBalance.getBalance(); // Get fresh balance
                this.bet = Math.floor(this.balance);
                this.betInput.value = this.bet;
            }
        });

        // Main bet button
        this.betBtn.addEventListener('click', () => {
            if (this.gameState === 'waiting') {
                this.startGame();
            } else if (this.gameState === 'playing') {
                this.cashOut();
            } else if (this.gameState === 'won' || this.gameState === 'lost') {
                this.playAgain();
            }
        });

        // Mines input
        this.initMinesInput();

        // Tab switching
        this.manualTab.addEventListener('click', () => {
            this.setMode('manual');
        });

        // Disable Auto tab
        this.autoTab.classList.add('disabled');
        this.autoTab.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
            return false;
        });

        // Canvas click handler
        this.canvas.addEventListener('click', (e) => {
            if (this.gameState === 'playing') {
                const rect = this.canvas.getBoundingClientRect();
                const scaleX = this.canvas.width / rect.width;
                const scaleY = this.canvas.height / rect.height;
                
                const x = (e.clientX - rect.left) * scaleX;
                const y = (e.clientY - rect.top) * scaleY;
                this.handleCellClick(x, y);
            }
        });

        this.updateMultiplier();
    }

    initMinesInput() {
        // Handle mines input changes
        this.minesInput.addEventListener('input', (e) => {
            const value = parseInt(e.target.value);
            if (value >= 1 && value <= 24) {
                this.minesCount = value;
            }
        });

        // Handle minus button
        this.minesMinusBtn.addEventListener('click', () => {
            if (this.gameState === 'waiting') {
                const currentValue = parseInt(this.minesInput.value);
                if (currentValue > 1) {
                    this.minesInput.value = currentValue - 1;
                    this.minesCount = currentValue - 1;
                }
            }
        });

        // Handle plus button
        this.minesPlusBtn.addEventListener('click', () => {
            if (this.gameState === 'waiting') {
                const currentValue = parseInt(this.minesInput.value);
                if (currentValue < 24) {
                    this.minesInput.value = currentValue + 1;
                    this.minesCount = currentValue + 1;
                }
            }
        });

        // Initialize with default value
        this.minesCount = 3;
        this.minesInput.value = 3;
    }


    enableMinesInput() {
        this.minesInput.disabled = false;
        this.minesInput.style.opacity = '1';
        this.minesInput.style.cursor = 'text';
        this.minesMinusBtn.disabled = false;
        this.minesPlusBtn.disabled = false;
    }

    enableBetInput() {
        this.betInput.disabled = false;
        this.betMultBtn.disabled = false;
        this.betMaxBtn.disabled = false;
        this.betInput.style.opacity = '1';
        this.betInput.style.cursor = 'text';
        
        // Remove disabled styling
        document.querySelector('.sidebar-bet-input-group').classList.remove('bet-disabled');
        document.querySelector('.sidebar-mines-input-group').classList.remove('bet-disabled');
        this.betMultBtn.classList.remove('bet-disabled');
        this.betMaxBtn.classList.remove('bet-disabled');
        this.minesMinusBtn.classList.remove('bet-disabled');
        this.minesPlusBtn.classList.remove('bet-disabled');
        this.minesInput.classList.remove('bet-disabled');
    }

    disableBetInput() {
        this.betInput.disabled = true;
        this.betMultBtn.disabled = true;
        this.betMaxBtn.disabled = true;
        this.betInput.style.opacity = '0.5';
        this.betInput.style.cursor = 'not-allowed';
        
        // Add disabled styling
        document.querySelector('.sidebar-bet-input-group').classList.add('bet-disabled');
        document.querySelector('.sidebar-mines-input-group').classList.add('bet-disabled');
        this.betMultBtn.classList.add('bet-disabled');
        this.betMaxBtn.classList.add('bet-disabled');
        this.minesMinusBtn.classList.add('bet-disabled');
        this.minesPlusBtn.classList.add('bet-disabled');
        this.minesInput.classList.add('bet-disabled');
    }

    setMode(mode) {
        this.isAutoMode = mode === 'auto';
        
        // Update tab appearance
        this.manualTab.classList.toggle('active', mode === 'manual');
        this.autoTab.classList.toggle('active', mode === 'auto');
        
        // Update button text
        if (mode === 'auto') {
            this.betBtn.textContent = 'Start Auto';
        } else {
            this.betBtn.textContent = 'Start Game';
        }
    }

    updateMultiplier() {
        this.currentMultiplier = this.multipliers[this.minesCount] || 1.0;
    }

    startGame() {
        // Check if user is signed in
        if (!window.casinoAuth || !window.casinoAuth.isUserLoggedIn()) {
            this.showSignInPrompt();
            return;
        }
        
        // Get fresh balance from CasinoBalance system
        this.balance = CasinoBalance.getBalance();
        
        if (this.bet > this.balance) {
            this.showNotification('Insufficient balance!', '#ff4444');
            return;
        }

        this.balance -= this.bet;
        this.updateBalance();
        
        this.gameState = 'playing';
        this.revealedCells = [];
        this.generateMines();
        this.drawBoard();
        
        this.betBtn.textContent = 'Cash Out';
        this.betBtn.disabled = false;
        
        // Disable inputs during gameplay
        this.disableBetInput();
        this.disableMinesInput();
        
        this.showNotification(`Game started! Bet: ${this.bet} 🪙`, '#4CAF50');
        
        if (this.isAutoMode) {
            this.startAutoPlay();
        }
    }

    generateMines() {
        this.mines = [];
        const totalCells = this.gridSize * this.gridSize;
        const minePositions = [];
        
        // Generate random mine positions
        while (minePositions.length < this.minesCount) {
            const pos = Math.floor(Math.random() * totalCells);
            if (!minePositions.includes(pos)) {
                minePositions.push(pos);
            }
        }
        
        // Convert to grid coordinates
        minePositions.forEach(pos => {
            const row = Math.floor(pos / this.gridSize);
            const col = pos % this.gridSize;
            this.mines.push({ row, col });
        });
    }

    handleCellClick(x, y) {
        if (this.gameState !== 'playing') return;
        
        // Adjust coordinates for grid offset
        const adjustedX = x - this.gridOffsetX;
        const adjustedY = y - this.gridOffsetY;
        
        // Check if click is within grid bounds
        if (adjustedX < 0 || adjustedY < 0 || 
            adjustedX >= this.cellSize * this.gridSize || 
            adjustedY >= this.cellSize * this.gridSize) {
            return;
        }
        
        const col = Math.floor(adjustedX / this.cellSize);
        const row = Math.floor(adjustedY / this.cellSize);
        
        if (row < 0 || row >= this.gridSize || col < 0 || col >= this.gridSize) return;
        
        // Check if already revealed
        const cellKey = `${row}-${col}`;
        if (this.revealedCells.includes(cellKey)) return;
        
        // Check if it's a mine
        const isMine = this.mines.some(mine => mine.row === row && mine.col === col);
        
        if (isMine) {
            this.gameLost();
        } else {
            this.revealedCells.push(cellKey);
            this.drawBoard();
            
            // Check if all safe cells are revealed
            const totalSafeCells = this.gridSize * this.gridSize - this.minesCount;
            if (this.revealedCells.length === totalSafeCells) {
                this.gameWon();
            }
        }
    }

    calculateMultiplier(diamondsCleared, minesCount) {
        // Get the multiplier for the specific number of diamonds cleared and mines
        if (this.multiplierTable[diamondsCleared] && this.multiplierTable[diamondsCleared][minesCount]) {
            return this.multiplierTable[diamondsCleared][minesCount];
        }
        
        // Fallback to base multiplier if not found
        return 1.0;
    }

    cashOut() {
        if (this.gameState !== 'playing') return;
        
        const diamondsCleared = this.revealedCells.length;
        const multiplier = this.calculateMultiplier(diamondsCleared, this.minesCount);
        const payout = Math.floor(this.bet * multiplier);
        this.balance += payout;
        this.updateBalance();
        
        this.gameState = 'won';
        this.betBtn.textContent = 'Play again?';
        
        // Re-enable inputs after game ends
        this.enableBetInput();
        this.enableMinesInput();
        
        // Show mines and display payout
        this.showCashOutResult(payout);
        
        this.showNotification(`Cashed out! +${payout} 🪙`, '#4CAF50');
    }

    gameWon() {
        const diamondsCleared = this.revealedCells.length;
        const multiplier = this.calculateMultiplier(diamondsCleared, this.minesCount);
        const payout = Math.floor(this.bet * multiplier);
        this.balance += payout;
        this.updateBalance();
        
        this.gameState = 'won';
        this.betBtn.textContent = 'Play again?';
        
        // Re-enable dropdown after game ends
        this.enableBetInput();
        this.enableMinesInput();
        
        this.showNotification(`You won! +${payout} 🪙`, '#4CAF50');
    }

    gameLost() {
        this.gameState = 'lost';
        this.betBtn.textContent = 'Play again?';
        
        // Re-enable dropdown after game ends
        this.enableBetInput();
        this.enableMinesInput();
        
        // Show mines and display loss message
        this.showLossResult();
        
        this.showNotification(`Mine hit! Game over.`, '#ff4444');
    }

    showLossResult() {
        // Set flag to show mines and dim the board
        this.showMines = true;
        this.showLossMessage = true;
        this.dimOpacity = 0;
        this.textOpacity = 0;
        this.startFadeIn();
    }

    showCashOutResult(payout) {
        // Set flag to show mines and dim the board
        this.showMines = true;
        this.cashOutPayout = payout;
        this.dimOpacity = 0;
        this.textOpacity = 0;
        this.startFadeIn();
    }

    startFadeIn() {
        const fadeInDuration = 1000; // 1 second
        const startTime = Date.now();
        
        const fadeIn = () => {
            const elapsed = Date.now() - startTime;
            const progress = Math.min(elapsed / fadeInDuration, 1);
            
            // Dim overlay fades in first (0-0.6 seconds)
            if (progress <= 0.6) {
                this.dimOpacity = (progress / 0.6) * 0.6;
            } else {
                this.dimOpacity = 0.6;
            }
            
            // Text fades in after dim starts (0.3-1.0 seconds)
            if (progress >= 0.3) {
                const textProgress = (progress - 0.3) / 0.7;
                this.textOpacity = Math.min(textProgress, 1);
            }
            
            this.fadeInProgress = progress;
            this.drawBoard();
            
            if (progress < 1) {
                requestAnimationFrame(fadeIn);
            }
        };
        
        fadeIn();
    }

    playAgain() {
        // Reset game state and immediately start a new game
        this.gameState = 'waiting';
        this.revealedCells = [];
        this.mines = [];
        this.showMines = false;
        this.cashOutPayout = 0;
        this.showLossMessage = false;
        this.dimOpacity = 0;
        this.textOpacity = 0;
        this.fadeInProgress = 0;
        
        // Start new game immediately
        this.startGame();
    }

    resetGame() {
        this.gameState = 'waiting';
        this.revealedCells = [];
        this.mines = [];
        this.showMines = false;
        this.cashOutPayout = 0;
        this.showLossMessage = false;
        this.dimOpacity = 0;
        this.textOpacity = 0;
        this.fadeInProgress = 0;
        this.betBtn.textContent = this.isAutoMode ? 'Start Auto' : 'Start Game';
        this.drawBoard();
    }

    startAutoPlay() {
        // Simple auto-play: reveal random cells until win/loss
        const autoPlay = () => {
            if (this.gameState !== 'playing') return;
            
            const availableCells = [];
            for (let row = 0; row < this.gridSize; row++) {
                for (let col = 0; col < this.gridSize; col++) {
                    const cellKey = `${row}-${col}`;
                    if (!this.revealedCells.includes(cellKey)) {
                        availableCells.push({ row, col });
                    }
                }
            }
            
            if (availableCells.length > 0) {
                const randomCell = availableCells[Math.floor(Math.random() * availableCells.length)];
                const centerX = this.gridOffsetX + randomCell.col * this.cellSize + this.cellSize/2;
                const centerY = this.gridOffsetY + randomCell.row * this.cellSize + this.cellSize/2;
                this.handleCellClick(centerX, centerY);
            }
        };
        
        this.autoInterval = setInterval(autoPlay, 1000);
    }

    drawBoard() {
        this.ctx.clearRect(0, 0, this.width, this.height);
        
        // Draw background with gradient
        const gradient = this.ctx.createLinearGradient(0, 0, this.width, this.height);
        gradient.addColorStop(0, '#1a2236');
        gradient.addColorStop(1, '#232a36');
        this.ctx.fillStyle = gradient;
        this.ctx.fillRect(0, 0, this.width, this.height);
        
        // Draw outer border with glow effect
        this.drawGlowBorder();
        
        // Draw grid cells
        for (let row = 0; row < this.gridSize; row++) {
            for (let col = 0; col < this.gridSize; col++) {
                this.drawCell(row, col);
            }
        }
        
        // Draw revealed cells
        this.revealedCells.forEach(cellKey => {
            const [row, col] = cellKey.split('-').map(Number);
            this.drawRevealedCell(row, col);
        });
        
        // Draw mines if game is lost or cashed out
        if (this.gameState === 'lost' || this.showMines) {
            this.mines.forEach(mine => {
                this.drawMine(mine.row, mine.col);
            });
        }
        
        // Draw dim overlay and message if game ended
        if (this.showMines && (this.cashOutPayout > 0 || this.showLossMessage)) {
            this.drawDimOverlay();
            if (this.showLossMessage) {
                this.drawLossMessage();
            } else {
                this.drawWinMessage();
            }
        }
    }

    drawGlowBorder() {
        const borderWidth = 8;
        const glowSize = 20;
        
        // No glow
        this.ctx.shadowColor = 'transparent';
        this.ctx.shadowBlur = 0;
        this.ctx.shadowOffsetX = 0;
        this.ctx.shadowOffsetY = 0;
        
        // Draw border
        this.ctx.strokeStyle = '#FFD700';
        this.ctx.lineWidth = borderWidth;
        this.ctx.lineCap = 'round';
        this.ctx.lineJoin = 'round';
        
        const x = this.gridOffsetX - borderWidth/2;
        const y = this.gridOffsetY - borderWidth/2;
        const w = this.cellSize * this.gridSize + borderWidth;
        const h = this.cellSize * this.gridSize + borderWidth;
        
        this.ctx.strokeRect(x, y, w, h);
        
        // Reset shadow
        this.ctx.shadowBlur = 0;
    }

    drawCell(row, col) {
        const x = this.gridOffsetX + col * this.cellSize;
        const y = this.gridOffsetY + row * this.cellSize;
        
        // Cell background with subtle gradient
        const cellGradient = this.ctx.createLinearGradient(x, y, x + this.cellSize, y + this.cellSize);
        cellGradient.addColorStop(0, '#2a3441');
        cellGradient.addColorStop(1, '#1e252f');
        
        this.ctx.fillStyle = cellGradient;
        this.ctx.fillRect(x + 2, y + 2, this.cellSize - 4, this.cellSize - 4);
        
        // Cell border
        this.ctx.strokeStyle = '#FFD700';
        this.ctx.lineWidth = 1;
        this.ctx.strokeRect(x + 2, y + 2, this.cellSize - 4, this.cellSize - 4);
        
        // Inner highlight
        this.ctx.strokeStyle = '#FFD700';
        this.ctx.lineWidth = 0.5;
        this.ctx.globalAlpha = 0.3;
        this.ctx.strokeRect(x + 4, y + 4, this.cellSize - 8, this.cellSize - 8);
        this.ctx.globalAlpha = 1;
    }

    drawRevealedCell(row, col) {
        const x = this.gridOffsetX + col * this.cellSize;
        const y = this.gridOffsetY + row * this.cellSize;
        
        // Draw revealed cell background (dimmer gold)
        const revealedGradient = this.ctx.createLinearGradient(x, y, x + this.cellSize, y + this.cellSize);
        revealedGradient.addColorStop(0, '#8B6914');
        revealedGradient.addColorStop(1, '#6B4F0A');
        
        this.ctx.fillStyle = revealedGradient;
        this.ctx.fillRect(x + 2, y + 2, this.cellSize - 4, this.cellSize - 4);
        
        // Draw thicker outline for revealed tile
        this.ctx.strokeStyle = '#FFD700';
        this.ctx.lineWidth = 3;
        this.ctx.strokeRect(x + 2, y + 2, this.cellSize - 4, this.cellSize - 4);
        
        // Draw drachma coin (same as balance indicator)
        const centerX = x + this.cellSize / 2;
        const centerY = y + this.cellSize / 2;
        const coinSize = this.cellSize * 0.6;
        
        // Draw the 🪙 emoji
        this.ctx.font = `${coinSize}px Arial`;
        this.ctx.textAlign = 'center';
        this.ctx.textBaseline = 'middle';
        this.ctx.fillText('🪙', centerX, centerY);
    }

    drawMine(row, col) {
        const x = this.gridOffsetX + col * this.cellSize;
        const y = this.gridOffsetY + row * this.cellSize;
        const centerX = x + this.cellSize / 2;
        const centerY = y + this.cellSize / 2;
        
        // Draw explosion background
        const explosionGradient = this.ctx.createRadialGradient(centerX, centerY, 0, centerX, centerY, this.cellSize / 2);
        explosionGradient.addColorStop(0, '#ff6b6b');
        explosionGradient.addColorStop(0.7, '#ff4444');
        explosionGradient.addColorStop(1, '#cc0000');
        
        this.ctx.fillStyle = explosionGradient;
        this.ctx.fillRect(x + 2, y + 2, this.cellSize - 4, this.cellSize - 4);
        
        // Draw mine explosion with glow
        this.ctx.shadowColor = '#ff4444';
        this.ctx.shadowBlur = 15;
        
        this.ctx.fillStyle = '#ff4444';
        this.ctx.beginPath();
        this.ctx.arc(centerX, centerY, this.cellSize / 4, 0, Math.PI * 2);
        this.ctx.fill();
        
        // Draw explosion spikes
        this.ctx.shadowBlur = 8;
        this.ctx.strokeStyle = '#ff4444';
        this.ctx.lineWidth = 4;
        
        for (let i = 0; i < 8; i++) {
            const angle = (i * Math.PI * 2) / 8;
            const startRadius = this.cellSize / 4;
            const endRadius = this.cellSize / 2 - 8;
            
            const startX = centerX + Math.cos(angle) * startRadius;
            const startY = centerY + Math.sin(angle) * startRadius;
            const endX = centerX + Math.cos(angle) * endRadius;
            const endY = centerY + Math.sin(angle) * endRadius;
            
            this.ctx.beginPath();
            this.ctx.moveTo(startX, startY);
            this.ctx.lineTo(endX, endY);
            this.ctx.stroke();
        }
        
        // Reset shadow
        this.ctx.shadowBlur = 0;
    }

    drawDimOverlay() {
        // Draw semi-transparent overlay over the entire board with animated opacity
        this.ctx.fillStyle = `rgba(0, 0, 0, ${this.dimOpacity})`;
        this.ctx.fillRect(0, 0, this.width, this.height);
    }

    drawWinMessage() {
        const centerX = this.width / 2;
        const centerY = this.height / 2;
        
        // Set global alpha for fade-in effect
        this.ctx.globalAlpha = this.textOpacity;
        
        // Draw "You won" text with subtle styling
        this.ctx.fillStyle = '#4CAF50';
        this.ctx.font = 'bold 2.5rem Cinzel, serif';
        this.ctx.textAlign = 'center';
        this.ctx.textBaseline = 'middle';
        
        // Add subtle text shadow
        this.ctx.shadowColor = 'rgba(0, 0, 0, 0.8)';
        this.ctx.shadowBlur = 4;
        this.ctx.shadowOffsetX = 2;
        this.ctx.shadowOffsetY = 2;
        
        this.ctx.fillText('You won!', centerX, centerY);
        
        // Reset shadow and alpha
        this.ctx.shadowBlur = 0;
        this.ctx.shadowOffsetX = 0;
        this.ctx.shadowOffsetY = 0;
        this.ctx.globalAlpha = 1;
    }

    drawLossMessage() {
        const centerX = this.width / 2;
        const centerY = this.height / 2;
        
        // Set global alpha for fade-in effect
        this.ctx.globalAlpha = this.textOpacity;
        
        // Draw "You hit a mine" text with red styling
        this.ctx.fillStyle = '#ff4444';
        this.ctx.font = 'bold 2.5rem Cinzel, serif';
        this.ctx.textAlign = 'center';
        this.ctx.textBaseline = 'middle';
        
        // Add subtle text shadow
        this.ctx.shadowColor = 'rgba(0, 0, 0, 0.8)';
        this.ctx.shadowBlur = 4;
        this.ctx.shadowOffsetX = 2;
        this.ctx.shadowOffsetY = 2;
        
        this.ctx.fillText('You hit a mine', centerX, centerY);
        
        // Reset shadow and alpha
        this.ctx.shadowBlur = 0;
        this.ctx.shadowOffsetX = 0;
        this.ctx.shadowOffsetY = 0;
        this.ctx.globalAlpha = 1;
    }

    updateBalance() {
        if (this.balanceElement) {
            this.balanceElement.textContent = Math.floor(this.balance);
        }
        // Update the coin tab at the top
        const coinTab = document.querySelector('.coin-balance');
        if (coinTab) coinTab.textContent = Math.floor(this.balance);
        // Save balance to localStorage
        CasinoBalance.setBalance(this.balance);
    }

    showNotification(message, color = '#FFD700') {
        if (!this.notificationStack) return;
        
        const notification = document.createElement('div');
        notification.className = 'mines-notification';
        notification.textContent = message;
        notification.style.setProperty('--notif-accent', color);
        
        this.notificationStack.insertBefore(notification, this.notificationStack.firstChild);
        
        // Remove old notifications
        while (this.notificationStack.children.length > 5) {
            this.notificationStack.removeChild(this.notificationStack.lastChild);
        }
        
        // Auto-remove after 3 seconds
        setTimeout(() => {
            if (notification.parentNode) {
                notification.parentNode.removeChild(notification);
            }
        }, 3000);
    }

    startAnimationLoop() {
        const animate = () => {
            this.drawBoard();
            requestAnimationFrame(animate);
        };
        animate();
    }

    showSignInPrompt() {
        this.showNotification('Please sign in to play games!', '#ff4444');
        
        // Show auth popup after a short delay
        setTimeout(() => {
            const authPopup = document.getElementById('auth-popup');
            if (authPopup) {
                authPopup.style.display = 'flex';
            }
        }, 1000);
    }
}

// Initialize the games when the page loads
window.addEventListener('load', () => {
    // Initialize balance on all pages
    CasinoBalance.getBalance();
    
    // Only initialize Blackjack if we're on the blackjack page
    if (document.querySelector('.blackjack-table')) {
        window.blackjackGame = new BlackjackGame();
    }
    
    // Only initialize Plinko if we're on the plinko page
    if (document.querySelector('.plinko-table')) {
        window.plinkoGame = new PlinkoGame();
    }
    
    // Only initialize Mines if we're on the mines page
    if (document.querySelector('.mines-table')) {
        window.minesGame = new MinesGame();
    }
    
    // If we're on the homepage, ensure balance is displayed without forcing a write
    if (document.querySelector('.homepage-container')) {
        const balance = CasinoBalance.getBalance();
        const elements = document.querySelectorAll('.balance-amount, .coin-balance');
        elements.forEach(el => el.textContent = Math.floor(balance));
    }
});

// Add R key listener to add 5000 to balance on any page
document.addEventListener('keydown', (event) => {
    if (event.key.toLowerCase() === 'r') {
        CasinoBalance.updateBalance(5000);
    }
});

// Global variables for chart tooltip
let chartTooltip = null;
let tooltipChart = null;
let tooltipTimeout = null;

// Show balance history chart
window.showBalanceHistory = async function(event, userId, userEmail) {
    console.log('showBalanceHistory called for:', userEmail, 'ID:', userId);
    
    // Clear any existing timeout
    if (tooltipTimeout) {
        clearTimeout(tooltipTimeout);
        tooltipTimeout = null;
    }
    
    try {
        // Get balance history for user (filter + limit, sort in-memory to avoid index requirement)
        const { getDocs, collection, query, where, limit } = await import('https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js');
        const q = query(
            collection(window.firebaseDb, 'balanceHistory'),
            where('userId', '==', userId),
            limit(100)
        );
        const historySnapshot = await getDocs(q);
        const history = [];
        
        console.log('Total history documents found:', historySnapshot.size);
        
        historySnapshot.forEach(doc => {
            const data = doc.data();
            history.push({
                balance: data.balance,
                timestamp: data.timestamp.toDate()
            });
        });

        console.log('Found history entries for', userEmail, ':', history.length);

        // Sort ascending for chart after fetching latest first
        history.sort((a, b) => a.timestamp - b.timestamp);

        // Show tooltip
        const tooltip = document.getElementById('chart-tooltip');
        const title = document.getElementById('tooltip-title');
        title.textContent = `${userEmail} - Balance History`;
        tooltip.classList.remove('hidden');

        // Smart positioning to prevent clipping
        const mouseX = event.clientX;
        const mouseY = event.clientY;
        const tooltipWidth = 450; // Max width
        const tooltipHeight = 300; // Approximate height
        const viewportWidth = window.innerWidth;
        const viewportHeight = window.innerHeight;
        
        let left = mouseX + 10;
        let top = mouseY - 10;
        
        // Adjust if tooltip would go off right edge
        if (left + tooltipWidth > viewportWidth) {
            left = mouseX - tooltipWidth - 10;
        }
        
        // Adjust if tooltip would go off bottom edge
        if (top + tooltipHeight > viewportHeight) {
            top = viewportHeight - tooltipHeight - 20;
        }
        
        // Ensure tooltip doesn't go off left edge
        if (left < 10) {
            left = 10;
        }
        
        // Ensure tooltip doesn't go off top edge
        if (top < 10) {
            top = 10;
        }
        
        tooltip.style.left = left + 'px';
        tooltip.style.top = top + 'px';

        // Set timeout to auto-hide tooltip after 10 seconds
        tooltipTimeout = setTimeout(() => {
            hideBalanceHistory();
        }, 10000);

        // Destroy existing chart
        if (tooltipChart) {
            tooltipChart.destroy();
            tooltipChart = null;
        }

        if (history.length === 0) {
            // Show no data message
            const chartContainer = document.querySelector('.chart-container');
            chartContainer.innerHTML = '<div class="no-data-message">No balance history available<br><small>Make a deposit or withdrawal to create history</small></div>';
        } else {
            // Ensure canvas exists
            const chartContainer = document.querySelector('.chart-container');
            chartContainer.innerHTML = '<canvas id="tooltip-chart"></canvas>';

            // Get fresh canvas reference
            const canvas = document.getElementById('tooltip-chart');
            const ctx = canvas.getContext('2d');

            // Filter out duplicates (same balance within 5 seconds)
            const filteredHistory = [];
            for (let i = 0; i < history.length; i++) {
                const current = history[i];
                const isDuplicate = filteredHistory.some(existing => {
                    const timeDiff = Math.abs(current.timestamp - existing.timestamp);
                    return timeDiff < 5000 && current.balance === existing.balance;
                });
                
                if (!isDuplicate) {
                    filteredHistory.push(current);
                }
            }
            
            // Sort by timestamp
            filteredHistory.sort((a, b) => a.timestamp - b.timestamp);

            // Prepare data with exact time
            const labels = filteredHistory.map(h => {
                const date = h.timestamp;
                return date.toLocaleDateString() + ' ' + date.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'});
            });
            const data = filteredHistory.map(h => h.balance);

            console.log('Creating chart with data:', { labels, data });

            tooltipChart = new Chart(ctx, {
                type: 'line',
                data: {
                    labels: labels,
                    datasets: [{
                        label: 'Balance',
                        data: data,
                        borderColor: '#FFD700',
                        backgroundColor: 'rgba(255, 215, 0, 0.1)',
                        borderWidth: 2,
                        fill: false,
                        tension: 0,
                        pointRadius: 0,
                        pointHoverRadius: 0,
                        hitRadius: 0,
                        pointBackgroundColor: 'transparent',
                        pointBorderColor: 'transparent'
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                        legend: {
                            display: false
                        }
                    },
                    scales: {
                        x: {
                            ticks: {
                                color: '#CCCCCC',
                                maxTicksLimit: 6,
                                maxRotation: 45,
                                minRotation: 0
                            },
                            grid: {
                                color: '#333'
                            }
                        },
                        y: {
                            ticks: {
                                color: '#CCCCCC',
                                callback: function(value) {
                                    return value.toLocaleString() + ' 🪙';
                                }
                            },
                            grid: {
                                color: '#333'
                            }
                        }
                    }
                }
            });
        }

    } catch (error) {
        console.error('Error loading balance history:', error);
        const tooltip = document.getElementById('chart-tooltip');
        const title = document.getElementById('tooltip-title');
        title.textContent = `${userEmail} - Error`;
        tooltip.classList.remove('hidden');
        
        const chartContainer = document.querySelector('.chart-container');
        chartContainer.innerHTML = '<div class="no-data-message">Error loading data</div>';
    }
};

// Hide balance history chart
window.hideBalanceHistory = function() {
    const tooltip = document.getElementById('chart-tooltip');
    tooltip.classList.add('hidden');
    
    // Clear timeout
    if (tooltipTimeout) {
        clearTimeout(tooltipTimeout);
        tooltipTimeout = null;
    }
    
    // Destroy chart to prevent memory leaks
    if (tooltipChart) {
        tooltipChart.destroy();
        tooltipChart = null;
    }
};

// Authentication Popup Management
class AuthPopup {
    constructor() {
        this.isLoginMode = true;
        this.init();
    }

    init() {
        // Check if this is the first visit to homepage
        const hasVisited = sessionStorage.getItem('hasVisitedHomepage');
        
        if (!hasVisited) {
            // Mark as visited
            sessionStorage.setItem('hasVisitedHomepage', 'true');
            
            // Show popup after a short delay to let page load
            setTimeout(() => {
                this.showPopup();
            }, 500);
        }

        this.setupEventListeners();
    }

    setupEventListeners() {
        const popup = document.getElementById('auth-popup');
        const form = document.getElementById('auth-form');
        const switchBtn = document.getElementById('auth-switch-btn');
        const submitBtn = document.getElementById('auth-submit-btn');
        const title = document.getElementById('auth-title');
        const passwordField = document.getElementById('auth-password');
        const confirmPasswordField = document.getElementById('auth-confirm-password');
        const emailField = document.getElementById('auth-email');

        // Handle form submission with Firebase authentication
        form.addEventListener('submit', async (e) => {
            e.preventDefault();
            
            const email = emailField.value.trim();
            const password = passwordField.value;
            const username = document.getElementById('auth-username').value.trim();
            
            // Validate passwords match in signup mode
            if (!this.isLoginMode) {
                if (!this.validatePasswords()) {
                    return; // Don't close popup if passwords don't match
                }
            }
            
            // Show loading state
            const submitBtn = document.getElementById('auth-submit-btn');
            const originalText = submitBtn.textContent;
            submitBtn.textContent = 'Please wait...';
            submitBtn.disabled = true;
            
            try {
                let result;
                if (this.isLoginMode) {
                    result = await window.casinoAuth.signIn(email, password);
                } else {
                    if (!username) {
                        this.showError('Username is required');
                        return;
                    }
                    result = await window.casinoAuth.signUp(email, password, username);
                }
                
                if (result.success) {
            this.hidePopup();
                    this.showSuccess(this.isLoginMode ? 'Welcome back!' : 'Account created successfully!');
                } else {
                    // Show specific error message for sign-in failures
                    if (this.isLoginMode) {
                        this.showError('Incorrect email or password. Please check your credentials and try again.');
                    } else {
                        this.showError(result.error);
                    }
                }
            } catch (error) {
                // Show generic error for unexpected issues
                if (this.isLoginMode) {
                    this.showError('Incorrect email or password. Please check your credentials and try again.');
                } else {
                    this.showError('An unexpected error occurred. Please try again.');
                }
                console.error('Auth error:', error);
            } finally {
                // Reset button state
                submitBtn.textContent = originalText;
                submitBtn.disabled = false;
            }
        });

        // Handle login/signup toggle
        switchBtn.addEventListener('click', () => {
            this.toggleMode();
        });

        // Handle password validation in real-time
        if (passwordField && confirmPasswordField) {
            passwordField.addEventListener('input', () => {
                if (!this.isLoginMode) {
                    this.validatePasswords();
                }
            });

            confirmPasswordField.addEventListener('input', () => {
                if (!this.isLoginMode) {
                    this.validatePasswords();
                }
            });
        }
    }

    showPopup() {
        const popup = document.getElementById('auth-popup');
        if (popup) {
            popup.style.display = 'flex';
            // Focus on username field
            setTimeout(() => {
                const usernameField = document.getElementById('auth-username');
                if (usernameField) {
                    usernameField.focus();
                }
            }, 100);
        }
    }

    hidePopup() {
        const popup = document.getElementById('auth-popup');
        if (popup) {
            popup.style.display = 'none';
        }
    }

    toggleMode() {
        this.isLoginMode = !this.isLoginMode;
        
        const title = document.getElementById('auth-title');
        const submitBtn = document.getElementById('auth-submit-btn');
        const switchBtn = document.getElementById('auth-switch-btn');
        const usernameField = document.getElementById('auth-username');
        const passwordField = document.getElementById('auth-password');
        const confirmPasswordField = document.getElementById('auth-confirm-password');
        const emailField = document.getElementById('auth-email');
        const confirmPasswordGroup = document.querySelector('.auth-confirm-password');

        if (this.isLoginMode) {
            // Switch to login mode
            title.textContent = 'Welcome to The Parthenon';
            submitBtn.textContent = 'Login';
            switchBtn.textContent = 'Create Account';
            confirmPasswordGroup.style.display = 'none';
        } else {
            // Switch to signup mode
            title.textContent = 'Join The Parthenon';
            submitBtn.textContent = 'Sign Up';
            switchBtn.textContent = 'Already have an account?';
            confirmPasswordGroup.style.display = 'flex';
        }

        // Clear form fields and validation states
        if (usernameField) usernameField.value = '';
        if (emailField) emailField.value = '';
        if (passwordField) {
            passwordField.value = '';
            passwordField.classList.remove('error', 'success');
        }
        if (confirmPasswordField) {
            confirmPasswordField.value = '';
            confirmPasswordField.classList.remove('error', 'success');
        }
    }

    validatePasswords() {
        const passwordField = document.getElementById('auth-password');
        const confirmPasswordField = document.getElementById('auth-confirm-password');
        
        if (!passwordField || !confirmPasswordField) {
            return true;
        }

        const password = passwordField.value;
        const confirmPassword = confirmPasswordField.value;

        // Clear previous validation states
        passwordField.classList.remove('error', 'success');
        confirmPasswordField.classList.remove('error', 'success');

        // Check if passwords match
        if (confirmPassword && password !== confirmPassword) {
            passwordField.classList.add('error');
            confirmPasswordField.classList.add('error');
            return false;
        } else if (confirmPassword && password === confirmPassword) {
            passwordField.classList.add('success');
            confirmPasswordField.classList.add('success');
            return true;
        }

        return true; // Allow empty fields for now
    }

    showError(message) {
        // Remove any existing error messages
        const existingError = document.querySelector('.auth-error-message');
        if (existingError) {
            existingError.remove();
        }

        // Create error message element
        const errorDiv = document.createElement('div');
        errorDiv.className = 'auth-error-message';
        errorDiv.textContent = message;
        errorDiv.style.cssText = `
            color: #ff4444;
            background: rgba(255, 68, 68, 0.15);
            border: 2px solid #ff4444;
            border-radius: 8px;
            padding: 1rem;
            margin: 1rem 0;
            text-align: center;
            font-size: 1rem;
            font-weight: 600;
            box-shadow: 0 0 15px rgba(255, 68, 68, 0.3);
            animation: shake 0.5s ease-in-out;
        `;

        // Insert error message after the form
        const form = document.getElementById('auth-form');
        form.parentNode.insertBefore(errorDiv, form.nextSibling);

        // Auto-remove after 5 seconds
        setTimeout(() => {
            if (errorDiv.parentNode) {
                errorDiv.remove();
            }
        }, 5000);
    }

    showSuccess(message) {
        // Remove any existing success messages
        const existingSuccess = document.querySelector('.auth-success-message');
        if (existingSuccess) {
            existingSuccess.remove();
        }

        // Create success message element
        const successDiv = document.createElement('div');
        successDiv.className = 'auth-success-message';
        successDiv.textContent = message;
        successDiv.style.cssText = `
            color: #44ff44;
            background: rgba(68, 255, 68, 0.1);
            border: 1px solid #44ff44;
            border-radius: 5px;
            padding: 0.5rem;
            margin: 0.5rem 0;
            text-align: center;
            font-size: 0.9rem;
        `;

        // Insert success message after the form
        const form = document.getElementById('auth-form');
        form.parentNode.insertBefore(successDiv, form.nextSibling);

        // Auto-remove after 3 seconds
        setTimeout(() => {
            if (successDiv.parentNode) {
                successDiv.remove();
            }
        }, 3000);
    }
}

// Initialize Firebase Authentication and Auth Popup when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    // Initialize Firebase Authentication
    window.casinoAuth = new CasinoAuth();
    
    // Only initialize auth popup on homepage
    if (window.location.pathname.endsWith('home.html') || window.location.pathname.endsWith('/') || window.location.pathname === '') {
        new AuthPopup();
    }
}); 