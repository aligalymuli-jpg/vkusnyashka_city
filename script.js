// Конфигурация Firebase
const firebaseConfig = {
    apiKey: "AIzaSyCsbOVaSbdFKkxl4H3g1V5UJtYjhRN1mWs",
    authDomain: "vkusnyashka-final.firebaseapp.com",
    databaseURL: "https://vkusnyashka-final-default-rtdb.firebaseio.com",
    projectId: "vkusnyashka-final",
    storageBucket: "vkusnyashka-final.firebasestorage.app",
    messagingSenderId: "541206638651",
    appId: "1:541206638651:web:ac9be8c8ab5610e2e8375f"
};

if (!firebase.apps.length) firebase.initializeApp(firebaseConfig);
const database = firebase.database();

// Глобальные переменные
let products = [];
let cart = JSON.parse(localStorage.getItem('vkusnyashak_cart')) || [];
let currentCategory = 'all';
let activePromoCode = null;
const freeDeliveryThreshold = 15000; // Бесплатная доставка от 15000₸
let currentOrderId = null;

// Загрузка данных
document.addEventListener('DOMContentLoaded', loadData);

async function loadData() {
    try {
        const snapshot = await database.ref('products').once('value');
        const data = snapshot.val();
        products = data ? Object.keys(data).map(key => ({...data[key], id: key })) : [];

        cart = JSON.parse(localStorage.getItem('vkusnyashak_cart')) || [];

        updateUI();
        hidePreloader();
        checkWorkStatus();
        startHeavyAssets();

        renderMenu();

    } catch (error) {
        console.error("Ошибка загрузка данных:", error);
        hidePreloader();
    }
}

function hidePreloader() {
    const loader = document.getElementById('preloader');
    if (loader) {
        loader.style.opacity = '0';
        setTimeout(() => loader.style.display = 'none', 600);
    }
}

function startHeavyAssets() {
    const video = document.getElementById('bg-video');
    if (video) video.load();
    initSnow();
}

// Функции навигации
window.showCategories = function() {
    document.getElementById('categories-screen').style.display = 'flex';
    document.getElementById('menu-screen').style.display = 'none';
};

window.filterCat = function(cat, btn) {
    currentCategory = cat;
    const title = btn.querySelector('span').innerText;

    document.getElementById('categories-screen').style.display = 'none';
    document.getElementById('menu-screen').style.display = 'block';
    document.getElementById('current-category-title').innerText = title;
    document.getElementById('menu-search').value = '';

    renderTypeFilters(cat);
    renderMenu(cat);

    window.scrollTo({
        top: document.getElementById('menu-section').offsetTop - 20,
        behavior: 'smooth'
    });
};

// Фильтры по типу
function renderTypeFilters(cat) {
    const filterContainer = document.getElementById('type-filters');
    if (!filterContainer) return;
    filterContainer.innerHTML = '';

    const catProducts = products.filter(p => p.category === cat || p.cat === cat);
    const types = [...new Set(catProducts.map(p => p.type).filter(t => t && t !== ""))];

    if (types.length > 0) {
        // Кнопка "Все"
        const btnAll = document.createElement('button');
        btnAll.className = 'type-btn active';
        btnAll.innerText = 'Все';
        btnAll.onclick = function() {
            document.querySelectorAll('.type-btn').forEach(b => b.classList.remove('active'));
            this.classList.add('active');
            renderMenu(cat);
        };
        filterContainer.appendChild(btnAll);

        // Типы для кондитерской
        const typeNames = {
            'chocolate': '🍫 Шоколадные',
            'fruit': '🍓 Фруктовые',
            'cream': '🧁 С кремом',
            'seasonal': '🎄 Сезонные',
            'diet': '🥗 Диетические'
        };

        types.forEach(type => {
            const btn = document.createElement('button');
            btn.className = 'type-btn';
            btn.innerText = typeNames[type] || type;
            btn.onclick = function() {
                document.querySelectorAll('.type-btn').forEach(b => b.classList.remove('active'));
                this.classList.add('active');
                const filtered = catProducts.filter(p => p.type === type);
                renderMenu(null, filtered);
            };
            filterContainer.appendChild(btn);
        });
    }
}

// Рендер меню
window.renderMenu = function(category = 'all', filteredData = null) {
    const container = document.getElementById('menu-container');
    if (!container) return;

    container.innerHTML = '';

    let dataToRender = filteredData ? filteredData :
        (category === 'all' ? products :
            products.filter(p => p.category === category || p.cat === category));

    // Фильтр по доступности
    dataToRender = dataToRender.filter(p => p.available !== false);

    if (dataToRender.length === 0) {
        container.innerHTML = `
            <div style="grid-column: 1/-1; text-align: center; padding: 50px 20px;">
                <i class="fas fa-cookie-bite" style="font-size: 3rem; color: #ff9a8b; margin-bottom: 15px;"></i>
                <p style="color: rgba(255,255,255,0.7);">В этой категории пока нет товаров</p>
            </div>
        `;
        return;
    }

    let menuHTML = '';
    dataToRender.forEach(p => {
        const countTag = p.count ? `<div class="p-tag-count">${p.count}</div>` : '';
        let badgeHTML = '';
        if (p.badge === 'hit') badgeHTML = `<div class="product-badge badge-hit">ХИТ 🔥</div>`;
        else if (p.badge === 'new') badgeHTML = `<div class="product-badge badge-new">НОВИНКА ✨</div>`;

        menuHTML += `
            <div class="product-card" onclick="openDetails('${p.id}')">
                <div class="img-wrapper">
                    <img src="${p.img || 'https://via.placeholder.com/300x200?text=Vkusnyashak'}" 
                         loading="lazy" 
                         alt="${p.name}"
                         onerror="this.src='https://via.placeholder.com/300x200?text=Vkusnyashak'">
                    ${countTag}
                    ${badgeHTML}
                </div>
                <div class="product-info">
                    <h3>${p.name}</h3>
                    <div class="product-price">${p.price} ₸</div>
                    <button class="btn-sm" onclick="event.stopPropagation(); addToCart('${p.id}', this)">
                        <i class="fas fa-plus"></i> В КОРЗИНУ
                    </button>
                </div>
            </div>`;
    });
    container.innerHTML = menuHTML;
};

// Открытие деталей товара
window.openDetails = function(id) {
    const p = products.find(i => i.id === id);
    if (!p) return;

    document.getElementById('modalImg').src = p.img || 'https://via.placeholder.com/400x300?text=Vkusnyashak';
    document.getElementById('modalName').innerText = p.name;
    document.getElementById('modalDesc').innerText = p.desc || "Авторский рецепт от Vkusnyashak City.";
    document.getElementById('modalCount').innerText = p.count ? "🍴 " + p.count : "";
    document.getElementById('modalPrice').innerText = p.price + " ₸";

    // Дополнительные товары
    const upsellContainer = document.getElementById('upsell-container');
    upsellContainer.innerHTML = '';

    let extraItems = [];
    if (p.category === 'desserts' || p.cat === 'desserts') {
        extraItems = products.filter(item =>
            (item.category === 'sauces' || item.cat === 'sauces') &&
            item.id !== id
        ).slice(0, 3);
    }

    if (extraItems.length > 0) {
        let upsellHTML = `
            <p style="margin-top:15px; font-size:0.9rem; color:#ff9a8b; margin-bottom: 10px;">
                С этим часто берут:
            </p>
            <div style="display:flex; gap:10px; margin-top:10px; overflow-x:auto; padding-bottom:5px;">
        `;

        extraItems.forEach(item => {
            upsellHTML += `
                <div onclick="addToCart('${item.id}')" 
                     style="min-width:80px; text-align:center; background:rgba(255,255,255,0.05); 
                            padding:8px; border-radius:10px; border:1px solid rgba(255, 154, 139, 0.2); cursor:pointer;">
                    <img src="${item.img || 'https://via.placeholder.com/80x80?text=+'}" 
                         style="width:40px; height:40px; border-radius:5px; object-fit:cover;">
                    <div style="font-size:0.7rem; margin-top:5px; line-height:1;">${item.name}</div>
                    <small style="color:#ff9a8b;">+${item.price} ₸</small>
                </div>`;
        });

        upsellHTML += `</div>`;
        upsellContainer.innerHTML = upsellHTML;
    }

    const addBtn = document.getElementById('modalAddBtn');
    addBtn.onclick = () => {
        addToCart(id);
        closeModalProduct();
    };

    document.getElementById('productModal').style.display = 'flex';
};

window.closeModalProduct = function() {
    document.getElementById('productModal').style.display = 'none';
};

window.closeModal = function(e) {
    if (e.target.id === 'productModal') {
        document.getElementById('productModal').style.display = 'none';
    }
};

// Добавление в корзину
window.addToCart = function(id, btnElement = null) {
    const p = products.find(i => i.id === id);
    if (!p) return;

    const item = cart.find(i => i.id === id);
    if (item) {
        item.qty++;
    } else {
        cart.push({
            id: p.id,
            name: p.name,
            price: parseInt(p.price),
            img: p.img || 'https://via.placeholder.com/100x100?text=Vkusnyashak',
            qty: 1
        });
    }

    saveCart();
    updateUI();

    if (document.getElementById('cart-content') && document.getElementById('cartModal').style.display !== 'none') {
        renderCartModal();
    }

    // Анимация кнопки
    if (btnElement) {
        const oldText = btnElement.innerHTML;
        btnElement.innerHTML = "<i class='fas fa-check'></i> ДОБАВЛЕНО";
        btnElement.style.background = "#2ecc71";
        setTimeout(() => {
            btnElement.innerHTML = oldText;
            btnElement.style.background = "";
        }, 1500);
    }

    showNotification(`${p.name} добавлен в корзину!`);
};

// Показать уведомление
function showNotification(message) {
    // Удаляем старое уведомление если есть
    const oldNotification = document.querySelector('.notification');
    if (oldNotification) oldNotification.remove();

    const notification = document.createElement('div');
    notification.className = 'notification';
    notification.innerHTML = message;

    document.body.appendChild(notification);

    setTimeout(() => {
        notification.style.animation = 'slideOut 0.3s ease';
        setTimeout(() => notification.remove(), 300);
    }, 2000);
}

// Сохранение корзины
function saveCart() {
    localStorage.setItem('vkusnyashak_cart', JSON.stringify(cart));
}

// Обновление UI
function updateUI() {
    const count = document.getElementById('cart-count');
    if (count) {
        const total = cart.reduce((sum, item) => sum + item.qty, 0);
        count.innerText = total;
        count.style.display = total > 0 ? 'flex' : 'none';
    }
}

// Расчет итоговой суммы
function calculateOrderTotal() {
    let productsTotal = 0;

    cart.forEach(item => {
        if (typeof item.price === 'string') {
            item.price = parseInt(item.price.replace(/\D/g, '')) || 0;
        }
        productsTotal += item.price * item.qty;
    });

    // Применяем скидку если есть промокод
    let discount = 0;
    if (activePromoCode) {
        if (activePromoCode.type === 'percentage') {
            discount = (productsTotal * activePromoCode.value) / 100;
        } else if (activePromoCode.type === 'fixed') {
            discount = activePromoCode.value;
        }
    }

    // Итоговая сумма (БЕЗ доставки - доставку уточняют в WhatsApp)
    let finalTotal = productsTotal - discount;

    return {
        productsTotal,
        delivery: productsTotal >= freeDeliveryThreshold ? 0 : "уточняйте", // Для WhatsApp сообщения
        discount,
        finalTotal
    };
}

// Функция применения промокода (модалка корзины)
window.applyPromoCode = function() {
        const codeInput = document.getElementById('promo-code');
        const messageDiv = document.getElementById('promo-message');
        const phoneInput = document.getElementById('order-phone');
        const code = codeInput.value.trim().toUpperCase();

        if (!code) {
            messageDiv.innerHTML = '<span style="color: #e74c3c;">Введите промокод</span>';
            return;
        }

        let userPhone = '';
        if (phoneInput && phoneInput.value) {
            userPhone = phoneInput.value;
        }

        // Тестовые промокоды
        const promoCodes = [
            { code: 'VKUSNYASHKA10', type: 'percentage', value: 10, active: true, usage: 'once' },
            { code: 'SWEET500', type: 'fixed', value: 500, active: true, usage: 'once' },
            { code: 'DESSERT20', type: 'percentage', value: 20, active: true, usage: 'multiple' },
            { code: 'FIRSTORDER', type: 'percentage', value: 15, active: true, usage: 'once' },
            { code: 'WELCOME10', type: 'percentage', value: 10, active: true, usage: 'once' }
        ];

        const promo = promoCodes.find(p => p.code === code && p.active === true);

        if (!promo) {
            activePromoCode = null;
            messageDiv.innerHTML = '<span style="color: #e74c3c;">❌ Промокод не найден</span>';
            return;
        }

        // Проверка для одноразовых промокодов
        if (promo.usage === 'once' && userPhone) {
            if (smartPromoSystem && !smartPromoSystem.canUsePromoCode(code, userPhone)) {
                messageDiv.innerHTML = '<span style="color: #e74c3c;">❌ Вы уже использовали этот промокод</span>';
                return;
            }
        }

        activePromoCode = promo;
        messageDiv.innerHTML = `
        <span style="color: #2ecc71;">
            ✅ Промокод "${code}" применен! 
            ${promo.type === 'percentage' ? `Скидка ${promo.value}%` : `Скидка ${promo.value} ₸`}
            ${promo.usage === 'once' ? ' (одноразовый)' : ' (многоразовый)'}
        </span>
        ${promo.usage === 'once' ? '<br><small style="color:#f39c12;">⚠️ Будет активирован после подтверждения заказа</small>' : ''}
    `;
    updateCartCalculations();
    showNotification(`Промокод "${code}" успешно применен!`);
};

// Обновляем расчеты в модалке (ОБНОВЛЕННАЯ ВЕРСИЯ С ПРОГРЕССОМ)
function updateCartCalculations() {
    // Считаем только стоимость товаров
    let productsTotal = 0;
    cart.forEach(item => {
        productsTotal += item.price * item.qty;
    });
    
    // Применяем скидку если есть промокод
    let discount = 0;
    if (activePromoCode) {
        if (activePromoCode.type === 'percentage') {
            discount = productsTotal * (activePromoCode.value / 100);
        } else if (activePromoCode.type === 'fixed') {
            discount = activePromoCode.value;
        }
    }
    
    // Итоговая сумма (без доставки)
    const finalTotal = productsTotal - discount;
    
    // Показываем/скрываем банер бесплатной доставки
    const freeDeliveryBanner = document.getElementById('free-delivery-banner');
    if (freeDeliveryBanner) {
        freeDeliveryBanner.style.display = 'block';
    }
    
    // ПРОГРЕСС ДО БЕСПЛАТНОЙ ДОСТАВКИ
    const deliveryProgress = document.getElementById('delivery-progress');
    const needMoreElement = document.getElementById('need-more');
    const progressFill = document.getElementById('progress-fill');
    
    if (deliveryProgress && needMoreElement && progressFill) {
        if (productsTotal < freeDeliveryThreshold) {
            // Показываем прогресс если сумма меньше 15000
            deliveryProgress.style.display = 'block';
            const needMore = freeDeliveryThreshold - productsTotal;
            const progressPercent = (productsTotal / freeDeliveryThreshold) * 100;
            
            needMoreElement.textContent = needMore;
            progressFill.style.width = `${progressPercent}%`;
        } else {
            // Скрываем прогресс если достигли бесплатной доставки
            deliveryProgress.style.display = 'none';
        }
    }
    
    // Обновляем цены в модалке
    if (document.getElementById('products-price')) {
        document.getElementById('products-price').innerText = `${productsTotal} ₸`;
    }
    
    if (document.getElementById('delivery-price')) {
        // Если сумма достигла 15000 - показываем бесплатно
        if (productsTotal >= freeDeliveryThreshold) {
            document.getElementById('delivery-price').innerHTML = 
                '<span style="color: #2ecc71;">БЕСПЛАТНО 🎉</span>';
        } else {
            // Иначе показываем что уточняется в WhatsApp
            document.getElementById('delivery-price').innerHTML = 
                '<span style="color: rgba(255,255,255,0.7); font-size: 0.9rem;">Уточняйте в WhatsApp</span>';
        }
    }
    
    if (document.getElementById('discount-amount')) {
        document.getElementById('discount-amount').innerText = `${discount} ₸`;
    }
    
    if (document.getElementById('final-price')) {
        document.getElementById('final-price').innerText = `${finalTotal} ₸`;
    }
    
    // Обновляем общую сумму
    if (document.getElementById('total-price')) {
        document.getElementById('total-price').innerText = `${finalTotal} ₸`;
    }
}

// Рендер корзины в модалке
window.renderCartModal = function() {
    const container = document.getElementById('cart-content');
    const footer = document.getElementById('cart-footer');
    if (!container) return;

    if (cart.length === 0) {
        container.innerHTML = `
            <div style="text-align: center; padding: 50px 20px; opacity: 0.5;">
                <i class="fas fa-shopping-basket" style="font-size: 3rem; color: #ff9a8b; margin-bottom: 20px;"></i>
                <p style="font-size: 1.2rem; margin-top: 20px;">Корзина пуста</p>
            </div>
        `;
        if (footer) footer.style.display = 'none';
        return;
    }
    
    // Преобразуем цены в числа
    cart.forEach(item => {
        if (typeof item.price === 'string') {
            item.price = parseInt(item.price.replace(/\D/g, '')) || 0;
        }
    });

    container.innerHTML = '';
    
    cart.forEach((item, index) => {
        container.innerHTML += `
            <div class="cart-item" style="display: flex; align-items: center; background: rgba(255,255,255,0.05); margin-bottom: 10px; padding: 10px; border-radius: 15px; border: 1px solid rgba(255,255,255,0.1); gap: 12px;">
                <img src="${item.img || 'https://via.placeholder.com/55x55?text=Vkusnyashak'}" 
                     style="width: 55px; height: 55px; border-radius: 10px; object-fit: cover;"
                     onerror="this.src='https://via.placeholder.com/55x55?text=Vkusnyashak'">
                <div style="flex-grow: 1;">
                    <h4 style="font-size: 0.9rem; margin: 0;">${item.name}</h4>
                    <p style="color: #ff9a8b; font-size: 0.85rem; font-weight: bold; margin-top: 3px;">${item.price} ₸</p>
                </div>
                <div style="display: flex; align-items: center; background: rgba(0,0,0,0.3); border-radius: 10px; padding: 3px; gap: 10px;">
                    <button onclick="changeQty(${index}, -1)" style="width: 28px; height: 28px; border: none; background: #ff9a8b; color: white; border-radius: 8px;">-</button>
                    <span style="font-size: 0.95rem; font-weight: bold;">${item.qty}</span>
                    <button onclick="changeQty(${index}, 1)" style="width: 28px; height: 28px; border: none; background: #ff9a8b; color: white; border-radius: 8px;">+</button>
                </div>
            </div>`;
    });

    if (footer) footer.style.display = 'block';
    updateCartCalculations();
};

// Изменение количества в модалке
window.changeQty = function(index, delta) {
    cart[index].qty += delta;
    if (cart[index].qty <= 0) cart.splice(index, 1);
    saveCart();
    renderCartModal();
    updateUI();
};

// Поиск
window.searchMenu = function() {
    const query = document.getElementById('menu-search').value.toLowerCase();
    const filtered = products.filter(p =>
        p.name.toLowerCase().includes(query) &&
        (currentCategory === 'all' || p.category === currentCategory || p.cat === currentCategory)
    );
    renderMenu(null, filtered);
};

// Открытие корзины
window.openCartModal = function() {
    if (cart.length === 0) {
        showNotification("Корзина пуста!");
        return;
    }
    renderCartModal();
    document.getElementById('cartModal').style.display = 'flex';
    document.body.style.overflow = 'hidden';
};

window.closeCartModal = function() {
    // Если есть pending промокод и заказ не оформлен - отменяем
    if (activePromoCode && smartPromoSystem) {
        const phoneInput = document.getElementById('order-phone');
        if (phoneInput && phoneInput.value) {
            smartPromoSystem.cancelPromoPending(activePromoCode.code, phoneInput.value);
            console.log(`Promo ${activePromoCode.code} cancelled - cart closed`);
        }
    }
    
    document.getElementById('cartModal').style.display = 'none';
    document.body.style.overflow = 'auto';
};

// Оформление заказа
window.confirmAndSendOrder = function() {
    if (cart.length === 0) {
        showNotification("Корзина пуста!");
        return;
    }

    const address = document.getElementById('order-address').value;
    const phone = document.getElementById('order-phone').value;
    const persons = document.getElementById('order-persons').value || '1';

    if (!address) {
        showNotification("Укажите адрес доставки!");
        return;
    }

    if (!phone) {
        showNotification("Укажите ваш телефон!");
        return;
    }

    // Генерируем ID заказа
    const orderId = 'ORD_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
    currentOrderId = orderId;
    
    // Если есть одноразовый промокод - отмечаем как pending
    if (activePromoCode && activePromoCode.usage === 'once' && smartPromoSystem) {
        smartPromoSystem.markPromoPending(activePromoCode.code, phone, orderId);
    }

    // Получаем расчеты
    const calculation = calculateOrderTotal();
    
    // Формирование сообщения
    let text = "🍰 *НОВЫЙ ЗАКАЗ VKUSNYASHAK CITY* 🍰\n";
    text += `📋 *ID ЗАКАЗА:* ${orderId}\n`;
    text += "==========================\n";
    text += "🎂 *СОСТАВ ЗАКАЗА:* 🎂\n\n";

    cart.forEach((item, index) => {
        text += `${index + 1}. *${item.name}*\n`;
        text += `   • ${item.qty} шт. x ${item.price} ₸ = ${item.price * item.qty} ₸\n`;
    });

    text += "\n==========================\n";
    text += `💰 *СТОИМОСТЬ ТОВАРОВ:* ${calculation.productsTotal} ₸\n`;
    
    if (calculation.discount > 0 && activePromoCode) {
        text += `🎫 *СКИДКА:* -${calculation.discount} ₸\n`;
        text += `   (Промокод: ${activePromoCode.code})`;
        if (activePromoCode.usage === 'once') {
            text += ' (одноразовый)';
        }
        text += '\n';
    }
    
    text += `\n✅ *ИТОГО К ОПЛАТЕ: ${calculation.finalTotal} ₸*\n`;
    text += "==========================\n\n";
    text += `📍 *АДРЕС:* ${address}\n`;
    text += `📞 *ТЕЛЕФОН:* ${phone}\n`;
    text += `🍴 *ПРИБОРЫ:* ${persons} чел.\n`;
    text += `🆔 *ID ЗАКАЗА:* ${orderId}\n\n`;
    
    // Информация о доставке
    if (calculation.productsTotal >= freeDeliveryThreshold) {
        text += `🚚 *БЕСПЛАТНАЯ ДОСТАВКА АКТИВИРОВАНА! 🎉*\n`;
    } else {
        const needForFree = freeDeliveryThreshold - calculation.productsTotal;
        text += `🚚 *Бесплатная доставка от 15,000 ₸*\n`;
        text += `   (До бесплатной доставки осталось: ${needForFree} ₸)\n`;
        text += `   (Стоимость доставки уточняйте у администратора)\n`;
    }
    
    text += "⏰ *Время работы:* 9:00-21:00\n";
    text += "🍪 _Спасибо за заказ! Скоро свяжемся с вами._ ✨";

    const phoneNumber = "77029994346";
    const waUrl = `https://api.whatsapp.com/send?phone=${phoneNumber}&text=${encodeURIComponent(text)}`;

    // Открываем WhatsApp
    const waWindow = window.open(waUrl, '_blank');
    
    // Подтверждаем промокод только если пользователь отправил сообщение
    if (activePromoCode && activePromoCode.usage === 'once' && smartPromoSystem) {
        setTimeout(() => {
            if (!waWindow.closed) {
                // Предполагаем что пользователь отправил сообщение
                setTimeout(() => {
                    smartPromoSystem.confirmPromoUsage(activePromoCode.code, phone, orderId);
                    console.log(`Promo ${activePromoCode.code} confirmed for order ${orderId}`);
                }, 15000); // 15 секунд на отправку
            } else {
                // Пользователь закрыл окно - отменяем pending
                smartPromoSystem.cancelPromoPending(activePromoCode.code, phone);
                console.log(`Promo ${activePromoCode.code} cancelled - WhatsApp closed`);
            }
        }, 5000);
    }

    // Очистка корзины
    cart = [];
    activePromoCode = null;
    saveCart();
    updateUI();
    closeCartModal();

    // Показываем уведомление
    setTimeout(() => {
        showNotification("Заказ отправлен! Ожидайте звонка.");
    }, 1000);
};

// Проверка статуса работы
function checkWorkStatus() {
    const badge = document.getElementById('work-status-badge');
    if (!badge) return;

    const now = new Date();
    const hours = now.getHours();

    if (hours >= 8 && hours < 22) {
        badge.innerHTML = `<span style="color: #2ecc71;"><i class="fas fa-circle"></i> МЫ ОТКРЫТЫ</span>`;
    } else {
        badge.innerHTML = `<span style="color: #e74c3c;"><i class="fas fa-clock"></i> СЕЙЧАС ЗАКРЫТО</span>`;
    }
}

// Снежинки
function initSnow() {
    for (let i = 0; i < 30; i++) {
        setTimeout(() => {
            const flake = document.createElement('div');
            flake.innerHTML = '❄';
            flake.style.cssText = `
                position: fixed;
                top: -20px;
                left: ${Math.random() * 100}vw;
                font-size: ${Math.random() * 15 + 10}px;
                opacity: ${Math.random() * 0.5 + 0.3};
                animation: fall ${Math.random() * 5 + 5}s linear forwards;
                pointer-events: none;
                z-index: 9998;
                color: white;
            `;
            document.body.appendChild(flake);

            setTimeout(() => flake.remove(), 7000);
        }, i * 200);
    }
}

// Дебаг функции для тестирования
window.debugPromoStats = function() {
    if (smartPromoSystem) {
        const stats = smartPromoSystem.getStats();
        console.log("📊 Promo Statistics:", stats);
        alert(`📊 Статистика промокодов:
Всего записей: ${stats.total}
В процессе: ${stats.pending}
Подтверждено: ${stats.confirmed}`);
    } else {
        alert("Система промокодов не загружена");
    }
};

window.resetPromoForMe = function() {
    const phone = prompt("Введите ваш телефон для сброса промокодов:");
    if (phone && smartPromoSystem) {
        const codes = ['VKUSNYASHKA10', 'SWEET500', 'FIRSTORDER', 'WELCOME10'];
        codes.forEach(code => {
            smartPromoSystem.resetPromoCode(code, phone);
        });
        alert("Все промокоды сброшены для вашего телефона!");
    }
};

// Дополнительная проверка для модалки
document.addEventListener('click', function(e) {
    if (e.target.id === 'cartModal') {
        closeCartModal();
    }
});

// Инициализация системы промокодов
document.addEventListener('DOMContentLoaded', function() {
    try {
        if (typeof SmartPromoSystem !== 'undefined') {
            smartPromoSystem = new SmartPromoSystem();
            console.log("Smart promo system initialized in main script");
        }
    } catch(e) {
        console.error("Error initializing promo system:", e);
    }
});