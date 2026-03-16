#!/usr/bin/env node

/**
 * OpenViking Store — хранение информации в контекстной базе
 * 
 * Поддерживает:
 * - Сохранение в дневник дня
 * - Сохранение в долгосрочную память (MEMORY.md)
 * - Создание тематических файлов
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

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
      const sectionMatch = fileContent.match(new RegExp(`(## ${section}[\\s\\S]*?)(?=## |$)`, 'm'));
      
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
  const command = process.argv[2] || 'help';
  const args = process.argv.slice(3);
  
  function main() {
    try {
      if (command === 'daily') {
        // Сохранение в дневник дня
        const title = args[0] || 'Без названия';
        const content = args.slice(1).join(' ') || '(пусто)';
        const result = storeInDailyLog(title, content);
        console.log('Сохранено в дневник:');
        console.log(JSON.stringify(result, null, 2));
      }
      else if (command === 'memory') {
        // Сохранение в MEMORY.md
        const section = args[0] || 'Разное';
        const content = args.slice(1).join(' ');
        const result = storeInMemory(section, content);
        console.log('Сохранено в MEMORY.md:');
        console.log(JSON.stringify(result, null, 2));
      }
      else if (command === 'topic') {
        // Сохранение в тематический файл
        const topic = args[0] || 'untitled';
        const title = args[1] || 'Запись';
        const content = args.slice(2).join(' ');
        const result = storeInTopic(topic, title, content);
        console.log('Сохранено в тематический файл:');
        console.log(JSON.stringify(result, null, 2));
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
      }
      else {
        console.log('OpenViking Store — хранение информации');
        console.log('');
        console.log('Usage:');
        console.log('  store daily <title> [content...]     - сохранить в дневник дня');
        console.log('  store memory <section> [content...]  - сохранить в MEMORY.md');
        console.log('  store topic <topic> <title> [content] - сохранить в тематический файл');
        console.log('  store list                           - список тематических файлов');
        console.log('  store status                         - статус системы');
        console.log('');
        console.log('Examples:');
        console.log('  store daily "Урок дня" "Изучил ollama"');
        console.log('  store memory "Уроки" "Текст > Мозг"');
        console.log('  store topic projects "Проект X" "Описание проекта"');
      }
    } catch (error) {
      console.error('Error:', error.message);
      process.exit(1);
    }
  }
  
  main();
}

module.exports = { storeInDailyLog, storeInMemory, storeInTopic, smartStore, CONFIG };
