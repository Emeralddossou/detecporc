
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

const elements = {
  results: document.getElementById('results'),
  status: document.getElementById('user-status'),
  coords: document.getElementById('user-coords'),
  statTotal: document.getElementById('stat-total'),
  statNearest: document.getElementById('stat-nearest'),
  statNearestName: document.getElementById('stat-nearest-name'),
  mapStatus: document.getElementById('map-status'),
  filterSearch: document.getElementById('filter-search'),
  filterDistance: document.getElementById('filter-distance')
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

function initMap() {
  const center = [6.4969, 2.6036];
  map = L.map('map', { zoomControl: true }).setView(center, 13);

  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    maxZoom: 19,
    attribution: '&copy; OpenStreetMap contributors'
  }).addTo(map);

  markersLayer = L.layerGroup().addTo(map);
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

      const comment = document.createElement('div');
      comment.className = 'place-meta';
      comment.textContent = item.commentaire || '';

      card.appendChild(title);
      card.appendChild(meta);
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
  if (!navigator.geolocation) {
    alert('Geolocalisation non supportee par ton navigateur.');
    return;
  }

  elements.status.textContent = 'Recherche de la position...';

  navigator.geolocation.getCurrentPosition(
    (pos) => {
      userPosition = { lat: pos.coords.latitude, lng: pos.coords.longitude };
      updateUI();
    },
    (err) => {
      console.error('Erreur geoloc:', err);
      if (err.code === 1) {
        elements.status.textContent = 'Acces refuse a la localisation.';
        alert('Tu as refuse le partage de position. Tu peux saisir manuellement tes coordonnees.');
      } else if (err.code === 2) {
        elements.status.textContent = 'Position introuvable.';
        alert('Impossible de determiner la position.');
      } else {
        elements.status.textContent = 'Erreur de localisation.';
        alert('Erreur lors de la recuperation de la position.');
      }
      updateUI();
    },
    {
      enableHighAccuracy: true,
      timeout: 10000,
      maximumAge: 30 * 1000
    }
  );
}

function setupUI() {
  document.getElementById('btn-get').addEventListener('click', requestGeolocation);

  document.getElementById('btn-refresh').addEventListener('click', () => {
    if (userPosition) {
      updateUI();
    } else {
      requestGeolocation();
    }
  });

  document.getElementById('btn-show-all').addEventListener('click', () => {
    if (!points.length) return;
    const lats = points.map((p) => p.lat);
    const lngs = points.map((p) => p.lng);
    const bounds = L.latLngBounds([
      [Math.min(...lats), Math.min(...lngs)],
      [Math.max(...lats), Math.max(...lngs)]
    ]);
    map.fitBounds(bounds.pad(0.2));
  });

  document.getElementById('btn-manual').addEventListener('click', () => {
    const lat = parseFloat(prompt('Saisis la latitude (ex: 6.4969) :'));
    if (Number.isNaN(lat)) return;
    const lng = parseFloat(prompt('Saisis la longitude (ex: 2.6036) :'));
    if (Number.isNaN(lng)) return;
    userPosition = { lat, lng };
    updateUI();
  });

  elements.filterSearch.addEventListener('input', updateUI);
  elements.filterDistance.addEventListener('input', updateUI);
}

(function main() {
  initMap();
  setupUI();
  fetchPoints();
  requestGeolocation();
})();

