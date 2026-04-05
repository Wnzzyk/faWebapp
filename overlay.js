(function() {
    const API_BASE = 'https://faceit-api.wenzzyk.workers.dev';
    const SEARCH_PARAMS = new URLSearchParams(window.location.search);
    const userId = SEARCH_PARAMS.get('uid');

    if (!userId) {
        document.getElementById('loader').innerText = 'Ошибка: не указан UID';
        return;
    }

    async function fetchPlayerData() {
        try {
            const res = await fetch(`${API_BASE}/api/players/${userId}`);
            if (!res.ok) throw new Error('Player not found');
            const data = await res.json();
            updateUI(data);
        } catch (err) {
            console.error(err);
            document.getElementById('loader').innerText = 'Игрок не найден';
        }
    }

    function updateUI(p) {
        const loader = document.getElementById('loader');
        const widget = document.getElementById('widget');
        
        if (loader) loader.classList.add('hidden');
        if (widget) widget.classList.remove('hidden');

        // Data extraction with safe fallbacks
        const nickname = p.gameNickname || p.game_nickname || '—';
        const elo = p.elo || 0;
        const level = p.level || 1;
        
        const totalMatches = p.totalMatches || p.matches || 1;
        const wins = p.wins || 0;
        const kills = p.kills || 0;
        const deaths = p.deaths || 0;

        // Header Updates
        document.getElementById('nickname').innerText = nickname;
        document.getElementById('elo').innerText = elo;
        document.getElementById('level').innerText = level;

        // Stats calculation (ensure they exist in API or compute)
        const avgKills = p.avg_kills || (kills / totalMatches).toFixed(1);
        const winRate = p.win_rate || Math.round((wins / totalMatches) * 100);
        const kd = p.kd || (kills / Math.max(1, deaths)).toFixed(2);
        const kr = p.kr || (kills / Math.max(1, totalMatches * 19)).toFixed(2);

        document.getElementById('avg-kills').innerText = avgKills;
        document.getElementById('winrate').innerText = `${winRate}%`;
        document.getElementById('kd').innerText = kd;
        document.getElementById('kr').innerText = kr;

        // Dynamic Ranking (Simulated based on ELO)
        const rankRegion = p.rankRegion || (elo > 200 ? Math.floor(10000 / (elo / 100)) : '—');
        const rankGlobal = p.rankGlobal || (elo > 200 ? Math.floor(50000 / (elo / 100)) : '—');
        document.getElementById('rank-region').innerText = rankRegion;
        document.getElementById('rank-global').innerText = rankGlobal;

        // Match History (Last 5)
        const historyContainer = document.getElementById('history');
        if (historyContainer) {
            historyContainer.innerHTML = '';
            const recent = p.recentMatches || p.recent_matches || [];
            const displayMatches = recent.slice(0, 5);
            
            displayMatches.forEach(m => {
                const div = document.createElement('div');
                div.className = 'match';
                if (m.won === true || m.result === 'W') {
                    div.innerText = 'W';
                    div.classList.add('match-w');
                } else if (m.won === false || m.result === 'L') {
                    div.innerText = 'L';
                    div.classList.add('match-l');
                } else {
                    div.innerText = '—';
                    div.classList.add('match-empty');
                }
                historyContainer.appendChild(div);
            });

            // Fill empty slots if less than 5 matches played
            for (let i = displayMatches.length; i < 5; i++) {
                const div = document.createElement('div');
                div.className = 'match match-empty';
                div.innerText = '·';
                historyContainer.appendChild(div);
            }
        }
    }

    fetchPlayerData();
    setInterval(fetchPlayerData, 30000);
})();
