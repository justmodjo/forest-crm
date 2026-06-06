# ForestCRM 🌲

CRM complet pour le secteur forestier — prospects, pipeline, chantiers, activités et équipe commerciale.

## Stack

- **Backend** : Node.js + Express
- **Base de données** : Supabase (PostgreSQL)
- **Frontend** : HTML/CSS/JS vanilla
- **Déploiement** : Railway

---

## Installation locale

```bash
git clone https://github.com/justmodjo/forest-crm.git
cd forest-crm
npm install
cp .env.example .env
# Remplir SUPABASE_URL et SUPABASE_ANON_KEY dans .env
npm run dev
```

---

## Supabase — Créer les tables

Exécutez ce SQL dans l'éditeur SQL Supabase :

```sql
create table commerciaux (
  id uuid primary key default gen_random_uuid(),
  nom text not null,
  prenom text not null,
  email text,
  tel text,
  region text,
  objectif_mensuel_eur numeric default 0,
  avatar_initiales text,
  actif boolean default true,
  created_at timestamptz default now()
);

create table prospects (
  id uuid primary key default gen_random_uuid(),
  nom text not null,
  type text check (type in ('privé','collectivité','GFA','ONF','SCI','coopérative')),
  region text,
  departement text,
  surface_ha numeric,
  tel text,
  email text,
  contact_nom text,
  commercial_id uuid references commerciaux(id),
  statut text default 'à_contacter' check (statut in ('à_contacter','qualifié','devis_envoyé','négociation','gagné','perdu')),
  score int check (score between 1 and 5),
  source text,
  notes text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table chantiers (
  id uuid primary key default gen_random_uuid(),
  prospect_id uuid references prospects(id),
  nom text not null,
  type text check (type in ('coupe_rase','coupe_sélective','débardage','reboisement','éclaircie','entretien')),
  surface_ha numeric,
  montant_ht numeric,
  statut text default 'planifié' check (statut in ('planifié','démarrage','en_cours','finalisation','terminé','retard')),
  date_debut date,
  date_fin_prevue date,
  avancement_pct int default 0,
  chef_chantier text,
  engins text,
  notes text,
  created_at timestamptz default now()
);

create table activites (
  id uuid primary key default gen_random_uuid(),
  prospect_id uuid references prospects(id),
  commercial_id uuid references commerciaux(id),
  type text check (type in ('appel','email','visite','devis','contrat','relance','note')),
  titre text not null,
  description text,
  date_action date default current_date,
  statut_apres text,
  created_at timestamptz default now()
);

create table devis (
  id uuid primary key default gen_random_uuid(),
  prospect_id uuid references prospects(id),
  commercial_id uuid references commerciaux(id),
  montant_ht numeric,
  statut text default 'brouillon' check (statut in ('brouillon','envoyé','accepté','refusé')),
  date_envoi date,
  date_validite date,
  notes text,
  created_at timestamptz default now()
);
```

---

## Seed — Données de démonstration

```bash
npm run seed
```

Insère 3 commerciaux, 15 prospects, 5 chantiers, 8 devis et 30 activités.

---

## Déploiement Railway

1. Créer un projet sur [railway.app](https://railway.app)
2. Connecter le repo `justmodjo/forest-crm`
3. Variables d'environnement à ajouter dans Railway :
   ```
   SUPABASE_URL=https://xxx.supabase.co
   SUPABASE_ANON_KEY=eyJ...
   PORT=3000
   ```
4. Railway détecte automatiquement Node.js et lance `npm start`

---

## Routes API

| Méthode | Route | Description |
|---------|-------|-------------|
| GET | `/api/stats` | KPIs dashboard |
| GET | `/api/prospects` | Liste des prospects |
| POST | `/api/prospects` | Créer un prospect |
| PATCH | `/api/prospects/:id` | Modifier un prospect |
| GET | `/api/pipeline` | Vue pipeline Kanban |
| GET | `/api/chantiers` | Liste des chantiers |
| POST | `/api/chantiers` | Créer un chantier |
| PATCH | `/api/chantiers/:id` | Modifier un chantier |
| GET | `/api/activites` | Liste des activités |
| POST | `/api/activites` | Créer une activité |
| GET | `/api/devis` | Liste des devis |
| POST | `/api/devis` | Créer un devis |
| PATCH | `/api/devis/:id` | Modifier un devis |
| GET | `/api/commerciaux` | Liste + stats commerciaux |
