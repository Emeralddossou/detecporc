/* admin.js - DETECPORC
 * Gestion simple de la base des points de vente.
 */

const loginPanel = document.getElementById('login-panel');
const adminPanel = document.getElementById('admin-panel');
const loginForm = document.getElementById('login-form');
const loginError = document.getElementById('login-error');
const logoutBtn = document.getElementById('btn-logout');
const refreshBtn = document.getElementById('btn-refresh');
const searchInput = document.getElementById('search-input');
const pointsList = document.getElementById('points-list');
const pendingList = document.getElementById('pending-list');
const formStatus = document.getElementById('form-status');
const adminMapEl = document.getElementById('admin-map');
const adminAutoBtn = document.getElementById('admin-auto');
const adminMapBtn = document.getElementById('admin-map-btn');
const adminManualBtn = document.getElementById('admin-manual');
const adminStatus = document.getElementById('admin-status');

const form = {
  id: document.getElementById('point-id'),
  name: document.getElementById('point-name'),
  address: document.getElementById('point-address'),
  phone: document.getElementById('point-phone'),
  hours: document.getElementById('point-hours'),
  lat: document.getElementById('point-lat'),
  lng: document.getElementById('point-lng'),
  comment: document.getElementById('point-comment')
};

let points = [];
let pending = [];
let adminMap;
let adminMarker;
let mapPickActive = false;

function showAdmin() {
  loginPanel.classList.add('hidden');
  adminPanel.classList.remove('hidden');
  initAdminMap();
  startAdminAutoLocation();
}

function showLogin() {
  loginPanel.classList.remove('hidden');
  adminPanel.classList.add('hidden');
}

async function apiRequest(url, options = {}) {
  const response = await fetch(url, {
    headers: { 'Content-Type': 'application/json' },
    credentials: 'same-origin',
    ...options
  });

  const payload = await response.json();
  if (!response.ok || !payload.ok) {
    const message = payload.error || 'Erreur serveur.';
    throw new Error(message);
  }
  return payload;
}

async function login(username, password) {
  await apiRequest('/api/login', {
    method: 'POST',
    body: JSON.stringify({ username, password })
  });
  showAdmin();
  await loadPoints();
}

async function logout() {
  await apiRequest('/api/logout', { method: 'POST' });
  showLogin();
}

async function loadPoints() {
  formStatus.textContent = 'Chargement des points...';
  const payload = await apiRequest('/api/admin/points');
  points = payload.points || [];
  formStatus.textContent = '';
  renderPoints();
  await loadPending();
}

async function loadPending() {
  const payload = await apiRequest('/api/admin/pending');
  pending = payload.pending || [];
  renderPending();
}

function renderPoints() {
  const query = searchInput.value.trim().toLowerCase();
  const list = query
    ? points.filter((p) => `${p.nom} ${p.adresse || ''}`.toLowerCase().includes(query))
    : points;

  pointsList.innerHTML = '';

  if (!list.length) {
    pointsList.innerHTML = '<div class="text-muted small">Aucun point trouve.</div>';
    return;
  }

  list.forEach((point) => {
    const card = document.createElement('div');
    card.className = 'point-card';

    card.innerHTML = `
      <h3>${point.nom}</h3>
      <div class="point-meta">${point.adresse || 'Adresse non renseignee'}</div>
      <div class="point-meta">${point.telephone || 'Telephone non renseigne'}</div>
      <div class="point-meta">${point.horaires || 'Horaires non renseignes'}</div>
      <div class="point-meta">${point.lat.toFixed(5)}, ${point.lng.toFixed(5)}</div>
      <div class="point-meta">${point.commentaire || ''}</div>
      <div class="point-actions">
        <button class="btn btn-sm btn-outline-secondary" data-action="edit" data-id="${point.id}">Modifier</button>
        <button class="btn btn-sm btn-outline-danger" data-action="delete" data-id="${point.id}">Supprimer</button>
      </div>
    `;

    pointsList.appendChild(card);
  });
}

function renderPending() {
  pendingList.innerHTML = '';
  if (!pending.length) {
    pendingList.innerHTML = '<div class="text-muted small">Aucune proposition en attente.</div>';
    return;
  }

  pending.forEach((point) => {
    const card = document.createElement('div');
    card.className = 'point-card';
    card.innerHTML = `
      <h3>${point.nom}</h3>
      <div class="point-meta">${point.adresse || 'Adresse non renseignee'}</div>
      <div class="point-meta">${point.telephone || 'Telephone non renseigne'}</div>
      <div class="point-meta">${point.horaires || 'Horaires non renseignes'}</div>
      <div class="point-meta">${point.lat.toFixed(5)}, ${point.lng.toFixed(5)}</div>
      <div class="point-meta">${point.commentaire || ''}</div>
      <div class="point-actions">
        <button class="btn btn-sm btn-success" data-action="approve" data-id="${point.id}">Valider</button>
        <button class="btn btn-sm btn-outline-danger" data-action="reject" data-id="${point.id}">Refuser</button>
      </div>
    `;
    pendingList.appendChild(card);
  });
}

function initAdminMap() {
  if (!adminMapEl || adminMap) return;
  adminMap = L.map('admin-map', { zoomControl: true }).setView([6.4969, 2.6036], 13);
  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    maxZoom: 19,
    attribution: '&copy; OpenStreetMap contributors'
  }).addTo(adminMap);

  adminMap.on('click', (event) => {
    if (!mapPickActive) return;
    applyAdminLocation(event.latlng.lat, event.latlng.lng, 'Carte');
    setAdminMapPick(false);
  });
}

function applyAdminLocation(lat, lng, source) {
  form.lat.value = Number(lat).toFixed(5);
  form.lng.value = Number(lng).toFixed(5);
  adminStatus.textContent = `Localisation ${source.toLowerCase()} appliquee.`;

  if (adminMarker) adminMap.removeLayer(adminMarker);
  if (adminMap) {
    adminMarker = L.marker([lat, lng]).addTo(adminMap);
    adminMap.setView([lat, lng], 14);
  }
}

function setAdminMapPick(active) {
  mapPickActive = active;
  if (!adminMapEl) return;
  if (active) {
    adminMapEl.classList.add('map-pick');
    adminStatus.textContent = 'Clique sur la carte pour choisir la localisation.';
  } else {
    adminMapEl.classList.remove('map-pick');
  }
}

function startAdminAutoLocation() {
  if (!navigator.geolocation) {
    adminStatus.textContent = 'Geolocalisation non supportee. Choisis sur la carte ou saisis manuellement.';
    return;
  }

  adminStatus.textContent = 'Localisation automatique en cours...';
  navigator.geolocation.getCurrentPosition(
    (pos) => {
      applyAdminLocation(pos.coords.latitude, pos.coords.longitude, 'automatique');
    },
    () => {
      adminStatus.textContent = 'Localisation automatique indisponible. Choisis sur la carte ou saisis manuellement.';
    },
    {
      enableHighAccuracy: true,
      timeout: 10000,
      maximumAge: 30 * 1000
    }
  );
}

function resetForm() {
  form.id.value = '';
  form.name.value = '';
  form.address.value = '';
  form.phone.value = '';
  form.hours.value = '';
  form.lat.value = '';
  form.lng.value = '';
  form.comment.value = '';
  formStatus.textContent = '';
  startAdminAutoLocation();
}

function fillForm(point) {
  form.id.value = point.id;
  form.name.value = point.nom;
  form.address.value = point.adresse || '';
  form.phone.value = point.telephone || '';
  form.hours.value = point.horaires || '';
  form.lat.value = point.lat;
  form.lng.value = point.lng;
  form.comment.value = point.commentaire || '';
  applyAdminLocation(point.lat, point.lng, 'choisie');
}

async function savePoint(event) {
  event.preventDefault();
  formStatus.textContent = '';

  const payload = {
    nom: form.name.value.trim(),
    adresse: form.address.value.trim(),
    telephone: form.phone.value.trim(),
    horaires: form.hours.value.trim(),
    lat: Number(form.lat.value),
    lng: Number(form.lng.value),
    commentaire: form.comment.value.trim()
  };

  if (!payload.nom) {
    formStatus.textContent = 'Le nom est obligatoire.';
    return;
  }

  try {
    if (form.id.value) {
      await apiRequest(`/api/admin/points/${form.id.value}`, {
        method: 'PUT',
        body: JSON.stringify(payload)
      });
      formStatus.textContent = 'Point modifie avec succes.';
    } else {
      await apiRequest('/api/admin/points', {
        method: 'POST',
        body: JSON.stringify(payload)
      });
      formStatus.textContent = 'Point ajoute avec succes.';
    }

    resetForm();
    await loadPoints();
  } catch (error) {
    formStatus.textContent = error.message;
  }
}

async function deletePoint(id) {
  if (!confirm('Supprimer ce point definitivement ?')) return;
  await apiRequest(`/api/admin/points/${id}`, { method: 'DELETE' });
  await loadPoints();
}

async function approvePending(id) {
  await apiRequest(`/api/admin/pending/${id}/approve`, { method: 'POST' });
  await loadPoints();
}

async function rejectPending(id) {
  if (!confirm('Refuser cette proposition ?')) return;
  await apiRequest(`/api/admin/pending/${id}`, { method: 'DELETE' });
  await loadPoints();
}

loginForm.addEventListener('submit', async (event) => {
  event.preventDefault();
  loginError.textContent = '';

  const username = document.getElementById('login-user').value.trim();
  const password = document.getElementById('login-pass').value.trim();

  try {
    await login(username, password);
  } catch (error) {
    loginError.textContent = error.message;
  }
});

logoutBtn.addEventListener('click', async () => {
  await logout();
});

refreshBtn.addEventListener('click', loadPoints);
searchInput.addEventListener('input', renderPoints);
adminAutoBtn.addEventListener('click', startAdminAutoLocation);
adminMapBtn.addEventListener('click', () => setAdminMapPick(true));
adminManualBtn.addEventListener('click', () => form.lat.focus());

document.getElementById('point-form').addEventListener('submit', savePoint);
document.getElementById('btn-reset').addEventListener('click', resetForm);

pointsList.addEventListener('click', (event) => {
  const target = event.target;
  if (!(target instanceof HTMLButtonElement)) return;

  const id = target.dataset.id;
  if (!id) return;

  if (target.dataset.action === 'edit') {
    const point = points.find((p) => p.id === Number(id));
    if (point) fillForm(point);
  }

  if (target.dataset.action === 'delete') {
    deletePoint(id).catch((error) => {
      alert(error.message);
    });
  }
});

pendingList.addEventListener('click', (event) => {
  const target = event.target;
  if (!(target instanceof HTMLButtonElement)) return;
  const id = target.dataset.id;
  if (!id) return;

  if (target.dataset.action === 'approve') {
    approvePending(id).catch((error) => alert(error.message));
  }

  if (target.dataset.action === 'reject') {
    rejectPending(id).catch((error) => alert(error.message));
  }
});

document.addEventListener('keydown', (event) => {
  if (event.key === 'Escape' && mapPickActive) {
    setAdminMapPick(false);
  }
});

(async function boot() {
  try {
    await loadPoints();
    showAdmin();
  } catch (error) {
    showLogin();
  }
})();
