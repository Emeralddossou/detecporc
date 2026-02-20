DETECPORC = DETECTEUR de viande PORC.

Cette version est full Node (Express) avec un frontend moderne.

Lancer le projet
1) yarn install
2) yarn start
3) Ouvrir http://localhost:3000

Admin
- Page admin : http://localhost:3000/admin.html
- Identifiant : admindp
- Mot de passe : dp26#porc

Base de donnees
- Stockee dans data/points.json
- Reinitialiser avec : yarn db

Notes
- Les points de vente sont accessibles en lecture via /api/points
- Les operations admin passent par /api/admin/points
