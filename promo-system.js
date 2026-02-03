// Умная система промокодов Vkusnyashak City
class SmartPromoSystem {
    constructor() {
        this.promoStates = JSON.parse(localStorage.getItem('smart_promo_states')) || {};
        this.cleanupOldRecords();
        console.log("Smart Promo System initialized");
    }

    // Проверка можно ли использовать промокод
    canUsePromoCode(code, phone) {
        if (!phone) return true; // Без телефона пропускаем

        const key = `${code}_${this.normalizePhone(phone)}`;
        const state = this.promoStates[key];

        if (!state) return true; // Никогда не использовался

        // Промокод активирован только если заказ подтвержден
        if (state.status === 'confirmed') {
            return false; // Уже использован
        }

        // Если статус pending и прошло меньше 1 часа, считаем что в процессе
        if (state.status === 'pending' && this.isRecent(state.timestamp, 1)) {
            return false; // В процессе оформления
        }

        // Удаляем старый pending статус
        delete this.promoStates[key];
        this.save();
        return true;
    }

    // Отметить промокод как "в процессе"
    markPromoPending(code, phone, orderId) {
        const key = `${code}_${this.normalizePhone(phone)}`;

        this.promoStates[key] = {
            code: code,
            phone: this.normalizePhone(phone),
            status: 'pending',
            timestamp: new Date().toISOString(),
            orderId: orderId
        };

        this.save();
        console.log(`Promo ${code} marked as pending for order ${orderId}`);
    }

    // Подтвердить использование промокода
    confirmPromoUsage(code, phone, orderId) {
        const key = `${code}_${this.normalizePhone(phone)}`;

        this.promoStates[key] = {
            code: code,
            phone: this.normalizePhone(phone),
            status: 'confirmed',
            timestamp: new Date().toISOString(),
            orderId: orderId,
            confirmedAt: new Date().toISOString()
        };

        this.save();
        console.log(`Promo ${code} confirmed for order ${orderId}`);
    }

    // Отменить pending статус (если заказ не завершен)
    cancelPromoPending(code, phone) {
        const key = `${code}_${this.normalizePhone(phone)}`;
        const state = this.promoStates[key];

        if (state && state.status === 'pending') {
            // Удаляем через 10 минут если не подтвержден
            setTimeout(() => {
                const currentState = this.promoStates[key];
                if (currentState && currentState.status === 'pending') {
                    delete this.promoStates[key];
                    this.save();
                    console.log(`Pending promo ${code} auto-cleared after 10min`);
                }
            }, 10 * 60 * 1000); // 10 минут

            return true;
        }

        return false;
    }

    // Нормализация телефона
    normalizePhone(phone) {
        if (!phone) return 'no_phone';
        return phone.replace(/\D/g, '').slice(-10);
    }

    // Проверка давности записи (в часах)
    isRecent(timestamp, maxHours) {
        const recordTime = new Date(timestamp);
        const now = new Date();
        const diffHours = (now - recordTime) / (1000 * 60 * 60);
        return diffHours < maxHours;
    }

    // Очистка старых записей
    cleanupOldRecords() {
        const now = new Date();
        let cleaned = false;

        Object.keys(this.promoStates).forEach(key => {
            const state = this.promoStates[key];
            const recordTime = new Date(state.timestamp);
            const diffHours = (now - recordTime) / (1000 * 60 * 60);

            // Удаляем pending старше 24 часов
            if (state.status === 'pending' && diffHours > 24) {
                delete this.promoStates[key];
                cleaned = true;
            }

            // Удаляем confirmed старше 90 дней
            if (state.status === 'confirmed' && diffHours > 24 * 90) {
                delete this.promoStates[key];
                cleaned = true;
            }
        });

        if (cleaned) {
            this.save();
        }
    }

    // Сохранение в localStorage
    save() {
        localStorage.setItem('smart_promo_states', JSON.stringify(this.promoStates));
    }

    // Получить статистику
    getStats() {
        const stats = {
            total: Object.keys(this.promoStates).length,
            pending: 0,
            confirmed: 0,
            byCode: {}
        };

        Object.values(this.promoStates).forEach(state => {
            if (state.status === 'pending') stats.pending++;
            if (state.status === 'confirmed') stats.confirmed++;

            stats.byCode[state.code] = stats.byCode[state.code] || { pending: 0, confirmed: 0 };
            stats.byCode[state.code][state.status]++;
        });

        return stats;
    }

    // Сброс промокода (для тестирования)
    resetPromoCode(code, phone) {
        const key = `${code}_${this.normalizePhone(phone)}`;
        delete this.promoStates[key];
        this.save();
        console.log(`Promo ${code} reset for ${phone}`);
        return true;
    }

    // Сброс всех промокодов
    resetAllPromoCodes() {
        this.promoStates = {};
        this.save();
        console.log("All promocodes reset");
        return true;
    }

    // Получить все промокоды
    getAllPromoCodes() {
        return this.promoStates;
    }
}

// Глобальная переменная
let smartPromoSystem = null;

// Инициализация
document.addEventListener('DOMContentLoaded', function() {
    try {
        smartPromoSystem = new SmartPromoSystem();
    } catch (e) {
        console.error("Error initializing promo system:", e);
    }
});