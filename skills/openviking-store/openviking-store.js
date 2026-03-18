#!/usr/bin/env node

/**
 * OpenViking Store — хранение информации в контекстной базе
 * 
 * Поддерживает:
 * - Сохранение в дневник дня
 * - Сохранение в долгосрочную память (MEMORY.md)
 * - Создание тематических файлов
 * - Загрузку в OpenViking векторную базу
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// Import OpenViking HTTP client
const HTTP_CLIENT_PATH = path.join(__dirname, '..', 'openviking-search', 'openviking-http.js');
let openvikingClient = null;

try {
  openvikingClient = require(HTTP_CLIENT_PATH);
} catch (e) {
  // HTTP client not available — will skip OpenViking upload
}

const CONFIG = {
  WORKSPACE: process.env.HOME + '/.openclaw/workspace',
  TOPICS_DIR: path.join(process.env.HOME + '/.openclaw/workspace', 'memory', 'topics'),
};

/**
 * Получить дату сегодня в формате YYYY-MM-DD
 */
function getTodayDate() {
  return new Date().toISOString().split('T')[0];
}

/**
 * Форматирование заголовка для OpenViking
 */
function formatVikingTitle(title, type, extra = '') {
  const prefix = {
    daily: '[Дневник]',
    memory: '[Память]',
    topic: '[Тема]',
  }[type] || '[Запись]';
  
  if (extra) {
    return `${prefix} ${title} — ${extra}`;
  }
  return `${prefix} ${title}`;
}

/**
 * Форматирование контента для OpenViking
 */
function formatVikingContent(title, content, type, metadata = {}) {
  const lines = [
    `# ${title}`,
    ``,
    `**Тип:** ${type === 'daily' ? 'Дневник' : type === 'memory' ? 'Память' : 'Тема'}`,
    `**Дата:** ${getTodayDate()}`,
    `**Время:** ${new Date().toLocaleTimeString('ru-RU')}`,
    '',
    '---',
    '',
    content,
  ];
  
  // Add metadata
  if (metadata.file) {
    lines.push(`\n\n_Источник: ${metadata.file}_`);
  }
  if (metadata.topic) {
    lines.push(`_Тема: ${metadata.topic}_`);
  }
  if (metadata.section) {
    lines.push(`_Раздел: ${metadata.section}_`);
  }
  
  return lines.join('\n');
}

/**
 * Загрузка в OpenViking
 */
async function uploadToOpenViking(title, content, type, metadata = {}) {
  if (!openvikingClient) {
    console.log('  ⚠️  OpenViking HTTP client не доступен — пропуск загрузки');
    return { success: false, reason: 'client_unavailable' };
  }
  
  const formattedTitle = formatVikingTitle(title, type, metadata.topic || metadata.section || '');
  const formattedContent = formatVikingContent(title, content, type, metadata);
  
  try {
    console.log('  📤 Загрузка в OpenViking...');
    
    const result = await openvikingClient.addResource({
      content: formattedContent,
      title: formattedTitle,
      description: content.substring(0, 200) + (content.length > 200 ? '...' : ''),
    });
    
    console.log(`  ✅ Ресурс добавлен: ${result.uri}`);
    return { success: true, ...result };
  } catch (error) {
    console.log(`  ❌ Ошибка загрузки в OpenViking: ${error.message}`);
    return { success: false, error: error.message };
  }
}

/**
 * Сохранение в дневник дня
 */
function storeInDailyLog(title, content, date = null) {
  const dateStr = date || getTodayDate();
  const filePath = path.join(CONFIG.WORKSPACE, 'memory', `${dateStr}.md`);
  
  // Создаём директорию если нет
  const dir = path.dirname(filePath);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  
  // Форматирование записи
  const timestamp = new Date().toTimeString().substring(0, 8);
  const entry = `\n### ${timestamp} — ${title}\n\n${content}\n`;
  
  // Читаем существующий файл или создаём заголовок
  let fileContent = '';
  if (fs.existsSync(filePath)) {
    fileContent = fs.readFileSync(filePath, 'utf8');
  } else {
    fileContent = `# ${dateStr} — Daily Log\n\n`;
  }
  
  // Добавляем запись
  fileContent += entry;
  
  // Записываем
  fs.writeFileSync(filePath, fileContent);
  
  return {
    success: true,
    file: path.relative(CONFIG.WORKSPACE, filePath),
    title,
    length: entry.length,
    type: 'daily',
  };
}

/**
 * Сохранение в долгосрочную память (MEMORY.md)
 */
function storeInMemory(section, content, append = true) {
  const filePath = path.join(CONFIG.WORKSPACE, 'MEMORY.md');
  
  if (!fs.existsSync(filePath)) {
    fs.writeFileSync(filePath, '# MEMORY.md - Долгосрочная память\n\n');
  }
  
  let fileContent = fs.readFileSync(filePath, 'utf8');
  
  // Форматирование записи
  const dateStr = getTodayDate();
  const entryHeader = `\n## ${section}\n`;
  const entryContent = append ? `\n- **${dateStr}**: ${content}` : content;
  
  // Проверяем есть ли уже такой раздел
  const sectionRegex = new RegExp(`^## ${section}$`, 'm');
  
  if (sectionRegex.test(fileContent)) {
    // Раздел существует — добавляем в него
    if (append) {
      // Ищем конец раздела (следующий ## или конец файла)
      const sectionMatch = fileContent.match(new RegExp(`(## ${section}[\s\S]*?)(?=## |$)`, 'm'));
      
      if (sectionMatch) {
        // Добавляем новую запись в раздел
        const updatedSection = sectionMatch[1] + entryContent;
        fileContent = fileContent.replace(sectionMatch[1], updatedSection);
      } else {
        fileContent += entryHeader + entryContent;
      }
    }
  } else {
    // Раздела нет — создаём новый
    fileContent += entryHeader + entryContent + '\n';
  }
  
  // Записываем
  fs.writeFileSync(filePath, fileContent);
  
  return {
    success: true,
    file: 'MEMORY.md',
    section,
    length: entryContent.length,
    type: 'memory',
  };
}

/**
 * Сохранение в тематический файл
 */
function storeInTopic(topic, title, content) {
  // Создаём директорию topics если нет
  if (!fs.existsSync(CONFIG.TOPICS_DIR)) {
    fs.mkdirSync(CONFIG.TOPICS_DIR, { recursive: true });
  }
  
  const filePath = path.join(CONFIG.TOPICS_DIR, `${topic}.md`);
  
  // Форматирование записи
  const dateStr = getTodayDate();
  const entry = `\n## ${title} (${dateStr})\n\n${content}\n`;
  
  // Читаем существующий файл или создаём заголовок
  let fileContent = '';
  if (fs.existsSync(filePath)) {
    fileContent = fs.readFileSync(filePath, 'utf8');
  } else {
    fileContent = `# ${topic}\n\nТематический файл для: ${topic}\n\n`;
  }
  
  // Добавляем запись
  fileContent += entry;
  
  // Записываем
  fs.writeFileSync(filePath, fileContent);
  
  return {
    success: true,
    file: path.relative(CONFIG.WORKSPACE, filePath),
    topic,
    title,
    length: entry.length,
    type: 'topic',
  };
}

/**
 * Умное сохранение — выбирает место автоматически
 */
function smartStore(data, options = {}) {
  const { type, title, content, topic, section } = options;
  
  switch (type) {
    case 'daily':
      return storeInDailyLog(title, content);
    
    case 'memory':
      return storeInMemory(section, content);
    
    case 'topic':
      return storeInTopic(topic, title, content);
    
    case 'auto':
    default:
      // Авто-определение:
      // - Если есть topic → тематический файл
      // - Если есть section → MEMORY.md
      // - Иначе → дневник дня
      
      if (topic) {
        return storeInTopic(topic, title || 'Запись', content);
      } else if (section) {
        return storeInMemory(section, content);
      } else {
        return storeInDailyLog(title || 'Запись', content);
      }
  }
}

/**
 * CLI
 */
if (require.main === module) {
  const rawArgs = process.argv.slice(2);
  
  // Парсинг аргументов с поддержкой флагов
  function parseArgsWithFlags(args) {
    const result = {
      command: null,
      args: [],
      flags: {},
    };
    
    for (let i = 0; i < args.length; i++) {
      const arg = args[i];
      
      if (arg === '--viking') {
        result.flags.viking = true;
      } else if (!result.command) {
        result.command = arg;
      } else {
        result.args.push(arg);
      }
    }
    
    return result;
  }
  
  const parsed = parseArgsWithFlags(rawArgs);
  const command = parsed.command || 'help';
  const args = parsed.args;
  const flags = parsed.flags;
  
  async function main() {
    try {
      if (command === 'daily') {
        // Сохранение в дневник дня
        const title = args[0] || 'Без названия';
        const content = args.slice(1).join(' ') || '(пусто)';
        const result = storeInDailyLog(title, content);
        console.log('Сохранено в дневник:');
        console.log(JSON.stringify(result, null, 2));
        
        // Загрузка в OpenViking
        if (flags.viking) {
          await uploadToOpenViking(title, content, 'daily', { file: result.file });
        }
      }
      else if (command === 'memory') {
        // Сохранение в MEMORY.md
        const section = args[0] || 'Разное';
        const content = args.slice(1).join(' ');
        const result = storeInMemory(section, content);
        console.log('Сохранено в MEMORY.md:');
        console.log(JSON.stringify(result, null, 2));
        
        // Загрузка в OpenViking
        if (flags.viking) {
          await uploadToOpenViking(content, content, 'memory', { section, file: result.file });
        }
      }
      else if (command === 'topic') {
        // Сохранение в тематический файл
        const topic = args[0] || 'untitled';
        const title = args[1] || 'Запись';
        const content = args.slice(2).join(' ');
        const result = storeInTopic(topic, title, content);
        console.log('Сохранено в тематический файл:');
        console.log(JSON.stringify(result, null, 2));
        
        // Загрузка в OpenViking
        if (flags.viking) {
          await uploadToOpenViking(title, content, 'topic', { topic, file: result.file });
        }
      }
      else if (command === 'list') {
        // Список тематических файлов
        console.log('Тематические файлы:');
        if (fs.existsSync(CONFIG.TOPICS_DIR)) {
          const files = fs.readdirSync(CONFIG.TOPICS_DIR).filter(f => f.endsWith('.md'));
          files.forEach(f => console.log('  - ' + f));
        } else {
          console.log('  (нет тематических файлов)');
        }
      }
      else if (command === 'status') {
        // Статус системы хранения
        console.log('OpenViking Store Status:');
        console.log('  Workspace:', CONFIG.WORKSPACE);
        console.log('  Topics dir:', CONFIG.TOPICS_DIR);
        console.log('  Today:', getTodayDate());
        console.log('  Files:');
        console.log('    MEMORY.md:', fs.existsSync(path.join(CONFIG.WORKSPACE, 'MEMORY.md')) ? '✅' : '❌');
        console.log('    Daily log:', fs.existsSync(path.join(CONFIG.WORKSPACE, 'memory', getTodayDate() + '.md')) ? '✅' : '❌');
        
        const memoryDir = path.join(CONFIG.WORKSPACE, 'memory');
        if (fs.existsSync(memoryDir)) {
          const files = fs.readdirSync(memoryDir).filter(f => f.endsWith('.md'));
          console.log('    Memory files:', files.length);
        }
        
        console.log('  OpenViking HTTP client:', openvikingClient ? '✅' : '❌');
      }
      else {
        console.log('OpenViking Store — хранение информации');
        console.log('');
        console.log('Usage:');
        console.log('  store daily <title> [content...] [--viking]     - сохранить в дневник дня');
        console.log('  store memory <section> [content...] [--viking]  - сохранить в MEMORY.md');
        console.log('  store topic <topic> <title> [content] [--viking] - сохранить в тематический файл');
        console.log('  store list                           - список тематических файлов');
        console.log('  store status                         - статус системы');
        console.log('');
        console.log('Options:');
        console.log('  --viking    Загрузить запись в OpenViking векторную базу');
        console.log('');
        console.log('Examples:');
        console.log('  store daily "Урок дня" "Изучил ollama"');
        console.log('  store daily "Урок дня" "Изучил ollama" --viking');
        console.log('  store memory "Уроки" "Текст > Мозг" --viking');
        console.log('  store topic projects "Проект X" "Описание проекта" --viking');
      }
    } catch (error) {
      console.error('Error:', error.message);
      process.exit(1);
    }
  }
  
  main();
}

module.exports = { storeInDailyLog, storeInMemory, storeInTopic, smartStore, uploadToOpenViking, CONFIG };
