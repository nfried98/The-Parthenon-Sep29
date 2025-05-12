// Add this at the top of the file, before any class definitions
class CasinoBalance {
    static getBalance() {
        return parseInt(localStorage.getItem('casinoBalance')) || 0;
    }

    static setBalance(amount) {
        localStorage.setItem('casinoBalance', amount);
        // Update all balance displays on the page
        const balanceElements = document.querySelectorAll('.balance-amount, .coin-balance');
        balanceElements.forEach(element => {
            element.textContent = Math.floor(amount);
        });
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
        this.betMinusBtn = document.querySelector('.bet-minus');
        this.betPlusBtn = document.querySelector('.bet-plus');
        this.betMaxBtn = document.querySelector('.bet-max');
        // Render the deck card back
        const deckElem = document.querySelector('.deck');
        if (deckElem) {
            deckElem.innerHTML = '';
            deckElem.appendChild(this.createCardBackElement());
        }
    }

    attachEventListeners() {
        this.betBtn.addEventListener('click', () => this.startNewHand());
        this.hitBtn.addEventListener('click', () => this.hit());
        this.standBtn.addEventListener('click', () => this.stand());
        this.splitBtn.addEventListener('click', () => this.splitHand());
        this.betMinusBtn.addEventListener('click', () => this.adjustBet(-10));
        this.betPlusBtn.addEventListener('click', () => this.adjustBet(10));
        this.betMaxBtn.addEventListener('click', () => this.setMaxBet());
        
        // Handle manual bet input
        this.betElement.addEventListener('input', (e) => {
            if (this.gameInProgress) return;
            let value = parseInt(e.target.value);
            if (isNaN(value)) value = 0;
            if (value < 0) value = 0;
            if (value > this.balance) value = this.balance;
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
            if (value > this.balance) {
                value = this.balance;
                e.target.value = value;
            }
            this.currentBet = value;
        });
    }

    setMaxBet() {
        if (this.gameInProgress) return;
        this.currentBet = this.balance;
        this.betElement.value = this.currentBet;
        this.betElement.classList.add('highlight');
        setTimeout(() => this.betElement.classList.remove('highlight'), 500);
    }

    adjustBet(amount) {
        if (this.gameInProgress) return;
        const newBet = this.currentBet + amount;
        if (newBet >= 0 && newBet <= this.balance) {
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

    createCardElement(card) {
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
            font-size: 2rem;
            font-family: 'Cinzel', serif;
            margin-top: 18px;
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

    async animateDealCardToHand(targetContainer, cardIndex, handOverride) {
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
        animCard.style.opacity = '0';
        await new Promise(res => setTimeout(res, 120));
        animCard.remove();
        // Remove placeholder and insert real card in its place
        let realCard;
        if (handOverride) {
            realCard = this.createCardElement(handOverride[cardIndex]);
        } else {
            realCard = this.createCardElement(
                targetContainer === this.playerCardsElement
                    ? this.playerHand[this.playerHand.length - 1]
                    : (targetContainer === this.dealerCardsElement && targetContainer.children.length === 2
                        ? this.dealerHand[0]
                        : { suit: '?', value: 0 })
            );
        }
        placeholder.replaceWith(realCard);
    }

    async startNewHand() {
        if (this.gameInProgress) return;
        if (this.currentBet < 1) {
            this.showNotification('Minimum bet is 1');
            return;
        }
        if (this.currentBet > this.balance) return;
        this.balance -= this.currentBet;
        this.updateBalance();
        this.gameInProgress = true;
        this.deck.reset();
        this.playerHand = [];
        this.dealerHand = [];
        this.dealerCardsElement.innerHTML = '';
        this.playerCardsElement.innerHTML = '';
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
            await this.animateDealCardToHand(this.playerCardsElement, this.playerHand.length - 1);
            // Dealer card
            this.dealerHand.push(this.deck.draw());
            await this.animateDealCardToHand(this.dealerCardsElement, this.dealerHand.length - 1);
        }
        this.updateSplitButtonState();
        this.betBtn.disabled = true;
        this.hitBtn.disabled = false;
        this.standBtn.disabled = false;
        this.updateSplitButtonState();
        if (this.calculateHandValue(this.playerHand) === 21) {
            this.stand();
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
                await this.animateDealCardToHand(handDiv, handDiv.children.length, this.splitHands[this.splitActiveHand]);
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
        await this.animateDealCardToHand(this.playerCardsElement, this.playerHand.length - 1);
        if (this.calculateHandValue(this.playerHand) > 21) {
            this.showBustMessage();
            setTimeout(() => {
                this.endHand('dealer');
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
            this.showPlayerMessage('You Win!', '#FFD700', null, '#B8860B');
        } else if (winner === 'tie') {
            this.balance += this.currentBet;
            this.showNotification('Push!');
            this.showPlayerMessage('Push!', '#3399ff');
        } else if (winner === 'dealer-bust') {
            this.balance += this.currentBet * 2;
            this.showNotification('Dealer busts! You win!');
            this.showPlayerMessage('You Win!', '#FFD700', null, '#B8860B');
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
        if (this.balance < this.currentBet) {
            this.showNotification('Not enough balance to split!');
            return;
        }
        // Deduct second bet
        this.balance -= this.currentBet;
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
            await this.animateDealCardToHand(handDivs[i], 1, this.splitHands[i]);
            // Add glow to both cards in the active hand
            if (i === this.splitActiveHand) {
                for (let cardElem of handDivs[i].children) {
                    cardElem.style.boxShadow = '0 0 12px 2px #FFD700';
                }
            }
        }

        // If ace split, auto-stand both
        if (isAceSplit) {
            this.splitResults[0] = this.calculateHandValue(this.splitHands[0]);
            this.splitResults[1] = this.calculateHandValue(this.splitHands[1]);
            await new Promise(res => setTimeout(res, 800));
            this.finishSplitHands();
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
                if (i === this.splitActiveHand) {
                    cardElem.style.boxShadow = '0 0 12px 2px #FFD700';
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
        this.dealerCardsElement.innerHTML = '';
        for (let card of this.dealerHand) {
            this.dealerCardsElement.appendChild(this.createCardElement(card));
        }
        while (this.calculateHandValue(this.dealerHand) < 17) {
            this.dealerHand.push(this.deck.draw());
            this.dealerCardsElement.appendChild(this.createCardElement(this.dealerHand[this.dealerHand.length - 1]));
        }
        // Compare both hands to dealer
        for (let i = 0; i < 2; i++) {
            let playerValue = typeof this.splitResults[i] === 'number' ? this.splitResults[i] : this.calculateHandValue(this.splitHands[i]);
            let dealerValue = this.calculateHandValue(this.dealerHand);
            let bet = this.currentBet;
            if (playerValue === 'bust' || playerValue > 21) {
                this.showNotification(`Hand ${i + 1}: Bust!`);
            } else if (dealerValue > 21) {
                this.balance += bet * 2;
                this.showNotification(`Hand ${i + 1}: Dealer busts! You win!`);
                this.showPlayerMessage('You Win!', '#FFD700', i, '#B8860B');
            } else if (playerValue > dealerValue) {
                this.balance += bet * 2;
                this.showNotification(`Hand ${i + 1}: You win!`);
                this.showPlayerMessage('You Win!', '#FFD700', i, '#B8860B');
            } else if (playerValue < dealerValue) {
                this.showNotification(`Hand ${i + 1}: Dealer wins!`);
            } else {
                this.balance += bet;
                this.showNotification(`Hand ${i + 1}: Push!`);
            }
        }
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
        // Enable split if player has two cards of the same value and enough balance, and not already split
        if (
            this.gameInProgress &&
            !this.splitHands &&
            this.playerHand.length === 2 &&
            this.playerHand[0].numericValue === this.playerHand[1].numericValue &&
            this.balance >= this.currentBet
        ) {
            this.splitBtn.disabled = false;
        } else {
            this.splitBtn.disabled = true;
        }
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
        
        this.balanceElement = document.querySelector('.balance-amount');
        this.notificationStack = document.querySelector('.plinko-notification-stack');
        this.betInput = document.getElementById('sidebar-bet-amount');
        this.betMultBtn = document.querySelector('.sidebar-bet-mult');
        this.betMaxBtn = document.querySelector('.sidebar-bet-max');
        this.betBtn = document.querySelector('.sidebar-bet-btn');
        this.manualTab = document.querySelector('.sidebar-tab[data-mode="manual"]');
        this.autoTab = document.querySelector('.sidebar-tab[data-mode="auto"]');
        
        this.initPegs();
        this.initControls();
        this.draw();
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
        // Stop auto dropping if switching to manual mode
        if (!this.isAutoMode && this.autoInterval) {
            this.toggleAutoDrop();
        }
    }

    toggleAutoDrop() {
        if (this.autoInterval) {
            clearInterval(this.autoInterval);
            this.autoInterval = null;
            this.betBtn.textContent = 'Start';
        } else {
            const betInput = document.getElementById('sidebar-bet-amount');
            let betValue = parseInt(betInput.value, 10);
            if (isNaN(betValue) || betValue < 1) betValue = 1;
            this.bet = betValue;
            this.autoInterval = setInterval(() => {
                // Drop 3 balls per interval
                for (let i = 0; i < 3; i++) {
                    if (this.balance >= this.bet) {
                        this.dropBall();
                    } else {
                        this.toggleAutoDrop(); // Stop if not enough balance
                        this.showNotification('Not enough balance!', null);
                        break;
                    }
                }
            }, 200); // Drop balls every 200ms (15 times per second)
            this.betBtn.textContent = 'Stop';
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
        }
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