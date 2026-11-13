export default {
  app_title: "GitHub Contribution Painter",
  skip_link: "Zum Editor springen",
  language: "Sprache",
  settings: "GitHub-Verbindung",
  token_label: "GitHub-Token",
  token_create: "Fein abgestuften Token erstellen",
  token_hint:
    "Contents: Lesen und Schreiben nur für das Zielrepository erlauben. Der Token bleibt in diesem Tab und wird nicht gespeichert.",
  repo_label: "Repository",
  repo_hint: "Vorhandenes Repository mit mindestens einem Commit.",
  email_label: "E-Mail des GitHub-Kontos",
  email_check: "Bestätigte E-Mail-Adressen prüfen",
  email_hint:
    "Eine bestätigte E-Mail verwenden; bei Bedarf private Beiträge im GitHub-Profil anzeigen lassen.",
  gitname_label: "Name des Commit-Autors",
  branch_label: "Zielbranch",
  branch_hint: "Ein fehlender Branch wird vom Standardbranch aus erstellt.",
  mult_label: "Commit-Multiplikator",
  range_label: "Commit-Streuung",
  range_off: "Exakte Anzahl",
  range_plus2: "Random +0..2 per day",
  mult_1: "×1 — minimal",
  mult_5: "×5 — empfohlen",
  mult_10: "×10 — gesättigt",
  year_title: "Zeichenfläche",
  year_label: "Jahr",
  year_hint:
    "Jedes Jahr behält seine eigene Zeichnung. Zukünftige Daten sind schreibgeschützt.",
  draft_hint:
    "Nur Zeichnungen werden auf diesem Gerät gespeichert. Verbindungsdaten und Token nicht.",
  editor_title: "Muster-Editor",
  intensity: "Intensität",
  level_0: "Löschen (0)",
  level_n: "Intensität {n}",
  level_random: "Zufällige Intensität (5)",
  legend_hint: "Tasten 0–5 · zum Malen ziehen · Pfeiltasten + Leertaste",
  graph_label: "Beitragsmuster für {year}",
  cell_label: "{date}, Intensität {level}",
  cell_readonly: "{date}, schreibgeschützt",
  days_painted: "Bemalte Tage",
  commits: "Geplante Commits",
  period: "Bearbeitbarer Zeitraum",
  no_days: "Keine bearbeitbaren Tage",
  btn_undo: "Rückgängig",
  btn_redo: "Wiederholen",
  btn_clear: "Leeren",
  btn_invert: "Invertieren",
  btn_fill: "Zufällig füllen",
  fill_label: "Füllprozentsatz",
  fill_short: "Füllen %",
  btn_import: "JSON importieren",
  btn_export: "JSON exportieren",
  btn_preview: "SVG-Vorschau",
  btn_push: "Auf GitHub anwenden",
  btn_resume: "Veröffentlichen fortsetzen",
  btn_cancel: "Veröffentlichen stoppen",
  preview_title: "Mustervorschau",
  preview_hint:
    "Ein Bild des ausgewählten Jahres. Beim Bildexport werden keine Commits erstellt.",
  btn_download_svg: "SVG herunterladen",
  btn_close: "Schließen",
  publish_title: "Vor dem Veröffentlichen prüfen",
  publish_target: "Zielrepository",
  publish_branch: "Branch",
  publish_days: "Bemalte Tage",
  publish_commits: "Zu erstellende Commits",
  publish_remaining: "Verbleibende Commits",
  publish_period: "Commit-Daten",
  publish_warning:
    "Erstellt echte Commits mit den angezeigten Daten und ersetzt contribution-painter.txt im Zielbranch. Vorhandene Commits bleiben erhalten. Ein eigenes Repository oder einen eigenen Branch verwenden.",
  publish_note:
    "Die Veröffentlichung läuft sequenziell und kann lange dauern. Diesen Tab geöffnet lassen. Solange der Tab geöffnet ist, kann die Veröffentlichung gestoppt und fortgesetzt werden. Der GitHub-Graph wird möglicherweise erst später aktualisiert.",
  publish_confirm: "Commits erstellen und veröffentlichen",
  publish_resume_confirm: "Fortsetzen und veröffentlichen",
  progress_label: "Veröffentlichungsfortschritt",
  log_label: "Veröffentlichungsprotokoll",
  alert_token: "Einen gültigen GitHub-Token eingeben.",
  alert_repo: "Repository als owner/name ohne URL eingeben.",
  alert_email: "Eine gültige GitHub-E-Mail eingeben.",
  alert_branch: "Einen gültigen Git-Branchnamen eingeben.",
  alert_name: "Der Autorenname darf keine Zeilenumbrüche enthalten.",
  alert_empty: "Zuerst mindestens einen Tag bemalen.",
  alert_percent: "Einen Prozentsatz zwischen 0 und 100 eingeben.",
  alert_import:
    "Eine gültige Contribution-Painter-JSON-Datei für ein verfügbares Jahr wählen.",
  alert_file_size: "Die Datei ist zu groß. Maximal 64 KB.",
  status_imported:
    "Muster importiert. Die Änderung kann rückgängig gemacht werden.",
  status_exported: "Muster exportiert.",
  status_draft_failed:
    "Lokaler Speicher ist nicht verfügbar. Die Zeichnung vor dem Schließen exportieren.",
  status_cancelled:
    "Veröffentlichung gestoppt. Der Branch wird erst im letzten Schritt aktualisiert. Fortsetzen oder den Branch prüfen, falls die letzte Anfrage unterbrochen wurde.",
  status_finished:
    "Veröffentlichung abgeschlossen. GitHub aktualisiert den Graphen möglicherweise verzögert.",
  status_locale_failed:
    "Sprache konnte nicht geladen werden. Erneut versuchen.",
  log_resuming: "Branch wird vor dem Fortsetzen geprüft…",
  log_base_branch:
    "Zielbranch nicht gefunden. Standardbranch wird als Basis verwendet…",
  log_preparing: "Gemeinsame Datei und Baum werden vorbereitet…",
  log_creating:
    "{completed} von {total} Commits erstellt. Der Branch wurde noch nicht aktualisiert.",
  log_updating: "Alle Commits sind bereit. Branch-Update wird veröffentlicht…",
  log_success: "{total} Commits in {repo} veröffentlicht.",
  log_stopped: "Nach {completed} von {total} Commits gestoppt.",
  error_network:
    "Netzwerkanfrage fehlgeschlagen. Verbindung prüfen und fortsetzen.",
  error_timeout:
    "Zeitüberschreitung. Beim Fortsetzen wird der Branch sicher geprüft.",
  error_response: "Unerwartete Antwort von GitHub. Erneut versuchen.",
  error_rate_limit:
    "GitHub-API-Limit erreicht. Vor dem Fortsetzen auf das Zurücksetzen des Kontingents warten.",
  error_auth:
    "GitHub hat den Token abgelehnt. Gültigkeit und Ablaufdatum prüfen.",
  error_access:
    "Repository oder Branch nicht zugänglich. Namen und Token-Berechtigungen prüfen.",
  error_permissions:
    "Das Repository ist archiviert oder der Token erlaubt kein Schreiben.",
  error_empty_repo:
    "Das Repository zuerst mit einem README-Commit initialisieren.",
  error_conflict:
    "GitHub hat das Update abgelehnt. Branchschutz und Repositoryzustand prüfen.",
  error_branch_changed:
    "Der Zielbranch wurde während der Veröffentlichung geändert. Es wurde kein Force-Push ausgeführt. Vor einem neuen Versuch die Prüfung erneut starten.",
  error_quota:
    "GitHub-API-Kontingent reicht nicht aus. Commit-Anzahl reduzieren oder auf das Zurücksetzen warten.",
  error_http: "GitHub-Anfrage fehlgeschlagen (HTTP {status}).",
  error_unknown:
    "Unerwarteter Fehler. Die Zeichnung ist weiterhin im Editor verfügbar.",
  footer_star: "Stern auf GitHub",
  footer_issues: "GitHub Issues",
  footer_wiki: "Projekt-Wiki",
  footer_thanks: "Wenn dieses Tool dir Zeit gespart hat — ⭐ bedeutet viel!",
};
