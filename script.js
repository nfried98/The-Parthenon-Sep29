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
        this.balance = parseInt(localStorage.getItem('casinoBalance')) || 1000;
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
        this.betMinusBtn = document.querySelector('.bet-minus');
        this.betPlusBtn = document.querySelector('.bet-plus');
    }

    attachEventListeners() {
        this.betBtn.addEventListener('click', () => this.startNewHand());
        this.hitBtn.addEventListener('click', () => this.hit());
        this.standBtn.addEventListener('click', () => this.stand());
        this.betMinusBtn.addEventListener('click', () => this.adjustBet(-10));
        this.betPlusBtn.addEventListener('click', () => this.adjustBet(10));
    }

    adjustBet(amount) {
        if (this.gameInProgress) return;
        const newBet = this.currentBet + amount;
        if (newBet >= 10 && newBet <= this.balance) {
            this.currentBet = newBet;
            this.betElement.textContent = this.currentBet;
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
        localStorage.setItem('casinoBalance', this.balance);
    }

    createCardElement(card) {
        const cardElement = document.createElement('div');
        cardElement.className = 'card';
        // Special case for hidden dealer card (Greek themed)
        if (card.suit === '?' && card.value === 0) {
            cardElement.style.cssText = `
                background: #fff8e1;
                width: 60px;
                height: 90px;
                border-radius: 8px;
                box-shadow: 2px 2px 5px rgba(0,0,0,0.2);
                position: relative;
                display: flex;
                align-items: center;
                justify-content: center;
                border: 3px solid #C5A572;
                overflow: hidden;
            `;
            // Greek meander border (key pattern)
            const meander = document.createElement('div');
            meander.style.cssText = `
                position: absolute;
                inset: 0;
                border: 3px solid #C5A572;
                border-radius: 8px;
                pointer-events: none;
                box-sizing: border-box;
            `;
            cardElement.appendChild(meander);
            // Greek column SVG icon in the center
            const column = document.createElement('div');
            column.innerHTML = `
                <svg width="32" height="48" viewBox="0 0 32 48" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <rect x="6" y="18" width="20" height="24" rx="3" fill="#C5A572" stroke="#2C3E50" stroke-width="2"/>
                  <rect x="4" y="12" width="24" height="6" rx="2" fill="#C5A572" stroke="#2C3E50" stroke-width="2"/>
                  <rect x="2" y="6" width="28" height="6" rx="2" fill="#C5A572" stroke="#2C3E50" stroke-width="2"/>
                  <rect x="0" y="0" width="32" height="6" rx="2" fill="#C5A572" stroke="#2C3E50" stroke-width="2"/>
                </svg>
            `;
            column.style.cssText = 'z-index:1;';
            cardElement.appendChild(column);
            return cardElement;
        }
        const isRed = card.suit === '♥' || card.suit === '♦';
        cardElement.style.cssText = `
            background: white;
            color: ${isRed ? 'red' : 'black'};
            width: 60px;
            height: 90px;
            border-radius: 8px;
            box-shadow: 2px 2px 5px rgba(0,0,0,0.2);
            position: relative;
            display: flex;
            flex-direction: column;
            justify-content: center;
            align-items: center;
        `;
        // Top-left and bottom-right corners
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
        `;
        topLeft.innerHTML = `${card.displayValue}${card.suit}`;
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
        `;
        bottomRight.innerHTML = `${card.displayValue}${card.suit}`;
        // Center suit
        const centerSuit = document.createElement('div');
        centerSuit.style.cssText = `
            font-size: 2rem;
            font-family: 'Cinzel', serif;
            margin-top: 18px;
            color: inherit;
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

    async animateDealCardToHand(targetContainer, cardIndex) {
        // Find the deck element
        const deck = document.querySelector('.deck');
        if (!deck) return;
        // Insert a placeholder card at the target index
        const placeholder = document.createElement('div');
        // Make placeholder visually identical to a real card back
        const tempCard = this.createCardElement({ suit: '?', value: 0 });
        placeholder.className = tempCard.className;
        placeholder.style.cssText = tempCard.style.cssText;
        placeholder.innerHTML = tempCard.innerHTML;
        placeholder.style.opacity = '0';
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
        const animCard = document.createElement('div');
        animCard.className = 'dealing-card';
        animCard.style.position = 'fixed';
        animCard.style.left = `${deckCenterX - 30}px`;
        animCard.style.top = `${deckCenterY - 45}px`;
        animCard.style.width = '60px';
        animCard.style.height = '90px';
        animCard.style.borderRadius = '8px';
        animCard.style.background = 'repeating-linear-gradient(135deg, #fff8e1 0 12px, #C5A572 12px 24px)';
        animCard.style.border = '3px solid #C5A572';
        animCard.style.boxShadow = '2px 2px 5px rgba(0,0,0,0.2)';
        animCard.style.transition = 'left 0.38s cubic-bezier(.7,1,.7,1), top 0.38s cubic-bezier(.7,1,.7,1), opacity 0.18s';
        document.body.appendChild(animCard);
        // Force reflow
        animCard.offsetWidth;
        // Animate directly to the placeholder center
        animCard.style.left = `${phCenterX - 30}px`;
        animCard.style.top = `${phCenterY - 45}px`;
        await new Promise(res => setTimeout(res, 400));
        animCard.style.opacity = '0';
        await new Promise(res => setTimeout(res, 120));
        animCard.remove();
        // Remove placeholder and insert real card in its place
        const realCard = this.createCardElement(
            targetContainer === this.playerCardsElement
                ? this.playerHand[this.playerHand.length - 1]
                : (targetContainer === this.dealerCardsElement && targetContainer.children.length === 2
                    ? this.dealerHand[0]
                    : { suit: '?', value: 0 })
        );
        placeholder.replaceWith(realCard);
    }

    async startNewHand() {
        if (this.gameInProgress) return;
        if (this.currentBet > this.balance) return;
        this.balance -= this.currentBet;
        this.updateBalance();
        this.gameInProgress = true;
        this.deck.reset();
        this.playerHand = [];
        this.dealerHand = [];
        this.dealerCardsElement.innerHTML = '';
        this.playerCardsElement.innerHTML = '';
        // Deal sequence: player, dealer, player, dealer (hidden)
        for (let i = 0; i < 2; i++) {
            // Player card
            this.playerHand.push(this.deck.draw());
            await this.animateDealCardToHand(this.playerCardsElement, this.playerHand.length - 1);
            // Dealer card
            this.dealerHand.push(this.deck.draw());
            await this.animateDealCardToHand(this.dealerCardsElement, this.dealerHand.length - 1);
        }
        this.betBtn.disabled = true;
        this.hitBtn.disabled = false;
        this.standBtn.disabled = false;
        if (this.calculateHandValue(this.playerHand) === 21) {
            this.stand();
        }
    }

    async hit() {
        if (!this.gameInProgress) return;
        this.playerHand.push(this.deck.draw());
        await this.animateDealCardToHand(this.playerCardsElement, this.playerHand.length - 1);
        if (this.calculateHandValue(this.playerHand) > 21) {
            this.showBustMessage();
            setTimeout(() => {
                this.endHand('dealer');
            }, 1200);
        }
    }

    showBustMessage() {
        let bustMsg = document.createElement('div');
        bustMsg.textContent = 'Bust!';
        bustMsg.style.color = '#ff4444';
        bustMsg.style.fontFamily = "'Cinzel', serif";
        bustMsg.style.fontWeight = 'bold';
        bustMsg.style.fontSize = '2rem';
        bustMsg.style.textShadow = '0 0 10px #ff4444cc, 0 0 2px #fff';
        bustMsg.style.marginLeft = '1.5rem';
        bustMsg.style.animation = 'fadeInBust 0.5s';
        this.playerCardsElement.appendChild(bustMsg);
        setTimeout(() => {
            if (bustMsg.parentNode) bustMsg.parentNode.removeChild(bustMsg);
        }, 1100);
    }

    stand() {
        if (!this.gameInProgress) return;

        this.dealerCardsElement.innerHTML = '';
        for (let card of this.dealerHand) {
            this.dealerCardsElement.appendChild(this.createCardElement(card));
        }

        while (this.calculateHandValue(this.dealerHand) < 17) {
            this.dealerHand.push(this.deck.draw());
            this.dealerCardsElement.appendChild(this.createCardElement(this.dealerHand[this.dealerHand.length - 1]));
        }

        const playerValue = this.calculateHandValue(this.playerHand);
        const dealerValue = this.calculateHandValue(this.dealerHand);

        if (dealerValue > 21) {
            this.endHand('dealer-bust');
        } else if (dealerValue > playerValue) {
            this.endHand('dealer');
        } else if (dealerValue < playerValue) {
            this.endHand('player');
        } else {
            this.endHand('tie');
        }
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

    endHand(winner) {
        this.gameInProgress = false;
        this.betBtn.disabled = false;
        this.hitBtn.disabled = true;
        this.standBtn.disabled = true;

        // Always reveal dealer's full hand
        this.dealerCardsElement.innerHTML = '';
        for (let card of this.dealerHand) {
            this.dealerCardsElement.appendChild(this.createCardElement(card));
        }

        if (winner === 'player') {
            this.balance += this.currentBet * 2;
            this.showNotification('You win!');
            this.showPlayerMessage('You Win!', '#44bb44');
        } else if (winner === 'tie') {
            this.balance += this.currentBet;
            this.showNotification('Push!');
            this.showPlayerMessage('Push!', '#3399ff');
        } else if (winner === 'dealer-bust') {
            this.balance += this.currentBet * 2;
            this.showNotification('Dealer busts! You win!');
            this.showDealerMessage('Dealer Busts!', '#ff4444');
        } else {
            this.showNotification('Dealer wins!');
            this.showDealerMessage('Dealer Wins!', '#FFD700');
        }

        this.updateBalance();
        // Reset the deck for the next round
        this.deck.reset();
    }

    showPlayerMessage(msg, color) {
        // Remove any existing overlay
        const area = this.playerCardsElement.closest('.cards-area');
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
        this.balance = parseInt(localStorage.getItem('casinoBalance')) || 1000;
        this.isDropping = false;
        this.payouts = [16, 8, 4, 1, 1, 0.2, 0.2, 0.2, 0.2, 0.2, 1, 1, 4, 8, 16];
        this.pegRadius = 6;
        this.ballRadius = 8;
        
        this.balanceElement = document.querySelector('.balance-amount');
        this.notificationStack = document.querySelector('.plinko-notification-stack');
        this.betInput = document.getElementById('sidebar-bet-amount');
        this.betMultBtn = document.querySelector('.sidebar-bet-mult');
        this.betMaxBtn = document.querySelector('.sidebar-bet-max');
        
        this.initPegs();
        this.initControls();
        this.draw();

        // Sidebar Bet button event
        const sidebarBetBtn = document.querySelector('.sidebar-bet-btn');
        if (sidebarBetBtn) {
            sidebarBetBtn.onclick = () => {
                const betInput = document.getElementById('sidebar-bet-amount');
                let betValue = parseInt(betInput.value, 10);
                if (isNaN(betValue) || betValue < 1) betValue = 1;
                this.bet = betValue;
                this.dropBall();
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
                // Optional: quick highlight
                betInput.classList.add('highlight-bet');
                setTimeout(() => betInput.classList.remove('highlight-bet'), 200);
            };
        }
        // Sidebar Max button event
        if (this.betMaxBtn) {
            this.betMaxBtn.onclick = () => {
                this.betInput.value = Math.floor(this.balance);
                // Optional: quick highlight
                this.betInput.classList.add('highlight-bet');
                setTimeout(() => this.betInput.classList.remove('highlight-bet'), 200);
            };
        }
        this.setBetControlsEnabled(true);
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
        
        this.updateBetDisplay();
        this.updateBalance();
    }

    updateBalance() {
        if (this.balanceElement) {
            this.balanceElement.textContent = Math.floor(this.balance);
        }
        // Update the coin tab at the top
        const coinTab = document.querySelector('.coin-balance');
        if (coinTab) coinTab.textContent = Math.floor(this.balance);
        // Save balance to localStorage
        localStorage.setItem('casinoBalance', this.balance);
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
        if (this.balls.length > 40) return;
        if (this.balance < this.bet) {
            this.showNotification('Not enough balance!', null);
            return;
        }
        this.balance -= this.bet;
        this.updateBalance();
        const startX = this.width / 2;
        const firstPegY = this.pegs.length > 0 ? this.pegs[0].y : 40;
        const startY = firstPegY - 30;
        this.balls.push({ x: startX, y: startY, vx: 0, vy: 0, radius: this.ballRadius, resolved: false });
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
        }
    }

    update() {
        for (let ball of this.balls) {
            if (ball.resolved) continue;
            // Gravity
            ball.vy += 0.35;
            // Move
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
                    ball.vx = Math.cos(angle) * speed;
                    ball.vy = Math.sin(angle) * speed;
                    // Ensure minimum horizontal velocity
                    if (Math.abs(ball.vx) < 1.2) {
                        ball.vx = 1.2 * Math.sign(ball.vx || (Math.random() - 0.5));
                    }
                }
            }
            // Collide with walls
            if (ball.x < ball.radius) {
                ball.x = ball.radius;
                ball.vx *= -0.7;
            }
            if (ball.x > this.width - ball.radius) {
                ball.x = this.width - ball.radius;
                ball.vx *= -0.7;
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
        let message = payout > 0 ? `Plinko: You won ${this.bet * payout}!` : 'Plinko: No win!';
        // Determine color based on slot
        let color = '#fff8e1';
        if (payout >= 9) color = '#e74c3c';
        else if (payout >= 2) color = '#e67e22';
        else if (payout > 0.5) color = '#f1c40f';
        this.showNotification(message, color);
        if (payout > 0) {
            this.balance += this.bet * payout;
            this.updateBalance();
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
            this.ctx.fillStyle = '#E74C3C';
            this.ctx.strokeStyle = '#2C3E50';
            this.ctx.lineWidth = 2;
            this.ctx.fill();
            this.ctx.stroke();
        }
    }
}

// Initialize the games when the page loads
window.addEventListener('load', () => {
    // Only initialize Blackjack if we're on the blackjack page
    if (document.querySelector('.blackjack-table')) {
        window.blackjackGame = new BlackjackGame();
    }
    
    // Only initialize Plinko if we're on the plinko page
    if (document.querySelector('.plinko-table')) {
        window.plinkoGame = new PlinkoGame();
    }
}); 