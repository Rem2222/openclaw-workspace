const fs = require('fs');
const path = require('path');

// Путь к файлу persistency
const STORE_PATH = path.join(process.env.HOME || '/home/rem', '.openclaw-dashboard', 'approvals.json');

// В-memory хранилище очереди подтверждений
const store = new Map();

/**
 * Генерация уникального ID
 */
function generateId() {
  return `approval_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Загрузить approvals из файла при старте
 */
function loadFromDisk() {
  try {
    if (fs.existsSync(STORE_PATH)) {
      const data = fs.readFileSync(STORE_PATH, 'utf8');
      const parsed = JSON.parse(data);
      
      // Восстанавливаем Map из объекта
      Object.keys(parsed).forEach(key => {
        store.set(key, parsed[key]);
      });
      
      console.log(`✅ Approvals store loaded: ${store.size} items`);
    }
  } catch (error) {
    console.error('❌ Error loading approvals store:', error.message);
  }
}

/**
 * Сохранить approvals в файл
 */
function saveToDisk() {
  try {
    // Конвертируем Map в объект для JSON
    const obj = {};
    store.forEach((value, key) => {
      obj[key] = value;
    });
    
    fs.writeFileSync(STORE_PATH, JSON.stringify(obj, null, 2), 'utf8');
  } catch (error) {
    console.error('❌ Error saving approvals store:', error.message);
  }
}

/**
 * Добавить запрос на подтверждение
 * @param {object} request - Данные запроса
 * @returns {object} Добавленный запрос
 */
function add(request) {
  const now = new Date().toISOString();
  const approval = {
    id: request.id || generateId(),
    type: request.type || 'unknown',
    title: request.title || 'Untitled approval',
    description: request.description || '',
    action: request.action || '',
    args: request.args || {},
    requester: request.requester || 'system',
    status: 'pending', // pending, approved, rejected
    approvedBy: null,
    rejectedBy: null,
    approvedAt: null,
    rejectedAt: null,
    createdAt: now,
    updatedAt: now,
    expiresAt: request.expiresAt || null
  };
  
  store.set(approval.id, approval);
  saveToDisk();
  
  return approval;
}

/**
 * Получить запрос по ID
 * @param {string} id - ID запроса
 * @returns {object|null} Запрос или null
 */
function get(id) {
  return store.get(id) || null;
}

/**
 * Удалить запрос
 * @param {string} id - ID запроса
 * @returns {boolean} Успешно удалено
 */
function remove(id) {
  const removed = store.delete(id);
  if (removed) {
    saveToDisk();
  }
  return removed;
}

/**
 * Получить все запросы (с опциональным фильтром по статусу)
 * @param {string} status - Фильтр по статусу (pending, approved, rejected)
 * @returns {Array} Список запросов
 */
function list(status = null) {
  let items = Array.from(store.values());
  
  if (status) {
    items = items.filter(item => item.status === status);
  }
  
  // Сортировка: сначала pending, затем по дате создания
  items.sort((a, b) => {
    if (a.status !== b.status) {
      return a.status === 'pending' ? -1 : 1;
    }
    return new Date(b.createdAt) - new Date(a.createdAt);
  });
  
  return items;
}

/**
 * Одобрить запрос
 * @param {string} id - ID запроса
 * @param {string} approvedBy - Кто одобрил
 * @returns {object|null} Обновлённый запрос
 */
function approve(id, approvedBy = 'user') {
  const approval = store.get(id);
  if (!approval) return null;
  
  if (approval.status !== 'pending') {
    return { error: 'Request is not pending', id };
  }
  
  const now = new Date().toISOString();
  approval.status = 'approved';
  approval.approvedBy = approvedBy;
  approval.approvedAt = now;
  approval.updatedAt = now;
  
  store.set(id, approval);
  saveToDisk();
  
  console.log(`✅ Approval approved: ${id} by ${approvedBy}`);
  
  return approval;
}

/**
 * Отклонить запрос
 * @param {string} id - ID запроса
 * @param {string} rejectedBy - Кто отклонил
 * @param {string} reason - Причина отклонения
 * @returns {object|null} Обновлённый запрос
 */
function reject(id, rejectedBy = 'user', reason = '') {
  const approval = store.get(id);
  if (!approval) return null;
  
  if (approval.status !== 'pending') {
    return { error: 'Request is not pending', id };
  }
  
  const now = new Date().toISOString();
  approval.status = 'rejected';
  approval.rejectedBy = rejectedBy;
  approval.rejectedAt = now;
  approval.rejectionReason = reason;
  approval.updatedAt = now;
  
  store.set(id, approval);
  saveToDisk();
  
  console.log(`❌ Approval rejected: ${id} by ${rejectedBy}`);
  
  return approval;
}

/**
 * Получить статистику
 * @returns {object} Статистика
 */
function stats() {
  const items = Array.from(store.values());
  
  return {
    total: items.length,
    pending: items.filter(i => i.status === 'pending').length,
    approved: items.filter(i => i.status === 'approved').length,
    rejected: items.filter(i => i.status === 'rejected').length
  };
}

/**
 * Очистить обработанные запросы (approved/rejected)
 * @returns {number} Количество удалённых запросов
 */
function cleanupProcessed() {
  let removed = 0;
  
  store.forEach((item, key) => {
    if (item.status !== 'pending') {
      store.delete(key);
      removed++;
    }
  });
  
  if (removed > 0) {
    saveToDisk();
  }
  
  return removed;
}

/**
 * Инициализация при старте
 */
loadFromDisk();

module.exports = {
  add,
  get,
  remove,
  list,
  approve,
  reject,
  stats,
  cleanupProcessed
};
