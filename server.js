const path = require('path');
const fs = require('fs/promises');
const express = require('express');
const session = require('express-session');
const FileStore = require('session-file-store')(session);
const crypto = require('crypto');

const app = express();
const PORT = process.env.PORT || 3000;
const DATA_FILE = path.join(__dirname, 'data', 'points.json');

const ADMIN_USER = 'admindp';
// Hash scrypt du mot de passe "dp26#porc" avec le sel ci-dessous.
const ADMIN_SALT = process.env.ADMIN_SALT || 'detecporc-salt-v1';
const ADMIN_HASH =
  process.env.ADMIN_HASH ||
  '873866cbfde6c0f6aab3eaa6f43b539cd702406ee025a43dfaa5594622fa0094b8636fd3dd1c9ded039c6658c79df2bd2abee8fadcf6f53cb7cbf7776afa8419';

function hashPassword(password) {
  return crypto.scryptSync(password, ADMIN_SALT, 64);
}

function isValidPassword(password) {
  const candidate = hashPassword(password);
  const stored = Buffer.from(ADMIN_HASH, 'hex');
  if (stored.length !== candidate.length) return false;
  return crypto.timingSafeEqual(stored, candidate);
}

const DEFAULT_POINTS = [
  {
    id: 1,
    nom: "Boucherie Porc d'Or",
    lat: 6.4969,
    lng: 2.6036,
    adresse: 'Quartier Zogbo, Porto-Novo',
    telephone: '+229 90 00 11 22',
    horaires: 'Lun-Sam 07:00-19:00',
    commentaire: 'Boucherie traditionnelle, porc frais chaque matin.'
  },
  {
    id: 2,
    nom: 'Porc & Co - Marche Central',
    lat: 6.4979,
    lng: 2.6065,
    adresse: 'Marche Central, Stand B12',
    telephone: '+229 94 20 33 10',
    horaires: 'Lun-Sam 06:30-18:30',
    commentaire: 'Stand B12, marinades maison.'
  },
  {
    id: 3,
    nom: 'Chez Mama Porc',
    lat: 6.4935,
    lng: 2.6001,
    adresse: 'Rue des Artisans',
    telephone: '+229 62 01 88 77',
    horaires: 'Lun-Dim 08:00-20:00',
    commentaire: 'Vente a emporter, portions pretes.'
  },
  {
    id: 4,
    nom: 'Le Charcutier Porto',
    lat: 6.502,
    lng: 2.61,
    adresse: 'Avenue des Marins',
    telephone: '+229 67 55 10 40',
    horaires: 'Mar-Dim 08:00-19:30',
    commentaire: 'Charcuterie seche et saucisses.'
  },
  {
    id: 5,
    nom: 'Marche Akpakpa - Porc',
    lat: 6.49,
    lng: 2.598,
    adresse: 'Akpakpa, Zone commerciale',
    telephone: '+229 95 15 44 00',
    horaires: 'Lun-Sam 07:00-18:00',
    commentaire: 'Petit prix, service rapide.'
  },
  {
    id: 6,
    nom: 'Boucherie Moderne',
    lat: 6.505,
    lng: 2.595,
    adresse: 'Boulevard des Nations',
    telephone: '+229 98 31 20 05',
    horaires: 'Lun-Sam 08:00-19:00',
    commentaire: 'Hygiene controlee.'
  },
  {
    id: 7,
    nom: 'Porc Express',
    lat: 6.51,
    lng: 2.607,
    adresse: 'Rue du Port',
    telephone: '+229 96 04 12 55',
    horaires: 'Lun-Dim 07:30-20:30',
    commentaire: 'Livraison locale possible.'
  },
  {
    id: 8,
    nom: 'Maison du Porc',
    lat: 6.4878,
    lng: 2.6122,
    adresse: 'Quartier Gbekon',
    telephone: '+229 91 73 54 12',
    horaires: 'Mer-Dim 09:00-19:00',
    commentaire: 'Preparations fumees.'
  },
  {
    id: 9,
    nom: 'Le Coin des Cochons',
    lat: 6.499,
    lng: 2.593,
    adresse: 'Carrefour Atinkou',
    telephone: '+229 60 40 10 22',
    horaires: 'Lun-Sam 07:00-18:30',
    commentaire: 'Rabais le week-end.'
  },
  {
    id: 10,
    nom: 'Stand Porc du Port',
    lat: 6.5035,
    lng: 2.5995,
    adresse: 'Digue du Port',
    telephone: '+229 94 11 82 60',
    horaires: 'Lun-Sam 06:00-18:00',
    commentaire: 'Fraicheur du jour garantie.'
  }
];

async function ensureDataFile() {
  try {
    await fs.access(DATA_FILE);
  } catch (err) {
    await fs.mkdir(path.dirname(DATA_FILE), { recursive: true });
    await fs.writeFile(DATA_FILE, JSON.stringify(DEFAULT_POINTS, null, 2));
  }
}

async function readPoints() {
  const raw = await fs.readFile(DATA_FILE, 'utf8');
  // Supporte un BOM UTF-8 eventuel au debut du fichier JSON.
  const sanitized = raw.replace(/^\uFEFF/, '');
  return JSON.parse(sanitized);
}

async function writePoints(points) {
  await fs.writeFile(DATA_FILE, JSON.stringify(points, null, 2));
}

function requireAdmin(req, res, next) {
  if (req.session && req.session.isAdmin) {
    return next();
  }
  return res.status(401).json({ ok: false, error: 'Non autorise.' });
}

app.use(express.json({ limit: '200kb' }));
app.use(
  session({
    secret: process.env.SESSION_SECRET || 'detecporc-session-secret',
    store: new FileStore({
      path: path.join(__dirname, 'data', 'sessions'),
      retries: 1
    }),
    resave: false,
    saveUninitialized: false,
    cookie: {
      httpOnly: true,
      sameSite: 'lax',
      maxAge: 1000 * 60 * 60 * 6
    }
  })
);

app.use(express.static(path.join(__dirname, 'public')));

app.get('/api/points', async (req, res) => {
  const points = await readPoints();
  res.json({ ok: true, points });
});

app.post('/api/login', (req, res) => {
  const { username, password } = req.body || {};
  const isValid = username === ADMIN_USER && typeof password === 'string' && isValidPassword(password);
  if (!isValid) {
    return res.status(401).json({ ok: false, error: 'Identifiants invalides.' });
  }

  req.session.isAdmin = true;
  req.session.username = username;
  return res.json({ ok: true, username });
});

app.post('/api/logout', (req, res) => {
  req.session.destroy(() => {
    res.json({ ok: true });
  });
});

app.get('/api/admin/points', requireAdmin, async (req, res) => {
  const points = await readPoints();
  res.json({ ok: true, points });
});

app.post('/api/admin/points', requireAdmin, async (req, res) => {
  const { nom, lat, lng, adresse, telephone, horaires, commentaire } = req.body || {};
  if (!nom || typeof lat !== 'number' || typeof lng !== 'number') {
    return res.status(400).json({ ok: false, error: 'Nom, latitude et longitude sont obligatoires.' });
  }

  const points = await readPoints();
  const nextId = points.length ? Math.max(...points.map((p) => p.id || 0)) + 1 : 1;
  const newPoint = {
    id: nextId,
    nom,
    lat,
    lng,
    adresse: adresse || '',
    telephone: telephone || '',
    horaires: horaires || '',
    commentaire: commentaire || ''
  };

  points.push(newPoint);
  await writePoints(points);
  res.status(201).json({ ok: true, point: newPoint });
});

app.put('/api/admin/points/:id', requireAdmin, async (req, res) => {
  const pointId = Number(req.params.id);
  if (!Number.isFinite(pointId)) {
    return res.status(400).json({ ok: false, error: 'Identifiant invalide.' });
  }

  const points = await readPoints();
  const idx = points.findIndex((p) => p.id === pointId);
  if (idx === -1) {
    return res.status(404).json({ ok: false, error: 'Point introuvable.' });
  }

  const updated = {
    ...points[idx],
    ...req.body,
    id: pointId
  };

  if (!updated.nom || typeof updated.lat !== 'number' || typeof updated.lng !== 'number') {
    return res.status(400).json({ ok: false, error: 'Nom, latitude et longitude sont obligatoires.' });
  }

  points[idx] = updated;
  await writePoints(points);
  res.json({ ok: true, point: updated });
});

app.delete('/api/admin/points/:id', requireAdmin, async (req, res) => {
  const pointId = Number(req.params.id);
  const points = await readPoints();
  const nextPoints = points.filter((p) => p.id !== pointId);
  if (nextPoints.length === points.length) {
    return res.status(404).json({ ok: false, error: 'Point introuvable.' });
  }

  await writePoints(nextPoints);
  res.json({ ok: true });
});

ensureDataFile().then(() => {
  app.listen(PORT, () => {
    console.log(`DETECPORC server running on http://localhost:${PORT}`);
  });
});
