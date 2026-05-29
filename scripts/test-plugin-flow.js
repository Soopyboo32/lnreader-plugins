#!/usr/bin/env node

import fs from 'fs';
import path from 'path';
import { createRequire } from 'module';
import { fileURLToPath } from 'url';

const requireFromScript = createRequire(import.meta.url);
const { parse: parseProto } = requireFromScript('protobufjs');

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT_DIR = path.resolve(__dirname, '..');
const SOURCE_PLUGIN_DIR = path.join(ROOT_DIR, 'plugins');
const COMPILED_PLUGIN_DIR = path.join(ROOT_DIR, '.js', 'plugins');

const DEFAULT_FETCH_HEADERS = {
  Accept: '*/*',
  'Accept-Language': '*',
  'User-Agent':
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
};

const NovelStatus = {
  Unknown: 'Unknown',
  Ongoing: 'Ongoing',
  Completed: 'Completed',
  Licensed: 'Licensed',
  PublishingFinished: 'Publishing Finished',
  Cancelled: 'Cancelled',
  OnHiatus: 'On Hiatus',
};

const defaultCover =
  'https://github.com/LNReader/lnreader-plugins/blob/main/icons/src/coverNotAvailable.jpg?raw=true';

const FilterTypes = {
  TextInput: 'Text',
  Picker: 'Picker',
  CheckboxGroup: 'Checkbox',
  Switch: 'Switch',
  ExcludableCheckboxGroup: 'XCheckbox',
};

class MemoryStorage {
  constructor() {
    this.db = {};
  }

  set(key, value, expires) {
    this.db[key] = {
      created: new Date(),
      value,
      expires: expires instanceof Date ? expires.getTime() : expires,
    };
  }

  get(key, raw = false) {
    const item = this.db[key];
    if (item?.expires && Date.now() > item.expires) {
      this.delete(key);
      return undefined;
    }
    return raw ? item : item?.value;
  }

  getAllKeys() {
    return Object.keys(this.db);
  }

  delete(key) {
    delete this.db[key];
  }

  clearAll() {
    this.db = {};
  }
}

class BrowserStorage {
  constructor() {
    this.db = {};
  }

  get() {
    return this.db;
  }
}

const storage = new MemoryStorage();
const localStorage = new BrowserStorage();
const sessionStorage = new BrowserStorage();
const moduleCache = new Map();

function isUrlAbsolute(url) {
  if (url) {
    if (url.indexOf('//') === 0) return true;
    if (url.indexOf('://') === -1) return false;
    if (url.indexOf('.') === -1) return false;
    if (url.indexOf('/') === -1) return false;
    if (url.indexOf(':') > url.indexOf('/')) return false;
    if (url.indexOf('://') < url.indexOf('.')) return true;
  }
  return false;
}

function normalizeHeaders(headers) {
  const normalized = {};
  if (headers instanceof Headers) {
    headers.forEach((value, name) => {
      normalized[name] = value;
    });
    return normalized;
  }

  if (!headers) return normalized;

  Object.entries(headers).forEach(([name, value]) => {
    if (value !== undefined) normalized[name] = String(value);
  });
  return normalized;
}

async function makeFetchInit(init = {}) {
  return {
    ...init,
    headers: {
      ...DEFAULT_FETCH_HEADERS,
      ...normalizeHeaders(init.headers),
    },
  };
}

async function fetchApi(url, init) {
  return fetch(url, await makeFetchInit(init));
}

async function fetchText(url, init, encoding = 'utf-8') {
  const res = await fetchApi(url, init);
  if (!res.ok) return '';
  const arrayBuffer = await res.arrayBuffer();
  return new TextDecoder(encoding).decode(arrayBuffer);
}

async function fetchFile(url, init) {
  try {
    const res = await fetchApi(url, init);
    if (!res.ok) return '';
    const arrayBuffer = await res.arrayBuffer();
    return Buffer.from(arrayBuffer).toString('base64');
  } catch {
    return '';
  }
}

const BYTE_MARK = BigInt((1 << 8) - 1);

async function fetchProto(protoInit, url, init) {
  const protoRoot = parseProto(protoInit.proto).root;
  const RequestMessage = protoRoot.lookupType(protoInit.requestType);
  const verifyError = RequestMessage.verify(protoInit.requestData || {});
  if (verifyError) throw new Error(`Invalid Proto: ${verifyError}`);

  const encodedRequest = RequestMessage.encode(
    protoInit.requestData || {},
  ).finish();
  const requestLength = BigInt(encodedRequest.length);
  const headers = new Uint8Array(
    Array(5)
      .fill(0)
      .map((_, index) => {
        if (index === 0) return 0;
        return Number(
          (requestLength >> BigInt(8 * (5 - index - 1))) & BYTE_MARK,
        );
      }),
  );
  const bodyArray = new Uint8Array(headers.length + encodedRequest.length);
  bodyArray.set(headers, 0);
  bodyArray.set(encodedRequest, headers.length);

  const res = await fetch(url, {
    ...(await makeFetchInit(init)),
    method: 'POST',
    body: bodyArray,
  });
  const payload = new Uint8Array(await res.arrayBuffer());
  const length = Number(
    BigInt(payload[1] << 24) |
      BigInt(payload[2] << 16) |
      BigInt(payload[3] << 8) |
      BigInt(payload[4]),
  );
  const ResponseMessage = protoRoot.lookupType(protoInit.responseType);
  return ResponseMessage.decode(payload.slice(5, 5 + length));
}

const aliasModules = {
  '@/types/constants': { NovelStatus, defaultCover },
  '@libs/defaultCover': { defaultCover },
  '@libs/fetch': { fetchApi, fetchText, fetchFile, fetchProto },
  '@libs/filterInputs': { FilterTypes },
  '@libs/isAbsoluteUrl': { isUrlAbsolute },
  '@libs/novelStatus': { NovelStatus },
  '@libs/storage': { storage, localStorage, sessionStorage },
};

function ensureJsFile(filePath) {
  if (fs.existsSync(filePath) && fs.statSync(filePath).isFile()) {
    return filePath;
  }

  if (!filePath.endsWith('.js')) {
    const withJs = `${filePath}.js`;
    if (fs.existsSync(withJs) && fs.statSync(withJs).isFile()) {
      return withJs;
    }
  }

  const indexFile = path.join(filePath, 'index.js');
  if (fs.existsSync(indexFile) && fs.statSync(indexFile).isFile()) {
    return indexFile;
  }

  throw new Error(`Cannot resolve compiled module: ${filePath}`);
}

function loadCompiledModule(filePath) {
  const resolvedPath = ensureJsFile(filePath);
  const cached = moduleCache.get(resolvedPath);
  if (cached) return cached.exports;

  const code = fs.readFileSync(resolvedPath, 'utf-8');
  const module = { exports: {} };
  moduleCache.set(resolvedPath, module);

  const localRequire = specifier =>
    requireCompiled(specifier, path.dirname(resolvedPath));
  const runModule = new Function('require', 'module', 'exports', code);
  runModule(localRequire, module, module.exports);
  return module.exports;
}

function requireCompiled(specifier, fromDir) {
  if (aliasModules[specifier]) {
    return aliasModules[specifier];
  }

  if (specifier.startsWith('@plugins/')) {
    return loadCompiledModule(
      path.join(COMPILED_PLUGIN_DIR, specifier.slice('@plugins/'.length)),
    );
  }

  if (specifier.startsWith('./') || specifier.startsWith('../')) {
    return loadCompiledModule(path.resolve(fromDir, specifier));
  }

  return requireFromScript(specifier);
}

function findSourcePluginFiles(dir = SOURCE_PLUGIN_DIR) {
  const files = [];
  if (!fs.existsSync(dir)) return files;

  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const entryPath = path.join(dir, entry.name);
    const relative = path.relative(SOURCE_PLUGIN_DIR, entryPath);

    if (entry.isDirectory()) {
      if (relative === 'multisrc') continue;
      files.push(...findSourcePluginFiles(entryPath));
      continue;
    }

    if (
      entry.isFile() &&
      entry.name.endsWith('.ts') &&
      !entry.name.endsWith('.broken.ts') &&
      relative !== 'index.ts'
    ) {
      files.push(entryPath);
    }
  }

  return files;
}

function getCompiledPathForSource(sourcePath) {
  const relative = path.relative(SOURCE_PLUGIN_DIR, sourcePath);
  return path.join(COMPILED_PLUGIN_DIR, relative.replace(/\.ts$/, '.js'));
}

function getDefaultFilterValues(filters) {
  if (!filters) return {};

  return Object.fromEntries(
    Object.entries(filters).map(([key, filter]) => [
      key,
      {
        type: filter.type,
        value: structuredClone(filter.value),
      },
    ]),
  );
}

function parseIntegerOption(value, fallback) {
  const parsed = Number.parseInt(value, 10);
  return Number.isInteger(parsed) && parsed >= 0 ? parsed : fallback;
}

function parseArgs(argv) {
  const options = {
    mode: 'both',
    novelIndex: 0,
    chapterIndex: 0,
    list: false,
    help: false,
  };
  const positional = [];

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];

    switch (arg) {
      case '--help':
      case '-h':
        options.help = true;
        break;
      case '--list':
        options.list = true;
        break;
      case '--latest':
        options.mode = 'latest';
        break;
      case '--popular':
        options.mode = 'popular';
        break;
      case '--mode':
        options.mode = argv[index + 1] || options.mode;
        index += 1;
        break;
      case '--novel-index':
        options.novelIndex = parseIntegerOption(
          argv[index + 1],
          options.novelIndex,
        );
        index += 1;
        break;
      case '--chapter-index':
        options.chapterIndex = parseIntegerOption(
          argv[index + 1],
          options.chapterIndex,
        );
        index += 1;
        break;
      default:
        if (arg.startsWith('--')) {
          throw new Error(`Unknown option: ${arg}`);
        }
        positional.push(arg);
        break;
    }
  }

  if (!['latest', 'popular', 'both'].includes(options.mode)) {
    throw new Error('--mode must be one of: latest, popular, both');
  }

  return { options, pluginQuery: positional[0] };
}

function usage() {
  return `Usage:
  npm run test:plugin -- <plugin-id-or-name> [--mode latest|popular|both] [--novel-index 0] [--chapter-index 0]
  npm run test:plugin -- --list

Examples:
  npm run test:plugin -- novelhall
  npm run test:plugin -- novelhall --mode latest --chapter-index 3`;
}

function normalizeQuery(value) {
  return value.toLowerCase().replace(/\\/g, '/').replace(/\.ts$/, '');
}

function getPluginFromModule(moduleExports) {
  return moduleExports?.default || moduleExports;
}

function pluginMatches(plugin, sourcePath, query) {
  const normalizedQuery = normalizeQuery(query);
  const relativeSource = normalizeQuery(
    path.relative(SOURCE_PLUGIN_DIR, sourcePath),
  );
  return (
    plugin.id?.toLowerCase() === normalizedQuery ||
    plugin.name?.toLowerCase() === normalizedQuery ||
    relativeSource === normalizedQuery ||
    relativeSource.endsWith(`/${normalizedQuery}`)
  );
}

async function loadPlugins() {
  const sourceFiles = findSourcePluginFiles();
  const plugins = [];
  const failures = [];

  for (const sourcePath of sourceFiles) {
    const compiledPath = getCompiledPathForSource(sourcePath);
    if (!fs.existsSync(compiledPath)) continue;

    try {
      const plugin = getPluginFromModule(loadCompiledModule(compiledPath));
      if (plugin?.id && plugin?.name) {
        plugins.push({ plugin, sourcePath, compiledPath });
      }
    } catch (error) {
      failures.push({
        sourcePath,
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }

  return { plugins, failures };
}

async function resolvePlugin(query) {
  const { plugins, failures } = await loadPlugins();
  const match = plugins.find(({ plugin, sourcePath }) =>
    pluginMatches(plugin, sourcePath, query),
  );

  if (!match) {
    const loadedIds = plugins
      .map(({ plugin }) => `${plugin.id} (${plugin.name})`)
      .sort((a, b) => a.localeCompare(b))
      .slice(0, 30)
      .join('\n  ');
    const failureText =
      failures.length > 0
        ? `\n\nSkipped ${failures.length} compiled plugin(s) that failed to load.`
        : '';

    throw new Error(
      `Plugin not found: ${query}\n\nFirst available plugins:\n  ${loadedIds}${failureText}`,
    );
  }

  return match;
}

function printJson(label, value) {
  console.log(`\n=== ${label} ===`);
  console.log(JSON.stringify(value, null, 2));
}

function uniqueNovelItems(items) {
  const seen = new Set();
  return items.filter(item => {
    if (!item?.path || seen.has(item.path)) return false;
    seen.add(item.path);
    return true;
  });
}

async function fetchNovelPages(plugin, mode) {
  const filters = getDefaultFilterValues(plugin.filters);
  const modes = mode === 'both' ? ['latest', 'popular'] : [mode];
  const pages = [];

  for (const currentMode of modes) {
    const showLatestNovels = currentMode === 'latest';
    for (const pageNo of [1, 2]) {
      const novels = await plugin.popularNovels(pageNo, {
        filters,
        showLatestNovels,
      });
      printJson(`${currentMode} novels page ${pageNo}`, novels);
      pages.push({ mode: currentMode, pageNo, novels });
    }
  }

  return pages;
}

async function getChapters(plugin, novelPath, sourceNovel) {
  if (sourceNovel.chapters?.length) {
    return sourceNovel.chapters;
  }

  if (sourceNovel.totalPages && typeof plugin.parsePage === 'function') {
    const page = await plugin.parsePage(novelPath, '1');
    printJson('novel chapters page 1', page);
    return page.chapters || [];
  }

  return [];
}

async function runFlow(plugin, options) {
  console.log(`Testing ${plugin.name} (${plugin.id})`);
  console.log(`Site: ${plugin.site || 'N/A'}`);

  const pages = await fetchNovelPages(plugin, options.mode);
  const candidates = uniqueNovelItems(pages.flatMap(page => page.novels || []));
  if (candidates.length === 0) {
    throw new Error('No novels were returned from page 1 or page 2.');
  }

  const selectedNovel = candidates[options.novelIndex] || candidates[0];
  printJson('selected novel', selectedNovel);

  const sourceNovel = await plugin.parseNovel(selectedNovel.path);
  printJson('novel details', sourceNovel);

  const chapters = await getChapters(plugin, selectedNovel.path, sourceNovel);
  if (chapters.length === 0) {
    throw new Error(`No chapters were returned for ${selectedNovel.path}.`);
  }

  const selectedChapter = chapters[options.chapterIndex] || chapters[0];
  printJson('selected chapter', selectedChapter);

  const chapterText = await plugin.parseChapter(selectedChapter.path);
  console.log(`\n=== chapter contents (${chapterText.length} characters) ===`);
  console.log(chapterText);
}

async function listPlugins() {
  const { plugins, failures } = await loadPlugins();
  plugins
    .map(({ plugin }) => `${plugin.id.padEnd(28)} ${plugin.name}`)
    .sort((a, b) => a.localeCompare(b))
    .forEach(line => console.log(line));

  if (failures.length > 0) {
    console.error(
      `\nSkipped ${failures.length} compiled plugin(s) that failed to load.`,
    );
  }
}

async function main() {
  const { options, pluginQuery } = parseArgs(process.argv.slice(2));

  if (options.help) {
    console.log(usage());
    return;
  }

  if (options.list) {
    await listPlugins();
    return;
  }

  if (!pluginQuery) {
    console.error(usage());
    process.exitCode = 1;
    return;
  }

  const { plugin } = await resolvePlugin(pluginQuery);
  await runFlow(plugin, options);
}

main().catch(error => {
  console.error('\nPlugin flow test failed:');
  console.error(error instanceof Error ? error.stack || error.message : error);
  process.exit(1);
});
