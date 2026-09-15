const sitesListEl = document.getElementById('sites-list');
const recentChangesEl = document.getElementById('recent-changes');
const addSiteForm = document.getElementById('add-site-form');
const addSiteError = document.getElementById('add-site-error');
const checkAllBtn = document.getElementById('check-all-btn');

const diffModal = document.getElementById('diff-modal');
const diffModalTitle = document.getElementById('diff-modal-title');
const diffModalBody = document.getElementById('diff-modal-body');
document.getElementById('diff-modal-close').addEventListener('click', () => {
  diffModal.hidden = true;
});
diffModal.addEventListener('click', (e) => {
  if (e.target === diffModal) diffModal.hidden = true;
});

function timeAgo(iso) {
  if (!iso) return 'never';
  const diffMs = Date.now() - new Date(iso).getTime();
  const mins = Math.round(diffMs / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.round(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.round(hours / 24);
  return `${days}d ago`;
}

function statusBadge(site) {
  if (site.lastStatus === 'error') return `<span class="badge badge-error">Error</span>`;
  if (site.lastStatus === 'pending') return `<span class="badge badge-pending">Pending</span>`;
  if (site.lastChangedAt && site.lastChangedAt === site.lastCheckedAt) {
    return `<span class="badge badge-changed">Changed</span>`;
  }
  return `<span class="badge badge-ok">OK</span>`;
}

function escapeHtml(str) {
  return str.replace(/[&<>"']/g, (c) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
  }[c]));
}

async function fetchJson(url, options) {
  const res = await fetch(url, options);
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error || `Request failed (${res.status})`);
  }
  if (res.status === 204) return null;
  return res.json();
}

function renderSites(sites) {
  if (sites.length === 0) {
    sitesListEl.innerHTML = '<p class="empty-state">No sites yet — add one above to start tracking.</p>';
    return;
  }

  sitesListEl.innerHTML = sites.map((site) => `
    <div class="site-card" data-id="${site.id}">
      <div class="site-info">
        <div class="site-name">${escapeHtml(site.name)} ${statusBadge(site)}</div>
        <a class="site-url" href="${escapeHtml(site.url)}" target="_blank" rel="noopener">${escapeHtml(site.url)}</a>
        <div class="site-meta">
          Last checked: ${timeAgo(site.lastCheckedAt)}
          &middot; Last change: ${timeAgo(site.lastChangedAt)}
          ${site.lastError ? `<br><span class="error">${escapeHtml(site.lastError)}</span>` : ''}
        </div>
      </div>
      <div class="site-actions">
        <button class="btn btn-secondary check-btn" data-id="${site.id}">Check now</button>
        <button class="btn btn-danger delete-btn" data-id="${site.id}">Remove</button>
      </div>
    </div>
  `).join('');

  sitesListEl.querySelectorAll('.check-btn').forEach((btn) => {
    btn.addEventListener('click', () => checkSite(btn.dataset.id));
  });
  sitesListEl.querySelectorAll('.delete-btn').forEach((btn) => {
    btn.addEventListener('click', () => deleteSite(btn.dataset.id));
  });
}

function renderDiffParts(diffParts) {
  return diffParts.map((part) => {
    const cls = part.added ? 'diff-add' : part.removed ? 'diff-del' : '';
    const lines = part.value.split('\n').filter((l) => l.length > 0);
    return lines.map((line) => cls
      ? `<span class="${cls}">${part.added ? '+ ' : '- '}${escapeHtml(line)}</span>`
      : `<span>${escapeHtml(line)}</span>`
    ).join('\n');
  }).join('\n');
}

function renderHistory(history) {
  if (history.length === 0) {
    recentChangesEl.innerHTML = '<p class="empty-state">No changes detected yet.</p>';
    return;
  }

  recentChangesEl.innerHTML = history.map((entry, i) => `
    <div class="history-item" data-index="${i}">
      <div class="history-site">${escapeHtml(entry.siteName)}</div>
      <div class="history-summary">${escapeHtml(entry.summary)}</div>
      <div class="history-time">${timeAgo(entry.timestamp)}</div>
    </div>
  `).join('');

  recentChangesEl.querySelectorAll('.history-item').forEach((el) => {
    el.addEventListener('click', () => {
      const entry = history[Number(el.dataset.index)];
      diffModalTitle.textContent = `${entry.siteName} — ${new Date(entry.timestamp).toLocaleString()}`;
      diffModalBody.innerHTML = renderDiffParts(entry.diffParts);
      diffModal.hidden = false;
    });
  });
}

async function loadAll() {
  const [sites, history] = await Promise.all([
    fetchJson('/api/sites'),
    fetchJson('/api/history?limit=30'),
  ]);
  renderSites(sites);
  renderHistory(history);
}

async function checkSite(id) {
  try {
    await fetchJson(`/api/sites/${id}/check`, { method: 'POST' });
  } catch (err) {
    console.error(err);
  }
  loadAll();
}

async function deleteSite(id) {
  if (!confirm('Stop tracking this site? Its history will be removed too.')) return;
  await fetchJson(`/api/sites/${id}`, { method: 'DELETE' });
  loadAll();
}

addSiteForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  addSiteError.hidden = true;

  const name = document.getElementById('name').value;
  const url = document.getElementById('url').value;
  const selector = document.getElementById('selector').value;

  try {
    await fetchJson('/api/sites', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, url, selector }),
    });
    addSiteForm.reset();
    await loadAll();
  } catch (err) {
    addSiteError.textContent = err.message;
    addSiteError.hidden = false;
  }
});

checkAllBtn.addEventListener('click', async () => {
  checkAllBtn.disabled = true;
  checkAllBtn.textContent = 'Checking...';
  try {
    await fetchJson('/api/check-all', { method: 'POST' });
  } finally {
    checkAllBtn.disabled = false;
    checkAllBtn.textContent = 'Check all now';
  }
  loadAll();
});

loadAll();
setInterval(loadAll, 60_000);
