// Цей код запускається, коли вся HTML-структура сторінки завантажена.
document.addEventListener('DOMContentLoaded', () => {
    // Отримуємо елемент canvas і його 2D-контекст для малювання.
    const canvas = document.getElementById('tradingChart');
    const ctx = canvas.getContext('2d');

    // 🔧 Заміна фіксованих розмірів на адаптивні
    let width, height, Dpr;
    function resizeCanvas() {
        const cssWidth = canvas.clientWidth;
        const cssHeight = canvas.clientHeight;
        Dpr = window.devicePixelRatio || 1;
        canvas.width = Math.max(1, Math.floor(cssWidth * Dpr));
        canvas.height = Math.max(1, Math.floor(cssHeight * Dpr));
        ctx.setTransform(1, 0, 0, 1, 0, 0); // скидаємо попередні трансформації
        ctx.scale(Dpr, Dpr);                // масштабуємо під DPR
        width = cssWidth;                   // зберігаємо поточні CSS-розміри
        height = cssHeight;
    }
    window.addEventListener('resize', () => {
        resizeCanvas();
        drawChart(); // перемальовуємо при зміні розміру
    });

    // Отримуємо всі DOM-елементи, які відображають статистичні дані.
    const currentRTPElement = document.getElementById('currentRTP');
    const averageRTPElement = document.getElementById('averageRTP');
    const volatilityElement = document.getElementById('volatility');

    // Елементи для модального вікна
    const modalCurrentRTPElement = document.getElementById('modal_currentRTP');
    const modalAverageRTPElement = document.getElementById('modal_averageRTP');
    const modalVolatilityElement = document.getElementById('modal_volatility');
    const lastBigWinElement = document.getElementById('lastBigWin');
    const booksFrequencyElement = document.getElementById('booksFrequency');
    const longestStreakElement = document.getElementById('longestStreak');
    const bonusProbabilityElement = document.getElementById('bonusProbability');
    const activePlayersElement = document.getElementById('activePlayers');
    const lastJackpotTimeElement = document.getElementById('lastJackpotTime');

    const moreInfoBtn = document.querySelector('.more_info');
    const modal = document.getElementById('moreInfoModal');
    const closeBtn = document.querySelector('.close-button');

    moreInfoBtn.addEventListener('click', () => {
        modal.classList.remove('hidden');
        updateModalData();
    });

    closeBtn.addEventListener('click', () => {
        modal.classList.add('hidden');
    });

    window.addEventListener('click', (e) => {
        if (e.target === modal) {
            modal.classList.add('hidden');
        }
    });

    // Симуляція даних для графіка. Це масив "сценаріїв".
    const scenario = [
        // 1. Червона зона
        { type: 'normal', color: '#ff6666', duration: 5 * 60 + 3 * 60, minRTP: 10, maxRTP: 45 },
        // 2. Червона зона
        { type: 'normal', color: '#ff6666', duration: 1 * 60 + 2 * 60, minRTP: 10, maxRTP: 45 },
        // 3. Зелена зона
        { type: 'normal', color: '#00c107', duration: 8 * 60 + 30 + 30 * 60, minRTP: 75, maxRTP: 95 },
        // 4. Червона зона
        { type: 'normal', color: '#ff6666', duration: 2 * 60 + 15 + 40, minRTP: 10, maxRTP: 45 },
        // 5. Зелена зона
        { type: 'normal', color: '#00c107', duration: 4 * 60 + 15 * 60, minRTP: 75, maxRTP: 95 },
        // 6. Зелена зона
        { type: 'normal', color: '#00c107', duration: 6 * 60, minRTP: 75, maxRTP: 95 },
        // 7. Червона зона
        { type: 'normal', color: '#ff6666', duration: 6 * 60 + 30, minRTP: 10, maxRTP: 45 },
        // 8. Зелена зона
        { type: 'normal', color: '#00c107', duration: 6 * 60 + 6 * 60, minRTP: 75, maxRTP: 95 }
    ];

    // Зберігаємо стан симуляції в localStorage, щоб він зберігався при оновленні сторінки.
    let state = JSON.parse(localStorage.getItem('analyzerState')) || {
        prices: [], // Масив точок даних для графіка
        maxPoints: 50, // Максимальна кількість точок на графіку
        yMin: 0,
        yMax: 100,
        scenarioIndex: 0, // Поточний індекс сценарію
        phaseStartTime: Date.now(), // Час початку поточної фази
        longestStreakValue: 9, 
        bonusProbabilityValue: 5.0,
        lastBigWinTime: '--',
        booksFrequencyValue: '--',
        activePlayersValue: 0,
        lastJackpotTime: formatCurrency(Math.floor(Math.random() * (200000 - 50000 + 1)) + 50000),
        lastJackpotUpdate: Date.now() // Додано для відстеження часу оновлення джекпоту
    };

    // Якщо це перший запуск (масив цін порожній), ініціалізуємо його початковою ціною.
    if (state.prices.length === 0) {
        const currentPhase = scenario[state.scenarioIndex];
        const initialRTP = (currentPhase.minRTP + currentPhase.maxRTP) / 2;
        state.prices.push(initialRTP);
    }

    // Після ініціалізації стану — встановлюємо адаптивні розміри canvas
    resizeCanvas();

    // Функція для переходу до наступного сценарію.
    function transitionToNextPhase() {
        state.scenarioIndex = (state.scenarioIndex + 1) % scenario.length;
        state.phaseStartTime = Date.now();
        localStorage.setItem('analyzerState', JSON.stringify(state));
    }

    // Функція для малювання графіка.
    function drawChart() {
        // Очищаємо весь canvas перед малюванням.
        ctx.clearRect(0, 0, width, height);
        // Якщо даних немає, нічого не малюємо.
        if (state.prices.length === 0) return;

        // Розраховуємо динамічний діапазон по осі Y на основі поточних даних.
        const minRTP = Math.min(...state.prices);
        const maxRTP = Math.max(...state.prices);
        const padding = (maxRTP - minRTP) * 0.1;
        const yMinDynamic = Math.max(0, minRTP - padding);
        const yMaxDynamic = Math.min(100, maxRTP + padding);
        const yRange = (yMaxDynamic - yMinDynamic) || 1;

        // Малювання фонової сітки (горизонтальні та вертикальні лінії).
        ctx.strokeStyle = 'rgba(0, 255, 247, 0.2)';
        ctx.lineWidth = 0.5;
        const gridXStep = width / 10;
        const gridYStep = height / 5;
        for (let i = 1; i < 10; i++) {
            ctx.beginPath();
            ctx.moveTo(i * gridXStep, 0);
            ctx.lineTo(i * gridXStep, height);
            ctx.stroke();
        }
        for (let i = 1; i < 5; i++) {
            ctx.beginPath();
            ctx.moveTo(0, i * gridYStep);
            ctx.lineTo(width, i * gridYStep);
            ctx.stroke();
        }

        // Малювання осей.
        ctx.strokeStyle = '#959595ff';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.moveTo(5, 0);
        ctx.lineTo(5, height);
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(0, height - 5);
        ctx.lineTo(width, height - 5);
        ctx.stroke();

        // Малювання міток на осях.
        ctx.fillStyle = '#00ffffff';
        ctx.font = `10px sans-serif`;
        ctx.textAlign = 'left';
        const yLabels = [yMinDynamic, yMinDynamic + yRange * 0.25, yMinDynamic + yRange * 0.5, yMinDynamic + yRange * 0.75, yMaxDynamic];
        yLabels.forEach((label, index) => {
            const y = height - ((label - yMinDynamic) / yRange) * height;
            ctx.fillText(label.toFixed(0), 10, y);
        });

        // Малювання градієнтної області під лінією графіка.
        const xStep = width / (state.maxPoints - 1);
        const gradient = ctx.createLinearGradient(0, 0, 0, height);
        let topShadowColor = (state.prices[state.prices.length - 1] >= 50) ? 'rgba(0, 255, 183, 0.78)' : 'rgba(255, 0, 0, 0.75)';
        gradient.addColorStop(0, topShadowColor);
        gradient.addColorStop(1, 'rgba(28, 28, 28, 0)');
        ctx.fillStyle = gradient;
        ctx.beginPath();
        ctx.moveTo(0, height);
        for (let i = 0; i < state.prices.length; i++) {
            const x = i * xStep;
            const y = height - ((state.prices[i] - yMinDynamic) / yRange) * height;
            ctx.lineTo(x, y);
        }
        ctx.lineTo(width, height);
        ctx.closePath();
        ctx.fill();

        // Малювання лінії графіка з тінями.
        ctx.lineWidth = 1.5;
        ctx.shadowBlur = 100;
        for (let i = 0; i < state.prices.length - 1; i++) {
            const x1 = i * xStep;
            const y1 = height - ((state.prices[i] - yMinDynamic) / yRange) * height;
            const x2 = (i + 1) * xStep;
            const y2 = height - ((state.prices[i + 1] - yMinDynamic) / yRange) * height;
            let lineColor = (state.prices[i + 1] >= 50) ? '#00ffe5ff' : '#b90000ff';
            ctx.strokeStyle = lineColor;
            ctx.shadowColor = lineColor;
            ctx.beginPath();
            ctx.moveTo(x1, y1);
            ctx.lineTo(x2, y2);
            ctx.stroke();
        }
        ctx.shadowBlur = 0;

        // Малювання останньої точки на графіку.
        const lastX = (state.prices.length - 1) * xStep;
        const lastY = height - ((state.prices[state.prices.length - 1] - yMinDynamic) / yRange) * height;
        ctx.fillStyle = '#ffffff';
        ctx.beginPath();
        ctx.arc(lastX, lastY, 3, 0, 2 * Math.PI);
        ctx.fill();

        // Малювання тексту з поточним значенням над останньою точкою.
        const currentRTP = state.prices[state.prices.length - 1];
        ctx.fillStyle = '#ffffff';
        ctx.font = `bold 13px sans-serif`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'bottom';
        let textX = lastX;
        let textY = lastY - 8;
        if (textX < 20) textX = 20;
        if (textX > width - 20) textX = width - 20;
        if (textY < 20) textY = 20;
        ctx.fillText(`${currentRTP.toFixed(1)}%`, textX, textY);
    }

    function formatCurrency(amount) {
        return new Intl.NumberFormat('en-US', {
            style: 'currency',
            currency: 'USD',
            minimumFractionDigits: 0
        }).format(amount);
    }

    function updateData() {
        const now = Date.now();
        const currentPhase = scenario[state.scenarioIndex];
        const elapsedTime = (now - state.phaseStartTime) / 1000;
        if (elapsedTime >= currentPhase.duration) {
            transitionToNextPhase();
        }

        const lastPrice = state.prices.length > 0 ? state.prices[state.prices.length - 1] : 50;
        let minRTP, maxRTP;
        if (currentPhase.color === '#00c107') {
            minRTP = 50;
            maxRTP = currentPhase.maxRTP;
        } else {
            minRTP = currentPhase.minRTP;
            maxRTP = 49.99;
        }
        const range = maxRTP - minRTP;
        const volatilityFactor = Math.random() * (range / 2) - (range / 4);
        const newPrice = lastPrice + volatilityFactor;
        const clampedPrice = Math.max(minRTP, Math.min(maxRTP, newPrice));
        state.prices.push(clampedPrice);
        if (state.prices.length > state.maxPoints) {
            state.prices.shift();
        }

        if (currentPhase.color === '#00c107') {
            const isBonus = Math.random() < 0.15;
            if (isBonus) {
                state.longestStreakValue = 5;
                state.bonusProbabilityValue = 5.0;
                state.lastBigWinTime = formatCurrency(Math.floor(Math.random() * 8000) + 1000);
            } else {
                state.longestStreakValue = Math.floor(Math.random() * (15 - 5 + 1)) + 5;
                state.bonusProbabilityValue = Math.min(100, state.bonusProbabilityValue + 0.5);
            }
        } else {
            const isBonus = Math.random() < 0.02;
            if (isBonus) {
                state.longestStreakValue = 5;
                state.bonusProbabilityValue = 5.0;
                state.lastBigWinTime = formatCurrency(Math.floor(Math.random() * 300) + 50);
            } else {
                state.longestStreakValue = Math.floor(Math.random() * (50 - 25 + 1)) + 25;
                state.bonusProbabilityValue = Math.min(100, state.bonusProbabilityValue + 0.5);
            }
        }

        state.activePlayersValue = Math.floor(Math.random() * 2000) + 1000;

        const oneHour = 3600000;
        if (now - state.lastJackpotUpdate >= oneHour) {
            const jackpotAmount = Math.floor(Math.random() * (200000 - 50000 + 1)) + 50000;
            state.lastJackpotTime = formatCurrency(jackpotAmount);
            state.lastJackpotUpdate = now;
        }

        const currentRTP = state.prices[state.prices.length - 1];
        const totalRTP = state.prices.reduce((sum, price) => sum + price, 0);
        const averageRTP = totalRTP / state.prices.length;
        const rtpRange = Math.max(...state.prices) - Math.min(...state.prices);

        let volatilityText;
        if (rtpRange > 50) {
            volatilityText = 'Критична';
        } else if (rtpRange > 25) {
            volatilityText = 'Висока';
        } else if (rtpRange > 10) {
            volatilityText = 'Середня';
        } else {
            volatilityText = 'Низька';
        }

        // Оновлення основного інтерфейсу
        currentRTPElement.textContent = `${currentRTP.toFixed(2)}%`;
        averageRTPElement.textContent = `${averageRTP.toFixed(2)}%`;
        volatilityElement.textContent = volatilityText;

        // Оновлення модального вікна, якщо воно відкрите
        if (!modal.classList.contains('hidden')) {
            updateModalData();
        }

        localStorage.setItem('analyzerState', JSON.stringify(state));
        drawChart();
    }

    function updateModalData() {
        const currentRTP = state.prices[state.prices.length - 1];
        const totalRTP = state.prices.reduce((sum, price) => sum + price, 0);
        const averageRTP = totalRTP / state.prices.length;
        const rtpRange = Math.max(...state.prices) - Math.min(...state.prices);

        let volatilityText;
        if (rtpRange > 50) {
            volatilityText = 'Критична';
        } else if (rtpRange > 25) {
            volatilityText = 'Висока';
        } else if (rtpRange > 10) {
            volatilityText = 'Середня';
        } else {
            volatilityText = 'Низька';
        }

        modalCurrentRTPElement.textContent = `${currentRTP.toFixed(2)}%`;
        modalAverageRTPElement.textContent = `${averageRTP.toFixed(2)}%`;
        modalVolatilityElement.textContent = volatilityText;
        lastBigWinElement.textContent = state.lastBigWinTime;
        booksFrequencyElement.textContent = `${(Math.random() * (25 - 5) + 5).toFixed(1)}%`; // Оновлено діапазон
        longestStreakElement.textContent = state.longestStreakValue;
        bonusProbabilityElement.textContent = `${state.bonusProbabilityValue.toFixed(1)}%`;
        activePlayersElement.textContent = state.activePlayersValue;
        lastJackpotTimeElement.textContent = state.lastJackpotTime;
    }

    setInterval(updateData, 5000);
    updateData();

});
