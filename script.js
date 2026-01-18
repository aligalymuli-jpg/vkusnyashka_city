// Firebase конфигурация (твои ключи)
const firebaseConfig = {
    apiKey: "AIzaSyCsbOVaSbdFKkxl4H3g1V5UJtYjhRN1mWs",
    authDomain: "vkusnyashka-final.firebaseapp.com",
    databaseURL: "https://vkusnyashka-final-default-rtdb.firebaseio.com",
    projectId: "vkusnyashka-final",
    storageBucket: "vkusnyashka-final.firebasestorage.app",
    messagingSenderId: "932876479495",
    appId: "1:932876479495:web:65f375c8f489b6a3f24ea2",
    measurementId: "G-CL4M36D22H"
};

// Инициализация Firebase
if (!firebase.apps.length) {
    firebase.initializeApp(firebaseConfig);
}
const database = firebase.database();

// Глобальные переменные
let products = [];
let cart = JSON.parse(localStorage.getItem('vkusnyashak_cart')) || [];
let currentCategory = 'all';

// Загрузка данных
document.addEventListener('DOMContentLoaded', () => {
    loadData();

    // Скрыть прелоадер через 2 секунды или когда загрузится
    setTimeout(hidePreloader, 2000);
});

// Скрытие прелоадера
function hidePreloader() {
    const loader = document.getElementById('preloader');
    if (loader) {
        loader.style.opacity = '0';
        setTimeout(() => {
            loader.style.display = 'none';
        }, 600);
    }
}

// Загрузка данных из Firebase
async function loadData() {
    try {
        const snapshot = await database.ref('products').once('value');
        const data = snapshot.val();

        if (data) {
            products = Object.keys(data).map(key => ({
                id: key,
                ...data[key]
            }));
        } else {
            // Демо товары если база пустая
            products = getDemoProducts();
        }

        renderMenu('all');
        updateCart();

    } catch (error) {
        console.error("Ошибка загрузки данных:", error);
        products = getDemoProducts();
        renderMenu('all');
    }
}

// Демо товары
function getDemoProducts() {
    return [{
            id: '1',
            name: 'Торт "Красный бархат"',
            price: 1200,
            desc: 'Нежный бисквит с кремом из сливочного сыра и ягодами',
            category: 'cakes',
            badge: 'hit'
        },
        {
            id: '2',
            name: 'Шоколадный торт',
            price: 1100,
            desc: 'Насыщенный шоколадный торт с какао и вишней',
            category: 'cakes',
            badge: ''
        },
        {
            id: '3',
            name: 'Медовик',
            price: 950,
            desc: 'Классический медовый торт со сметанным кремом',
            category: 'cakes',
            badge: 'new'
        },
        {
            id: '4',
            name: 'Шоколадное печенье',
            price: 180,
            desc: 'С кусочками темного шоколада и грецкими орехами',
            category: 'cookies',
            badge: 'hit'
        },
        {
            id: '5',
            name: 'Овсяное с клюквой',
            price: 150,
            desc: 'Полезное печенье с овсяными хлопьями и сушеной клюквой',
            category: 'cookies',
            badge: ''
        },
        {
            id: '6',
            name: 'Классический круассан',
            price: 120,
            desc: 'Воздушный круассан из слоеного теста с маслом',
            category: 'croissants',
            badge: 'hit'
        },
        {
            id: '7',
            name: 'Круассан с шоколадом',
            price: 140,
            desc: 'С начинкой из бельгийского шоколада',
            category: 'croissants',
            badge: ''
        },
        {
            id: '8',
            name: 'Тирамису',
            price: 350,
            desc: 'Итальянский десерт с кофейной пропиткой и кремом маскарпоне',
            category: 'desserts',
            badge: 'new'
        },
        {
            id: '9',
            name: 'Чизкек Нью-Йорк',
            price: 320,
            desc: 'Классический чизкек с ягодным соусом',
            category: 'desserts',
            badge: ''
        },
        {
            id: '10',
            name: 'Ванильный капкейк',
            price: 180,
            desc: 'Нежный капкейк с ванильным кремом',
            category: 'cupcakes',
            badge: 'new'
        },
        {
            id: '11',
            name: 'Яблочный пирог',
            price: 450,
            desc: 'Домашний пирог с яблочной начинкой',
            category: 'pies',
            badge: 'hit'
        },
        {
            id: '12',
            name: 'Капучино',
            price: 150,
            desc: 'Ароматный кофе с молочной пенкой',
            category: 'drinks',
            badge: ''
        }
    ];
}

// Фильтрация по категориям
window.filterCat = function(category, button) {
    currentCategory = category;

    // Убрать активный класс у всех кнопок
    document.querySelectorAll('.cat-btn').forEach(btn => {
        btn.style.borderColor = 'rgba(255, 154, 139, 0.2)';
        btn.style.background = 'rgba(255, 255, 255, 0.05)';
    });

    // Добавить активный класс текущей кнопке
    if (button) {
        button.style.borderColor = 'var(--primary)';
        button.style.background = 'rgba(255, 154, 139, 0.1)';
    }

    renderMenu(category);
};

// Рендер меню
window.renderMenu = function(category = 'all') {
        const container = document.getElementById('menu-container');
        if (!container) return;

        // Фильтрация товаров
        let filteredProducts = products;
        if (category !== 'all') {
            filteredProducts = products.filter(product =>
                product.category === category || product.cat === category
            );
        }

        // Проверяем доступность
        filteredProducts = filteredProducts.filter(product => product.available !== false);

        if (filteredProducts.length === 0) {
            container.innerHTML = `
            <div style="grid-column: 1/-1; text-align: center; padding: 40px;">
                <i class="fas fa-cookie-bite" style="font-size: 3rem; color: var(--primary); margin-bottom: 15px;"></i>
                <p style="color: rgba(255, 255, 255, 0.7);">В этой категории пока нет товаров</p>
            </div>
        `;
            return;
        }

        // Генерация HTML для товаров
        container.innerHTML = filteredProducts.map(product => {
                    // Иконка в зависимости от категории
                    const getIcon = (cat) => {
                        const icons = {
                            'cakes': '🎂',
                            'cookies': '🍪',
                            'croissants': '🥐',
                            'desserts': '🍮',
                            'cupcakes': '🧁',
                            'pies': '🥧',
                            'drinks': '☕'
                        };
                        return icons[cat] || '🍰';
                    };

                    const icon = getIcon(product.category || product.cat);
                    const badge = product.badge === 'hit' ? 'ХИТ 🔥' : product.badge === 'new' ? 'НОВИНКА ✨' : '';

                    return `
            <div class="product-card" onclick="openDetails('${product.id}')">
                ${badge ? `<div class="product-badge badge-${product.badge}">${badge}</div>` : ''}
                <div class="product-image">
                    ${icon}
                </div>
                <div class="product-info">
                    <h3>${product.name}</h3>
                    <div class="product-price">${product.price} ₽</div>
                    <button class="btn-sm" onclick="event.stopPropagation(); addToCart('${product.id}', this)">
                        <i class="fas fa-cart-plus"></i> В КОРЗИНУ
                    </button>
                </div>
            </div>
        `;
    }).join('');
};

// Открытие деталей товара
window.openDetails = function(id) {
    const product = products.find(p => p.id === id);
    if (!product) return;
    
    document.getElementById('modalName').textContent = product.name;
    document.getElementById('modalDesc').textContent = product.desc || "Авторский рецепт от Vkusnyashak City.";
    document.getElementById('modalPrice').textContent = product.price + " ₽";
    
    // Иконка для модального окна
    const getIcon = (cat) => {
        const icons = {
            'cakes': '🎂',
            'cookies': '🍪',
            'croissants': '🥐',
            'desserts': '🍮',
            'cupcakes': '🧁',
            'pies': '🥧',
            'drinks': '☕'
        };
        return icons[cat] || '🍰';
    };
    
    const modalImage = document.getElementById('modalImg');
    modalImage.innerHTML = getIcon(product.category || product.cat);
    modalImage.style.fontSize = '4rem';
    modalImage.style.display = 'flex';
    modalImage.style.alignItems = 'center';
    modalImage.style.justifyContent = 'center';
    
    // Настройка кнопки добавления
    const addBtn = document.getElementById('modalAddBtn');
    addBtn.onclick = () => {
        addToCart(id);
        closeModal();
    };
    
    document.getElementById('productModal').style.display = 'flex';
};

// Закрытие модального окна
window.closeModal = function() {
    document.getElementById('productModal').style.display = 'none';
};

// Добавление в корзину
window.addToCart = function(productId, button = null) {
    const product = products.find(p => p.id === productId);
    if (!product) return;
    
    // Проверяем, есть ли товар уже в корзине
    const existingItem = cart.find(item => item.id === productId);
    
    if (existingItem) {
        existingItem.quantity += 1;
    } else {
        cart.push({
            id: product.id,
            name: product.name,
            price: parseInt(product.price),
            quantity: 1
        });
    }
    
    // Сохраняем корзину
    localStorage.setItem('vkusnyashak_cart', JSON.stringify(cart));
    
    // Обновляем UI
    updateCart();
    
    // Анимация кнопки
    if (button) {
        const originalHTML = button.innerHTML;
        button.innerHTML = '<i class="fas fa-check"></i> ДОБАВЛЕНО';
        button.style.background = '#2ecc71';
        
        setTimeout(() => {
            button.innerHTML = originalHTML;
            button.style.background = '';
        }, 1000);
    }
    
    // Показываем уведомление
    showNotification(`${product.name} добавлен в корзину!`);
};

// Показать уведомление
function showNotification(message) {
    // Создаем элемент уведомления
    const notification = document.createElement('div');
    notification.style.cssText = `
        position: fixed;
        top: 100px;
        right: 20px;
        background: linear-gradient(45deg, var(--primary), var(--primary-dark));
        color: white;
        padding: 15px 25px;
        border-radius: 10px;
        box-shadow: 0 5px 15px rgba(0,0,0,0.3);
        z-index: 1001;
        animation: slideIn 0.3s ease;
        font-weight: 600;
        max-width: 300px;
    `;
    notification.textContent = message;
    
    document.body.appendChild(notification);
    
    // Удаляем уведомление через 2 секунды
    setTimeout(() => {
        notification.style.animation = 'slideOut 0.3s ease';
        setTimeout(() => notification.remove(), 300);
    }, 2000);
}

// Добавляем стили для анимации
const style = document.createElement('style');
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

// Обновление корзины
function updateCart() {
    const cartCount = document.getElementById('cart-count');
    if (cartCount) {
        const totalItems = cart.reduce((sum, item) => sum + item.quantity, 0);
        cartCount.textContent = totalItems;
        cartCount.style.display = totalItems > 0 ? 'flex' : 'none';
    }
}

// Открытие корзины
window.sendOrder = function() {
    const cartContent = document.getElementById('cart-content');
    const totalPrice = document.getElementById('total-price');
    
    if (cart.length === 0) {
        showNotification('Корзина пуста! Добавьте товары.');
        return;
    }
    
    // Заполняем корзину в модальном окне
    cartContent.innerHTML = cart.map((item, index) => {
        const total = item.price * item.quantity;
        return `
            <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 15px; padding-bottom: 15px; border-bottom: 1px solid rgba(255,255,255,0.1);">
                <div>
                    <div style="font-weight: 600;">${item.name}</div>
                    <div style="font-size: 0.9rem; color: var(--primary);">${item.price} ₽ × ${item.quantity} = ${total} ₽</div>
                </div>
                <div style="display: flex; gap: 10px; align-items: center;">
                    <button onclick="changeCartQuantity(${index}, -1)" style="width: 30px; height: 30px; border-radius: 50%; background: var(--primary); color: white; border: none; cursor: pointer;">-</button>
                    <span>${item.quantity}</span>
                    <button onclick="changeCartQuantity(${index}, 1)" style="width: 30px; height: 30px; border-radius: 50%; background: var(--primary); color: white; border: none; cursor: pointer;">+</button>
                </div>
            </div>
        `;
    }).join('');
    
    // Считаем общую сумму
    const total = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
    totalPrice.textContent = `${total} ₽`;
    
    // Показываем модальное окно
    document.getElementById('orderModal').style.display = 'flex';
};

// Изменение количества в корзине
window.changeCartQuantity = function(index, change) {
    cart[index].quantity += change;
    
    if (cart[index].quantity <= 0) {
        cart.splice(index, 1);
    }
    
    localStorage.setItem('vkusnyashak_cart', JSON.stringify(cart));
    updateCart();
    sendOrder(); // Обновляем отображение корзины
};

// Закрытие модального окна заказа
function closeOrderModal() {
    document.getElementById('orderModal').style.display = 'none';
}

// Подтверждение и отправка заказа
window.confirmAndSendOrder = function() {
    const address = document.getElementById('order-address').value;
    const persons = document.getElementById('order-persons').value || '1';
    
    if (!address) {
        showNotification('Укажите адрес доставки!');
        return;
    }
    
    if (cart.length === 0) {
        showNotification('Корзина пуста!');
        return;
    }
    
    // Формируем сообщение для WhatsApp
    let message = '🍰 *НОВЫЙ ЗАКАЗ VKUSNYASHAK CITY* 🍰\n\n';
    message += '🎂 *СОСТАВ ЗАКАЗА:*\n';
    message += '─'.repeat(30) + '\n';
    
    cart.forEach((item, index) => {
        message += `${index + 1}. *${item.name}*\n`;
        message += `   ${item.quantity} шт. × ${item.price} ₽ = ${item.price * item.quantity} ₽\n`;
    });
    
    message += '─'.repeat(30) + '\n';
    const total = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
    message += `💰 *ИТОГО:* ${total} ₽\n\n`;
    message += `📍 *АДРЕС:* ${address}\n`;
    message += `🍴 *ПРИБОРЫ:* ${persons} чел.\n\n`;
    message += '🍪 _Спасибо за заказ! Скоро свяжемся с вами._ ✨';
    
    // Кодируем сообщение для URL
    const encodedMessage = encodeURIComponent(message);
    
    // Отправляем в WhatsApp (номер можно изменить)
    const phoneNumber = '77771234567';
    const whatsappUrl = `https://wa.me/${phoneNumber}?text=${encodedMessage}`;
    
    // Открываем WhatsApp в новом окне
    window.open(whatsappUrl, '_blank');
    
    // Очищаем корзину
    cart = [];
    localStorage.setItem('vkusnyashak_cart', JSON.stringify(cart));
    updateCart();
    
    // Закрываем модальное окно
    closeOrderModal();
    
    // Очищаем поля
    document.getElementById('order-address').value = '';
    document.getElementById('order-persons').value = '1';
    
    // Показываем подтверждение
    showNotification('Заказ отправлен! Ожидайте звонка.');
};