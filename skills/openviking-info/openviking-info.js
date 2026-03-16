#!/usr/bin/env node

/**
 * OpenViking Info — просмотр структуры и статистики
 * 
 * Показывает:
 * - Структуру workspace
 * - Статистику файлов
 * - Последние изменения
 * - Обзор содержимого
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const CONFIG = {
  WORKSPACE: process.env.HOME + '/.openclaw/workspace',
  MAX_DEPTH: 3,
};

/**
 * Получить структуру workspace
 */
function getStructure(dir = CONFIG.WORKSPACE, depth = 0, prefix = '') {
  if (depth > CONFIG.MAX_DEPTH) return prefix + '...\n';
  
  let result = '';
  const dirName = path.basename(dir);
  
  if (depth === 0) {
    result += `${dirName}/\n`;
  }
  
  try {
    const items = fs.readdirSync(dir, { withFileTypes: true })
      .filter(item => !item.name.startsWith('.') && !item.name.startsWith('~'))
      .sort((a, b) => {
        // Директории сначала, затем файлы
        if (a.isDirectory() !== b.isDirectory()) {
          return a.isDirectory() ? -1 : 1;
        }
        return a.name.localeCompare(b.name);
      });
    
    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      const isLast = i === items.length - 1;
      const connector = isLast ? '└── ' : '├── ';
      const extension = isLast ? '    ' : '│   ';
      
      if (item.isDirectory()) {
        result += `${prefix}${connector}${item.name}/\n`;
        result += getStructure(path.join(dir, item.name), depth + 1, prefix + extension);
      } else {
        const size = fs.statSync(path.join(dir, item.name)).size;
        const sizeStr = formatSize(size);
        result += `${prefix}${connector}${item.name} (${sizeStr})\n`;
      }
    }
  } catch (error) {
    result += `${prefix}  (error reading directory)\n`;
  }
  
  return result;
}

/**
 * Статистика файлов
 */
function getStats() {
  const stats = {
    workspace: CONFIG.WORKSPACE,
    totalFiles: 0,
    totalSize: 0,
    directories: {
      root: { files: 0, size: 0 },
      memory: { files: 0, size: 0 },
      skills: { files: 0, size: 0 },
      other: { files: 0, size: 0 },
    },
    fileTypes: {},
    memoryFiles: [],
  };
  
  // Рекурсивный сбор статистики
  function scanDir(dir, category = 'root') {
    try {
      const items = fs.readdirSync(dir, { withFileTypes: true })
        .filter(item => !item.name.startsWith('.') && !item.name.startsWith('~'));
      
      for (const item of items) {
        const fullPath = path.join(dir, item.name);
        
        if (item.isDirectory()) {
          // Определяем категорию для поддиректории
          let subCategory = category;
          if (item.name === 'memory') subCategory = 'memory';
          else if (item.name === 'skills') subCategory = 'skills';
          else if (category === 'root') subCategory = 'other';
          
          scanDir(fullPath, subCategory);
        } else {
          const stat = fs.statSync(fullPath);
          stats.totalFiles++;
          stats.totalSize += stat.size;
          
          // Статистика по категориям
          if (stats.directories[category]) {
            stats.directories[category].files++;
            stats.directories[category].size += stat.size;
          }
          
          // Статистика по типам файлов
          const ext = path.extname(item.name) || '(no ext)';
          if (!stats.fileTypes[ext]) stats.fileTypes[ext] = { count: 0, size: 0 };
          stats.fileTypes[ext].count++;
          stats.fileTypes[ext].size += stat.size;
          
          // Memory файлы
          if (category === 'memory' && item.name.endsWith('.md')) {
            stats.memoryFiles.push({
              name: item.name,
              size: stat.size,
              modified: stat.mtime,
            });
          }
        }
      }
    } catch (error) {
      // Ignore errors
    }
  }
  
  scanDir(CONFIG.WORKSPACE);
  
  // Сортировка memory файлов по дате
  stats.memoryFiles.sort((a, b) => b.modified - a.modified);
  
  return stats;
}

/**
 * Последние изменения
 */
function getRecentChanges(limit = 10) {
  const memoryDir = path.join(CONFIG.WORKSPACE, 'memory');
  
  if (!fs.existsSync(memoryDir)) {
    return { files: [], error: 'Memory directory not found' };
  }
  
  const files = fs.readdirSync(memoryDir)
    .filter(f => f.endsWith('.md'))
    .map(f => ({
      name: f,
      path: path.join(memoryDir, f),
      ...fs.statSync(path.join(memoryDir, f)),
    }))
    .sort((a, b) => b.mtime - a.mtime)
    .slice(0, limit)
    .map(f => ({
      name: f.name,
      size: formatSize(f.size),
      modified: f.mtime.toLocaleString('ru-RU'),
      lines: countLines(f.path),
    }));
  
  return { files };
}

/**
 * Обзор MEMORY.md
 */
function getMemoryOverview() {
  const memoryPath = path.join(CONFIG.WORKSPACE, 'MEMORY.md');
  
  if (!fs.existsSync(memoryPath)) {
    return { error: 'MEMORY.md not found' };
  }
  
  const content = fs.readFileSync(memoryPath, 'utf8');
  const lines = content.split('\n');
  
  // Извлечение секций
  const sections = [];
  let currentSection = null;
  
  for (const line of lines) {
    if (line.startsWith('## ')) {
      if (currentSection) {
        sections.push(currentSection);
      }
      currentSection = {
        title: line.replace('## ', ''),
        lines: 0,
        subsections: 0,
      };
    } else if (line.startsWith('### ') && currentSection) {
      currentSection.subsections++;
    }
    if (currentSection) {
      currentSection.lines++;
    }
  }
  
  if (currentSection) {
    sections.push(currentSection);
  }
  
  return {
    path: 'MEMORY.md',
    totalLines: lines.length,
    totalSize: formatSize(fs.statSync(memoryPath).size),
    sections,
  };
}

/**
 * Утилиты
 */
function formatSize(bytes) {
  if (bytes < 1024) return bytes + ' B';
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
  return (bytes / (1024 * 1024)).toFixed(2) + ' MB';
}

function countLines(filePath) {
  try {
    const content = fs.readFileSync(filePath, 'utf8');
    return content.split('\n').length;
  } catch {
    return 0;
  }
}

/**
 * Форматирование вывода
 */
function formatStats(stats) {
  const lines = [
    '',
    '📊 Статистика workspace:',
    `   Путь: ${stats.workspace}`,
    `   Файлов: ${stats.totalFiles}`,
    `   Размер: ${formatSize(stats.totalSize)}`,
    '',
    '   По директориям:',
  ];
  
  for (const [name, data] of Object.entries(stats.directories)) {
    if (data.files > 0) {
      lines.push(`     ${name}: ${data.files} файлов, ${formatSize(data.size)}`);
    }
  }
  
  lines.push('');
  lines.push('   По типам файлов:');
  
  const sortedTypes = Object.entries(stats.fileTypes)
    .sort((a, b) => b[1].count - a[1].count)
    .slice(0, 10);
  
  for (const [ext, data] of sortedTypes) {
    lines.push(`     ${ext}: ${data.count} файлов, ${formatSize(data.size)}`);
  }
  
  return lines.join('\n');
}

function formatRecentChanges(changes) {
  if (changes.error) {
    return '❌ Ошибка: ' + changes.error;
  }
  
  const lines = [
    '',
    '🕐 Последние изменения:',
  ];
  
  for (const file of changes.files) {
    lines.push(`  - ${file.name} (${file.size}, ${file.lines} строк)`);
    lines.push(`    Изменено: ${file.modified}`);
  }
  
  return lines.join('\n');
}

function formatMemoryOverview(overview) {
  if (overview.error) {
    return '❌ Ошибка: ' + overview.error;
  }
  
  const lines = [
    '',
    '📖 Обзор MEMORY.md:',
    `   Размер: ${overview.totalSize} (${overview.totalLines} строк)`,
    `   Секций: ${overview.sections.length}`,
    '',
  ];
  
  for (const section of overview.sections) {
    lines.push(`  • ${section.title}`);
    lines.push(`    ${section.lines} строк, ${section.subsections} подсеций`);
  }
  
  return lines.join('\n');
}

/**
 * CLI
 */
if (require.main === module) {
  const command = process.argv[2] || 'help';
  const args = process.argv.slice(3);
  
  function main() {
    try {
      if (command === 'structure' || command === 'tree') {
        // Структура workspace
        const dir = args[0] || CONFIG.WORKSPACE;
        console.log(getStructure(dir));
      }
      else if (command === 'stats' || command === 'statistics') {
        // Статистика
        const stats = getStats();
        if (process.env.JSON_OUTPUT) {
          console.log(JSON.stringify(stats, null, 2));
        } else {
          console.log(formatStats(stats));
        }
      }
      else if (command === 'recent' || command === 'changes') {
        // Последние изменения
        const limit = parseInt(args[0]) || 10;
        const changes = getRecentChanges(limit);
        if (process.env.JSON_OUTPUT) {
          console.log(JSON.stringify(changes, null, 2));
        } else {
          console.log(formatRecentChanges(changes));
        }
      }
      else if (command === 'memory' || command === 'overview') {
        // Обзор MEMORY.md
        const overview = getMemoryOverview();
        if (process.env.JSON_OUTPUT) {
          console.log(JSON.stringify(overview, null, 2));
        } else {
          console.log(formatMemoryOverview(overview));
        }
      }
      else if (command === 'all') {
        // Полный отчёт
        console.log('='.repeat(60));
        console.log('OPENVIKING INFO — Полный отчёт');
        console.log('='.repeat(60));
        console.log(getStructure(CONFIG.WORKSPACE, 0, '', 2));
        console.log('');
        console.log(formatStats(getStats()));
        console.log('');
        console.log(formatRecentChanges(getRecentChanges(5)));
        console.log('');
        console.log(formatMemoryOverview(getMemoryOverview()));
      }
      else {
        console.log('OpenViking Info — просмотр структуры и статистики');
        console.log('');
        console.log('Usage:');
        console.log('  info structure [dir]   - структура workspace (дерево)');
        console.log('  info stats             - статистика файлов');
        console.log('  info recent [limit]    - последние изменения');
        console.log('  info memory            - обзор MEMORY.md');
        console.log('  info all               - полный отчёт');
        console.log('');
        console.log('Environment variables:');
        console.log('  JSON_OUTPUT=1          - вывод в JSON формате');
        console.log('');
        console.log('Examples:');
        console.log('  info structure         - показать структуру workspace');
        console.log('  info stats             - показать статистику');
        console.log('  info recent 5          - 5 последних изменений');
        console.log('  info memory            - обзор MEMORY.md');
      }
    } catch (error) {
      console.error('Error:', error.message);
      process.exit(1);
    }
  }
  
  main();
}

module.exports = { getStructure, getStats, getRecentChanges, getMemoryOverview, CONFIG };
