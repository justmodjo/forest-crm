require('dotenv').config();
const express = require('express');
const cors = require('cors');
const Airtable = require('airtable');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

if (!process.env.AIRTABLE_TOKEN || !process.env.AIRTABLE_BASE_ID) {
  console.error('FATAL — variables manquantes:',
    !process.env.AIRTABLE_TOKEN ? 'AIRTABLE_TOKEN ' : '',
    !process.env.AIRTABLE_BASE_ID ? 'AIRTABLE_BASE_ID' : ''
  );
  process.exit(1);
}

const base = new Airtable({ apiKey: process.env.AIRTABLE_TOKEN })
  .base(process.env.AIRTABLE_BASE_ID);

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// ── HELPERS ───────────────────────────────────────────────────────────────────

// Airtable currency fields can arrive as "$12,000" (text) or 12000 (number).
function parseMontant(v) {
  if (v == null || v === '') return null;
  if (typeof v === 'number') return v;
  const n = parseFloat(String(v).replace(/[$,\s]/g, ''));
  return isNaN(n) ? null : n;
}

// ── RAW AIRTABLE FETCH ────────────────────────────────────────────────────────

async function getAll(table) {
  const rows = await base(table).select().all();
  return rows;
}

function linkedId(fieldVal) {
  return Array.isArray(fieldVal) && fieldVal.length > 0 ? fieldVal[0] : null;
}

// ── FIELD MAPPINGS ────────────────────────────────────────────────────────────
// Airtable uses French field names, different statut values, and stores
// percentage as 0–1 decimals. These maps translate in both directions.

const PROSPECT_STATUT_FROM_AT = {
  'Nouveau':    'à_contacter',
  'Contacté':   'qualifié',
  'À relancer': 'devis_envoyé',
  'Converti':   'gagné',
  'Perdu':      'perdu',
};
const PROSPECT_STATUT_TO_AT = {
  'à_contacter': 'Nouveau',
  'qualifié':    'Contacté',
  'devis_envoyé':'À relancer',
  'négociation': 'À relancer',
  'gagné':       'Converti',
  'perdu':       'Perdu',
};
const PROSPECT_TYPE_FROM_AT = {
  'Propriétaire': 'privé',
  'Exploitant':   'coopérative',
  'Acheteur':     'GFA',
  'Autre':        'ONF',
};
const PROSPECT_TYPE_TO_AT = {
  'privé':        'Propriétaire',
  'coopérative':  'Exploitant',
  'GFA':          'Acheteur',
  'ONF':          'Autre',
  'collectivité': 'Autre',
  'SCI':          'Autre',
};

const CHANTIER_STATUT_FROM_AT = {
  'En cours': 'en_cours',
  'Planifié': 'planifié',
  'Annulé':   'retard',
  'Terminé':  'terminé',
};
const CHANTIER_STATUT_TO_AT = {
  'planifié':     'Planifié',
  'démarrage':    'En cours',
  'en_cours':     'En cours',
  'finalisation': 'En cours',
  'terminé':      'Terminé',
  'retard':       'Annulé',
};

const ACTIVITE_TYPE_FROM_AT = {
  'Envoi devis':  'devis',
  'Appel':        'appel',
  'RDV':          'visite',
  'Visite terrain':'visite',
  'Email':        'email',
  'Note':         'note',
  'Relance':      'relance',
  'Contrat':      'contrat',
};
const ACTIVITE_TYPE_TO_AT = {
  'devis':   'Envoi devis',
  'appel':   'Appel',
  'visite':  'RDV',
  'email':   'Email',
  'note':    'Note',
  'relance': 'Relance',
  'contrat': 'Contrat',
};

// Devis "Statut" column has corrupted datetime values in this base;
// detect them and normalise to a sane frontend value.
function normaliseDevisStatut(s) {
  if (!s) return 'brouillon';
  if (/^\d{4}-\d{2}-\d{2}/.test(s)) return 'envoyé'; // datetime → envoyé
  const m = { 'En attente': 'envoyé', 'Accepté': 'accepté', 'Refusé': 'refusé', 'Brouillon': 'brouillon' };
  return m[s] || 'envoyé';
}

// ── FROM-AIRTABLE MAPPERS ─────────────────────────────────────────────────────

function fromProspect(r) {
  const f = r.fields;
  return {
    id:          r.id,
    nom:         f['Nom'] || '',
    type:        PROSPECT_TYPE_FROM_AT[f['Type']] || f['Type'] || 'privé',
    region:      f['Région'] || '',
    departement: f['Département'] || '',
    surface_ha:  f['Surface_ha'] || null,
    tel:         f['Téléphone'] || '',
    email:       f['Email'] || '',
    contact_nom: f['Nom'] || '',
    statut:      PROSPECT_STATUT_FROM_AT[f['Statut']] || 'à_contacter',
    score:       null,
    source:      null,
    notes:       null,
    commercial_id: linkedId(f['Commercial']),
    created_at:  r._rawJson?.createdTime || null,
    updated_at:  r._rawJson?.createdTime || null,
  };
}

function fromChantier(r) {
  const f = r.fields;
  const pct = f['Avancement_%'];
  return {
    id:             r.id,
    prospect_id:    linkedId(f['Prospect lié']),
    nom:            f['Nom'] || '',
    type:           f['Type'] || '',
    surface_ha:     f['Surface_ha'] || null,
    montant_ht:     parseMontant(f['Montant_HT']),
    statut:         CHANTIER_STATUT_FROM_AT[f['Statut']] || 'planifié',
    date_debut:     f['Date_début'] || null,
    date_fin_prevue:f['Date_fin'] || null,
    // Airtable percent fields store 0–1 decimals; multiply by 100 for display
    avancement_pct: pct != null ? Math.round(pct * 100) : 0,
    chef_chantier:  f['Chef_chantier'] || '',
    engins:         null,
    notes:          null,
    created_at:     r._rawJson?.createdTime || null,
  };
}

function fromActivite(r) {
  const f = r.fields;
  const rawDate = f['Date'];
  const dateStr = rawDate
    ? typeof rawDate === 'string' ? rawDate.slice(0, 10) : String(rawDate).slice(0, 10)
    : null;
  return {
    id:           r.id,
    prospect_id:  linkedId(f['Prospect lié']),
    commercial_id:null,
    type:         ACTIVITE_TYPE_FROM_AT[f['Type']] || f['Type'] || 'note',
    titre:        f['Type'] || 'Activité',
    description:  f['Description'] || '',
    date_action:  dateStr,
    statut_apres: f['Statut_après'] || null,
  };
}

function fromDevis(r) {
  const f = r.fields;
  return {
    id:           r.id,
    prospect_id:  linkedId(f['Prospect lié']),
    commercial_id:null,
    montant_ht:   parseMontant(f['Montant_HT']),
    statut:       normaliseDevisStatut(f['Statut']),
    date_envoi:   f['Date_envoi'] || null,
    date_validite:null,
    notes:        null,
    created_at:   f['Date_envoi'] || r._rawJson?.createdTime || null,
  };
}

function fromCommercial(r) {
  const f = r.fields;
  const nom    = f['Nom'] || '';
  const prenom = f['Prénom'] || '';
  if (!nom) return null; // skip incomplete records
  return {
    id:                   r.id,
    nom,
    prenom,
    email:                f['Email'] || '',
    tel:                  f['Téléphone'] || '',
    region:               f['Région'] || '',
    objectif_mensuel_eur: 60000,
    avatar_initiales:     ((prenom[0] || '') + (nom[0] || '')).toUpperCase() || '??',
    actif:                true,
  };
}

// ── TO-AIRTABLE MAPPERS (for POST / PATCH) ────────────────────────────────────

function toProspect(body) {
  const f = {};
  if (body.nom)         f['Nom']         = body.nom;
  if (body.type)        f['Type']        = PROSPECT_TYPE_TO_AT[body.type] || body.type;
  if (body.region)      f['Région']      = body.region;
  if (body.departement) f['Département'] = body.departement;
  if (body.surface_ha != null) f['Surface_ha'] = Number(body.surface_ha);
  if (body.tel)         f['Téléphone']   = body.tel;
  if (body.email)       f['Email']       = body.email;
  if (body.statut)      f['Statut']      = PROSPECT_STATUT_TO_AT[body.statut] || body.statut;
  if (body.commercial_id) f['Commercial'] = [body.commercial_id];
  return f;
}

function toChantier(body) {
  const f = {};
  if (body.nom)            f['Nom']          = body.nom;
  if (body.type)           f['Type']         = body.type;
  if (body.surface_ha != null) f['Surface_ha'] = Number(body.surface_ha);
  if (body.montant_ht != null) f['Montant_HT'] = Number(body.montant_ht);
  if (body.statut)         f['Statut']       = CHANTIER_STATUT_TO_AT[body.statut] || body.statut;
  if (body.date_debut)     f['Date_début']   = body.date_debut;
  if (body.date_fin_prevue)f['Date_fin']     = body.date_fin_prevue;
  if (body.avancement_pct != null) f['Avancement_%'] = Number(body.avancement_pct) / 100;
  if (body.chef_chantier)  f['Chef_chantier']= body.chef_chantier;
  if (body.prospect_id)    f['Prospect lié'] = [body.prospect_id];
  return f;
}

function toActivite(body) {
  const f = {};
  if (body.type)        f['Type']        = ACTIVITE_TYPE_TO_AT[body.type] || body.type;
  if (body.description) f['Description'] = body.description;
  if (body.date_action) f['Date']        = body.date_action;
  if (body.statut_apres)f['Statut_après']= body.statut_apres;
  if (body.prospect_id) f['Prospect lié']= [body.prospect_id];
  return f;
}

function toDevis(body) {
  const f = {};
  if (body.montant_ht != null) f['Montant_HT'] = Number(body.montant_ht);
  if (body.date_envoi)  f['Date_envoi']  = body.date_envoi;
  if (body.prospect_id) f['Prospect lié']= [body.prospect_id];
  return f;
}

// ── STATS ─────────────────────────────────────────────────────────────────────
async function fetchTable(name) {
  try {
    const rows = await getAll(name);
    console.log(`[stats] ${name}: ${rows.length} lignes OK`);
    return rows;
  } catch (err) {
    console.error(`[stats] ERREUR table "${name}": ${err.message} (status: ${err.statusCode || 'N/A'})`);
    throw new Error(`Airtable table "${name}" inaccessible: ${err.message}`);
  }
}

app.get('/api/stats', async (req, res) => {
  console.log('[stats] requête reçue');
  try {
    const rawP = await fetchTable('Prospects');
    const rawD = await fetchTable('Devis');
    const rawA = await fetchTable('Activités');
    const rawC = await fetchTable('Chantiers');

    const prospects = rawP.map(fromProspect);
    const devis     = rawD.map(fromDevis);
    const activites = rawA.map(fromActivite);
    const chantiers = rawC.map(fromChantier);

    console.log('[stats] statuts prospects:', [...new Set(prospects.map(p => p.statut))]);
    console.log('[stats] statuts chantiers:', [...new Set(chantiers.map(c => c.statut))]);
    console.log('[stats] statuts devis:',     [...new Set(devis.map(d => d.statut))]);

    const now = new Date();
    const som = new Date(now.getFullYear(), now.getMonth(), 1);

    const prospectsActifs  = prospects.filter(p => !['gagné', 'perdu'].includes(p.statut)).length;
    const chantiersEnCours = chantiers.filter(c => ['démarrage', 'en_cours', 'finalisation'].includes(c.statut)).length;
    const accepte          = devis.filter(d => d.statut === 'accepté');
    const caMois           = accepte.filter(d => new Date(d.created_at) >= som)
                                    .reduce((s, d) => s + (Number(d.montant_ht) || 0), 0);
    const devisAttente     = devis.filter(d => d.statut === 'envoyé').length;
    const relancesUrgentes = activites.filter(a => a.type === 'relance' && new Date(a.date_action) >= som).length;
    const nbGagne          = prospects.filter(p => p.statut === 'gagné').length;
    const tauxConversion   = prospects.length ? Math.round((nbGagne / prospects.length) * 100) : 0;

    const ca6Mois = Array.from({ length: 6 }, (_, i) => {
      const start = new Date(now.getFullYear(), now.getMonth() - (5 - i), 1);
      const end   = new Date(now.getFullYear(), now.getMonth() - (5 - i) + 1, 1);
      const ca = accepte
        .filter(d => { const dt = new Date(d.created_at); return dt >= start && dt < end; })
        .reduce((s, d) => s + (Number(d.montant_ht) || 0), 0);
      return { mois: start.toLocaleDateString('fr-FR', { month: 'short' }), ca };
    });

    const result = { prospectsActifs, chantiersEnCours, caMois, devisAttente, relancesUrgentes, tauxConversion, ca6Mois };
    console.log('[stats] OK:', JSON.stringify({ prospectsActifs, chantiersEnCours, caMois, devisAttente, relancesUrgentes, tauxConversion }));
    res.json(result);
  } catch (err) {
    console.error('[stats] ÉCHEC:', err.message);
    res.status(500).json({ error: err.message });
  }
});

// ── PROSPECTS ────────────────────────────────────────────────────────────────
app.get('/api/prospects', async (req, res) => {
  try {
    const [rawP, rawCm] = await Promise.all([getAll('Prospects'), getAll('Commerciaux')]);
    const cMap = Object.fromEntries(rawCm.map(r => [r.id, fromCommercial(r)]).filter(([, v]) => v));
    const data = rawP
      .map(fromProspect)
      .sort((a, b) => new Date(b.created_at || 0) - new Date(a.created_at || 0))
      .map(p => ({
        ...p,
        commerciaux: p.commercial_id && cMap[p.commercial_id]
          ? { nom: cMap[p.commercial_id].nom, prenom: cMap[p.commercial_id].prenom }
          : null,
      }));
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/prospects', async (req, res) => {
  try {
    const r = await base('Prospects').create(toProspect(req.body));
    res.status(201).json(fromProspect(r));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.patch('/api/prospects/:id', async (req, res) => {
  try {
    const r = await base('Prospects').update(req.params.id, toProspect(req.body));
    res.json(fromProspect(r));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── PIPELINE ─────────────────────────────────────────────────────────────────
app.get('/api/pipeline', async (req, res) => {
  try {
    const [rawP, rawCm] = await Promise.all([getAll('Prospects'), getAll('Commerciaux')]);
    const cMap = Object.fromEntries(rawCm.map(r => [r.id, fromCommercial(r)]).filter(([, v]) => v));
    const cols = { 'à_contacter': [], 'qualifié': [], 'devis_envoyé': [], 'négociation': [] };

    rawP.map(fromProspect)
      .filter(p => !['gagné', 'perdu'].includes(p.statut))
      .sort((a, b) => new Date(b.updated_at || b.created_at || 0) - new Date(a.updated_at || a.created_at || 0))
      .map(p => ({
        ...p,
        commerciaux: p.commercial_id && cMap[p.commercial_id]
          ? { nom: cMap[p.commercial_id].nom, prenom: cMap[p.commercial_id].prenom }
          : null,
      }))
      .forEach(p => { if (cols[p.statut]) cols[p.statut].push(p); });

    res.json(cols);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── CHANTIERS ────────────────────────────────────────────────────────────────
app.get('/api/chantiers', async (req, res) => {
  try {
    const [rawC, rawP] = await Promise.all([getAll('Chantiers'), getAll('Prospects')]);
    const pMap = Object.fromEntries(rawP.map(r => [r.id, fromProspect(r)]));
    const data = rawC
      .map(fromChantier)
      .sort((a, b) => new Date(b.created_at || 0) - new Date(a.created_at || 0))
      .map(c => ({
        ...c,
        prospects: c.prospect_id && pMap[c.prospect_id]
          ? { nom: pMap[c.prospect_id].nom, region: pMap[c.prospect_id].region, departement: pMap[c.prospect_id].departement }
          : null,
      }));
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/chantiers', async (req, res) => {
  try {
    const r = await base('Chantiers').create(toChantier(req.body));
    res.status(201).json(fromChantier(r));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.patch('/api/chantiers/:id', async (req, res) => {
  try {
    const r = await base('Chantiers').update(req.params.id, toChantier(req.body));
    res.json(fromChantier(r));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── ACTIVITÉS ────────────────────────────────────────────────────────────────
app.get('/api/activites', async (req, res) => {
  try {
    const [rawA, rawP, rawCm] = await Promise.all([
      getAll('Activités'), getAll('Prospects'), getAll('Commerciaux'),
    ]);
    const pMap  = Object.fromEntries(rawP.map(r => [r.id, fromProspect(r)]));
    const cMap  = Object.fromEntries(rawCm.map(r => [r.id, fromCommercial(r)]).filter(([, v]) => v));
    const data  = rawA
      .map(fromActivite)
      .sort((a, b) => new Date(b.date_action || 0) - new Date(a.date_action || 0))
      .slice(0, 100)
      .map(a => ({
        ...a,
        prospects:   a.prospect_id && pMap[a.prospect_id]
          ? { nom: pMap[a.prospect_id].nom }
          : null,
        commerciaux: a.commercial_id && cMap[a.commercial_id]
          ? { nom: cMap[a.commercial_id].nom, prenom: cMap[a.commercial_id].prenom }
          : null,
      }));
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/activites', async (req, res) => {
  try {
    const r = await base('Activités').create(toActivite(req.body));
    res.status(201).json(fromActivite(r));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── DEVIS ────────────────────────────────────────────────────────────────────
app.get('/api/devis', async (req, res) => {
  try {
    const [rawD, rawP, rawCm] = await Promise.all([
      getAll('Devis'), getAll('Prospects'), getAll('Commerciaux'),
    ]);
    const pMap = Object.fromEntries(rawP.map(r => [r.id, fromProspect(r)]));
    const cMap = Object.fromEntries(rawCm.map(r => [r.id, fromCommercial(r)]).filter(([, v]) => v));
    const data = rawD
      .map(fromDevis)
      .sort((a, b) => new Date(b.created_at || 0) - new Date(a.created_at || 0))
      .map(d => ({
        ...d,
        prospects:   d.prospect_id && pMap[d.prospect_id]
          ? { nom: pMap[d.prospect_id].nom }
          : null,
        commerciaux: d.commercial_id && cMap[d.commercial_id]
          ? { nom: cMap[d.commercial_id].nom, prenom: cMap[d.commercial_id].prenom }
          : null,
      }));
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/devis', async (req, res) => {
  try {
    const r = await base('Devis').create(toDevis(req.body));
    res.status(201).json(fromDevis(r));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.patch('/api/devis/:id', async (req, res) => {
  try {
    const r = await base('Devis').update(req.params.id, toDevis(req.body));
    res.json(fromDevis(r));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── COMMERCIAUX ──────────────────────────────────────────────────────────────
app.get('/api/commerciaux', async (req, res) => {
  try {
    const [rawCm, rawP, rawD] = await Promise.all([
      getAll('Commerciaux'), getAll('Prospects'), getAll('Devis'),
    ]);
    const prospects = rawP.map(fromProspect);
    const devis     = rawD.map(fromDevis);
    const now = new Date();
    const som = new Date(now.getFullYear(), now.getMonth(), 1);

    const data = rawCm
      .map(fromCommercial)
      .filter(Boolean)
      .sort((a, b) => a.nom.localeCompare(b.nom))
      .map(c => {
        const nbProspects = prospects.filter(p => p.commercial_id === c.id).length;
        const myAccepted  = devis.filter(d => d.commercial_id === c.id && d.statut === 'accepté');
        const caMois      = myAccepted
          .filter(d => new Date(d.created_at) >= som)
          .reduce((s, d) => s + (Number(d.montant_ht) || 0), 0);
        const nbContrats  = myAccepted.length;
        return { ...c, nbProspects, caMois, nbContrats };
      });

    res.json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── CATCH-ALL ────────────────────────────────────────────────────────────────
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.listen(PORT, () => {
  console.log(`ForestCRM → http://localhost:${PORT}`);
  console.log(`AIRTABLE_TOKEN  : ${process.env.AIRTABLE_TOKEN  ? '✓ défini (' + process.env.AIRTABLE_TOKEN.slice(0,8) + '…)' : '✗ MANQUANT'}`);
  console.log(`AIRTABLE_BASE_ID: ${process.env.AIRTABLE_BASE_ID ? '✓ ' + process.env.AIRTABLE_BASE_ID : '✗ MANQUANT'}`);
});
