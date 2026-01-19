// Конфигурация Firebase (используй свои ключи)
const firebaseConfig = {
    apiKey: "AIzaSyCsbOVaSbdFKkxl4H3g1V5UJtYjhRN1mWs",
    authDomain: "vkusnyashka-final.firebaseapp.com",
    databaseURL: "https://vkusnyashka-final-default-rtdb.firebaseio.com",
    projectId: "vkusnyashka-final"
};

// Глобальные переменные
let products = [];
let cart = JSON.parse(localStorage.getItem('vkusnyashak_cart')) || [];
let currentCategory = 'all';
let database = null;

// Инициализация Firebase
function initFirebase() {
    if (!firebase.apps.length) {
        firebase.initializeApp(firebaseConfig);
    }
    database = firebase.database();
    return database;
}

// Основная функция загрузки
async function loadData() {
    try {
        initFirebase();
        const snapshot = await database.ref('products').once('value');
        const data = snapshot.val();

        if (data) {
            products = Object.keys(data).map(key => ({
                ...data[key],
                id: key
            })).filter(p => p.available !== false);
        } else {
            products = getDemoProducts();
        }

        updateUI();
        hidePreloader();
        checkWorkStatus();
        startHeavyAssets();
        renderMenu();

    } catch (error) {
        console.error("Ошибка загрузки:", error);
        hidePreloader();
        showNotification("Ошибка загрузки данных", "error");
    }
}

// Скрытие прелоадера
function hidePreloader() {
    const loader = document.getElementById('preloader');
    if (loader) {
        loader.style.opacity = '0';
        setTimeout(() => loader.style.display = 'none', 600);
    }
}

// Анимация снега (декоративная)
function initSnow() {
    if (!document.getElementById('snow-effect')) {
        const style = document.createElement('style');
        style.id = 'snow-effect';
        style.textContent = `
            @keyframes fall {
                to { transform: translateY(100vh); }
            }
            .snowflake {
                position: fixed;
                top: -10px;
                z-index: 9999;
                pointer-events: none;
                opacity: 0.7;
                animation: fall linear forwards;
            }
        `;
        document.head.appendChild(style);
    }

    // Создаем снежинки
    for (let i = 0; i < 30; i++) {
        setTimeout(() => {
            const flake = document.createElement('div');
            flake.className = 'snowflake';
            flake.innerHTML = '❄';
            flake.style.cssText = `
                left: ${Math.random() * 100}vw;
                font-size: ${Math.random() * 10 + 10}px;
                animation-duration: ${Math.random() * 5 + 5}s;
                animation-delay: ${Math.random() * 5}s;
            `;
            document.body.appendChild(flake);
            setTimeout(() => flake.remove(), 10000);
        }, i * 200);
    }
}

// Запуск тяжелых ресурсов
function startHeavyAssets() {
    const video = document.getElementById('bg-video');
    if (video) {
        video.load();
        video.play().catch(e => console.log("Автовоспроизведение видео заблокировано"));
    }
    initSnow();
}

// Показать категории
window.showCategories = function() {
    const catScreen = document.getElementById('categories-screen');
    const menuScreen = document.getElementById('menu-screen');
    if (catScreen) catScreen.style.display = 'grid';
    if (menuScreen) menuScreen.style.display = 'none';
};

// Фильтрация по категориям
window.filterCat = function(cat, btn) {
    currentCategory = cat;
    const catScreen = document.getElementById('categories-screen');
    const menuScreen = document.getElementById('menu-screen');
    const title = btn.querySelector('span').innerText;

    if (catScreen) catScreen.style.display = 'none';
    if (menuScreen) menuScreen.style.display = 'block';

    document.getElementById('current-category-title').innerText = title;
    document.getElementById('menu-search').value = '';
    renderTypeFilters(cat);
    renderMenu(cat);

    window.scrollTo({
        top: document.getElementById('menu-section').offsetTop - 20,
        behavior: 'smooth'
    });
};

// Рендер фильтров по типу
function renderTypeFilters(cat) {
    const filterContainer = document.getElementById('type-filters');
    if (!filterContainer) return;
    filterContainer.innerHTML = '';

    const catProducts = products.filter(p => p.cat === cat);
    const types = [...new Set(catProducts.map(p => p.type).filter(t => t))];

    if (types.length > 0) {
        const btnAll = document.createElement('button');
        btnAll.className = 'type-btn active';
        btnAll.innerText = 'Все';
        btnAll.onclick = () => {
            document.querySelectorAll('.type-btn').forEach(b => b.classList.remove('active'));
            btnAll.classList.add('active');
            renderMenu(cat);
        };
        filterContainer.appendChild(btnAll);

        types.forEach(type => {
            const btn = document.createElement('button');
            btn.className = 'type-btn';
            btn.innerText = getTypeName(type);
            btn.onclick = () => {
                document.querySelectorAll('.type-btn').forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                const filtered = catProducts.filter(p => p.type === type);
                renderMenu(null, filtered);
            };
            filterContainer.appendChild(btn);
        });
    }
}

function getTypeName(type) {
    const typeNames = {
        'classic': '🍰 Классические',
        'seasonal': '🍂 Сезонные',
        'vegan': '🌱 Веганские',
        'glutenfree': '🌾 Без глютена',
        'sugarfree': '🍬 Без сахара'
    };
    return typeNames[type] || type;
}

// Рендер меню
window.renderMenu = function(category = 'all', filteredData = null) {
    const container = document.getElementById('menu-container');
    if (!container) return;

    container.innerHTML = '';
    let dataToRender = filteredData ? filteredData :
        (category === 'all' ? products : products.filter(p => p.cat === category));

    if (dataToRender.length === 0) {
        container.innerHTML = `
            <div style="grid-column: 1/-1; text-align: center; padding: 50px 20px;">
                <i class="fas fa-cookie-bite" style="font-size: 3rem; color: #ff9a8b; margin-bottom: 15px; opacity: 0.5;"></i>
                <p style="color: rgba(255, 255, 255, 0.7);">В этой категории пока нет товаров</p>
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
                    <div class="product-price">${p.price} ₽</div>
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
    document.getElementById('modalPrice').innerText = p.price + " ₽";

    const upsellContainer = document.getElementById('upsell-container');
    upsellContainer.innerHTML = '';

    // Дополнительные товары
    let extraItems = [];
    if (p.cat === 'desserts' || p.cat === 'cakes') {
        extraItems = products.filter(item =>
            item.cat === 'drinks' &&
            item.id !== id
        ).slice(0, 3);
    }

    if (extraItems.length > 0) {
        let upsellHTML = `
            <p class="upsell-title" style="margin-top:15px; font-size:0.9rem; color:#ff9a8b;">
                С этим часто берут:
            </p>
            <div class="upsell-list" style="display:flex; gap:10px; margin-top:10px; overflow-x:auto; padding-bottom:5px;">
        `;

        extraItems.forEach(item => {
            upsellHTML += `
                <div class="upsell-item" onclick="addToCart('${item.id}')" 
                     style="min-width:80px; text-align:center; background:rgba(255,255,255,0.05); 
                            padding:8px; border-radius:10px; border:1px solid rgba(255, 154, 139, 0.2); cursor:pointer;">
                    <img src="${item.img || 'https://via.placeholder.com/80x80?text=+'}" 
                         style="width:40px; height:40px; border-radius:5px; object-fit:cover;">
                    <div style="font-size:0.7rem; margin-top:5px; line-height:1;">${item.name}</div>
                    <small style="color:#ff9a8b;">+${item.price} ₽</small>
                </div>`;
        });

        upsellHTML += `</div>`;
        upsellContainer.innerHTML = upsellHTML;
    }

    const addBtn = document.getElementById('modalAddBtn');
    addBtn.onclick = () => {
        addToCart(id);
        document.getElementById('productModal').style.display = 'none';
    };
    document.getElementById('productModal').style.display = 'flex';
};

// Добавление в корзину
window.addToCart = function(id, btnElement = null) {
    cart = JSON.parse(localStorage.getItem('vkusnyashak_cart')) || [];
    const p = products.find(i => i.id === id);

    if (!p) {
        showNotification("Товар не найден", "error");
        return;
    }

    if (p.available === false) {
        showNotification("Этот товар временно недоступен", "warning");
        return;
    }

    const existingItem = cart.find(i => i.id === id);

    if (existingItem) {
        existingItem.quantity += 1;
    } else {
        cart.push({
            id: p.id,
            name: p.name,
            price: parseInt(p.price),
            img: p.img,
            quantity: 1
        });
    }

    saveCart();
    updateUI();

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

// Уведомления
function showNotification(message, type = "success") {
    const colors = {
        success: "linear-gradient(45deg, #2ecc71, #27ae60)",
        error: "linear-gradient(45deg, #e74c3c, #c0392b)",
        warning: "linear-gradient(45deg, #f39c12, #e67e22)"
    };

    const notification = document.createElement('div');
    notification.style.cssText = `
        position: fixed;
        top: 100px;
        right: 20px;
        background: ${colors[type] || colors.success};
        color: white;
        padding: 15px 25px;
        border-radius: 10px;
        box-shadow: 0 5px 15px rgba(0,0,0,0.3);
        z-index: 1001;
        animation: slideIn 0.3s ease;
        font-weight: 600;
        max-width: 300px;
        backdrop-filter: blur(10px);
        border: 1px solid rgba(255, 255, 255, 0.2);
    `;
    notification.textContent = message;

    document.body.appendChild(notification);

    setTimeout(() => {
        notification.style.animation = 'slideOut 0.3s ease';
        setTimeout(() => notification.remove(), 300);
    }, 3000);

    // Добавляем стили для анимации
    if (!document.getElementById('notification-styles')) {
        const style = document.createElement('style');
        style.id = 'notification-styles';
        style.textContent = `
            @keyframes slideIn {
                from {
                    transform: translateX(100%);
                    opacity: 0;
                }
                to {
                    transform: translateX(0);
                    opacity: 1;
                }
            }
            @keyframes slideOut {
                from {
                    transform: translateX(0);
                    opacity: 1;
                }
                to {
                    transform: translateX(100%);
                    opacity: 0;
                }
            }
        `;
        document.head.appendChild(style);
    }
}

// Обновление интерфейса
function updateUI() {
    cart = JSON.parse(localStorage.getItem('vkusnyashak_cart')) || [];
    const cartCount = document.getElementById('cart-count');

    if (cartCount) {
        const totalItems = cart.reduce((sum, item) => sum + item.quantity, 0);
        cartCount.textContent = totalItems;
        cartCount.style.display = totalItems > 0 ? 'flex' : 'none';
    }
}

// Сохранение корзины
window.saveCart = function() {
    localStorage.setItem('vkusnyashak_cart', JSON.stringify(cart));
    updateUI();
};

// Изменение количества
window.changeQty = function(index, delta) {
    cart[index].quantity += delta;

    if (cart[index].quantity <= 0) {
        cart.splice(index, 1);
    }

    saveCart();
    if (document.getElementById('cart-content')) {
        renderCart();
    }
};

// Рендер корзины
window.renderCart = function() {
    const container = document.getElementById('cart-content');
    const footer = document.getElementById('cart-footer');

    if (!container) return;
    cart = JSON.parse(localStorage.getItem('vkusnyashak_cart')) || [];

    if (cart.length === 0) {
        container.innerHTML = `
            <div style="text-align: center; padding: 80px 20px; opacity: 0.5;">
                <i class="fas fa-shopping-basket" style="font-size: 4rem; color: #ff9a8b; margin-bottom: 20px;"></i>
                <p style="font-size: 1.2rem; margin-top: 20px;">Корзина пуста</p>
                <p style="opacity: 0.5; margin-top: 10px;">Добавьте товары из меню</p>
            </div>
        `;
        if (footer) footer.style.display = 'none';
        return;
    }

    if (footer) footer.style.display = 'block';
    container.innerHTML = '';
    let total = 0;

    cart.forEach((item, index) => {
        total += item.price * item.quantity;

        container.innerHTML += `
            <div class="cart-item" style="display: flex; align-items: center; background: rgba(255,255,255,0.05); 
                 margin-bottom: 15px; padding: 15px; border-radius: 15px; border: 1px solid rgba(255, 154, 139, 0.2); 
                 gap: 15px;">
                <img src="${item.img || 'https://via.placeholder.com/80x80?text=Vkusnyashak'}" 
                     style="width: 70px; height: 70px; border-radius: 10px; object-fit: cover;">
                <div style="flex-grow: 1;">
                    <h4 style="font-size: 1rem; margin: 0; color: white;">${item.name}</h4>
                    <p style="color: #ff9a8b; font-weight: 800; margin: 5px 0 0;">
                        ${item.price} ₽ × ${item.quantity} = ${item.price * item.quantity} ₽
                    </p>
                </div>
                <div style="display: flex; align-items: center; background: rgba(0,0,0,0.3); 
                     border-radius: 12px; padding: 5px; gap: 12px;">
                    <button onclick="changeQty(${index}, -1)" 
                            style="width: 32px; height: 32px; border: none; background: #ff9a8b; 
                                   color: white; border-radius: 10px; font-weight: bold; cursor: pointer;">
                        -
                    </button>
                    <span style="font-size: 0.95rem; font-weight: bold;">${item.quantity}</span>
                    <button onclick="changeQty(${index}, 1)" 
                            style="width: 32px; height: 32px; border: none; background: #ff9a8b; 
                                   color: white; border-radius: 10px; font-weight: bold; cursor: pointer;">
                        +
                    </button>
                </div>
            </div>
        `;
    });

    const totalElem = document.getElementById('total-price');
    if (totalElem) {
        totalElem.textContent = `Итого: ${total} ₽`;
    }
};

// Открытие корзины
window.openCartModal = function() {
    renderCart();
    document.getElementById('cartModal').style.display = 'flex';
};

// Закрытие модального окна
window.closeModal = function(e) {
    if (e.target.id === 'productModal') {
        document.getElementById('productModal').style.display = 'none';
    }
};

// Поиск в меню
window.searchMenu = function() {
    const query = document.getElementById('menu-search').value.toLowerCase();
    const filtered = products.filter(p =>
        p.name.toLowerCase().includes(query) &&
        (currentCategory === 'all' || p.cat === currentCategory)
    );
    renderMenu(null, filtered);
};

// Оформление заказа
window.confirmAndSendOrder = function() {
    cart = JSON.parse(localStorage.getItem('vkusnyashak_cart')) || [];

    if (cart.length === 0) {
        showNotification("Корзина пуста!", "warning");
        return;
    }

    const address = document.getElementById('order-address').value;
    const phone = document.getElementById('order-phone').value;
    const persons = document.getElementById('order-persons').value || '1';

    if (!address) {
        showNotification("Укажите адрес доставки!", "warning");
        return;
    }

    if (!phone || phone.length < 10) {
        showNotification("Укажите корректный телефон!", "warning");
        return;
    }

    // Формируем сообщение для WhatsApp
    let text = '🍰 *НОВЫЙ ЗАКАЗ VKUSNYASHAK CITY* 🍰\n';
    text += '==========================\n';
    text += '🎂 *СОСТАВ ЗАКАЗА:* 🎂\n\n';

    cart.forEach((item, index) => {
        text += `${index + 1}. *${item.name}*\n`;
        text += `   • ${item.quantity} шт. x ${item.price} ₽ = ${item.price * item.quantity} ₽\n`;
    });

    let total = cart.reduce((s, i) => s + (i.price * i.quantity), 0);
    text += '\n==========================\n';
    text += `✅ *ИТОГО К ОПЛАТЕ: ${total} ₽*\n`;
    text += '==========================\n\n';
    text += `📍 *АДРЕС:* ${address}\n`;
    text += `📞 *ТЕЛЕФОН:* ${phone}\n`;
    text += `🍴 *ПРИБОРЫ:* ${persons} чел.\n\n`;
    text += '🍪 _Спасибо за заказ! Скоро свяжемся с вами._ ✨';

    const phoneNumber = '77771234567';
    const waUrl = `https://api.whatsapp.com/send?phone=${phoneNumber}&text=${encodeURIComponent(text)}`;

    window.open(waUrl, '_blank');

    // Очищаем корзину
    cart = [];
    saveCart();
    updateUI();

    document.getElementById('cartModal').style.display = 'none';
    document.getElementById('order-address').value = '';
    document.getElementById('order-phone').value = '';
    document.getElementById('order-persons').value = '1';

    showNotification('Заказ отправлен! Ожидайте звонка.');
};

// Проверка статуса работы
function checkWorkStatus() {
    const badge = document.getElementById('work-status-badge');
    if (!badge) return;

    const now = new Date();
    const hours = now.getHours();

    if (hours >= 8 && hours < 22) {
        badge.innerHTML = `<span style="color: #2ecc71;"><i class="fas fa-circle"></i> СЕЙЧАС ОТКРЫТО</span>`;
    } else {
        badge.innerHTML = `<span style="color: #e74c3c;"><i class="fas fa-clock"></i> СЕЙЧАС ЗАКРЫТО</span>`;
    }
}

// Демо товары
function getDemoProducts() {
    return [{
            id: 'demo1',
            name: 'Торт "Красный бархат"',
            price: 1200,
            desc: 'Нежный бисквит с кремом из сливочного сыра и свежими ягодами',
            cat: 'cakes',
            type: 'classic',
            badge: 'hit',
            available: true,
            img: 'img/cake1.jpg',
            count: '1кг'
        },
        {
            id: 'demo2',
            name: 'Шоколадный торт',
            price: 1100,
            desc: 'Насыщенный шоколадный торт с какао и вишней',
            cat: 'cakes',
            type: 'classic',
            badge: '',
            available: true,
            img: 'img/cake2.jpg',
            count: '1кг'
        },
        {
            id: 'demo3',
            name: 'Шоколадное печенье',
            price: 180,
            desc: 'С кусочками темного шоколада и грецкими орехами',
            cat: 'cookies',
            type: 'classic',
            badge: 'hit',
            available: true,
            img: 'img/cookie1.jpg',
            count: '300г'
        },
        {
            id: 'demo4',
            name: 'Классический круассан',
            price: 120,
            desc: 'Воздушный круассан из слоеного теста с маслом',
            cat: 'croissants',
            type: 'classic',
            badge: 'hit',
            available: true,
            img: 'img/croissant1.jpg'
        },
        {
            id: 'demo5',
            name: 'Тирамису',
            price: 350,
            desc: 'Итальянский десерт с кофейной пропиткой и кремом маскарпоне',
            cat: 'desserts',
            type: 'classic',
            badge: 'new',
            available: true,
            img: 'img/dessert1.jpg',
            count: '200г'
        },
        {
            id: 'demo6',
            name: 'Ванильный капкейк',
            price: 180,
            desc: 'Нежный капкейк с ванильным кремом',
            cat: 'cupcakes',
            type: 'classic',
            badge: 'new',
            available: true,
            img: 'img/cupcake1.jpg',
            count: '1шт'
        },
        {
            id: 'demo7',
            name: 'Яблочный пирог',
            price: 450,
            desc: 'Домашний пирог с яблочной начинкой',
            cat: 'pies',
            type: 'seasonal',
            badge: 'hit',
            available: true,
            img: 'img/pie1.jpg',
            count: '500г'
        },
        {
            id: 'demo8',
            name: 'Капучино',
            price: 150,
            desc: 'Ароматный кофе с молочной пенкой',
            cat: 'drinks',
            type: 'classic',
            badge: '',
            available: true,
            img: 'img/drink1.jpg',
            count: '350мл'
        }
    ];
}

// Загрузка при старте
document.addEventListener('DOMContentLoaded', loadData);