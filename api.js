require('dotenv').config();
const express = require('express');
const cors = require('cors');
const { createClient } = require('@supabase/supabase-js');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_ANON_KEY
);

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// ─── STATS ────────────────────────────────────────────────────────────────────
app.get('/api/stats', async (req, res) => {
  try {
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();

    const [
      { count: prospectsActifs },
      { count: chantiersEnCours },
      { data: devisMois },
      { count: devisAttente },
      { count: relancesUrgentes },
      { data: prospectsGagnes },
      { data: prospectsTotal },
      { data: caData }
    ] = await Promise.all([
      supabase.from('prospects').select('*', { count: 'exact', head: true })
        .not('statut', 'in', '("gagné","perdu")'),
      supabase.from('chantiers').select('*', { count: 'exact', head: true })
        .in('statut', ['démarrage', 'en_cours', 'finalisation']),
      supabase.from('devis').select('montant_ht').eq('statut', 'accepté')
        .gte('created_at', startOfMonth),
      supabase.from('devis').select('*', { count: 'exact', head: true })
        .eq('statut', 'envoyé'),
      supabase.from('activites').select('*', { count: 'exact', head: true })
        .eq('type', 'relance').gte('date_action', startOfMonth),
      supabase.from('prospects').select('id').eq('statut', 'gagné'),
      supabase.from('prospects').select('id'),
      supabase.from('devis').select('montant_ht, created_at').eq('statut', 'accepté')
    ]);

    const caMois = (devisMois || []).reduce((s, d) => s + (d.montant_ht || 0), 0);
    const tauxConversion = prospectsTotal?.length
      ? Math.round(((prospectsGagnes?.length || 0) / prospectsTotal.length) * 100)
      : 0;

    // CA 6 derniers mois
    const ca6Mois = [];
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const end = new Date(now.getFullYear(), now.getMonth() - i + 1, 1);
      const moisData = (caData || []).filter(x => {
        const dt = new Date(x.created_at);
        return dt >= d && dt < end;
      });
      ca6Mois.push({
        mois: d.toLocaleDateString('fr-FR', { month: 'short' }),
        ca: moisData.reduce((s, x) => s + (x.montant_ht || 0), 0)
      });
    }

    res.json({
      prospectsActifs: prospectsActifs || 0,
      chantiersEnCours: chantiersEnCours || 0,
      caMois,
      devisAttente: devisAttente || 0,
      relancesUrgentes: relancesUrgentes || 0,
      tauxConversion,
      ca6Mois
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ─── PROSPECTS ────────────────────────────────────────────────────────────────
app.get('/api/prospects', async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('prospects')
      .select('*, commerciaux(nom, prenom)')
      .order('created_at', { ascending: false });
    if (error) throw error;
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/prospects', async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('prospects')
      .insert(req.body)
      .select()
      .single();
    if (error) throw error;
    res.status(201).json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.patch('/api/prospects/:id', async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('prospects')
      .update({ ...req.body, updated_at: new Date().toISOString() })
      .eq('id', req.params.id)
      .select()
      .single();
    if (error) throw error;
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ─── PIPELINE ─────────────────────────────────────────────────────────────────
app.get('/api/pipeline', async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('prospects')
      .select('*, commerciaux(nom, prenom)')
      .not('statut', 'in', '("gagné","perdu")')
      .order('updated_at', { ascending: false });
    if (error) throw error;

    const colonnes = {
      'à_contacter': [],
      'qualifié': [],
      'devis_envoyé': [],
      'négociation': [],
    };
    (data || []).forEach(p => {
      if (colonnes[p.statut]) colonnes[p.statut].push(p);
    });
    res.json(colonnes);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ─── CHANTIERS ────────────────────────────────────────────────────────────────
app.get('/api/chantiers', async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('chantiers')
      .select('*, prospects(nom, region, departement)')
      .order('created_at', { ascending: false });
    if (error) throw error;
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/chantiers', async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('chantiers')
      .insert(req.body)
      .select()
      .single();
    if (error) throw error;
    res.status(201).json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.patch('/api/chantiers/:id', async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('chantiers')
      .update(req.body)
      .eq('id', req.params.id)
      .select()
      .single();
    if (error) throw error;
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ─── ACTIVITÉS ────────────────────────────────────────────────────────────────
app.get('/api/activites', async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('activites')
      .select('*, prospects(nom), commerciaux(nom, prenom)')
      .order('date_action', { ascending: false })
      .limit(100);
    if (error) throw error;
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/activites', async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('activites')
      .insert(req.body)
      .select()
      .single();
    if (error) throw error;
    res.status(201).json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ─── DEVIS ────────────────────────────────────────────────────────────────────
app.get('/api/devis', async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('devis')
      .select('*, prospects(nom), commerciaux(nom, prenom)')
      .order('created_at', { ascending: false });
    if (error) throw error;
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/devis', async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('devis')
      .insert(req.body)
      .select()
      .single();
    if (error) throw error;
    res.status(201).json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.patch('/api/devis/:id', async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('devis')
      .update(req.body)
      .eq('id', req.params.id)
      .select()
      .single();
    if (error) throw error;
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ─── COMMERCIAUX ──────────────────────────────────────────────────────────────
app.get('/api/commerciaux', async (req, res) => {
  try {
    const { data: commerciaux, error } = await supabase
      .from('commerciaux')
      .select('*')
      .eq('actif', true)
      .order('nom');
    if (error) throw error;

    const enriched = await Promise.all(commerciaux.map(async c => {
      const now = new Date();
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();

      const [
        { count: nbProspects },
        { data: devisAcceptes },
        { count: nbContrats }
      ] = await Promise.all([
        supabase.from('prospects').select('*', { count: 'exact', head: true }).eq('commercial_id', c.id),
        supabase.from('devis').select('montant_ht').eq('commercial_id', c.id).eq('statut', 'accepté').gte('created_at', startOfMonth),
        supabase.from('devis').select('*', { count: 'exact', head: true }).eq('commercial_id', c.id).eq('statut', 'accepté')
      ]);

      const caMois = (devisAcceptes || []).reduce((s, d) => s + (d.montant_ht || 0), 0);
      return { ...c, nbProspects: nbProspects || 0, caMois, nbContrats: nbContrats || 0 };
    }));

    res.json(enriched);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ─── CATCH-ALL ────────────────────────────────────────────────────────────────
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.listen(PORT, () => {
  console.log(`ForestCRM running on port ${PORT}`);
});
