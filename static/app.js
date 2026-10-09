// SóCraques Core Interactive Engine (Pick-up Soccer Edition)
let state = {
  currentMatchId: 1,
  currentMatch: null,
  activeCamera: 'a',
  syncOffset: 0.0,
  isPlaying: false,
  playbackRate: 1.0,
  players: [],
  leaderboard: [],
  sortMetric: 'goals',
  videoDuration: 60.0
};

// DOM References
const videoA = document.getElementById('video-a');
const videoB = document.getElementById('video-b');
const scrubber = document.getElementById('timeline-scrubber');
const playPauseBtn = document.getElementById('play-pause-btn');
const timeCurrentEl = document.getElementById('time-current');
const timeDurationEl = document.getElementById('time-duration');
const videoTimerBadge = document.getElementById('video-timer-badge');
const currentCamTag = document.getElementById('current-cam-tag');
const camBtnA = document.getElementById('cam-btn-a');
const camBtnB = document.getElementById('cam-btn-b');
const tagBtnTime = document.getElementById('tag-current-time-btn');
const markersContainer = document.getElementById('timeline-markers-container');
const matchGoalsList = document.getElementById('match-goals-list');

document.addEventListener('DOMContentLoaded', async () => {
  if (window.lucide) lucide.createIcons();
  if (window.I18N) I18N.applyTranslations();
  setupVideoEvents();
  await loadPlayers();
  await loadMatch(state.currentMatchId);
  await loadLeaderboard();
});

function changeLanguage(lang) {
  if (window.I18N) {
    I18N.setLanguage(lang);
    renderLeaderboard();
    renderPlayersRoster();
    if (state.currentMatch) renderMatchGoals(state.currentMatch.goals);
  }
}

// Tab Navigation
function switchTab(tabName) {
  document.querySelectorAll('.tab-pane').forEach(el => el.classList.add('hidden'));
  document.querySelectorAll('.nav-tab').forEach(el => el.classList.remove('active'));

  const targetTab = document.getElementById(`tab-${tabName}`);
  const targetBtn = document.getElementById(`tab-btn-${tabName}`);
  if (targetTab) targetTab.classList.remove('hidden');
  if (targetBtn) targetBtn.classList.add('active');

  if (tabName === 'leaderboard') {
    loadLeaderboard();
  } else if (tabName === 'players') {
    renderPlayersRoster();
  }
}

// Video Engine
function setupVideoEvents() {
  videoA.addEventListener('loadedmetadata', () => {
    state.videoDuration = videoA.duration || 60;
    scrubber.max = state.videoDuration;
    timeDurationEl.textContent = formatTime(state.videoDuration);
    renderTimelineMarkers();
  });

  videoA.addEventListener('timeupdate', () => {
    const t = videoA.currentTime;
    scrubber.value = t;
    timeCurrentEl.textContent = formatTime(t);
    videoTimerBadge.textContent = formatTimeMs(t);
    tagBtnTime.textContent = formatTime(t);

    const targetB = Math.max(0, t + state.syncOffset);
    if (Math.abs(videoB.currentTime - targetB) > 0.35) {
      videoB.currentTime = targetB;
    }
  });

  videoA.addEventListener('play', () => {
    state.isPlaying = true;
    updatePlayPauseIcon();
    videoB.play().catch(() => {});
  });

  videoA.addEventListener('pause', () => {
    state.isPlaying = false;
    updatePlayPauseIcon();
    videoB.pause();
  });

  videoA.addEventListener('ended', () => {
    state.isPlaying = false;
    updatePlayPauseIcon();
  });
}

function togglePlay() {
  if (videoA.paused) {
    videoA.play();
    videoB.play().catch(() => {});
  } else {
    videoA.pause();
    videoB.pause();
  }
}

function updatePlayPauseIcon() {
  if (state.isPlaying) {
    playPauseBtn.innerHTML = '<i data-lucide="pause" class="w-5 h-5 fill-current"></i>';
  } else {
    playPauseBtn.innerHTML = '<i data-lucide="play" class="w-5 h-5 fill-current"></i>';
  }
  if (window.lucide) lucide.createIcons();
}

function onScrub(val) {
  const targetTime = parseFloat(val);
  videoA.currentTime = targetTime;
  videoB.currentTime = Math.max(0, targetTime + state.syncOffset);
  timeCurrentEl.textContent = formatTime(targetTime);
  videoTimerBadge.textContent = formatTimeMs(targetTime);
}

function stepSeconds(sec) {
  const newTime = Math.max(0, Math.min(state.videoDuration, videoA.currentTime + sec));
  videoA.currentTime = newTime;
  videoB.currentTime = Math.max(0, newTime + state.syncOffset);
}

function cyclePlaybackRate() {
  const rates = [0.5, 1.0, 1.5, 2.0];
  const idx = rates.indexOf(state.playbackRate);
  state.playbackRate = rates[(idx + 1) % rates.length];
  videoA.playbackRate = state.playbackRate;
  videoB.playbackRate = state.playbackRate;
  document.getElementById('speed-btn').textContent = `${state.playbackRate}x`;
}

function switchCamera(cam) {
  state.activeCamera = cam;
  if (cam === 'a') {
    videoA.classList.remove('opacity-0', 'pointer-events-none');
    videoA.classList.add('z-10');
    videoB.classList.add('opacity-0', 'pointer-events-none');
    videoB.classList.remove('z-10');

    camBtnA.classList.add('active');
    camBtnB.classList.remove('active');
    currentCamTag.innerHTML = '<span class="w-2 h-2 rounded-full bg-red-500 animate-ping"></span> PHONE 1 • MIDFIELD';
  } else {
    videoB.classList.remove('opacity-0', 'pointer-events-none');
    videoB.classList.add('z-10');
    videoA.classList.add('opacity-0', 'pointer-events-none');
    videoA.classList.remove('z-10');

    camBtnB.classList.add('active');
    camBtnA.classList.remove('active');
    currentCamTag.innerHTML = '<span class="w-2 h-2 rounded-full bg-blue-500 animate-ping"></span> PHONE 2 • BEHIND NET';
  }
}

function updateSyncOffset(val) {
  state.syncOffset = parseFloat(val) || 0.0;
  videoB.currentTime = Math.max(0, videoA.currentTime + state.syncOffset);
}

// Data Fetching
async function loadPlayers() {
  try {
    const res = await fetch('/api/players');
    const data = await res.json();
    state.players = data.players || [];
    populateRosterSelects();
    renderPlayersRoster();
  } catch (err) {
    console.error('Failed to load players:', err);
  }
}

async function loadMatch(id) {
  try {
    const res = await fetch(`/api/matches/${id}`);
    const data = await res.json();
    state.currentMatch = data.match;

    document.getElementById('match-meta').textContent = `Match Date: ${state.currentMatch.match_date} • 2026 Season • ${state.currentMatch.goals.length} Goals Logged`;
    const scoreEl = document.getElementById('scoreboard-display');
    if (scoreEl) scoreEl.textContent = state.currentMatch.goals.length;

    const hasVideo = !!(state.currentMatch.video_angle_a && state.currentMatch.video_angle_a.trim() !== '');
    const overlay = document.getElementById('no-video-overlay');
    const hud = document.getElementById('video-hud');

    if (hasVideo) {
      videoA.src = state.currentMatch.video_angle_a;
      if (state.currentMatch.video_angle_b) {
        videoB.src = state.currentMatch.video_angle_b;
      }
      if (overlay) overlay.classList.add('hidden');
      if (hud) hud.classList.remove('hidden');
    } else {
      videoA.removeAttribute('src');
      videoB.removeAttribute('src');
      videoA.load();
      videoB.load();
      if (overlay) overlay.classList.remove('hidden');
      if (hud) hud.classList.add('hidden');
      timeDurationEl.textContent = '00:00';
    }

    state.syncOffset = state.currentMatch.sync_offset || 0.0;
    document.getElementById('sync-offset-input').value = state.syncOffset;

    renderMatchGoals(state.currentMatch.goals);
    renderTimelineMarkers();
  } catch (err) {
    console.error('Failed to load match:', err);
  }
}

function renderMatchGoals(passedGoals) {
  const container = document.getElementById('match-goals-list');
  const countSubtitle = document.getElementById('goal-count-subtitle');
  if (!container) return;

  const goals = (state.currentMatch && state.currentMatch.goals) || (Array.isArray(passedGoals) ? passedGoals : []);
  const nutmegs = (state.currentMatch && state.currentMatch.nutmegs) || [];

  const goalText = goals.length === 1 ? 'goal' : 'goals';
  const nutmegText = nutmegs.length === 1 ? 'caneta' : 'canetas';
  if (countSubtitle) {
    countSubtitle.textContent = `${goals.length} ${goalText} • ${nutmegs.length} ${nutmegText}`;
  }
  const scoreEl = document.getElementById('scoreboard-display');
  if (scoreEl) scoreEl.textContent = goals.length;

  const events = [
    ...goals.map(g => ({ ...g, eventType: 'goal', sortTime: g.timestamp_sec || 0 })),
    ...nutmegs.map(n => ({ ...n, eventType: 'nutmeg', sortTime: n.timestamp_sec || 0 }))
  ];

  events.sort((a, b) => a.sortTime - b.sortTime);

  if (events.length === 0) {
    container.innerHTML = `
      <div class="text-center py-12 text-slate-500 text-xs">
        ${window.I18N ? I18N.t('no_goals_yet') : 'No goals or canetas recorded yet.'}
      </div>
    `;
    return;
  }

  const nutmeggedLabel = (window.I18N && I18N.t('nutmegged_text')) || 'deu caneta em';
  const downloadTitle = (window.I18N && I18N.t('download_clip')) || 'Baixar Clipe de 20s (10s antes e 10s depois)';

  container.innerHTML = events.map(ev => {
    if (ev.eventType === 'goal') {
      const hasAssist = ev.assist_name && ev.assist_name.trim().length > 0;
      const safeName = (ev.scorer_name || 'gol').replace(/'/g, "\\'");
      return `
        <div class="p-3 rounded-xl bg-slate-950/60 hover:bg-slate-800/60 border border-slate-800/80 transition flex items-center justify-between gap-3 group">
          <div class="flex items-center gap-3">
            <button onclick="seekToGoal(${ev.timestamp_sec})" class="w-9 h-9 rounded-xl bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 font-bold text-xs flex items-center justify-center border border-emerald-500/30 transition shrink-0" title="Ver no vídeo">
              ${ev.minute_display || formatTime(ev.timestamp_sec)}
            </button>
            <div>
              <div class="flex items-center gap-1.5 flex-wrap">
                <span class="px-1.5 py-0.2 rounded bg-emerald-500/15 text-emerald-400 font-mono text-[9px] font-bold border border-emerald-500/30">${ev.game_name || 'Game 1'}</span>
                <span class="font-extrabold text-sm text-white hover:text-emerald-400 cursor-pointer" onclick="openPlayerProfile(${ev.scorer_id})">
                  ${ev.scorer_name}
                </span>
                <span class="text-[10px] font-mono px-1.5 py-0.2 rounded bg-slate-800 text-slate-300">#${ev.scorer_jersey || '0'}</span>
              </div>
              <div class="text-[11px] text-slate-400 flex items-center gap-1 mt-0.5">
                ${hasAssist ? `<span>🎯 Assist: <strong class="text-slate-300">${ev.assist_name}</strong></span>` : `<span class="italic text-slate-500">Solo / Unassisted</span>`}
              </div>
              ${ev.notes ? `<p class="text-[10px] text-slate-500 mt-0.5 italic line-clamp-1">"${ev.notes}"</p>` : ''}
            </div>
          </div>

          <div class="flex items-center gap-1.5">
            <button onclick="seekToGoal(${ev.timestamp_sec})" title="Pular para o lance no vídeo" class="p-1.5 rounded-lg text-slate-400 hover:text-emerald-400 hover:bg-slate-800 transition">
              <i data-lucide="play-circle" class="w-4 h-4"></i>
            </button>
            <button id="btn-download-goal-${ev.id}" onclick="downloadClip('goal', ${ev.id}, ${ev.timestamp_sec}, '${safeName}')" title="${downloadTitle}" class="p-1.5 rounded-lg text-slate-400 hover:text-emerald-400 hover:bg-slate-800 transition">
              <i data-lucide="download" class="w-4 h-4"></i>
            </button>
            <button onclick="deleteGoal(${ev.id})" title="Excluir Gol" class="p-1.5 rounded-lg text-slate-500 hover:text-red-400 hover:bg-slate-800 transition opacity-0 group-hover:opacity-100">
              <i data-lucide="trash-2" class="w-4 h-4"></i>
            </button>
          </div>
        </div>
      `;
    } else {
      const safeGiver = (ev.giver_name || 'caneta').replace(/'/g, "\\'");
      return `
        <div class="p-3 rounded-xl bg-slate-950/60 hover:bg-slate-800/60 border border-purple-500/30 transition flex items-center justify-between gap-3 group">
          <div class="flex items-center gap-3">
            <button onclick="seekToGoal(${ev.timestamp_sec})" class="w-9 h-9 rounded-xl bg-purple-500/10 hover:bg-purple-500/20 text-purple-400 font-bold text-xs flex items-center justify-center border border-purple-500/30 transition shrink-0" title="Ver no vídeo">
              ${ev.minute_display || formatTime(ev.timestamp_sec)}
            </button>
            <div>
              <div class="flex items-center gap-1.5 flex-wrap">
                <span class="px-1.5 py-0.2 rounded bg-purple-500/15 text-purple-400 font-mono text-[9px] font-bold border border-purple-500/30">${ev.game_name || 'Game 1'}</span>
                <span class="font-extrabold text-sm text-purple-300">🪄 ${ev.giver_name}</span>
                <span class="text-[11px] text-slate-400 font-medium">${nutmeggedLabel}</span>
                <span class="font-extrabold text-sm text-amber-300">${ev.receiver_name}</span>
              </div>
              ${ev.notes ? `<p class="text-[10px] text-slate-500 mt-0.5 italic line-clamp-1">"${ev.notes}"</p>` : ''}
            </div>
          </div>

          <div class="flex items-center gap-1.5">
            <button onclick="seekToGoal(${ev.timestamp_sec})" title="Pular para a caneta no vídeo" class="p-1.5 rounded-lg text-slate-400 hover:text-purple-400 hover:bg-slate-800 transition">
              <i data-lucide="play-circle" class="w-4 h-4"></i>
            </button>
            <button id="btn-download-nutmeg-${ev.id}" onclick="downloadClip('nutmeg', ${ev.id}, ${ev.timestamp_sec}, '${safeGiver}')" title="${downloadTitle}" class="p-1.5 rounded-lg text-slate-400 hover:text-purple-400 hover:bg-slate-800 transition">
              <i data-lucide="download" class="w-4 h-4"></i>
            </button>
            <button onclick="deleteNutmeg(${ev.id})" title="Excluir Caneta" class="p-1.5 rounded-lg text-slate-500 hover:text-red-400 hover:bg-slate-800 transition opacity-0 group-hover:opacity-100">
              <i data-lucide="trash-2" class="w-4 h-4"></i>
            </button>
          </div>
        </div>
      `;
    }
  }).join('');

  if (window.lucide) lucide.createIcons();
}

async function downloadClip(eventType, eventId, timestampSec, playerName) {
  const btn = document.getElementById(`btn-download-${eventType}-${eventId}`);
  const originalHtml = btn ? btn.innerHTML : '';
  if (btn) {
    btn.disabled = true;
    btn.innerHTML = '<i data-lucide="loader" class="w-4 h-4 animate-spin text-emerald-400"></i>';
    if (window.lucide) lucide.createIcons();
  }

  try {
    const angle = state.activeAngle || 'a';
    const url = `/api/clips/download?type=${encodeURIComponent(eventType)}&id=${encodeURIComponent(eventId)}&angle=${encodeURIComponent(angle)}`;

    const res = await fetch(url);
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      alert(data.error || 'Nenhum vídeo carregado para esta partida ainda. Envie os vídeos em "Upload Videos" primeiro.');
      return;
    }

    const blob = await res.blob();
    const blobUrl = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = blobUrl;
    const typeLabel = eventType === 'nutmeg' ? 'caneta' : 'gol';
    const m = Math.floor(timestampSec / 60);
    const s = Math.floor(timestampSec % 60);
    a.download = `socraques_${typeLabel}_${playerName.replace(/\s+/g, '_')}_${m}m${s.toString().padStart(2, '0')}s_20s.mp4`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(blobUrl);
  } catch (err) {
    console.error('Download clip error:', err);
    alert('Erro ao baixar o clipe de 20s.');
  } finally {
    if (btn) {
      btn.disabled = false;
      btn.innerHTML = originalHtml;
      if (window.lucide) lucide.createIcons();
    }
  }
}

async function deleteNutmeg(nutmegId) {
  if (!confirm('Excluir este lance de caneta?')) return;
  try {
    const res = await fetch(`/api/nutmegs/${nutmegId}`, { method: 'DELETE' });
    if (res.ok) {
      await loadMatch(state.currentMatchId);
    }
  } catch (err) {
    console.error(err);
  }
}

function renderTimelineMarkers() {
  if (!state.currentMatch) return;
  markersContainer.innerHTML = '';

  const duration = state.videoDuration || 60;
  const goals = state.currentMatch.goals || [];
  const nutmegs = state.currentMatch.nutmegs || [];

  goals.forEach(g => {
    const pct = Math.min(100, Math.max(0, (g.timestamp_sec / duration) * 100));
    const pin = document.createElement('div');
    pin.className = 'timeline-goal-pin';
    pin.style.left = `${pct}%`;
    pin.title = `Goal by ${g.scorer_name} at ${formatTime(g.timestamp_sec)}`;
    pin.innerHTML = `
      <div class="w-5 h-5 rounded-full bg-yellow-400 text-slate-950 flex items-center justify-center text-xs shadow-lg shadow-yellow-400/50 border border-black font-black">
        ⚽
      </div>
    `;
    pin.onclick = (e) => {
      e.stopPropagation();
      seekToGoal(g.timestamp_sec);
    };
    markersContainer.appendChild(pin);
  });

  nutmegs.forEach(n => {
    const pct = Math.min(100, Math.max(0, (n.timestamp_sec / duration) * 100));
    const pin = document.createElement('div');
    pin.className = 'timeline-goal-pin';
    pin.style.left = `${pct}%`;
    pin.title = `Caneta: ${n.giver_name} em ${n.receiver_name} (${formatTime(n.timestamp_sec)})`;
    pin.innerHTML = `
      <div class="w-5 h-5 rounded-full bg-purple-500 text-white flex items-center justify-center text-xs shadow-lg shadow-purple-500/50 border border-black font-black">
        🪄
      </div>
    `;
    pin.onclick = (e) => {
      e.stopPropagation();
      seekToGoal(n.timestamp_sec);
    };
    markersContainer.appendChild(pin);
  });
}

function seekToGoal(timestampSec) {
  const jumpTime = Math.max(0, timestampSec - 3.5);
  videoA.currentTime = jumpTime;
  videoB.currentTime = Math.max(0, jumpTime + state.syncOffset);
  videoA.play();
  videoB.play().catch(() => {});

  const alertBanner = document.getElementById('goal-alert-banner');
  alertBanner.classList.remove('opacity-0');
  setTimeout(() => alertBanner.classList.add('opacity-0'), 2500);
}

// Goal Tagging Modal
function openGoalTagModal() {
  const currentTime = videoA.currentTime;
  document.getElementById('goal-timestamp-input').value = currentTime.toFixed(1);
  document.getElementById('modal-timestamp-label').textContent = formatTime(currentTime);
  document.getElementById('goal-tag-modal').classList.remove('hidden');
}

function closeGoalTagModal() {
  document.getElementById('goal-tag-modal').classList.add('hidden');
}

function populateRosterSelects() {
  const scorerSelect = document.getElementById('modal-scorer-select');
  const assistSelect = document.getElementById('modal-assist-select');

  if (state.players.length === 0) {
    scorerSelect.innerHTML = '<option value="">No players yet - add players first</option>';
    assistSelect.innerHTML = '<option value="">None / Solo</option>';
    return;
  }

  scorerSelect.innerHTML = state.players.map(p => `
    <option value="${p.id}">${p.name} (#${p.jersey_number || '0'})</option>
  `).join('');

  assistSelect.innerHTML = `
    <option value="">None / Solo Effort / Rebound</option>
    ${state.players.map(p => `<option value="${p.id}">${p.name} (#${p.jersey_number || '0'})</option>`).join('')}
  `;
}

async function submitGoalTag(event) {
  event.preventDefault();
  const btn = document.getElementById('modal-save-goal-btn');
  btn.disabled = true;
  btn.innerHTML = '<span>Saving & Clipping...</span>';

  const timestamp_sec = parseFloat(document.getElementById('goal-timestamp-input').value);
  const scorer_id = parseInt(document.getElementById('modal-scorer-select').value);
  const assistVal = document.getElementById('modal-assist-select').value;
  const assist_id = assistVal ? parseInt(assistVal) : null;
  const primary_angle = document.querySelector('input[name="clip_angle"]:checked').value;
  const game_name = document.getElementById('modal-match-game-name').value.trim() || 'Game 1';

  try {
    const res = await fetch(`/api/matches/${state.currentMatchId}/goals`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        timestamp_sec,
        scorer_id,
        assist_id,
        primary_angle,
        game_name
      })
    });

    if (res.ok) {
      closeGoalTagModal();
      await loadMatch(state.currentMatchId);
      await loadPlayers();
      await loadLeaderboard();
    }
  } catch (err) {
    console.error(err);
  } finally {
    btn.disabled = false;
    btn.innerHTML = '<i data-lucide="check-circle" class="w-4 h-4"></i><span>Save & Extract 15s Clip</span>';
    if (window.lucide) lucide.createIcons();
  }
}

async function deleteGoal(goalId) {
  if (!confirm('Remove this goal?')) return;
  try {
    const res = await fetch(`/api/goals/${goalId}`, { method: 'DELETE' });
    if (res.ok) {
      await loadMatch(state.currentMatchId);
      await loadPlayers();
      await loadLeaderboard();
    }
  } catch (err) {
    console.error(err);
  }
}

// Leaderboard Engine
async function loadLeaderboard() {
  try {
    const res = await fetch('/api/leaderboard?season=2026');
    const data = await res.json();
    state.leaderboard = data.leaderboard || [];
    renderLeaderboard();
  } catch (err) {
    console.error('Failed to load leaderboard:', err);
  }
}

function sortLeaderboard(metric) {
  state.sortMetric = metric;

  document.getElementById('btn-sort-goals').className = metric === 'goals'
    ? 'px-3 py-1.5 rounded-lg font-bold bg-emerald-500 text-slate-950 transition'
    : 'px-3 py-1.5 rounded-lg font-bold text-slate-400 hover:text-white transition';

  document.getElementById('btn-sort-assists').className = metric === 'assists'
    ? 'px-3 py-1.5 rounded-lg font-bold bg-blue-500 text-slate-950 transition'
    : 'px-3 py-1.5 rounded-lg font-bold text-slate-400 hover:text-white transition';

  document.getElementById('btn-sort-contributions').className = metric === 'contributions'
    ? 'px-3 py-1.5 rounded-lg font-bold bg-yellow-500 text-slate-950 transition'
    : 'px-3 py-1.5 rounded-lg font-bold text-slate-400 hover:text-white transition';

  renderLeaderboard();
}

function renderLeaderboard() {
  const metric = state.sortMetric;
  const list = [...state.leaderboard].sort((a, b) => {
    if (b[metric] !== a[metric]) return b[metric] - a[metric];
    if (metric !== 'goals' && b.goals !== a.goals) return b.goals - a.goals;
    return a.name.localeCompare(b.name);
  });

  const podiumContainer = document.getElementById('podium-container');
  const tableBody = document.getElementById('leaderboard-table-body');

  if (list.length === 0) {
    podiumContainer.innerHTML = '';
    tableBody.innerHTML = `
      <tr>
        <td colspan="7" class="py-12 text-center text-slate-500 text-xs">
          No players in roster yet. Click "+ Add Multiple Players" to add your friends!
        </td>
      </tr>
    `;
    return;
  }

  // Check if any goals have been scored yet
  const totalGoals = list.reduce((sum, p) => sum + (p.goals || 0), 0);

  if (totalGoals === 0) {
    podiumContainer.innerHTML = `
      <div class="col-span-3 bg-slate-900 border border-slate-800 rounded-2xl p-6 text-center text-slate-400 text-xs shadow-lg">
        ⚽ No goals have been scored yet this season! Log goals during games or on the Sideline Controller to crown the Golden Boot.
      </div>
    `;
  } else {
    const top3 = list.filter(p => p[metric] > 0).slice(0, 3);
    const medalColors = [
      { border: 'border-yellow-500/40', bg: 'from-yellow-500/10 to-amber-500/5', badge: '🥇 Gold', text: 'text-yellow-400' },
      { border: 'border-slate-400/40', bg: 'from-slate-400/10 to-slate-500/5', badge: '🥈 Silver', text: 'text-slate-300' },
      { border: 'border-amber-700/40', bg: 'from-amber-700/10 to-amber-800/5', badge: '🥉 Bronze', text: 'text-amber-500' }
    ];

    podiumContainer.innerHTML = top3.map((p, idx) => {
      const m = medalColors[idx];
      return `
        <div onclick="openPlayerProfile(${p.id})" class="cursor-pointer bg-gradient-to-br ${m.bg} bg-slate-900 border ${m.border} rounded-2xl p-4 shadow-xl hover:scale-[1.02] transition flex items-center justify-between gap-4">
          <div class="flex items-center gap-3">
            <div class="w-12 h-12 rounded-xl flex items-center justify-center font-black text-slate-950 text-base shadow-lg" style="background-color: ${p.avatar_color || '#10b981'}">
              #${p.jersey_number || '0'}
            </div>
            <div>
              <span class="text-[10px] font-mono font-bold uppercase tracking-wider ${m.text}">${m.badge}</span>
              <h3 class="font-bold text-sm text-white">${p.name}</h3>
            </div>
          </div>
          <div class="text-right">
            <p class="text-2xl font-black text-white">${p[metric]}</p>
            <p class="text-[10px] font-mono uppercase text-slate-400">${metric}</p>
          </div>
        </div>
      `;
    }).join('');
  }

  // Standings Table Body (No team/squad column)
  tableBody.innerHTML = list.map((p, idx) => {
    const rank = idx + 1;
    const isLeader = rank === 1 && p[metric] > 0;
    return `
      <tr class="hover:bg-slate-800/40 cursor-pointer transition ${isLeader ? 'bg-emerald-500/5 font-semibold' : ''}" onclick="openPlayerProfile(${p.id})">
        <td class="py-3 px-4 text-center font-mono font-bold text-xs ${isLeader ? 'text-yellow-400' : 'text-slate-400'}">
          ${rank}
        </td>
        <td class="py-3 px-4">
          <div class="flex items-center gap-2.5">
            <div class="w-7 h-7 rounded-lg flex items-center justify-center font-bold text-xs text-slate-950" style="background-color: ${p.avatar_color || '#10b981'}">
              ${p.jersey_number || '0'}
            </div>
            <span class="text-white hover:text-emerald-400 font-bold">${p.name}</span>
          </div>
        </td>
        <td class="py-3 px-4 text-center font-mono font-extrabold text-sm text-emerald-400">${p.goals}</td>
        <td class="py-3 px-4 text-center font-mono font-bold text-sm text-blue-400">${p.assists}</td>
        <td class="py-3 px-4 text-center font-mono font-black text-sm text-yellow-400">${p.contributions}</td>
        <td class="py-3 px-4 text-center font-mono text-xs text-slate-400">${p.matches}</td>
        <td class="py-3 px-4 text-right">
          <button class="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold">
            View Reel
          </button>
        </td>
      </tr>
    `;
  }).join('');
}

// Roster Grid (No team names)
function renderPlayersRoster() {
  const container = document.getElementById('player-roster-grid');

  if (state.players.length === 0) {
    container.innerHTML = `
      <div class="col-span-full py-16 text-center text-slate-500 text-sm bg-slate-900 border border-slate-800 rounded-3xl p-8">
        <p class="font-bold text-base text-slate-300 mb-1">Your player roster is empty!</p>
        <p class="text-xs text-slate-500 mb-4">Add your friends and pickup squad players to start tracking goals.</p>
        <button onclick="openBatchPlayerModal()" class="px-5 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black text-xs inline-flex items-center gap-2">
          <span>+ Add Multiple Players</span>
        </button>
      </div>
    `;
    return;
  }

  container.innerHTML = state.players.map(p => `
    <div onclick="openPlayerProfile(${p.id})" class="cursor-pointer bg-slate-900 border border-slate-800 hover:border-emerald-500/50 rounded-2xl p-5 shadow-xl transition group flex flex-col justify-between">
      <div>
        <div class="flex items-start justify-between">
          <div class="w-12 h-12 rounded-xl flex items-center justify-center font-black text-lg text-slate-950 shadow-lg" style="background-color: ${p.avatar_color || '#10b981'}">
            #${p.jersey_number || '0'}
          </div>
          <span class="text-[11px] font-mono px-2 py-0.5 rounded-full bg-slate-800 text-slate-400">
            Player
          </span>
        </div>
        <div class="mt-3">
          <h3 class="font-extrabold text-base text-white group-hover:text-emerald-400 transition">${p.name}</h3>
        </div>
      </div>

      <div class="mt-4 pt-3 border-t border-slate-800/80 grid grid-cols-3 gap-2 text-center text-xs">
        <div>
          <span class="text-emerald-400 font-black text-base">${p.goals_count || 0}</span>
          <p class="text-[10px] text-slate-500 uppercase">Goals</p>
        </div>
        <div>
          <span class="text-blue-400 font-black text-base">${p.assists_count || 0}</span>
          <p class="text-[10px] text-slate-500 uppercase">Assists</p>
        </div>
        <div>
          <span class="text-yellow-400 font-black text-base">${p.contributions || 0}</span>
          <p class="text-[10px] text-slate-500 uppercase">G + A</p>
        </div>
      </div>
    </div>
  `).join('');
}

// 1-Click: Remove All Players
async function removeAllPlayers() {
  if (!confirm('Are you sure you want to remove ALL players and clear the entire roster and goals? This action cannot be undone.')) {
    return;
  }

  try {
    const res = await fetch('/api/players', { method: 'DELETE' });
    if (res.ok) {
      await loadPlayers();
      await loadMatch(state.currentMatchId);
      await loadLeaderboard();
      alert('All players removed! The roster is now empty.');
    }
  } catch (err) {
    console.error(err);
    alert('Failed to remove players.');
  }
}

// ==========================================
// BATCH ADD PLAYERS (TABLE & PASTE HELPER)
// ==========================================
function openBatchPlayerModal() {
  document.getElementById('paste-names-input').value = '';
  const tbody = document.getElementById('batch-table-body');
  tbody.innerHTML = '';
  // Start with 4 empty rows
  for (let i = 0; i < 4; i++) {
    addEmptyTableRow();
  }
  updateBatchCount();
  document.getElementById('batch-player-modal').classList.remove('hidden');
}

function closeBatchPlayerModal() {
  document.getElementById('batch-player-modal').classList.add('hidden');
}

function addEmptyTableRow(defaultName = '') {
  const tbody = document.getElementById('batch-table-body');
  const rowCount = tbody.children.length + 1;
  const tr = document.createElement('tr');
  tr.className = 'hover:bg-slate-800/30';
  tr.innerHTML = `
    <td class="py-2 px-3 text-center font-mono text-slate-500 row-index">${rowCount}</td>
    <td class="py-2 px-3">
      <input type="text" value="${defaultName}" placeholder="e.g. Player Name" class="w-full bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-1.5 text-xs text-white player-name-input focus:outline-none focus:border-emerald-500" oninput="updateBatchCount()">
    </td>
    <td class="py-2 px-3 text-center">
      <button type="button" onclick="removeTableRow(this)" class="text-slate-500 hover:text-red-400 p-1">
        <i data-lucide="x" class="w-3.5 h-3.5"></i>
      </button>
    </td>
  `;
  tbody.appendChild(tr);
  if (window.lucide) lucide.createIcons();
  updateBatchCount();
}

function removeTableRow(btn) {
  const tr = btn.closest('tr');
  tr.remove();
  reindexTableRows();
  updateBatchCount();
}

function reindexTableRows() {
  const tbody = document.getElementById('batch-table-body');
  Array.from(tbody.children).forEach((tr, idx) => {
    tr.querySelector('.row-index').textContent = idx + 1;
  });
}

function loadPastedNamesIntoTable() {
  const textarea = document.getElementById('paste-names-input');
  const lines = textarea.value.split('\n').map(l => l.trim()).filter(l => l.length > 0);
  if (lines.length === 0) return;

  const tbody = document.getElementById('batch-table-body');
  // Clear any completely empty rows first
  Array.from(tbody.querySelectorAll('.player-name-input')).forEach(input => {
    if (!input.value.trim()) input.closest('tr').remove();
  });

  lines.forEach(name => {
    addEmptyTableRow(name);
  });

  textarea.value = '';
  reindexTableRows();
  updateBatchCount();
}

function updateBatchCount() {
  const inputs = document.querySelectorAll('.player-name-input');
  let filledCount = 0;
  inputs.forEach(inp => {
    if (inp.value.trim().length > 0) filledCount++;
  });
  document.getElementById('batch-count-label').textContent = `${filledCount} players ready to add`;
}

async function submitBatchPlayers() {
  const inputs = document.querySelectorAll('.player-name-input');
  const names = [];
  inputs.forEach(inp => {
    const val = inp.value.trim();
    if (val.length > 0) names.push(val);
  });

  if (names.length === 0) {
    alert('Please enter at least one player name.');
    return;
  }

  const btn = document.getElementById('save-batch-btn');
  btn.disabled = true;
  btn.innerHTML = '<span>Saving...</span>';

  try {
    const res = await fetch('/api/players/batch', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ names })
    });

    if (res.ok) {
      closeBatchPlayerModal();
      await loadPlayers();
      await loadLeaderboard();
      renderPlayersRoster();
    } else {
      alert('Failed to save players.');
    }
  } catch (err) {
    console.error(err);
  } finally {
    btn.disabled = false;
    btn.innerHTML = '<i data-lucide="check" class="w-4 h-4"></i><span>Save All Players</span>';
    if (window.lucide) lucide.createIcons();
  }
}

// Player Profile Modal
async function openPlayerProfile(playerId) {
  const player = state.players.find(p => p.id === playerId);
  if (!player) return;

  document.getElementById('profile-modal-avatar').style.backgroundColor = player.avatar_color || '#10b981';
  document.getElementById('profile-modal-avatar').textContent = `#${player.jersey_number || '0'}`;
  document.getElementById('profile-modal-name').textContent = player.name;
  document.getElementById('profile-modal-meta').textContent = `#${player.jersey_number || '0'} • Player Profile`;
  document.getElementById('profile-stat-goals').textContent = player.goals_count || 0;
  document.getElementById('profile-stat-assists').textContent = player.assists_count || 0;
  document.getElementById('profile-stat-contributions').textContent = (player.goals_count || 0) + (player.assists_count || 0);

  const clipsContainer = document.getElementById('profile-clips-container');
  clipsContainer.innerHTML = '<p class="text-xs text-slate-400 py-3">Loading highlight reel...</p>';
  document.getElementById('player-profile-modal').classList.remove('hidden');

  try {
    const res = await fetch(`/api/players/${playerId}/reel`);
    const data = await res.json();
    const goals = data.goals || [];

    if (goals.length === 0) {
      clipsContainer.innerHTML = `
        <div class="text-center py-6 text-slate-500 text-xs">
          No goals recorded yet this season.
        </div>
      `;
      return;
    }

    clipsContainer.innerHTML = goals.map(g => `
      <div class="p-3 bg-slate-950 border border-slate-800 rounded-xl flex items-center justify-between gap-3">
        <div class="flex items-center gap-3">
          <div class="w-8 h-8 rounded-lg bg-emerald-500/20 text-emerald-400 flex items-center justify-center font-bold text-xs shrink-0">
            ${g.minute_display || formatTime(g.timestamp_sec)}
          </div>
          <div>
            <h5 class="text-xs font-bold text-white">${g.game_name || 'Game 1'}</h5>
            <p class="text-[11px] text-slate-400">${g.assist_name ? `Assist: ${g.assist_name}` : 'Solo Finish'}</p>
          </div>
        </div>
        <button onclick="playGoalInStudio(${g.match_id}, ${g.timestamp_sec})" class="px-3 py-1.5 rounded-lg bg-emerald-500/20 hover:bg-emerald-500 text-emerald-400 hover:text-slate-950 font-bold text-xs transition flex items-center gap-1">
          <i data-lucide="play" class="w-3.5 h-3.5"></i> Play
        </button>
      </div>
    `).join('');

    if (window.lucide) lucide.createIcons();
  } catch (err) {
    clipsContainer.innerHTML = '<p class="text-xs text-red-400">Failed to load reel.</p>';
  }
}

function playGoalInStudio(matchId, timestampSec) {
  closePlayerModal();
  switchTab('match');
  seekToGoal(timestampSec);
}

function closePlayerModal() {
  document.getElementById('player-profile-modal').classList.add('hidden');
}

function formatTime(seconds) {
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
}

function formatTimeMs(seconds) {
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  const ms = Math.floor((seconds % 1) * 10);
  return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}.${ms}`;
}

// ==========================================
// VIDEO UPLOAD & MEDIA MANAGEMENT ENGINE
// ==========================================
let uploadState = {
  cam1File: null,
  cam2File: null,
  activeTab: 'direct',
  availableVideos: [],
  dragSetup: false
};

function openVideoUploadModal() {
  const modal = document.getElementById('video-upload-modal');
  if (!modal) return;
  modal.classList.remove('hidden');

  // Reset form state
  uploadState.cam1File = null;
  uploadState.cam2File = null;
  resetFileBox('cam1');
  resetFileBox('cam2');
  
  const progressContainer = document.getElementById('upload-progress-container');
  if (progressContainer) progressContainer.classList.add('hidden');
  const alertEl = document.getElementById('upload-alert');
  if (alertEl) alertEl.classList.add('hidden');
  const folderAlertEl = document.getElementById('folder-alert');
  if (folderAlertEl) folderAlertEl.classList.add('hidden');

  updateUploadButtonState();
  setupDragAndDrop();
  refreshAvailableVideosList();

  if (window.lucide) lucide.createIcons();
}

function closeVideoUploadModal() {
  const modal = document.getElementById('video-upload-modal');
  if (modal) modal.classList.add('hidden');
}

function switchUploadModalTab(tab) {
  uploadState.activeTab = tab;
  const directPane = document.getElementById('upload-pane-direct');
  const folderPane = document.getElementById('upload-pane-folder');
  const directBtn = document.getElementById('upload-tab-btn-direct');
  const folderBtn = document.getElementById('upload-tab-btn-folder');

  if (tab === 'direct') {
    directPane.classList.remove('hidden');
    folderPane.classList.add('hidden');
    directBtn.className = 'pb-2.5 border-b-2 border-blue-500 text-blue-400 flex items-center gap-1.5 transition';
    folderBtn.className = 'pb-2.5 border-b-2 border-transparent text-slate-400 hover:text-slate-200 flex items-center gap-1.5 transition';
  } else {
    directPane.classList.add('hidden');
    folderPane.classList.remove('hidden');
    directBtn.className = 'pb-2.5 border-b-2 border-transparent text-slate-400 hover:text-slate-200 flex items-center gap-1.5 transition';
    folderBtn.className = 'pb-2.5 border-b-2 border-blue-500 text-blue-400 flex items-center gap-1.5 transition';
    refreshAvailableVideosList();
  }
  if (window.lucide) lucide.createIcons();
}

function resetFileBox(cam) {
  const badge = document.getElementById(`${cam}-file-badge`);
  const filename = document.getElementById(`${cam}-filename`);
  const filesize = document.getElementById(`${cam}-filesize`);
  const input = document.getElementById(`${cam}-file-input`);
  if (input) input.value = '';

  if (badge) {
    badge.textContent = 'None chosen';
    badge.className = 'text-[10px] bg-slate-800 px-2 py-0.5 rounded text-slate-400';
  }
  if (filename) {
    filename.textContent = window.I18N ? window.I18N.t('dropzone_prompt') : 'Click or drag & drop video (.mp4, .mov)';
  }
  if (filesize) {
    filesize.textContent = cam === 'cam1' ? 'Phone 1 recording' : 'Phone 2 recording';
  }
}

function handleFileSelected(cam, file) {
  if (!file) return;
  if (cam === 'cam1') uploadState.cam1File = file;
  if (cam === 'cam2') uploadState.cam2File = file;

  const sizeMb = (file.size / (1024 * 1024)).toFixed(1);
  const badge = document.getElementById(`${cam}-file-badge`);
  const filename = document.getElementById(`${cam}-filename`);
  const filesize = document.getElementById(`${cam}-filesize`);

  if (badge) {
    badge.textContent = 'Ready ✓';
    badge.className = cam === 'cam1'
      ? 'text-[10px] bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 px-2 py-0.5 rounded font-bold'
      : 'text-[10px] bg-blue-500/20 text-blue-400 border border-blue-500/40 px-2 py-0.5 rounded font-bold';
  }
  if (filename) {
    filename.textContent = file.name;
  }
  if (filesize) {
    filesize.textContent = `${sizeMb} MB • ${file.type || 'video'}`;
  }

  updateUploadButtonState();
}

function updateUploadButtonState() {
  const btn = document.getElementById('start-upload-btn');
  if (!btn) return;
  const hasFiles = uploadState.cam1File || uploadState.cam2File;
  btn.disabled = !hasFiles;
}

function setupDragAndDrop() {
  if (uploadState.dragSetup) return;
  uploadState.dragSetup = true;

  ['cam1', 'cam2'].forEach(cam => {
    const dropzone = document.getElementById(`${cam}-dropzone`);
    if (!dropzone) return;

    ['dragenter', 'dragover'].forEach(eventName => {
      dropzone.addEventListener(eventName, (e) => {
        e.preventDefault();
        e.stopPropagation();
        dropzone.classList.add(cam === 'cam1' ? 'border-emerald-400' : 'border-blue-400', 'bg-slate-800/60');
      });
    });

    ['dragleave', 'drop'].forEach(eventName => {
      dropzone.addEventListener(eventName, (e) => {
        e.preventDefault();
        e.stopPropagation();
        dropzone.classList.remove('border-emerald-400', 'border-blue-400', 'bg-slate-800/60');
      });
    });

    dropzone.addEventListener('drop', (e) => {
      const dt = e.dataTransfer;
      if (dt && dt.files && dt.files.length > 0) {
        handleFileSelected(cam, dt.files[0]);
      }
    });
  });
}

function startDirectUpload() {
  if (!uploadState.cam1File && !uploadState.cam2File) {
    showUploadAlert('Please select at least one video file for Camera 1 or Camera 2.', 'error');
    return;
  }

  const progressContainer = document.getElementById('upload-progress-container');
  const progressFill = document.getElementById('upload-progress-fill');
  const percentText = document.getElementById('upload-percent-text');
  const statusText = document.getElementById('upload-status-text');
  const uploadBtn = document.getElementById('start-upload-btn');

  progressContainer.classList.remove('hidden');
  uploadBtn.disabled = true;
  progressFill.style.width = '0%';
  percentText.textContent = '0%';
  statusText.textContent = 'Uploading match video(s)...';

  const formData = new FormData();
  formData.append('match_id', state.currentMatchId || 1);
  if (uploadState.cam1File) formData.append('video_a', uploadState.cam1File);
  if (uploadState.cam2File) formData.append('video_b', uploadState.cam2File);

  const xhr = new XMLHttpRequest();
  xhr.open('POST', '/api/upload_match_videos', true);

  xhr.upload.onprogress = (e) => {
    if (e.lengthComputable) {
      const pct = Math.round((e.loaded / e.total) * 100);
      progressFill.style.width = `${pct}%`;
      percentText.textContent = `${pct}%`;
      const loadedMb = (e.loaded / (1024 * 1024)).toFixed(1);
      const totalMb = (e.total / (1024 * 1024)).toFixed(1);
      statusText.textContent = `Uploading: ${loadedMb} MB / ${totalMb} MB (${pct}%)`;
    }
  };

  xhr.onload = async () => {
    if (xhr.status >= 200 && xhr.status < 300) {
      progressFill.style.width = '100%';
      percentText.textContent = '100%';
      statusText.textContent = 'Upload complete! Attaching to match studio...';
      showUploadAlert('✅ Video(s) successfully uploaded and linked to match!', 'success');

      setTimeout(async () => {
        await loadMatch(state.currentMatchId || 1);
        closeVideoUploadModal();
      }, 1200);
    } else {
      uploadBtn.disabled = false;
      showUploadAlert(`Upload failed (Status ${xhr.status}): ${xhr.responseText}`, 'error');
    }
  };

  xhr.onerror = () => {
    uploadBtn.disabled = false;
    showUploadAlert('Network error occurred during video upload. Please check your connection.', 'error');
  };

  xhr.send(formData);
}

function showUploadAlert(msg, type = 'info') {
  const el = document.getElementById('upload-alert');
  if (!el) return;
  el.classList.remove('hidden', 'bg-red-950/40', 'border-red-800', 'text-red-300', 'bg-emerald-950/40', 'border-emerald-800', 'text-emerald-300');
  if (type === 'error') {
    el.classList.add('bg-red-950/40', 'border-red-800', 'text-red-300');
  } else {
    el.classList.add('bg-emerald-950/40', 'border-emerald-800', 'text-emerald-300');
  }
  el.textContent = msg;
}

async function refreshAvailableVideosList() {
  try {
    const res = await fetch('/api/available_videos');
    const data = await res.json();
    uploadState.availableVideos = data.videos || [];

    if (data.videos_dir) {
      const pathInput = document.getElementById('mac-videos-path-input');
      if (pathInput) pathInput.value = data.videos_dir;
    }

    const select1 = document.getElementById('folder-cam1-select');
    const select2 = document.getElementById('folder-cam2-select');
    if (!select1 || !select2) return;

    const placeholder = window.I18N ? window.I18N.t('choose_existing_placeholder') : '-- Choose video file --';
    let optionsHtml = `<option value="">${placeholder}</option>`;

    uploadState.availableVideos.forEach(v => {
      optionsHtml += `<option value="${v.url}">${v.filename} (${v.size_mb} MB)</option>`;
    });

    select1.innerHTML = optionsHtml;
    select2.innerHTML = optionsHtml;

    // Preselect current match videos if found
    if (state.currentMatch) {
      if (state.currentMatch.video_angle_a) select1.value = state.currentMatch.video_angle_a;
      if (state.currentMatch.video_angle_b) select2.value = state.currentMatch.video_angle_b;
    }
  } catch (err) {
    console.error('Failed to load available videos:', err);
  }
}

function copyMacVideosPath() {
  const pathInput = document.getElementById('mac-videos-path-input');
  if (!pathInput) return;
  navigator.clipboard.writeText(pathInput.value).then(() => {
    const orig = pathInput.value;
    pathInput.value = '✓ Path copied to clipboard!';
    setTimeout(() => { pathInput.value = orig; }, 1500);
  }).catch(() => {
    pathInput.select();
  });
}

async function applyExistingFolderVideos() {
  const select1 = document.getElementById('folder-cam1-select');
  const select2 = document.getElementById('folder-cam2-select');
  const alertEl = document.getElementById('folder-alert');

  const val1 = select1 ? select1.value : '';
  const val2 = select2 ? select2.value : '';

  if (!val1 && !val2) {
    if (alertEl) {
      alertEl.classList.remove('hidden');
      alertEl.className = 'p-3 rounded-xl text-xs font-medium border bg-red-950/40 border-red-800 text-red-300';
      alertEl.textContent = 'Please select at least one video from the folder.';
    }
    return;
  }

  try {
    const payload = {
      match_id: state.currentMatchId || 1
    };
    if (val1) payload.video_angle_a = val1;
    if (val2) payload.video_angle_b = val2;

    const res = await fetch('/api/set_match_videos', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    if (res.ok) {
      if (alertEl) {
        alertEl.classList.remove('hidden');
        alertEl.className = 'p-3 rounded-xl text-xs font-medium border bg-emerald-950/40 border-emerald-800 text-emerald-300';
        alertEl.textContent = '✅ Videos updated! Reloading match player...';
      }
      setTimeout(async () => {
        await loadMatch(state.currentMatchId || 1);
        closeVideoUploadModal();
      }, 1000);
    } else {
      const err = await res.json();
      if (alertEl) {
        alertEl.classList.remove('hidden');
        alertEl.className = 'p-3 rounded-xl text-xs font-medium border bg-red-950/40 border-red-800 text-red-300';
        alertEl.textContent = err.error || 'Failed to update match videos.';
      }
    }
  } catch (err) {
    if (alertEl) {
      alertEl.classList.remove('hidden');
      alertEl.className = 'p-3 rounded-xl text-xs font-medium border bg-red-950/40 border-red-800 text-red-300';
      alertEl.textContent = 'Error updating videos: ' + err.message;
    }
  }
}

