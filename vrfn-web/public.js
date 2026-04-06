// VRFN Public Portal Logic
document.addEventListener('DOMContentLoaded', async () => {
    // 1. Initial Load
    fetchLeagueData();

    // 2. Check for logged in user (optional display)
    const user = JSON.parse(localStorage.getItem('vrfn_user'));
    updateNavUI(user);

    // 3. Background Animation
    document.addEventListener('mousemove', (e) => {
        const { clientX, clientY } = e;
        const xPercent = (clientX / window.innerWidth - 0.5) * 50;
        const yPercent = (clientY / window.innerHeight - 0.5) * 50;
        const glow = document.querySelector('.glow-1');
        if (glow) {
            gsap.to(glow, {
                x: xPercent + '%',
                y: yPercent + '%',
                duration: 3,
                ease: 'power2.out'
            });
        }
    });
});

function updateNavUI(user) {
    const userPill = document.getElementById('nav-user-pill');
    if (!userPill) return;

    if (user) {
        userPill.innerHTML = `
            <div class="user-avatar" style="background-image: url('https://cdn.discordapp.com/avatars/${user.id}/${user.avatar}.png'); background-size: cover;"></div>
            <span style="font-size: 0.85rem; font-weight: 600;">${user.username}</span>
        `;
        userPill.onclick = () => window.location.href = 'profile.html';
        userPill.style.cursor = 'pointer';
    } else {
        userPill.innerHTML = `<a href="login.html" style="color: white; text-decoration: none; font-weight: 700; font-size: 0.8rem;">LOGIN</a>`;
        userPill.style.background = 'var(--accent-primary)';
    }
}

async function fetchLeagueData() {
    try {
        const resp = await fetch('/api/public/league-data');
        const data = await resp.json();

        renderStandings(data.standings);
        renderLeaderboards(data.leaderboards);
        renderFixtures(data.fixtures);
    } catch (e) {
        console.error('Failed to load league data:', e);
    }
}

function renderStandings(standings) {
    const body = document.getElementById('standings-body');
    if (!body) return;

    body.innerHTML = standings.map((s, i) => `
        <tr onclick="if('${s.id}') window.location.href='team.html?id=${s.id}'" style="cursor: pointer;">
            <td style="font-weight: 800; color: ${i < 3 ? 'var(--gold)' : 'var(--text-secondary)'}">${i + 1}</td>
            <td style="font-weight: 700;">
                <div style="display: flex; align-items: center; gap: 0.8rem;">
                    <span style="font-size: 1.2rem;">🛡️</span>
                    <div>
                        ${s.name} 
                        <div style="font-size: 0.6rem; opacity: 0.5; text-transform: uppercase; letter-spacing: 1px;">${s.division || 'PRO LEAGUE'}</div>
                    </div>
                </div>
            </td>
            <td style="font-weight: 700;">${s.p}</td>
            <td style="color: var(--success); font-weight: 700;">${s.w}</td>
            <td style="color: var(--text-secondary); opacity: 0.5;">${s.d}</td>
            <td style="color: var(--danger); opacity: 0.5;">${s.l}</td>
            <td style="font-weight: 800; color: ${s.gd > 0 ? 'var(--success)' : s.gd < 0 ? 'var(--danger)' : 'inherit'}">${s.gd > 0 ? '+' : ''}${s.gd}</td>
            <td style="font-weight: 900; color: var(--accent-primary); font-size: 1.2rem;">${s.pts}</td>
        </tr>
    `).join('');
}

function renderLeaderboards(lb) {
    const goalsList = document.getElementById('goals-leaderboard');
    const assistsList = document.getElementById('assists-leaderboard');
    const goalsPodium = document.getElementById('goals-podium');

    if (goalsPodium && lb.goals.length > 0) {
        // Arrange indices for visual podium: [2, 1, 3] (Silver, Gold, Bronze)
        const top3 = [lb.goals[1], lb.goals[0], lb.goals[2]].filter(p => p !== undefined);
        const ranks = [2, 1, 3];
        const types = ['silver', 'gold', 'bronze'];

        goalsPodium.innerHTML = top3.map((p, i) => `
            <div class="podium-card ${types[i]}">
                <div class="podium-rank-tag">#${ranks[i]}</div>
                <div style="width: 80px; height: 80px; background: var(--bg-color); border: 2px solid var(--border-color); border-radius: 50%; margin: 0 auto 1.5rem; display: flex; align-items: center; justify-content: center; font-size: 2rem;">👤</div>
                <h3 style="font-weight: 900; margin-bottom: 0.5rem;">${p.player_name}</h3>
                <p style="color: var(--accent-primary); font-size: 1.5rem; font-weight: 900;">${p.total} <span style="font-size: 0.8rem; color: var(--text-secondary); font-weight: 700;">GOALS</span></p>
            </div>
        `).join('');
    }

    if (goalsList) {
        // Show remaining players (start from 4th)
        const remaining = lb.goals.slice(3);
        goalsList.innerHTML = remaining.map((p, i) => `
            <div class="lb-item">
                <span class="lb-rank">#${i + 4}</span>
                <span class="lb-name">${p.player_name}</span>
                <span class="lb-value">${p.total}</span>
            </div>
        `).join('') || (lb.goals.length <= 3 ? '<p style="color: var(--text-secondary); text-align: center; padding: 1rem;">End of list.</p>' : '<p style="color: var(--text-secondary); text-align: center; padding: 2rem;">No goals recorded yet.</p>');
    }

    if (assistsList) {
        assistsList.innerHTML = lb.assists.map((p, i) => `
            <div class="lb-item">
                <span class="lb-rank" style="color: ${i < 3 ? 'var(--gold)' : 'inherit'}">#${i + 1}</span>
                <span class="lb-name" style="${i < 3 ? 'font-weight: 900;' : ''}">${p.player_name}</span>
                <span class="lb-value">${p.total}</span>
            </div>
        `).join('') || '<p style="color: var(--text-secondary); text-align: center; padding: 2rem;">No assists recorded yet.</p>';
    }
}

function renderFixtures(fixtures) {
    const list = document.getElementById('fixtures-list');
    if (!list) return;

    if (fixtures.length === 0) {
        list.innerHTML = '<div class="glass-card" style="grid-column: 1/-1; text-align: center; border-style: dashed;"><p style="color: var(--text-secondary);">No upcoming fixtures scheduled.</p></div>';
        return;
    }

    list.innerHTML = fixtures.map(f => `
        <a href="match.html?id=${f.id || 1}" class="glass-card fixture-card" style="padding: 1.5rem; text-align: center; text-decoration: none; color: inherit; display: block; border: 1px solid var(--border-color); transition: var(--transition-smooth);">
            <p style="font-size: 0.65rem; font-weight: 800; color: var(--accent-primary); letter-spacing: 1px; margin-bottom: 0.8rem;">GAMEWEEK ${f.gw}</p>
            <div style="display: flex; justify-content: space-between; align-items: center; gap: 1rem;">
                <span style="font-weight: 700; flex: 1; text-align: right; font-size: 1.2rem;">${f.home_team}</span>
                <span style="background: var(--bg-color); border: 1px solid var(--glass-highlight); color: var(--accent-primary); padding: 0.4rem 0.8rem; border-radius: 8px; font-weight: 900; font-family: monospace;">VS</span>
                <span style="font-weight: 700; flex: 1; text-align: left; font-size: 1.2rem;">${f.away_team}</span>
            </div>
            <div style="margin-top: 1rem; font-size: 0.75rem; color: var(--text-secondary); font-weight: 600;">View Match Details & Timeline &rarr;</div>
        </a>
    `).join('');
}

function switchLeagueTab(tabId) {
    // Update buttons
    document.querySelectorAll('.nav-item').forEach(btn => btn.classList.remove('active'));
    document.getElementById(`tab-btn-${tabId}`).classList.add('active');

    // Update views
    document.querySelectorAll('.league-tab').forEach(view => view.style.display = 'none');
    document.getElementById(`${tabId}-view`).style.display = 'block';
    
    // Animate new view
    gsap.from(`#${tabId}-view`, { opacity: 0, y: 10, duration: 0.5, ease: "power2.out" });
}
