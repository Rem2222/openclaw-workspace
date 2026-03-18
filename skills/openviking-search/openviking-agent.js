#!/usr/bin/env node

/**
 * OpenViking Agent — обёртка для семантического поиска в OpenClaw
 * 
 * Вызывается через exec при паттернах:
 * - "вспомни"
 * - "что я говорил про"
 * - "из памяти"
 */

const { agentSearch } = require('./openviking-search');

async function main() {
  const args = process.argv.slice(2);
  
  if (args.length === 0) {
    console.error('Usage: openviking-agent <query>');
    process.exit(1);
  }
  
  const query = args.join(' ');
  const result = await agentSearch(query);
  
  console.log(result);
}

main().catch(error => {
  console.error('Error:', error.message);
  process.exit(1);
});
