require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_ANON_KEY
);

async function seed() {
  console.log('🌲 Seeding ForestCRM...');

  // ─── Commerciaux ───────────────────────────────────────────────────────────
  const { data: commerciaux, error: e1 } = await supabase.from('commerciaux').insert([
    { nom: 'Renaud', prenom: 'Thomas', email: 'thomas.renaud@forestcrm.fr', tel: '06 12 34 56 78', region: 'Auvergne-Rhône-Alpes', objectif_mensuel_eur: 80000, avatar_initiales: 'TR', actif: true },
    { nom: 'Dubois', prenom: 'Marie', email: 'marie.dubois@forestcrm.fr', tel: '06 23 45 67 89', region: 'Nouvelle-Aquitaine', objectif_mensuel_eur: 70000, avatar_initiales: 'MD', actif: true },
    { nom: 'Perrin', prenom: 'Julien', email: 'julien.perrin@forestcrm.fr', tel: '06 34 56 78 90', region: 'Grand Est', objectif_mensuel_eur: 60000, avatar_initiales: 'JP', actif: true },
  ]).select();
  if (e1) { console.error('Commerciaux:', e1.message); return; }
  console.log('✓ Commerciaux insérés');

  const [tr, md, jp] = commerciaux;

  // ─── Prospects ─────────────────────────────────────────────────────────────
  const { data: prospects, error: e2 } = await supabase.from('prospects').insert([
    { nom: 'Forêt Privée Martin', type: 'privé', region: 'Auvergne-Rhône-Alpes', departement: 'Isère', surface_ha: 120, tel: '04 76 11 22 33', email: 'martin.foret@gmail.com', contact_nom: 'Henri Martin', commercial_id: tr.id, statut: 'qualifié', score: 4, source: 'Recommandation', notes: 'Grande propriété, très motivé pour une coupe sélective.' },
    { nom: 'GFA Les Cèdres', type: 'GFA', region: 'Nouvelle-Aquitaine', departement: 'Dordogne', surface_ha: 350, tel: '05 53 44 55 66', email: 'contact@gfa-cedres.fr', contact_nom: 'Sophie Lacombe', commercial_id: md.id, statut: 'devis_envoyé', score: 5, source: 'Foire forestière', notes: 'GFA actif, 4 associés. Besoin urgent de coupes.' },
    { nom: 'Commune de Thiers', type: 'collectivité', region: 'Auvergne-Rhône-Alpes', departement: 'Puy-de-Dôme', surface_ha: 85, tel: '04 73 80 10 20', email: 'mairie@thiers.fr', contact_nom: 'Jean-Paul Morin', commercial_id: tr.id, statut: 'négociation', score: 4, source: 'Démarchage', notes: 'Budget voté en conseil municipal. Délais serrés.' },
    { nom: 'ONF Vosges Est', type: 'ONF', region: 'Grand Est', departement: 'Vosges', surface_ha: 2400, tel: '03 29 64 20 10', email: 'vosges-est@onf.fr', contact_nom: 'Isabelle Gruber', commercial_id: jp.id, statut: 'qualifié', score: 3, source: 'Appel d\'offres', notes: 'Grand compte, processus long. À suivre sur 6 mois.' },
    { nom: 'SCI Domaine des Pins', type: 'SCI', region: 'Provence-Alpes-Côte d\'Azur', departement: 'Var', surface_ha: 60, tel: '04 94 33 44 55', email: 'domainedespins@sci.fr', contact_nom: 'Marc Fuentes', commercial_id: md.id, statut: 'à_contacter', score: 2, source: 'Site web', notes: 'Premier contact par formulaire. À qualifier.' },
    { nom: 'Forêt Bourget', type: 'privé', region: 'Grand Est', departement: 'Bas-Rhin', surface_ha: 45, tel: '03 88 12 23 34', email: 'bourget.foret@orange.fr', contact_nom: 'Paul Bourget', commercial_id: jp.id, statut: 'gagné', score: 5, source: 'Recommandation', notes: 'Contrat signé. Chantier planifié.' },
    { nom: 'Coopérative Bois Massif Central', type: 'coopérative', region: 'Auvergne-Rhône-Alpes', departement: 'Haute-Loire', surface_ha: 890, tel: '04 71 55 66 77', email: 'contact@coop-boismc.fr', contact_nom: 'Céline Vidal', commercial_id: tr.id, statut: 'devis_envoyé', score: 4, source: 'Salon forestier', notes: 'Coopérative de 12 membres. Décision collective.' },
    { nom: 'GFA Forêt Landaise', type: 'GFA', region: 'Nouvelle-Aquitaine', departement: 'Landes', surface_ha: 520, tel: '05 58 77 88 99', email: 'gfa-landaise@sfr.fr', contact_nom: 'Robert Dumas', commercial_id: md.id, statut: 'qualifié', score: 5, source: 'Recommandation', notes: 'Pin maritime, 3 coupes à planifier sur 2 ans.' },
    { nom: 'Commune de Gérardmer', type: 'collectivité', region: 'Grand Est', departement: 'Vosges', surface_ha: 310, tel: '03 29 63 00 00', email: 'foret@gerardmer.fr', contact_nom: 'Alain Schmitt', commercial_id: jp.id, statut: 'à_contacter', score: 3, source: 'Démarchage', notes: 'Contacté par courrier. Relance prévue.' },
    { nom: 'Propriété Dumont', type: 'privé', region: 'Bourgogne-Franche-Comté', departement: 'Côte-d\'Or', surface_ha: 78, tel: '03 80 22 33 44', email: 'dumont.foret@wanadoo.fr', contact_nom: 'Françoise Dumont', commercial_id: tr.id, statut: 'perdu', score: 2, source: 'Recommandation', notes: 'A choisi un concurrent local.' },
    { nom: 'ONF Pyrénées', type: 'ONF', region: 'Occitanie', departement: 'Ariège', surface_ha: 1800, tel: '05 61 02 30 00', email: 'pyrenees@onf.fr', contact_nom: 'Laurent Castel', commercial_id: md.id, statut: 'négociation', score: 4, source: 'Appel d\'offres', notes: 'Réponse à appel d\'offres déposée. En attente.' },
    { nom: 'SCI Pinèdes du Sud', type: 'SCI', region: 'Occitanie', departement: 'Gard', surface_ha: 95, tel: '04 66 55 44 33', email: 'pinedes-sud@laposte.net', contact_nom: 'Anne-Marie Blanc', commercial_id: md.id, statut: 'qualifié', score: 3, source: 'Site web', notes: 'Propriété mixte pins/chênes. Intéressée par entretien.' },
    { nom: 'Coopérative Sylva Alsace', type: 'coopérative', region: 'Grand Est', departement: 'Haut-Rhin', surface_ha: 1200, tel: '03 89 41 55 00', email: 'contact@sylva-alsace.fr', contact_nom: 'Georg Müller', commercial_id: jp.id, statut: 'devis_envoyé', score: 5, source: 'Salon forestier', notes: 'Très grande coopérative, fort potentiel commercial.' },
    { nom: 'Forêt Chambon', type: 'privé', region: 'Centre-Val de Loire', departement: 'Creuse', surface_ha: 200, tel: '05 55 61 70 80', email: 'chambon.foret@gmail.com', contact_nom: 'Pierre Chambon', commercial_id: tr.id, statut: 'qualifié', score: 4, source: 'Foire forestière', notes: 'Chênaie de qualité. Projet de coupe sélective.' },
    { nom: 'Commune de Pontarlier', type: 'collectivité', region: 'Bourgogne-Franche-Comté', departement: 'Doubs', surface_ha: 420, tel: '03 81 46 48 00', email: 'foret@pontarlier.fr', contact_nom: 'Sylvie Jacquet', commercial_id: jp.id, statut: 'à_contacter', score: 2, source: 'Démarchage', notes: 'Forêt communale. Dossier à constituer.' },
  ]).select();
  if (e2) { console.error('Prospects:', e2.message); return; }
  console.log('✓ Prospects insérés');

  // ─── Chantiers ─────────────────────────────────────────────────────────────
  const { data: chantiers, error: e3 } = await supabase.from('chantiers').insert([
    { prospect_id: prospects[5].id, nom: 'Coupe Bourget Automne 2025', type: 'coupe_sélective', surface_ha: 28, montant_ht: 42000, statut: 'en_cours', date_debut: '2025-10-15', date_fin_prevue: '2025-12-20', avancement_pct: 65, chef_chantier: 'Marc Tessier', engins: 'Abatteuse Ponsse, Débardeur Komatsu', notes: 'Bonne météo. Rendement supérieur aux prévisions.' },
    { prospect_id: prospects[1].id, nom: 'Éclaircie GFA Cèdres', type: 'éclaircie', surface_ha: 80, montant_ht: 38000, statut: 'démarrage', date_debut: '2026-01-10', date_fin_prevue: '2026-03-30', avancement_pct: 12, chef_chantier: 'Bruno Sauvage', engins: 'Porteur Vimek 608', notes: 'Démarrage retardé suite aux pluies. Terrain instable.' },
    { prospect_id: prospects[2].id, nom: 'Entretien Forêt Communale Thiers', type: 'entretien', surface_ha: 40, montant_ht: 18500, statut: 'en_cours', date_debut: '2025-11-03', date_fin_prevue: '2026-01-15', avancement_pct: 78, chef_chantier: 'Éric Morel', engins: 'Tracteur Fendt 939', notes: 'Travaux d\'élagage en cours. Avancement correct.' },
    { prospect_id: prospects[7].id, nom: 'Coupe Rase Landes Secteur A', type: 'coupe_rase', surface_ha: 120, montant_ht: 96000, statut: 'planifié', date_debut: '2026-02-01', date_fin_prevue: '2026-05-30', avancement_pct: 0, chef_chantier: 'Serge Delmas', engins: 'Abatteuse Tigercat, Débardeur John Deere', notes: 'Accès route forestière à valider avec la mairie.' },
    { prospect_id: prospects[10].id, nom: 'Débardage Pyrénées Parcelle 7', type: 'débardage', surface_ha: 55, montant_ht: 29000, statut: 'retard', date_debut: '2025-09-01', date_fin_prevue: '2025-11-30', avancement_pct: 45, chef_chantier: 'Antoine Rivière', engins: 'Câble aérien Konrad', notes: 'Panne câble aérien. Pièces commandées, reprise prévue semaine prochaine.' },
  ]).select();
  if (e3) { console.error('Chantiers:', e3.message); return; }
  console.log('✓ Chantiers insérés');

  // ─── Devis ─────────────────────────────────────────────────────────────────
  const { data: devis, error: e4 } = await supabase.from('devis').insert([
    { prospect_id: prospects[1].id, commercial_id: md.id, montant_ht: 38000, statut: 'envoyé', date_envoi: '2025-12-01', date_validite: '2026-01-15', notes: 'Devis éclaircie 80ha. Client en réflexion.' },
    { prospect_id: prospects[2].id, commercial_id: tr.id, montant_ht: 18500, statut: 'accepté', date_envoi: '2025-10-20', date_validite: '2025-11-20', notes: 'Accepté avec acompte 30%.' },
    { prospect_id: prospects[5].id, commercial_id: jp.id, montant_ht: 42000, statut: 'accepté', date_envoi: '2025-09-15', date_validite: '2025-10-15', notes: 'Signé. Chantier démarré.' },
    { prospect_id: prospects[6].id, commercial_id: tr.id, montant_ht: 67000, statut: 'envoyé', date_envoi: '2025-12-10', date_validite: '2026-02-10', notes: 'En attente du vote de la coopérative.' },
    { prospect_id: prospects[10].id, commercial_id: md.id, montant_ht: 29000, statut: 'accepté', date_envoi: '2025-08-20', date_validite: '2025-09-20', notes: 'Chantier démarré mais retard prise.' },
    { prospect_id: prospects[12].id, commercial_id: jp.id, montant_ht: 115000, statut: 'envoyé', date_envoi: '2025-12-15', date_validite: '2026-02-28', notes: 'Grand compte. Suivi hebdomadaire.' },
    { prospect_id: prospects[0].id, commercial_id: tr.id, montant_ht: 31000, statut: 'brouillon', notes: 'En cours de rédaction. Métrés à finaliser.' },
    { prospect_id: prospects[7].id, commercial_id: md.id, montant_ht: 96000, statut: 'envoyé', date_envoi: '2025-12-20', date_validite: '2026-03-01', notes: 'Grand projet Landes. Réunion prévue en janvier.' },
  ]).select();
  if (e4) { console.error('Devis:', e4.message); return; }
  console.log('✓ Devis insérés');

  // ─── Activités ─────────────────────────────────────────────────────────────
  const activites = [
    { prospect_id: prospects[0].id, commercial_id: tr.id, type: 'visite', titre: 'Visite terrain Forêt Martin', description: 'Parcours des 120ha. Marquage des arbres à couper identifié.', date_action: '2025-11-15', statut_apres: 'qualifié' },
    { prospect_id: prospects[0].id, commercial_id: tr.id, type: 'appel', titre: 'Appel suivi Martin', description: 'Point sur le projet. Envoi devis prévu semaine prochaine.', date_action: '2025-12-01', statut_apres: 'qualifié' },
    { prospect_id: prospects[1].id, commercial_id: md.id, type: 'devis', titre: 'Envoi devis GFA Cèdres', description: 'Devis éclaircie 80ha envoyé par email + courrier.', date_action: '2025-12-01', statut_apres: 'devis_envoyé' },
    { prospect_id: prospects[1].id, commercial_id: md.id, type: 'relance', titre: 'Relance GFA Cèdres', description: 'Appel de relance. Réunion des associés prévue le 15/01.', date_action: '2025-12-20', statut_apres: 'devis_envoyé' },
    { prospect_id: prospects[2].id, commercial_id: tr.id, type: 'contrat', titre: 'Signature contrat Thiers', description: 'Contrat signé en mairie. Acompte 30% encaissé.', date_action: '2025-10-25', statut_apres: 'gagné' },
    { prospect_id: prospects[3].id, commercial_id: jp.id, type: 'email', titre: 'Email présentation ONF Vosges', description: 'Envoi plaquette commerciale et références chantiers ONF.', date_action: '2025-11-05', statut_apres: 'qualifié' },
    { prospect_id: prospects[3].id, commercial_id: jp.id, type: 'visite', titre: 'Réunion ONF Épinal', description: 'Rencontre avec Isabelle Gruber. Présentation de 3 scénarios.', date_action: '2025-12-03', statut_apres: 'qualifié' },
    { prospect_id: prospects[4].id, commercial_id: md.id, type: 'appel', titre: 'Premier contact SCI Pins', description: 'Appel qualification. Propriétaire intéressé mais hésitant.', date_action: '2025-12-05', statut_apres: 'à_contacter' },
    { prospect_id: prospects[5].id, commercial_id: jp.id, type: 'contrat', titre: 'Signature Bourget', description: 'Contrat coupe sélective signé. Chantier planifié mi-octobre.', date_action: '2025-09-20', statut_apres: 'gagné' },
    { prospect_id: prospects[6].id, commercial_id: tr.id, type: 'devis', titre: 'Devis Coopérative Massif Central', description: 'Devis 67k€ pour coupe rase et reboisement envoyé.', date_action: '2025-12-10', statut_apres: 'devis_envoyé' },
    { prospect_id: prospects[7].id, commercial_id: md.id, type: 'visite', titre: 'Visite Landes Secteur A et B', description: '2 jours de terrain. Cartographie GPS réalisée. Volume estimé 4800m³.', date_action: '2025-11-28', statut_apres: 'qualifié' },
    { prospect_id: prospects[7].id, commercial_id: md.id, type: 'devis', titre: 'Envoi devis Landes', description: 'Devis 96k€ coupe rase 120ha envoyé.', date_action: '2025-12-20', statut_apres: 'devis_envoyé' },
    { prospect_id: prospects[8].id, commercial_id: jp.id, type: 'email', titre: 'Email Gérardmer', description: 'Envoi courrier de présentation suite démarchage postal.', date_action: '2025-12-08', statut_apres: 'à_contacter' },
    { prospect_id: prospects[10].id, commercial_id: md.id, type: 'note', titre: 'Note retard Pyrénées', description: 'Panne câble aérien. Pièces commandées chez Konrad. Reprise +7 jours.', date_action: '2025-11-20', statut_apres: 'négociation' },
    { prospect_id: prospects[11].id, commercial_id: md.id, type: 'appel', titre: 'Qualification SCI Pinèdes', description: 'Appel avec Anne-Marie Blanc. Intéressée par entretien régulier sur 3 ans.', date_action: '2025-12-12', statut_apres: 'qualifié' },
    { prospect_id: prospects[12].id, commercial_id: jp.id, type: 'devis', titre: 'Devis Sylva Alsace', description: 'Devis 115k€ pour gestion pluriannuelle envoyé.', date_action: '2025-12-15', statut_apres: 'devis_envoyé' },
    { prospect_id: prospects[13].id, commercial_id: tr.id, type: 'visite', titre: 'Visite Chênaie Chambon', description: 'Belle propriété. Chênes de 80-120 ans. Fort potentiel pour coupe sélective haut de gamme.', date_action: '2025-12-18', statut_apres: 'qualifié' },
    { prospect_id: prospects[0].id, commercial_id: tr.id, type: 'relance', titre: 'Relance Martin', description: 'Relance téléphonique. Accord de principe pour le projet.', date_action: '2025-12-22', statut_apres: 'qualifié' },
    { prospect_id: prospects[2].id, commercial_id: tr.id, type: 'appel', titre: 'Point avancement Thiers', description: 'Chantier à 78%. Fin prévue 15 janvier. Client satisfait.', date_action: '2025-12-19', statut_apres: 'gagné' },
    { prospect_id: prospects[6].id, commercial_id: tr.id, type: 'relance', titre: 'Relance Coopérative', description: 'Vote de la coopérative le 8 janvier. Devis valide jusqu\'au 10 février.', date_action: '2025-12-28', statut_apres: 'devis_envoyé' },
    { prospect_id: prospects[1].id, commercial_id: md.id, type: 'visite', titre: 'Visite terrain Cèdres', description: 'Validation des pistes d\'accès. Plan d\'intervention finalisé.', date_action: '2025-11-10', statut_apres: 'qualifié' },
    { prospect_id: prospects[5].id, commercial_id: jp.id, type: 'note', titre: 'Compte-rendu chantier Bourget', description: 'Avancement 65%. Qualité bois excellente. Prévision fin décembre.', date_action: '2025-12-10', statut_apres: 'gagné' },
    { prospect_id: prospects[3].id, commercial_id: jp.id, type: 'relance', titre: 'Relance ONF Vosges', description: 'Appel au service technique. Dossier en commission le 20/01.', date_action: '2025-12-22', statut_apres: 'qualifié' },
    { prospect_id: prospects[9].id, commercial_id: tr.id, type: 'note', titre: 'Perte Dumont - Analyse', description: 'Client perdu pour un concurrent 15% moins cher. À noter pour ajustement tarifs.', date_action: '2025-11-30', statut_apres: 'perdu' },
    { prospect_id: prospects[14].id, commercial_id: jp.id, type: 'email', titre: 'Email Pontarlier', description: 'Premier contact par email. Présentation services. Réponse attendue.', date_action: '2025-12-20', statut_apres: 'à_contacter' },
    { prospect_id: prospects[10].id, commercial_id: md.id, type: 'appel', titre: 'Point reprise chantier Pyrénées', description: 'Confirmation reprise lundi. Pièces reçues. Planning réajusté.', date_action: '2025-12-23', statut_apres: 'négociation' },
    { prospect_id: prospects[7].id, commercial_id: md.id, type: 'appel', titre: 'Confirmation réunion Landes', description: 'Réunion confirmée le 8 janvier avec Robert Dumas et ses 3 associés.', date_action: '2025-12-26', statut_apres: 'devis_envoyé' },
    { prospect_id: prospects[12].id, commercial_id: jp.id, type: 'relance', titre: 'Suivi Sylva Alsace', description: 'Appel hebdomadaire. Décision du CA prévue fin janvier.', date_action: '2025-12-29', statut_apres: 'devis_envoyé' },
    { prospect_id: prospects[4].id, commercial_id: md.id, type: 'relance', titre: 'Relance SCI Pins', description: 'Deuxième appel. RDV visite terrain fixé au 10 janvier.', date_action: '2025-12-30', statut_apres: 'à_contacter' },
    { prospect_id: prospects[13].id, commercial_id: tr.id, type: 'email', titre: 'Envoi offre Chambon', description: 'Proposition commerciale préliminaire envoyée. Attente retour.', date_action: '2025-12-28', statut_apres: 'qualifié' },
  ];

  const { error: e5 } = await supabase.from('activites').insert(activites);
  if (e5) { console.error('Activités:', e5.message); return; }
  console.log('✓ Activités insérées');

  console.log('\n🌲 Seed terminé avec succès !');
  console.log(`   ${commerciaux.length} commerciaux`);
  console.log(`   ${prospects.length} prospects`);
  console.log(`   ${chantiers.length} chantiers`);
  console.log(`   ${devis.length} devis`);
  console.log(`   ${activites.length} activités`);
}

seed().catch(console.error);
