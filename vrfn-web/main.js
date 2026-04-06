// Theme Initialization
(function() {
  const savedTheme = localStorage.getItem('theme') || 'light';
  document.documentElement.setAttribute('data-theme', savedTheme);
})();

// VRFN Dashboard Core Logic
document.addEventListener('DOMContentLoaded', async () => {
  await checkManagerStatus();
  // Global Theme Toggle
  document.querySelectorAll('.theme-toggle').forEach(btn => {
    btn.addEventListener('click', () => {
      const current = document.documentElement.getAttribute('data-theme');
      const next = current === 'dark' ? 'light' : 'dark';
      document.documentElement.setAttribute('data-theme', next);
      localStorage.setItem('theme', next);
    });
  });

  // Inject Nav Icons (Search & Notifications)
  const rightNav = document.querySelector('nav > div:last-child');
  if (rightNav && !document.querySelector('.nav-icons')) {
    const iconsHTML = `
      <div class="nav-icons" style="position: relative;">
        <button class="icon-btn" onclick="toggleSearch()" title="Global Search">🔍</button>
        <button class="icon-btn" onclick="toggleNotifications()" title="Notifications">🔔<div class="badge-dot" id="notif-badge"></div></button>
        <div class="notification-dropdown glass-card" id="notifDropdown" style="display: none; position: absolute; top: 120%; right: 0; width: 300px; padding: 1rem; flex-direction: column; gap: 0.5rem; z-index: 1000; box-shadow: 0 10px 40px rgba(0,0,0,0.5);">
            <div style="font-weight: 800; font-size: 0.9rem; margin-bottom: 0.5rem; color: var(--text-secondary); letter-spacing: 1px;">NOTIFICATIONS</div>
            <div id="notifList">Loading...</div>
        </div>
      </div>
    `;
    rightNav.insertAdjacentHTML('afterbegin', iconsHTML);

    window.toggleNotifications = async () => {
        const dropdown = document.getElementById('notifDropdown');
        const badge = document.getElementById('notif-badge');
        if (dropdown.style.display === 'none') {
            dropdown.style.display = 'flex';
            if (badge) badge.style.display = 'none';

            const user = JSON.parse(localStorage.getItem('vrfn_user'));
            if (!user) {
                document.getElementById('notifList').innerHTML = '<p style="color: var(--text-secondary); font-size: 0.85rem;">Please log in to see notifications.</p>';
                return;
            }

            try {
                const res = await fetch(`/api/features?action=notifications&userId=${user.discord_id || user.id}`);
                const data = await res.json();
                
                if (data.notifications && data.notifications.length > 0) {
                    // Fallback to rough mapping if columns didn't attach properly from Turso
                    document.getElementById('notifList').innerHTML = data.notifications.map(n => {
                        const statusColor = n.status && n.status.includes('approve') ? 'var(--success)' : (n.status && n.status.includes('reject') ? 'var(--danger)' : 'var(--accent-primary)');
                        const categoryText = n.category ? n.category.toUpperCase() : 'STAT';
                        const countText = n.stat_count ? `x${n.stat_count}` : '';
                        
                        return `
                        <div style="padding: 0.8rem; background: var(--bg-color); border-radius: var(--radius-sm); border-left: 3px solid ${statusColor}; font-size: 0.85rem;">
                            <div style="font-weight: 700;">${categoryText} Request ${countText}</div>
                            <div style="color: var(--text-secondary); margin-top: 0.2rem; font-size: 0.8rem;">Status: <span style="font-weight: 800; color: ${statusColor};">${n.status || 'Pending'}</span></div>
                        </div>
                        `;
                    }).join('');
                } else {
                    document.getElementById('notifList').innerHTML = '<p style="color: var(--text-secondary); font-size: 0.85rem;">No new notifications.</p>';
                }
            } catch (e) {
                document.getElementById('notifList').innerHTML = '<p style="color: var(--danger); font-size: 0.85rem;">Failed to load.</p>';
            }
        } else {
            dropdown.style.display = 'none';
        }
    };

    // Close dropdown when clicking outside
    document.addEventListener('click', (e) => {
        const dropdown = document.getElementById('notifDropdown');
        if (dropdown && dropdown.style.display === 'flex' && !e.target.closest('.nav-icons')) {
            dropdown.style.display = 'none';
        }
    });
  }

  // Inject Search Overlay
  if (!document.getElementById('searchOverlay')) {
    const searchHTML = `
      <div class="search-overlay" id="searchOverlay" onclick="if(event.target.id==='searchOverlay') toggleSearch()">
        <div class="search-box">
          <input type="text" class="search-input" id="globalSearchInput" placeholder="Search players, teams, or competitions..." autofocus>
          <div id="searchResults" style="margin-top: 1.5rem; display: flex; flex-direction: column; gap: 0.5rem; max-height: 50vh; overflow-y: auto;"></div>
        </div>
      </div>
    `;
    document.body.insertAdjacentHTML('beforeend', searchHTML);
    window.toggleSearch = () => {
      document.getElementById('searchOverlay').classList.toggle('active');
      if (document.getElementById('searchOverlay').classList.contains('active')) {
          document.getElementById('globalSearchInput').focus();
      }
    };

    // Attach search logic
    const searchInput = document.getElementById('globalSearchInput');
    const resultsContainer = document.getElementById('searchResults');
    let debounceTimer;

    searchInput.addEventListener('input', (e) => {
        const query = e.target.value;
        clearTimeout(debounceTimer);
        
        if (query.length < 2) {
            resultsContainer.innerHTML = '';
            return;
        }

        debounceTimer = setTimeout(async () => {
            try {
                const res = await fetch(`/api/features?action=search&q=${encodeURIComponent(query)}`);
                const data = await res.json();
                
                let html = '';
                if (data.players?.length > 0) {
                    html += '<div style="font-size: 0.75rem; color: var(--text-secondary); font-weight: 800; letter-spacing: 1px; margin-top: 1rem;">PLAYERS</div>';
                    data.players.forEach(p => {
                        html += `
                        <a href="profile.html?view=${p.discord_id}&name=${encodeURIComponent(p.username)}" style="text-decoration: none; color: inherit; display: block;">
                            <div class="glass-card search-item" style="padding: 1rem; display: flex; justify-content: space-between; align-items: center; cursor: pointer; border: 1px solid var(--border-color); margin-bottom: 0.5rem; transition: 0.3s; background: var(--glass-bg);">
                                <span style="font-weight: 800;">👤 ${p.username}</span>
                                <span style="font-size: 0.8rem; color: var(--accent-primary);">${p.market_value ? '$' + p.market_value.toLocaleString() : 'Free Agent'}</span>
                            </div>
                        </a>`;
                    });
                }
                if (data.teams?.length > 0) {
                    html += '<div style="font-size: 0.75rem; color: var(--text-secondary); font-weight: 800; letter-spacing: 1px; margin-top: 1rem;">TEAMS</div>';
                    data.teams.forEach(t => {
                        html += `
                        <a href="team.html?id=${t.id}" style="text-decoration: none; color: inherit; display: block;">
                            <div class="glass-card search-item" style="padding: 1rem; display: flex; justify-content: space-between; align-items: center; cursor: pointer; border: 1px solid var(--border-color); margin-bottom: 0.5rem; transition: 0.3s; background: var(--glass-bg);">
                                <span style="font-weight: 800;">🛡️ ${t.name}</span>
                            </div>
                        </a>`;
                    });
                }
                
                if (!html) html = '<p style="color: var(--text-secondary); text-align: center;">No matches found.</p>';
                resultsContainer.innerHTML = html;
            } catch (err) {
                console.error(err);
            }
        }, 400);
    });
  }

  // Inject Clip Modal
  if (!document.getElementById('clipModal')) {
    const clipHTML = `
      <div class="clip-modal" id="clipModal" onclick="if(event.target.id==='clipModal') closeClipModal()">
        <button class="clip-close" onclick="closeClipModal()">✕</button>
        <div class="clip-modal-content">
          <video id="clipVideoPlayer" class="clip-video" controls autoplay>
            <source src="" type="video/mp4">
            Your browser does not support the video tag.
          </video>
        </div>
      </div>
    `;
    document.body.insertAdjacentHTML('beforeend', clipHTML);
    window.openClipModal = (videoUrl) => {
      const modal = document.getElementById('clipModal');
      const player = document.getElementById('clipVideoPlayer');
      player.src = videoUrl;
      modal.classList.add('active');
      player.play();
    };
    window.closeClipModal = () => {
      const modal = document.getElementById('clipModal');
      const player = document.getElementById('clipVideoPlayer');
      modal.classList.remove('active');
      player.pause();
      player.src = '';
    };
  }
  
  // ── Universal Clean Modal System ──────────────────────────────
  if (!document.getElementById('universalModal')) {
    const modalHTML = `
      <div id="universalModal" class="modal" style="display: none; z-index: 100000; justify-content: center; align-items: center;">
        <div class="modal-content glass reveal" style="max-width: 450px; width: 90%; padding: 2.5rem; text-align: center; border: 1px solid var(--accent-primary-alpha);">
          <div id="modalIcon" style="font-size: 3rem; margin-bottom: 1rem;">🔔</div>
          <h3 id="modalTitle" style="font-weight: 900; font-size: 1.5rem; margin-bottom: 0.8rem; letter-spacing: -1px;">ALERT</h3>
          <p id="modalMessage" style="color: var(--text-secondary); line-height: 1.6; margin-bottom: 2rem; font-size: 0.95rem;"></p>
          <div id="modalInputs" style="display: none; margin-bottom: 1.5rem;">
            <input type="text" id="modalPromptInput" class="admin-input" style="width: 100%;" placeholder="Enter value...">
          </div>
          <div id="modalActions" style="display: flex; gap: 1rem; justify-content: center;">
            <button id="modalPrimaryBtn" class="btn-action approve" style="min-width: 120px; font-weight: 800;">OK</button>
            <button id="modalSecondaryBtn" class="btn-action decline" style="display: none; min-width: 120px; font-weight: 800; background: rgba(255,255,255,0.05);">CANCEL</button>
          </div>
        </div>
      </div>
    `;
    document.body.insertAdjacentHTML('beforeend', modalHTML);

    window.cleanAlert = (msg, title = 'NOTIFICATION', icon = '🔔') => {
      return new Promise(resolve => {
        const modal = document.getElementById('universalModal');
        document.getElementById('modalTitle').innerText = title;
        document.getElementById('modalMessage').innerText = msg;
        document.getElementById('modalIcon').innerText = icon;
        document.getElementById('modalInputs').style.display = 'none';
        document.getElementById('modalSecondaryBtn').style.display = 'none';
        
        const primary = document.getElementById('modalPrimaryBtn');
        primary.innerText = 'OK';
        primary.onclick = () => {
          modal.style.display = 'none';
          resolve();
        };

        modal.style.display = 'flex';
        gsap.fromTo(modal.querySelector('.modal-content'), { scale: 0.95, opacity: 0 }, { scale: 1, opacity: 1, duration: 0.1, ease: 'power2.out' });
      });
    };

    window.cleanConfirm = (msg, title = 'CONFIRMATION', icon = '❓') => {
      return new Promise(resolve => {
        const modal = document.getElementById('universalModal');
        document.getElementById('modalTitle').innerText = title;
        document.getElementById('modalMessage').innerText = msg;
        document.getElementById('modalIcon').innerText = icon;
        document.getElementById('modalInputs').style.display = 'none';
        
        const secondary = document.getElementById('modalSecondaryBtn');
        secondary.style.display = 'block';
        secondary.innerText = 'CANCEL';
        secondary.onclick = () => {
          modal.style.display = 'none';
          resolve(false);
        };

        const primary = document.getElementById('modalPrimaryBtn');
        primary.innerText = 'CONFIRM';
        primary.onclick = () => {
          modal.style.display = 'none';
          resolve(true);
        };

        modal.style.display = 'flex';
        gsap.fromTo(modal.querySelector('.modal-content'), { scale: 0.95, opacity: 0 }, { scale: 1, opacity: 1, duration: 0.1, ease: 'power2.out' });
      });
    };

    window.cleanPrompt = (msg, defaultValue = '', title = 'INPUT REQUIRED', icon = '✍️') => {
      return new Promise(resolve => {
        const modal = document.getElementById('universalModal');
        document.getElementById('modalTitle').innerText = title;
        document.getElementById('modalMessage').innerText = msg;
        document.getElementById('modalIcon').innerText = icon;
        
        const inputs = document.getElementById('modalInputs');
        inputs.style.display = 'block';
        const field = document.getElementById('modalPromptInput');
        field.value = defaultValue;
        setTimeout(() => { field.focus(); field.select(); }, 100);
        
        field.onkeydown = (e) => { if (e.key === 'Enter') primary.click(); };
        
        const secondary = document.getElementById('modalSecondaryBtn');
        secondary.style.display = 'block';
        secondary.innerText = 'CANCEL';
        secondary.onclick = () => {
          modal.style.display = 'none';
          resolve(null);
        };

        const primary = document.getElementById('modalPrimaryBtn');
        primary.innerText = 'SUBMIT';
        primary.onclick = () => {
          const val = field.value;
          modal.style.display = 'none';
          resolve(val);
        };

        modal.style.display = 'flex';
        gsap.fromTo(modal.querySelector('.modal-content'), { scale: 0.95, opacity: 0 }, { scale: 1, opacity: 1, duration: 0.1, ease: 'power2.out' });
        setTimeout(() => field.focus(), 100);
      });
    };

    // cleanSelect: show a styled <select> in the modal and resolve with chosen value
    window.cleanSelect = (msg, options, title = 'SELECT', icon = '📋') => {
      // options: array of { value, label }
      return new Promise(resolve => {
        const modal = document.getElementById('universalModal');
        document.getElementById('modalTitle').innerText = title;
        document.getElementById('modalMessage').innerText = msg;
        document.getElementById('modalIcon').innerText = icon;

        const inputs = document.getElementById('modalInputs');
        inputs.style.display = 'block';

        // Replace the text input with a <select>
        inputs.innerHTML = `<select id="modalSelectInput" class="admin-input" style="width:100%;">${
          options.map(o => `<option value="${o.value}">${o.label}</option>`).join('')
        }</select>`;

        const secondary = document.getElementById('modalSecondaryBtn');
        secondary.style.display = 'block';
        secondary.innerText = 'CANCEL';
        secondary.onclick = () => {
          modal.style.display = 'none';
          inputs.innerHTML = `<input type="text" id="modalPromptInput" class="admin-input" style="width:100%;" placeholder="Enter value...">`;
          resolve(null);
        };

        const primary = document.getElementById('modalPrimaryBtn');
        primary.innerText = 'SELECT';
        primary.onclick = () => {
          const val = document.getElementById('modalSelectInput').value;
          modal.style.display = 'none';
          inputs.innerHTML = `<input type="text" id="modalPromptInput" class="admin-input" style="width:100%;" placeholder="Enter value...">`;
          resolve(val);
        };

        modal.style.display = 'flex';
        gsap.fromTo(modal.querySelector('.modal-content'), { scale: 0.95, opacity: 0 }, { scale: 1, opacity: 1, duration: 0.1, ease: 'power2.out' });
      });
    };
    
    // Replace standard popups
    window.originalAlert = window.alert;
    window.originalConfirm = window.confirm;
    window.originalPrompt = window.prompt;

    window.alert = (msg) => { window.cleanAlert(msg); };
    window.confirm = async (msg) => { return await window.cleanConfirm(msg); };
    window.prompt = async (msg, def) => { return await window.cleanPrompt(msg, def); };
  }

  // Check for User in URL (Callback from Auth)
  const urlParams = new URLSearchParams(window.location.search);
  const userParam = urlParams.get('user');
  if (userParam) {
    localStorage.setItem('vrfn_user', userParam);
    window.history.replaceState({}, document.title, window.location.pathname);
  }

  const user = JSON.parse(localStorage.getItem('vrfn_user'));
  const rawPath = window.location.pathname.split('/').pop() || 'index.html';
  const currentPage = rawPath.replace('.html', ''); // Handle 'profile' or 'profile.html'
  
  // Auth Guard
  const privatePages = ['profile', 'stats', 'admin', 'settings', 'clips', 'trophies', 'manager'];
  if (!user && privatePages.includes(currentPage)) {
    window.location.href = 'login.html';
    return;
  }

  if (user) {
    // Check Admin Status once and update UI
    try {
      const actualId = user.discord_id || user.id;
      const adminCheck = await fetch(`/api/features?action=check-admin&userId=${actualId}`);
      const adminData = await adminCheck.json();
      user.isAdmin = adminData.isAdmin;
      
      // Cache admin status for this session to prevent flickering on failures
      if (adminData.isAdmin) localStorage.setItem('vrfn_isAdmin', 'true');
      else localStorage.removeItem('vrfn_isAdmin');

      updateUI(user); 
    } catch (e) {
      console.warn('Admin check failed or timed out');
      if (localStorage.getItem('vrfn_isAdmin') === 'true') user.isAdmin = true;
      updateUI(user);
    }

    // Populate profile data regardless of page if elements exist
    const viewParam = urlParams.get('view');
    const nameParam = urlParams.get('name');
    if (viewParam && currentPage === 'profile') {
        loadProfileData({ id: viewParam, username: nameParam || 'Player', avatar: '' });
    } else {
        loadProfileData(user);
    }
  } else {
    updateUI(null);
  }

  // Background Glow Animation
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

  if (currentPage === 'admin') {
    switchTab('dashboard');
  } else if (currentPage === 'manager') {
    loadManagerHub(user.id);
  }

  // Ctrl + K Global Search
  document.addEventListener('keydown', (e) => {
    if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
      e.preventDefault();
      if (typeof window.toggleSearch === 'function') window.toggleSearch();
    }
  });
});

function updateUI(user) {
  const userPill = document.querySelector('.user-pill');
  const nav = document.querySelector('.nav-links');
  
  if (user && userPill) {
    const avatarUrl = user.avatar ? `https://cdn.discordapp.com/avatars/${user.id}/${user.avatar}.png` : `https://cdn.discordapp.com/embed/avatars/${parseInt(user.id) % 5}.png`;
    userPill.innerHTML = `
      <div class="user-avatar" style="background-image: url('${avatarUrl}'); background-size: cover;"></div>
      <span style="font-size: 0.85rem; font-weight: 600;">${user.username}</span>
      <div class="profile-dropdown">
        <div class="dropdown-inner">
          <a href="profile.html?view=${user.id}" class="dropdown-item">👤 My Profile</a>
          <a href="clips.html" class="dropdown-item">🎬 Clips</a>
          <a href="trophies.html" class="dropdown-item">🏆 Achievements</a>
          <a href="settings.html" class="dropdown-item">⚙️ Settings</a>
          ${(window.managedTeam || user.isAdmin) ? `<a href="manager.html" class="dropdown-item">📋 Manager Hub</a>` : ''}
          <div class="dropdown-divider"></div>
          <a href="javascript:void(0)" class="dropdown-item" onclick="window.logout()" style="color:var(--danger)">🚪 Logout</a>
        </div>
      </div>
    `;
    userPill.onclick = null;
    userPill.style.cursor = 'default';

    // Update Nav
    if (nav) {
      // Clear and rebuild nav to ensure consistency and correct "active" state
      const menuItems = [
        { name: 'Home', href: 'index.html' },
        { name: 'Teams', href: 'league.html' },
        { name: 'Schedule', href: 'schedule.html' }
      ];
      
      if (window.managedTeam || (user && user.isAdmin)) {
        menuItems.push({ name: 'Manager', href: 'manager.html' });
      }

      menuItems.push(
        { name: 'Market', href: 'market.html' },
        { name: 'Stats', href: 'stats.html' }
      );

      if (user && user.isAdmin) {
        menuItems.push({ name: 'Admin', href: 'admin.html' });
      }

      const currentPath = window.location.pathname.split('/').pop() || 'index.html';
      const cleanPath = currentPath.replace('.html', '');
      
      nav.innerHTML = menuItems.map(item => {
        const itemPath = item.href.replace('.html', '');
        const isActive = cleanPath === itemPath || (cleanPath === '' && itemPath === 'index');
        return `<a href="${item.href}" class="${isActive ? 'active' : ''}">${item.name.toUpperCase()}</a>`;
      }).join('');
    }

    if (user.isAdmin) {
       document.querySelectorAll('.admin-only').forEach(el => el.style.display = 'block');
    }
  } else if (userPill) {
    userPill.innerHTML = `<a href="login.html" style="color: white; text-decoration: none; font-weight: 700; font-size: 0.8rem;">LOGIN</a>`;
    userPill.style.background = 'var(--accent-primary)';
    userPill.onclick = () => window.location.href = 'login.html';
  }
}

window.logout = function() {
  localStorage.removeItem('vrfn_user');
  window.location.href = 'login.html';
};

async function loadAdminRequests() {
  const wrapper = document.getElementById('tab-content');
  if (!wrapper) return;
  
  // Ensure the list container exists within the wrapper
  let list = document.getElementById('request-list');
  if (!list) {
      wrapper.innerHTML = `<div id="request-list" class="reveal"></div>`;
      list = document.getElementById('request-list');
  }

  try {
    const user = JSON.parse(localStorage.getItem('vrfn_user'));
    if (!user || !user.id) {
        window.location.href = 'login.html';
        return;
    }
    const resp = await fetch(`/api/admin-api?action=stat-requests&userId=${user.id}`);
    const requests = await resp.json();
    
    if (!Array.isArray(requests) || requests.length === 0) {
      list.innerHTML = `
        <div class="glass-card" style="padding: 5rem; text-align: center; border-style: dashed; opacity: 1;">
           <p style="font-size: 1.2rem; font-weight: 600; color: var(--text-secondary);">Inbox Zero. No pending requests.</p>
        </div>`;
      return;
    }

    list.innerHTML = `
      <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 1.5rem; flex-wrap: wrap; gap: 1rem;">
        <span style="font-weight: 800; font-size: 0.85rem; color: var(--text-secondary); letter-spacing: 1px;">${requests.length} PENDING REQUEST(S)</span>
        <button class="btn-login" style="margin:0; padding: 0.6rem 1.5rem; font-size: 0.85rem;" onclick="bulkApproveSelected()">✅ Approve Selected</button>
      </div>
    ` + requests.map(req => `
      <div class="glass-card reveal" style="margin-bottom: 1.5rem; display: grid; grid-template-columns: auto 1fr auto; align-items: center; gap: 2rem; opacity: 0; transform: translateY(20px);">
        <input type="checkbox" class="req-checkbox" value="${req.id}" style="width: 20px; height: 20px; accent-color: var(--accent-primary); cursor: pointer;">
        <div>
          <div style="display: flex; align-items: center; gap: 1rem; margin-bottom: 1rem;">
             <span style="font-weight: 800; font-size: 1.2rem;">${req.player_name}</span>
             <span style="background: rgba(224, 205, 139, 0.1); color: var(--gold); font-size: 0.65rem; padding: 0.3rem 0.8rem; border-radius: 20px; font-weight: 800;">PENDING</span>
          </div>
          <p style="font-size: 1rem; font-weight: 600; margin-bottom: 0.5rem;">Stat: <span style="color: var(--accent-primary);">${req.value}x ${req.stat_type}</span> (GW${req.gw})</p>
          <p style="color: var(--text-secondary); font-size: 0.9rem; margin-bottom: 1rem;">"${req.reason}"</p>
          ${req.proof_link ? `<a href="${req.proof_link.startsWith('http') ? req.proof_link : 'https://' + req.proof_link}" target="_blank" style="color: var(--accent-secondary); text-decoration: none; font-size: 0.85rem; font-weight: 700;">🔗 View Proof</a>` : ''}
        </div>
        <div style="display: flex; gap: 1rem; align-items: center;">
          <button class="btn-action" style="background:rgba(88, 101, 242, 0.1); color:#5865F2; border:1px solid #5865F2; padding: 0.6rem 1.2rem;" onclick="openDMModal('${req.player_discord_id}', '${req.player_name}')">DM</button>
          <button class="btn-action approve" onclick="processRequest(${req.id}, 'approve')">Approve</button>
          <button class="btn-action decline" onclick="processRequest(${req.id}, 'decline')">Decline</button>
        </div>
      </div>
    `).join('');

    gsap.to(".reveal", { opacity: 1, y: 0, stagger: 0.05, duration: 0.4, ease: "expo.out" });
  } catch (e) {
    console.error('Failed to load requests:', e);
    const list = document.getElementById('request-list');
    if (list) list.innerHTML = `<p style="color: var(--danger); text-align: center; padding: 2rem;">Error loading requests.</p>`;
  }
}

async function bulkApproveSelected() {
  const checked = Array.from(document.querySelectorAll('.req-checkbox:checked')).map(c => parseInt(c.value));
  if (checked.length === 0) return window.cleanAlert('No requests selected!', 'WARNING', '⚠️');

  if (!(await window.cleanConfirm(`Approve ${checked.length} selected requests?`, 'BULK APPROVE'))) return;

  try {
    const user = JSON.parse(localStorage.getItem('vrfn_user'));
    console.log(`[Admin] Bulk approving ${checked.length} requests...`);
    
    const resp = await fetch(`/api/admin-api?action=bulk-approve&userId=${user.id}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ requests: checked.map(id => ({ id, stats: {} })), userId: user.id })
    });

    const data = await resp.json();
    console.log('[Admin] Bulk approve outcome:', data);

    if (resp.ok) {
      await window.cleanAlert(`✅ Approved ${data.approved || checked.length} request(s)!`, 'BULK APPROVE', '✅');
      loadAdminRequests();
    } else {
      await window.cleanAlert(data.error || 'Error during bulk approve.', 'ERROR', '❌');
    }
  } catch (e) {
    console.error('[Admin] Bulk approve failure:', e);
    await window.cleanAlert('Error during bulk approve: ' + e.message, 'ERROR', '❌');
  }
}

async function processRequest(id, action) {
  console.log(`[Admin] Processing ${action} for request ${id}`);
  const reason = await window.cleanPrompt(`Optional: Enter a reason for this ${action}:`, "");
  if (reason === null) return;
  
  if (!(await window.cleanConfirm(`Are you sure you want to ${action} this request?`))) return;

  try {
    const user = JSON.parse(localStorage.getItem('vrfn_user'));
    if (!user || user.id === undefined) throw new Error('You must be logged in to perform this action.');
    
    console.log(`[Admin] Sending ${action} to API with userId ${user.id}`);
    const resp = await fetch(`/api/admin-api?action=stat-requests&userId=${user.id}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, action, note: reason, userId: user.id })
    });

    const data = await resp.json();
    console.log(`[Admin] ${action} API response:`, data);

    if (resp.ok) {
      await window.cleanAlert(action.toUpperCase() + 'D! The bot will DM the user shortly.', 'SUCCESS', '✅');
      loadAdminRequests();
    } else {
      await window.cleanAlert(data.error || 'Error processing request.', 'ERROR', '❌');
    }
  } catch (e) {
    console.error(`[Admin] ${action} failure:`, e);
    await window.cleanAlert('Error processing request: ' + e.message, 'ERROR', '❌');
  }
}

function logout() {
  localStorage.removeItem('vrfn_user');
  window.location.href = 'index.html';
}

function loadProfileData(user) {
  const mainName = document.getElementById('user-name-main');
  if (mainName) {
      mainName.innerHTML = `${user.username} <a href="settings.html" style="font-size: 0.5em; vertical-align: middle; margin-left:10px; text-decoration: none; cursor: pointer;" title="Edit Profile">⚙️</a>`;
  }

  const settingName = document.getElementById('user-name-settings');
  if (settingName) settingName.innerHTML = `Linked as <b>${user.username}</b>`;

  const avatars = document.querySelectorAll('.user-avatar');
  avatars.forEach(el => {
    el.style.backgroundImage = `url('https://cdn.discordapp.com/avatars/${user.id}/${user.avatar}.png')`;
    el.style.backgroundSize = 'cover';
    el.style.backgroundPosition = 'center';
  });

  const mainAvatar = document.getElementById('user-avatar-main');
  if (mainAvatar) {
    mainAvatar.style.backgroundImage = `url('https://cdn.discordapp.com/avatars/${user.id}/${user.avatar}.png')`;
    mainAvatar.style.backgroundSize = 'cover';
    mainAvatar.style.backgroundPosition = 'center';
  }

  // FETCH REAL STATS
  fetchStats(user.id);
}

async function fetchStats(userId) {
  try {
    const resp = await fetch(`/api/user-stats?userId=${userId}`);
    const data = await resp.json();
    if (data.stats) {
       const stats = data.stats;
       
       // Use Animated Counters for the main stats
       if (document.getElementById('stat-goals')) animateCounter('stat-goals', stats.goals);
       if (document.getElementById('stat-assists')) animateCounter('stat-assists', stats.assists);
       if (document.getElementById('stat-cs')) animateCounter('stat-cs', stats.clean_sheets);
       if (document.getElementById('stat-matches')) animateCounter('stat-matches', stats.matches);

       // Set Bio and Position
       if (document.getElementById('player-bio')) {
           document.getElementById('player-bio').innerText = stats.bio || 'This player hasn\'t written a biography yet.';
       }
       if (document.getElementById('player-position')) {
           document.getElementById('player-position').innerText = stats.position || 'CM';
       }

       // Handle Widgets Visibility
       let widgetPrefs = {};
       try { widgetPrefs = stats.widgets ? JSON.parse(stats.widgets) : { radar: true, matches: true, trophies: true }; } catch(e) {}
       
       if (document.getElementById('widget-radar')) {
           document.getElementById('widget-radar').style.display = widgetPrefs.radar === false ? 'none' : 'flex';
           if (widgetPrefs.radar !== false) renderRadarChart(stats);
       }
       if (document.getElementById('widget-matches')) {
           document.getElementById('widget-matches').style.display = widgetPrefs.matches === false ? 'none' : 'block';
       }
       if (document.getElementById('widget-trophies')) {
           document.getElementById('widget-trophies').style.display = widgetPrefs.trophies === false ? 'none' : 'block';
       }

       // Update XP Bar (Dynamic Calculation)
       const totalStats = stats.goals + stats.assists;
       const xpText = document.querySelector('.progress-container span:last-child');
       const fill = document.querySelector('.progress-fill');
       if (xpText && fill) {
          const xp = totalStats * 50; // 50 XP per goal/assist
          const goalXP = 1200;
          xpText.innerText = `${xp} / ${goalXP} XP`;
          fill.style.width = Math.min(100, (xp / goalXP) * 100) + '%';
       }
    }
  } catch (e) {
    console.error('Failed to fetch stats:', e);
  }
}

function renderRadarChart(stats) {
    const svg = document.getElementById('radar-svg');
    if (!svg) return;

    const centerX = 200;
    const centerY = 150;
    const radius = 100;
    const axes = 4; // Striking, Teamplay, Defense, Consistency

    // Normalize stats to 0-1 range (arbitrary max values)
    const normalized = [
        Math.min(1, stats.goals / 20),           // Striking
        Math.min(1, stats.assists / 15),         // Teamplay
        Math.min(1, stats.clean_sheets / 10),    // Defense
        Math.min(1, stats.matches / 40)          // Consistency
    ];

    const points = normalized.map((val, i) => {
        const angle = (Math.PI * 2 / axes) * i - (Math.PI / 2);
        const x = centerX + Math.cos(angle) * (radius * Math.max(0.1, val));
        const y = centerY + Math.sin(angle) * (radius * Math.max(0.1, val));
        return `${x},${y}`;
    }).join(' ');

    // Add grid lines (background rings)
    let gridHtml = '';
    [0.2, 0.4, 0.6, 0.8, 1].forEach(r => {
        let pts = [];
        for (let i = 0; i < axes; i++) {
            const angle = (Math.PI * 2 / axes) * i - (Math.PI / 2);
            pts.push(`${centerX + Math.cos(angle) * (radius * r)},${centerY + Math.sin(angle) * (radius * r)}`);
        }
        gridHtml += `<polygon points="${pts.join(' ')}" class="radar-grid-line" fill="none" />`;
    });

    // Add axis lines
    for (let i = 0; i < axes; i++) {
        const angle = (Math.PI * 2 / axes) * i - (Math.PI / 2);
        gridHtml += `<line x1="${centerX}" y1="${centerY}" x2="${centerX + Math.cos(angle) * radius}" y2="${centerY + Math.sin(angle) * radius}" class="radar-axis-line" />`;
    }

    svg.innerHTML = `
        <defs>
            <linearGradient id="radarGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" style="stop-color:var(--accent-primary);stop-opacity:1" />
                <stop offset="100%" style="stop-color:var(--accent-secondary);stop-opacity:1" />
            </linearGradient>
        </defs>
        ${gridHtml}
        <polygon points="${points}" class="radar-poly" fill="url(#radarGrad)" />
    `;

    // Animation via GSAP
    gsap.from(".radar-poly", {
        scale: 0,
        transformOrigin: "center center",
        duration: 1.5,
        ease: "elastic.out(1, 0.5)"
    });
}

async function shareProfile() {
  const url = window.location.href;
  try {
    if (navigator.share) {
      await navigator.share({
        title: 'VRFN Profile',
        text: 'Check out my professional VRFN stats!',
        url: url,
      });
    } else {
      await navigator.clipboard.writeText(url);
      alert('Profile link copied to clipboard!');
    }
  } catch (err) {
    console.error('Share failed:', err);
  }
}

async function toggleLFT() {
  const btn = document.getElementById('lftToggleBtn');
  const user = JSON.parse(localStorage.getItem('vrfn_user'));
  
  if (!user || !btn) return;
  
  try {
    const res = await fetch('/api/features?action=toggle-lft', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId: user.id })
    });
    
    if (!res.ok) {
       alert('Failed to update Free Agent status.');
       return;
    }
    
    const data = await res.json();
    
    if (data.is_free_agent) {
      btn.classList.add('active');
      alert('You are now marked as Looking For Team! Your profile is public on the Transfer Market.');
    } else {
      btn.classList.remove('active');
      alert('You are no longer looking for a team.');
    }
  } catch (e) {
    console.error('LFT error:', e);
    alert('An error occurred.');
  }
}

// ── Admin Dashboard Logic ───────────────────────────────────────────
async function switchTab(tabId) {
  // Update UI Navigation
  document.querySelectorAll('.nav-item').forEach(btn => {
    const onClick = btn.getAttribute('onclick');
    btn.classList.toggle('active', onClick && onClick.includes(`'${tabId}'`));
  });

  const titles = {
    dashboard: ['League Overview', 'Quick system health and alerts.'],
    manager: ['Manager Hub', 'Manage signings and view your team fixtures.'],
    requests: ['Stat Requests', 'Review and process player stat submissions.'],
    players: ['Player Management', 'View and edit player details, teams, and market values.'],
    teams: ['Team Management', 'Manage team balances, managers, and caps.'],
    matches: ['Match History', 'Update actual scores and match status.'],
    stats: ['Stats Manager', 'View and edit all player statistics for the current season.'],
    competitions: ['Divisions & Cups', 'Manage your league structure and tournaments.'],
    trophies: ['Trophies', 'Manage seasonal awards and team honors.'],
    logs: ['Audit Logs', 'History of all system actions.'],
    settings: ['League Settings', 'Control global variables like GW and Transfer Window.'],
    transfers: ['Transfer Market', 'Review and override transfer market listings.']
  };

  const [title, desc] = titles[tabId] || ['Admin Hub', ''];
  const titleEl = document.getElementById('tab-title');
  const descEl = document.getElementById('tab-desc');
  if (titleEl) titleEl.innerText = title;
  if (descEl) descEl.innerText = desc;

  // Render Action Buttons
  const actionsEl = document.getElementById('tab-actions');
  if (actionsEl) {
    if (tabId === 'teams') {
      actionsEl.innerHTML = `<button class="btn-save" style="background:var(--success); color:black;" onclick="addNewTeam()">+ Add Team</button>`;
    } else if (tabId === 'matches') {
      actionsEl.innerHTML = `
        <button class="btn-save" style="background:var(--success); color:black;" onclick="addNewMatch()">+ Schedule Match</button>
        <button class="btn-save" style="background:var(--accent); color:black; margin-left: 8px;" onclick="genFixtures()">⚡ Gen Fixtures</button>
      `;
    } else if (tabId === 'competitions') {
      actionsEl.innerHTML = `<button class="btn-save" style="background:var(--success); color:black;" onclick="addNewCompetition()">+ Add Competition</button>`;
    } else {
      actionsEl.innerHTML = '';
    }
  }

  // Load Content
  const content = document.getElementById('tab-content');
  if (!content) return;

  const user = JSON.parse(localStorage.getItem('vrfn_user'));
  if (!user || !user.id) {
     console.warn('Unauthorized access to admin panel.');
     window.location.href = 'login.html';
     return;
  }
  const adminId = user.id;

  content.innerHTML = `
    <div style="text-align:center; padding: 6rem 0;">
       <div class="loader" style="width:40px; height:40px; border:3px solid var(--accent-primary); border-top-color:transparent; border-radius:50%; margin:0 auto 1.5rem; animation: spin 0.8s linear infinite;"></div>
       <p style="font-weight: 800; font-size: 1.1rem; opacity: 0.5;">Filing the records for ${tabId.toUpperCase()}...</p>
    </div>
  `;

  try {
    switch (tabId) {
      case 'dashboard':
        loadDashboardTab(adminId);
        break;
      case 'manager':
        loadAdminManagerList(adminId);
        break;
      case 'requests':
        loadAdminRequests();
        break;
      case 'players':
        loadPlayers(adminId);
        break;
      case 'stats':
        loadAdminStats(adminId);
        break;
      case 'teams':
        loadTeams(adminId);
        break;
      case 'matches':
        loadMatches(adminId);
        break;
      case 'competitions':
        loadCompetitionsTab(adminId);
        break;
      case 'baldor':
        loadBaldor(adminId);
        break;
      case 'trophies':
        loadTrophiesTab(adminId);
        break;
      case 'transfers':
        loadTransfersTab(adminId);
        break;
      case 'logs':
        loadAuditLogs(adminId);
        break;
      case 'settings':
        loadSettings(adminId);
        break;
      case 'analytics':
        loadAnalytics(adminId);
        break;
    }
  } catch (e) {
    console.error('SwitchTab Error:', e);
    content.innerHTML = `<p style="color:var(--danger); padding:2rem;">Error loading tab: ${e.message}<br><small style="opacity:0.5;">${e.stack.split('\n')[0]}</small></p>`;
  }
}

async function loadCompetitionsTab(adminId) {
  const resp = await fetch(`/api/admin-api?action=competitions&userId=${adminId}`);
  const data = await resp.json();
  const wrapper = document.getElementById('tab-content');

  if (!Array.isArray(data)) {
    wrapper.innerHTML = `<div style="text-align:center; padding: 4rem;"><p style="color:var(--danger); font-weight:800;">Failed to load competitions.</p></div>`;
    return;
  }

  wrapper.innerHTML = `
    <div class="admin-table-wrapper reveal">
      <table>
        <thead>
          <tr>
            <th>Type</th>
            <th>Name</th>
            <th>ID (Code)</th>
            <th>Emoji</th>
            <th>Color</th>
            <th>Action</th>
          </tr>
        </thead>
        <tbody>
          ${data.map(c => `
            <tr>
              <td><span style="text-transform:uppercase; font-size:0.7rem; font-weight:800; color:${c.type==='cup' ? 'var(--accent-secondary)' : 'var(--accent-primary)'};">${c.type}</span></td>
              <td style="font-weight:700;">${c.name}</td>
              <td><code>${c.id}</code></td>
              <td style="font-size:1.2rem;">${c.emoji || '-'}</td>
              <td><div style="width:20px; height:20px; border-radius:50%; background:#${c.color.toString(16).padStart(6, '0')};"></div></td>
              <td style="display:flex; gap:0.5rem;">
                ${c.type === 'division' ? `<button class="btn-action approve" style="padding: 0.4rem 0.8rem; font-size: 0.75rem;" onclick="genFixtures('${c.id}')">Gen Fixtures</button>` : ''}
                <button class="btn-action" style="padding: 0.4rem 0.8rem; font-size: 0.75rem;" onclick="editCompetition('${c.id}', '${c.name}', '${c.type}', ${c.color}, '${c.emoji}')">Edit</button>
                <button class="btn-action" style="padding: 0.4rem 0.8rem; font-size: 0.75rem; background:rgba(255,69,58,0.1); color:var(--danger);" onclick="deleteItem('competitions', '${c.id}')">🗑️</button>
              </td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    </div>
  `;
  gsap.to(".reveal", { opacity: 1, y: 0, duration: 0.8 });
}

async function loadPlayers(adminId) {
  const resp = await fetch(`/api/admin-api?action=players&userId=${adminId}`);
  const data = await resp.json();
  const wrapper = document.getElementById('tab-content');

  if (!Array.isArray(data)) {
    wrapper.innerHTML = `<div style="text-align:center; padding: 4rem;"><p style="color:var(--danger); font-weight:800;">Failed to load player database.</p></div>`;
    return;
  }

  wrapper.innerHTML = `
    <div class="admin-table-wrapper reveal">
      <table>
        <thead>
          <tr>
            <th>Username</th>
            <th>Team</th>
            <th>Status</th>
            <th>Market Value</th>
            <th>Action</th>
          </tr>
        </thead>
        <tbody>
          ${data.map(p => `
            <tr style="cursor:pointer;" onclick="window.open('profile.html?view=${p.discord_id}&name=${encodeURIComponent(p.username)}', '_blank')">
              <td style="font-weight:700;">${p.username}</td>
              <td><span style="background:rgba(255,255,255,0.05); padding:0.3rem 0.6rem; border-radius:4px; font-size:0.75rem; color:var(--accent-primary); font-weight:700;">${p.team_name || 'Free Agent'}</span></td>
              <td><span style="color:${p.is_free_agent ? 'var(--accent-secondary)' : 'var(--success)'}">${p.is_free_agent ? 'Free Agent' : 'Signed'}</span></td>
              <td>£${(p.market_value || 0).toLocaleString()}</td>
              <td style="display:flex; gap:0.5rem;" onclick="event.stopPropagation()">
                <button class="btn-action" style="padding: 0.4rem 0.8rem; font-size: 0.75rem;" onclick="editPlayer('${p.discord_id}', '${p.username}', '${p.team_id || ''}')">Edit</button>
                <button class="btn-action" style="padding: 0.4rem 0.8rem; font-size: 0.75rem; background:#5865F2; color:white; border:none;" onclick="openDMModal('${p.discord_id}', '${p.username}')">💬</button>
                <button class="btn-action" style="padding: 0.4rem 0.8rem; font-size: 0.75rem; background:rgba(255,69,58,0.1); color:var(--danger);" onclick="deleteItem('players', '${p.discord_id}')">🗑️</button>
              </td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    </div>
  `;
  gsap.to(".reveal", { opacity: 1, y: 0, duration: 0.8 });
}

async function loadTeams(adminId) {
  const resp = await fetch(`/api/admin-api?action=teams&userId=${adminId}`);
  const data = await resp.json();
  const wrapper = document.getElementById('tab-content');

  if (!Array.isArray(data)) {
    wrapper.innerHTML = `<div style="text-align:center; padding: 4rem;"><p style="color:var(--danger); font-weight:800;">Failed to load team list.</p></div>`;
    return;
  }

  wrapper.innerHTML = `
    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 2rem;">
      <h2 style="font-weight: 900; letter-spacing: -1px;">🛡️ Team Management</h2>
      <button class="btn-action approve" onclick="addNewTeam()" style="padding: 0.8rem 1.5rem; font-weight: 800;">+ Create New Team</button>
    </div>
    <div class="admin-table-wrapper reveal">
      <table>
        <thead>
          <tr>
            <th>Team Name</th>
            <th>Players</th>
            <th>Division</th>
            <th>Balance</th>
            <th>Salary Cap</th>
            <th>Action</th>
          </tr>
        </thead>
        <tbody>
          ${data.map(t => `
            <tr>
              <td style="font-weight:700;">${t.name}</td>
              <td>${t.player_count || 0}</td>
              <td><span style="background:rgba(255,255,255,0.05); padding: 0.3rem 0.6rem; border-radius: 4px; font-size:0.7rem; font-weight:800; color:var(--accent-primary);">${(t.division || 'Unassigned').toUpperCase()}</span></td>
              <td style="color:var(--success); font-weight:700;">£${(t.balance || 0).toLocaleString()}</td>
              <td>£${(t.salary_cap || 0).toLocaleString()}</td>
              <td style="display:flex; gap:0.5rem;">
                <button class="btn-action" style="padding: 0.4rem 0.8rem; font-size: 0.75rem;" onclick="editTeam(${t.id}, '${t.name}', '${t.manager_discord_id}', ${t.balance}, ${t.salary_cap}, '${t.division}', '${t.role_id || ''}')">Edit</button>
                <button class="btn-action" style="padding: 0.4rem 0.8rem; font-size: 0.75rem; background:rgba(255,69,58,0.1); color:var(--danger);" onclick="deleteItem('teams', ${t.id})">🗑️</button>
              </td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    </div>
  `;
  gsap.to(".reveal", { opacity: 1, y: 0, duration: 0.8 });
}

async function loadMatches(adminId) {
  const resp = await fetch(`/api/admin-api?action=matches&userId=${adminId}`);
  const data = await resp.json();
  const wrapper = document.getElementById('tab-content');

  if (!Array.isArray(data)) {
    wrapper.innerHTML = `<div style="text-align:center; padding: 4rem;"><p style="color:var(--danger); font-weight:800;">Failed to load match schedule.</p></div>`;
    return;
  }

  wrapper.innerHTML = `
    <div class="admin-table-wrapper reveal">
      <table>
        <thead>
          <tr>
            <th>GW</th>
            <th>Home vs Away</th>
            <th>Score</th>
            <th>Status</th>
            <th>Action</th>
          </tr>
        </thead>
        <tbody>
          ${data.map(m => `
            <tr>
              <td>GW${m.gw}</td>
              <td style="font-weight:600;">${m.home_team} vs ${m.away_team}</td>
              <td style="font-family: monospace; font-size: 1.1rem; letter-spacing: 2px;">${m.home_score ?? '-'}:${m.away_score ?? '-'}</td>
              <td><span style="background:rgba(255,255,255,0.05); padding: 0.2rem 0.6rem; border-radius: 4px; font-size: 0.7rem;">${m.status.toUpperCase()}</span></td>
              <td style="display:flex; gap:0.5rem;">
                <button class="btn-action" style="padding: 0.4rem 0.8rem; font-size: 0.75rem;" onclick="editMatch(${m.id}, ${m.home_score}, ${m.away_score}, '${m.status}')">Edit</button>
                <button class="btn-action" style="padding: 0.4rem 0.8rem; font-size: 0.75rem; background:rgba(255,69,58,0.1); color:var(--danger);" onclick="deleteItem('matches', ${m.id})">🗑️</button>
              </td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    </div>
  `;
  gsap.to(".reveal", { opacity: 1, y: 0, duration: 0.8 });
}

async function loadSettings(adminId) {
  const resp = await fetch(`/api/admin-api?action=settings&userId=${adminId}`);
  const s = await resp.json();
  const wrapper = document.getElementById('tab-content');

  wrapper.innerHTML = `
    <div class="glass-card reveal" style="max-width: 600px; display: flex; flex-direction: column; gap: 1.5rem;">
      <h3 style="font-weight: 800; margin-bottom: 1rem;">Global League Configuration</h3>
      <div class="form-group">
        <label>Current Season Name</label>
        <input type="text" id="set-season" class="admin-input" value="${s.current_season || 'Season 1'}">
      </div>
      <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 1rem;">
        <div class="form-group">
          <label>Gameweek</label>
          <input type="number" id="set-gw" class="admin-input" value="${s.current_gw || 1}">
        </div>
        <div class="form-group">
          <label>Transfer Window</label>
          <select id="set-window" class="admin-input">
            <option value="open" ${s.transfer_window === 'open' ? 'selected' : ''}>OPEN</option>
            <option value="closed" ${s.transfer_window === 'closed' ? 'selected' : ''}>CLOSED</option>
          </select>
        </div>
      </div>
      <div class="form-group">
        <label>News/Announcement Channel ID (Discord)</label>
        <input type="text" id="set-news-channel" class="admin-input" value="${s.news_log_channel || ''}" placeholder="Channel ID for automated news">
      </div>
      <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 1rem;">
        <div class="form-group">
          <label>PREM Starting Budget (£)</label>
          <input type="number" id="set-budget-efl1" class="admin-input" value="${s.budget_efl1 || 5000000}">
        </div>
        <div class="form-group">
          <label>CHAMP Starting Budget (£)</label>
          <input type="number" id="set-budget-efl2" class="admin-input" value="${s.budget_efl2 || 3500000}">
        </div>
      </div>
      <div class="form-group">
        <label>LEAGUE ONE Starting Budget (£)</label>
        <input type="number" id="set-budget-efl3" class="admin-input" value="${s.budget_efl3 || 2000000}">
      </div>
      <div class="form-group">
         <label>League Points per Goal (Global Default)</label>
         <input type="number" id="set-points-goal" class="admin-input" value="${s.points_per_goal || 3}">
      </div>

      <div id="signing-notifications-config" style="margin-top: 1rem; border-top: 1px solid var(--glass-border); padding-top: 2rem;">
        <h3 style="font-weight: 800; margin-bottom: 1.5rem; display: flex; align-items: center; gap: 0.5rem;">
          📢 Signing Notifications <span style="font-size: 0.7rem; color: var(--text-secondary); font-weight: 400;">(Discord Integration)</span>
        </h3>
        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 1rem;">
          <div class="form-group">
            <label>Signings Channel ID</label>
            <input type="text" id="set-sign-channel" class="admin-input" value="${s.signings_channel_id || ''}" placeholder="Channel ID">
          </div>
          <div class="form-group">
            <label>League Owner ID (Krash)</label>
            <input type="text" id="set-owner-id" class="admin-input" value="${s.owner_id || ''}" placeholder="Discord User ID">
          </div>
        </div>
        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 1rem; margin-top: 1rem;">
          <div class="form-group">
            <label>PREM Overseer ID</label>
            <input type="text" id="set-prem-overseer" class="admin-input" value="${s.prem_overseer_id || ''}" placeholder="Discord User ID">
          </div>
          <div class="form-group">
            <label>CHAMP Overseer ID</label>
            <input type="text" id="set-champ-overseer" class="admin-input" value="${s.champ_overseer_id || ''}" placeholder="Discord User ID">
          </div>
        </div>
      </div>

      <div id="division-points-config" style="margin-top: 1rem; border-top: 1px solid var(--glass-border); padding-top: 2rem;">
        <h3 style="font-weight: 800; margin-bottom: 1.5rem; display: flex; align-items: center; gap: 0.5rem;">
          🎯 Points Configuration <span style="font-size: 0.7rem; color: var(--text-secondary); font-weight: 400;">(Per Division)</span>
        </h3>
        <div id="div-pts-list" style="display: flex; flex-direction: column; gap: 1.5rem;">
          <p style="color: var(--text-secondary); font-size: 0.85rem;">Loading divisions...</p>
        </div>
      </div>

      <button class="btn-login" style="margin-top: 2rem;" onclick="saveAdminSettings()">💾 SAVE ALL SETTINGS</button>
    </div>
  `;

  // Load Division Points
  try {
    const cResp = await fetch(`/api/admin-api?action=competitions&userId=${adminId}`);
    const comps = await cResp.json();
    const divs = comps.filter(c => c.type === 'division');
    const list = document.getElementById('div-pts-list');
    
    if (divs.length === 0) {
      list.innerHTML = '<p style="color: var(--text-secondary); font-size: 0.85rem;">No divisions found. Create one in the Competitions tab.</p>';
    } else {
      list.innerHTML = divs.map(d => `
        <div class="div-pts-row" data-id="${d.id}" data-name="${d.name}" data-type="${d.type}" data-color="${d.color}" data-emoji="${d.emoji || ''}" style="background: rgba(255,255,255,0.02); padding: 1.5rem; border-radius: 12px; border: 1px solid var(--glass-border);">
          <div style="display: flex; align-items: center; gap: 0.8rem; margin-bottom: 1.2rem;">
            <div style="width: 12px; height: 12px; border-radius: 50%; background: #${(d.color || 0).toString(16).padStart(6, '0')};"></div>
            <span style="font-weight: 900; font-size: 1.1rem; letter-spacing: -0.5px;">${d.name.toUpperCase()}</span>
          </div>
          <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 1rem;">
            <div class="form-group">
              <label style="font-size: 0.75rem;">Goal Points</label>
              <input type="number" class="admin-input pt-goal" value="${d.point_goal || 0}">
            </div>
            <div class="form-group">
              <label style="font-size: 0.75rem;">Assist Points</label>
              <input type="number" class="admin-input pt-assist" value="${d.point_assist || 0}">
            </div>
            <div class="form-group">
              <label style="font-size: 0.75rem;">Def CS Points</label>
              <input type="number" class="admin-input pt-def-cs" value="${d.point_def_cs || 0}">
            </div>
            <div class="form-group">
              <label style="font-size: 0.75rem;">GK CS Points</label>
              <input type="number" class="admin-input pt-gk-cs" value="${d.point_gk_cs || 0}">
            </div>
          </div>
        </div>
      `).join('');
    }
  } catch (e) {
    console.error('Failed to load division points:', e);
  }

  gsap.to(".reveal", { opacity: 1, y: 0, duration: 0.8 });
}

async function loadDashboardTab(adminId) {
    try {
        const pResp = await fetch(`/api/admin-api?action=players&userId=${adminId}`);
        const players = await pResp.json();
        const tResp = await fetch(`/api/admin-api?action=teams&userId=${adminId}`);
        const teams = await tResp.json();
        const rResp = await fetch(`/api/admin-api?action=stat-requests&userId=${adminId}`);
        const requests = await rResp.json();

        if (!Array.isArray(players) || !Array.isArray(teams) || !Array.isArray(requests)) {
            throw new Error('Malformed data received from server.');
        }

        const wrapper = document.getElementById('tab-content');
        if (!wrapper) return;
        const pendingCount = requests.filter(r => r.status === 'pending').length;

    let alertsHTML = '';
    if (pendingCount > 0) {
        alertsHTML += `<div style="padding: 0.8rem; background: rgba(255, 69, 58, 0.1); border-left: 3px solid var(--danger); border-radius: 8px; font-size: 0.85rem; font-weight: 700; color: var(--danger); margin-bottom: 0.5rem;">🚨 ${pendingCount} Stat Requests require your attention!</div>`;
    }
    if (teams.some(t => !t.manager_discord_id)) {
        alertsHTML += `<div style="padding: 0.8rem; background: rgba(255, 159, 10, 0.1); border-left: 3px solid #ff9f0a; border-radius: 8px; font-size: 0.85rem; font-weight: 700; color: #ff9f0a;">⚠️ Some teams are missing managers.</div>`;
    }

    wrapper.innerHTML = `
        <div class="metric-grid" style="margin-bottom: 3rem;">
            <div class="metric-card reveal">
                <p class="metric-label">Total Players</p>
                <p class="metric-value">${players.length}</p>
            </div>
            <div class="metric-card reveal">
                <p class="metric-label">Total Teams</p>
                <p class="metric-value">${teams.length}</p>
            </div>
            <div class="metric-card reveal">
                <p class="metric-label">Pending Requests</p>
                <p class="metric-value" style="color:${pendingCount > 0 ? 'var(--danger)' : 'var(--success)'};">${pendingCount}</p>
            </div>
        </div>

        <div class="glass-card reveal" style="padding: 2.5rem; border: 1px solid var(--accent-primary); background: rgba(77, 166, 255, 0.05); margin-bottom: 2rem;">
            <h3 style="font-weight: 800; margin-bottom: 0.5rem;">Quick Search <span style="font-size: 0.7rem; color: var(--text-secondary); margin-left:1rem;">(Press Ctrl + K)</span></h3>
            <p style="color: var(--text-secondary); font-size: 0.9rem;">Find any player or team across the entire network instantly.</p>
        </div>

        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 2rem;">
            <div class="glass-card reveal">
                <h3 style="margin-bottom: 1.5rem; font-weight: 800;">🔔 System Alerts</h3>
                <div id="dash-alerts" style="display: flex; flex-direction: column; gap: 0.8rem;">
                    ${alertsHTML || '<p style="color: var(--success); font-weight: 700;">✅ System Normal. No urgent alerts.</p>'}
                </div>
            </div>
            <div class="glass-card reveal">
                <h3 style="margin-bottom: 1.5rem; font-weight: 800;">⚡ Bot Status</h3>
                <div style="display: flex; align-items: center; gap: 1rem; padding: 1rem; border-radius: 12px; background: rgba(50, 215, 75, 0.05); border: 1px solid rgba(50, 215, 75, 0.2);">
                    <div style="width: 12px; height: 12px; border-radius: 50%; background: var(--success); box-shadow: 0 0 10px var(--success);"></div>
                    <div>
                        <p style="font-weight: 800; font-size: 0.9rem; color: var(--success);">BOT CONNECTED</p>
                        <p style="font-size: 0.75rem; color: var(--text-secondary);">Turso DB sync active</p>
                    </div>
                </div>
            </div>
        </div>
    `;
    gsap.to(".reveal", { opacity: 1, y: 0, duration: 0.8 });
    } catch (e) {
        console.error('Dashboard load failed:', e);
        const wrapper = document.getElementById('tab-content');
        if (wrapper) wrapper.innerHTML = `<div style="text-align:center; padding:4rem;"><p style="color:var(--danger); font-weight:800;">Failed to load system dashboard.</p><p style="font-size:0.8rem; color:var(--text-secondary);">${e.message}</p></div>`;
    }
}

async function saveAdminSettings() {
  const admin = JSON.parse(localStorage.getItem('vrfn_user'));
  const settingsData = [
    { key: 'current_season', value: document.getElementById('set-season').value },
    { key: 'current_gw', value: document.getElementById('set-gw').value },
    { key: 'transfer_window', value: document.getElementById('set-window').value },
    { key: 'news_log_channel', value: document.getElementById('set-news-channel').value },
    { key: 'budget_efl1', value: document.getElementById('set-budget-efl1').value },
    { key: 'budget_efl2', value: document.getElementById('set-budget-efl2').value },
    { key: 'budget_efl3', value: document.getElementById('set-budget-efl3').value },
    { key: 'points_per_goal', value: document.getElementById('set-points-goal').value },
    { key: 'signings_channel_id', value: document.getElementById('set-sign-channel').value },
    { key: 'prem_overseer_id', value: document.getElementById('set-prem-overseer').value },
    { key: 'champ_overseer_id', value: document.getElementById('set-champ-overseer').value },
    { key: 'owner_id', value: document.getElementById('set-owner-id').value }
  ];

  try {
    // 1. Save global settings
    for (const item of settingsData) {
      await fetch(`/api/admin-api?action=settings&userId=${admin.id}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(item)
      });
    }

    // 2. Save division points
    const divRows = document.querySelectorAll('.div-pts-row');
    for (const row of divRows) {
      const payload = {
        id: row.dataset.id,
        name: row.dataset.name,
        type: row.dataset.type,
        color: parseInt(row.dataset.color),
        emoji: row.dataset.emoji,
        point_goal: parseInt(row.querySelector('.pt-goal').value) || 0,
        point_assist: parseInt(row.querySelector('.pt-assist').value) || 0,
        point_def_cs: parseInt(row.querySelector('.pt-def-cs').value) || 0,
        point_gk_cs: parseInt(row.querySelector('.pt-gk-cs').value) || 0,
        isEdit: true
      };

      await fetch(`/api/admin-api?action=competitions&userId=${admin.id}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
    }

    cleanAlert('All settings and division points saved successfully!', 'SUCCESS', '✅');
  } catch (e) {
    console.error('Save settings failure:', e);
    cleanAlert('Failed to save settings: ' + e.message, 'ERROR', '❌');
  }
}

async function editPlayer(id, name, currentTeamId) {
  const user = JSON.parse(localStorage.getItem('vrfn_user'));
  let teamOptions = [{ value: 'free_agent', label: '❌ RELEASE TO FREE AGENCY' }];
  
  try {
    const tResp = await fetch(`/api/admin-api?action=teams&userId=${user.id}`);
    const teams = await tResp.json();
    teams.forEach(t => {
      teamOptions.push({ value: t.id, label: `🛡️ ${t.name}` });
    });
  } catch(e) { console.error('Failed to load teams for select:', e); }

  const newTeamId = await cleanSelect(`Move ${name} to which team?`, teamOptions, 'MANUAL OVERRIDE', '🔄');
  if (newTeamId === null) return;

  await fetch(`/api/admin-api?action=players&userId=${user.id}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ 
      player_action: 'manual-sign', 
      discord_id: id, 
      team_id: newTeamId 
    })
  });
  loadPlayers(user.id);
}

async function addNewTeam() {
  const admin = JSON.parse(localStorage.getItem('vrfn_user'));
  const name = await cleanPrompt("Enter team name:");
  if (!name) return;

  // Fetch real divisions from DB
  let divOptions = [];
  try {
    const cResp = await fetch(`/api/admin-api?action=competitions&userId=${admin.id}`);
    const comps = await cResp.json();
    divOptions = comps.filter(c => c.type === 'division').map(c => ({ value: c.id, label: c.name }));
  } catch(e) {}
  if (!divOptions.length) divOptions = [{ value: 'efl1', label: 'Default Division' }];

  const div = await cleanSelect("Select the division for this team:", divOptions, 'DIVISION', '🏟️');
  if (div === null) return;

  // Get budget from settings for this division
  let defSalary = 5000000;
  try {
    const sResp = await fetch(`/api/admin-api?action=settings&userId=${admin.id}`);
    const s = await sResp.json();
    if (div === 'efl1' && s.budget_efl1) defSalary = Number(s.budget_efl1);
    else if (div === 'efl2' && s.budget_efl2) defSalary = Number(s.budget_efl2);
    else if (div === 'efl3' && s.budget_efl3) defSalary = Number(s.budget_efl3);
  } catch(e) {}

  const manager = await cleanPrompt("Manager Discord ID (optional):", "");
  const roleId = await cleanPrompt("Discord Role ID (optional):", "");
  const balance = await cleanPrompt("Starting Balance (£):", defSalary);
  const cap = await cleanPrompt("Daily Wage Cap (£):", "10000");

  const resp = await fetch(`/api/admin-api?action=teams&userId=${admin.id}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name, manager_discord_id: manager || null, role_id: roleId || null, balance: Number(balance), salary_cap: Number(cap), division: div })
  });
  if (resp.ok) loadTeams(admin.id);
  else cleanAlert('❌ Failed to create team. Please try again.', 'ERROR', '⚠️');
}

async function editTeam(id, name, manager, bal, cap, div, roleId) {
  const user = JSON.parse(localStorage.getItem('vrfn_user'));
  const newName = await cleanPrompt(`Team Name:`, name);
  if (newName === null) return;
  const newManager = await cleanPrompt(`Manager Discord ID:`, manager);
  const newRoleId = await cleanPrompt(`Discord Role ID:`, roleId || '');
  const newBal = await cleanPrompt(`New Balance for ${name}:`, bal);
  const newCap = await cleanPrompt(`Wage Cap for ${name}:`, cap);

  // Fetch real divisions from DB
  let divOptions = [];
  try {
    const cResp = await fetch(`/api/admin-api?action=competitions&userId=${user.id}`);
    const comps = await cResp.json();
    divOptions = comps.filter(c => c.type === 'division').map(c => ({ value: c.id, label: c.name }));
  } catch(e) {}
  if (!divOptions.length) divOptions = [{ value: div || 'efl1', label: div || 'Default Division' }];

  const newDiv = await cleanSelect(`Division for ${name}:`, divOptions, 'CHANGE DIVISION', '🏟️');
  if (newDiv === null) return;

  await fetch(`/api/admin-api?action=teams&userId=${user.id}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ id, name: newName, manager_discord_id: newManager || null, role_id: newRoleId || null, balance: Number(newBal), salary_cap: Number(newCap), division: newDiv })
  });
  loadTeams(user.id);
}

// Removed duplicate addNewTeam

async function editMatch(id, hs, as_, status) {
  const h = await cleanPrompt(`Home Score:`, hs || 0);
  if (h === null) return;
  const a = await cleanPrompt(`Away Score:`, as_ || 0);
  const s = await cleanPrompt(`Status (scheduled/completed/cancelled):`, status);
  const user = JSON.parse(localStorage.getItem('vrfn_user'));

  await fetch(`/api/admin-api?action=matches&userId=${user.id}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ id, home_score: Number(h), away_score: Number(a), status: s })
  });
  loadMatches(user.id);
}

async function addNewMatch() {
  const season = await cleanPrompt("Season:", "Season 1");
  if (!season) return;
  const gw = await cleanPrompt("Gameweek:", "1");
  const home = await cleanPrompt("Home Team ID:", "");
  const away = await cleanPrompt("Away Team ID:", "");
  const user = JSON.parse(localStorage.getItem('vrfn_user'));

  await fetch(`/api/admin-api?action=matches&userId=${user.id}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ season, gw: Number(gw), home_team: home, away_team: away, status: 'scheduled' })
  });
  loadMatches(user.id);
}

async function genFixtures(divId) {
  const division = divId || await cleanPrompt("Division ID (e.g. Prem, champ):", "Prem");
  if (!division) return;
  const gw = await cleanPrompt("Gameweek (leave blank for current):", "");
  const count = await cleanPrompt("Number of matches to generate (leave blank for 5):", "5");
  const user = JSON.parse(localStorage.getItem('vrfn_user'));

  const res = await fetch(`/api/admin-api?action=generate-fixtures&userId=${user.id}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ 
      division, 
      gw: gw ? Number(gw) : null, 
      count: count ? Number(count) : 5 
    })
  });
  
  const data = await res.json();
  if (data.success) {
    alert(`Successfully generated ${data.count} fixtures for ${division}!`);
    loadMatches(user.id);
  } else {
    alert(`Error: ${data.error || 'Failed to generate fixtures'}`);
  }
}

async function addNewCompetition() {
  const id = await cleanPrompt("Unique ID (e.g. efl1):", "");
  if (!id) return;
  const name = await cleanPrompt("Display Name (e.g. Championship):", "");
  const type = await cleanPrompt("Type (division/cup):", "division");
  const colorHex = await cleanPrompt("Hex Color (without #, e.g. 4da6ff):", "4da6ff");
  const emoji = await cleanPrompt("Emoji:", "🏆");
  const user = JSON.parse(localStorage.getItem('vrfn_user'));

  await fetch(`/api/admin-api?action=competitions&userId=${user.id}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ id, name, type, color: parseInt(colorHex, 16), emoji })
  });
  loadCompetitionsTab(user.id);
}

async function editCompetition(id, name, type, color, emoji) {
  const newName = await cleanPrompt("Display Name:", name);
  if (newName === null) return;
  const newType = await cleanPrompt("Type (division/cup):", type);
  const newColorHex = await cleanPrompt("Hex Color (without #):", color.toString(16).padStart(6, '0'));
  const newEmoji = await cleanPrompt("Emoji:", emoji);
  const user = JSON.parse(localStorage.getItem('vrfn_user'));

  await fetch(`/api/admin-api?action=competitions&userId=${user.id}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ id, name: newName, type: newType, color: parseInt(newColorHex, 16), emoji: newEmoji, isEdit: true })
  });
  loadCompetitionsTab(user.id);
}

async function deleteItem(type, id) {
  if (!(await cleanConfirm(`Are you sure you want to delete this ${type.slice(0,-1)}? This cannot be undone.`))) return;
  const user = JSON.parse(localStorage.getItem('vrfn_user'));
  const body = type === 'players' ? { discord_id: id } : { id };

  await fetch(`/api/admin-api?action=${type}&userId=${user.id}`, {
    method: 'DELETE',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body)
  });
  
  if (type === 'players') loadPlayers(user.id);
  else if (type === 'teams') loadTeams(user.id);
  else if (type === 'matches') loadMatches(user.id);
  else if (type === 'competitions') loadCompetitionsTab(user.id);
}

// ── Stats Manager Logic ───────────────────────────────────────────
let adminStatsData = [];

async function loadAdminStats(adminId) {
    const wrapper = document.getElementById('tab-content');
    if (!wrapper) return;

    try {
        const resp = await fetch(`/api/admin-api?action=stats&userId=${adminId}`);
        adminStatsData = await resp.json();

        if (!Array.isArray(adminStatsData)) {
            throw new Error('Stats data is not in an array format.');
        }
        wrapper.innerHTML = `
            <div class="glass-card reveal" style="padding: 1.5rem; margin-bottom: 2rem; display: flex; justify-content: space-between; align-items: center; gap: 1rem;">
                <input type="text" id="stats-search" placeholder="🔍 Search players..." class="glass-input" style="width: 100%; max-width: 400px;" oninput="filterAdminStats()">
                <button class="btn-save" style="background:var(--accent-primary); color:black; height: fit-content;" onclick="openAddStatModal()">+ Add Stat</button>
            </div>
            <div class="admin-table-wrapper reveal">
                <table>
                    <thead>
                        <tr>
                            <th>Player</th>
                            <th>Team</th>
                            <th>Goals</th>
                            <th>Assists</th>
                            <th>Def CS</th>
                            <th>GK CS</th>
                            <th>Actions</th>
                        </tr>
                    </thead>
                    <tbody id="admin-stats-list">
                        ${renderAdminStatsRows(adminStatsData)}
                    </tbody>
                </table>
            </div>
        `;
        gsap.to(".reveal", { opacity: 1, y: 0, duration: 0.8 });
    } catch (e) {
        console.error('Failed to load stats:', e);
        wrapper.innerHTML = `<p style="color:var(--danger); padding:2rem;">Error loading stats.</p>`;
    }
}

function renderAdminStatsRows(data) {
    return data.map(p => `
        <tr onclick="openEditStatsModal('${p.discord_id}', '${p.username}', ${p.goals}, ${p.assists}, ${p.defender_cs}, ${p.gk_cs})" style="cursor:pointer;">
            <td style="font-weight:700;">${p.username}</td>
            <td>${p.team_name || '<span style="color:var(--text-secondary);">Free Agent</span>'}</td>
            <td>${p.goals}</td>
            <td>${p.assists}</td>
            <td>${p.defender_cs}</td>
            <td>${p.gk_cs}</td>
            <td>
                <button class="btn-action" style="padding: 0.4rem 0.8rem; font-size: 0.75rem;">Edit</button>
            </td>
        </tr>
    `).join('');
}

function renderAdminStats(data) {
    const list = document.getElementById('admin-stats-list');
    if (list) {
        list.innerHTML = renderAdminStatsRows(data);
    }
}

function filterAdminStats() {
    const query = document.getElementById('stats-search').value.toLowerCase();
    const filtered = adminStatsData.filter(p => 
        p.username.toLowerCase().includes(query) || (p.team_name || '').toLowerCase().includes(query)
    );
    renderAdminStats(filtered);
}

// ── Ballon d'Or Leaderboard ───────────────────────────────────────
async function loadBaldor(adminId) {
    const wrapper = document.getElementById('tab-content');
    if (!wrapper) return;

    try {
        const resp = await fetch(`/api/admin-api?action=stats&userId=${adminId}`);
        const data = await resp.json();

        if (!Array.isArray(data)) {
            throw new Error('Data format incorrect for award calculation.');
        }
        // Calculate points
        let baldorData = data.map(p => {
            const pts = (p.goals || 0) * 5 + (p.assists || 0) * 3 + (p.gk_cs || 0) * 4 + (p.defender_cs || 0) * 4;
            return { ...p, pts };
        });
        
        baldorData.sort((a, b) => b.pts - a.pts);

        wrapper.innerHTML = `
            <div class="glass-card reveal" style="padding: 2.5rem; text-align: center; margin-bottom: 2rem;">
                <h2 style="font-weight: 900; font-size: 2rem; color: #ffd700; text-shadow: 0 0 20px rgba(255,215,0,0.5);">BALLON D'OR LEADERBOARD</h2>
                <p style="color: var(--text-secondary);">Total Rating Points based on performance.</p>
            </div>
            <div class="admin-table-wrapper reveal">
                <table>
                    <thead>
                        <tr>
                            <th>Rank</th>
                            <th>Player</th>
                            <th>Team</th>
                            <th>Goals</th>
                            <th>Assists</th>
                            <th>Total Points</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${baldorData.map((p, i) => `
                            <tr style="cursor:pointer;" onclick="window.open('profile.html?id=${p.discord_id}', '_blank')">
                                <td style="font-weight:900; color:${i===0 ? '#ffd700' : (i===1 ? '#c0c0c0' : (i===2 ? '#cd7f32' : 'var(--text-secondary)'))}; font-size: 1.2rem;">#${i + 1}</td>
                                <td style="font-weight:800; font-size:1.1rem;">${p.username}</td>
                                <td><span style="background:rgba(255,255,255,0.05); padding:0.3rem 0.6rem; border-radius:4px; font-size:0.75rem; color:var(--accent-primary); font-weight:700;">${p.team_name || 'Free Agent'}</span></td>
                                <td>${p.goals}</td>
                                <td>${p.assists}</td>
                                <td style="font-weight:900; color:var(--accent-primary); font-size: 1.2rem;">${p.pts}</td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>
            </div>
        `;
        gsap.to(".reveal", { opacity: 1, y: 0, duration: 0.8 });
    } catch (e) {
        console.error('Failed to load baldor:', e);
        wrapper.innerHTML = `<p style="color:var(--danger); padding:2rem;">Error loading leaderboard.</p>`;
    }
}

async function loadAnalytics(adminId) {
    const wrapper = document.getElementById('tab-content');
    if (!wrapper) return;

    try {
        const resp = await fetch(`/api/admin-api?action=settings&subaction=analytics&userId=${adminId}`);
        const data = await resp.json();
        
        if (!data || typeof data !== 'object' || data.error) {
            throw new Error(data.error || 'Unauthorized access to analytics.');
        }

        // Show analytics tab
        const analyticsTab = document.getElementById('analytics-tab');
        wrapper.innerHTML = '';
        wrapper.appendChild(analyticsTab);
        analyticsTab.style.display = 'block';

        // Populate metrics
        document.getElementById('ana-total-stats').innerText = (data.totalStats || 0).toLocaleString();
        document.getElementById('ana-active-players').innerText = (data.activePlayers || 0).toLocaleString();
        document.getElementById('ana-total-value').innerText = '£' + (data.totalValue || 0).toLocaleString() + 'm';

        // Render insights
        const list = document.getElementById('analytics-insights-list');
        const teams = data.topTeams || [];
        list.innerHTML = teams.map(t => `
            <div class="glass-card" style="display:flex; justify-content:space-between; align-items:center; padding: 1.2rem; background: rgba(255,255,255,0.02);">
                <span style="font-weight:700;">${t.name}</span>
                <span class="badge" style="background:var(--accent-primary); color:black; font-weight:800;">${t.stats} Season Pts</span>
            </div>
        `).join('') || '<p style="color:var(--text-secondary);">No data for this season yet.</p>';

        gsap.to(".reveal", { opacity: 1, y: 0, duration: 0.8 });
    } catch (e) {
        console.error('Failed to load analytics:', e);
        wrapper.innerHTML = `<p style="color:var(--danger); padding:2rem;">Error: ${e.message}</p>`;
    }
}

function openEditStatsModal(id, name, g, a, d, k) {
    console.log('Opening modal for:', id, name);
    const idInput = document.getElementById('edit-stat-player-id');
    const nameSpan = document.getElementById('edit-stat-player-name');
    const gInput = document.getElementById('edit-goals');
    const aInput = document.getElementById('edit-assists');
    const dInput = document.getElementById('edit-defender_cs');
    const kInput = document.getElementById('edit-gk_cs');

    if (idInput) idInput.value = id;
    if (nameSpan) nameSpan.innerText = name;
    if (gInput) gInput.value = g;
    if (aInput) aInput.value = a;
    if (dInput) dInput.value = d;
    if (kInput) kInput.value = k;
    
    const modal = document.getElementById('edit-stats-modal');
    if (modal) {
        modal.style.display = 'flex';
        gsap.fromTo(modal.querySelector('.modal-content'), { scale: 0.9, opacity: 0 }, { scale: 1, opacity: 1, duration: 0.3 });
    }
}

// Modal closing logic
document.addEventListener('click', (e) => {
    if (e.target.classList.contains('close-modal') || e.target.classList.contains('modal')) {
        document.querySelectorAll('.modal').forEach(m => m.style.display = 'none');
    }
});

document.addEventListener('DOMContentLoaded', () => {
    const form = document.getElementById('edit-stats-form');
    if (form) {
        form.onsubmit = async (e) => {
            e.preventDefault();
            const id = document.getElementById('edit-stat-player-id').value;
            const user = JSON.parse(localStorage.getItem('vrfn_user'));
            
            const stats = [
                { type: 'goals', val: document.getElementById('edit-goals').value },
                { type: 'assists', val: document.getElementById('edit-assists').value },
                { type: 'defender_cs', val: document.getElementById('edit-defender_cs').value },
                { type: 'gk_cs', val: document.getElementById('edit-gk_cs').value }
            ];

            try {
                for (const s of stats) {
                    await fetch(`/api/admin-api?action=stats&userId=${user.id}`, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ player_id: id, stat_type: s.type, new_total: s.val })
                    });
                }
                document.getElementById('edit-stats-modal').style.display = 'none';
                loadAdminStats(user.id);
            } catch (err) {
                alert('Error saving stats');
            }
        };
    }
});

// ── Audit Logs ────────────────────────────────────────────────────
async function loadAuditLogs(adminId) {
    const wrapper = document.getElementById('tab-content');
    if (!wrapper) return;
    try {
        const resp = await fetch(`/api/admin-api?action=audit-log&userId=${adminId}`);
        const data = await resp.json();
        if (!Array.isArray(data)) throw new Error('Invalid data');
        const actionColor = { stat_approved: '#00e676', stat_declined: '#ff4d4d', trophy_awarded: '#ffd700', injury_added: '#ff9800', injury_cleared: '#00e676', pots_awarded: '#ffd700', season_reset: '#ff9800', lineup_posted: '#4da6ff', default: '#aaaaaa' };
        wrapper.innerHTML = `
            <h3 style="font-weight: 900; margin-bottom: 1.5rem;">📋 Admin Audit Log</h3>
            <div class="admin-table-wrapper reveal">
                <table>
                    <thead>
                        <tr>
                            <th>Time</th><th>Action</th><th>By</th><th>Target</th><th>Detail</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${data.length ? data.map(log => `
                            <tr>
                                <td style="font-size:0.8rem;color:var(--text-secondary);">${new Date(log.created_at).toLocaleString()}</td>
                                <td><span style="background: rgba(77,166,255,0.1); color:${actionColor[log.action] || actionColor.default}; padding:0.2rem 0.6rem; border-radius:4px; font-size:0.7rem; font-weight:800;">${(log.action || 'unknown').toUpperCase().replace(/_/g,' ')}</span></td>
                                <td style="font-weight:700;">${log.performed_by_name || 'Admin'}</td>
                                <td style="color:var(--accent-primary);">${log.target || '—'}</td>
                                <td style="font-size:0.85rem;color:var(--text-secondary);">${log.detail || '—'}</td>
                            </tr>
                        `).join('') : '<tr><td colspan="5" style="text-align:center;padding:2rem;color:var(--text-secondary);">No audit entries yet.</td></tr>'}
                    </tbody>
                </table>
            </div>
        `;
        gsap.to(".reveal", { opacity: 1, y: 0, duration: 0.4 });
    } catch (e) {
        console.error('Failed to load audit log:', e);
        wrapper.innerHTML = `<p style="color:var(--danger); padding:2rem;">Error loading audit log.</p>`;
    }
}

// ── Trophy Cabinet (Admin) ────────────────────────────────────────
async function loadTrophiesTab(adminId) {
    const wrapper = document.getElementById('tab-content');
    if (!wrapper) return;
    try {
        const resp = await fetch(`/api/admin-api?action=trophies&userId=${adminId}`);
        const trophies = await resp.json();
        wrapper.innerHTML = `
            <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:2rem;">
                <h3 style="font-weight:900;">🏆 Trophy Cabinet</h3>
                <button class="btn-login" style="margin:0;" onclick="awardTrophyUI()">+ Award Trophy</button>
            </div>
            <div class="admin-table-wrapper reveal">
                <table>
                    <thead><tr><th>Icon</th><th>Team</th><th>Title</th><th>Season</th><th>Date</th><th>Action</th></tr></thead>
                    <tbody>
                        ${trophies.length ? trophies.map(t => `
                            <tr>
                                <td style="font-size:1.5rem;">🏆</td>
                                <td style="font-weight:800;">${t.team_name || 'General'}</td>
                                <td style="color:var(--accent-primary);font-weight:700;">${t.name}</td>
                                <td>${t.season}</td>
                                <td style="font-size:0.8rem;color:var(--text-secondary);">${new Date(t.created_at).toLocaleDateString()}</td>
                                <td><button class="btn-action decline" onclick="deleteTrophy(${t.id})">Delete</button></td>
                            </tr>
                        `).join('') : '<tr><td colspan="6" style="text-align:center;padding:2rem;color:var(--text-secondary);">No trophies awarded yet.</td></tr>'}
                    </tbody>
                </table>
            </div>
        `;
        gsap.to(".reveal", { opacity: 1, y: 0, duration: 0.4 });
    } catch(e) {
        wrapper.innerHTML = `<p style="color:var(--danger);">Error loading trophies.</p>`;
    }
}

async function awardTrophyUI() {
    const user = JSON.parse(localStorage.getItem('vrfn_user'));
    const team = await cleanPrompt('Team Name:', '');
    if (!team) return;
    const title = await cleanPrompt('Trophy Title:', 'League Champions');
    if (!title) return;
    const icon = await cleanPrompt('Trophy Icon (emoji):', '🏆');
    const season = await cleanPrompt('Season:', '');
    await fetch(`/api/admin-api?action=trophies&userId=${user.id}`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ team_name: team, title, icon: icon || '🏆', season })
    });
    loadTrophiesTab(user.id);
}

async function deleteTrophy(id) {
    if (!(await cleanConfirm('Delete this trophy?'))) return;
    const user = JSON.parse(localStorage.getItem('vrfn_user'));
    await fetch(`/api/admin-api?action=trophies&userId=${user.id}`, {
        method: 'DELETE', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id })
    });
    loadTrophiesTab(user.id);
}


// ── Manual Stat Adding ───────────────────────────────────────────
function openAddStatModal() {
    document.getElementById('add-stat-modal').style.display = 'flex';
    document.getElementById('add-stat-player-search').value = '';
    document.getElementById('add-stat-player-id').value = '';
    document.getElementById('stat-player-results').innerHTML = '';
}

function closeAddStatModal() {
    document.getElementById('add-stat-modal').style.display = 'none';
}

function searchStatPlayers() {
    const query = document.getElementById('add-stat-player-search').value.toLowerCase();
    const results = document.getElementById('stat-player-results');
    if (query.length < 2) {
        results.innerHTML = '';
        return;
    }

    const matches = adminStatsData.filter(p => p.username.toLowerCase().includes(query)).slice(0, 5);
    results.innerHTML = matches.map(p => `
        <div class="result-item" onclick="selectStatPlayer('${p.discord_id}', '${p.username}')">
            ${p.username} <span style="font-size:0.7rem; color:var(--text-secondary);">(${p.team_name || 'FA'})</span>
        </div>
    `).join('');
}

function selectStatPlayer(id, name) {
    document.getElementById('add-stat-player-id').value = id;
    document.getElementById('add-stat-player-search').value = name;
    document.getElementById('stat-player-results').innerHTML = '';
}

async function submitManualStat() {
    const playerId = document.getElementById('add-stat-player-id').value;
    const statType = document.getElementById('add-stat-type').value;
    const value = document.getElementById('add-stat-value').value;
    const admin = JSON.parse(localStorage.getItem('vrfn_user'));

    if (!playerId) return alert('Please select a player.');
    if (!value || value <= 0) return alert('Enter a valid value.');

    try {
        const player = adminStatsData.find(p => p.discord_id === playerId);
        const currentTotal = player ? (player[statType] || 0) : 0;
        const newTotal = parseInt(currentTotal) + parseInt(value);

        const resp = await fetch(`/api/admin-api?action=stats&userId=${admin.id}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ player_id: playerId, stat_type: statType, new_total: newTotal })
        });

        if (resp.ok) {
            alert('Stat added successfully!');
            closeAddStatModal();
            loadAdminStats(admin.id);
        } else {
            alert('Failed to add stat.');
        }
    } catch (e) {
        console.error(e);
        alert('Error.');
    }
}

// ── Transfers Search Logic ──────────────────────────────────────────
let transferPlayersData = [];

function searchTransferPlayers() {
    const query = document.getElementById('transfer-player-search').value.toLowerCase();
    const results = document.getElementById('transfer-player-results');
    if (query.length < 2) {
        results.innerHTML = '';
        return;
    }

    const matches = transferPlayersData.filter(p => 
        p.username.toLowerCase().includes(query) || 
        p.discord_id.includes(query)
    ).slice(0, 8);

    if (matches.length === 0) {
        results.innerHTML = '<div style="padding:1rem; opacity:0.5; font-size:0.8rem;">No players found.</div>';
        return;
    }

    results.innerHTML = matches.map(p => `
        <div class="result-item" onclick="selectTransferPlayer('${p.discord_id}', '${p.username}')">
            <div style="font-weight:700;">${p.username}</div>
            <div style="font-size:0.75rem; opacity:0.6;">${p.team_name || 'Free Agent'} • ${p.discord_id}</div>
        </div>
    `).join('');
}

function selectTransferPlayer(id, name) {
    document.getElementById('manual-sign-player-id').value = id;
    document.getElementById('transfer-player-search').value = name;
    document.getElementById('transfer-player-results').innerHTML = '';
}

// ── Direct DM Functions ──────────────────────────────────────────
function openDMModal(targetId, targetName) {
    document.getElementById('dm-modal').style.display = 'flex';
    document.getElementById('dm-target-id').value = targetId;
    document.getElementById('dm-target-name').innerText = `To: ${targetName} (${targetId})`;
    document.getElementById('dm-title').value = '';
    document.getElementById('dm-message').value = '';
}

function closeDMModal() {
    document.getElementById('dm-modal').style.display = 'none';
}

async function submitDirectDM() {
    const targetId = document.getElementById('dm-target-id').value;
    const title = document.getElementById('dm-title').value;
    const message = document.getElementById('dm-message').value;
    const admin = JSON.parse(localStorage.getItem('vrfn_user'));

    if (!message) return alert('Please enter a message.');

    try {
        const resp = await fetch(`/api/admin-api?action=players&userId=${admin.id}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ player_action: 'dm', discord_id: targetId, title, message })
        });

        if (resp.ok) {
            alert('DM queued successfully! The bot will send it shortly.');
            closeDMModal();
        } else {
            const err = await resp.json();
            alert(`Failed to queue DM: ${err.error || 'Unknown error'}`);
        }
    } catch (e) {
        console.error(e);
        alert('Error communicating with server.');
    }
}

// ── Public League Components ─────────────────────────────────────
async function loadPublicLeague(season = '') {
    const url = season ? `/api/public/league-data?season=${encodeURIComponent(season)}` : '/api/public/league-data';
    const resp = await fetch(url);
    const data = await resp.json();

    // 0. Season Selector (Archive)
    const selector = document.getElementById('season-selector');
    if (selector && selector.children.length <= 1) { // Only populate once
        selector.innerHTML = (data.seasons || []).map(s => `<option value="${s}" ${s === (season || data.seasons[data.seasons.length-1]) ? 'selected' : ''}>${s}</option>`).join('');
    }

    // 1. Standings
    const body = document.getElementById('standings-body');
    if (body) {
        body.innerHTML = data.standings.map((t, i) => `
            <tr style="cursor:pointer;" onclick="window.open('teams.html?id=${t.id}', '_blank')">
                <td style="font-weight:900; color:var(--accent-primary); opacity:0.6;">${i+1}</td>
                <td style="font-weight:800; font-size:1.1rem;">${t.name}</td>
                <td>${t.p}</td>
                <td>${t.w}</td>
                <td>${t.d}</td>
                <td>${t.l}</td>
                <td style="font-weight:700; color:${t.gd >= 0 ? 'var(--success)' : 'var(--danger)'};">${t.gd >= 0 ? '+' : ''}${t.gd}</td>
                <td style="font-weight:900; font-size:1.2rem;">${t.pts}</td>
            </tr>
        `).join('');
    }

    // 2. Market Hub
    const marketList = document.getElementById('market-list');
    if (marketList) {
        marketList.innerHTML = data.market.map(p => `
            <div class="glass-card reveal" style="padding: 1.5rem; text-align: center; border: 1px solid rgba(255,255,255,0.05);">
                <div style="font-size: 2.5rem; margin-bottom: 1rem;">👤</div>
                <h3 style="font-weight: 800; font-size: 1.2rem; margin-bottom: 0.5rem;">${p.username}</h3>
                <div style="display:flex; justify-content:center; gap:0.5rem; margin-bottom: 1rem;">
                    <p style="background: rgba(88, 101, 242, 0.1); color: #5865F2; padding: 0.3rem 0.8rem; border-radius: 20px; font-size: 0.65rem; font-weight: 800; text-transform: uppercase;">LISTED</p>
                    ${p.previous_teams ? `<p style="background: rgba(255,165,0,0.1); color: #ffa500; padding: 0.3rem 0.8rem; border-radius: 20px; font-size: 0.65rem; font-weight: 800; text-transform: uppercase;" title="${p.previous_teams}">HAVE HISTORY</p>` : ''}
                </div>
                <div style="margin-bottom: 1rem; font-size: 0.75rem; color: var(--text-secondary); height: 2.4em; overflow: hidden; line-height: 1.2;">
                    ${p.previous_teams ? `Prev: ${p.previous_teams}` : 'No previous team records.'}
                </div>
                <div style="margin-top: 1rem; padding-top: 1rem; border-top: 1px solid var(--glass-border);">
                    <p style="font-weight: 900; font-size: 1.1rem; color: var(--accent-secondary);">£${(p.market_value || 0).toLocaleString()}</p>
                    <p style="font-size: 0.75rem; color: var(--text-secondary); margin-top: 0.2rem;">MARKET VALUE</p>
                </div>
                <button class="btn-login btn-outline" style="width: 100%; margin-top: 1rem; font-size: 0.8rem;" onclick="window.location.href='profile.html?id=${p.discord_id}'">VIEW PROFILE</button>
            </div>
        `).join('');
    }

    // 3. Finance (Net Worth)
    const financeBody = document.getElementById('finance-body');
    if (financeBody) {
        financeBody.innerHTML = data.finance.map((t, i) => `
            <tr>
                <td style="font-weight: 900; opacity: 0.5;">#${i+1}</td>
                <td style="font-weight: 800;">${t.name}</td>
                <td>${t.squad_size}</td>
                <td>£${(t.balance || 0).toLocaleString()}</td>
                <td style="font-weight: 900; color: var(--gold); font-size: 1.1rem;">£${(t.net_worth || 0).toLocaleString()}</td>
            </tr>
        `).join('');
    }

    // 4. Matches & Countdown
    const scheduleList = document.getElementById('schedule-list');
    if (scheduleList) {
        scheduleList.innerHTML = data.fixtures.map(m => `
            <div class="glass-card reveal" style="padding: 2rem; display: flex; flex-direction: column; align-items: center; gap: 1rem;">
                <div style="display: flex; gap: 2rem; align-items: center; width: 100%; justify-content: center;">
                    <div style="text-align: right; flex: 1; font-weight: 900; font-size: 1.2rem;">${m.home_team}</div>
                    <div style="background: var(--accent-primary); color: black; font-weight: 900; padding: 0.5rem 1rem; border-radius: 8px;">VS</div>
                    <div style="text-align: left; flex: 1; font-weight: 900; font-size: 1.2rem;">${m.away_team}</div>
                </div>
                <div style="color: var(--text-secondary); font-weight: 800; font-size: 0.85rem; letter-spacing: 1px;">GW${m.gw} • ${m.season}</div>
                <div class="countdown" style="font-family: monospace; font-size: 1.4rem; font-weight: 700; color: var(--accent-secondary);">MATCH DAY</div>
            </div>
        `).join('');
    }

    // 5. Leaderboards
    const goalsList = document.getElementById('goals-leaderboard');
    if (goalsList) {
        goalsList.innerHTML = data.leaderboards.goals.map((r, i) => `
            <div class="lb-item">
                <span class="lb-rank">${i+1}</span>
                <span class="lb-name">${r.player_name}</span>
                <span class="lb-value">${r.total}</span>
            </div>
        `).join('');
    }
    const assistsList = document.getElementById('assists-leaderboard');
    if (assistsList) {
        assistsList.innerHTML = data.leaderboards.assists.map((r, i) => `
            <div class="lb-item">
                <span class="lb-rank">${i+1}</span>
                <span class="lb-name">${r.player_name}</span>
                <span class="lb-value">${r.total}</span>
            </div>
        `).join('');
    }

    gsap.to(".reveal", { opacity: 1, y: 0, duration: 1.2, stagger: 0.05, ease: "expo.out" });
}

function switchLeagueTab(tab) {
    document.querySelectorAll('.league-tab').forEach(el => el.style.display = 'none');
    document.querySelectorAll('.nav-item').forEach(el => el.classList.remove('active'));
    
    document.getElementById(`${tab}-view`).style.display = 'block';
    document.getElementById(`tab-btn-${tab}`).classList.add('active');
}

async function checkManagerStatus() {
  const user = JSON.parse(localStorage.getItem('vrfn_user'));
  if (!user) return;
  try {
    const resp = await fetch(`/api/manager-api?action=check&userId=${user.id}`);
    if (resp.ok) {
        const team = await resp.json();
        window.managedTeam = team;
    }
    
    // If admin or manager, show the nav item
    if (window.managedTeam || user.isAdmin) {
        const nav = document.getElementById('nav-manager');
        if (nav) nav.style.display = 'block';
        updateUI(user);
    }
  } catch(e) {}
}

async function loadAdminManagerList(adminId) {
    const wrapper = document.getElementById('tab-content');
    if (!wrapper) return;
    wrapper.innerHTML = `<div style="text-align:center; padding: 4rem;"><p>Loading and fetching all teams...</p></div>`;
    
    try {
        const resp = await fetch(`/api/admin-api?action=teams&userId=${adminId}`);
        const teams = await resp.json();

        wrapper.innerHTML = `
            <div class="glass-card reveal" style="padding: 1.5rem; margin-bottom: 2rem;">
                <input type="text" id="team-manager-search" placeholder="🔍 Search teams..." class="glass-input" style="width: 100%;" oninput="filterTeamManagerList()">
            </div>
            <div class="metric-grid reveal" id="team-manager-list" style="grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));">
                ${teams.map(t => `
                    <div class="metric-card team-card" data-name="${t.name.toLowerCase()}">
                        <div style="font-size: 1.5rem; margin-bottom: 0.5rem;">🏟️</div>
                        <h4 style="font-weight: 800; margin-bottom: 0.2rem;">${t.name} <span style="font-size: 0.9rem; opacity: 0.6; font-weight: 400;">(${t.player_count || 0})</span></h4>
                        <p style="font-size: 0.75rem; color: var(--text-secondary); margin-bottom: 1.5rem;">${t.division || 'No Division'}</p>
                        <button class="btn-action approve" style="width: 100%;" onclick="loadManagerHub('${t.id}', true)">Manage Team</button>
                    </div>
                `).join('')}
            </div>
        `;
        gsap.to(".reveal", { opacity: 1, y: 0, duration: 0.8 });
    } catch (e) {
        wrapper.innerHTML = `<p style="color:var(--danger); text-align:center;">Failed to load team list.</p>`;
    }
}

window.filterTeamManagerList = () => {
    const q = document.getElementById('team-manager-search').value.toLowerCase();
    document.querySelectorAll('.team-card').forEach(card => {
        card.style.display = card.dataset.name.includes(q) ? 'block' : 'none';
    });
};

async function loadManagerHub(id, isAdminView = false) {
    const user = JSON.parse(localStorage.getItem('vrfn_user'));
    const url = isAdminView 
        ? `/api/manager-api?action=data&userId=${user.id}&targetTeamId=${id}`
        : `/api/manager-api?action=data&userId=${user.id}`;
    
    const resp = await fetch(url);
    const data = await resp.json();
    const wrapper = document.getElementById('tab-content');
    if (isAdminView) {
        // We are in Admin Panel, wrapper is available
    } else {
        // We are on manager.html, wrapper might be different or same ID
    }

    if (!data.team) {
        wrapper.innerHTML = `<div style="text-align:center; padding: 4rem;"><p style="color:var(--danger); font-weight:800;">Failed to load Manager Hub.</p></div>`;
        return;
    }

    wrapper.innerHTML = `
        ${isAdminView ? `<button class="btn-action" style="margin-bottom: 1.5rem; background: rgba(255,255,255,0.05);" onclick="loadAdminManagerList('${user.id}')">← Back to Team List</button>` : ''}
        <div style="display:grid; grid-template-columns: 1fr 1fr; gap: 1.5rem; margin-bottom: 2rem;">
            <div class="glass-card reveal" style="padding: 1.5rem; border: 1px solid var(--accent-primary);">
                <h3 style="margin-bottom: 1rem; color: var(--accent-primary);">🛡️ ${data.team.name}</h3>
                <div style="display:flex; justify-content:space-between; margin-bottom: 0.5rem; font-size: 0.9rem;">
                    <span>Current Balance:</span>
                    <span style="font-weight:700; color:var(--success);">£${(data.team.balance || 0).toLocaleString()}</span>
                </div>
                <div style="display:flex; justify-content:space-between; font-size: 0.9rem;">
                    <span>Daily Wage Cap:</span>
                    <span style="font-weight:700;">£${(data.team.salary_cap || 0).toLocaleString()}</span>
                </div>
            </div>
            
            <div class="glass-card reveal" style="padding: 1.5rem;">
                <h3 style="margin-bottom: 1.5rem; display: flex; align-items: center; gap: 0.5rem;">
                    <span>📝</span> Sign New Player
                </h3>
                
                <div style="margin-bottom: 1.5rem;">
                    <label style="display: block; font-size: 0.75rem; text-transform: uppercase; letter-spacing: 1px; opacity: 0.6; margin-bottom: 0.5rem;">Option A: Select Free Agent</label>
                    <div style="display:flex; gap:0.5rem;">
                        <select id="fa-select" class="glass-input" style="flex:1; background: rgba(0,0,0,0.3); color: #fff; cursor: pointer;">
                            <option value="" style="background: #1a1a1a;">Choose a Free Agent...</option>
                            ${data.freeAgents.map(f => `<option value="${f.discord_id}" style="background: #1a1a1a;">${f.username} (£${(f.market_value || 0).toLocaleString()})</option>`).join('')}
                        </select>
                        <button class="btn-action approve" onclick="managerSign('${id}', ${isAdminView}, 'select')" style="padding:0 1.5rem; min-width: 100px; font-weight: 800;">SIGN</button>
                    </div>
                </div>

                <div style="margin-bottom: 1.5rem;">
                    <label style="display: block; font-size: 0.75rem; text-transform: uppercase; letter-spacing: 1px; opacity: 0.6; margin-bottom: 0.5rem;">Option B: Manual Discord ID</label>
                    <div style="display:flex; gap:0.5rem;">
                        <input type="text" id="manual-discord-id" placeholder="Enter Discord ID..." class="glass-input" style="flex:1; background: rgba(0,0,0,0.3);">
                        <button class="btn-action approve" onclick="managerSign('${id}', ${isAdminView}, 'manual')" style="padding:0 1.5rem; min-width: 100px; font-weight: 800;">SIGN</button>
                    </div>
                </div>

                <div style="padding-top: 1rem; border-top: 1px solid rgba(255,255,255,0.05);">
                    <button class="btn-action" style="width: 100%; height: 50px; background: linear-gradient(135deg, var(--accent-primary), #4da6ff); color: white; border: none; font-weight: 800; letter-spacing: 1px;" onclick="managerRequestRoom()">
                        💬 REQUEST SIGNING ROOM (DISCORD)
                    </button>
                    <p style="font-size: 0.7rem; text-align: center; margin-top: 0.5rem; opacity: 0.5;">Bot will create a private room in the server and @mention you.</p>
                </div>
            </div>
        </div>
        <div style="display:grid; grid-template-columns: 1.5fr 1fr; gap: 1.5rem;">
            <div class="glass-card reveal" style="padding: 1.5rem;">
                <h3 style="margin-bottom: 1rem; display:flex; justify-content:space-between;">
                   <span>👥 Roster</span>
                   <span style="font-size: 0.8rem; opacity: 0.5;">${data.roster.length} Players</span>
                </h3>
                <div class="admin-table-wrapper">
                    <table>
                        <thead>
                            <tr><th>Player</th><th>Market Value</th><th>Action</th></tr>
                        </thead>
                        <tbody>
                            ${data.roster.map(p => `
                                <tr>
                                    <td style="font-weight:700;">${p.username}</td>
                                    <td>£${(p.market_value || 0).toLocaleString()}</td>
                                    <td>
                                        <button class="btn-action" style="padding: 0.4rem 0.8rem; font-size: 0.75rem; background:rgba(255,69,58,0.1); color:var(--danger);" onclick="managerRelease('${p.discord_id}', '${p.username}', '${id}', ${isAdminView})">RELEASE</button>
                                    </td>
                                </tr>
                            `).join('')}
                        </tbody>
                    </table>
                </div>
            </div>

            <div class="glass-card reveal" style="padding: 1.5rem;">
                <h3 style="margin-bottom: 1rem;">⚽ Team Fixtures</h3>
                <div class="fixture-list" style="display:flex; flex-direction:column; gap:0.75rem;">
                    ${data.fixtures.length === 0 ? '<p style="text-align:center; opacity:0.5;">No fixtures scheduled yet.</p>' : data.fixtures.map(m => `
                        <div style="padding: 1rem; background: rgba(255,255,255,0.03); border-radius: 12px; border: 1px solid rgba(255,255,255,0.05); display: flex; justify-content: space-between; align-items: center;">
                            <div style="font-size: 0.7rem; color: var(--accent-primary); font-weight: 800; text-transform: uppercase;">GW${m.gw}</div>
                            <div style="font-weight: 700; flex: 1; text-align: center;">${m.home_team} vs ${m.away_team}</div>
                            <div style="font-family: monospace; font-weight: 800; font-size: 1.1rem; color: var(--accent-primary); letter-spacing: 2px; min-width: 50px; text-align: right;">${m.home_score ?? '-'}:${m.away_score ?? '-'}</div>
                        </div>
                    `).join('')}
                </div>
            </div>
        </div>

        <div style="margin-top: 2rem;">
            <div class="glass-card reveal" style="padding: 1.5rem; border: 1px solid rgba(241,196,15,0.3);">
                <h3 style="margin-bottom: 1.5rem; display: flex; align-items: center; gap: 0.5rem; color: #f1c40f;">
                    <span>⏳</span> Pending Transactions
                </h3>
                <div id="manager-pending-list" style="display: grid; grid-template-columns: repeat(auto-fill, minmax(280px, 1fr)); gap: 1rem;">
                    <!-- Loaded via separate call -->
                    <p style="opacity: 0.5; text-align: center; grid-column: 1/-1;">Loading pending transactions...</p>
                </div>
            </div>
        </div>
    `;
    
    // Load pending data
    setTimeout(async () => {
        try {
            const pResp = await fetch(`/api/manager-api?action=pending&userId=${user.id}${isAdminView ? '&targetTeamId=' + id : ''}`);
            const pData = await pResp.json();
            const listEl = document.getElementById('manager-pending-list');
            if (pData.length === 0) {
                listEl.innerHTML = '<p style="opacity: 0.5; text-align: center; grid-column: 1/-1; padding: 1rem;">No pending transactions for your team.</p>';
            } else {
                listEl.innerHTML = pData.map(t => `
                    <div style="padding: 1rem; background: rgba(255,255,255,0.03); border-radius: 12px; border: 1px solid rgba(255,255,255,0.05);">
                        <div style="font-weight: 800; margin-bottom: 0.3rem;">${t.player_name}</div>
                        <div style="font-size: 0.75rem; opacity: 0.6; margin-bottom: 0.8rem;">
                            ${t.from_team} → ${t.to_team}
                        </div>
                        <div style="display:flex; justify-content:space-between; align-items:center;">
                            <span style="font-size: 0.7rem; font-weight: 900; color: #f1c40f; text-transform: uppercase;">${t.status}</span>
                            <span style="font-size: 0.7rem; opacity: 0.4;">${t.type.toUpperCase()}</span>
                        </div>
                    </div>
                `).join('');
            }
        } catch (e) {
            document.getElementById('manager-pending-list').innerHTML = '<p style="color:var(--danger); text-align:center;">Failed to load pending.</p>';
        }
    }, 100);

    gsap.to(".reveal", { opacity: 1, y: 0, duration: 0.5 });
}

async function managerSign(targetId, isAdminView = false, method = 'select') {
  let playerId = '';
  if (method === 'select') {
      playerId = document.getElementById('fa-select').value;
  } else {
      playerId = document.getElementById('manual-discord-id').value.trim();
  }

  if (!playerId) {
    cleanAlert('Please provide a Discord ID or select a player!', 'ERROR', '⚠️');
    return;
  }
  const user = JSON.parse(localStorage.getItem('vrfn_user'));
  const url = isAdminView 
    ? `/api/manager-api?action=sign&userId=${user.id}&targetTeamId=${targetId}`
    : `/api/manager-api?action=sign&userId=${user.id}`;

  const resp = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ playerDiscordId: playerId, type: 'sign' })
  });
  const data = await resp.json();
  if (resp.ok) {
    cleanAlert(`✅ Successfully signed player!`, 'SUCCESS', '🤝');
    loadManagerHub(targetId, isAdminView);
  } else {
    cleanAlert(data.error || 'Failed to sign player.', 'ERROR', '⚠️');
  }
}

async function managerRequestRoom() {
    const user = JSON.parse(localStorage.getItem('vrfn_user'));
    const resp = await fetch(`/api/manager-api?action=request-room&userId=${user.id}`, {
        method: 'POST'
    });
    const data = await resp.json();
    if (resp.ok) {
        cleanAlert(data.message, 'SUCCESS', '💬');
    } else {
        cleanAlert(data.error || 'Failed to request room.', 'ERROR', '⚠️');
    }
}

async function managerRelease(playerId, playerName, targetId, isAdminView = false) {
  const confirmed = await cleanConfirm(`Are you sure you want to release **${playerName}**?`, `RELEASE ${playerName.toUpperCase()}`, '🗑️');
  if (!confirmed) return;
  const user = JSON.parse(localStorage.getItem('vrfn_user'));
  const url = isAdminView 
    ? `/api/manager-api?action=sign&userId=${user.id}&targetTeamId=${targetId}`
    : `/api/manager-api?action=sign&userId=${user.id}`;

  const resp = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ playerDiscordId: playerId, type: 'release' })
  });
  if (resp.ok) {
    cleanAlert(`✅ Successfully released ${playerName}.`, 'SUCCESS', '👋');
    loadManagerHub(targetId, isAdminView);
  } else {
     const data = await resp.json();
     cleanAlert(data.error || 'Failed to release player.', 'ERROR', '⚠️');
  }
}
async function loadTransfersTab(adminId) {
    const wrapper = document.getElementById('tab-content');
    try {
        const [market, teams, allPlayers] = await Promise.all([
            fetch(`/api/admin-api?action=market&userId=${adminId}`).then(r => r.json()),
            fetch(`/api/admin-api?action=teams&userId=${adminId}`).then(r => r.json()),
            fetch(`/api/admin-api?action=stats&userId=${adminId}`).then(r => r.json())
        ]);
        transferPlayersData = allPlayers;

        wrapper.innerHTML = `
            <div class="glass-card reveal" style="padding: 2rem; margin-bottom: 2rem; border: 1px solid var(--accent-primary); position: relative;">
                <h3 style="margin-bottom: 1.5rem; display: flex; align-items: center; gap: 0.8rem; font-weight: 900; letter-spacing: -0.5px;">
                    <span style="font-size: 1.5rem;">⚖️</span> Manual Signing (Admin Override)
                </h3>
                <div style="display: grid; grid-template-columns: 1.5fr 1fr auto; gap: 1.2rem; align-items: end;">
                    <div style="position: relative;">
                        <label style="display: block; font-size: 0.75rem; text-transform: uppercase; letter-spacing: 1px; opacity: 0.6; margin-bottom: 0.6rem; font-weight: 700;">Player Search</label>
                        <input type="text" id="transfer-player-search" placeholder="Search name or ID..." class="glass-input" style="width: 100%;" oninput="searchTransferPlayers()">
                        <input type="hidden" id="manual-sign-player-id">
                        <div id="transfer-player-results" class="search-results-pop"></div>
                    </div>
                    <div>
                        <label style="display: block; font-size: 0.75rem; text-transform: uppercase; letter-spacing: 1px; opacity: 0.6; margin-bottom: 0.6rem; font-weight: 700;">Destination Team</label>
                        <select id="manual-sign-team-id" class="glass-input" style="width: 100%; cursor: pointer;">
                            <option value="">Choose Team...</option>
                            <option value="free_agent" style="color:var(--accent-secondary); font-weight:800;">❌ RELEASE TO FREE AGENCY</option>
                            ${teams.sort((a,b) => a.name.localeCompare(b.name)).map(t => `<option value="${t.id}">${t.name}</option>`).join('')}
                        </select>
                    </div>
                    <button class="btn-action approve" onclick="adminManualSign('${adminId}')" style="padding: 1.1rem 2.5rem; font-weight: 900; letter-spacing: 1px; height: 52px; display:flex; align-items:center; gap:0.5rem; background: var(--accent-primary); color: #000; border:none; border-radius: 12px; cursor:pointer;">
                        <span style="font-size:1.1rem;">🤝</span> SIGN PLAYER
                    </button>
                </div>
                <p style="margin-top: 1rem; font-size: 0.75rem; opacity: 0.5;">* This action bypasses all transfer market logic and immediately swaps the player's team and roles.</p>
            </div>

            <div class="glass-card reveal" style="padding: 2.5rem;">
                <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:1.5rem;">
                    <h3 style="font-weight: 900; letter-spacing: -0.5px;">🛒 Active Market Listings</h3>
                    <div style="font-size:0.75rem; opacity:0.6; font-weight:800; text-transform:uppercase;">${market.length} Listed</div>
                </div>
                <div class="admin-table-wrapper">
                    <table>
                        <thead>
                            <tr>
                                <th>Player</th>
                                <th>Previous Team(s)</th>
                                <th>Market Value</th>
                                <th>Status</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${market.length === 0 ? '<tr><td colspan="4" style="text-align:center; padding: 4rem; opacity:0.5;">No players currently listed on the market.</td></tr>' : market.map(p => `
                                <tr>
                                    <td style="padding: 1.2rem 1.5rem;">
                                        <div style="font-weight:800; font-size: 1rem;">${p.username}</div>
                                        <div style="font-size:0.7rem; opacity:0.5; font-family: monospace;">${p.discord_id}</div>
                                    </td>
                                    <td style="max-width: 250px; font-size: 0.8rem; opacity: 0.8; line-height: 1.4;">
                                        ${p.previous_teams ? p.previous_teams.split(', ').map(t => `<span style="display:inline-block; padding: 2px 8px; background: rgba(255,255,255,0.05); border-radius: 4px; margin-bottom: 2px;">${t}</span>`).join(' ') : '<span style="opacity:0.4;">No history</span>'}
                                    </td>
                                    <td style="font-weight: 900; color: var(--accent-primary); font-size: 1.1rem;">£${(p.market_value || 0).toLocaleString()}</td>
                                    <td>
                                        <div style="display:inline-flex; align-items:center; gap:0.5rem; padding:0.5rem 1rem; background:rgba(241,196,15,0.1); color:#f1c40f; border-radius:100px; font-size:0.7rem; font-weight:900; letter-spacing:0.5px; text-transform:uppercase;">
                                            <span style="width:7px; height:7px; background:#f1c40f; border-radius:50%; box-shadow: 0 0 10px #f1c40f;"></span>
                                            LISTED
                                        </div>
                                    </td>
                                </tr>
                            `).join('')}
                        </tbody>
                    </table>
                </div>
            </div>
        `;
        gsap.to(".reveal", { opacity: 1, y: 0, duration: 0.5 });
    } catch (e) {
        wrapper.innerHTML = `<p style="color:var(--danger); text-align:center;">Failed to load Transfer Market.</p>`;
    }
}

async function adminManualSign(adminId) {
    const playerId = document.getElementById('manual-sign-player-id').value.trim();
    const teamId = document.getElementById('manual-sign-team-id').value;

    if (!playerId || !teamId) {
        cleanAlert('Please provide both Player ID and Team!', 'ERROR', '⚠️');
        return;
    }

    const confirmed = await cleanConfirm('Are you sure you want to manually sign this player? This will override all market logic.', 'ADMIN OVERRIDE', '⚠️');
    if (!confirmed) return;

    try {
        const resp = await fetch(`/api/admin-api?action=players&userId=${adminId}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                player_action: 'manual-sign',
                discord_id: playerId,
                team_id: teamId
            })
        });

        if (resp.ok) {
            cleanAlert('✅ Successfully forced player signing.', 'SUCCESS', '🛠️');
            loadTransfersTab(adminId);
        } else {
            const data = await resp.json();
            cleanAlert(data.error || 'Failed to override signing.', 'ERROR', '⚠️');
        }
    } catch (e) {
        cleanAlert('Failed to connect to API.', 'ERROR', '⚠️');
    }
}
