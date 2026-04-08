const axios = require('axios');

const isDev = process.env.NODE_ENV !== 'production';
/**
 * Функция задержки (sleep)
 */
function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Класс-клиент для работы с OpenClaw Gateway API
 */
class GatewayClient {
  /**
   * @param {string} url - URL Gateway
   * @param {string} token - Токен авторизации
   * @param {number} timeout - Timeout запросов в мс (по умолчанию 30000)
   * @param {number} maxRetries - Максимум попыток повторения (по умолчанию 3)
   * @param {number} retryDelay - Задержка между попытками в мс (по умолчанию 1000)
   */
  constructor(url, token, timeout = 30000, maxRetries = 3, retryDelay = 1000) {
    this.url = url;
    this.token = token;
    this.timeout = timeout;
    this.maxRetries = maxRetries;
    this.retryDelay = retryDelay;
    
    this.client = axios.create({
      baseURL: url,
      timeout: timeout,
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });
    
    // Interceptor для обработки ошибок с retry логикой
    this.client.interceptors.response.use(
      (response) => response,
      async (error) => {
        const config = error.config;
        
        // Не retry для не-сетевых ошибок
        if (!config) {
          return Promise.reject(error);
        }
        
        // Инициализация счетчика retry
        if (config.__retryCount === undefined) {
          config.__retryCount = 0;
        }
        
        // Проверка на превышение лимита retries
        if (config.__retryCount < this.maxRetries) {
          config.__retryCount++;
          
          const retryDelayMs = this.retryDelay * config.__retryCount;
          if (isDev) console.log(`⚠️ Retry ${config.__retryCount}/${this.maxRetries} for ${config.method?.toUpperCase()} ${config.url} after ${retryDelayMs}ms`);
          
          await sleep(retryDelayMs);
          return this.client(config);
        }
        
        // Все попытки исчерпаны
        console.error(`❌ Failed after ${this.maxRetries} retries: ${error.message}`);
        return Promise.reject(error);
      }
    );
  }

  /**
   * Обновление токена
   * @param {string} token - Новый токен
   */
  updateToken(token) {
    this.token = token;
    this.client.defaults.headers.common['Authorization'] = `Bearer ${token}`;
  }

  /**
   * Обновление URL Gateway
   * @param {string} url - Новый URL
   */
  updateUrl(url) {
    this.url = url;
    this.client.defaults.baseURL = url;
  }

  /**
   * Проверка подключения к Gateway
   * @returns {Promise<{connected: boolean, error?: string}>}
   */
  async testConnection() {
    try {
      await this.client.get('/health');
      return { connected: true };
    } catch (error) {
      return { connected: false, error: error.message };
    }
  }

  // ==================== Universal Tool Invocation ====================

  /**
   * Универсальный метод для вызова инструментов OpenClaw Gateway
   * @param {string} tool - Название инструмента (например, 'agents_list', 'sessions_list')
   * @param {string} action - Действие (например, 'json', 'kill')
   * @param {object} args - Аргументы для инструмента
   * @returns {Promise} - Ответ от Gateway
   */
  async invokeTool(tool, action, args = {}) {
    return this.client.post('/tools/invoke', {
      tool,
      action,
      args
    });
  }

  // ==================== Агенты ====================

  /**
   * Получить список всех агентов (через invokeTool)
   */
  async getAgents() {
    return this.invokeTool('agents_list', 'json', {});
  }

  /**
   * Получить детали агента (через invokeTool)
   * @param {string} id - ID агента
   */
  async getAgent(id) {
    // Для деталей агента пока используем тот же инструмент
    // Можно расширить для получения конкретной информации
    return this.invokeTool('agents_list', 'json', { filterBy: id });
  }

  /**
   * Управление агентом (pause, resume, restart) - пока не реализовано
   * @param {string} id - ID агента
   * @param {string} action - Действие
   * @param {object} params - Параметры действия
   */
  async agentAction(id, action, params = {}) {
    // TODO: Реализовать через invokeTool когда появится поддержка
    throw new Error('Agent action not supported yet');
  }

  // ==================== Задачи ====================

  /**
   * Получить список задач из сессий
   * @param {object} filters - Фильтры (activeMinutes для активных сессий)
   * @returns {Promise<Array>} - Список задач
   */
  async getTasks(filters = {}) {
    try {
      // Получаем список сессий
      const sessionsResponse = await this.invokeTool('sessions_list', 'json', {
        activeMinutes: filters.activeMinutes || 60
      });
      
      if (isDev) console.log('[GatewayClient.getTasks] Response received');
      if (isDev) console.log('[GatewayClient.getTasks] Response.data keys:', Object.keys(sessionsResponse.data || {}));
      
      // Данные могут быть в разных форматах:
      // 1. response.data.result.content[0].text - JSON строка с сессиями
      // 2. response.data.result - объект с sessions
      let sessions = [];
      
      // Проверяем content[0].text формат (JSON строка)
      if (sessionsResponse.data?.result?.content?.[0]?.text) {
        if (isDev) console.log('[GatewayClient.getTasks] Parsing from content[0].text');
        try {
          const parsed = JSON.parse(sessionsResponse.data.result.content[0].text);
          sessions = parsed.sessions || [];
          if (isDev) console.log('[GatewayClient.getTasks] Parsed sessions count:', sessions.length);
        } catch (e) {
          console.warn('Failed to parse sessions JSON:', e.message);
        }
      }
      // Проверяем details.sessions формат
      else if (sessionsResponse.data?.result?.details?.sessions) {
        if (isDev) console.log('[GatewayClient.getTasks] Using details.sessions');
        sessions = sessionsResponse.data.result.details.sessions;
      }
      // Проверяем sessions формат
      else if (sessionsResponse.data?.result?.sessions) {
        if (isDev) console.log('[GatewayClient.getTasks] Using result.sessions');
        sessions = sessionsResponse.data.result.sessions;
      }
      
      // Маппинг сессий в задачи
      const tasks = sessions.map(session => ({
        id: session.key || session.sessionKey || session.id || `task_${Date.now()}`,
        title: session.label || session.displayName || 'Untitled task',
        description: '',
        status: 'active', // Все сессии из sessions_list активные
        agent: session.key?.split(':')[1] || 'unknown',
        kind: session.kind || 'unknown',
        channel: session.channel || 'unknown',
        activeMinutes: Math.floor((Date.now() - (session.updatedAt || Date.now())) / 60000) || 0,
        updatedAt: session.updatedAt ? new Date(session.updatedAt).toISOString() : new Date().toISOString(),
        sessionKey: session.key || session.sessionKey
      }));
      
      if (isDev) console.log('[GatewayClient.getTasks] Tasks created:', tasks.length);
      return tasks;
    } catch (error) {
      console.error('❌ Error in getTasks:', error.message);
      return [];
    }
  }

  // ==================== Сессии ====================

  /**
   * Получить список сессий (через invokeTool)
   */
  async getSessions() {
    return this.invokeTool('sessions_list', 'json', {});
  }

  /**
   * Получить детали сессии (через invokeTool)
   * @param {string} id - ID сессии
   */
  async getSession(id) {
    return this.invokeTool('sessions_history', 'json', { sessionKey: id, limit: 100 });
  }

  /**
   * Завершить сессию (через invokeTool)
   * @param {string} id - ID сессии
   */
  async killSession(id) {
    return this.invokeTool('subagents', 'kill', { target: id });
  }

  // ==================== Cron ====================

  /**
   * Получить список cron задач
   * Возвращает данные из внутреннего хранилища (cron-store)
   * Этот метод будет использоваться для совместимости с внешними вызовами
   */
  async getCron() {
    // Cron задачи хранятся локально в cron-store
    // Этот метод можно использовать для получения cron из внешних источников
    // если в будущем OpenClaw добавит поддержку
    return { data: { result: [] } };
  }

  /**
   * Ручной запуск cron задачи
   * @param {string} id - ID cron задачи
   */
  async triggerCron(id) {
    // Cron trigger обрабатывается через cron-store
    throw new Error('Cron trigger handled by cron-store');
  }

  // ==================== Activity ====================

  /**
   * Получить activity feed (через invokeTool)
   * @param {object} options - Опции (type, agent, level, limit)
   */
  async getActivity(options = {}) {
    const limit = options.limit || 50;
    return this.invokeTool('sessions_history', 'json', { limit });
  }

  // ==================== Approvals ====================

  /**
   * Получить очередь подтверждений
   * Возвращает данные из внутреннего хранилища (approvals-store)
   */
  async getApprovals() {
    // Approvals хранятся локально в approvals-store
    return { data: { result: [] } };
  }

  /**
   * Одобрить действие
   * @param {string} id - ID запроса на подтверждение
   */
  async approve(id) {
    // Approve обрабатывается через approvals-store
    throw new Error('Approve handled by approvals-store');
  }

  async reject(id) {
    // Reject обрабатывается через approvals-store
    throw new Error('Reject handled by approvals-store');
  }

  // ==================== Subagents ====================

  /**
   * Управление субагентами
   * @param {string} action - Действие (list, kill, steer)
   * @param {object} args - Аргументы
   */
  async subagents(action, args = {}) {
    return this.invokeTool('subagents', action, args);
  }

  // ==================== Sessions ====================

  /**
   * Заспавнить новую сессию
   * @param {object} params - Параметры сессии
   * @param {string} params.task - Промпт/задача для сессии
   * @param {string} params.label - Метка сессии
   * @param {string} [params.model='opencode-go/glm-5'] - Модель
   * @param {string} [params.mode='session'] - Режим (session или run)
   * @returns {Promise} - Ответ от Gateway
   */
  async spawnSession(params = {}) {
    const {
      task,
      label,
      model = 'opencode-go/glm-5',
      mode = 'session'
    } = params;

    return this.invokeTool('sessions_spawn', mode, {
      task,
      label,
      model,
      mode,
      cleanup: 'keep'
    });
  }

  // ==================== Process ====================

  /**
   * Управление процессами
   * @param {string} action - Действие (list, poll, log, write, send-keys, submit, paste, kill)
   * @param {object} args - Аргументы
   */
  async process(action, args = {}) {
    return this.invokeTool('process', action, args);
  }
}

module.exports = GatewayClient;
