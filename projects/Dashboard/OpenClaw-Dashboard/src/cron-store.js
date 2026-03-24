const fs = require('fs');
const path = require('path');

// Путь к файлу persistency
const STORE_PATH = path.join(process.env.HOME || '/home/rem', '.openclaw-dashboard', 'cron.json');

// В-memory хранилище cron задач
const store = new Map();

/**
 * Загрузить cron задачи из файла при старте
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
      
      console.log(`📅 Cron store loaded: ${store.size} tasks`);
    }
  } catch (error) {
    console.error('❌ Error loading cron store:', error.message);
  }
}

/**
 * Сохранить cron задачи в файл
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
    console.error('❌ Error saving cron store:', error.message);
  }
}

/**
 * Добавить cron задачу
 * @param {string} id - ID задачи
 * @param {object} task - Объект задачи
 * @returns {object} Добавленная задача
 */
function add(id, task) {
  const now = new Date().toISOString();
  const cronTask = {
    id: id || `cron_${Date.now()}`,
    name: task.name || 'Unnamed cron task',
    schedule: task.schedule || '* * * * *', // cron expression
    action: task.action || '',
    args: task.args || {},
    enabled: task.enabled !== false,
    lastRun: null,
    nextRun: null,
    createdAt: now,
    updatedAt: now
  };
  
  store.set(cronTask.id, cronTask);
  saveToDisk();
  
  return cronTask;
}

/**
 * Получить cron задачу по ID
 * @param {string} id - ID задачи
 * @returns {object|null} Задача или null
 */
function get(id) {
  return store.get(id) || null;
}

/**
 * Удалить cron задачу
 * @param {string} id - ID задачи
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
 * Получить все cron задачи
 * @returns {Array} Список задач
 */
function list() {
  return Array.from(store.values());
}

/**
 * Обновить cron задачу
 * @param {string} id - ID задачи
 * @param {object} updates - Поля для обновления
 * @returns {object|null} Обновленная задача
 */
function update(id, updates) {
  const task = store.get(id);
  if (!task) return null;
  
  Object.assign(task, updates, { updatedAt: new Date().toISOString() });
  store.set(id, task);
  saveToDisk();
  
  return task;
}

/**
 * Ручной запуск cron задачи
 * @param {string} id - ID задачи
 * @returns {object} Результат запуска
 */
function trigger(id) {
  const task = store.get(id);
  if (!task) {
    return { error: 'Task not found', id };
  }
  
  if (!task.enabled) {
    return { error: 'Task is disabled', id };
  }
  
  const now = new Date().toISOString();
  
  // Обновляем lastRun
  task.lastRun = now;
  store.set(id, task);
  saveToDisk();
  
  // Здесь можно добавить логику вызова action через GatewayClient
  console.log(`⚡ Triggered cron task: ${id} (${task.name})`);
  
  return {
    success: true,
    task: task,
    triggeredAt: now
  };
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
  update,
  trigger
};
