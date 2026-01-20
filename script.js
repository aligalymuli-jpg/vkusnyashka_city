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
        console.error("Ошибка загрузки данных:", error);
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

    // Дополнительные товары (соусы к десертам)
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

    if (document.getElementById('cart-content')) {
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

    container.innerHTML = '';
    let total = 0;

    cart.forEach((item, index) => {
        total += item.price * item.qty;

        container.innerHTML += `
            <div class="cart-item" style="display: flex; align-items: center; background: rgba(255,255,255,0.05); margin-bottom: 10px; padding: 10px; border-radius: 15px; border: 1px solid rgba(255,255,255,0.1); gap: 12px;">
                <img src="${item.img}" style="width: 55px; height: 55px; border-radius: 10px; object-fit: cover;">
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

    const totalElem = document.getElementById('total-price');
    if (totalElem) totalElem.innerText = `Итого: ${total} ₸`;

    if (footer) footer.style.display = 'block';
};

// Изменение количества
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
    renderCartModal();
    document.getElementById('cartModal').style.display = 'flex';
};

window.closeCartModal = function() {
    document.getElementById('cartModal').style.display = 'none';
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

    // Формирование сообщения
    let text = "🍰 *НОВЫЙ ЗАКАЗ VKUSNYASHAK CITY* 🍰\n";
    text += "==========================\n";
    text += "🎂 *СОСТАВ ЗАКАЗА:* 🎂\n\n";

    cart.forEach((item, index) => {
        text += `${index + 1}. *${item.name}*\n`;
        text += `   • ${item.qty} шт. x ${item.price} ₸ = ${item.price * item.qty} ₸\n`;
    });

    let total = cart.reduce((s, i) => s + (i.price * i.qty), 0);
    text += "\n==========================\n";
    text += `✅ *ИТОГО К ОПЛАТЕ: ${total} ₸*\n`;
    text += "==========================\n\n";
    text += `📍 *АДРЕС:* ${address}\n`;
    text += `📞 *ТЕЛЕФОН:* ${phone}\n`;
    text += `🍴 *ПРИБОРЫ:* ${persons} чел.\n\n`;
    text += "🍪 _Спасибо за заказ! Скоро свяжемся с вами._ ✨";

    const phoneNumber = "77771234567";
    const waUrl = `https://api.whatsapp.com/send?phone=${phoneNumber}&text=${encodeURIComponent(text)}`;

    window.open(waUrl, '_blank');

    // Очистка корзины
    cart = [];
    saveCart();
    updateUI();
    closeCartModal();

    showNotification("Заказ отправлен! Ожидайте звонка.");
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

// Снежинки (декорация)
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