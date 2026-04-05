const API_BASE = 'https://faceit-api.wenzzyk.workers.dev';

async function fetchPlayerData(userId) {
  try {
    const res = await fetch(`${API_BASE}/api/players/${userId}`);
    if (!res.ok) throw new Error('API error');
    return await res.json();
  } catch (err) {
    console.error('Error fetching player data:', err);
    return null;
  }
}

function getRankEmoji(level) {
  const ranks = {
    1: '🥉', 2: '🥉',
    3: '🥈', 4: '🥈',
    5: '🥇', 6: '🥇',
    7: '💎', 8: '💎',
    9: '🏆', 10: '👑'
  };
  return ranks[level] || '🎮';
}

async function updateOverlay() {
  const urlParams = new URLSearchParams(window.location.search);
  const userId = urlParams.get('uid');

  if (!userId) {
    document.getElementById('status').innerText = 'Ошибка: uid не указан';
    return;
  }

  const player = await fetchPlayerData(userId);
  if (!player) {
    document.getElementById('status').innerText = 'Ошибка загрузки данных';
    return;
  }

  // Hide loading status and show overlay
  document.getElementById('status').style.display = 'none';
  const overlay = document.getElementById('overlay');
  overlay.style.display = 'flex';

  // Update fields
  document.getElementById('nickname').innerText = player.gameNickname || 'Unknown';
  document.getElementById('elo').innerText = player.elo || '100';
  document.getElementById('kd').innerText = (player.kd || 0).toFixed(2);
  document.getElementById('winrate').innerText = `${player.winRate || 0}%`;
  document.getElementById('level-badge').innerText = player.level || '1';
  document.getElementById('rank-emoji').innerText = getRankEmoji(player.level || 1);
}

// Initial update
updateOverlay();

// Refresh every 30 seconds
setInterval(updateOverlay, 30000);
