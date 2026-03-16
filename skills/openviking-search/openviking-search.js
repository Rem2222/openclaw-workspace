#!/usr/bin/env node

/**
 * OpenViking Search — семантический поиск по контекстной базе знаний
 * 
 * ВЕРСИЯ 2.0: Прямой поиск по файлам workspace без зависимости от API
 * 
 * Поддерживает:
 * - Текстовый поиск (grep) по MEMORY.md и memory/*.md
 * - Семантический поиск через OpenViking (когда API будет готов)
 * - Возврат результатов с citation
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const CONFIG = {
  WORKSPACE: process.env.HOME + '/.openclaw/workspace',
  TOP_K: parseInt(process.env.OPENVIKING_TOP_K) || 10,
  CONTEXT_LINES: parseInt(process.env.OPENVIKING_CONTEXT) || 3,
};

/**
 * Основной поиск — комбинация текстового и семантического
 */
async function searchViking(query, options = {}) {
  const results = {
    query,
    count: 0,
    results: [],
    sources: new Set(),
  };
  
  // 1. Текстовый поиск (grep) — быстрый и надёжный
  const textResults = textualSearch(query, options);
  if (textResults.results.length > 0) {
    results.results.push(...textResults.results);
    textResults.results.forEach(r => results.sources.add(r.source));
  }
  
  // 2. Семантический поиск (когда OpenViking API будет готов)
  // const semanticResults = await semanticSearch(query, options);
  // results.results.push(...semanticResults.results);
  
  // Сортировка и тримминг
  results.results.sort((a, b) => b.score - a.score);
  results.results = results.results.slice(0, CONFIG.TOP_K);
  results.count = results.results.length;
  
  // Уникальные источники
  results.sources = Array.from(results.sources);
  
  return results;
}

/**
 * Текстовый поиск через grep с контекстом
 */
function textualSearch(query, options = {}) {
  const workspace = CONFIG.WORKSPACE;
  const queryTerms = query.toLowerCase().split(/\s+/).filter(t => t.length > 2);
  
  if (queryTerms.length === 0) {
    return { query, count: 0, results: [] };
  }
  
  const results = [];
  const processedLines = new Set();
  
  // Файлы для поиска
  const filesToSearch = [
    path.join(workspace, 'MEMORY.md'),
    ...fs.readdirSync(path.join(workspace, 'memory'))
      .filter(f => f.endsWith('.md'))
      .map(f => path.join(workspace, 'memory', f)),
  ].filter(f => fs.existsSync(f));
  
  for (const file of filesToSearch) {
    const content = fs.readFileSync(file, 'utf8');
    const lines = content.split('\n');
    const relativePath = path.relative(workspace, file);
    
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const lineLower = line.toLowerCase();
      
      // Проверка на совпадение
      const matchScore = calculateTextScore(lineLower, query.toLowerCase());
      
      if (matchScore > 0.3 && !processedLines.has(file + ':' + i)) {
        processedLines.add(file + ':' + i);
        
        // Сбор контекста
        const start = Math.max(0, i - CONFIG.CONTEXT_LINES);
        const end = Math.min(lines.length, i + CONFIG.CONTEXT_LINES + 1);
        const context = lines.slice(start, end).join('\n');
        
        results.push({
          rank: 0,
          score: Math.round(matchScore * 1000) / 1000,
          source: relativePath,
          line: i + 1,
          snippet: truncate(line, 200),
          context: truncate(context, 500),
          full: context,
          type: 'text',
        });
      }
    }
  }
  
  return {
    query,
    count: results.length,
    results,
    type: 'text_search',
  };
}

/**
 * Расчёт scores текстового совпадения
 */
function calculateTextScore(text, query) {
  const terms = query.split(/\s+/).filter(t => t.length > 2);
  if (terms.length === 0) return 0;
  
  let totalScore = 0;
  
  for (const term of terms) {
    const termLower = term.toLowerCase();
    
    // Точное совпадение — высокий вес
    if (text === termLower) {
      totalScore += 2.0;
    }
    // Совпадение в начале строки
    else if (text.startsWith(termLower)) {
      totalScore += 1.5;
    }
    // Содержит термин
    else if (text.includes(termLower)) {
      totalScore += 1.0;
    }
    // Частичное совпадение
    else {
      const partialScore = partialMatchScore(text, termLower);
      totalScore += partialScore;
    }
  }
  
  // Нормализация
    totalScore = Math.min(totalScore / terms.length, 2.0);
  
  return totalScore;
}

/**
 * Частичное совпадение (fuzzy)
 */
function partialMatchScore(text, term) {
  const textChars = text.split('');
  const termChars = term.split('');
  
  let matches = 0;
  let textIdx = 0;
  
  for (let tIdx = 0; tIdx < termChars.length && textIdx < textChars.length; tIdx++) {
    while (textIdx < textChars.length && textChars[textIdx] !== termChars[tIdx]) {
      textIdx++;
    }
    if (textIdx < textChars.length && textChars[textIdx] === termChars[tIdx]) {
      matches++;
      textIdx++;
    }
  }
  
  return matches / termChars.length;
}

/**
 * Семантический поиск через OpenViking API (заглушка)
 */
async function semanticSearch(query, options = {}) {
  // TODO: Интеграция с OpenViking API когда endpoint будет готов
  // Пока возвращает пустой результат
  return { query, count: 0, results: [], type: 'semantic' };
}

/**
 * Чтение файла
 */
function readFile(filePath) {
  const workspace = CONFIG.WORKSPACE;
  const fullPath = path.isAbsolute(filePath) ? filePath : path.join(workspace, filePath);
  
  if (!fs.existsSync(fullPath)) {
    throw new Error(`File not found: ${fullPath}`);
  }
  
  return fs.readFileSync(fullPath, 'utf8');
}

/**
 * Просмотр директории
 */
function browseDirectory(dirPath = '/') {
  const workspace = CONFIG.WORKSPACE;
  const fullPath = path.join(workspace, dirPath.replace(/^\\/,''));
  
  if (!fs.existsSync(fullPath)) {
    throw new Error(`Directory not found: ${fullPath}`);
  }
  
  const items = fs.readdirSync(fullPath, { withFileTypes: true });
  return items.map(item => ({
    name: item.name,
    type: item.isDirectory() ? 'directory' : 'file',
    path: path.join(dirPath, item.name),
  }));
}

/**
 * Утилиты
 */
function truncate(text, maxLen) {
  if (text.length <= maxLen) return text;
  return text.substring(0, maxLen - 3) + '...';
}

/**
 * Форматирование вывода для человека
 */
function formatResultsHuman(results) {
  if (results.count === 0) {
    return '❌ Ничего не найдено по запросу: ' + results.query;
  }
  
  const lines = [
    '',
    `🔍 Результаты поиска: "${results.query}"`,
    `   Найдено: ${results.count} совпадений`,
    `   Источники: ${results.sources.join(', ')}`,
    '',
  ];
  
  for (let i = 0; i < Math.min(results.results.length, 5); i++) {
    const r = results.results[i];
    lines.push(`  [${i + 1}] ${r.source}:${r.line} (score: ${r.score})`);
    lines.push(`      ${r.snippet}`);
    lines.push('');
  }
  
  if (results.results.length > 5) {
    lines.push(`  ... и ещё ${results.results.length - 5} результатов`);
  }
  
  return lines.join('\n');
}

/**
 * CLI
 */
if (require.main === module) {
  const command = process.argv[2] || 'search';
  const args = process.argv.slice(3);
  
  async function main() {
    try {
      if (command === 'search') {
        const query = args.join(' ');
        const results = await searchViking(query);
        
        if (process.env.HUMAN_READABLE) {
          console.log(formatResultsHuman(results));
        } else {
          console.log(JSON.stringify(results, null, 2));
        }
      } else if (command === 'read') {
        const filePath = args[0];
        const content = readFile(filePath);
        console.log(content);
      } else if (command === 'browse') {
        const dirPath = args[0] || '/';
        const items = browseDirectory(dirPath);
        console.log(JSON.stringify(items, null, 2));
      } else if (command === 'status') {
        console.log('OpenViking Search Status:');
        console.log('  Workspace:', CONFIG.WORKSPACE);
        console.log('  TOP_K:', CONFIG.TOP_K);
        console.log('  Context lines:', CONFIG.CONTEXT_LINES);
        console.log('  Files to search:');
        
        const memoryFiles = [
          path.join(CONFIG.WORKSPACE, 'MEMORY.md'),
          ...fs.readdirSync(path.join(CONFIG.WORKSPACE, 'memory'))
            .filter(f => f.endsWith('.md'))
            .map(f => path.join(CONFIG.WORKSPACE, 'memory', f)),
        ].filter(f => fs.existsSync(f));
        
        memoryFiles.forEach(f => console.log('    - ' + path.relative(CONFIG.WORKSPACE, f)));
        console.log('  Total files:', memoryFiles.length);
      } else {
        console.log('Usage:');
        console.log('  openviking-search search <query>     - текстовый поиск');
        console.log('  openviking-search read <file>        - чтение файла');
        console.log('  openviking-search browse <dir>       - просмотр директории');
        console.log('  openviking-search status             - проверка статуса');
        console.log('');
        console.log('Environment variables:');
        console.log('  OPENVIKING_TOP_K=10        - количество результатов');
        console.log('  OPENVIKING_CONTEXT=3       - строки контекста');
        console.log('  HUMAN_READABLE=1           - человеческий вывод');
      }
    } catch (error) {
      console.error('Error:', error.message);
      process.exit(1);
    }
  }
  
  main();
}

module.exports = { searchViking, readFile, browseDirectory, CONFIG, formatResultsHuman };
