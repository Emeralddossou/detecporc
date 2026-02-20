const path = require('path');
const fs = require('fs/promises');

const DATA_FILE = path.join(__dirname, '..', 'data', 'points.json');
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

async function resetDb() {
  await fs.mkdir(path.dirname(DATA_FILE), { recursive: true });
  await fs.writeFile(DATA_FILE, JSON.stringify(DEFAULT_POINTS, null, 2));
  console.log('Base de donnees reinitialisee:', DATA_FILE);
}

resetDb().catch((err) => {
  console.error('Erreur reset DB:', err);
  process.exit(1);
});
