const API_BASE = 'https://faceit-api.wenzzyk.workers.dev'; 

// ── State ─────────────────────────────────────────────────────────────────────
 
const state = {
  player: null,       // текущий авторизованный игрок
  tgUser: null,
  tab: 'profile',
  viewedNick: null,   // ник просматриваемого игрока (если не свой)
  viewedPlayer: null,
};
 
// ── Telegram init ─────────────────────────────────────────────────────────────
 
let tg = null;
if (window.Telegram?.WebApp) {
  tg = window.Telegram.WebApp;
  tg.ready();
  tg.expand();
  try { tg.setHeaderColor('#0d0d0d'); } catch {}
  try { tg.setBackgroundColor('#0d0d0d'); } catch {}
}
 
function haptic(type = 'light') {
  try { tg?.HapticFeedback?.impactOccurred(type); } catch {}
}
function hapticSelect() {
  try { tg?.HapticFeedback?.selectionChanged(); } catch {}
}
 
// ── API helpers ───────────────────────────────────────────────────────────────
 
async function apiGet(path) {
  const res = await fetch(API_BASE + path);
  if (!res.ok) throw Object.assign(new Error('API error'), { status: res.status });
  return res.json();
}
 
async function apiPost(path, body) {
  const res = await fetch(API_BASE + path, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw Object.assign(new Error('API error'), { status: res.status });
  return res.json();
}
 
// ── Avatar helpers ────────────────────────────────────────────────────────────
 
/**
 * Returns an avatar HTML element:
 *  - <img> via /api/telegram-avatar if userId is present
 *  - letter fallback otherwise
 * fallbackStyle — inline style string for the fallback div
 */
function avatarHTML(userId, nickname, fallbackStyle = '', cls = '') {
  const letter = (nickname || '?')[0].toUpperCase();
  if (userId) {
    const src = `${API_BASE}/api/telegram-avatar?user_id=${userId}`;
    // Wrap img + hidden fallback letter; JS swaps on error
    return `<div class="tg-avatar ${cls}" style="${fallbackStyle}" data-letter="${letter}" data-src="${src}"></div>`;
  }
  return `<div class="tg-avatar ${cls}" style="${fallbackStyle}" data-letter="${letter}"></div>`;
}
 
// ── Avatar lazy loading via IntersectionObserver ─────────────────────────────
 
/**
 * Activates deferred avatar loading for all .tg-avatar[data-src] elements
 * inside a given container. Uses IntersectionObserver when available,
 * otherwise loads immediately. Avoids browser [Intervention] on lazy imgs.
 */
function activateAvatars(container) {
  const avatars = (container || document).querySelectorAll('.tg-avatar[data-src]');
  if (!avatars.length) return;
 
  function loadAvatar(el) {
    if (el._avatarLoaded) return;
    el._avatarLoaded = true;
    const src = el.dataset.src;
    if (!src) return;
    const img = document.createElement('img');
    img.alt = el.dataset.letter || '';
    img.style.cssText = 'position:absolute;inset:0;width:100%;height:100%;object-fit:cover;opacity:0;transition:opacity 0.25s ease;z-index:1';
    img.onload  = () => { img.style.opacity = '1'; el.classList.add('has-img'); };
    img.onerror = () => { img.remove(); el.classList.remove('has-img'); };
    img.src = src;
    el.appendChild(img);
  }
 
  if ('IntersectionObserver' in window) {
    const observer = new IntersectionObserver((entries, obs) => {
      entries.forEach(e => {
        if (e.isIntersecting) { loadAvatar(e.target); obs.unobserve(e.target); }
      });
    }, { rootMargin: '200px' });
    avatars.forEach(el => observer.observe(el));
  } else {
    avatars.forEach(loadAvatar);
  }
}
 
// ── UI helpers ────────────────────────────────────────────────────────────────
 
function el(tag, cls, inner) {
  const e = document.createElement(tag);
  if (cls) e.className = cls;
  if (inner !== undefined) e.innerHTML = inner;
  return e;
}
 
function setContent(html) {
  document.getElementById('tab-content').innerHTML = '';
  const wrap = el('div', 'animate-in');
  wrap.innerHTML = html;
  document.getElementById('tab-content').appendChild(wrap);
}
 
// ── Animated number ───────────────────────────────────────────────────────────
 
function animateNumber(element, to, duration = 900, decimals = 0) {
  const from = parseFloat(element.dataset.from || '0');
  element.dataset.from = to;
  let start = null;
 
  function step(ts) {
    if (!start) start = ts;
    const progress = Math.min((ts - start) / duration, 1);
    const eased = 1 - Math.pow(1 - progress, 3);
    const current = from + (to - from) * eased;
    if (decimals > 0) {
      element.textContent = current.toFixed(decimals);
    } else {
      element.textContent = Math.round(current).toLocaleString('ru-RU');
    }
    if (progress < 1) requestAnimationFrame(step);
    else {
      element.dataset.from = to;
    }
  }
  requestAnimationFrame(step);
}
 
function numSpan(value, decimals = 0) {
  const span = el('span');
  span.dataset.value = value;
  span.dataset.decimals = decimals;
  span.textContent = decimals > 0 ? Number(value).toFixed(decimals) : Number(value).toLocaleString('ru-RU');
  return span;
}
 
function activateAnimations(container) {
  container.querySelectorAll('[data-value]').forEach(el => {
    animateNumber(el, parseFloat(el.dataset.value), 900, parseInt(el.dataset.decimals || '0'));
  });
  container.querySelectorAll('[data-progress]').forEach(el => {
    setTimeout(() => { el.style.width = el.dataset.progress + '%'; }, 80);
  });
  container.querySelectorAll('[data-ring]').forEach(el => {
    setTimeout(() => animateRing(el, parseFloat(el.dataset.ring)), 80);
  });
}
 
// ── Level badge ───────────────────────────────────────────────────────────────
 
const LEVEL_COLORS = {
  1:  { bg: '#2a2a2a', text: '#6b7280', glow: null },
  2:  { bg: '#2a2a2a', text: '#6b7280', glow: null },
  3:  { bg: '#1a2a1a', text: '#34C759', glow: null },
  4:  { bg: '#1a2a1a', text: '#34C759', glow: null },
  5:  { bg: '#2a2500', text: '#FFD700', glow: 'rgba(255,215,0,0.3)' },
  6:  { bg: '#2a2500', text: '#FFD700', glow: 'rgba(255,215,0,0.3)' },
  7:  { bg: '#2a1a00', text: '#FF8C00', glow: 'rgba(255,140,0,0.3)' },
  8:  { bg: '#2a1a00', text: '#FF8C00', glow: 'rgba(255,140,0,0.3)' },
  9:  { bg: '#2a0a0a', text: '#FF3B30', glow: 'rgba(255,59,48,0.35)' },
  10: { bg: '#1a0000', text: '#FF0000', glow: 'rgba(255,0,0,0.4)' },
};
 
function getLevelColor(level) {
  return (LEVEL_COLORS[Math.min(10, Math.max(1, level))] || LEVEL_COLORS[1]).text;
}
 
function levelBadgeHTML(level, size = 'md') {
  const lvl = Math.min(10, Math.max(1, level));
  const c = LEVEL_COLORS[lvl];
  const cls = `lvl lvl-${size}`;
  const style = `background:${c.bg};color:${c.text};border-color:${c.text}40;${c.glow ? `box-shadow:0 0 10px ${c.glow};` : ''}`;
  return `<span class="${cls}" style="${style}">${lvl}</span>`;
}
 
// ── Ring chart ────────────────────────────────────────────────────────────────
 
function animateRing(svgEl, value) {
  const circle = svgEl.querySelector('.ring-fill');
  if (!circle) return;
  const r = parseFloat(circle.getAttribute('r'));
  const circ = 2 * Math.PI * r;
  const dash = (value / 100) * circ;
  circle.style.strokeDasharray = `${dash} ${circ}`;
}
 
function ringChartHTML(value, size = 52, stroke = 5) {
  const r = (size - stroke) / 2;
  const circ = 2 * Math.PI * r;
  const cx = size / 2;
  return `
    <svg width="${size}" height="${size}" style="transform:rotate(-90deg)" data-ring="${value}">
      <circle cx="${cx}" cy="${cx}" r="${r}" fill="none"
        stroke="rgba(255,255,255,0.07)" stroke-width="${stroke}"/>
      <circle class="ring-fill" cx="${cx}" cy="${cx}" r="${r}" fill="none"
        stroke="url(#rg${size})" stroke-width="${stroke}" stroke-linecap="round"
        stroke-dasharray="0 ${circ}"
        style="transition:stroke-dasharray 1s cubic-bezier(0.4,0,0.2,1)"/>
      <defs>
        <linearGradient id="rg${size}" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stop-color="#FFD700"/>
          <stop offset="100%" stop-color="#FFA500"/>
        </linearGradient>
      </defs>
    </svg>
    <div style="position:absolute;inset:0;display:flex;flex-direction:column;align-items:center;justify-content:center">
      <span style="color:#fff;font-weight:700;font-size:${Math.round(size*0.22)}px;line-height:1">${value}%</span>
      <span style="font-size:10px;color:#a0a0a0;line-height:1;margin-top:2px">WR</span>
    </div>`;
}
 
// ── Map meta ──────────────────────────────────────────────────────────────────
 
const MAP_META = {
  mirage:      { label: 'Mirage',      color: '#E8B847', emoji: '🏜️' },
  dust2:       { label: 'Dust 2',      color: '#C8A06A', emoji: '🏛️' },
  inferno:     { label: 'Inferno',     color: '#E8622A', emoji: '🔥' },
  nuke:        { label: 'Nuke',        color: '#4FC3F7', emoji: '☢️' },
  vertigo:     { label: 'Vertigo',     color: '#78909C', emoji: '🏗️' },
  ancient:     { label: 'Ancient',     color: '#66BB6A', emoji: '🏺' },
  anubis:      { label: 'Anubis',      color: '#FFAB40', emoji: '🗿' },
  overpass:    { label: 'Overpass',    color: '#42A5F5', emoji: '🌉' },
  cache:       { label: 'Cache',       color: '#8D6E63', emoji: '🏭' },
  train:       { label: 'Train',       color: '#B0BEC5', emoji: '🚂' },
  cobblestone: { label: 'Cobblestone', color: '#8D6E63', emoji: '🏰' },
};
function getMapMeta(name) {
  const key = (name || '').toLowerCase().replace(/\s/g, '');
  return MAP_META[key] || { label: name, color: '#FFD700', emoji: '🗺️' };
}
 
// ── Custom titles ─────────────────────────────────────────────────────────────
 
const CUSTOM_TITLES = {
  legend: '🏆 Легенда', veteran: '⚔️ Ветеран',
  challenger: '🎯 Претендент', elite: '💎 Элита', predator: '🔥 Хищник',
};
 
// ── Level gradient (banner bg) ────────────────────────────────────────────────
 
function levelGradient(level) {
  if (level <= 2) return 'linear-gradient(135deg,#1a1a1a,#2a2a2a)';
  if (level <= 4) return 'linear-gradient(135deg,#0a1a0a,#1a2a1a)';
  if (level <= 6) return 'linear-gradient(135deg,#1a1500,#2a2000)';
  if (level <= 8) return 'linear-gradient(135deg,#1a0e00,#2a1800)';
  return 'linear-gradient(135deg,#1a0000,#2a0808)';
}
 
function formatDate(str) {
  try { return new Date(str).toLocaleDateString('ru-RU', { month: 'long', year: 'numeric' }); }
  catch { return '—'; }
}
 
// ── Render PlayerView ─────────────────────────────────────────────────────────
 
function renderPlayerStats(p, isProTab = false) {
  const data = isProTab ? p.proLeague : p;
  if (!data) return '';
 
  const mapStats = isProTab ? (p.proLeague?.mapStats || []) : (p.mapStats || []);
  const mapTitle = isProTab ? 'Карты — Pro League' : 'Статистика по картам';
 
  const eloCardClass = isProTab ? 'elo-card pro' : 'elo-card';
  const eloLabel = isProTab ? `Pro League ELO <span style="font-size:10px;padding:2px 6px;border-radius:4px;background:rgba(255,140,0,.15);color:#FFA500;font-weight:700;margin-left:8px">#${data.rank}</span>` : 'ELO рейтинг';
 
  return `
    <div class="${eloCardClass}">
      <div class="elo-label">${eloLabel}</div>
      <div class="elo-row">
        <span class="elo-value"><span data-value="${data.elo}">0</span></span>
        <div class="elo-meta">
          <div>Лучшая серия: <b>${data.bestStreak}</b></div>
          <div>Текущая серия: <b>${data.winStreak}</b></div>
        </div>
      </div>
    </div>
 
    <div class="stats-grid">
      <div class="stat-card">
        <div class="label">Матчей</div>
        <div class="value"><span data-value="${data.totalMatches}">0</span></div>
      </div>
      <div class="stat-card">
        <div class="label">Побед</div>
        <div class="value green"><span data-value="${data.wins}">0</span></div>
      </div>
      <div class="stat-card">
        <div class="label">K/D</div>
        <div class="value"><span data-value="${data.kd}" data-decimals="2">0</span></div>
      </div>
      <div class="ring-card" style="position:relative">
        ${ringChartHTML(data.winRate, 52, 5)}
      </div>
    </div>
 
    ${!isProTab ? `
    <div class="stats-grid3">
      <div class="stat-card stat-mini">
        <div class="label">Убийства</div>
        <div class="value"><span data-value="${p.kills}">0</span></div>
      </div>
      <div class="stat-card stat-mini">
        <div class="label">Смерти</div>
        <div class="value"><span data-value="${p.deaths}">0</span></div>
      </div>
      <div class="stat-card stat-mini">
        <div class="label">Ассисты</div>
        <div class="value"><span data-value="${p.assists}">0</span></div>
      </div>
    </div>` : ''}
 
    ${!isProTab && p.recentMatches?.length ? renderMatchHistory(p.recentMatches) : ''}
 
    ${mapStats.length ? `
    <div class="map-section">
      <div class="section-title">${mapTitle}</div>
      <div class="map-list">
        ${(() => { window._mapStatsCache = mapStats; return mapStats; })().map((m, idx) => {
          const meta = getMapMeta(m.mapName);
          const kda = m.deaths > 0
            ? ((m.kills + m.assists * 0.5) / m.deaths).toFixed(2)
            : String(m.kills);
          const wrCls = m.winRate >= 50 ? 'good' : 'bad';
          return `
          <div class="map-card" data-mapidx="${idx}" style="cursor:pointer">
            <div class="map-card-header">
              <div class="map-name-row">
                <span class="map-emoji">${meta.emoji}</span>
                <div>
                  <div class="map-name">${meta.label}</div>
                  <div class="map-matches">${m.matches} матчей</div>
                </div>
              </div>
              <span class="wr-badge ${wrCls}">${m.winRate}% WR</span>
            </div>
            <div class="progress-bar">
              <div class="progress-fill" data-progress="${m.winRate}" style="width:0%"></div>
            </div>
            <div class="map-stats-row">
              <span class="map-stat-lbl">W</span>
              <span class="map-stat-val" style="color:#34C759">${m.wins}</span>
              <span class="dot">•</span>
              <span class="map-stat-lbl">L</span>
              <span class="map-stat-val" style="color:#FF3B30">${m.losses}</span>
              <span class="dot">•</span>
              <span class="map-stat-lbl">KDA</span>
              <span class="map-stat-val" style="color:${meta.color}">${kda}</span>
              <span class="dot">•</span>
              <span class="map-stat-lbl">AVG K</span>
              <span class="map-stat-val" style="color:#a0a0a0">${m.avgKills.toFixed(1)}</span>
            </div>
          </div>`;
        }).join('')}
      </div>
    </div>` : ''}
  `;
}
 
function renderPlayer(player) {
  const bannerGradient = levelGradient(player.level);
  // Banner: store gradient in data attr to avoid quote escaping issues in onerror
  const bannerBg = player.bannerFileId
    ? `<div class="banner-bg banner-img-wrap" data-file-id="${player.bannerFileId}" data-gradient="${bannerGradient}"></div>`
    : `<div class="banner-bg" style="background:${bannerGradient}"></div>`;
 
  const rankColor = player.rank <= 3 ? '#FFD700' : '#ffffff';
 
  const lvlColor = getLevelColor(player.level);
  const avatarFallbackStyle = `background:${lvlColor}18;--tg-avatar-color:${lvlColor};border-color:${lvlColor}40`;
 
  const container = el('div');
  container.innerHTML = `
    <div class="player-banner">
      ${bannerBg}
      <div class="banner-overlay"></div>
      <div class="banner-info">
        <div class="banner-name" style="display:flex;align-items:flex-end;gap:12px">
          ${avatarHTML(player.userId, player.gameNickname, avatarFallbackStyle, 'banner-avatar')}
          <div>
            <div class="banner-tags">
              ${levelBadgeHTML(player.level, 'md')}
              ${player.isPremium ? '<span class="tag tag-premium">✨ Premium</span>' : ''}
              ${player.hasProLeague ? '<span class="tag tag-pro">🏅 Pro</span>' : ''}
            </div>
            <h1 style="${player.nickColor ? `color:${player.nickColor}` : ''}">${player.gameNickname}</h1>
            ${player.playerTag ? `<span class="player-tag-text">[${player.playerTag}]</span>` : ''}
          </div>
        </div>
        <div class="banner-rank">
          <div class="rank-label">РЕЙТИНГ</div>
          <div class="rank-num" style="color:${rankColor}">#${player.rank}</div>
        </div>
      </div>
    </div>
  `;
 
  // League tabs if Pro League available
  let currentTab = 'default';
  if (player.hasProLeague && player.proLeague) {
    const tabsDiv = el('div', 'league-tabs');
    tabsDiv.innerHTML = `
      <button class="league-tab active" data-t="default">🎮 Default</button>
      <button class="league-tab" data-t="pro">🏅 Pro League</button>
    `;
    const statsDiv = el('div', 'league-stats');
    statsDiv.innerHTML = renderPlayerStats(player, false);
    attachMapCardHandlers(statsDiv);
 
    tabsDiv.querySelectorAll('.league-tab').forEach(btn => {
      btn.addEventListener('click', () => {
        hapticSelect();
        currentTab = btn.dataset.t;
        tabsDiv.querySelectorAll('.league-tab').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        statsDiv.innerHTML = renderPlayerStats(player, currentTab === 'pro');
        attachMapCardHandlers(statsDiv);
        activateAnimations(statsDiv);
        activateAvatars(statsDiv);
      });
    });
 
    container.appendChild(tabsDiv);
    container.appendChild(statsDiv);
  } else {
    const statsDiv = el('div');
    statsDiv.innerHTML = renderPlayerStats(player, false);
    attachMapCardHandlers(statsDiv);
    container.appendChild(statsDiv);
  }
 
  // Extra cards
  if (player.customTitle || player.mvpCount > 0) {
    const extra = el('div', 'extra-card');
    extra.innerHTML = `
      ${player.customTitle ? `<span style="font-size:13px;font-weight:600;color:#FFD700">${CUSTOM_TITLES[player.customTitle] || player.customTitle}</span>` : ''}
      ${player.mvpCount > 0 ? `<div style="display:flex;align-items:center;gap:6px"><span>👑</span><span style="font-size:13px;color:#a0a0a0">MVP ×${player.mvpCount}</span></div>` : ''}
    `;
    container.appendChild(extra);
  }
 
  if (player.battlePass) {
    const bp = player.battlePass;
    const bpDiv = el('div', 'bp-card');
    bpDiv.innerHTML = `
      <div class="bp-row">
        <div>
          <div class="bp-meta">Battle Pass</div>
          <div class="bp-level">Уровень ${bp.bpLevel}<span>(${bp.winsToNext ?? bp.bpWins} побед к следующему)</span></div>
        </div>
        ${bp.isBought ? '<span class="tag tag-premium" style="font-size:10px;padding:4px 8px;">⚔️ КУПЛЕН</span>' : ''}
      </div>
    `;
    container.appendChild(bpDiv);
  }
 
  const dateDiv = el('div', 'joined-date');
  dateDiv.textContent = `В Faceit Arena с ${formatDate(player.createdAt)}`;
  container.appendChild(dateDiv);
 
  // Padding bottom
  const pad = el('div', '', ''); pad.style.height = '24px';
  container.appendChild(pad);
 
  const wrap = el('div', 'animate-in');
  wrap.appendChild(container);
  document.getElementById('tab-content').innerHTML = '';
  document.getElementById('tab-content').appendChild(wrap);
 
  // Load banner image
  const bannerWrap = wrap.querySelector('.banner-img-wrap[data-file-id]');
  if (bannerWrap) {
    const fileId = bannerWrap.dataset.fileId;
    const gradient = bannerWrap.dataset.gradient;
    bannerWrap.style.background = gradient;
    const img = document.createElement('img');
    img.alt = 'banner';
    img.style.cssText = 'position:absolute;inset:0;width:100%;height:100%;object-fit:cover;opacity:0;transition:opacity 0.4s ease';
    img.onload  = () => { img.style.opacity = '1'; };
    img.onerror = () => { img.remove(); bannerWrap.style.background = gradient; };
    img.src = `${API_BASE}/api/telegram-file?file_id=${fileId}`;
    bannerWrap.appendChild(img);
  }
 
  setTimeout(() => { activateAnimations(wrap); activateAvatars(wrap); }, 50);
}
 
// ── Render Leaderboard ────────────────────────────────────────────────────────
 
let lbData = { default: null, pro: null };
let lbLeague = 'default';
 
async function renderLeaderboard() {
  const content = document.getElementById('tab-content');
  content.innerHTML = `
    <div class="page-header"><h1>Топ игроков</h1><p>Faceit Arena • Standoff 2</p></div>
    <div class="league-tabs">
      <button class="league-tab active" id="lb-tab-default" onclick="App.switchLbTab('default')">🎮 Default</button>
      <button class="league-tab" id="lb-tab-pro" onclick="App.switchLbTab('pro')">🏅 Pro League</button>
    </div>
    <div id="lb-body">${skeletonList(10)}</div>
  `;
  await loadLbData(lbLeague);
}
 
async function loadLbData(league) {
  if (lbData[league]) { renderLbBody(lbData[league], league); return; }
  document.getElementById('lb-body').innerHTML = skeletonList(10);
  try {
    const data = await apiGet(`/api/leaderboard?league=${league}`);
    lbData[league] = data;
    renderLbBody(data, league);
  } catch {
    document.getElementById('lb-body').innerHTML = `<div class="empty-state"><span class="emoji">⚠️</span><div class="title">Ошибка загрузки</div></div>`;
  }
}
 
function renderLbBody(data, league) {
  const top3 = data.slice(0, 3);
  const rest = data.slice(3);
  const myId = state.player?.id;
  const myPos = myId ? data.findIndex(d => d.id === myId) : -1;
 
  let html = '';
 
  // Podium — only if at least 3 players
  const showPodium = top3.length >= 3;
  if (showPodium) {
    const order = [top3[1], top3[0], top3[2]];
    const heights = [80, 110, 60];
    const medals = ['🥈', '🥇', '🥉'];
    const colors = ['#C0C0C0', '#FFD700', '#CD7F32'];
 
    html += `<div class="podium">`;
    order.forEach((entry, i) => {
      if (!entry) return;
      const isFirst = i === 1;
      const avatarSize = isFirst ? 60 : 50;
      const avFallback = `width:${avatarSize}px;height:${avatarSize}px;font-size:${isFirst?'22':'18'}px;background:linear-gradient(135deg,${colors[i]}30,${colors[i]}60);--tg-avatar-color:${colors[i]};border-color:${colors[i]};${isFirst ? `box-shadow:0 0 20px ${colors[i]}40` : ''}`;
      html += `
        <div class="podium-item" onclick="App.viewPlayer('${entry.gameNickname}')">
          <span class="podium-medal">${medals[i]}</span>
          <div class="podium-avatar-wrap" style="width:${avatarSize}px;height:${avatarSize}px">
            ${avatarHTML(entry.userId, entry.gameNickname, avFallback, 'podium-tg-avatar')}
          </div>
          <div class="podium-pedestal" style="height:${heights[i]}px;background:linear-gradient(180deg,${colors[i]}20,${colors[i]}08);border:1px solid ${colors[i]}20;border-bottom:none">
            <span class="podium-nick">${entry.gameNickname}</span>
            <span class="podium-elo" style="color:${colors[i]}">${entry.elo.toLocaleString('ru-RU')}</span>
          </div>
        </div>`;
    });
    html += `</div>`;
  }
 
  // My position banner
  if (myPos >= 3) {
    html += `
      <div class="my-pos-banner">
        <span class="my-pos-rank">#${myPos + 1}</span>
        <span class="my-pos-label">Ваша позиция</span>
      </div>`;
  }
 
  // Rest of list — if no podium, show everyone; otherwise from rank 4
  const listEntries = showPodium ? rest : data;
  html += `<div class="lb-list">`;
  listEntries.forEach((entry, i) => {
    const isMine = entry.id === myId;
    const lvlColor = getLevelColor(entry.level);
    const delay = Math.min(i * 30, 500);
    const avFallback = `background:${lvlColor}20;--tg-avatar-color:${lvlColor};border-color:${lvlColor}30`;
    html += `
      <div class="lb-row${isMine ? ' mine' : ''}" style="animation-delay:${delay}ms" onclick="App.viewPlayer('${entry.gameNickname}')">
        <span class="lb-rank">#${entry.rank}</span>
        ${avatarHTML(entry.userId, entry.gameNickname, avFallback, 'lb-tg-avatar')}
        <div class="lb-info">
          <div class="lb-name-row">
            <span class="lb-name">${entry.gameNickname}</span>
            ${entry.isPremium ? '<span style="font-size:10px;color:#FFD700">✨</span>' : ''}
            ${entry.hasProLeague ? '<span style="font-size:10px;color:#FFA500">🏅</span>' : ''}
          </div>
          <div class="lb-sub">
            ${levelBadgeHTML(entry.level, 'sm')}
            <span class="lb-sub-text">${entry.winRate}% WR • ${entry.totalMatches}М</span>
          </div>
        </div>
        <div class="lb-elo">
          <div class="lb-elo-val">${entry.elo.toLocaleString('ru-RU')}</div>
          <div class="lb-elo-lbl">ELO</div>
        </div>
      </div>`;
  });
  html += `</div>`;
 
  const body = document.getElementById('lb-body');
  if (body) { body.innerHTML = html; activateAvatars(body); }
}
 
// ── Render Search ─────────────────────────────────────────────────────────────
 
function renderSearch() {
  const content = document.getElementById('tab-content');
  content.innerHTML = `
    <div class="page-header"><h1>Поиск</h1><p>Найти игрока по нику</p></div>
    <div class="search-box" id="search-box">
      <svg class="spinner" id="search-spinner" viewBox="0 0 24 24" fill="none" style="display:none">
        <circle cx="12" cy="12" r="10" stroke="#3a3a3a" stroke-width="3"/>
        <path d="M12 2a10 10 0 0 1 10 10" stroke="#FFD700" stroke-width="3" stroke-linecap="round"/>
      </svg>
      <svg id="search-icon" width="18" height="18" viewBox="0 0 24 24" fill="none">
        <circle cx="11" cy="11" r="7" stroke="#6b7280" stroke-width="2"/>
        <path d="M20 20l-3-3" stroke="#6b7280" stroke-width="2" stroke-linecap="round"/>
      </svg>
      <input id="search-input" type="text" placeholder="Введите никнейм..." autocomplete="off" autocorrect="off" spellcheck="false"/>
      <button id="search-clear" class="search-clear" style="display:none" onclick="App.clearSearch()">✕</button>
    </div>
    <div id="search-results"></div>
  `;
 
  const input = document.getElementById('search-input');
  const box = document.getElementById('search-box');
 
  input.addEventListener('focus', () => box.classList.add('focused'));
  input.addEventListener('blur',  () => box.classList.remove('focused'));
  input.addEventListener('input', () => {
    App.onSearchInput(input.value);
  });
 
  renderSearchResults('', [], false);
}
 
let searchTimer = null;
let lastSearchQuery = '';
 
async function doSearch(q) {
  if (q.length < 2) { renderSearchResults(q, [], false); return; }
  const spinner = document.getElementById('search-spinner');
  const icon    = document.getElementById('search-icon');
  if (spinner) spinner.style.display = '';
  if (icon) icon.style.display = 'none';
  try {
    const results = await apiGet(`/api/search?q=${encodeURIComponent(q)}`);
    if (document.getElementById('search-input')?.value === q) {
      renderSearchResults(q, results, true);
    }
  } finally {
    if (spinner) spinner.style.display = 'none';
    if (icon) icon.style.display = '';
  }
}
 
function renderSearchResults(q, results, searched) {
  const container = document.getElementById('search-results');
  if (!container) return;
 
  if (!q) {
    container.innerHTML = `<div class="empty-state"><span class="emoji">👾</span><div class="title">Введите никнейм</div><div class="sub">минимум 2 символа</div></div>`;
    return;
  }
  if (searched && results.length === 0) {
    container.innerHTML = `<div class="empty-state"><span class="emoji">🔍</span><div class="title">Игрок не найден</div><div class="sub">«${q}»</div></div>`;
    return;
  }
  if (!searched) return;
 
  let html = `<div class="search-results"><div class="search-count">Найдено: ${results.length}</div>`;
  results.forEach((p, i) => {
    const lvlColor = getLevelColor(p.level);
    const delay = i * 40;
    const avFallback = `background:${lvlColor}18;--tg-avatar-color:${lvlColor};border-color:${lvlColor}30`;
    html += `
      <div class="search-row" style="animation-delay:${delay}ms" onclick="App.viewPlayer('${p.gameNickname}')">
        ${avatarHTML(p.userId, p.gameNickname, avFallback, 'search-tg-avatar')}
        <div class="search-info">
          <div class="search-name-row">
            <span class="search-name">${p.gameNickname}</span>
            ${p.isPremium ? '<span style="color:#FFD700;font-size:12px">✨</span>' : ''}
            ${p.hasProLeague ? '<span style="color:#FFA500;font-size:12px">🏅</span>' : ''}
          </div>
          <div class="search-sub">
            ${levelBadgeHTML(p.level, 'sm')}
            <span class="search-sub-text">${p.totalMatches} матчей</span>
          </div>
        </div>
        <div class="search-elo">
          <div class="search-elo-val">${p.elo.toLocaleString('ru-RU')}</div>
          <div class="search-elo-lbl">ELO</div>
        </div>
        <svg class="search-arrow" width="16" height="16" viewBox="0 0 24 24" fill="none">
          <path d="M9 18l6-6-6-6" stroke="#3a3a3a" stroke-width="2" stroke-linecap="round"/>
        </svg>
      </div>`;
  });
  html += '</div>';
  container.innerHTML = html;
  activateAvatars(container);
}
 
// ── Skeleton ──────────────────────────────────────────────────────────────────
 
function skeletonList(n) {
  return Array.from({ length: n }, () =>
    `<div style="height:64px;margin:0 16px 8px;border-radius:12px" class="skeleton"></div>`
  ).join('');
}
 
// ── Not registered ────────────────────────────────────────────────────────────
 
function renderNotRegistered() {
  document.getElementById('tab-content').innerHTML = `
    <div class="not-registered">
      <div class="nr-inner">
        <div class="nr-emoji">🎮</div>
        <h2>Профиль не найден</h2>
        <p>Зарегистрируйся в боте Faceit Arena, чтобы начать играть и видеть свою статистику</p>
        <div class="nr-hint">Напиши /start в боте</div>
      </div>
    </div>`;
}
 
// ── Tab switching ─────────────────────────────────────────────────────────────
 
function updateNavButtons(activeTab) {
  document.querySelectorAll('.nav-btn').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.tab === activeTab);
  });
}
 
// ── Main App object ───────────────────────────────────────────────────────────
 
window.App = {
 
  switchTab(tab) {
    hapticSelect();
    state.tab = tab;
    state.viewedNick = null;
    state.viewedPlayer = null;
    document.getElementById('back-btn').classList.add('hidden');
    updateNavButtons(tab);
 
    if (tab === 'profile') {
      if (state.player) renderPlayer(state.player);
      else renderNotRegistered();
    } else if (tab === 'leaderboard') {
      renderLeaderboard();
    } else if (tab === 'search') {
      renderSearch();
    } else if (tab === 'quests') {
      renderQuests();
    }
  },
 
  switchLbTab(league) {
    hapticSelect();
    lbLeague = league;
    document.querySelectorAll('.league-tab').forEach(b => b.classList.remove('active'));
    document.getElementById(`lb-tab-${league}`)?.classList.add('active');
    loadLbData(league);
  },
 
  async viewPlayer(nickname) {
    haptic('light');
    if (nickname === state.player?.gameNickname) {
      this.goBack(); return;
    }
    state.viewedNick = nickname;
    state.viewedPlayer = null;
    state.tab = 'profile';
    updateNavButtons('profile');
    document.getElementById('back-btn').classList.remove('hidden');
 
    // Show skeleton
    document.getElementById('tab-content').innerHTML = `
      <div style="height:40px"></div>
      <div style="height:160px" class="skeleton"></div>
      <div style="padding:16px">
        ${skeletonList(1).replace('margin:0 16px 8px', 'margin:8px 0').replace('height:64px','height:120px')}
        <div style="display:grid;grid-template-columns:repeat(4,1fr);gap:8px;margin-top:8px">
          ${Array(4).fill('<div style="height:64px;border-radius:12px" class="skeleton"></div>').join('')}
        </div>
      </div>`;
 
    try {
      const player = await apiGet(`/api/player/${encodeURIComponent(nickname)}`);
      state.viewedPlayer = player;
      renderPlayer(player);
    } catch {
      document.getElementById('tab-content').innerHTML = `
        <div class="not-registered" style="margin-top:60px">
          <div class="nr-inner">
            <div class="nr-emoji">😕</div>
            <h2>Игрок не найден</h2>
          </div>
        </div>`;
    }
  },
 
  goBack() {
    haptic('light');
    state.viewedNick = null;
    state.viewedPlayer = null;
    document.getElementById('back-btn').classList.add('hidden');
    if (state.player) renderPlayer(state.player);
    else renderNotRegistered();
  },
 
  clearSearch() {
    const input = document.getElementById('search-input');
    if (input) { input.value = ''; input.focus(); }
    document.getElementById('search-clear').style.display = 'none';
    renderSearchResults('', [], false);
  },
 
  onSearchInput(q) {
    const clearBtn = document.getElementById('search-clear');
    if (clearBtn) clearBtn.style.display = q ? '' : 'none';
 
    clearTimeout(searchTimer);
    if (q.length < 2) { renderSearchResults(q, [], false); return; }
    searchTimer = setTimeout(() => doSearch(q), 300);
  },
};
 
// ── Boot ──────────────────────────────────────────────────────────────────────
 
 
 
// ── Map Detail Modal ──────────────────────────────────────────────────────────
 
 
function attachMapCardHandlers(container) {
  container.querySelectorAll('.map-card[data-mapidx]').forEach(card => {
    card.addEventListener('click', () => {
      const idx = parseInt(card.dataset.mapidx);
      const m = window._mapStatsCache?.[idx];
      if (m) showMapDetail(m);
    });
  });
}
 
function showMapDetail(m) {
  haptic('light');
  const meta = getMapMeta(m.mapName);
  const kda = m.deaths > 0 ? ((m.kills + m.assists * 0.5) / m.deaths).toFixed(2) : String(m.kills);
  const wrCls = m.winRate >= 50 ? 'good' : 'bad';
  const ddRatio = m.deaths > 0 ? (m.kills / m.deaths).toFixed(2) : '∞';
  const avgDeaths = m.matches > 0 ? (m.deaths / m.matches).toFixed(1) : '0';
  const avgAssists = m.matches > 0 ? (m.assists / m.matches).toFixed(1) : '0';
  const modal = document.createElement('div');
  modal.style.cssText = 'position:fixed;inset:0;z-index:999;display:flex;align-items:flex-end;background:rgba(0,0,0,.6);backdrop-filter:blur(6px)';
  modal.innerHTML = `
    <div style="background:var(--card-bg);border-radius:20px 20px 0 0;width:100%;padding:20px 20px 36px;animation:slideUp .25s ease">
      <div style="width:36px;height:4px;background:rgba(255,255,255,.2);border-radius:2px;margin:0 auto 18px"></div>
      <div style="display:flex;align-items:center;gap:12px;margin-bottom:18px">
        <span style="font-size:36px">${meta.emoji}</span>
        <div>
          <div style="font-size:18px;font-weight:700">${meta.label}</div>
          <div style="font-size:13px;color:var(--text-secondary)">${m.matches} матчей сыграно</div>
        </div>
        <span class="wr-badge ${wrCls}" style="margin-left:auto">${m.winRate}% WR</span>
      </div>
      <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:10px;margin-bottom:14px">
        ${[
          ['Победы','#34C759',m.wins],
          ['Поражения','#FF3B30',m.losses],
          ['KDA',meta.color,kda],
          ['AVG Kills','#a0a0a0',m.avgKills.toFixed(1)],
          ['AVG Deaths','#a0a0a0',avgDeaths],
          ['AVG Assists','#a0a0a0',avgAssists],
        ].map(([lbl,clr,val]) => `
          <div style="background:rgba(255,255,255,.05);border-radius:12px;padding:12px;text-align:center">
            <div style="font-size:11px;color:var(--text-secondary);margin-bottom:4px">${lbl}</div>
            <div style="font-size:18px;font-weight:700;color:${clr}">${val}</div>
          </div>`).join('')}
      </div>
      <div style="background:rgba(255,255,255,.05);border-radius:12px;padding:14px;margin-bottom:14px">
        <div style="font-size:12px;color:var(--text-secondary);margin-bottom:8px">Прогресс побед</div>
        <div style="display:flex;justify-content:space-between;font-size:13px;margin-bottom:6px">
          <span style="color:#34C759">${m.wins} побед</span>
          <span style="color:#FF3B30">${m.losses} поражений</span>
        </div>
        <div style="background:rgba(255,255,255,.1);border-radius:6px;height:10px;overflow:hidden">
          <div style="background:linear-gradient(90deg,#34C759,#30D158);height:100%;width:${m.winRate}%;border-radius:6px;transition:width .6s ease"></div>
        </div>
      </div>
      <div style="font-size:13px;color:var(--text-secondary);text-align:center">Всего убийств: <b style="color:var(--text)">${m.kills}</b> • Смертей: <b style="color:var(--text)">${m.deaths}</b> • Ассисты: <b style="color:var(--text)">${m.assists}</b></div>
    </div>`;
  modal.addEventListener('click', e => { if (e.target === modal) modal.remove(); });
  document.body.appendChild(modal);
}
 
// ── Match History ─────────────────────────────────────────────────────────────
 
function renderMatchHistory(matches) {
  if (!matches || !matches.length) return '';
  const pills = matches.map(m => {
    const meta = getMapMeta(m.map);
    const clr = m.won ? '#34C759' : '#FF3B30';
    const bg  = m.won ? 'rgba(52,199,89,.15)' : 'rgba(255,59,48,.12)';
    const elo = m.eloChange >= 0 ? `+${m.eloChange}` : String(m.eloChange);
    const eloClr = m.eloChange > 0 ? '#34C759' : m.eloChange < 0 ? '#FF3B30' : '#888';
    return `
      <div style="background:${bg};border:1px solid ${clr}25;border-radius:10px;padding:8px 10px;min-width:54px;text-align:center;flex-shrink:0;cursor:pointer" title="${meta.label} ${m.scoreT}:${m.scoreCT}">
        <div style="font-size:11px;color:${clr};font-weight:700">${m.won ? 'W' : 'L'}</div>
        <div style="font-size:16px">${meta.emoji}</div>
        <div style="font-size:10px;color:${eloClr};font-weight:600">${elo}</div>
        <div style="font-size:9px;color:var(--text-secondary)">${m.kills}/${m.deaths}</div>
      </div>`;
  }).join('');
  return `
    <div class="map-section">
      <div class="section-title">История матчей</div>
      <div style="display:flex;gap:8px;overflow-x:auto;padding-bottom:4px;scrollbar-width:none">
        ${pills}
      </div>
    </div>`;
}
 
// ── Quests Tab ────────────────────────────────────────────────────────────────
 
async function renderQuests() {
  const content = document.getElementById('tab-content');
  content.innerHTML = `<div style="padding:16px">${skeletonList(3)}</div>`;
 
  let data;
  try {
    data = await apiPost('/api/quests', { initData: state.initData });
  } catch (e) {
    content.innerHTML = `<div class="not-registered" style="margin-top:60px"><div style="font-size:32px">⚠️</div><div>Ошибка загрузки заданий</div></div>`;
    return;
  }
 
  const { battlePass: bp, quests } = data;
 
  // ── BP Card
  let bpHtml = '';
  if (bp) {
    const prog = bp.bpWins;
    const total = bp.threshold;
    const pct = Math.min(100, Math.round((prog / total) * 100));
    const lvlColor = bp.isBought ? '#FFA500' : '#aaa';
    bpHtml = `
      <div class="bp-card" style="margin-bottom:16px">
        <div class="bp-row" style="margin-bottom:10px">
          <div>
            <div class="bp-meta">Battle Pass ${bp.isBought ? '⚔️' : '🆓'}</div>
            <div class="bp-level" style="font-size:20px;font-weight:700;color:${lvlColor}">
              Уровень ${bp.bpLevel} <span style="font-size:12px;color:var(--text-secondary);font-weight:400">/ ${bp.maxLevel}</span>
            </div>
          </div>
          ${bp.isBought ? '<span class="tag tag-premium" style="font-size:10px;padding:4px 8px;">⚔️ КУПЛЕН</span>' : ''}
        </div>
        <div style="background:rgba(255,255,255,0.08);border-radius:8px;height:8px;overflow:hidden;margin-bottom:6px">
          <div style="background:${lvlColor};height:100%;width:${pct}%;transition:width 0.6s ease;border-radius:8px"></div>
        </div>
        <div style="display:flex;justify-content:space-between;font-size:12px;color:var(--text-secondary);margin-bottom:14px">
          <span>${prog} / ${total} побед</span>
          <span style="color:${lvlColor}">${bp.winsToNext} до след. уровня</span>
        </div>
        <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:8px;margin-bottom:10px">
          ${[['Уровень', lvlColor, bp.bpLevel + ' / ' + bp.maxLevel],['Побед сыграно', '#a0a0a0', prog],['След. награда', '#FFA500', (bp.isBought ? [20,30,40,50] : [10,15,20,25])[bp.bpLevel % 4] + ' ACF']].map(([l,c,v]) => `<div style="background:rgba(255,255,255,.05);border-radius:10px;padding:10px;text-align:center"><div style="font-size:10px;color:var(--text-secondary);margin-bottom:3px">${l}</div><div style="font-size:15px;font-weight:700;color:${c}">${v}</div></div>`).join('')}
        </div>
        ${!bp.isBought ? `<div style="font-size:11px;color:#888;text-align:center;padding:6px 0">💡 Купи Battle Pass для увеличенных наград</div>` : `<div style="font-size:11px;color:#FFA500;text-align:center;padding:6px 0">⚔️ Расширенные награды активны</div>`}
      </div>`;
  }
 
  // ── Quest cards
  const statusLabel = { active: '', completed: '✅ Выполнено', claimed: '🎁 Получено' };
  const statusColor = { active: 'var(--text-secondary)', completed: '#4CAF50', claimed: '#888' };
 
  const questsHtml = quests.length ? quests.map(q => {
    const pct = Math.min(100, Math.round(((q.progress || 0) / q.target) * 100));
    const isDone = q.status !== 'active';
    return `
      <div style="background:var(--card-bg);border-radius:14px;padding:14px 16px;margin-bottom:10px;opacity:${q.status==='claimed'?0.5:1}">
        <div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:8px">
          <div style="display:flex;align-items:center;gap:10px">
            <div style="font-size:26px">${q.icon}</div>
            <div>
              <div style="font-weight:600;font-size:14px">${q.title}</div>
              <div style="font-size:12px;color:${statusColor[q.status]};margin-top:2px">
                ${statusLabel[q.status] || `${q.progress || 0} / ${q.target}`}
              </div>
            </div>
          </div>
          <div style="text-align:right;flex-shrink:0">
            <div style="font-weight:700;color:#FFA500;font-size:14px">+${q.reward} ACF</div>
          </div>
        </div>
        ${!isDone ? `
          <div style="background:rgba(255,255,255,0.08);border-radius:6px;height:6px;overflow:hidden">
            <div style="background:#FFA500;height:100%;width:${pct}%;border-radius:6px;transition:width 0.5s ease"></div>
          </div>` : ''}
      </div>`;
  }).join('') : `<div style="text-align:center;color:var(--text-secondary);padding:24px">Задания ещё не созданы</div>`;
 
  content.innerHTML = `
    <div style="padding:16px 16px 80px">
      <div style="font-size:18px;font-weight:700;margin-bottom:14px">📋 Задания</div>
      ${bpHtml}
      <div style="font-size:13px;color:var(--text-secondary);margin-bottom:10px;font-weight:600;text-transform:uppercase;letter-spacing:.5px">Ежедневные задания</div>
      ${questsHtml}
    </div>`;
}
 
async function boot() {
  const splash = document.getElementById('splash');
  const app    = document.getElementById('app');
 
  try {
    const initData = tg?.initData || '';
 
    if (!initData) {
      // Dev mode — no Telegram
      splash.classList.add('fade-out');
      app.classList.remove('hidden');
      renderNotRegistered();
      return;
    }
 
    const data = await apiPost('/api/me', { initData });
    state.player = data.player;
    state.tgUser = data.tgUser;
    state.initData = initData;
 
    splash.classList.add('fade-out');
    app.classList.remove('hidden');
    renderPlayer(data.player);
    activateAvatars(document.getElementById('tab-content'));
 
  } catch (e) {
    splash.classList.add('fade-out');
    app.classList.remove('hidden');
 
    if (e.status === 404) renderNotRegistered();
    else {
      document.getElementById('tab-content').innerHTML = `
        <div class="not-registered">
          <div class="nr-inner">
            <div class="nr-emoji">⚠️</div>
            <h2>Ошибка подключения</h2>
            <p>Не удалось загрузить данные. Проверь подключение.</p>
          </div>
        </div>`;
    }
  }
}
 
boot();
