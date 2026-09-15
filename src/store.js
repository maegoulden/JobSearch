import fs from 'node:fs';
import path from 'node:path';

const DATA_DIR = path.join(process.cwd(), 'data');
const SNAPSHOTS_DIR = path.join(DATA_DIR, 'snapshots');
const SITES_FILE = path.join(DATA_DIR, 'sites.json');
const HISTORY_FILE = path.join(DATA_DIR, 'history.json');
const SEED_FILE = path.join(process.cwd(), 'config', 'sites.seed.json');

const MAX_HISTORY_ENTRIES = 500;

function ensureDataDir() {
  fs.mkdirSync(SNAPSHOTS_DIR, { recursive: true });

  if (!fs.existsSync(SITES_FILE)) {
    let seed = [];
    if (fs.existsSync(SEED_FILE)) {
      try {
        seed = JSON.parse(fs.readFileSync(SEED_FILE, 'utf8'));
      } catch {
        seed = [];
      }
    }
    const sites = seed.map((s) => normalizeNewSite(s));
    saveSites(sites);
  }

  if (!fs.existsSync(HISTORY_FILE)) {
    saveHistory([]);
  }
}

function normalizeNewSite(input) {
  return {
    id: crypto.randomUUID(),
    name: input.name?.trim() || input.url,
    url: input.url.trim(),
    selector: input.selector?.trim() || 'body',
    createdAt: new Date().toISOString(),
    lastCheckedAt: null,
    lastChangedAt: null,
    lastStatus: 'pending',
    lastError: null,
    contentHash: null,
  };
}

function loadSites() {
  ensureDataDir();
  return JSON.parse(fs.readFileSync(SITES_FILE, 'utf8'));
}

function saveSites(sites) {
  fs.writeFileSync(SITES_FILE, JSON.stringify(sites, null, 2));
}

function loadHistory() {
  ensureDataDir();
  return JSON.parse(fs.readFileSync(HISTORY_FILE, 'utf8'));
}

function saveHistory(history) {
  const trimmed = history.slice(-MAX_HISTORY_ENTRIES);
  fs.writeFileSync(HISTORY_FILE, JSON.stringify(trimmed, null, 2));
}

function addHistoryEntry(entry) {
  const history = loadHistory();
  history.push(entry);
  saveHistory(history);
  return entry;
}

function getSnapshotPath(id) {
  return path.join(SNAPSHOTS_DIR, `${id}.txt`);
}

function readSnapshot(id) {
  const file = getSnapshotPath(id);
  if (!fs.existsSync(file)) return null;
  return fs.readFileSync(file, 'utf8');
}

function writeSnapshot(id, text) {
  fs.writeFileSync(getSnapshotPath(id), text);
}

function deleteSnapshot(id) {
  const file = getSnapshotPath(id);
  if (fs.existsSync(file)) fs.unlinkSync(file);
}

export {
  ensureDataDir,
  normalizeNewSite,
  loadSites,
  saveSites,
  loadHistory,
  saveHistory,
  addHistoryEntry,
  readSnapshot,
  writeSnapshot,
  deleteSnapshot,
};
