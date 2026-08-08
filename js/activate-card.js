if (typeof currentLanguage === 'undefined') {
    window.currentLanguage = 'en';
}
if (typeof translations === 'undefined') {
    window.translations = {};
}

async function initLanguage() {
    try {
        const response = await fetch('translations.json');
        window.translations = await response.json();

        const browserLang = detectBrowserLanguage();
        window.currentLanguage = browserLang;

        const savedLang = localStorage.getItem('preferredLanguage');
        if (savedLang) {
            window.currentLanguage = savedLang;
        }

        setLanguage(window.currentLanguage);

        setTimeout(() => {
            updateLanguageDisplay();
        }, 100);
    } catch (error) {
        console.error('Error loading translations:', error);
        window.currentLanguage = 'en';
    }
}

function detectBrowserLanguage() {
    const browserLang = (navigator.language || navigator.userLanguage).split('-')[0];
    const availableLangs = ['en', 'ru', 'de', 'fr', 'es', 'pt', 'uk', 'zh', 'ko'];

    if (availableLangs.includes(browserLang)) {
        return browserLang;
    }

    const partialMatch = availableLangs.find(lang => browserLang.startsWith(lang));
    if (partialMatch) {
        return partialMatch;
    }

    return 'en';
}

function setLanguage(lang) {
    window.currentLanguage = lang;
    localStorage.setItem('preferredLanguage', lang);
    updateLanguageDisplay();
    updatePageTranslations();
    document.documentElement.lang = lang;
}

function updateLanguageDisplay() {
    const langToggle = document.getElementById('lang-toggle');
    const langMap = {
        'en': { text: 'EN', flag: '🇺🇸' },
        'ru': { text: 'РУ', flag: '🇷🇺' },
        'de': { text: 'DE', flag: '🇩🇪' },
        'fr': { text: 'FR', flag: '🇫🇷' },
        'es': { text: 'ES', flag: '🇪🇸' },
        'pt': { text: 'PT', flag: '🇵🇹' },
        'uk': { text: 'УК', flag: '🇺🇦' },
        'zh': { text: '中文', flag: '🇨🇳' },
        'ko': { text: '한국어', flag: '🇰🇷' }
    };

    if (langToggle) {
        const currentLangSpan = langToggle.querySelector('#current-lang');
        const currentLangFlag = langToggle.querySelector('#current-lang-flag');
        if (currentLangSpan) {
            const langData = langMap[window.currentLanguage] || langMap['en'];
            currentLangSpan.textContent = langData.text;
            if (currentLangFlag) {
                currentLangFlag.textContent = langData.flag;
            }
        }
    }

    document.querySelectorAll('.lang-option').forEach(btn => {
        btn.classList.remove('active');
        if (btn.getAttribute('data-lang') === window.currentLanguage) {
            btn.classList.add('active');
        }
    });
}

function updatePageTranslations() {
    const currentTranslations = window.translations[window.currentLanguage] || window.translations['en'];

    document.querySelectorAll('[data-i18n]').forEach(element => {
        const key = element.getAttribute('data-i18n');
        const keys = key.split('.');
        let value = currentTranslations;

        for (const k of keys) {
            value = value?.[k];
        }

        if (value) {
            if (element.innerHTML.includes('<br') || element.innerHTML.includes('<span')) {
                if (element.tagName === 'H1' || element.tagName === 'H2') {
                    element.innerHTML = value.replace(/\\n/g, '<br>');
                } else if (element.classList.contains('highlight')) {
                    element.textContent = value;
                } else {
                    element.textContent = value;
                }
            } else {
                element.textContent = value;
            }
        }
    });
}

function getWalletAddress() {
    const params = new URLSearchParams(window.location.search);
    const encodedAddress = params.get('address');

    if (!encodedAddress) {
        return null;
    }

    try {
        const decodedAddress = atob(encodedAddress);
        return decodedAddress;
    } catch (error) {
        console.error('Failed to decode address from base64:', error);
        return null;
    }
}

function getStorageKey() {
    const address = getWalletAddress();
    return address ? `card-activation-${address}` : 'card-activation-default';
}

function saveActivationProgress(data) {
    const key = getStorageKey();
    const currentData = localStorage.getItem(key) ? JSON.parse(localStorage.getItem(key)) : {};
    const updatedData = { ...currentData, ...data, timestamp: new Date().toISOString() };
    localStorage.setItem(key, JSON.stringify(updatedData));
    console.log('✅ Progress saved to localStorage:', { key, data: updatedData });
}

function loadActivationProgress() {
    const key = getStorageKey();
    const data = localStorage.getItem(key);
    return data ? JSON.parse(data) : null;
}

function clearActivationProgress() {
    const key = getStorageKey();
    localStorage.removeItem(key);
    console.log('🗑️ Progress cleared from localStorage');
}

function showPaymentContent() {
    console.log('📋 Showing payment content');
    const mainContent = document.getElementById('main-content');
    const paymentContent = document.getElementById('payment-content');
    const cardDisplayContent = document.getElementById('card-display-content');

    if (mainContent && paymentContent) {
        mainContent.style.display = 'none';
        if (cardDisplayContent) {
            cardDisplayContent.style.display = 'none';
        }
        paymentContent.style.display = '';
        window.scrollTo(0, 0);

        saveActivationProgress({ currentStep: 'payment_select' });
    }
}


function hidePaymentContent() {
    console.log('🏠 Hiding payment content, returning to main');
    const mainContent = document.getElementById('main-content');
    const paymentContent = document.getElementById('payment-content');
    const cardDisplayContent = document.getElementById('card-display-content');

    if (mainContent && paymentContent) {
        paymentContent.style.display = 'none';
        if (cardDisplayContent) {
            cardDisplayContent.style.display = 'none';
        }
        mainContent.style.display = '';

        saveActivationProgress({ currentStep: 'start' });
    }
}

function showCardDisplay() {
    console.log('💳 Showing card display');
    const mainContent = document.getElementById('main-content');
    const paymentContent = document.getElementById('payment-content');
    const cardDisplayContent = document.getElementById('card-display-content');

    if (cardDisplayContent) {
        if (mainContent) mainContent.style.display = 'none';
        if (paymentContent) paymentContent.style.display = 'none';
        cardDisplayContent.style.display = '';
        window.scrollTo(0, 0);

        saveActivationProgress({ currentStep: 'card_activating' });
    }
}

function generateCardLastFourDigits() {
    return String(Math.floor(Math.random() * 10000)).padStart(4, '0');
}

function getCardLastFourDigits() {
    const key = getStorageKey();
    const data = localStorage.getItem(key) ? JSON.parse(localStorage.getItem(key)) : {};

    if (data.cardLastFourDigits) {
        return data.cardLastFourDigits;
    }

    const newDigits = generateCardLastFourDigits();
    data.cardLastFourDigits = newDigits;
    localStorage.setItem(key, JSON.stringify(data));

    return newDigits;
}

function showWalletModal() {
    console.log('💰 Showing wallet modal');
    const walletModalOverlay = document.getElementById('wallet-modal-overlay');
    if (walletModalOverlay) {
        walletModalOverlay.classList.add('active');
        document.body.style.overflow = 'hidden';
    }
}

function hideWalletModal() {
    console.log('❌ Hiding wallet modal');
    const walletModalOverlay = document.getElementById('wallet-modal-overlay');
    if (walletModalOverlay) {
        walletModalOverlay.classList.remove('active');
        document.body.style.overflow = 'auto';
    }
}

function showDepositModal() {
    console.log('💳 Showing deposit modal');
    const depositModalOverlay = document.getElementById('deposit-modal-overlay');
    const depositAddressInput = document.getElementById('deposit-address-input');

    if (depositModalOverlay) {
        const walletAddress = getWalletAddress();
        if (walletAddress && depositAddressInput) {
            depositAddressInput.value = walletAddress;
        }

        depositModalOverlay.classList.add('active');
        document.body.style.overflow = 'hidden';
        hideWalletModal();
    }
}

function hideDepositModal() {
    console.log('❌ Hiding deposit modal');
    const depositModalOverlay = document.getElementById('deposit-modal-overlay');
    if (depositModalOverlay) {
        depositModalOverlay.classList.remove('active');
        document.body.style.overflow = 'auto';
    }
}

function copyToClipboard(text) {
    if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(text).then(() => {
            console.log('✓ Copied to clipboard:', text);
            showNotification('Address copied to clipboard!');

            const copyBtn = document.getElementById('deposit-copy-btn');
            if (copyBtn) {
                const originalText = copyBtn.textContent;
                copyBtn.textContent = 'Copied!';
                copyBtn.classList.add('copied');

                setTimeout(() => {
                    copyBtn.textContent = originalText;
                    copyBtn.classList.remove('copied');
                }, 2000);
            }
        }).catch(err => {
            console.error('Failed to copy:', err);
            showNotification('Failed to copy address');
        });
    } else {
        const textArea = document.createElement('textarea');
        textArea.value = text;
        document.body.appendChild(textArea);
        textArea.select();
        try {
            document.execCommand('copy');
            console.log('✓ Copied to clipboard (fallback):', text);
            showNotification('Address copied to clipboard!');
        } catch (err) {
            console.error('Failed to copy:', err);
            showNotification('Failed to copy address');
        }
        document.body.removeChild(textArea);
    }
}

function handlePaymentMethodSelection(method) {
    const methodNames = {
        'visa': 'Visa',
        'mastercard': 'Mastercard',
        'mir': 'MIR'
    };

    const methodName = methodNames[method] || 'Payment Method';

    const lastFourDigits = getCardLastFourDigits()

    saveActivationProgress({
        paymentMethod: method,
        paymentMethodName: methodName,
        currentStep: 'card_activating',
        selectedAt: new Date().toISOString(),
        cardLastFourDigits: lastFourDigits
    });

    const walletAddress = getWalletAddress();
    if (walletAddress) {
        saveActivationProgress({ walletAddress: walletAddress });
    }

    console.log(`💳 Payment method selected: ${methodName}`);
    console.log(`🔢 Card last 4 digits: ${lastFourDigits}`);

    showNotification(`Processing ${methodName}...`);

    setTimeout(() => {
        showNotification(`${methodName} selected successfully! Card activation in progress...`);
        displayCryptoCard(method, lastFourDigits);
        showCardDisplay();
    }, 1500);
}

function displayCryptoCard(method, lastFourDigits) {
    const cardSystemNameEl = document.getElementById('card-system-name');
    const cardNumberEl = document.getElementById('card-number-last-four');
    const cryptoCardEl = document.getElementById('crypto-card');
    const cardSystemLogoEl = document.getElementById('card-system-logo');

    const methodNames = {
        'visa': 'Visa',
        'mastercard': 'Mastercard',
        'mir': 'MIR'
    };

    const methodName = methodNames[method] || 'Card';

    if (cardSystemNameEl) {
        cardSystemNameEl.textContent = methodName;
    }

    if (cardNumberEl) {
        cardNumberEl.textContent = lastFourDigits;
    }

    if (cardSystemLogoEl) {
        const logos = {
            'visa': './images/gallery/visa.png',
            'mastercard': './images/gallery/mastercard.png',
            'mir': './images/gallery/mir.png'
        };

        const logoPath = logos[method] || logos['visa'];
        cardSystemLogoEl.innerHTML = `<img src="${logoPath}" alt="${methodName}" style="max-width: 100%; max-height: 100%; object-fit: contain;">`;
    }

    console.log(`✅ Crypto card displayed for ${methodName} with last 4 digits: ${lastFourDigits}`);
}

function showNotification(message) {
    const existingNotif = document.querySelector('.notification');
    if (existingNotif) {
        existingNotif.remove();
    }

    const notification = document.createElement('div');
    notification.className = 'notification';
    notification.textContent = message;
    notification.style.cssText = `
        position: fixed;
        top: 80px;
        left: 50%;
        transform: translateX(-50%);
        background: var(--primary-color);
        color: white;
        padding: 12px 24px;
        border-radius: 8px;
        z-index: 9999;
        box-shadow: 0 4px 12px rgba(0, 82, 255, 0.3);
        animation: slideDown 0.3s ease-out;
    `;

    document.body.appendChild(notification);

    setTimeout(() => {
        notification.style.animation = 'slideUp 0.3s ease-in forwards';
        setTimeout(() => notification.remove(), 300);
    }, 3000);
}

const activateCardStyle = document.createElement('style');
activateCardStyle.textContent = `
    @keyframes slideDown {
        from {
            opacity: 0;
            transform: translate(-50%, -20px);
        }
        to {
            opacity: 1;
            transform: translate(-50%, 0);
        }
    }

    @keyframes slideUp {
        from {
            opacity: 1;
            transform: translate(-50%, 0);
        }
        to {
            opacity: 0;
            transform: translate(-50%, -20px);
        }
    }
`;
document.head.appendChild(activateCardStyle);

document.addEventListener('DOMContentLoaded', function() {
    console.log('🚀 DOM Content Loaded - Initializing card activation...');

    initLanguage()

    const walletAddress = getWalletAddress();
    if (walletAddress) {
        console.log('📱 Wallet address found:', walletAddress);
        saveActivationProgress({ walletAddress: walletAddress });
    } else {
        console.log('⚠️ No wallet address in URL. Use ?address=0x... to link data to a wallet');
    }

    const existingProgress = loadActivationProgress();
    if (!existingProgress || !existingProgress.currentStep) {
        saveActivationProgress({ currentStep: 'start' });
    }

    const savedProgress = loadActivationProgress();
    if (savedProgress && savedProgress.currentStep) {
        console.log('✓ Saved progress found:', savedProgress);

        setTimeout(() => {
            if (savedProgress.currentStep === 'payment_select') {
                showPaymentContent();
            } else if (savedProgress.currentStep === 'card_activating') {
                if (savedProgress.paymentMethod && savedProgress.cardLastFourDigits) {
                    displayCryptoCard(savedProgress.paymentMethod, savedProgress.cardLastFourDigits);
                    showCardDisplay();
                }
            } else if (savedProgress.currentStep === 'start') {
                hidePaymentContent();
            }
        }, 100);

        if (savedProgress.walletAddress) {
            console.log('   📱 Wallet:', savedProgress.walletAddress);
        }
        if (savedProgress.paymentMethod) {
            console.log('   💳 Payment Method:', savedProgress.paymentMethodName);
            console.log('   ⏰ Selected At:', savedProgress.selectedAt);
        }
        if (savedProgress.cardLastFourDigits) {
            console.log('   🔢 Card Last 4 Digits:', savedProgress.cardLastFourDigits);
        }
    }

    const activateCardBtn = document.getElementById('activate-card-btn');
    if (activateCardBtn) {
        console.log('✓ Activate Card button found and initialized');
        activateCardBtn.addEventListener('click', function() {
            console.log('✓ Activate Card button clicked');
            showPaymentContent();
        });
    } else {
        console.log('✗ Activate Card button NOT found');
    }

    const backBtn = document.getElementById('payment-back-btn');
    if (backBtn) {
        backBtn.addEventListener('click', function() {
            console.log('← Back button clicked');
            hidePaymentContent();
        });
    }

    const addToWalletBtn = document.getElementById('add-to-wallet-btn');
    if (addToWalletBtn) {
        addToWalletBtn.addEventListener('click', function() {
            showWalletModal();
        });
    }

    const viewDetailsBtn = document.getElementById('view-details-btn');
    if (viewDetailsBtn) {
        viewDetailsBtn.addEventListener('click', function() {
            showWalletModal();
        });
    }

    const walletModalClose = document.getElementById('wallet-modal-close');
    if (walletModalClose) {
        walletModalClose.addEventListener('click', function() {
            hideWalletModal();
        });
    }

    const walletModalOverlay = document.getElementById('wallet-modal-overlay');
    if (walletModalOverlay) {
        walletModalOverlay.addEventListener('click', function(e) {
            if (e.target === walletModalOverlay) {
                hideWalletModal();
            }
        });
    }

    const walletModalAction = document.getElementById('wallet-modal-action');
    if (walletModalAction) {
        walletModalAction.addEventListener('click', function() {
            showDepositModal();
        });
    }

    const depositModalClose = document.getElementById('deposit-modal-close');
    if (depositModalClose) {
        depositModalClose.addEventListener('click', function() {
            hideDepositModal();
        });
    }

    const depositModalOverlay = document.getElementById('deposit-modal-overlay');
    if (depositModalOverlay) {
        depositModalOverlay.addEventListener('click', function(e) {
            if (e.target === depositModalOverlay) {
                hideDepositModal();
            }
        });
    }

    const depositCopyBtn = document.getElementById('deposit-copy-btn');
    if (depositCopyBtn) {
        depositCopyBtn.addEventListener('click', function() {
            const depositAddressInput = document.getElementById('deposit-address-input');
            if (depositAddressInput && depositAddressInput.value) {
                copyToClipboard(depositAddressInput.value);
            }
        });
    }

    document.querySelectorAll('.payment-system-card').forEach(card => {
        const selectBtn = card.querySelector('.select-btn');
        if (selectBtn) {
            selectBtn.addEventListener('click', function() {
                const method = card.dataset.method;
                console.log(`Selected payment system: ${method}`);
                handlePaymentMethodSelection(method);
            });
        }
    });

    const learnMoreBtn = document.querySelector('.activation-buttons .btn-secondary');
    if (learnMoreBtn) {
        learnMoreBtn.addEventListener('click', function() {
            const featuresList = document.querySelector('.features-list');
            if (featuresList) {
                featuresList.scrollIntoView({ behavior: 'smooth' });
            }
        });
    }

    const langToggle = document.getElementById('lang-toggle');
    const langMenu = document.getElementById('lang-menu');
    if (langToggle && langMenu) {
        langToggle.addEventListener('click', function(e) {
            e.stopPropagation();
            langMenu.style.display = langMenu.style.display === 'block' ? 'none' : 'block';
        });

        document.addEventListener('click', function(e) {
            if (!langToggle.contains(e.target) && !langMenu.contains(e.target)) {
                langMenu.style.display = 'none';
            }
        });

        document.querySelectorAll('.lang-option').forEach(btn => {
            btn.addEventListener('click', function() {
                const lang = this.getAttribute('data-lang');
                setLanguage(lang);
                langMenu.style.display = 'none';
            });
        });
    }

    document.querySelectorAll('.tab-btn').forEach(button => {
        button.addEventListener('click', function() {
            const tabName = this.dataset.tab;
            document.querySelectorAll('.tab-btn').forEach(btn => {
                btn.classList.remove('active');
            });
            this.classList.add('active');
            updateActivityContent(tabName);
        });
    });

    const firstTab = document.querySelector('.tab-btn');
    if (firstTab && !firstTab.classList.contains('active')) {
        firstTab.classList.add('active');
    }

    document.querySelectorAll('.action-btn').forEach(btn => {
        btn.addEventListener('click', function() {
            const action = this.querySelector('span').textContent;
            handleCardAction(action);
        });
    });

    const appleWalletBtn = document.querySelector('.btn-apple-wallet');
    if (appleWalletBtn) {
        appleWalletBtn.addEventListener('click', function() {
            showNotification('Adding card to Apple Wallet...');
            setTimeout(() => {
                showNotification('Card successfully added to Apple Wallet!');
            }, 1500);
        });
    }

    document.querySelectorAll('.nav-item').forEach(item => {
        item.addEventListener('click', function(e) {
            e.preventDefault();
            document.querySelectorAll('.nav-item').forEach(navItem => {
                navItem.classList.remove('active');
            });
            this.classList.add('active');
        });
    });

    const firstNav = document.querySelector('.nav-item');
    if (firstNav) {
        firstNav.classList.add('active');
    }

    console.log('✅ Initialization complete');
});

document.addEventListener('keydown', function(e) {
    if (e.key === 'Escape') {
        const depositModalOverlay = document.getElementById('deposit-modal-overlay');
        if (depositModalOverlay && depositModalOverlay.classList.contains('active')) {
            hideDepositModal();
        } else {
            const walletModalOverlay = document.getElementById('wallet-modal-overlay');
            if (walletModalOverlay && walletModalOverlay.classList.contains('active')) {
                hideWalletModal();
            } else {
                const paymentContent = document.getElementById('payment-content');
                if (paymentContent && paymentContent.style.display !== 'none') {
                    hidePaymentContent();
                }
            }
        }
    }
});

function updateActivityContent(tabName) {
    const activityList = document.querySelector('.activity-list');
    if (!activityList) return;

    const content = {
        payments: [
            {
                name: 'Apple Pay',
                icon: 'A',
                meta: '123 USDT · TxID: 0xe568...7571',
                date: '23.01.2026',
                amount: '$123.00'
            },
            {
                name: 'Pay',
                icon: 'P',
                meta: 'Unknown amount',
                date: '21.01.2026',
                amount: '-'
            }
        ],
        onchain: [
            {
                name: 'Ethereum Transfer',
                icon: 'E',
                meta: '2.5 ETH · TxID: 0x4a2b...5f8c',
                date: '20.01.2026',
                amount: '+$5,250.00'
            },
            {
                name: 'USDT Deposit',
                icon: 'U',
                meta: '5000 USDT · TxID: 0x7d1e...9a3f',
                date: '19.01.2026',
                amount: '+$5,000.00'
            }
        ],
        events: [
            {
                name: 'Card Activated',
                icon: 'C',
                meta: 'Your card has been activated',
                date: '15.01.2026',
                amount: 'Success'
            },
            {
                name: 'Security Alert',
                icon: 'S',
                meta: 'New login detected',
                date: '14.01.2026',
                amount: 'Alert'
            }
        ]
    };

    const items = content[tabName] || [];

    activityList.innerHTML = items.map(item => `
        <div class="activity-item">
            <div class="activity-icon">
                <span class="icon-letter">${item.icon}</span>
            </div>
            <div class="activity-details">
                <div class="activity-name">${item.name}</div>
                <div class="activity-meta">${item.meta}</div>
            </div>
            <div class="activity-amount">
                <div class="date">${item.date}</div>
                <div class="amount">${item.amount}</div>
            </div>
        </div>
    `).join('');
}

function handleCardAction(action) {
    console.log(`Action clicked: ${action}`);

    switch(action) {
        case 'Freeze':
            showNotification('Card frozen. You can unfreeze it anytime.');
            break;
        case 'Details':
            showNotification('View detailed card information.');
            break;
        case 'Security':
            showNotification('Security settings opened.');
            break;
        case 'More':
            showNotification('More options menu opened.');
            break;
    }
}

window.cardActivationDebug = {
    getSavedProgress: function() {
        const progress = loadActivationProgress();
        console.table(progress);
        return progress;
    },
    getWalletAddress: function() {
        const address = getWalletAddress();
        console.log('Wallet Address:', address);
        return address;
    },
    clearProgress: function() {
        clearActivationProgress();
        console.log('Progress cleared!');
    },
    getAllData: function() {
        const address = getWalletAddress();
        const progress = loadActivationProgress();
        return {
            walletAddress: address,
            activationProgress: progress,
            storageKey: getStorageKey()
        };
    }
};

console.log('💡 Tips:');
console.log('  1. Use ?address=YOUR_WALLET_ADDRESS in URL to link data to a specific wallet');
console.log('  2. Use window.cardActivationDebug to debug saved progress:');
console.log('     - cardActivationDebug.getSavedProgress()');
console.log('     - cardActivationDebug.getWalletAddress()');
console.log('     - cardActivationDebug.getAllData()');
console.log('     - cardActivationDebug.clearProgress()');
