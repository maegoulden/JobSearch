import { checkSite as runCheck } from './scraper.js';
import {
  loadSites,
  saveSites,
  readSnapshot,
  writeSnapshot,
  addHistoryEntry,
} from './store.js';
import { sendChangeEmail } from './mailer.js';

const inProgress = new Set();

function summarizeDiff(diffParts) {
  const added = diffParts.filter((p) => p.added).reduce((n, p) => n + p.value.split('\n').filter(Boolean).length, 0);
  const removed = diffParts.filter((p) => p.removed).reduce((n, p) => n + p.value.split('\n').filter(Boolean).length, 0);
  const bits = [];
  if (added) bits.push(`+${added} line${added === 1 ? '' : 's'}`);
  if (removed) bits.push(`-${removed} line${removed === 1 ? '' : 's'}`);
  return bits.length ? bits.join(', ') : 'content changed';
}

/**
 * Checks a single site by id, updates its stored state, and records a
 * history entry if the page content changed. Safe to call concurrently
 * for different sites; skips if a check is already running for this id.
 */
async function checkSiteById(id) {
  if (inProgress.has(id)) {
    return { skipped: true, reason: 'already checking' };
  }

  const sites = loadSites();
  const site = sites.find((s) => s.id === id);
  if (!site) {
    throw new Error(`Site ${id} not found`);
  }

  inProgress.add(id);
  try {
    const now = new Date().toISOString();

    try {
      const result = await runCheck(site, { readSnapshot });

      writeSnapshot(site.id, result.text);
      site.contentHash = result.hash;
      site.lastCheckedAt = now;
      site.lastStatus = 'ok';
      site.lastError = null;

      if (result.changed) {
        site.lastChangedAt = now;
        const entry = addHistoryEntry({
          id: crypto.randomUUID(),
          siteId: site.id,
          siteName: site.name,
          siteUrl: site.url,
          timestamp: now,
          summary: summarizeDiff(result.diffParts),
          diffParts: result.diffParts,
        });
        sendChangeEmail(site, entry).catch((err) => {
          console.error(`[mailer] failed to send change email for ${site.name}`, err);
        });
      }

      saveSites(sites);
      return { skipped: false, changed: result.changed, firstCheck: result.isFirstCheck };
    } catch (err) {
      site.lastCheckedAt = now;
      site.lastStatus = 'error';
      site.lastError = err.message || String(err);
      saveSites(sites);
      throw err;
    }
  } finally {
    inProgress.delete(id);
  }
}

async function checkAllSites() {
  const sites = loadSites();
  const results = [];
  for (const site of sites) {
    try {
      const result = await checkSiteById(site.id);
      results.push({ id: site.id, ...result });
    } catch (err) {
      results.push({ id: site.id, error: err.message || String(err) });
    }
  }
  return results;
}

export { checkSiteById, checkAllSites };
