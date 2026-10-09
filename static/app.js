// SóCraques - Seleção Canarinho Edition Core Interactive Engine
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
const timelineContainer = document.getElementById('timelineContainer');
const timelineProgress = document.getElementById('timelineProgress');
const scrubberHead = document.getElementById('scrubberHead');
const playPauseBtn = document.getElementById('play-pause-btn');
const timeCurrentEl = document.getElementById('time-current');
const timeDurationEl = document.getElementById('time-duration');
const timeDurationRight = document.getElementById('time-duration-right');
const playerTimerEl = document.getElementById('playerTimer');
const currentCamTag = document.getElementById('current-cam-tag');
const camBtnA = document.getElementById('cam-btn-a');
const camBtnB = document.getElementById('cam-btn-b');
const btnCurrentTimestamp = document.getElementById('btnCurrentTimestamp');
const markersContainer = document.getElementById('timeline-markers-container');
const matchGoalsList = document.getElementById('match-goals-list');
const eventOverlayBadge = document.getElementById('eventOverlayBadge');
const eventOverlayText = document.getElementById('eventOverlayText');

document.addEventListener('DOMContentLoaded', async () => {
  if (window.lucide) lucide.createIcons();
  if (window.I18N) I18N.applyTranslations();
  setupVideoEvents();
  setupTimelineScrubbing();
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

// Video Engine Setup
function setupVideoEvents() {
  if (!videoA) return;

  videoA.addEventListener('loadedmetadata', () => {
    state.videoDuration = videoA.duration || 60;
    if (timeDurationEl) timeDurationEl.textContent = formatTime(state.videoDuration);
    if (timeDurationRight) timeDurationRight.textContent = formatTime(state.videoDuration);
    renderTimelineMarkers();
  });

  videoA.addEventListener('timeupdate', () => {
    const t = videoA.currentTime;
    updateTimelineDisplay(t);

    if (videoB) {
      const targetB = Math.max(0, t + state.syncOffset);
      if (Math.abs(videoB.currentTime - targetB) > 0.35) {
        videoB.currentTime = targetB;
      }
    }
  });

  videoA.addEventListener('play', () => {
    state.isPlaying = true;
    updatePlayPauseIcon();
    if (videoB) videoB.play().catch(() => {});
  });

  videoA.addEventListener('pause', () => {
    state.isPlaying = false;
    updatePlayPauseIcon();
    if (videoB) videoB.pause();
  });

  videoA.addEventListener('ended', () => {
    state.isPlaying = false;
    updatePlayPauseIcon();
  });
}

function updateTimelineDisplay(t) {
  const duration = state.videoDuration || 60;
  const pct = Math.max(0, Math.min(100, (t / duration) * 100));
  const formatted = formatTime(t);
  const formattedMs = formatTimeMs(t);

  if (timeCurrentEl) timeCurrentEl.textContent = formatted;
  if (playerTimerEl) playerTimerEl.textContent = formattedMs;
  if (btnCurrentTimestamp) btnCurrentTimestamp.textContent = formatted;
  if (timelineProgress) timelineProgress.style.width = pct + '%';
  if (scrubberHead) scrubberHead.style.left = pct + '%';

  updateContextualOverlay(t);
}

function updateContextualOverlay(t) {
  if (!eventOverlayBadge) return;

  // Check matching match goals or nutmegs near current timestamp (±3 seconds)
  let foundEvent = null;
  if (state.currentMatch) {
    const goals = state.currentMatch.goals || [];
    const nutmegs = state.currentMatch.nutmegs || [];

    for (const g of goals) {
      if (Math.abs(t - (g.timestamp_sec || 0)) <= 3.0) {
        foundEvent = {
          type: 'goal',
          text: `⚽⚽ GOLAÇO! ${g.scorer_name} (${formatTime(g.timestamp_sec)})`
        };
        break;
      }
    }
    if (!foundEvent) {
      for (const n of nutmegs) {
        if (Math.abs(t - (n.timestamp_sec || 0)) <= 3.0) {
          foundEvent = {
            type: 'nutmeg',
            text: `🪄 CANETA! ${n.giver_name} (${formatTime(n.timestamp_sec)})`
          };
          break;
        }
      }
    }
  }

  // Fallback to default mockup highlight times if not found
  if (!foundEvent) {
    if (t >= 7.5 && t <= 12.5) {
      foundEvent = { type: 'goal', text: '⚽⚽ GOLAÇO! Paulo Andraus (0:09)' };
    } else if (t >= 21 && t <= 26) {
      foundEvent = { type: 'nutmeg', text: '🪄 CANETA! Paulo Andraus (0:23)' };
    } else if (t >= 76 && t <= 82) {
      foundEvent = { type: 'goal', text: '⚽ GOL! Carlos Roberto (1:19)' };
    } else if (t >= 92 && t <= 98) {
      foundEvent = { type: 'goal', text: '⚽ GOL! William (1:35)' };
    }
  }

  if (foundEvent) {
    eventOverlayBadge.classList.remove('hidden');
    eventOverlayBadge.classList.add('flex');
    if (eventOverlayText) eventOverlayText.textContent = foundEvent.text;
  } else {
    // Keep it subtly hidden when no highlight is playing
    eventOverlayBadge.classList.add('hidden');
    eventOverlayBadge.classList.remove('flex');
  }
}

// Timeline Scrubbing via Click and Drag
function setupTimelineScrubbing() {
  if (!timelineContainer) return;

  let isDragging = false;

  const seekFromPointer = (e) => {
    const rect = timelineContainer.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const pct = Math.max(0, Math.min(1, clickX / rect.width));
    const targetTime = pct * (state.videoDuration || 60);

    if (videoA) {
      videoA.currentTime = targetTime;
      if (videoB) videoB.currentTime = Math.max(0, targetTime + state.syncOffset);
    }
    updateTimelineDisplay(targetTime);
  };

  timelineContainer.addEventListener('mousedown', (e) => {
    isDragging = true;
    seekFromPointer(e);
  });

  window.addEventListener('mousemove', (e) => {
    if (isDragging) {
      seekFromPointer(e);
    }
  });

  window.addEventListener('mouseup', () => {
    isDragging = false;
  });
}

function togglePlay() {
  if (!videoA) return;
  if (videoA.paused) {
    videoA.play().catch(() => {});
    if (videoB) videoB.play().catch(() => {});
  } else {
    videoA.pause();
    if (videoB) videoB.pause();
  }
}

function updatePlayPauseIcon() {
  const icon = playPauseBtn ? playPauseBtn.querySelector('.material-symbols-outlined') : null;
  const centralIcon = document.getElementById('centralPlayIcon');

  if (state.isPlaying) {
    if (icon) icon.textContent = 'pause';
    if (centralIcon) centralIcon.textContent = 'pause';
  } else {
    if (icon) icon.textContent = 'play_arrow';
    if (centralIcon) centralIcon.textContent = 'play_arrow';
  }
}

function stepSeconds(sec) {
  if (!videoA) return;
  const duration = state.videoDuration || 60;
  const newTime = Math.max(0, Math.min(duration, videoA.currentTime + sec));
  videoA.currentTime = newTime;
  if (videoB) videoB.currentTime = Math.max(0, newTime + state.syncOffset);
  updateTimelineDisplay(newTime);
}

function setPlaybackRate(rate) {
  state.playbackRate = rate;
  if (videoA) videoA.playbackRate = rate;
  if (videoB) videoB.playbackRate = rate;
}

function stepSyncOffset(delta) {
  state.syncOffset = Math.round((state.syncOffset + delta) * 100) / 100;
  const input = document.getElementById('sync-offset-input');
  if (input) input.value = state.syncOffset.toFixed(2);
  if (videoB && videoA) {
    videoB.currentTime = Math.max(0, videoA.currentTime + state.syncOffset);
  }
}

function switchCamera(cam) {
  state.activeCamera = cam;
  if (cam === 'a') {
    if (videoA) {
      videoA.classList.remove('opacity-0', 'pointer-events-none');
      videoA.classList.add('z-10');
    }
    if (videoB) {
      videoB.classList.add('opacity-0', 'pointer-events-none');
      videoB.classList.remove('z-10');
    }

    if (camBtnA) {
      camBtnA.className = 'cam-toggle-btn active flex items-center gap-2 bg-[#FFDF00] text-[#060D20] px-4 py-1.5 rounded-lg text-xs shadow-md font-bold transition';
    }
    if (camBtnB) {
      camBtnB.className = 'cam-toggle-btn flex items-center gap-2 bg-[#060D20] hover:bg-[#14234C] border border-[#1A2E5A] px-4 py-1.5 rounded-lg text-xs text-gray-300 hover:text-white transition';
    }
    if (currentCamTag) {
      currentCamTag.textContent = 'PHONE 1 • MIDFIELD';
    }
  } else {
    if (videoB) {
      videoB.classList.remove('opacity-0', 'pointer-events-none');
      videoB.classList.add('z-10');
    }
    if (videoA) {
      videoA.classList.add('opacity-0', 'pointer-events-none');
      videoA.classList.remove('z-10');
    }

    if (camBtnB) {
      camBtnB.className = 'cam-toggle-btn active flex items-center gap-2 bg-[#FFDF00] text-[#060D20] px-4 py-1.5 rounded-lg text-xs shadow-md font-bold transition';
    }
    if (camBtnA) {
      camBtnA.className = 'cam-toggle-btn flex items-center gap-2 bg-[#060D20] hover:bg-[#14234C] border border-[#1A2E5A] px-4 py-1.5 rounded-lg text-xs text-gray-300 hover:text-white transition';
    }
    if (currentCamTag) {
      currentCamTag.textContent = 'PHONE 2 • BEHIND NET';
    }
  }
}

function toggleVideoFullscreen() {
  const container = document.querySelector('.aspect-video');
  if (!container) return;
  if (!document.fullscreenElement) {
    container.requestFullscreen().catch(() => {});
  } else {
    document.exitFullscreen().catch(() => {});
  }
}

// Data Fetching & Rendering
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

    const goalsCount = (state.currentMatch.goals || []).length;
    const nutmegsCount = (state.currentMatch.nutmegs || []).length;

    const dateDisplay = document.getElementById('match-date-display');
    if (dateDisplay) dateDisplay.textContent = state.currentMatch.match_date || '2026-10-08';

    const goalsBadge = document.getElementById('match-goals-badge');
    if (goalsBadge) goalsBadge.textContent = `⚽ ${goalsCount} Goals Logged`;

    const nutmegsBadge = document.getElementById('match-nutmegs-badge');
    if (nutmegsBadge) nutmegsBadge.textContent = `🪄 ${nutmegsCount} Caneta${nutmegsCount === 1 ? '' : 's'}`;

    const hasVideo = !!(state.currentMatch.video_angle_a && state.currentMatch.video_angle_a.trim() !== '');
    const overlay = document.getElementById('no-video-overlay');

    if (hasVideo) {
      if (videoA) videoA.src = state.currentMatch.video_angle_a;
      if (videoB && state.currentMatch.video_angle_b) {
        videoB.src = state.currentMatch.video_angle_b;
      }
      if (overlay) overlay.classList.add('hidden');
    } else {
      if (overlay) overlay.classList.remove('hidden');
    }

    state.syncOffset = state.currentMatch.sync_offset || 0.0;
    const offsetInput = document.getElementById('sync-offset-input');
    if (offsetInput) offsetInput.value = state.syncOffset.toFixed(2);

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

  if (countSubtitle) {
    const goalText = goals.length === 1 ? 'goal' : 'goals';
    const nutmegText = nutmegs.length === 1 ? 'caneta' : 'canetas';
    countSubtitle.innerHTML = `<span class="text-[#FFDF00] font-bold">${goals.length} ${goalText}</span> recorded • <span class="text-[#00C2FF] font-bold">${nutmegs.length} ${nutmegText}</span>`;
  }

  const events = [
    ...goals.map(g => ({ ...g, eventType: 'goal', sortTime: g.timestamp_sec || 0 })),
    ...nutmegs.map(n => ({ ...n, eventType: 'nutmeg', sortTime: n.timestamp_sec || 0 }))
  ];

  events.sort((a, b) => a.sortTime - b.sortTime);

  if (events.length === 0) {
    container.innerHTML = `
      <div class="text-center py-10 text-gray-500 text-xs">
        No goals or canetas recorded yet.
      </div>
    `;
    return;
  }

  const nutmeggedLabel = (window.I18N && I18N.t('nutmegged_text')) || 'nutmegged';
  const downloadTitle = (window.I18N && I18N.t('download_clip')) || 'Baixar Clipe de 20s (10s antes e 10s depois)';

  container.innerHTML = events.map(ev => {
    if (ev.eventType === 'goal') {
      const hasAssist = ev.assist_name && ev.assist_name.trim().length > 0;
      const safeName = (ev.scorer_name || 'gol').replace(/'/g, "\\'");
      const timeStr = ev.minute_display || formatTime(ev.timestamp_sec);

      return `
        <div class="feed-item bg-[#060D20] hover:bg-[#101E42] border border-[#1A2E5A] hover:border-[#FFDF00]/50 p-3.5 rounded-xl transition-all shadow-md group cursor-pointer" onclick="seekToGoal(${ev.timestamp_sec})">
          <div class="flex items-start justify-between gap-3">
            <div class="flex items-start gap-3">
              <!-- Canary Yellow Timestamp Pill -->
              <div class="bg-[#FFDF00] text-[#060D20] px-2.5 py-1 rounded-lg font-mono text-xs font-black shrink-0 shadow-sm">
                ${timeStr}
              </div>
              <div class="flex flex-col gap-1 min-w-0">
                <div class="flex items-center gap-1.5 flex-wrap">
                  <span class="bg-[#0B1733] text-gray-400 border border-[#1A2E5A] px-1.5 py-0.5 rounded font-mono text-[10px] font-semibold">${ev.game_name || 'Game 1'}</span>
                  <span class="font-extrabold text-sm text-white truncate hover:text-[#FFDF00]" onclick="event.stopPropagation(); openPlayerProfile(${ev.scorer_id})">
                    ${ev.scorer_name}
                  </span>
                  <span class="font-mono text-xs text-[#FFDF00] font-bold">#${ev.scorer_jersey || '10'}</span>
                </div>
                <div class="flex items-center gap-1 text-gray-300 text-xs">
                  <span class="text-[13px]">🎯</span>
                  <span>Assist: <span class="text-white font-bold">${hasAssist ? ev.assist_name : 'Solo / Unassisted'}</span></span>
                </div>
                <span class="text-gray-400 italic text-[11px] mt-0.5">
                  "${ev.notes || 'Logged live during Game 1'}"
                </span>
              </div>
            </div>
            
            <!-- Quick Actions: Play & Download -->
            <div class="flex items-center gap-1 shrink-0 text-gray-400 group-hover:text-white transition-colors">
              <button onclick="event.stopPropagation(); seekToGoal(${ev.timestamp_sec})" class="w-8 h-8 rounded-lg bg-[#0B1733] border border-[#1A2E5A] flex items-center justify-center hover:bg-[#FFDF00] hover:text-[#060D20] transition-colors" title="Play Highlight Clip">
                <span class="material-symbols-outlined text-[16px]">play_arrow</span>
              </button>
              <button id="btn-download-goal-${ev.id}" onclick="event.stopPropagation(); downloadClip('goal', ${ev.id}, ${ev.timestamp_sec}, '${safeName}')" class="w-8 h-8 rounded-lg bg-[#0B1733] border border-[#1A2E5A] flex items-center justify-center hover:bg-[#009B3A] hover:text-white transition-colors" title="${downloadTitle}">
                <span class="material-symbols-outlined text-[16px]">download</span>
              </button>
              <button onclick="event.stopPropagation(); deleteGoal(${ev.id})" title="Delete Goal" class="w-8 h-8 rounded-lg bg-[#0B1733] border border-[#1A2E5A] flex items-center justify-center hover:bg-red-500/20 hover:text-red-400 opacity-0 group-hover:opacity-100 transition">
                <span class="material-symbols-outlined text-[14px]">delete</span>
              </button>
            </div>
          </div>
        </div>
      `;
    } else {
      const safeGiver = (ev.giver_name || 'caneta').replace(/'/g, "\\'");
      const timeStr = ev.minute_display || formatTime(ev.timestamp_sec);

      return `
        <div class="feed-item bg-[#060D20] hover:bg-[#101E42] border border-[#002776] hover:border-[#00C2FF]/50 p-3.5 rounded-xl transition-all shadow-md group cursor-pointer" onclick="seekToGoal(${ev.timestamp_sec})">
          <div class="flex items-start justify-between gap-3">
            <div class="flex items-start gap-3">
              <!-- Royal Blue / Violet Accent Timestamp Pill -->
              <div class="bg-[#002776] text-[#00C2FF] border border-[#00C2FF]/40 px-2.5 py-1 rounded-lg font-mono text-xs font-black shrink-0 shadow-sm">
                ${timeStr}
              </div>
              <div class="flex flex-col gap-1 min-w-0">
                <div class="flex items-center gap-1.5 flex-wrap">
                  <span class="bg-[#0B1733] text-[#00C2FF] border border-[#002776] px-1.5 py-0.5 rounded font-mono text-[10px] font-semibold">${ev.game_name || 'Game 1'}</span>
                  <span class="text-[13px]">🪄</span>
                  <span class="font-extrabold text-sm text-white truncate hover:text-[#00C2FF]" onclick="event.stopPropagation(); openPlayerProfile(${ev.giver_id})">
                    ${ev.giver_name}
                  </span>
                </div>
                <div class="flex items-center gap-1 text-[#00C2FF] text-xs font-semibold">
                  <span>${nutmeggedLabel} ${ev.receiver_name} (Caneta!)</span>
                </div>
                <span class="text-gray-400 italic text-[11px] mt-0.5">
                  "${ev.notes || 'Logged live during Game 1'}"
                </span>
              </div>
            </div>

            <!-- Quick Actions: Play & Download -->
            <div class="flex items-center gap-1 shrink-0 text-gray-400 group-hover:text-white transition-colors">
              <button onclick="event.stopPropagation(); seekToGoal(${ev.timestamp_sec})" class="w-8 h-8 rounded-lg bg-[#0B1733] border border-[#1A2E5A] flex items-center justify-center hover:bg-[#00C2FF] hover:text-[#060D20] transition-colors" title="Play Highlight Clip">
                <span class="material-symbols-outlined text-[16px]">play_arrow</span>
              </button>
              <button id="btn-download-nutmeg-${ev.id}" onclick="event.stopPropagation(); downloadClip('nutmeg', ${ev.id}, ${ev.timestamp_sec}, '${safeGiver}')" class="w-8 h-8 rounded-lg bg-[#0B1733] border border-[#1A2E5A] flex items-center justify-center hover:bg-[#009B3A] hover:text-white transition-colors" title="${downloadTitle}">
                <span class="material-symbols-outlined text-[16px]">download</span>
              </button>
              <button onclick="event.stopPropagation(); deleteNutmeg(${ev.id})" title="Delete Caneta" class="w-8 h-8 rounded-lg bg-[#0B1733] border border-[#1A2E5A] flex items-center justify-center hover:bg-red-500/20 hover:text-red-400 opacity-0 group-hover:opacity-100 transition">
                <span class="material-symbols-outlined text-[14px]">delete</span>
              </button>
            </div>
          </div>
        </div>
      `;
    }
  }).join('');
}

async function downloadClip(eventType, eventId, timestampSec, playerName) {
  const btn = document.getElementById(`btn-download-${eventType}-${eventId}`);
  const originalHtml = btn ? btn.innerHTML : '';
  if (btn) {
    btn.disabled = true;
    btn.innerHTML = '<span class="material-symbols-outlined text-[16px] animate-spin text-[#FFDF00]">sync</span>';
  }

  try {
    const angle = state.activeCamera || 'a';
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
    }
  }
}

function seekToGoal(timestampSec) {
  if (!videoA) return;
  const jumpTime = Math.max(0, timestampSec - 3.0);
  videoA.currentTime = jumpTime;
  if (videoB) videoB.currentTime = Math.max(0, jumpTime + state.syncOffset);
  videoA.play().catch(() => {});

  updateTimelineDisplay(jumpTime);
}

function renderTimelineMarkers() {
  if (!markersContainer) return;
  markersContainer.innerHTML = '';

  const duration = state.videoDuration || 60;
  const goals = (state.currentMatch && state.currentMatch.goals) || [];
  const nutmegs = (state.currentMatch && state.currentMatch.nutmegs) || [];

  goals.forEach(g => {
    const pct = Math.min(100, Math.max(0, (g.timestamp_sec / duration) * 100));
    const btn = document.createElement('button');
    btn.className = 'timeline-pin group pointer-events-auto absolute top-1/2 -translate-y-1/2 -translate-x-1/2 flex flex-col items-center focus:outline-none';
    btn.style.left = `${pct}%`;
    btn.onclick = (e) => {
      e.stopPropagation();
      seekToGoal(g.timestamp_sec);
    };
    btn.innerHTML = `
      <div class="w-7 h-7 rounded-full bg-[#FFDF00] text-[#060D20] ring-2 ring-[#009B3A] flex items-center justify-center shadow-lg group-hover:scale-125 transition-transform">
        <span class="text-[12px] font-bold">⚽</span>
      </div>
      <span class="absolute -bottom-6 font-mono text-[10px] text-[#FFDF00] font-bold opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap bg-[#060D20] border border-[#FFDF00]/40 px-1.5 py-0.5 rounded">
        ${formatTime(g.timestamp_sec)} Gol
      </span>
    `;
    markersContainer.appendChild(btn);
  });

  nutmegs.forEach(n => {
    const pct = Math.min(100, Math.max(0, (n.timestamp_sec / duration) * 100));
    const btn = document.createElement('button');
    btn.className = 'timeline-pin group pointer-events-auto absolute top-1/2 -translate-y-1/2 -translate-x-1/2 flex flex-col items-center focus:outline-none';
    btn.style.left = `${pct}%`;
    btn.onclick = (e) => {
      e.stopPropagation();
      seekToGoal(n.timestamp_sec);
    };
    btn.innerHTML = `
      <div class="w-7 h-7 rounded-full bg-[#002776] text-white ring-2 ring-[#00C2FF] flex items-center justify-center shadow-lg group-hover:scale-125 transition-transform">
        <span class="text-[12px]">🪄</span>
      </div>
      <span class="absolute -bottom-6 font-mono text-[10px] text-[#00C2FF] font-bold opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap bg-[#060D20] border border-[#00C2FF]/40 px-1.5 py-0.5 rounded">
        ${formatTime(n.timestamp_sec)} Caneta
      </span>
    `;
    markersContainer.appendChild(btn);
  });
}

// Goal Tag Modal
function openGoalTagModal() {
  const currentTime = (videoA && videoA.currentTime) || 23.0;
  const input = document.getElementById('goal-timestamp-input');
  const label = document.getElementById('modal-timestamp-label');
  if (input) input.value = currentTime.toFixed(1);
  if (label) label.textContent = formatTime(currentTime);

  const modal = document.getElementById('goal-tag-modal');
  if (modal) {
    modal.classList.remove('hidden');
    modal.classList.add('flex');
  }
}

function closeGoalTagModal() {
  const modal = document.getElementById('goal-tag-modal');
  if (modal) {
    modal.classList.add('hidden');
    modal.classList.remove('flex');
  }
}

function populateRosterSelects() {
  const scorerSelect = document.getElementById('modal-scorer-select');
  const assistSelect = document.getElementById('modal-assist-select');
  if (!scorerSelect || !assistSelect) return;

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
  if (btn) {
    btn.disabled = true;
    btn.innerHTML = '<span>Saving & Clipping...</span>';
  }

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
    if (btn) {
      btn.disabled = false;
      btn.innerHTML = '<span class="material-symbols-outlined text-[18px]">bookmark_add</span><span>Save & Extract 15s Clip</span>';
    }
  }
}

async function deleteGoal(goalId) {
  if (!confirm('Excluir este gol?')) return;
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

async function deleteNutmeg(nutmegId) {
  if (!confirm('Excluir esta caneta?')) return;
  try {
    const res = await fetch(`/api/nutmegs/${nutmegId}`, { method: 'DELETE' });
    if (res.ok) {
      await loadMatch(state.currentMatchId);
    }
  } catch (err) {
    console.error(err);
  }
}

// Match Sheet Modal (Súmula)
function openMatchSheetModal() {
  const modal = document.getElementById('match-sheet-modal');
  if (!modal) return;

  const goals = (state.currentMatch && state.currentMatch.goals) || [];
  const nutmegs = (state.currentMatch && state.currentMatch.nutmegs) || [];

  const totalGoalsEl = document.getElementById('sheet-total-goals');
  const totalNutmegsEl = document.getElementById('sheet-total-nutmegs');
  if (totalGoalsEl) totalGoalsEl.textContent = goals.length;
  if (totalNutmegsEl) totalNutmegsEl.textContent = nutmegs.length;

  const timelineList = document.getElementById('sheet-events-timeline');
  if (timelineList) {
    const events = [
      ...goals.map(g => ({ ...g, type: 'goal', time: g.timestamp_sec || 0 })),
      ...nutmegs.map(n => ({ ...n, type: 'nutmeg', time: n.timestamp_sec || 0 }))
    ].sort((a, b) => a.time - b.time);

    if (events.length === 0) {
      timelineList.innerHTML = '<p class="text-xs text-gray-500 py-3">Nenhum evento registrado nesta partida.</p>';
    } else {
      timelineList.innerHTML = events.map(e => `
        <div class="flex items-center justify-between p-2.5 rounded-lg bg-[#060D20] border border-[#1A2E5A] text-xs">
          <div class="flex items-center gap-2">
            <span class="font-mono text-[11px] ${e.type === 'goal' ? 'text-[#FFDF00]' : 'text-[#00C2FF]'} font-bold">
              ${formatTime(e.time)}
            </span>
            <span class="text-white font-semibold">
              ${e.type === 'goal' ? `⚽ Gol: ${e.scorer_name} (${e.assist_name ? 'Assist: ' + e.assist_name : 'Solo'})` : `🪄 Caneta: ${e.giver_name} em ${e.receiver_name}`}
            </span>
          </div>
          <span class="font-mono text-[10px] text-gray-400">${e.game_name || 'Game 1'}</span>
        </div>
      `).join('');
    }
  }

  modal.classList.remove('hidden');
  modal.classList.add('flex');
}

function closeMatchSheetModal() {
  const modal = document.getElementById('match-sheet-modal');
  if (modal) {
    modal.classList.add('hidden');
    modal.classList.remove('flex');
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

  const btnGoals = document.getElementById('btn-sort-goals');
  const btnAssists = document.getElementById('btn-sort-assists');
  const btnContribs = document.getElementById('btn-sort-contributions');

  if (btnGoals) {
    btnGoals.className = metric === 'goals'
      ? 'px-3.5 py-1.5 rounded-lg font-bold bg-[#FFDF00] text-[#060D20] transition'
      : 'px-3.5 py-1.5 rounded-lg font-bold text-gray-400 hover:text-white transition';
  }
  if (btnAssists) {
    btnAssists.className = metric === 'assists'
      ? 'px-3.5 py-1.5 rounded-lg font-bold bg-[#00C2FF] text-[#060D20] transition'
      : 'px-3.5 py-1.5 rounded-lg font-bold text-gray-400 hover:text-white transition';
  }
  if (btnContribs) {
    btnContribs.className = metric === 'contributions'
      ? 'px-3.5 py-1.5 rounded-lg font-bold bg-[#009B3A] text-white transition'
      : 'px-3.5 py-1.5 rounded-lg font-bold text-gray-400 hover:text-white transition';
  }

  renderLeaderboard();
}

function renderLeaderboard() {
  const metric = state.sortMetric;
  const list = [...state.leaderboard].sort((a, b) => {
    if (b[metric] !== a[metric]) return b[metric] - a[metric];
    if (metric !== 'goals' && b.goals !== a.goals) return b.goals - a.goals;
    return a.name.localeCompare(b.name);
  });

  // Update Mini Leaderboard Widget
  const miniText = document.getElementById('miniLeaderboardText');
  if (miniText && list.length > 0) {
    const leader = list[0];
    miniText.textContent = `${leader.name} leads with ${leader[metric]} pts`;
  }

  const podiumContainer = document.getElementById('podium-container');
  const tableBody = document.getElementById('leaderboard-table-body');
  if (!podiumContainer || !tableBody) return;

  if (list.length === 0) {
    podiumContainer.innerHTML = '';
    tableBody.innerHTML = `
      <tr>
        <td colspan="7" class="py-12 text-center text-gray-500 text-xs">
          No players in roster yet.
        </td>
      </tr>
    `;
    return;
  }

  // Podium Top 3 Cards
  const top3 = list.filter(p => p[metric] > 0).slice(0, 3);
  const medalColors = [
    { border: 'border-[#FFDF00]/60', bg: 'from-[#FFDF00]/15 to-amber-500/5', badge: '🥇 Artilheiro', text: 'text-[#FFDF00]' },
    { border: 'border-slate-400/50', bg: 'from-slate-400/10 to-slate-500/5', badge: '🥈 2º Lugar', text: 'text-slate-300' },
    { border: 'border-amber-600/50', bg: 'from-amber-600/10 to-amber-700/5', badge: '🥉 3º Lugar', text: 'text-amber-500' }
  ];

  if (top3.length === 0) {
    podiumContainer.innerHTML = `
      <div class="col-span-3 bg-[#0B1733] border border-[#1A2E5A] rounded-2xl p-6 text-center text-gray-400 text-xs shadow-lg">
        ⚽ No goals have been scored yet this season! Log goals during games or on the Sideline Controller.
      </div>
    `;
  } else {
    podiumContainer.innerHTML = top3.map((p, idx) => {
      const m = medalColors[idx];
      return `
        <div onclick="openPlayerProfile(${p.id})" class="cursor-pointer bg-gradient-to-br ${m.bg} bg-[#0B1733] border ${m.border} rounded-2xl p-4 shadow-xl hover:scale-[1.02] transition flex items-center justify-between gap-4">
          <div class="flex items-center gap-3">
            <div class="w-12 h-12 rounded-xl flex items-center justify-center font-black text-[#060D20] text-base shadow-lg" style="background-color: ${p.avatar_color || '#FFDF00'}">
              #${p.jersey_number || '10'}
            </div>
            <div>
              <span class="text-[10px] font-mono font-bold uppercase tracking-wider ${m.text}">${m.badge}</span>
              <h3 class="font-bold text-sm text-white m-0">${p.name}</h3>
            </div>
          </div>
          <div class="text-right">
            <p class="text-2xl font-black text-white m-0">${p[metric]}</p>
            <p class="text-[10px] font-mono uppercase text-gray-400 m-0">${metric}</p>
          </div>
        </div>
      `;
    }).join('');
  }

  // Full Table Body
  tableBody.innerHTML = list.map((p, idx) => {
    const rank = idx + 1;
    const isLeader = rank === 1 && p[metric] > 0;
    return `
      <tr class="hover:bg-[#14234C]/40 cursor-pointer transition ${isLeader ? 'bg-[#FFDF00]/5 font-semibold' : ''}" onclick="openPlayerProfile(${p.id})">
        <td class="py-3 px-4 text-center font-mono font-bold text-xs ${isLeader ? 'text-[#FFDF00]' : 'text-gray-400'}">
          ${rank}
        </td>
        <td class="py-3 px-4">
          <div class="flex items-center gap-2.5">
            <div class="w-7 h-7 rounded-lg flex items-center justify-center font-bold text-xs text-[#060D20]" style="background-color: ${p.avatar_color || '#FFDF00'}">
              ${p.jersey_number || '10'}
            </div>
            <span class="text-white hover:text-[#FFDF00] font-bold">${p.name}</span>
          </div>
        </td>
        <td class="py-3 px-4 text-center font-mono font-extrabold text-sm text-[#FFDF00]">${p.goals}</td>
        <td class="py-3 px-4 text-center font-mono font-bold text-sm text-[#00C2FF]">${p.assists}</td>
        <td class="py-3 px-4 text-center font-mono font-black text-sm text-[#009B3A]">${p.contributions}</td>
        <td class="py-3 px-4 text-center font-mono text-xs text-gray-400">${p.matches}</td>
        <td class="py-3 px-4 text-right">
          <button class="px-2.5 py-1 rounded-lg bg-[#060D20] border border-[#1A2E5A] hover:bg-[#14234C] text-gray-300 text-xs font-semibold">
            View Reel
          </button>
        </td>
      </tr>
    `;
  }).join('');
}

// Players Roster Grid
function renderPlayersRoster() {
  const container = document.getElementById('player-roster-grid');
  if (!container) return;

  if (state.players.length === 0) {
    container.innerHTML = `
      <div class="col-span-full py-16 text-center text-gray-400 text-sm bg-[#0B1733] border border-[#1A2E5A] rounded-2xl p-8">
        <p class="font-bold text-base text-white mb-1">Your player roster is empty!</p>
        <p class="text-xs text-gray-400 mb-4">Add your friends and pickup squad players to start tracking goals.</p>
        <button onclick="openBatchPlayerModal()" class="px-5 py-2.5 rounded-xl bg-[#FFDF00] text-[#060D20] font-black text-xs inline-flex items-center gap-2">
          <span>+ Add Multiple Players</span>
        </button>
      </div>
    `;
    return;
  }

  container.innerHTML = state.players.map(p => `
    <div onclick="openPlayerProfile(${p.id})" class="cursor-pointer bg-[#0B1733] border border-[#1A2E5A] hover:border-[#FFDF00]/50 rounded-2xl p-5 shadow-xl transition group flex flex-col justify-between">
      <div>
        <div class="flex items-start justify-between">
          <div class="w-12 h-12 rounded-xl flex items-center justify-center font-black text-lg text-[#060D20] shadow-lg" style="background-color: ${p.avatar_color || '#FFDF00'}">
            #${p.jersey_number || '10'}
          </div>
          <span class="text-[11px] font-mono px-2 py-0.5 rounded-full bg-[#060D20] text-gray-400 border border-[#1A2E5A]">
            Craque
          </span>
        </div>
        <div class="mt-3">
          <h3 class="font-extrabold text-base text-white group-hover:text-[#FFDF00] transition m-0">${p.name}</h3>
        </div>
      </div>

      <div class="mt-4 pt-3 border-t border-[#1A2E5A]/80 grid grid-cols-3 gap-2 text-center text-xs">
        <div>
          <span class="text-[#FFDF00] font-black text-base">${p.goals_count || 0}</span>
          <p class="text-[10px] text-gray-400 uppercase m-0">Goals</p>
        </div>
        <div>
          <span class="text-[#00C2FF] font-black text-base">${p.assists_count || 0}</span>
          <p class="text-[10px] text-gray-400 uppercase m-0">Assists</p>
        </div>
        <div>
          <span class="text-[#009B3A] font-black text-base">${p.contributions || 0}</span>
          <p class="text-[10px] text-gray-400 uppercase m-0">G + A</p>
        </div>
      </div>
    </div>
  `).join('');
}

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

// Batch Add Players Modal
function openBatchPlayerModal() {
  document.getElementById('paste-names-input').value = '';
  const tbody = document.getElementById('batch-table-body');
  tbody.innerHTML = '';
  for (let i = 0; i < 4; i++) {
    addEmptyTableRow();
  }
  updateBatchCount();
  const modal = document.getElementById('batch-player-modal');
  modal.classList.remove('hidden');
  modal.classList.add('flex');
}

function closeBatchPlayerModal() {
  const modal = document.getElementById('batch-player-modal');
  modal.classList.add('hidden');
  modal.classList.remove('flex');
}

function addEmptyTableRow(defaultName = '') {
  const tbody = document.getElementById('batch-table-body');
  const rowCount = tbody.children.length + 1;
  const tr = document.createElement('tr');
  tr.className = 'hover:bg-[#14234C]/30';
  tr.innerHTML = `
    <td class="py-2 px-3 text-center font-mono text-gray-500 row-index">${rowCount}</td>
    <td class="py-2 px-3">
      <input type="text" value="${defaultName}" placeholder="e.g. Player Name" class="w-full bg-[#060D20] border border-[#1A2E5A] rounded-lg px-2.5 py-1.5 text-xs text-white player-name-input focus:outline-none focus:border-[#FFDF00]" oninput="updateBatchCount()">
    </td>
    <td class="py-2 px-3 text-center">
      <button type="button" onclick="removeTableRow(this)" class="text-gray-500 hover:text-red-400 p-1">
        <span class="material-symbols-outlined text-[14px]">close</span>
      </button>
    </td>
  `;
  tbody.appendChild(tr);
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
    btn.innerHTML = '<span class="material-symbols-outlined text-[16px]">check</span><span>Save All Players</span>';
  }
}

// Player Profile Modal
async function openPlayerProfile(playerId) {
  const player = state.players.find(p => p.id === playerId);
  if (!player) return;

  const avatar = document.getElementById('profile-modal-avatar');
  if (avatar) {
    avatar.style.backgroundColor = player.avatar_color || '#FFDF00';
    avatar.textContent = `#${player.jersey_number || '10'}`;
  }
  document.getElementById('profile-modal-name').textContent = player.name;
  document.getElementById('profile-modal-meta').textContent = `#${player.jersey_number || '10'} • Player Profile`;
  document.getElementById('profile-stat-goals').textContent = player.goals_count || 0;
  document.getElementById('profile-stat-assists').textContent = player.assists_count || 0;
  document.getElementById('profile-stat-contributions').textContent = (player.goals_count || 0) + (player.assists_count || 0);

  const clipsContainer = document.getElementById('profile-clips-container');
  clipsContainer.innerHTML = '<p class="text-xs text-gray-400 py-3">Loading highlight reel...</p>';
  
  const modal = document.getElementById('player-profile-modal');
  modal.classList.remove('hidden');
  modal.classList.add('flex');

  try {
    const res = await fetch(`/api/players/${playerId}/reel`);
    const data = await res.json();
    const goals = data.goals || [];

    if (goals.length === 0) {
      clipsContainer.innerHTML = `
        <div class="text-center py-6 text-gray-500 text-xs">
          No goals recorded yet this season.
        </div>
      `;
      return;
    }

    clipsContainer.innerHTML = goals.map(g => `
      <div class="p-3 bg-[#060D20] border border-[#1A2E5A] rounded-xl flex items-center justify-between gap-3">
        <div class="flex items-center gap-3">
          <div class="w-8 h-8 rounded-lg bg-[#FFDF00]/20 text-[#FFDF00] flex items-center justify-center font-bold text-xs shrink-0 font-mono">
            ${g.minute_display || formatTime(g.timestamp_sec)}
          </div>
          <div>
            <h5 class="text-xs font-bold text-white m-0">${g.game_name || 'Game 1'}</h5>
            <p class="text-[11px] text-gray-400 m-0">${g.assist_name ? `Assist: ${g.assist_name}` : 'Solo Finish'}</p>
          </div>
        </div>
        <button onclick="playGoalInStudio(${g.match_id}, ${g.timestamp_sec})" class="px-3 py-1.5 rounded-lg bg-[#FFDF00]/20 hover:bg-[#FFDF00] text-[#FFDF00] hover:text-[#060D20] font-bold text-xs transition flex items-center gap-1">
          <span class="material-symbols-outlined text-[14px]">play_arrow</span> Play
        </button>
      </div>
    `).join('');
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
  const modal = document.getElementById('player-profile-modal');
  modal.classList.add('hidden');
  modal.classList.remove('flex');
}

// Video Upload Modal & Logic
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
  modal.classList.add('flex');

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
}

function closeVideoUploadModal() {
  const modal = document.getElementById('video-upload-modal');
  if (modal) {
    modal.classList.add('hidden');
    modal.classList.remove('flex');
  }
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
    directBtn.className = 'flex-1 py-1.5 rounded text-xs font-black bg-[#FFDF00] text-[#060D20] shadow-sm text-center transition';
    folderBtn.className = 'flex-1 py-1.5 rounded text-xs font-medium text-gray-300 hover:text-white text-center transition';
  } else {
    directPane.classList.add('hidden');
    folderPane.classList.remove('hidden');
    directBtn.className = 'flex-1 py-1.5 rounded text-xs font-medium text-gray-300 hover:text-white text-center transition';
    folderBtn.className = 'flex-1 py-1.5 rounded text-xs font-black bg-[#FFDF00] text-[#060D20] shadow-sm text-center transition';
    refreshAvailableVideosList();
  }
}

function resetFileBox(cam) {
  const badge = document.getElementById(`${cam}-file-badge`);
  const filename = document.getElementById(`${cam}-filename`);
  const filesize = document.getElementById(`${cam}-filesize`);
  const input = document.getElementById(`${cam}-file-input`);
  if (input) input.value = '';

  if (badge) {
    badge.textContent = 'None chosen';
    badge.className = 'font-mono text-[10px] text-gray-400';
  }
  if (filename) {
    filename.textContent = 'Click or drag & drop video (.mp4, .mov)';
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
      ? 'font-mono text-[10px] text-[#009B3A] font-bold'
      : 'font-mono text-[10px] text-[#00C2FF] font-bold';
  }
  if (filename) filename.textContent = file.name;
  if (filesize) filesize.textContent = `${sizeMb} MB • ${file.type || 'video'}`;

  updateUploadButtonState();
}

function updateUploadButtonState() {
  const btn = document.getElementById('start-upload-btn');
  if (!btn) return;
  btn.disabled = !(uploadState.cam1File || uploadState.cam2File);
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
        dropzone.classList.add(cam === 'cam1' ? 'border-[#FFDF00]' : 'border-[#00C2FF]', 'bg-[#14234C]/50');
      });
    });

    ['dragleave', 'drop'].forEach(eventName => {
      dropzone.addEventListener(eventName, (e) => {
        e.preventDefault();
        e.stopPropagation();
        dropzone.classList.remove('border-[#FFDF00]', 'border-[#00C2FF]', 'bg-[#14234C]/50');
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

    let optionsHtml = '<option value="">-- Choose video file --</option>';
    uploadState.availableVideos.forEach(v => {
      optionsHtml += `<option value="${v.url}">${v.filename} (${v.size_mb} MB)</option>`;
    });

    select1.innerHTML = optionsHtml;
    select2.innerHTML = optionsHtml;

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
    const payload = { match_id: state.currentMatchId || 1 };
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

// Time Format Helpers
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
