export default {
  app_title: "GitHub Contribution Painter",
  skip_link: "Aller à l’éditeur",
  language: "Langue",
  settings: "Connexion GitHub",
  token_label: "Jeton GitHub",
  token_create: "Créer un jeton granulaire",
  token_hint:
    "Accordez Contents : lecture et écriture au dépôt cible uniquement. Le jeton reste dans cet onglet et n’est jamais enregistré.",
  repo_label: "Dépôt",
  repo_hint: "Un dépôt existant contenant au moins un commit.",
  email_label: "E-mail du compte GitHub",
  email_check: "Vérifier les adresses confirmées",
  email_hint:
    "Utilisez un e-mail vérifié ; activez si besoin l’affichage des contributions privées dans le profil GitHub.",
  gitname_label: "Nom de l’auteur des commits",
  branch_label: "Branche cible",
  branch_hint:
    "Une branche absente sera créée à partir de la branche par défaut.",
  mult_label: "Multiplicateur de commits",
  range_label: "Variation des commits",
  range_off: "Nombre exact",
  range_plus2: "Random +0..2 per day",
  mult_1: "×1 — minimum",
  mult_5: "×5 — recommandé",
  mult_10: "×10 — saturé",
  year_title: "Canevas",
  year_label: "Année",
  year_hint:
    "Chaque année conserve son dessin. Les dates futures sont en lecture seule.",
  draft_hint:
    "Seuls les dessins sont enregistrés sur cet appareil, jamais les paramètres de connexion ni les jetons.",
  editor_title: "Éditeur de motif",
  intensity: "Intensité",
  level_0: "Effacer (0)",
  level_n: "Intensité {n}",
  level_random: "Intensité aléatoire (5)",
  legend_hint:
    "Touches 0–5 · glisser pour peindre · flèches + espace au clavier",
  graph_label: "Motif de contributions pour {year}",
  cell_label: "{date}, intensité {level}",
  cell_readonly: "{date}, lecture seule",
  days_painted: "Jours peints",
  commits: "Commits prévus",
  period: "Période modifiable",
  no_days: "Aucun jour modifiable",
  btn_undo: "Annuler",
  btn_redo: "Rétablir",
  btn_clear: "Effacer",
  btn_invert: "Inverser",
  btn_fill: "Remplir aléatoirement",
  fill_label: "Pourcentage de remplissage",
  fill_short: "Remplir %",
  btn_import: "Importer JSON",
  btn_export: "Exporter JSON",
  btn_preview: "Aperçu SVG",
  btn_push: "Appliquer sur GitHub",
  btn_resume: "Reprendre la publication",
  btn_cancel: "Arrêter la publication",
  preview_title: "Aperçu du motif",
  preview_hint:
    "Image de l’année sélectionnée. L’export d’image ne crée aucun commit.",
  btn_download_svg: "Télécharger le SVG",
  btn_close: "Fermer",
  publish_title: "Vérifier avant publication",
  publish_target: "Dépôt cible",
  publish_branch: "Branche",
  publish_days: "Jours peints",
  publish_commits: "Commits à créer",
  publish_remaining: "Commits restants",
  publish_period: "Dates des commits",
  publish_warning:
    "Crée de vrais commits aux dates indiquées et remplace contribution-painter.txt sur la branche cible. Les commits existants sont conservés. Utilisez un dépôt ou une branche dédié.",
  publish_note:
    "La publication est séquentielle et peut être longue. Gardez cet onglet ouvert. Vous pouvez arrêter et reprendre tant qu’il reste ouvert. Le graphique GitHub peut être mis à jour plus tard.",
  publish_confirm: "Créer les commits et publier",
  publish_resume_confirm: "Reprendre et publier",
  progress_label: "Progression de publication",
  log_label: "Journal de publication",
  alert_token: "Saisissez un jeton GitHub valide.",
  alert_repo: "Indiquez le dépôt sous owner/name, sans URL.",
  alert_email: "Saisissez un e-mail de compte GitHub valide.",
  alert_branch: "Saisissez un nom de branche Git valide.",
  alert_name: "Le nom de l’auteur ne doit pas contenir de saut de ligne.",
  alert_empty: "Peignez au moins un jour avant de continuer.",
  alert_percent: "Saisissez un pourcentage entre 0 et 100.",
  alert_import:
    "Choisissez un fichier JSON Contribution Painter valide pour une année disponible.",
  alert_file_size: "Fichier trop volumineux. Limite : 64 Ko.",
  status_imported: "Motif importé. Cette modification peut être annulée.",
  status_exported: "Motif exporté.",
  status_draft_failed:
    "Stockage local indisponible. Exportez le dessin avant de fermer cet onglet.",
  status_cancelled:
    "Publication arrêtée. La branche n’est mise à jour qu’à la dernière étape. Reprenez ou vérifiez la branche si la dernière requête a été interrompue.",
  status_finished:
    "Publication terminée. GitHub peut mettre du temps à actualiser le graphique.",
  status_locale_failed: "Impossible de charger cette langue. Réessayez.",
  log_resuming: "Vérification de la branche avant reprise…",
  log_base_branch:
    "Branche cible introuvable. Utilisation de la branche par défaut comme base…",
  log_preparing: "Préparation du fichier et de l’arbre partagés…",
  log_creating:
    "{completed} commits sur {total} créés. La branche n’est pas encore mise à jour.",
  log_updating:
    "Tous les commits sont prêts. Publication de la mise à jour de la branche…",
  log_success: "{total} commits publiés dans {repo}.",
  log_stopped: "Arrêt après {completed} commits sur {total}.",
  error_network:
    "Échec de la requête réseau. Vérifiez la connexion et reprenez.",
  error_timeout:
    "Délai de requête dépassé. La reprise vérifiera la branche sans risque.",
  error_response: "Réponse inattendue de GitHub. Réessayez.",
  error_rate_limit:
    "Limite de l’API GitHub atteinte. Attendez la réinitialisation du quota avant de reprendre.",
  error_auth:
    "GitHub a rejeté le jeton. Vérifiez sa validité et son expiration.",
  error_access:
    "Dépôt ou branche inaccessible. Vérifiez le nom et les permissions du jeton.",
  error_permissions:
    "Le dépôt est archivé ou le jeton ne permet pas l’écriture.",
  error_empty_repo:
    "Initialisez le dépôt avec un commit README avant publication.",
  error_conflict:
    "GitHub a rejeté la mise à jour. Vérifiez la protection et l’état de la branche.",
  error_branch_changed:
    "La branche cible a changé pendant la publication. Aucun push forcé n’a été effectué. Relancez une vérification avant de réessayer.",
  error_quota:
    "Quota API GitHub insuffisant. Réduisez le nombre de commits ou attendez sa réinitialisation.",
  error_http: "Échec de la requête GitHub (HTTP {status}).",
  error_unknown:
    "Erreur inattendue. Le dessin reste disponible dans l’éditeur.",
  footer_star: "Mettre une étoile sur GitHub",
  footer_issues: "GitHub Issues",
  footer_wiki: "Wiki du projet",
  footer_thanks:
    "Si cet outil vous a fait gagner du temps — ⭐ compte beaucoup !",
};
