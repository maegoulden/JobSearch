import { Router } from 'express';
import {
  loadSites,
  saveSites,
  loadHistory,
  saveHistory,
  normalizeNewSite,
  deleteSnapshot,
} from './store.js';
import { checkSiteById, checkAllSites } from './checker.js';

const router = Router();

function isValidUrl(value) {
  try {
    const u = new URL(value);
    return u.protocol === 'http:' || u.protocol === 'https:';
  } catch {
    return false;
  }
}

router.get('/sites', (req, res) => {
  res.json(loadSites());
});

router.post('/sites', (req, res) => {
  const { name, url, selector } = req.body || {};
  if (!url || !isValidUrl(url)) {
    return res.status(400).json({ error: 'A valid http(s) url is required' });
  }

  const sites = loadSites();
  const site = normalizeNewSite({ name, url, selector });
  sites.push(site);
  saveSites(sites);
  res.status(201).json(site);
});

router.put('/sites/:id', (req, res) => {
  const sites = loadSites();
  const site = sites.find((s) => s.id === req.params.id);
  if (!site) return res.status(404).json({ error: 'Site not found' });

  const { name, url, selector } = req.body || {};
  if (url !== undefined && !isValidUrl(url)) {
    return res.status(400).json({ error: 'A valid http(s) url is required' });
  }

  const urlOrSelectorChanged =
    (url !== undefined && url.trim() !== site.url) ||
    (selector !== undefined && selector.trim() !== site.selector);

  if (name !== undefined) site.name = name.trim() || site.url;
  if (url !== undefined) site.url = url.trim();
  if (selector !== undefined) site.selector = selector.trim() || 'body';

  if (urlOrSelectorChanged) {
    // The baseline no longer applies to the new target, so start fresh.
    site.contentHash = null;
    site.lastStatus = 'pending';
    site.lastError = null;
    deleteSnapshot(site.id);
  }

  saveSites(sites);
  res.json(site);
});

router.delete('/sites/:id', (req, res) => {
  const sites = loadSites();
  const idx = sites.findIndex((s) => s.id === req.params.id);
  if (idx === -1) return res.status(404).json({ error: 'Site not found' });

  const [removed] = sites.splice(idx, 1);
  saveSites(sites);
  deleteSnapshot(removed.id);

  const history = loadHistory().filter((h) => h.siteId !== removed.id);
  saveHistory(history);

  res.status(204).end();
});

router.post('/sites/:id/check', async (req, res) => {
  try {
    const result = await checkSiteById(req.params.id);
    if (result.skipped) return res.status(409).json(result);
    res.json(result);
  } catch (err) {
    if (err.message?.includes('not found')) {
      return res.status(404).json({ error: err.message });
    }
    res.status(502).json({ error: err.message || String(err) });
  }
});

router.post('/check-all', async (req, res) => {
  const results = await checkAllSites();
  res.json(results);
});

router.get('/history', (req, res) => {
  const { siteId, limit } = req.query;
  let history = loadHistory().slice().reverse();
  if (siteId) history = history.filter((h) => h.siteId === siteId);
  if (limit) history = history.slice(0, Number(limit));
  res.json(history);
});

export default router;
