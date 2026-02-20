
/* app.js - DETECPORC
 *
 * Frontend interactif :
 * - recupere les points via l'API
 * - calcule les distances depuis la position utilisateur
 * - affiche la carte Leaflet + liste filtrable
 */

let points = [];
let userPosition = null;
let map;
let userMarker;
let markersLayer;
let mapPickTarget = null;
let suggestDraft = null;

const elements = {
  results: document.getElementById('results'),
  status: document.getElementById('user-status'),
  coords: document.getElementById('user-coords'),
  statTotal: document.getElementById('stat-total'),
  statNearest: document.getElementById('stat-nearest'),
  statNearestName: document.getElementById('stat-nearest-name'),
  mapStatus: document.getElementById('map-status'),
  filterSearch: document.getElementById('filter-search'),
  filterDistance: document.getElementById('filter-distance'),
  coordModal: document.getElementById('coord-modal'),
  coordForm: document.getElementById('coord-form'),
  coordLat: document.getElementById('coord-lat'),
  coordLng: document.getElementById('coord-lng'),
  coordError: document.getElementById('coord-error'),
  coordCancel: document.getElementById('coord-cancel'),
  coordStatus: document.getElementById('coord-status'),
  coordAuto: document.getElementById('coord-auto'),
  coordMap: document.getElementById('coord-map'),
  coordManual: document.getElementById('coord-manual'),
  suggestModal: document.getElementById('suggest-modal'),
  suggestForm: document.getElementById('suggest-form'),
  suggestName: document.getElementById('suggest-name'),
  suggestAddress: document.getElementById('suggest-address'),
  suggestPhone: document.getElementById('suggest-phone'),
  suggestHours: document.getElementById('suggest-hours'),
  suggestLat: document.getElementById('suggest-lat'),
  suggestLng: document.getElementById('suggest-lng'),
  suggestComment: document.getElementById('suggest-comment'),
  suggestError: document.getElementById('suggest-error'),
  suggestCancel: document.getElementById('suggest-cancel'),
  suggestAuto: document.getElementById('suggest-auto'),
  suggestMap: document.getElementById('suggest-map'),
  suggestManual: document.getElementById('suggest-manual'),
  suggestStatus: document.getElementById('suggest-status'),
  btnSuggest: document.getElementById('btn-suggest')
};

function toRad(deg) {
  return (deg * Math.PI) / 180;
}

function haversineDistance(lat1, lon1, lat2, lon2) {
  const R = 6371000;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

function formatDistance(meters) {
  if (meters == null) return '-';
  if (meters < 1000) return `${Math.round(meters)} m`;
  return `${(meters / 1000).toFixed(2)} km`;
}

function formatDuration(minutes) {
  if (!Number.isFinite(minutes)) return '-';
  if (minutes < 60) return `${Math.round(minutes)} min`;
  const hours = Math.floor(minutes / 60);
  const remain = Math.round(minutes % 60);
  return `${hours} h ${remain} min`;
}

function estimateTravel(distanceMeters) {
  if (distanceMeters == null) return { walk: '-', moto: '-' };
  const walkMinutes = distanceMeters / 1000 / 5 * 60;
  const motoMinutes = distanceMeters / 1000 / 25 * 60;
  return {
    walk: formatDuration(walkMinutes),
    moto: formatDuration(motoMinutes)
  };
}

function setMapPickMode(target) {
  mapPickTarget = target;
  const mapEl = document.getElementById('map');
  if (!mapEl) return;
  if (target) {
    mapEl.classList.add('map-pick');
    elements.mapStatus.textContent = 'Clique sur la carte pour choisir la localisation.';
  } else {
    mapEl.classList.remove('map-pick');
    elements.mapStatus.textContent = 'Carte chargee';
  }
}

function applyPickedLocation(target, lat, lng) {
  if (target === 'user') {
    userPosition = { lat, lng };
    elements.coordLat.value = lat.toFixed(5);
    elements.coordLng.value = lng.toFixed(5);
    elements.coordStatus.textContent = 'Localisation choisie sur la carte.';
    closeCoordModal();
    updateUI();
  }

  if (target === 'suggest') {
    if (suggestDraft) {
      suggestDraft.lat = lat.toFixed(5);
      suggestDraft.lng = lng.toFixed(5);
      openSuggestModal();
    } else {
      elements.suggestLat.value = lat.toFixed(5);
      elements.suggestLng.value = lng.toFixed(5);
    }
    elements.suggestStatus.textContent = 'Localisation choisie sur la carte.';
  }
}

function startAutoLocation(target) {
  if (!navigator.geolocation) {
    handleLocationFailure(target, 'Geolocalisation non supportee.');
    return;
  }

  if (target === 'user') {
    elements.status.textContent = 'Recherche de la position...';
    elements.coordStatus.textContent = 'Recherche automatique en cours...';
  }

  if (target === 'suggest') {
    elements.suggestStatus.textContent = 'Recherche automatique en cours...';
  }

  navigator.geolocation.getCurrentPosition(
    (pos) => {
      const lat = pos.coords.latitude;
      const lng = pos.coords.longitude;
      if (target === 'user') {
        userPosition = { lat, lng };
        elements.coordLat.value = lat.toFixed(5);
        elements.coordLng.value = lng.toFixed(5);
        elements.coordStatus.textContent = 'Localisation automatique reussie.';
        closeCoordModal();
        updateUI();
        return;
      }

      if (target === 'suggest') {
        elements.suggestLat.value = lat.toFixed(5);
        elements.suggestLng.value = lng.toFixed(5);
        elements.suggestStatus.textContent = 'Localisation automatique reussie.';
      }
    },
    (err) => {
      console.error('Erreur geoloc:', err);
      handleLocationFailure(target, 'Localisation automatique indisponible.');
    },
    {
      enableHighAccuracy: true,
      timeout: 10000,
      maximumAge: 30 * 1000
    }
  );
}

function handleLocationFailure(target, message) {
  if (target === 'user') {
    elements.status.textContent = message;
    elements.coordStatus.textContent = `${message} Choisis sur la carte ou saisis manuellement.`;
    openCoordModal();
  }

  if (target === 'suggest') {
    elements.suggestStatus.textContent = `${message} Choisis sur la carte ou saisis manuellement.`;
  }
}

function openCoordModal() {
  elements.coordError.textContent = '';
  elements.coordModal.classList.add('is-open');
  elements.coordModal.setAttribute('aria-hidden', 'false');
}

function closeCoordModal() {
  elements.coordModal.classList.remove('is-open');
  elements.coordModal.setAttribute('aria-hidden', 'true');
}

function openSuggestModal() {
  elements.suggestError.textContent = '';
  if (!suggestDraft) {
    elements.suggestForm.reset();
  } else {
    elements.suggestName.value = suggestDraft.nom;
    elements.suggestAddress.value = suggestDraft.adresse;
    elements.suggestPhone.value = suggestDraft.telephone;
    elements.suggestHours.value = suggestDraft.horaires;
    elements.suggestLat.value = suggestDraft.lat;
    elements.suggestLng.value = suggestDraft.lng;
    elements.suggestComment.value = suggestDraft.commentaire;
  }
  elements.suggestStatus.textContent = 'Localisation automatique en cours...';
  elements.suggestModal.classList.add('is-open');
  elements.suggestModal.setAttribute('aria-hidden', 'false');
  elements.suggestName.focus();
  if (!suggestDraft) {
    startAutoLocation('suggest');
  }
}

function closeSuggestModal() {
  elements.suggestModal.classList.remove('is-open');
  elements.suggestModal.setAttribute('aria-hidden', 'true');
}

function stashSuggestForm() {
  suggestDraft = {
    nom: elements.suggestName.value.trim(),
    adresse: elements.suggestAddress.value.trim(),
    telephone: elements.suggestPhone.value.trim(),
    horaires: elements.suggestHours.value.trim(),
    lat: elements.suggestLat.value,
    lng: elements.suggestLng.value,
    commentaire: elements.suggestComment.value.trim()
  };
}

function clearSuggestDraft() {
  suggestDraft = null;
}

function initMap() {
  const center = [6.4969, 2.6036];
  map = L.map('map', { zoomControl: true }).setView(center, 13);

  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    maxZoom: 19,
    attribution: '&copy; OpenStreetMap contributors'
  }).addTo(map);

  markersLayer = L.layerGroup().addTo(map);

  map.on('click', (event) => {
    if (!mapPickTarget) return;
    const { lat, lng } = event.latlng;
    applyPickedLocation(mapPickTarget, lat, lng);
    setMapPickMode(null);
  });
}

async function fetchPoints() {
  elements.results.innerHTML = '<div class="text-muted small">Chargement des points de vente...</div>';
  try {
    const response = await fetch('/api/points');
    const payload = await response.json();
    if (!payload.ok) {
      throw new Error(payload.error || 'Erreur inconnue');
    }
    points = payload.points || [];
    elements.statTotal.textContent = points.length.toString();
    elements.mapStatus.textContent = 'Carte chargee';
    updateUI();
  } catch (error) {
    console.error('Erreur chargement points:', error);
    elements.results.innerHTML = '<div class="text-danger small">Impossible de charger les points. Reessaie plus tard.</div>';
    elements.mapStatus.textContent = 'Erreur de chargement';
  }
}
function enrichPoints() {
  return points.map((p) => {
    const distance = userPosition
      ? haversineDistance(userPosition.lat, userPosition.lng, p.lat, p.lng)
      : null;
    return { ...p, distance };
  });
}

function applyFilters(list) {
  const query = elements.filterSearch.value.trim().toLowerCase();
  const maxDistanceKm = parseFloat(elements.filterDistance.value);

  return list.filter((p) => {
    const content = `${p.nom} ${p.adresse || ''} ${p.commentaire || ''}`.toLowerCase();
    const matchQuery = query ? content.includes(query) : true;
    const matchDistance = Number.isFinite(maxDistanceKm)
      ? p.distance != null && p.distance <= maxDistanceKm * 1000
      : true;
    return matchQuery && matchDistance;
  });
}

function updateStats(enriched) {
  if (!userPosition || enriched.length === 0) {
    elements.statNearest.textContent = '-';
    elements.statNearestName.textContent = '-';
    return;
  }

  const nearest = enriched.slice().sort((a, b) => a.distance - b.distance)[0];
  elements.statNearest.textContent = formatDistance(nearest.distance);
  elements.statNearestName.textContent = nearest.nom;
}

function updateMapMarkers(list) {
  markersLayer.clearLayers();

  list.forEach((item) => {
    const eta = estimateTravel(item.distance);
    const marker = L.marker([item.lat, item.lng], {
      customId: item.id
    }).addTo(markersLayer);

    const popupHtml = `
      <div style="min-width:180px">
        <div style="font-weight:700">${item.nom}</div>
        <div style="margin-top:4px" class="small">${item.adresse || ''}</div>
        <div style="margin-top:4px" class="small">${item.telephone || ''}</div>
        <div style="margin-top:6px; font-weight:600; color:#6b3f2b">
          ${formatDistance(item.distance)}
        </div>
        <div style="margin-top:4px" class="small">
          Marche: ${eta.walk} · Moto: ${eta.moto}
        </div>
      </div>
    `;

    marker.bindPopup(popupHtml);
  });

  if (userPosition) {
    if (userMarker) map.removeLayer(userMarker);
    userMarker = L.circleMarker([userPosition.lat, userPosition.lng], {
      radius: 8,
      color: '#fff',
      fillColor: '#d1603d',
      fillOpacity: 1,
      weight: 2
    }).addTo(map).bindPopup(
      `<b>Vous etes ici</b><div class="small">${userPosition.lat.toFixed(5)}, ${userPosition.lng.toFixed(5)}</div>`
    );
  }
}

function updateBounds(list) {
  if (!list.length) {
    if (userPosition) {
      map.setView([userPosition.lat, userPosition.lng], 14);
    }
    return;
  }
  const latLngs = list.map((p) => [p.lat, p.lng]);
  if (userPosition) {
    latLngs.push([userPosition.lat, userPosition.lng]);
  }
  const bounds = L.latLngBounds(latLngs);
  map.fitBounds(bounds.pad(0.2));
}

function updateUI() {
  const enriched = enrichPoints();
  const filtered = applyFilters(enriched);

  elements.results.innerHTML = '';

  if (!filtered.length) {
    elements.results.innerHTML = '<div class="text-muted small">Aucun resultat avec ces filtres.</div>';
  }

  filtered
    .sort((a, b) => {
      if (a.distance == null || b.distance == null) return 0;
      return a.distance - b.distance;
    })
    .forEach((item) => {
      const eta = estimateTravel(item.distance);
      const card = document.createElement('div');
      card.className = 'place-card';
      card.setAttribute('role', 'listitem');
      card.tabIndex = 0;

      const title = document.createElement('div');
      title.className = 'place-title';
      title.innerHTML = `
        <span>${item.nom}</span>
        <span class="distance-pill">${formatDistance(item.distance)}</span>
      `;

      const meta = document.createElement('div');
      meta.className = 'place-meta';
      meta.innerHTML = `
        <div><i class="bi bi-geo-alt"></i> ${item.adresse || 'Adresse non renseignee'}</div>
        <div><i class="bi bi-telephone"></i> ${item.telephone || 'Telephone non renseigne'}</div>
        <div><i class="bi bi-clock"></i> ${item.horaires || 'Horaires non renseignes'}</div>
      `;

      const travel = document.createElement('div');
      travel.className = 'place-meta';
      travel.textContent = `Marche: ${eta.walk} · Moto: ${eta.moto}`;

      const comment = document.createElement('div');
      comment.className = 'place-meta';
      comment.textContent = item.commentaire || '';

      card.appendChild(title);
      card.appendChild(meta);
      card.appendChild(travel);
      if (item.commentaire) card.appendChild(comment);

      card.addEventListener('click', () => {
        map.setView([item.lat, item.lng], 16, { animate: true });
        markersLayer.eachLayer((mk) => {
          if (mk.options && mk.options.customId === item.id) {
            mk.openPopup();
          }
        });
      });

      card.addEventListener('keydown', (event) => {
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault();
          card.click();
        }
      });

      elements.results.appendChild(card);
    });

  updateStats(enriched);
  updateMapMarkers(filtered.length ? filtered : enriched);
  updateBounds(filtered.length ? filtered : enriched);

  if (userPosition) {
    elements.coords.textContent = `${userPosition.lat.toFixed(5)}, ${userPosition.lng.toFixed(5)}`;
    elements.status.textContent = 'Localisation active';
  } else {
    elements.coords.textContent = 'Inconnue';
    elements.status.textContent = 'Active la localisation pour plus de precision.';
  }
}
function requestGeolocation() {
  startAutoLocation('user');
}

function setupUI() {
  document.getElementById('btn-get').addEventListener('click', () => {
    startAutoLocation('user');
  });

  document.getElementById('btn-refresh').addEventListener('click', () => {
    if (userPosition) {
      updateUI();
    } else {
      requestGeolocation();
    }
  });

  document.getElementById('btn-show-all').addEventListener('click', () => {
    if (!points.length) return;
    elements.filterSearch.value = '';
    elements.filterDistance.value = '';
    updateUI();
    updateBounds(points);
  });

  document.getElementById('btn-manual').addEventListener('click', () => {
    elements.coordForm.reset();
    elements.coordStatus.textContent = 'Localisation automatique en cours...';
    openCoordModal();
    startAutoLocation('user');
    elements.coordLat.focus();
  });

  elements.btnSuggest.addEventListener('click', () => {
    clearSuggestDraft();
    openSuggestModal();
  });

  elements.filterSearch.addEventListener('input', updateUI);
  elements.filterDistance.addEventListener('input', updateUI);

  elements.coordCancel.addEventListener('click', () => {
    closeCoordModal();
  });

  elements.coordModal.addEventListener('click', (event) => {
    if (event.target === elements.coordModal) {
      closeCoordModal();
    }
  });

  elements.coordForm.addEventListener('submit', (event) => {
    event.preventDefault();
    const lat = parseFloat(elements.coordLat.value);
    const lng = parseFloat(elements.coordLng.value);
    if (Number.isNaN(lat) || Number.isNaN(lng)) {
      elements.coordError.textContent = 'Coordonnees invalides. Verifie les valeurs.';
      return;
    }
    userPosition = { lat, lng };
    closeCoordModal();
    updateUI();
  });

  elements.coordAuto.addEventListener('click', () => {
    startAutoLocation('user');
  });

  elements.coordMap.addEventListener('click', () => {
    closeCoordModal();
    setMapPickMode('user');
  });

  elements.coordManual.addEventListener('click', () => {
    elements.coordLat.focus();
  });

  elements.suggestCancel.addEventListener('click', () => {
    clearSuggestDraft();
    closeSuggestModal();
  });

  elements.suggestModal.addEventListener('click', (event) => {
    if (event.target === elements.suggestModal) {
      clearSuggestDraft();
      closeSuggestModal();
    }
  });

  elements.suggestAuto.addEventListener('click', () => {
    startAutoLocation('suggest');
  });

  elements.suggestMap.addEventListener('click', () => {
    stashSuggestForm();
    closeSuggestModal();
    setMapPickMode('suggest');
  });

  elements.suggestManual.addEventListener('click', () => {
    elements.suggestLat.focus();
  });

  elements.suggestForm.addEventListener('submit', async (event) => {
    event.preventDefault();
    elements.suggestError.textContent = '';
    const lat = parseFloat(elements.suggestLat.value);
    const lng = parseFloat(elements.suggestLng.value);
    if (!elements.suggestName.value.trim()) {
      elements.suggestError.textContent = 'Le nom est obligatoire.';
      return;
    }
    if (Number.isNaN(lat) || Number.isNaN(lng)) {
      elements.suggestError.textContent = 'Coordonnees invalides.';
      return;
    }

    try {
      const response = await fetch('/api/suggest', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          nom: elements.suggestName.value.trim(),
          adresse: elements.suggestAddress.value.trim(),
          telephone: elements.suggestPhone.value.trim(),
          horaires: elements.suggestHours.value.trim(),
          lat,
          lng,
          commentaire: elements.suggestComment.value.trim()
        })
      });
      const payload = await response.json();
      if (!response.ok || !payload.ok) {
        throw new Error(payload.error || 'Erreur lors de lenvoi.');
      }
      clearSuggestDraft();
      closeSuggestModal();
      alert('Merci ! Ta proposition a ete envoyee pour validation.');
    } catch (error) {
      elements.suggestError.textContent = error.message;
    }
  });

  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape' && elements.coordModal.classList.contains('is-open')) {
      closeCoordModal();
    }
    if (event.key === 'Escape' && elements.suggestModal.classList.contains('is-open')) {
      clearSuggestDraft();
      closeSuggestModal();
    }
    if (event.key === 'Escape' && mapPickTarget) {
      setMapPickMode(null);
    }
  });
}

(function main() {
  initMap();
  setupUI();
  fetchPoints();
  requestGeolocation();
})();

