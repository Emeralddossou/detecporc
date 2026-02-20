/* app.js - DETECPORC
 *
 * Full-frontend : récupère la position utilisateur (Geolocation),
 * calcule les distances vers les points dans DATA et affiche:
 *  - une carte Leaflet avec marqueurs
 *  - une liste triée par proximité
 *
 * Pour ajouter un point: ajoute un objet dans DATA au format:
 * { id, nom, lat, lng, commentaire }
 *
 * Bonnes pratiques: variables explicites, fonctions pures, commentaires.
 */

/* ---------------------------
   DONNÉES (à modifier / compléter)
   ---------------------------
   10 exemples de points de vente (Porto-Novo et environs).
   Remplace / ajoute des éléments selon besoin.
*/
const DATA = [
  { id: 1, nom: "Boucherie Porc d'Or", lat: 6.4969, lng: 2.6036, commentaire: "Boucherie traditionnelle, porc frais chaque matin." },
  { id: 2, nom: "Porc & Co - Marché Central", lat: 6.4979, lng: 2.6065, commentaire: "Stand N°B12, marinades maison." },
  { id: 3, nom: "Chez Mama Porc", lat: 6.4935, lng: 2.6001, commentaire: "Vente à emporter, portions prêtes." },
  { id: 4, nom: "Le Charcutier Porto", lat: 6.5020, lng: 2.6100, commentaire: "Charcuterie sèche et saucisses." },
  { id: 5, nom: "Marché Akpakpa - Porc", lat: 6.4900, lng: 2.5980, commentaire: "Petit prix, service rapide." },
  { id: 6, nom: "Boucherie Moderne", lat: 6.5050, lng: 2.5950, commentaire: "Hygiène contrôlée." },
  { id: 7, nom: "Porc Express", lat: 6.5100, lng: 2.6070, commentaire: "Livraison locale possible." },
  { id: 8, nom: "Maison du Porc", lat: 6.4878, lng: 2.6122, commentaire: "Préparations fumées." },
  { id: 9, nom: "Le Coin des Cochons", lat: 6.4990, lng: 2.5930, commentaire: "Rabais le week-end." },
  { id: 10, nom: "Stand Porc du Port", lat: 6.5035, lng: 2.5995, commentaire: "Fraîcheur du jour garantie." }
];

/* ---------------------------
   CONSTANTES ET UTILITAIRES
   --------------------------- */

/**
 * Convertit degrés en radians.
 * @param {number} deg
 * @returns {number}
 */
function toRad(deg){ return deg * Math.PI / 180; }

/**
 * Calcul de la distance (mètres) entre deux coordonnées (lat/lng)
 * Haversine formula — retourne la distance en mètres.
 */
function haversineDistance(lat1, lon1, lat2, lon2){
  const R = 6371000; // rayon de la terre en mètres
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
            Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) *
            Math.sin(dLon/2) * Math.sin(dLon/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  return R * c;
}

/**
 * Formatte la distance pour affichage.
 * Si < 1000 m => mètres (arrondi), sinon km avec 2 déc.
 */
function formatDistance(m){
  if(m < 1000) return `${Math.round(m)} m`;
  return `${(m/1000).toFixed(2)} km`;
}

/* ---------------------------
   STATE (simple, front-only)
   --------------------------- */
let userPosition = null; // {lat, lng}
let map, userMarker, markersLayer;

/* ---------------------------
   INITIALISATION DE LA CARTE
   --------------------------- */
function initMap(){
  // centre par défaut : Porto-Novo approx
  const center = [6.4969, 2.6036];

  map = L.map('map', { zoomControl: true }).setView(center, 13);

  // couche OpenStreetMap (pas de clé API)
  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    maxZoom: 19,
    attribution: '&copy; OpenStreetMap contributors'
  }).addTo(map);

  // couche pour marqueurs de points de vente
  markersLayer = L.layerGroup().addTo(map);
}

/* ---------------------------
   AFFICHAGE DES POINTS ET LISTE
   --------------------------- */

/**
 * Met à jour la carte et la liste en fonction de userPosition.
 * Si userPosition est null, affiche tous les points sans distances.
 */
function updateUI(){
  const resultsEl = document.getElementById('results');
  resultsEl.innerHTML = '';

  // clear markers
  markersLayer.clearLayers();

  // si on a la position utilisateur, on calcule la distance pour chaque point
  let enriched = DATA.map(p => {
    let dist = null;
    if(userPosition){
      dist = haversineDistance(userPosition.lat, userPosition.lng, p.lat, p.lng);
    }
    return { ...p, distance: dist };
  });

  // tri par distance si possible
  if(userPosition){
    enriched.sort((a,b) => a.distance - b.distance);
    document.getElementById('user-status').textContent = `Localisé • ${formatDistance( enriched[0]?.distance ?? 0 )} jusqu'au premier point`;
  } else {
    document.getElementById('user-status').textContent = 'Position non partagée';
  }

  // afficher un certain nombre (top 5) — tu peux changer ce nombre
  const shown = userPosition ? enriched.slice(0, 6) : enriched;

  // construire les cartes de résultat
  shown.forEach(item => {
    const div = document.createElement('div');
    div.className = 'place-card';
    div.setAttribute('role','listitem');

    const name = document.createElement('div');
    name.className = 'name';
    name.textContent = item.nom;

    const subtitle = document.createElement('div');
    subtitle.className = 'small-muted';
    subtitle.textContent = item.commentaire ?? '';

    const meta = document.createElement('div');
    meta.className = 'd-flex align-items-center justify-content-between mt-2';
    meta.innerHTML = `
      <div class="small-muted"><i class="bi bi-geo-alt-fill"></i> ${item.lat.toFixed(5)}, ${item.lng.toFixed(5)}</div>
      <div class="distance-pill">${ item.distance != null ? formatDistance(item.distance) : '—' }</div>
    `;

    div.appendChild(name);
    if(item.commentaire) div.appendChild(subtitle);
    div.appendChild(meta);

    // click sur la carte de résultat : recentre la carte sur ce point
    div.addEventListener('click', () => {
      map.setView([item.lat, item.lng], 16, { animate:true });
      // ouvrir le popup correspondant (on parcourt la couche)
      markersLayer.eachLayer(mk => {
        if(mk.options && mk.options.customId === item.id){
          mk.openPopup();
        }
      });
    });

    resultsEl.appendChild(div);

    // Ajouter marqueur sur la carte
    const marker = L.marker([item.lat, item.lng], {
      customId: item.id
    }).addTo(markersLayer);

    const popupHtml = `
      <div style="min-width:170px">
        <div style="font-weight:700">${item.nom}</div>
        <div class="small-muted" style="margin-top:4px">${item.commentaire ?? ''}</div>
        <div style="margin-top:8px; font-weight:600; color:#6b3f2b">
          ${ item.distance != null ? formatDistance(item.distance) : 'Distance inconnue' }
        </div>
        <div style="margin-top:6px; font-size:12px" class="small-muted">Cliquez sur une carte ou un résultat pour zoomer.</div>
      </div>
    `;

    marker.bindPopup(popupHtml);
  });

  // si on a la position, ajouter marker utilisateur
  if(userPosition){
    if(userMarker) map.removeLayer(userMarker);
    userMarker = L.circleMarker([userPosition.lat, userPosition.lng], {
      radius:8,
      color: '#fff',
      fillColor: '#d64545',
      fillOpacity: 1,
      weight: 2
    }).addTo(map).bindPopup(`<b>Vous êtes ici</b><div class="small-muted">${userPosition.lat.toFixed(5)}, ${userPosition.lng.toFixed(5)}</div>`);

    // recentrer carte pour voir utilisateur + points proches
    const nearest = DATA.slice().sort((a,b) => {
      const da = haversineDistance(userPosition.lat, userPosition.lng, a.lat, a.lng);
      const db = haversineDistance(userPosition.lat, userPosition.lng, b.lat, b.lng);
      return da - db;
    })[0];

    // calculer bounds pour inclure user + premier point
    if(nearest){
      const bounds = L.latLngBounds([ [userPosition.lat, userPosition.lng], [nearest.lat, nearest.lng] ]);
      map.fitBounds(bounds.pad(0.4));
    } else {
      map.setView([userPosition.lat, userPosition.lng], 14);
    }

    // MAJ du texte de position
    document.getElementById('user-coords').textContent = `${userPosition.lat.toFixed(5)}, ${userPosition.lng.toFixed(5)}`;
  } else {
    document.getElementById('user-coords').textContent = `Position inconnue`;
  }
}

/* ---------------------------
   GESTION GEOLOCALISATION
   --------------------------- */

/**
 * Demande au navigateur la position de l'utilisateur.
 * Si succès: met à jour userPosition et l'UI.
 * Si erreur: affiche message d'erreur clair.
 */
function requestGeolocation(){
  if(!navigator.geolocation){
    alert("Géolocalisation non supportée par ton navigateur.");
    return;
  }

  // Indique à l'utilisateur qu'on cherche
  document.getElementById('user-status').textContent = 'Recherche de la position…';

  navigator.geolocation.getCurrentPosition(
    (pos) => {
      userPosition = { lat: pos.coords.latitude, lng: pos.coords.longitude };
      updateUI();
    },
    (err) => {
      console.error('Erreur geoloc:', err);
      if(err.code === 1) {
        document.getElementById('user-status').textContent = 'Accès refusé à la localisation.';
        alert("Tu as refusé le partage de la position. Tu peux saisir manuellement les coordonnées si tu veux, juste en dessous de la carte.");
      } else if(err.code === 2) {
        document.getElementById('user-status').textContent = 'Position introuvable.';
        alert("Impossible de déterminer la position. Vérifie que le GPS / réseau est activé.");
      } else {
        document.getElementById('user-status').textContent = 'Erreur de localisation.';
        alert("Erreur lors de la récupération de la position. Clique sur 'Me localiser', et autorise DETECPORC à accéder à ta localisation.");
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

/* ---------------------------
   INTERACTIONS UI
   --------------------------- */
function setupUI(){
  document.getElementById('btn-get').addEventListener('click', () => {
    requestGeolocation();
  });

  document.getElementById('btn-refresh').addEventListener('click', () => {
    if(userPosition){
      // on déclenche une "rafraîchissement" logique : recalculs
      updateUI();
      // petit effet visuel
      document.getElementById('btn-refresh').classList.add('btn-success');
      setTimeout(()=> document.getElementById('btn-refresh').classList.remove('btn-success'), 700);
    } else {
      requestGeolocation();
    }
  });

  document.getElementById('btn-show-all').addEventListener('click', () => {
    // recentre pour voir tous les points (simple bounding box)
    const lats = DATA.map(p => p.lat);
    const lngs = DATA.map(p => p.lng);
    const bounds = L.latLngBounds([[ Math.min(...lats), Math.min(...lngs) ], [ Math.max(...lats), Math.max(...lngs) ]]);
    map.fitBounds(bounds.pad(0.2));
  });

  document.getElementById('btn-manual').addEventListener('click', () => {
    // demander des coordonnées manuellement si l'utilisateur ne veut pas partager GPS
    const lat = parseFloat(prompt("Saisis la latitude (ex: 6.4969) :"));
    if(Number.isNaN(lat)) return;
    const lng = parseFloat(prompt("Saisis la longitude (ex: 2.6036) :"));
    if(Number.isNaN(lng)) return;
    userPosition = { lat, lng };
    updateUI();
  });
}

/* ---------------------------
   LANCEMENT
   --------------------------- */
(function main(){
  initMap();
  setupUI();
  updateUI(); // affiche les points sans position

  // option: demander la position au chargement (commenter si indésirable)
  requestGeolocation();
})();
