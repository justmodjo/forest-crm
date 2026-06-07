const express = require('express');
const cors = require('cors');
const path = require('path');
const seedData = require('./seed');

const app = express();
const PORT = process.env.PORT || 3000;

// Deep-clone seed data into mutable in-memory arrays
const db = {
  commerciaux: JSON.parse(JSON.stringify(seedData.commerciaux)),
  prospects:   JSON.parse(JSON.stringify(seedData.prospects)),
  chantiers:   JSON.parse(JSON.stringify(seedData.chantiers)),
  devis:       JSON.parse(JSON.stringify(seedData.devis)),
  activites:   JSON.parse(JSON.stringify(seedData.activites)),
};

function nextId(table) {
  const ids = db[table].map(r => r.id);
  return ids.length ? Math.max(...ids) + 1 : 1;
}

function findById(table, id) {
  return db[table].find(r => r.id === Number(id));
}

function withCommercial(record) {
  const c = db.commerciaux.find(c => c.id === record.commercial_id);
  return { ...record, commerciaux: c ? { nom: c.nom, prenom: c.prenom } : null };
}

function withProspect(record) {
  const p = db.prospects.find(p => p.id === record.prospect_id);
  return { ...record, prospects: p ? { nom: p.nom, region: p.region, departement: p.departement } : null };
}

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// ─── STATS ────────────────────────────────────────────────────────────────────
app.get('/api/stats', (req, res) => {
  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

  const prospectsActifs = db.prospects.filter(p => p.statut !== 'gagné' && p.statut !== 'perdu').length;
  const chantiersEnCours = db.chantiers.filter(c => ['démarrage', 'en_cours', 'finalisation'].includes(c.statut)).length;

  const devisMois = db.devis.filter(d => d.statut === 'accepté' && new Date(d.created_at) >= startOfMonth);
  const caMois = devisMois.reduce((s, d) => s + (d.montant_ht || 0), 0);

  const devisAttente = db.devis.filter(d => d.statut === 'envoyé').length;
  const relancesUrgentes = db.activites.filter(a => a.type === 'relance' && new Date(a.date_action) >= startOfMonth).length;

  const prospectsGagnes = db.prospects.filter(p => p.statut === 'gagné').length;
  const tauxConversion = db.prospects.length
    ? Math.round((prospectsGagnes / db.prospects.length) * 100)
    : 0;

  const ca6Mois = [];
  for (let i = 5; i >= 0; i--) {
    const start = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const end   = new Date(now.getFullYear(), now.getMonth() - i + 1, 1);
    const moisData = db.devis.filter(d => {
      if (d.statut !== 'accepté') return false;
      const dt = new Date(d.created_at);
      return dt >= start && dt < end;
    });
    ca6Mois.push({
      mois: start.toLocaleDateString('fr-FR', { month: 'short' }),
      ca: moisData.reduce((s, d) => s + (d.montant_ht || 0), 0),
    });
  }

  res.json({ prospectsActifs, chantiersEnCours, caMois, devisAttente, relancesUrgentes, tauxConversion, ca6Mois });
});

// ─── PROSPECTS ────────────────────────────────────────────────────────────────
app.get('/api/prospects', (req, res) => {
  const data = [...db.prospects]
    .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
    .map(withCommercial);
  res.json(data);
});

app.post('/api/prospects', (req, res) => {
  const record = { ...req.body, id: nextId('prospects'), created_at: new Date().toISOString(), updated_at: new Date().toISOString() };
  db.prospects.push(record);
  res.status(201).json(record);
});

app.patch('/api/prospects/:id', (req, res) => {
  const idx = db.prospects.findIndex(p => p.id === Number(req.params.id));
  if (idx === -1) return res.status(404).json({ error: 'Not found' });
  db.prospects[idx] = { ...db.prospects[idx], ...req.body, updated_at: new Date().toISOString() };
  res.json(db.prospects[idx]);
});

// ─── PIPELINE ─────────────────────────────────────────────────────────────────
app.get('/api/pipeline', (req, res) => {
  const colonnes = { 'à_contacter': [], 'qualifié': [], 'devis_envoyé': [], 'négociation': [] };
  db.prospects
    .filter(p => p.statut !== 'gagné' && p.statut !== 'perdu')
    .sort((a, b) => new Date(b.updated_at) - new Date(a.updated_at))
    .map(withCommercial)
    .forEach(p => { if (colonnes[p.statut]) colonnes[p.statut].push(p); });
  res.json(colonnes);
});

// ─── CHANTIERS ────────────────────────────────────────────────────────────────
app.get('/api/chantiers', (req, res) => {
  const data = [...db.chantiers]
    .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
    .map(withProspect);
  res.json(data);
});

app.post('/api/chantiers', (req, res) => {
  const record = { ...req.body, id: nextId('chantiers'), created_at: new Date().toISOString() };
  db.chantiers.push(record);
  res.status(201).json(record);
});

app.patch('/api/chantiers/:id', (req, res) => {
  const idx = db.chantiers.findIndex(c => c.id === Number(req.params.id));
  if (idx === -1) return res.status(404).json({ error: 'Not found' });
  db.chantiers[idx] = { ...db.chantiers[idx], ...req.body };
  res.json(db.chantiers[idx]);
});

// ─── ACTIVITÉS ────────────────────────────────────────────────────────────────
app.get('/api/activites', (req, res) => {
  const data = [...db.activites]
    .sort((a, b) => new Date(b.date_action) - new Date(a.date_action))
    .slice(0, 100)
    .map(a => {
      const p = db.prospects.find(p => p.id === a.prospect_id);
      const c = db.commerciaux.find(c => c.id === a.commercial_id);
      return {
        ...a,
        prospects:   p ? { nom: p.nom } : null,
        commerciaux: c ? { nom: c.nom, prenom: c.prenom } : null,
      };
    });
  res.json(data);
});

app.post('/api/activites', (req, res) => {
  const record = { ...req.body, id: nextId('activites') };
  db.activites.push(record);
  res.status(201).json(record);
});

// ─── DEVIS ────────────────────────────────────────────────────────────────────
app.get('/api/devis', (req, res) => {
  const data = [...db.devis]
    .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
    .map(d => {
      const p = db.prospects.find(p => p.id === d.prospect_id);
      const c = db.commerciaux.find(c => c.id === d.commercial_id);
      return {
        ...d,
        prospects:   p ? { nom: p.nom } : null,
        commerciaux: c ? { nom: c.nom, prenom: c.prenom } : null,
      };
    });
  res.json(data);
});

app.post('/api/devis', (req, res) => {
  const record = { ...req.body, id: nextId('devis'), created_at: new Date().toISOString() };
  db.devis.push(record);
  res.status(201).json(record);
});

app.patch('/api/devis/:id', (req, res) => {
  const idx = db.devis.findIndex(d => d.id === Number(req.params.id));
  if (idx === -1) return res.status(404).json({ error: 'Not found' });
  db.devis[idx] = { ...db.devis[idx], ...req.body };
  res.json(db.devis[idx]);
});

// ─── COMMERCIAUX ──────────────────────────────────────────────────────────────
app.get('/api/commerciaux', (req, res) => {
  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

  const data = db.commerciaux
    .filter(c => c.actif)
    .sort((a, b) => a.nom.localeCompare(b.nom))
    .map(c => {
      const nbProspects = db.prospects.filter(p => p.commercial_id === c.id).length;
      const devisAcceptesMois = db.devis.filter(d =>
        d.commercial_id === c.id &&
        d.statut === 'accepté' &&
        new Date(d.created_at) >= startOfMonth
      );
      const caMois = devisAcceptesMois.reduce((s, d) => s + (d.montant_ht || 0), 0);
      const nbContrats = db.devis.filter(d => d.commercial_id === c.id && d.statut === 'accepté').length;
      return { ...c, nbProspects, caMois, nbContrats };
    });

  res.json(data);
});

// ─── CATCH-ALL ────────────────────────────────────────────────────────────────
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.listen(PORT, () => {
  console.log(`ForestCRM running on port ${PORT}`);
});
