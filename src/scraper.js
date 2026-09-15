import * as cheerio from 'cheerio';
import { diffLines } from 'diff';
import crypto from 'node:crypto';

const FETCH_TIMEOUT_MS = 20_000;
const USER_AGENT =
  'Mozilla/5.0 (compatible; JobSearchTracker/1.0; +https://github.com/) career-page change monitor';

const BLOCK_SELECTOR =
  'p, div, li, tr, h1, h2, h3, h4, h5, h6, td, th, article, section, header, footer, ul, ol';

function extractText(html, selector) {
  const $ = cheerio.load(html);
  $('script, style, noscript, svg').remove();

  // cheerio's .text() concatenates adjacent elements with no separator
  // (e.g. "<li>A</li><li>B</li>" -> "AB"), which would smash separate job
  // listings into one unreadable/undiffable blob. Insert a newline after
  // each block-ish element so they extract as separate lines instead.
  $('br').replaceWith('\n');
  $(BLOCK_SELECTOR).append('\n');

  const scope = selector && $(selector).length ? $(selector) : $('body');
  const rawText = scope.text();

  const lines = rawText
    .split('\n')
    .map((line) => line.replace(/\s+/g, ' ').trim())
    .filter((line) => line.length > 0);

  return lines.join('\n');
}

function hashText(text) {
  return crypto.createHash('sha256').update(text).digest('hex');
}

async function fetchHtml(url) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
  try {
    const res = await fetch(url, {
      signal: controller.signal,
      headers: { 'User-Agent': USER_AGENT },
      redirect: 'follow',
    });
    if (!res.ok) {
      throw new Error(`HTTP ${res.status} ${res.statusText}`);
    }
    return await res.text();
  } finally {
    clearTimeout(timeout);
  }
}

/**
 * Fetches a site, compares its extracted text against the last snapshot,
 * and returns a result describing whether anything changed.
 */
async function checkSite(site, { readSnapshot }) {
  const html = await fetchHtml(site.url);
  const text = extractText(html, site.selector);
  const hash = hashText(text);

  const previousText = readSnapshot(site.id);
  const isFirstCheck = previousText === null;
  const changed = !isFirstCheck && hash !== site.contentHash;

  let diffParts = null;
  if (changed) {
    diffParts = diffLines(previousText, text).map((part) => ({
      added: !!part.added,
      removed: !!part.removed,
      value: part.value,
    }));
  }

  return { text, hash, isFirstCheck, changed, diffParts };
}

export { extractText, hashText, fetchHtml, checkSite };
