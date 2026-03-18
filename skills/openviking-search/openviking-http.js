#!/usr/bin/env node
/**
 * OpenViking HTTP Client
 * 
 * A simple HTTP client for interacting with OpenViking vector search API.
 * Supports adding resources and searching for similar content.
 */

// === Configuration ===
const CONFIG = {
  HOST: process.env.OPENVIKING_HOST || 'localhost',
  PORT: process.env.OPENVIKING_PORT || 1933,
  SCHEME: process.env.OPENVIKING_SCHEME || 'http',
  SCORE_THRESHOLD: parseFloat(process.env.SCORE_THRESHOLD || '0.5'),
  MAX_RESULTS: parseInt(process.env.MAX_RESULTS || '10'),
};

const BASE_URL = `${CONFIG.SCHEME}://${CONFIG.HOST}:${CONFIG.PORT}`;

// === Logging ===
function log(message, level = 'info') {
  const prefix = {
    info: 'ℹ️',
    success: '✅',
    error: '❌',
    warn: '⚠️',
  }[level] || '•';
  
  console.log(`${prefix} ${message}`);
}

function logError(message) {
  console.error(`❌ Error: ${message}`);
}

// === HTTP Helpers ===

/**
 * Make a POST request with JSON body
 */
async function postJson(url, body = {}) {
  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  });
  
  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`HTTP ${response.status}: ${errorText}`);
  }
  
  return response.json();
}

/**
 * Make a GET request with query parameters
 */
async function getWithQuery(url, params = {}) {
  const urlObj = new URL(url);
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null) {
      urlObj.searchParams.append(key, value);
    }
  });
  
  const response = await fetch(urlObj.toString(), {
    method: 'GET',
  });
  
  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`HTTP ${response.status}: ${errorText}`);
  }
  
  return response.json();
}

// === OpenViking API Functions ===

/**
 * Add a resource to OpenViking
 * Can accept either a file path or raw content
 * 
 * @param {Object} options
 * @param {string} options.file - Path to file to upload
 * @param {string} options.content - Raw content string
 * @param {string} [options.title] - Optional title for the resource
 * @param {string} [options.description] - Optional description (used as reason)
 * @returns {Promise<{uri: string, title: string}>}
 */
async function addResource(options) {
  const { file, content, title, description } = options;
  
  if (!file && !content) {
    throw new Error('Must provide either file path or content');
  }
  
  let filePath = null;
  
  if (file) {
    // Use file path directly
    const fs = await import('fs');
    filePath = file.startsWith('~') ? file.replace('~', '/home/rem') : file;
    
    if (!fs.existsSync(filePath)) {
      throw new Error(`File not found: ${filePath}`);
    }
    
    log(`Adding file: ${filePath}`);
  } else {
    // Create temporary file for content
    const fs = await import('fs');
    const path = await import('path');
    const os = await import('os');
    
    const tempDir = os.tmpdir();
    const tempFile = path.join(tempDir, `openviking-temp-${Date.now()}.txt`);
    
    fs.writeFileSync(tempFile, content);
    filePath = tempFile;
    
    log(`Created temp file: ${tempFile}`);
  }
  
  // Build request body
  const requestBody = {
    path: filePath,
    reason: description || title || 'Added via HTTP client',
    wait: true,  // Wait for processing to complete
  };
  
  try {
    log(`Uploading to ${BASE_URL}/api/v1/resources...`);
    
    const result = await postJson(`${BASE_URL}/api/v1/resources`, requestBody);
    
    // Extract URI from response
    // Response format: {status: "ok", result: {root_uri: "viking://..."}}
    let uri = result.uri || result.resource_uri || result.root_uri;
    
    // Handle nested result format
    if (!uri && result.result) {
      uri = result.result.root_uri || result.result.uri || result.result.resource_uri;
    }
    
    if (!uri) {
      uri = `resource://${Date.now()}`;
    }
    
    log(`Resource added: ${uri}`);
    
    // Clean up temp file if created
    if (!file && content) {
      const fs = await import('fs');
      try {
        fs.unlinkSync(filePath);
      } catch (e) {
        // Ignore cleanup errors
      }
    }
    
    return {
      uri,
      title: result.title || options.title || 'Untitled',
      ...result,
    };
  } catch (error) {
    // Clean up temp file on error
    if (!file && content) {
      const fs = await import('fs');
      try {
        fs.unlinkSync(filePath);
      } catch (e) {
        // Ignore cleanup errors
      }
    }
    throw error;
  }
}

/**
 * Search for resources in OpenViking
 * 
 * @param {string} query - Search query text
 * @param {Object} [options] - Search options
 * @param {number} [options.limit] - Maximum results to return (default: 10)
 * @param {number} [options.scoreThreshold] - Minimum similarity score (default: 0.5)
 * @returns {Promise<Array>}
 */
async function search(query, options = {}) {
  const { 
    limit = CONFIG.MAX_RESULTS, 
    scoreThreshold = CONFIG.SCORE_THRESHOLD 
  } = options;
  
  if (!query) {
    throw new Error('Search query is required');
  }
  
  log(`Searching for: "${query}"`);
  
  const result = await postJson(`${BASE_URL}/api/v1/search/search`, {
    query,
    limit,
    score_threshold: scoreThreshold,
  });
  
  // Handle different response formats
  if (result.results) {
    return result.results;
  } else if (Array.isArray(result)) {
    return result;
  } else if (result.hits) {
    return result.hits;
  } else if (result.result && result.result.resources) {
    // OpenViking format: {result: {resources: [...], memories: [...]}}
    return [...(result.result.resources || []), ...(result.result.memories || [])];
  }
  
  return [];
}

/**
 * Find resources (semantic search without session)
 * 
 * @param {Object} options
 * @param {string} options.query - Search query text
 * @param {number} [options.limit] - Maximum results to return (default: 10)
 * @param {number} [options.scoreThreshold] - Minimum similarity score (default: 0.5)
 * @returns {Promise<Array>}
 */
async function find(options) {
  const { 
    query, 
    limit = CONFIG.MAX_RESULTS, 
    scoreThreshold = CONFIG.SCORE_THRESHOLD 
  } = options;
  
  if (!query) {
    throw new Error('Search query is required');
  }
  
  log(`Finding: "${query}"`);
  
  const result = await postJson(`${BASE_URL}/api/v1/search/find`, {
    query,
    limit,
    score_threshold: scoreThreshold,
  });
  
  // Handle different response formats
  if (result.results) {
    return result.results;
  } else if (Array.isArray(result)) {
    return result;
  } else if (result.hits) {
    return result.hits;
  }
  
  return [];
}

/**
 * List directory contents
 * 
 * @param {Object} options
 * @param {string} options.uri - Viking URI to list
 * @param {number} [options.limit] - Maximum nodes to list
 * @returns {Promise<Array>}
 */
async function listDirectory(options) {
  const { uri = 'viking://', limit = 100 } = options;
  
  const result = await getWithQuery(`${BASE_URL}/api/v1/fs/ls`, {
    uri,
    limit,
    output: 'agent',
  });
  
  return result.contents || result.files || [];
}

/**
 * Read file content
 * 
 * @param {Object} options
 * @param {string} options.uri - Viking URI to read
 * @param {number} [options.offset] - Starting line number (0-indexed)
 * @param {number} [options.limit] - Number of lines to read (-1 for all)
 * @returns {Promise<{content: string}>}
 */
async function readFile(options) {
  const { uri, offset = 0, limit = -1 } = options;
  
  const result = await getWithQuery(`${BASE_URL}/api/v1/content/read`, {
    uri,
    offset,
    limit,
  });
  
  return result;
}

/**
 * Format search results for display
 * 
 * @param {Array} results - Search results array
 * @param {Object} options
 * @param {boolean} options.verbose - Show more details
 * @returns {string}
 */
function formatResults(results, options = {}) {
  const { verbose = false } = options;
  
  if (!results || results.length === 0) {
    return 'No results found.';
  }
  
  const lines = [];
  lines.push(`\nFound ${results.length} result(s):\n`);
  lines.push('─'.repeat(60));
  
  results.forEach((result, index) => {
    // Extract fields from result
    const score = result.score ?? result.similarity ?? result.distance ?? 0;
    const uri = result.uri ?? result.id ?? result.url ?? 'unknown';
    const title = result.title ?? result.name ?? uri.split('/').pop();
    const snippet = result.snippet ?? result.content ?? result.text ?? '';
    const metadata = result.metadata ?? result.meta ?? {};
    
    // Result header
    lines.push(`\n[${index + 1}] Score: ${score.toFixed(4)}`);
    lines.push(`    Title: ${title}`);
    lines.push(`    URI: ${uri}`);
    
    // Snippet preview
    if (snippet) {
      const preview = snippet.length > 200 ? snippet.substring(0, 200) + '...' : snippet;
      lines.push(`    Snippet: ${preview}`);
    }
    
    // Additional metadata in verbose mode
    if (verbose && Object.keys(metadata).length > 0) {
      lines.push(`    Metadata: ${JSON.stringify(metadata)}`);
    }
    
    lines.push('─'.repeat(60));
  });
  
  return lines.join('\n');
}

// === CLI Interface ===

function showHelp() {
  console.log(`
OpenViking HTTP Client

Usage:
  node openviking-http.js <command> [options]

Commands:
  add <file>              Add a file to the vector database
  search <query>          Search for similar content
  find <query>            Find resources (without session)
  ls [uri]               List directory contents
  read <uri>             Read file content
  help                   Show this help message

Examples:
  node openviking-http.js add MEMORY.md
  node openviking-http.js search "ollama"
  node openviking-http.js find "weather" --limit 5
  node openviking-http.js ls viking://

Environment Variables:
  OPENVIKING_HOST       Server hostname (default: localhost)
  OPENVIKING_PORT       Server port (default: 1933)
  OPENVIKING_SCHEME     Protocol scheme (default: http)
  SCORE_THRESHOLD       Minimum similarity score (default: 0.5)
  MAX_RESULTS           Maximum results to return (default: 10)
`);
}

function parseArgs(args) {
  const result = {
    command: null,
    args: [],
    options: {},
  };
  
  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    
    if (arg.startsWith('--')) {
      const key = arg.slice(2);
      const value = args[i + 1] && !args[i + 1].startsWith('--') ? args[++i] : true;
      result.options[key] = value;
    } else if (!result.command) {
      result.command = arg;
    } else {
      result.args.push(arg);
    }
  }
  
  return result;
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  
  // Handle commands
  switch (args.command) {
    case 'help':
    case '--help':
    case '-h':
      showHelp();
      process.exit(0);
      break;
    
    case 'add': {
      const file = args.args[0];
      if (!file) {
        logError('File path required for add command');
        logError('Usage: node openviking-http.js add <file>');
        process.exit(1);
      }
      
      try {
        const result = await addResource({
          file,
          title: args.options.title,
          description: args.options.description,
        });
        log(`Success! Resource URI: ${result.uri}`);
        process.exit(0);
      } catch (error) {
        logError(error.message);
        process.exit(1);
      }
      break;
    }
    
    case 'search': {
      const query = args.args[0];
      if (!query) {
        logError('Search query required');
        logError('Usage: node openviking-http.js search <query>');
        process.exit(1);
      }
      
      try {
        const results = await search({
          query,
          limit: parseInt(args.options.limit) || CONFIG.MAX_RESULTS,
          scoreThreshold: parseFloat(args.options.score_threshold) || CONFIG.SCORE_THRESHOLD,
        });
        
        const formatted = formatResults(results, {
          verbose: args.options.verbose === true || args.options.verbose === 'true',
        });
        console.log(formatted);
        process.exit(0);
      } catch (error) {
        logError(error.message);
        process.exit(1);
      }
      break;
    }
    
    case 'find': {
      const query = args.args[0];
      if (!query) {
        logError('Search query required');
        logError('Usage: node openviking-http.js find <query>');
        process.exit(1);
      }
      
      try {
        const results = await find({
          query,
          limit: parseInt(args.options.limit) || CONFIG.MAX_RESULTS,
          scoreThreshold: parseFloat(args.options.score_threshold) || CONFIG.SCORE_THRESHOLD,
        });
        
        const formatted = formatResults(results, {
          verbose: args.options.verbose === true || args.options.verbose === 'true',
        });
        console.log(formatted);
        process.exit(0);
      } catch (error) {
        logError(error.message);
        process.exit(1);
      }
      break;
    }
    
    case 'ls': {
      const uri = args.args[0] || 'viking://';
      
      try {
        const contents = await listDirectory({
          uri,
          limit: parseInt(args.options.limit) || 100,
        });
        
        console.log(`Contents of ${uri}:`);
        contents.forEach(item => {
          const type = item.type === 'dir' ? '[D]' : '[F]';
          console.log(`  ${type} ${item.name || item.uri}`);
        });
        process.exit(0);
      } catch (error) {
        logError(error.message);
        process.exit(1);
      }
      break;
    }
    
    case 'read': {
      const uri = args.args[0];
      if (!uri) {
        logError('URI required for read command');
        logError('Usage: node openviking-http.js read <uri>');
        process.exit(1);
      }
      
      try {
        const result = await readFile({
          uri,
          offset: parseInt(args.options.offset) || 0,
          limit: args.options.limit ? parseInt(args.options.limit) : -1,
        });
        
        console.log(result.content || result.text || '');
        process.exit(0);
      } catch (error) {
        logError(error.message);
        process.exit(1);
      }
      break;
    }
    
    case null:
      logError('No command specified');
      showHelp();
      process.exit(1);
      break;
    
    default:
      logError(`Unknown command: ${args.command}`);
      showHelp();
      process.exit(1);
  }
}

// Export for module usage
if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    addResource,
    search,
    semanticSearch: search,  // Alias for semantic search
    find,
    listDirectory,
    readFile,
    formatResults,
    CONFIG,
  };
}

// Run CLI if executed directly
if (require.main === module) {
  main().catch(error => {
    logError(error.message);
    process.exit(1);
  });
}
