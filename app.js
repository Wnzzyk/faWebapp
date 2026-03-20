const API_BASE = 'https://faceit-api.wenzzyk.workers.dev'; 


// ── State ─────────────────────────────────────────────────────────────────────

const state = {
  player: null,
  tgUser: null,
  tab: 'profile',
  viewedNick: null,
  viewedPlayer: null,
  initData: '',
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

// ── Theme ─────────────────────────────────────────────────────────────────────

function applyTheme() {
  const scheme = tg?.colorScheme || 'dark';
  const root = document.documentElement;
  if (scheme === 'light') {
    root.style.setProperty('--bg',             '#f0f2f5');
    root.style.setProperty('--card-bg',        '#ffffff');
    root.style.setProperty('--card-hover',     '#f5f5f5');
    root.style.setProperty('--border',         'rgba(0,0,0,0.08)');
    root.style.setProperty('--text',           '#111111');
    root.style.setProperty('--text-secondary', '#666666');
    root.style.setProperty('--nav-bg',         'rgba(240,242,245,0.97)');
    root.style.setProperty('--skeleton',       '#e0e0e0');
    root.style.setProperty('--input-bg',       '#ffffff');
    root.style.setProperty('--modal-bg',       '#ffffff');
    try { tg.setHeaderColor('#f0f2f5'); tg.setBackgroundColor('#f0f2f5'); } catch {}
  } else {
    root.style.setProperty('--bg',             '#0d0d0d');
    root.style.setProperty('--card-bg',        '#1a1a1a');
    root.style.setProperty('--card-hover',     '#222222');
    root.style.setProperty('--border',         'rgba(255,255,255,0.06)');
    root.style.setProperty('--text',           '#ffffff');
    root.style.setProperty('--text-secondary', '#a0a0a0');
    root.style.setProperty('--nav-bg',         'rgba(13,13,13,0.95)');
    root.style.setProperty('--skeleton',       '#252525');
    root.style.setProperty('--input-bg',       '#1a1a1a');
    root.style.setProperty('--modal-bg',       '#1a1a1a');
    try { tg.setHeaderColor('#0d0d0d'); tg.setBackgroundColor('#0d0d0d'); } catch {}
  }
}
applyTheme();
try { tg?.onEvent('themeChanged', applyTheme); } catch {}

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

function avatarHTML(userId, nickname, fallbackStyle = '', cls = '') {
  const letter = (nickname || '?')[0].toUpperCase();
  if (userId) {
    const src = `${API_BASE}/api/telegram-avatar?user_id=${userId}`;
    return `<div class="tg-avatar ${cls}" style="${fallbackStyle}" data-letter="${letter}" data-src="${src}"></div>`;
  }
  return `<div class="tg-avatar ${cls}" style="${fallbackStyle}" data-letter="${letter}"></div>`;
}

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
    else element.dataset.from = to;
  }
  requestAnimationFrame(step);
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
  return MAP_META[key] || { label: name || '?', color: '#FFD700', emoji: '🗺️' };
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

// ── Favourites ────────────────────────────────────────────────────────────────

function getFavs() {
  try { return JSON.parse(sessionStorage.getItem('fa_favs') || '[]'); } catch { return []; }
}
function saveFavs(arr) {
  try { sessionStorage.setItem('fa_favs', JSON.stringify(arr.slice(0, 20))); } catch {}
}
function isFav(nick) {
  return getFavs().some(f => f.gameNickname === nick);
}
function toggleFav(player) {
  haptic('medium');
  let favs = getFavs();
  if (favs.some(f => f.gameNickname === player.gameNickname)) {
    favs = favs.filter(f => f.gameNickname !== player.gameNickname);
  } else {
    favs.unshift({
      gameNickname: player.gameNickname,
      userId: player.userId,
      level: player.level,
      elo: player.elo,
      isPremium: player.isPremium,
      hasProLeague: player.hasProLeague,
      totalMatches: player.totalMatches,
    });
  }
  saveFavs(favs);
  return isFav(player.gameNickname);
}

// ── Profile config ────────────────────────────────────────────────────────────

const DEFAULT_BLOCKS = ['stats', 'matches', 'maps', 'battlepass'];

function getProfileConfig() {
  try { return JSON.parse(sessionStorage.getItem('fa_profile_cfg') || 'null') || DEFAULT_BLOCKS; }
  catch { return [...DEFAULT_BLOCKS]; }
}
function saveProfileConfig(blocks) {
  try { sessionStorage.setItem('fa_profile_cfg', JSON.stringify(blocks)); } catch {}
}

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
  const avgDeaths = m.matches > 0 ? (m.deaths / m.matches).toFixed(1) : '0';
  const avgAssists = m.matches > 0 ? (m.assists / m.matches).toFixed(1) : '0';
  const modal = document.createElement('div');
  modal.style.cssText = 'position:fixed;inset:0;z-index:999;display:flex;align-items:flex-end;background:rgba(0,0,0,.6);backdrop-filter:blur(6px)';
  modal.innerHTML = `
    <div style="background:var(--modal-bg);border-radius:20px 20px 0 0;width:100%;padding:20px 20px 36px;animation:slideUp .25s ease">
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
    </div>`;
  modal.addEventListener('click', e => { if (e.target === modal) modal.remove(); });
  document.body.appendChild(modal);
}

// ── Match History pills ───────────────────────────────────────────────────────

function renderMatchHistory(matches) {
  if (!matches || !matches.length) return '';
  const pills = matches.map(m => {
    const meta = getMapMeta(m.map);
    const clr = m.won ? '#34C759' : '#FF3B30';
    const bg  = m.won ? 'rgba(52,199,89,.15)' : 'rgba(255,59,48,.12)';
    const elo = m.eloChange >= 0 ? `+${m.eloChange}` : String(m.eloChange);
    const eloClr = m.eloChange > 0 ? '#34C759' : m.eloChange < 0 ? '#FF3B30' : '#888';
    // Bug 8: league badge
    const leagueBadge = m.isProLeague
      ? `<div style="font-size:8px;color:#FFA500;font-weight:700;line-height:1.2">PRO</div>`
      : `<div style="font-size:8px;color:#a0a0a0;line-height:1.2">DEF</div>`;
    return `
      <div class="match-pill" data-matchid="${m.matchId}"
           style="background:${bg};border:1px solid ${clr}25;border-radius:10px;padding:8px 10px;min-width:54px;text-align:center;flex-shrink:0;cursor:pointer">
        <div style="font-size:11px;color:${clr};font-weight:700">${m.won ? 'W' : 'L'}</div>
        <div style="font-size:16px">${meta.emoji}</div>
        <div style="font-size:10px;color:${eloClr};font-weight:600">${elo}</div>
        <div style="font-size:9px;color:var(--text-secondary)">${m.kills}/${m.deaths}</div>
        ${leagueBadge}
      </div>`;
  }).join('');
  return `
    <div class="map-section">
      <div class="section-title">История матчей</div>
      <div id="match-history-pills" style="display:flex;gap:8px;overflow-x:auto;padding-bottom:4px;scrollbar-width:none">
        ${pills}
      </div>
    </div>`;
}

function attachMatchPillHandlers(container) {
  container.querySelectorAll('.match-pill[data-matchid]').forEach(pill => {
    pill.addEventListener('click', () => {
      const matchId = pill.dataset.matchid;
      if (matchId && matchId !== 'undefined') App.openMatchDetail(matchId);
    });
  });
}

// ── Match Detail Modal ────────────────────────────────────────────────────────

async function openMatchDetail(matchId) {
  haptic('light');

  // Show loading modal immediately
  const modal = document.createElement('div');
  modal.id = 'match-modal';
  modal.style.cssText = 'position:fixed;inset:0;z-index:999;display:flex;align-items:flex-end;background:rgba(0,0,0,.65);backdrop-filter:blur(8px)';
  modal.innerHTML = `
    <div style="background:var(--modal-bg);border-radius:20px 20px 0 0;width:100%;padding:20px 20px 40px;max-height:85vh;overflow-y:auto">
      <div style="width:36px;height:4px;background:rgba(255,255,255,.2);border-radius:2px;margin:0 auto 18px"></div>
      <div style="text-align:center;padding:30px;color:var(--text-secondary)">Загрузка матча...</div>
    </div>`;
  modal.addEventListener('click', e => { if (e.target === modal) modal.remove(); });
  document.body.appendChild(modal);

  try {
    const m = await apiGet(`/api/match/${matchId}`);
    const meta = getMapMeta(m.map);
    const winnerT  = m.winner === 'T';
    const winnerCT = m.winner === 'CT';

    function teamHTML(players, side, won) {
      const sideColor = side === 'T' ? '#FF8C00' : '#4FC3F7';
      const wonStr = won ? `<span style="color:#34C759;font-size:11px;font-weight:700">ПОБЕДА</span>` : `<span style="color:#FF3B30;font-size:11px;font-weight:700">ПОРАЖЕНИЕ</span>`;
      return `
        <div style="margin-bottom:16px">
          <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px;padding:0 2px">
            <div style="font-size:12px;font-weight:700;color:${sideColor};letter-spacing:.5px">
              ${side === 'T' ? '⚔️ Атака (T)' : '🛡️ Защита (CT)'}
            </div>
            ${wonStr}
          </div>
          ${players.map(p => {
            const lvlColor = getLevelColor(p.level);
            const kdClr = parseFloat(p.kd) >= 1.5 ? '#34C759' : parseFloat(p.kd) >= 1 ? '#FFD700' : '#FF3B30';
            const eloStr = p.eloChange >= 0 ? `+${p.eloChange}` : String(p.eloChange);
            const eloClr = p.eloChange > 0 ? '#34C759' : p.eloChange < 0 ? '#FF3B30' : '#888';
            const avStyle = `background:${lvlColor}20;--tg-avatar-color:${lvlColor};border-color:${lvlColor}30`;
            return `
              <div style="display:flex;align-items:center;gap:10px;padding:8px 10px;border-radius:10px;background:rgba(255,255,255,.04);margin-bottom:4px;cursor:pointer"
                   onclick="modal.remove();App.viewPlayer('${p.gameNickname}')">
                ${avatarHTML(p.userId, p.gameNickname, avStyle, 'match-av')}
                <div style="flex:1;min-width:0">
                  <div style="font-weight:600;font-size:13px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">
                    ${p.gameNickname}
                    ${p.isHost ? '<span style="font-size:10px;color:#FFD700"> 👑</span>' : ''}
                  </div>
                  <div style="font-size:11px;color:var(--text-secondary)">${levelBadgeHTML(p.level,'sm')}</div>
                </div>
                <div style="text-align:center;min-width:48px">
                  <div style="font-size:14px;font-weight:700;color:${kdClr}">${p.kills}/${p.deaths}/${p.assists}</div>
                  <div style="font-size:10px;color:var(--text-secondary)">KDA ${p.kd}</div>
                </div>
                <div style="text-align:right;min-width:36px">
                  <div style="font-size:13px;font-weight:700;color:${eloClr}">${eloStr}</div>
                  <div style="font-size:10px;color:var(--text-secondary)">ELO</div>
                </div>
              </div>`;
          }).join('')}
        </div>`;
    }

    const finDate = m.finishedAt
      ? new Date(m.finishedAt).toLocaleDateString('ru-RU', { day:'numeric', month:'short', hour:'2-digit', minute:'2-digit' })
      : '';

    // Bug 8: league label badge
    const leagueBadgeHTML = m.isProLeague
      ? `<span style="display:inline-block;padding:2px 7px;border-radius:5px;background:rgba(255,165,0,.15);color:#FFA500;font-size:10px;font-weight:700;border:1px solid rgba(255,165,0,.3)">🏅 Pro League</span>`
      : `<span style="display:inline-block;padding:2px 7px;border-radius:5px;background:rgba(255,255,255,.07);color:#a0a0a0;font-size:10px;font-weight:600;border:1px solid rgba(255,255,255,.1)">🎮 Default</span>`;

    const sheet = modal.querySelector('div[style*="border-radius:20px"]');
    sheet.innerHTML = `
      <div style="width:36px;height:4px;background:rgba(255,255,255,.2);border-radius:2px;margin:0 auto 18px"></div>

      <!-- Header: map + score -->
      <div style="display:flex;align-items:center;gap:14px;margin-bottom:20px">
        <div style="font-size:40px;line-height:1">${meta.emoji}</div>
        <div style="flex:1">
          <div style="font-size:17px;font-weight:700">${meta.label}</div>
          <div style="font-size:12px;color:var(--text-secondary);margin-top:2px">${m.matchNumber || ''} ${finDate ? '• ' + finDate : ''}</div>
          <div style="margin-top:5px">${leagueBadgeHTML}</div>
        </div>
        <div style="text-align:center">
          <div style="font-size:28px;font-weight:900;letter-spacing:2px;line-height:1">
            <span style="color:${winnerT?'#34C759':'#FF3B30'}">${m.scoreT}</span>
            <span style="color:var(--text-secondary);font-size:18px">:</span>
            <span style="color:${winnerCT?'#34C759':'#FF3B30'}">${m.scoreCT}</span>
          </div>
          <div style="font-size:10px;color:var(--text-secondary)">T : CT</div>
        </div>
      </div>

      <!-- Teams -->
      ${teamHTML(m.teamT, 'T', winnerT)}
      ${teamHTML(m.teamCT, 'CT', winnerCT)}
    `;

    // Make modal var accessible inside onclick
    window._currentMatchModal = modal;
    sheet.querySelectorAll('[onclick]').forEach(el => {
      const orig = el.getAttribute('onclick');
      el.setAttribute('onclick', orig.replace('modal.remove()', 'window._currentMatchModal?.remove()'));
    });

    activateAvatars(sheet);

  } catch(e) {
    const sheet = modal.querySelector('div[style*="border-radius:20px"]');
    if (sheet) sheet.innerHTML = `
      <div style="width:36px;height:4px;background:rgba(255,255,255,.2);border-radius:2px;margin:0 auto 18px"></div>
      <div style="text-align:center;padding:30px;color:#FF3B30">Ошибка загрузки матча</div>`;
  }
}

// ── ELO Chart ─────────────────────────────────────────────────────────────────

async function renderEloChart(playerId) {
  const container = document.createElement('div');
  container.className = 'map-section';
  container.innerHTML = `
    <div class="section-title" style="display:flex;justify-content:space-between;align-items:center">
      <span>График ELO</span>
      <span style="font-size:11px;color:var(--text-secondary)" id="elo-chart-status">Загрузка...</span>
    </div>
    <div id="elo-chart-wrap" style="height:120px;display:flex;align-items:center;justify-content:center">
      <div class="skeleton" style="width:100%;height:100%;border-radius:8px"></div>
    </div>`;

  try {
    const points = await apiGet(`/api/elo-history/${playerId}`);
    const status = container.querySelector('#elo-chart-status');

    if (!points || points.length < 2) {
      if (status) status.textContent = '';
      container.querySelector('#elo-chart-wrap').innerHTML =
        `<div style="color:var(--text-secondary);font-size:13px">Недостаточно данных</div>`;
      return container;
    }

    const elos = points.map(p => p.elo);
    const min = Math.min(...elos);
    const max = Math.max(...elos);
    const range = max - min || 1;
    const W = 320, H = 100, PAD = 8;

    // Build SVG path
    const pts = points.map((p, i) => {
      const x = PAD + (i / (points.length - 1)) * (W - PAD * 2);
      const y = H - PAD - ((p.elo - min) / range) * (H - PAD * 2);
      return [x, y];
    });

    const pathD = pts.map((p, i) => `${i === 0 ? 'M' : 'L'}${p[0].toFixed(1)},${p[1].toFixed(1)}`).join(' ');
    const fillD = `${pathD} L${pts[pts.length-1][0].toFixed(1)},${H} L${pts[0][0].toFixed(1)},${H} Z`;

    const firstElo = points[0].elo;
    const lastElo  = points[points.length - 1].elo;
    const diff = lastElo - firstElo;
    const diffStr = diff >= 0 ? `+${diff}` : String(diff);
    const trendColor = diff >= 0 ? '#34C759' : '#FF3B30';

    if (status) {
      status.textContent = diffStr + ' ELO за период';
      status.style.color = trendColor;
    }

    const svgHtml = `
      <svg viewBox="0 0 ${W} ${H}" width="100%" height="${H}" style="overflow:visible">
        <defs>
          <linearGradient id="eloGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stop-color="${trendColor}" stop-opacity="0.3"/>
            <stop offset="100%" stop-color="${trendColor}" stop-opacity="0"/>
          </linearGradient>
        </defs>
        <!-- Grid lines -->
        ${[0.25,0.5,0.75].map(t => {
          const y = PAD + t * (H - PAD*2);
          const elo = Math.round(max - t * range);
          return `<line x1="${PAD}" y1="${y.toFixed(1)}" x2="${W-PAD}" y2="${y.toFixed(1)}"
            stroke="rgba(255,255,255,.06)" stroke-width="1"/>
            <text x="${PAD}" y="${(y-3).toFixed(1)}" fill="rgba(255,255,255,.25)" font-size="9">${elo}</text>`;
        }).join('')}
        <!-- Fill -->
        <path d="${fillD}" fill="url(#eloGrad)"/>
        <!-- Line -->
        <path d="${pathD}" fill="none" stroke="${trendColor}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
        <!-- End dot -->
        <circle cx="${pts[pts.length-1][0].toFixed(1)}" cy="${pts[pts.length-1][1].toFixed(1)}"
          r="4" fill="${trendColor}" stroke="var(--modal-bg)" stroke-width="2"/>
        <!-- Labels -->
        <text x="${PAD}" y="${H}" fill="rgba(255,255,255,.3)" font-size="9">${firstElo}</text>
        <text x="${W-PAD}" y="${H}" fill="${trendColor}" font-size="9" text-anchor="end" font-weight="700">${lastElo}</text>
      </svg>`;

    container.querySelector('#elo-chart-wrap').innerHTML = svgHtml;
  } catch {
    container.querySelector('#elo-chart-wrap').innerHTML =
      `<div style="color:var(--text-secondary);font-size:13px">Не удалось загрузить</div>`;
  }

  return container;
}

// ── Profile config modal ──────────────────────────────────────────────────────

function showProfileConfig() {
  haptic('light');
  const blocks = getProfileConfig();
  const ALL = [
    { id: 'stats',     label: '📊 Статистика',         required: true },
    { id: 'matches',   label: '🎮 История матчей' },
    { id: 'elo',       label: '📈 График ELO' },
    { id: 'maps',      label: '🗺️ Карты' },
    { id: 'battlepass',label: '⚔️ Battle Pass' },
  ];

  const modal = document.createElement('div');
  modal.style.cssText = 'position:fixed;inset:0;z-index:999;display:flex;align-items:flex-end;background:rgba(0,0,0,.65);backdrop-filter:blur(8px)';

  function renderRows() {
    return ALL.map(b => {
      const on = blocks.includes(b.id);
      return `
        <div style="display:flex;align-items:center;justify-content:space-between;padding:12px 0;border-bottom:1px solid var(--border)"
             data-blockid="${b.id}">
          <span style="font-size:14px;color:${b.required?'var(--text-secondary)':'var(--text)'}">${b.label}${b.required?' (обязательно)':''}</span>
          <div class="toggle-btn" style="width:44px;height:26px;border-radius:13px;background:${on?'#34C759':'rgba(255,255,255,.12)'};
               position:relative;cursor:pointer;transition:background .2s;flex-shrink:0" data-blockid="${b.id}">
            <div style="position:absolute;top:3px;left:${on?'21px':'3px'};width:20px;height:20px;border-radius:50%;
                 background:white;transition:left .2s;box-shadow:0 1px 4px rgba(0,0,0,.3)"></div>
          </div>
        </div>`;
    }).join('');
  }

  modal.innerHTML = `
    <div id="cfg-sheet" style="background:var(--modal-bg);border-radius:20px 20px 0 0;width:100%;padding:20px 20px 40px">
      <div style="width:36px;height:4px;background:rgba(255,255,255,.2);border-radius:2px;margin:0 auto 18px"></div>
      <div style="font-size:16px;font-weight:700;margin-bottom:16px">⚙️ Настройка профиля</div>
      <div id="cfg-rows">${renderRows()}</div>
      <button onclick="this.closest('[style*=fixed]').remove();App._applyProfileConfig()"
              style="width:100%;margin-top:20px;padding:14px;border-radius:12px;background:#FFD700;color:#000;
                     font-weight:700;font-size:15px;border:none;cursor:pointer">
        Применить
      </button>
    </div>`;

  modal.querySelectorAll('.toggle-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      hapticSelect();
      const id = btn.dataset.blockid;
      const allItem = ALL.find(b => b.id === id);
      if (allItem?.required) return;
      const idx = blocks.indexOf(id);
      if (idx >= 0) blocks.splice(idx, 1);
      else blocks.push(id);
      saveProfileConfig([...blocks]);
      const sheet = modal.querySelector('#cfg-rows');
      sheet.innerHTML = renderRows();
      modal.querySelectorAll('.toggle-btn').forEach(b2 => {
        b2.addEventListener('click', arguments.callee);
      });
    });
  });

  modal.addEventListener('click', e => { if (e.target === modal) { modal.remove(); App._applyProfileConfig(); } });
  document.body.appendChild(modal);
}

// ── Render PlayerStats block ──────────────────────────────────────────────────

function renderPlayerStats(p, isProTab = false) {
  const data = isProTab ? p.proLeague : p;
  if (!data) return '';

  const mapStats = isProTab ? (p.proLeague?.mapStats || []) : (p.mapStats || []);
  const mapTitle = isProTab ? 'Карты — Pro League' : 'Статистика по картам';
  const eloCardClass = isProTab ? 'elo-card pro' : 'elo-card';
  const eloLabel = isProTab
    ? `Pro League ELO <span style="font-size:10px;padding:2px 6px;border-radius:4px;background:rgba(255,140,0,.15);color:#FFA500;font-weight:700;margin-left:8px">#${data.rank}</span>`
    : 'ELO рейтинг';

  const cfg = getProfileConfig();

  // Приватность: скрывать ELO и stats только для своего профиля
  const isSelf   = !state.viewedNick || state.viewedNick === state.player?.gameNickname;
  const _hideElo   = isSelf && !!p.hideElo;
  const _hideStats = isSelf && !!p.hideStats;

  const eloBlock = _hideElo
    ? `<div class="${eloCardClass}"><div class="elo-label">${eloLabel}</div>
        <div style="padding:12px 0;color:var(--text-secondary);font-size:13px">🔒 ELO скрыт</div></div>`
    : `<div class="${eloCardClass}">
        <div class="elo-label">${eloLabel}</div>
        <div class="elo-row">
          <span class="elo-value"><span data-value="${data.elo ?? data.eloRaw ?? 0}">0</span></span>
          <div class="elo-meta">
            <div>Лучшая серия: <b>${data.bestStreak}</b></div>
            <div>Текущая серия: <b>${data.winStreak}</b></div>
          </div>
        </div>
      </div>`;

  const statsBlock = _hideStats
    ? `<div class="stats-grid" style="opacity:.5">
        <div class="stat-card" style="grid-column:1/-1;text-align:center;color:var(--text-secondary)">
          🔒 Статистика скрыта
        </div>
      </div>`
    : `<div class="stats-grid">
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
          <div class="value"><span data-value="${data.kd ?? 0}" data-decimals="2">0</span></div>
        </div>
        <div class="ring-card" style="position:relative">
          ${ringChartHTML(data.winRate ?? 0, 52, 5)}
        </div>
      </div>`;

  return `
    ${eloBlock}
    ${statsBlock}

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

    ${!isProTab && cfg.includes('matches') && p.recentMatches?.length ? renderMatchHistory(p.recentMatches) : ''}

    ${cfg.includes('maps') && mapStats.length ? `
    <div class="map-section">
      <div class="section-title">${mapTitle}</div>
      <div class="map-list">
        ${(() => { window._mapStatsCache = mapStats; return mapStats; })().map((m, idx) => {
          const meta = getMapMeta(m.mapName);
          const kda = m.deaths > 0 ? ((m.kills + m.assists * 0.5) / m.deaths).toFixed(2) : String(m.kills);
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

// ── Render Player ─────────────────────────────────────────────────────────────

async function renderPlayer(player) {
  const bannerGradient = levelGradient(player.level);
  const bannerBg = player.bannerFileId
    ? `<div class="banner-bg banner-img-wrap" data-file-id="${player.bannerFileId}" data-gradient="${bannerGradient}"></div>`
    : `<div class="banner-bg" style="background:${bannerGradient}"></div>`;

  const rankColor = player.rank <= 3 ? '#FFD700' : '#ffffff';
  const lvlColor = getLevelColor(player.level);
  const avatarFallbackStyle = `background:${lvlColor}18;--tg-avatar-color:${lvlColor};border-color:${lvlColor}40`;
  const isViewed = !!(state.viewedNick && state.viewedNick !== state.player?.gameNickname);

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
        <div style="display:flex;flex-direction:column;align-items:flex-end;gap:6px">
          <div style="text-align:right">
            <div class="rank-label">РЕЙТИНГ</div>
            <div class="rank-num" style="color:${rankColor}">#${player.rank}</div>
          </div>
          <div style="display:flex;gap:6px">
            ${isViewed ? `
              <button id="compare-btn" onclick="App.openCompare('${player.gameNickname}')"
                style="background:rgba(79,195,247,.15);border:1px solid rgba(79,195,247,.3);border-radius:8px;
                       padding:4px 8px;font-size:11px;color:#4FC3F7;cursor:pointer">⚖️ Сравнить</button>
              <button id="fav-btn" onclick="App.toggleFavBtn()"
                style="background:${isFav(player.gameNickname)?'rgba(255,215,0,.2)':'rgba(255,255,255,.08)'};
                       border:1px solid ${isFav(player.gameNickname)?'rgba(255,215,0,.4)':'rgba(255,255,255,.15)'};
                       border-radius:8px;padding:4px 10px;font-size:12px;
                       color:${isFav(player.gameNickname)?'#FFD700':'#a0a0a0'};cursor:pointer">
                ${isFav(player.gameNickname) ? '★' : '☆'}
              </button>` : `
              <button onclick="App.showProfileConfig()"
                style="background:rgba(255,255,255,.08);border:1px solid rgba(255,255,255,.12);border-radius:8px;
                       padding:4px 10px;font-size:12px;color:#a0a0a0;cursor:pointer">⚙️</button>`}
          </div>
        </div>
      </div>
    </div>
  `;

  // League tabs
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
    attachMatchPillHandlers(statsDiv);

    tabsDiv.querySelectorAll('.league-tab').forEach(btn => {
      btn.addEventListener('click', () => {
        hapticSelect();
        currentTab = btn.dataset.t;
        tabsDiv.querySelectorAll('.league-tab').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        statsDiv.innerHTML = renderPlayerStats(player, currentTab === 'pro');
        attachMapCardHandlers(statsDiv);
        attachMatchPillHandlers(statsDiv);
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
    attachMatchPillHandlers(statsDiv);
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

  // Battle Pass
  const cfg = getProfileConfig();
  if (cfg.includes('battlepass') && player.battlePass) {
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

  // Season card
  if (player.season) {
    const s = player.season;
    const sWr = s.matches > 0 ? Math.round(s.wins / s.matches * 100) : 0;
    const sKd = s.deaths > 0 ? (s.kills / s.deaths).toFixed(2) : String(s.kills || 0);
    const sDiv = el('div', 'bp-card');
    sDiv.innerHTML = `
      <div class="bp-row">
        <div>
          <div class="bp-meta">🏆 Сезон ${s.name}</div>
          <div class="bp-level">
            Матчей: <b>${s.matches}</b> &nbsp;·&nbsp;
            Побед: <b>${s.wins}</b> &nbsp;·&nbsp;
            WR: <b>${sWr}%</b>
          </div>
          <div style="font-size:11px;color:var(--text-secondary);margin-top:4px">
            Пик ELO: <b style="color:#FFD700">${s.eloPeak}</b> &nbsp;·&nbsp;
            K/D: <b>${sKd}</b>
          </div>
        </div>
        <span class="tag" style="background:rgba(255,215,0,.15);color:#FFD700;border-color:rgba(255,215,0,.3);font-size:10px;padding:4px 8px;white-space:nowrap">
          🔥 АКТИВНЫЙ
        </span>
      </div>
    `;
    container.appendChild(sDiv);
  }

  const dateDiv = el('div', 'joined-date');
  dateDiv.textContent = `В Faceit Arena с ${formatDate(player.createdAt)}`;
  container.appendChild(dateDiv);

  const pad = el('div', '', '');
  pad.style.height = '24px';
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

  // ELO chart — async inject after render
  if (cfg.includes('elo') && player.id) {
    const statsDiv = wrap.querySelector('.league-stats') || wrap.querySelector('div:not(.player-banner):not(.league-tabs):not(.extra-card):not(.bp-card):not(.joined-date)');
    const matchSection = wrap.querySelector('.map-section');
    renderEloChart(player.id).then(chartEl => {
      if (matchSection && matchSection.parentNode) {
        matchSection.parentNode.insertBefore(chartEl, matchSection.nextSibling);
      } else if (statsDiv) {
        statsDiv.appendChild(chartEl);
      }
    });
  }
}

// ── Compare Players ───────────────────────────────────────────────────────────

async function openCompare(nick2) {
  haptic('light');
  if (!state.player) return;

  const modal = document.createElement('div');
  modal.style.cssText = 'position:fixed;inset:0;z-index:999;display:flex;align-items:flex-end;background:rgba(0,0,0,.7);backdrop-filter:blur(8px)';
  modal.innerHTML = `
    <div style="background:var(--modal-bg);border-radius:20px 20px 0 0;width:100%;padding:20px 20px 44px;max-height:90vh;overflow-y:auto">
      <div style="width:36px;height:4px;background:rgba(255,255,255,.2);border-radius:2px;margin:0 auto 18px"></div>
      <div style="text-align:center;padding:24px;color:var(--text-secondary)">Загрузка сравнения...</div>
    </div>`;
  modal.addEventListener('click', e => { if (e.target === modal) modal.remove(); });
  document.body.appendChild(modal);

  try {
    const [p1, p2] = await Promise.all([
      Promise.resolve(state.player),
      apiGet(`/api/player/${encodeURIComponent(nick2)}`),
    ]);

    const sheet = modal.querySelector('div[style*="border-radius:20px"]');

    const METRICS = [
      { key: 'elo',          label: 'ELO',         higherBetter: true,  format: v => v.toLocaleString('ru-RU') },
      { key: 'rank',         label: 'Рейтинг',     higherBetter: false, format: v => '#' + v },
      { key: 'winRate',      label: 'Winrate',     higherBetter: true,  format: v => v + '%' },
      { key: 'kd',           label: 'K/D',         higherBetter: true,  format: v => Number(v).toFixed(2) },
      { key: 'totalMatches', label: 'Матчей',      higherBetter: true,  format: v => v },
      { key: 'wins',         label: 'Побед',       higherBetter: true,  format: v => v },
      { key: 'kills',        label: 'Убийств',     higherBetter: true,  format: v => v.toLocaleString('ru-RU') },
      { key: 'bestStreak',   label: 'Лучшая серия',higherBetter: true,  format: v => v },
      { key: 'mvpCount',     label: 'MVP',         higherBetter: true,  format: v => v },
    ];

    function rowHTML(m) {
      const v1 = p1[m.key] ?? 0;
      const v2 = p2[m.key] ?? 0;
      const p1wins = m.higherBetter ? v1 > v2 : v1 < v2;
      const p2wins = m.higherBetter ? v2 > v1 : v2 < v1;
      const c1 = p1wins ? '#34C759' : p2wins ? '#FF3B30' : 'var(--text)';
      const c2 = p2wins ? '#34C759' : p1wins ? '#FF3B30' : 'var(--text)';

      // Bar widths
      const total = (v1 + v2) || 1;
      const pct1 = Math.round((v1 / (v1 > v2 ? v1 : v2 || 1)) * 100);
      const pct2 = Math.round((v2 / (v1 > v2 ? v1 : v2 || 1)) * 100);

      return `
        <div style="margin-bottom:14px">
          <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:4px">
            <span style="font-size:15px;font-weight:700;color:${c1};min-width:70px">${m.format(v1)}</span>
            <span style="font-size:11px;color:var(--text-secondary);text-align:center;flex:1">${m.label}</span>
            <span style="font-size:15px;font-weight:700;color:${c2};min-width:70px;text-align:right">${m.format(v2)}</span>
          </div>
          <div style="display:flex;gap:3px;height:5px">
            <div style="flex:1;background:rgba(255,255,255,.08);border-radius:3px;overflow:hidden">
              <div style="background:${c1};height:100%;width:${pct1}%;border-radius:3px;float:right;transition:width .5s ease"></div>
            </div>
            <div style="flex:1;background:rgba(255,255,255,.08);border-radius:3px;overflow:hidden">
              <div style="background:${c2};height:100%;width:${pct2}%;border-radius:3px;transition:width .5s ease"></div>
            </div>
          </div>
        </div>`;
    }

    const lc1 = getLevelColor(p1.level);
    const lc2 = getLevelColor(p2.level);
    const av1 = `background:${lc1}20;--tg-avatar-color:${lc1};border-color:${lc1}30`;
    const av2 = `background:${lc2}20;--tg-avatar-color:${lc2};border-color:${lc2}30`;

    // Count wins
    let p1score = 0, p2score = 0;
    METRICS.forEach(m => {
      const v1 = p1[m.key] ?? 0;
      const v2 = p2[m.key] ?? 0;
      if (m.higherBetter ? v1 > v2 : v1 < v2) p1score++;
      else if (m.higherBetter ? v2 > v1 : v2 < v1) p2score++;
    });

    sheet.innerHTML = `
      <div style="width:36px;height:4px;background:rgba(255,255,255,.2);border-radius:2px;margin:0 auto 18px"></div>
      <div style="font-size:15px;font-weight:700;text-align:center;margin-bottom:16px">⚖️ Сравнение</div>

      <!-- Players header -->
      <div style="display:grid;grid-template-columns:1fr auto 1fr;gap:8px;align-items:center;margin-bottom:20px">
        <div style="text-align:center;cursor:pointer" onclick="modal.remove()">
          <div style="display:flex;justify-content:center;margin-bottom:6px">
            ${avatarHTML(p1.userId, p1.gameNickname, av1 + ';width:48px;height:48px', 'cmp-av')}
          </div>
          <div style="font-weight:700;font-size:13px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${p1.gameNickname}</div>
          ${levelBadgeHTML(p1.level,'sm')}
        </div>
        <div style="text-align:center;padding:8px 14px;border-radius:12px;background:rgba(255,255,255,.06)">
          <div style="font-size:22px;font-weight:900;color:${p1score > p2score ? '#34C759' : p2score > p1score ? '#FF3B30' : '#FFD700'}">${p1score}</div>
          <div style="font-size:10px;color:var(--text-secondary)">VS</div>
          <div style="font-size:22px;font-weight:900;color:${p2score > p1score ? '#34C759' : p1score > p2score ? '#FF3B30' : '#FFD700'}">${p2score}</div>
        </div>
        <div style="text-align:center;cursor:pointer" onclick="modal.remove();App.viewPlayer('${p2.gameNickname}')">
          <div style="display:flex;justify-content:center;margin-bottom:6px">
            ${avatarHTML(p2.userId, p2.gameNickname, av2 + ';width:48px;height:48px', 'cmp-av')}
          </div>
          <div style="font-weight:700;font-size:13px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${p2.gameNickname}</div>
          ${levelBadgeHTML(p2.level,'sm')}
        </div>
      </div>

      <!-- Metrics -->
      <div style="border-top:1px solid var(--border);padding-top:16px">
        ${METRICS.map(rowHTML).join('')}
      </div>
    `;

    // Fix modal ref
    sheet.querySelectorAll('[onclick*="modal.remove"]').forEach(el => {
      const o = el.getAttribute('onclick');
      el.setAttribute('onclick', o);
    });
    window._cmpModal = modal;

    activateAvatars(sheet);

  } catch(e) {
    const sheet = modal.querySelector('div[style*="border-radius:20px"]');
    if (sheet) sheet.innerHTML = `
      <div style="width:36px;height:4px;background:rgba(255,255,255,.2);border-radius:2px;margin:0 auto 18px"></div>
      <div style="text-align:center;padding:30px;color:#FF3B30">Ошибка загрузки</div>`;
  }
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

  let html = '';

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

  const myPos = myId ? data.findIndex(d => d.id === myId) : -1;
  if (myPos >= 3) {
    html += `
      <div class="my-pos-banner">
        <span class="my-pos-rank">#${myPos + 1}</span>
        <span class="my-pos-label">Ваша позиция</span>
      </div>`;
  }

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
  const favs = getFavs();

  const favsHTML = favs.length ? `
    <div style="padding:0 16px;margin-bottom:4px">
      <div style="font-size:11px;color:var(--text-secondary);font-weight:600;text-transform:uppercase;letter-spacing:.5px;margin-bottom:8px">★ В слежке</div>
      ${favs.map(f => {
        const lc = getLevelColor(f.level);
        return `
          <div class="search-row" onclick="App.viewPlayer('${f.gameNickname}')" style="animation-delay:0ms">
            ${avatarHTML(f.userId, f.gameNickname, `background:${lc}18;--tg-avatar-color:${lc};border-color:${lc}30`, 'search-tg-avatar')}
            <div class="search-info">
              <div class="search-name-row">
                <span class="search-name">${f.gameNickname}</span>
                ${f.isPremium ? '<span style="color:#FFD700;font-size:12px">✨</span>' : ''}
                ${f.hasProLeague ? '<span style="color:#FFA500;font-size:12px">🏅</span>' : ''}
              </div>
              <div class="search-sub">
                ${levelBadgeHTML(f.level, 'sm')}
                <span class="search-sub-text">${f.totalMatches ?? ''} матчей</span>
              </div>
            </div>
            <div class="search-elo">
              <div class="search-elo-val">${(f.elo||0).toLocaleString('ru-RU')}</div>
              <div class="search-elo-lbl">ELO</div>
            </div>
            <svg class="search-arrow" width="16" height="16" viewBox="0 0 24 24" fill="none">
              <path d="M9 18l6-6-6-6" stroke="#3a3a3a" stroke-width="2" stroke-linecap="round"/>
            </svg>
          </div>`;
      }).join('')}
    </div>` : '';

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
    <div id="search-favs">${favsHTML}</div>
    <div id="search-results"></div>
  `;

  const input = document.getElementById('search-input');
  const box = document.getElementById('search-box');
  input.addEventListener('focus', () => box.classList.add('focused'));
  input.addEventListener('blur',  () => box.classList.remove('focused'));
  input.addEventListener('input', () => App.onSearchInput(input.value));

  activateAvatars(content);
}

let searchTimer = null;

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

  const favsEl = document.getElementById('search-favs');

  if (!q) {
    if (favsEl) favsEl.style.display = '';
    container.innerHTML = '';
    return;
  }
  if (favsEl) favsEl.style.display = 'none';

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

// ── Quests ────────────────────────────────────────────────────────────────────

async function renderQuests() {
  const content = document.getElementById('tab-content');
  content.innerHTML = `<div style="padding:16px">${skeletonList(3)}</div>`;

  let data;
  try {
    data = await apiPost('/api/quests', { initData: state.initData });
  } catch {
    content.innerHTML = `<div class="not-registered" style="margin-top:60px"><div style="font-size:32px">⚠️</div><div>Ошибка загрузки заданий</div></div>`;
    return;
  }

  const { battlePass: bp, quests } = data;

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
          ${[['Уровень', lvlColor, bp.bpLevel + ' / ' + bp.maxLevel],
             ['Побед сыграно', '#a0a0a0', prog],
             ['След. награда', '#FFA500', (bp.isBought ? [20,30,40,50] : [10,15,20,25])[bp.bpLevel % 4] + ' ACF'],
            ].map(([l,c,v]) => `
              <div style="background:rgba(255,255,255,.05);border-radius:10px;padding:10px;text-align:center">
                <div style="font-size:10px;color:var(--text-secondary);margin-bottom:3px">${l}</div>
                <div style="font-size:15px;font-weight:700;color:${c}">${v}</div>
              </div>`).join('')}
        </div>
        ${!bp.isBought
          ? `<div style="font-size:11px;color:#888;text-align:center;padding:6px 0">💡 Купи Battle Pass для увеличенных наград</div>`
          : `<div style="font-size:11px;color:#FFA500;text-align:center;padding:6px 0">⚔️ Расширенные награды активны</div>`}
      </div>`;
  }

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

  toggleFavBtn() {
    const player = state.viewedPlayer;
    if (!player) return;
    const nowFav = toggleFav(player);
    const btn = document.getElementById('fav-btn');
    if (btn) {
      btn.textContent = nowFav ? '★' : '☆';
      btn.style.background = nowFav ? 'rgba(255,215,0,.2)' : 'rgba(255,255,255,.08)';
      btn.style.borderColor = nowFav ? 'rgba(255,215,0,.4)' : 'rgba(255,255,255,.15)';
      btn.style.color = nowFav ? '#FFD700' : '#a0a0a0';
    }
  },

  showProfileConfig() {
    showProfileConfig();
  },

  _applyProfileConfig() {
    // Re-render current player with new config
    const p = state.viewedPlayer || state.player;
    if (p) renderPlayer(p);
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
          <div class="nr-inner"><div class="nr-emoji">😕</div><h2>Игрок не найден</h2></div>
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
    const favsEl = document.getElementById('search-favs');
    if (favsEl) favsEl.style.display = '';
    renderSearchResults('', [], false);
  },

  onSearchInput(q) {
    const clearBtn = document.getElementById('search-clear');
    if (clearBtn) clearBtn.style.display = q ? '' : 'none';
    clearTimeout(searchTimer);
    if (q.length < 2) { renderSearchResults(q, [], false); return; }
    searchTimer = setTimeout(() => doSearch(q), 300);
  },

  openMatchDetail(matchId) {
    openMatchDetail(matchId);
  },

  openCompare(nick2) {
    openCompare(nick2);
  },
};

// ── Boot ──────────────────────────────────────────────────────────────────────

async function boot() {
  const splash = document.getElementById('splash');
  const app    = document.getElementById('app');

  try {
    const initData = tg?.initData || '';

    if (!initData) {
      splash.classList.add('fade-out');
      app.classList.remove('hidden');
      renderNotRegistered();
      return;
    }

    const data = await apiPost('/api/me', { initData });
    state.player   = data.player;
    state.tgUser   = data.tgUser;
    state.initData = initData;

    splash.classList.add('fade-out');
    app.classList.remove('hidden');
    renderPlayer(data.player);
    activateAvatars(document.getElementById('tab-content'));

    // Обработка параметра матча из URL (?match=123) — приоритет над start_param
    const urlMatch = new URLSearchParams(window.location.search).get('match');
    const startParam = tg?.initDataUnsafe?.start_param || '';
    const matchId = urlMatch || (startParam.startsWith('match_') ? startParam.replace('match_', '') : '');
    if (matchId) setTimeout(() => openMatchDetail(matchId), 400);

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
