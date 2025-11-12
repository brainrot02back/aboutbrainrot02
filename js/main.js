const DISCORD_ID = '1405970014212853773';
const LANYARD_API = `https://api.lanyard.rest/v1/users/${DISCORD_ID}`;
const POLL_INTERVAL = 15000;
const $ = sel => document.querySelector(sel);
const el = (tag, attrs = {}, children = []) => {
  const e = document.createElement(tag);
  Object.entries(attrs).forEach(([k, v]) => e.setAttribute(k, v));
  (Array.isArray(children) ? children : [children]).forEach(c => {
    if (typeof c === 'string') e.appendChild(document.createTextNode(c));
    else if (c) e.appendChild(c);
  });
  return e;
};
const formatElapsed = ms => {
  if (ms < 0) return 'just now';
  const s = Math.floor(ms / 1000);
  const m = Math.floor(s / 60);
  const h = Math.floor(m / 60);
  const d = Math.floor(h / 24);
  if (d > 0) return `${d}d ${h % 24}h`;
  if (h > 0) return `${h}h ${m % 60}min`;
  if (m > 0) return `${m} min`;
  return `${s} sec`;
};
const STATIC_QUOTE = "i wanna work with drexxy like i used to -brainzz";
function showStaticQuote() {
  const text = $('#quoteText');
  $('#quoteCount').textContent = 'Quote: 1';
  text.style.opacity = '0';
  text.textContent = STATIC_QUOTE;
  setTimeout(() => {
    text.style.transition = 'opacity 2s ease';
    text.style.opacity = '1';
  }, 100);
  setInterval(() => {
    text.style.opacity = '0';
    setTimeout(() => {
      text.textContent = STATIC_QUOTE;
      text.style.opacity = '1';
    }, 2000);
  }, 12000);
}
async function fetchLanyard() {
  try {
    const res = await fetch(LANYARD_API, { cache: 'no-store' });
    if (!res.ok) throw new Error('Lanyard failed: ' + res.status);
    const { data } = await res.json();
    if (!data) throw new Error('Malformed payload');
    updateProfileUI(data);
    $('#lastUpdated').textContent = 'Last updated: ' + new Date().toLocaleTimeString();
  } catch (err) {
    console.error('Lanyard error', err);
    $('#statusText').textContent = 'Offline';
    $('#statusDot').style.background = 'gray';
  }
}
function avatarUrlFromLanyard(u) {
  if (!u) return '';
  const { id, avatar, discriminator = '0' } = u;
  if (avatar) {
    const ext = avatar.startsWith('a_') ? 'gif' : 'png';
    return `https://cdn.discordapp.com/avatars/${id}/${avatar}.${ext}?size=512`;
  }
  const idx = parseInt(discriminator) % 5;
  return `https://cdn.discordapp.com/embed/avatars/${idx}.png`;
}
const statusColor = status => ({
  online: '#43d675', idle: '#f6c244', dnd: '#ef4444',
  offline: '#7b8894', invisible: '#7b8894'
})[status] || '#7b8894';
function assetUrl(appId, asset, size = 128) {
  return asset ? `https://cdn.discordapp.com/app-assets/${appId}/${asset}.png?size=${size}` : '';
}
function updateProfileUI(data) {
  const { discord_user: user, discord_status: status, activities = [], spotify, listening_to_spotify } = data;
  $('#displayName').textContent = user?.username || 'Unknown';
  $('#tagline').textContent = user?.discriminator
    ? `#${user.discriminator} • ${user.id}`
    : `ID: ${user.id}`;
  const pfpImg = document.createElement('img');
  pfpImg.src = avatarUrlFromLanyard(user);
  pfpImg.alt = 'avatar';
  const pfp = $('#pfp');
  pfp.innerHTML = '';
  pfp.appendChild(pfpImg);
  $('#statusText').textContent = (status || 'offline').toUpperCase();
  $('#statusDot').style.background = statusColor(status);
  const block = $('#activityBlock');
  block.innerHTML = '';
  if (listening_to_spotify && spotify) {
    const { song, artist, album, album_art_url, timestamps } = spotify;
    const start = timestamps?.start ? new Date(timestamps.start) : null;
    const elapsed = start ? formatElapsed(Date.now() - start) : '';
    const spNode = el('div', { class: 'spotify' }, [
      el('div', { class: 'sp-art' }, [el('img', { src: album_art_url, alt: 'album' })]),
      el('div', { class: 'sp-meta' }, [
        el('div', { class: 'sp-song' }, song || 'Unknown'),
        el('div', { class: 'sp-artist' }, `${artist || 'Unknown'} — ${album || ''}`),
        start && el('div', { class: 'act-timestamp' }, `Started ${elapsed} ago`)
      ])
    ]);
    block.appendChild(spNode);
  } else if (activities.length) {
    const act = activities.find(a => a.type !== 4) || activities[0];
    if (act) {
      const { name, details, state, timestamps, assets, application_id } = act;
      const start = timestamps?.start ? new Date(timestamps.start) : null;
      const elapsed = start ? formatElapsed(Date.now() - start) : '';
      const actNode = el('div', { class: 'activity' }, [
        el('div', { class: 'act-art' }, assets?.large_image
          ? [el('img', { src: assetUrl(application_id, assets.large_image, 128), alt: 'large' })]
          : []),
        el('div', { class: 'act-meta' }, [
          el('div', { class: 'act-name' }, name || 'Activity'),
          details && el('div', { class: 'act-details' }, details),
          state && el('div', { class: 'act-details' }, state),
          start && el('div', { class: 'act-timestamp' }, `Playing for ${elapsed}`)
        ])
      ]);
      block.appendChild(actNode);
    }
  } else {
    block.appendChild(el('div', { class: 'muted' }, 'No active activity'));
  }
}
const music = document.getElementById('bgMusic');
const musicBtn = document.getElementById('musicToggle');
music.volume = 0;
let fading = false;
function fadeInMusic(target = 0.6, duration = 2000) {
  if (fading) return;
  fading = true;
  const step = 50;
  const increment = target / (duration / step);
  const fade = setInterval(() => {
    if (music.volume < target) {
      music.volume = Math.min(music.volume + increment, target);
    } else {
      clearInterval(fade);
      fading = false;
    }
  }, step);
}
function playMusic() {
  music.play().then(() => {
    fadeInMusic();
    musicBtn.classList.add('active');
    musicBtn.textContent = '🔊';
  }).catch(() => {
    console.warn('Autoplay blocked, waiting for interaction...');
  });
}
window.addEventListener('DOMContentLoaded', () => {
  playMusic();
  showStaticQuote();
  fetchLanyard();
  setInterval(fetchLanyard, POLL_INTERVAL);
});
const resumeAudio = () => {
  if (music.paused) playMusic();
  document.removeEventListener('click', resumeAudio);
  document.removeEventListener('keydown', resumeAudio);
};
document.addEventListener('click', resumeAudio);
document.addEventListener('keydown', resumeAudio);
musicBtn.addEventListener('click', () => {
  if (music.paused) {
    playMusic();
  } else {
    music.pause();
    musicBtn.classList.remove('active');
    musicBtn.textContent = '🔇';
  }
});

