#!/usr/bin/env node

/**
 * OpenViking Search — семантический поиск по контекстной базе знаний
 * 
 * ВЕРСИЯ 3.0: Интеграция с OpenViking HTTP API
 * 
 * Поддерживает:
 * - Текстовый поиск (grep) по MEMORY.md и memory/*.md
 * - Семантический поиск через OpenViking HTTP API
 * - Комбинированный поиск (текстовый + семантический)
 * - Возврат результатов с citation
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

// Import HTTP client for semantic search
const httpClient = require('./openviking-http');

const CONFIG = {
  WORKSPACE: process.env.HOME + '/.openclaw/workspace',
  TOP_K: parseInt(process.env.OPENVIKING_TOP_K) || 10,
  CONTEXT_LINES: parseInt(process.env.OPENVIKING_CONTEXT) || 3,
};

/**
 * Режим AGENT — для интеграции с OpenClaw
 * Возвращает отформатированную строку для вывода пользователю
 */
async function agentSearch(query, options = {}) {
  const limit = options.limit || 5;
  
  // Семантический поиск
  const results = await httpClient.search(query, { limit });
  
  if (!results || results.length === 0) {
    return '❌ Ничего не найдено в памяти по запросу: ' + query;
  }
  
  const lines = [
    '',
    `🔍 Из памяти:`,
  ];
  
  for (let i = 0; i < results.length; i++) {
    const r = results[i];
    const type = r.context_type === 'memory' ? '🧠' : '📄';
    const num = i + 1;
    const uri = r.uri.replace('viking://resources/', '').replace('viking://agent/', '');
    
    lines.push(``);
    lines.push(`[${num}] ${type} ${uri}`);
    
    if (r.abstract) {
      const abstract = r.abstract.length > 150 ? r.abstract.substring(0, 147) + '...' : r.abstract;
      lines.push(`    ${abstract}`);
    }
  }
  
  return lines.join('\n');
}

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
    results.results.push(...textResults.results.map(r => ({ ...r, source_type: 'text' })));
    textResults.results.forEach(r => results.sources.add(r.source));
  }
  
  // 2. Семантический поиск через OpenViking HTTP API
  try {
    const semanticResults = await httpClient.semanticSearch(query, { limit: CONFIG.TOP_K });
    if (semanticResults.results && semanticResults.results.length > 0) {
      results.results.push(...semanticResults.results.map(r => ({ 
        ...r, 
        source_type: 'semantic',
        score: r.score || 1.0 
      })));
      semanticResults.results.forEach(r => results.sources.add(r.uri || 'semantic'));
    }
  } catch (error) {
    console.error('Semantic search failed:', error.message);
  }
  
  // Сортировка и тримминг
  results.results.sort((a, b) => b.score - a.score);
  results.results = results.results.slice(0, CONFIG.TOP_K);
  results.count = results.results.length;
  
  // Уникальные источники
  results.sources = Array.from(results.sources);
  
  return results;
}

/**
 * Только семантический поиск
 */
async function semanticOnly(query, options = {}) {
  try {
    return await httpClient.semanticSearch(query, { limit: CONFIG.TOP_K });
  } catch (error) {
    console.error('Semantic search failed:', error.message);
    return { query, count: 0, results: [] };
  }
}

/**
 * Только текстовый поиск
 */
function textOnly(query, options = {}) {
  return textualSearch(query, options);
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
 * Семантический поиск через OpenViking HTTP API
 */
async function semanticSearch(query, options = {}) {
  return await httpClient.semanticSearch(query, options);
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
  // Handle array format (raw semantic search results)
  if (Array.isArray(results)) {
    if (results.length === 0) {
      return '❌ Ничего не найдено';
    }
    
    const lines = [
      '',
      `🔍 Найдено: ${results.length} результатов (semantic)`,
      '',
    ];
    
    for (let i = 0; i < Math.min(results.length, 5); i++) {
      const r = results[i];
      const type = r.context_type === 'memory' ? '🧠' : '📄';
      const scoreStr = r.score ? ` (score: ${r.score.toFixed(3)})` : '';
      lines.push(`  ${type} ${r.uri}${scoreStr}`);
      if (r.abstract) {
        const abstract = r.abstract.length > 120 ? r.abstract.substring(0, 117) + '...' : r.abstract;
        lines.push(`     ${abstract}`);
      }
      lines.push('');
    }
    
    if (results.length > 5) {
      lines.push(`  ... и ещё ${results.length - 5} результатов`);
    }
    
    return lines.join('\n');
  }
  
  // Handle object format (combined/text search results)
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
 * Parse CLI arguments
 */
function parseArgs(args) {
  const result = {
    query: '',
    flags: {},
  };
  
  for (const arg of args) {
    if (arg.startsWith('--')) {
      const key = arg.slice(2);
      result.flags[key] = true;
    } else {
      result.query += (result.query ? ' ' : '') + arg;
    }
  }
  
  return result;
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
        const parsed = parseArgs(args);
        const query = parsed.query;
        
        if (!query) {
          console.error('Error: Query is required');
          console.error('Usage: openviking-search search <query> [--semantic]');
          process.exit(1);
        }
        
        let results;
        
        // Режим поиска определяется флагом --semantic
        if (parsed.flags.semantic) {
          // Только семантический поиск
          results = await semanticOnly(query);
        } else {
          // Комбинированный поиск (текст + семантика)
          results = await searchViking(query);
        }
        
        if (process.env.HUMAN_READABLE) {
          console.log(formatResultsHuman(results));
        } else {
          console.log(JSON.stringify(results, null, 2));
        }
      } else if (command === 'semantic') {
        const query = args.join(' ');
        const results = await semanticOnly(query);
        console.log(JSON.stringify(results, null, 2));
      } else if (command === 'text') {
        const query = args.join(' ');
        const results = textOnly(query);
        
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
        console.log('  openviking-search search <query>        - комбинированный поиск (текст + семантика)');
        console.log('  openviking-search search <query> --semantic  - только семантический поиск');
        console.log('  openviking-search semantic <query>      - только семантический поиск');
        console.log('  openviking-search text <query>          - только текстовый поиск');
        console.log('  openviking-search read <file>           - чтение файла');
        console.log('  openviking-search browse <dir>          - просмотр директории');
        console.log('  openviking-search status                - проверка статуса');
        console.log('');
        console.log('Environment variables:');
        console.log('  OPENVIKING_TOP_K=10        - количество результатов');
        console.log('  OPENVIKING_CONTEXT=3       - строки контекста');
        console.log('  HUMAN_READABLE=1           - человеческий вывод');
        console.log('  OPENVIKING_HOST=localhost   - хост OpenViking');
        console.log('  OPENVIKING_PORT=8000        - порт OpenViking');
      }
    } catch (error) {
      console.error('Error:', error.message);
      process.exit(1);
    }
  }
  
  main();
}

module.exports = { searchViking, semanticOnly, textOnly, agentSearch, readFile, browseDirectory, CONFIG, formatResultsHuman };
