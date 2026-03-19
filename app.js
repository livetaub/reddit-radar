/**
 * RedditRadar — Personal Discussion Finder
 * 
 * A read-only search dashboard to find Reddit discussions
 * related to topics you're interested in.
 * 
 * This app only READS data from Reddit — it does not post,
 * comment, vote, or modify anything.
 */

// ========== State ==========
let accessToken = null;
let tokenExpiry = 0;

// ========== Credential Management ==========
function getCredentials() {
  const raw = localStorage.getItem('redditradar_creds');
  if (!raw) return null;
  try { return JSON.parse(raw); } catch { return null; }
}

function saveCredentials(creds) {
  localStorage.setItem('redditradar_creds', JSON.stringify(creds));
}

function clearCredentials() {
  localStorage.removeItem('redditradar_creds');
  accessToken = null;
  tokenExpiry = 0;
}

// ========== Reddit API Auth ==========
async function authenticate(creds) {
  const auth = btoa(`${creds.clientId}:${creds.clientSecret}`);
  
  const res = await fetch('https://www.reddit.com/api/v1/access_token', {
    method: 'POST',
    headers: {
      'Authorization': `Basic ${auth}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: `grant_type=password&username=${encodeURIComponent(creds.username)}&password=${encodeURIComponent(creds.password)}`,
  });

  if (!res.ok) throw new Error('Authentication failed');
  
  const data = await res.json();
  if (data.error) throw new Error(data.error);
  
  accessToken = data.access_token;
  tokenExpiry = Date.now() + (data.expires_in * 1000);
  return data;
}

async function getToken(creds) {
  if (accessToken && Date.now() < tokenExpiry - 60000) return accessToken;
  await authenticate(creds);
  return accessToken;
}

// ========== Reddit API Calls (Read-Only) ==========
async function searchReddit(subreddit, keyword) {
  const creds = getCredentials();
  const token = await getToken(creds);
  
  const url = `https://oauth.reddit.com/r/${subreddit}/search.json?q=${encodeURIComponent(keyword)}&restrict_sr=1&sort=new&t=week&limit=25`;
  
  const res = await fetch(url, {
    headers: {
      'Authorization': `Bearer ${token}`,
      'User-Agent': 'RedditRadar/1.0 (read-only search dashboard)',
    },
  });

  if (!res.ok) throw new Error('Search failed');
  const data = await res.json();
  return data.data.children.map(c => c.data);
}

async function getPostDetails(permalink) {
  const creds = getCredentials();
  const token = await getToken(creds);
  
  const res = await fetch(`https://oauth.reddit.com${permalink}.json?limit=10`, {
    headers: {
      'Authorization': `Bearer ${token}`,
      'User-Agent': 'RedditRadar/1.0 (read-only search dashboard)',
    },
  });

  if (!res.ok) throw new Error('Failed to load post');
  return await res.json();
}

async function getMe() {
  const creds = getCredentials();
  const token = await getToken(creds);
  
  const res = await fetch('https://oauth.reddit.com/api/v1/me', {
    headers: {
      'Authorization': `Bearer ${token}`,
      'User-Agent': 'RedditRadar/1.0 (read-only search dashboard)',
    },
  });

  if (!res.ok) throw new Error('Failed to get user info');
  return await res.json();
}

// ========== UI Logic ==========
function showSetup() {
  document.getElementById('setup-panel').style.display = 'block';
  document.getElementById('main-app').style.display = 'none';
}

function showApp() {
  document.getElementById('setup-panel').style.display = 'none';
  document.getElementById('main-app').style.display = 'block';
}

function setStatus(msg, type) {
  const el = document.getElementById('setup-status');
  el.textContent = msg;
  el.className = 'status-msg ' + type;
}

function timeAgo(utc) {
  const diff = Date.now() - (utc * 1000);
  const mins = Math.floor(diff / 60000);
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

function renderResults(posts) {
  const area = document.getElementById('results-area');
  
  if (posts.length === 0) {
    area.innerHTML = `
      <div class="empty-state">
        <span class="empty-icon">🔍</span>
        <h3>No matching discussions found</h3>
        <p>Try different keywords or subreddits.</p>
      </div>`;
    return;
  }

  area.innerHTML = posts.map(post => `
    <div class="post-card" onclick="openPost('${post.permalink}')">
      <div class="post-title">${escapeHtml(post.title)}</div>
      <div class="post-meta">
        <span>r/${post.subreddit}</span>
        <span>👤 u/${post.author}</span>
        <span>⬆ ${post.score}</span>
        <span>💬 ${post.num_comments}</span>
        <span>🕐 ${timeAgo(post.created_utc)}</span>
      </div>
      ${post.selftext ? `<div class="post-body-preview">${escapeHtml(post.selftext.slice(0, 200))}</div>` : ''}
    </div>
  `).join('');
}

function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

// ========== Post Detail Modal ==========
async function openPost(permalink) {
  const modal = document.getElementById('post-modal');
  const body = document.getElementById('modal-body');
  
  modal.style.display = 'flex';
  body.innerHTML = '<div class="loading">Loading post...</div>';

  try {
    const data = await getPostDetails(permalink);
    const post = data[0].data.children[0].data;
    const comments = data[1].data.children
      .filter(c => c.kind === 't1')
      .slice(0, 8)
      .map(c => c.data);

    body.innerHTML = `
      <div class="modal-post-title">${escapeHtml(post.title)}</div>
      <div class="post-meta" style="margin-bottom:12px">
        <span>r/${post.subreddit}</span>
        <span>👤 u/${post.author}</span>
        <span>⬆ ${post.score}</span>
        <span>💬 ${post.num_comments}</span>
        <span>🕐 ${timeAgo(post.created_utc)}</span>
      </div>
      ${post.selftext ? `<div class="modal-post-body">${escapeHtml(post.selftext)}</div>` : '<div class="modal-post-body" style="color:#999; font-style:italic">No text content — this may be a link or media post.</div>'}
      
      <a href="https://reddit.com${permalink}" target="_blank" rel="noopener noreferrer" class="modal-reddit-link">
        Open on Reddit to participate ↗
      </a>
      
      ${comments.length > 0 ? `
        <div style="border-top:1px solid #e2e4e9; padding-top:16px; margin-top:16px">
          <h4 style="font-size:13px; color:#888; margin-bottom:12px">TOP COMMENTS</h4>
          ${comments.map(c => `
            <div style="padding:10px 12px; background:#f9fafb; border-radius:8px; margin-bottom:8px; font-size:13px; color:#444; line-height:1.6">
              <div style="font-size:11px; color:#999; margin-bottom:4px">u/${c.author} · ⬆ ${c.score}</div>
              ${escapeHtml(c.body).slice(0, 400)}${c.body.length > 400 ? '...' : ''}
            </div>
          `).join('')}
        </div>
      ` : ''}
    `;
  } catch (err) {
    body.innerHTML = `<div class="empty-state"><p>Error loading post: ${err.message}</p></div>`;
  }
}

function closeModal() {
  document.getElementById('post-modal').style.display = 'none';
}

// ========== Event Listeners ==========
document.addEventListener('DOMContentLoaded', async () => {
  const creds = getCredentials();
  
  if (creds) {
    try {
      await authenticate(creds);
      const me = await getMe();
      document.getElementById('connected-user').textContent = `u/${me.name}`;
      showApp();
    } catch {
      showSetup();
    }
  } else {
    showSetup();
  }

  // Save credentials
  document.getElementById('btn-save-creds').addEventListener('click', async () => {
    const creds = {
      username: document.getElementById('input-username').value.trim(),
      password: document.getElementById('input-password').value,
      clientId: document.getElementById('input-client-id').value.trim(),
      clientSecret: document.getElementById('input-client-secret').value.trim(),
    };

    if (!creds.username || !creds.password || !creds.clientId || !creds.clientSecret) {
      setStatus('All fields are required.', 'error');
      return;
    }

    setStatus('Connecting...', '');
    try {
      await authenticate(creds);
      const me = await getMe();
      saveCredentials(creds);
      document.getElementById('connected-user').textContent = `u/${me.name}`;
      showApp();
    } catch (err) {
      setStatus(`Connection failed: ${err.message}`, 'error');
    }
  });

  // Search
  document.getElementById('btn-search').addEventListener('click', async () => {
    const subreddit = document.getElementById('input-subreddit').value.trim();
    const keyword = document.getElementById('input-keyword').value.trim();

    if (!subreddit || !keyword) {
      document.getElementById('results-area').innerHTML = `
        <div class="empty-state"><p>Please enter both a subreddit and keyword.</p></div>`;
      return;
    }

    document.getElementById('results-area').innerHTML = '<div class="loading">Searching Reddit...</div>';

    try {
      const posts = await searchReddit(subreddit, keyword);
      renderResults(posts);
    } catch (err) {
      document.getElementById('results-area').innerHTML = `
        <div class="empty-state"><p>Search failed: ${err.message}</p></div>`;
    }
  });

  // Enter key triggers search
  document.getElementById('input-keyword').addEventListener('keydown', (e) => {
    if (e.key === 'Enter') document.getElementById('btn-search').click();
  });
  document.getElementById('input-subreddit').addEventListener('keydown', (e) => {
    if (e.key === 'Enter') document.getElementById('btn-search').click();
  });

  // Disconnect
  document.getElementById('btn-disconnect').addEventListener('click', () => {
    clearCredentials();
    showSetup();
  });

  // Close modal on Escape
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') closeModal();
  });
});
