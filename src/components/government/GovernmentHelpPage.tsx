import React, { useState, useMemo, useEffect } from 'react';

interface HelpItem {
  id: string;
  title: string;
  content: string;
  linkedPage?: string;
}

interface HelpCategory {
  id: string;
  title: string;
  icon: string;
  items: HelpItem[];
}

const helpData: HelpCategory[] = [
  
  {
    id: 'applications',
    title: 'Anträge Bearbeiten',
    icon: '📋',
    items: [
      {
        id: 'navigate-to-applications',
        title: 'Zur Antragsübersicht navigieren',
        content: 'Klicken Sie in der linken Seitenleiste auf "Anträge", um zur Antragsübersicht zu gelangen. Diese Seite zeigt alle Anträge in drei Kategorien: "Neue Anträge", "In Bearbeitung" und "Geprüfte Anträge".',
        linkedPage: 'applications'
      },
      {
        id: 'select-application-tab',
        title: 'Anträge nach Status filtern',
        content: 'In der Antragsübersicht können Sie zwischen drei Tabs wechseln:\n• "Neue Anträge": Noch nicht bearbeitete Anträge\n• "In Bearbeitung": Aktuell bearbeitete Anträge (Status: In Bearbeitung, Dokumente angefragt, Dokumente erhalten)\n• "Geprüfte Anträge": Abgeschlossene Anträge (Status: Bewilligt, Abgelehnt)\n\nKlicken Sie auf den gewünschten Tab, um die entsprechende Kategorie anzuzeigen.',
        linkedPage: 'applications'
      },
      {
        id: 'open-application-review',
        title: 'Antrag zur Bearbeitung öffnen',
        content: 'Klicken Sie auf eine Zeile in der Antragstabelle, um den Antrag zur Bearbeitung zu öffnen, wenn Sie einen Antrag aus der Kategorie "Neue Anträge" ausgewählt haben, wird die Checkliste generiert und der Antrag wird in die Kategorie "In Bearbeitung" verschoben. Das Antragsreview-Fenster öffnet sich mit drei Hauptbereichen:\n• Checkliste (linke Seite): Systematische Überprüfung aller Anforderungen\n• Formulare & Dokumente (rechte Seite): Anzeige und Validierung von Formularen und Dokumenten\n• Aktionspanel (oben): Wichtige Aktionen wie Dokumente anfordern, Antragsteller kontaktieren, etc.',
        linkedPage: 'applications'
      },
      {
        id: 'use-application-filters',
        title: 'Anträge in der Tabelle filtern',
        content: 'In der Antragstabelle können Sie verschiedene Filter verwenden:\n• Antragsnummer: Geben Sie eine Antragsnummer in das Filterfeld ein\n• Datum: Filtern Sie nach Antragsdatum oder letzter Änderung (Format: TT.MM.JJJJ)\n• Fortschritt: Wählen Sie einen Fortschrittsbereich (0-20%, 21-40%, etc.)\n• Status: Filtern Sie nach Bearbeitungsstatus\n• Zugewiesen an: Zeigen Sie nur Anträge eines bestimmten Sachbearbeiters\n• Vorhaben: Filtern Sie nach Fördervariante\n\nDie Filter arbeiten in Echtzeit - geben Sie einfach Text ein oder wählen Sie aus den Dropdown-Menüs. Für die drei Tabs "Neue Anträge", "In Bearbeitung" und "Geprüfte Anträge" sind unterschiedliche Filter verfügbar.',
        linkedPage: 'applications'
      },
      {
        id: 'sort-applications',
        title: 'Anträge sortieren',
        content: 'Klicken Sie auf die Spaltenüberschriften, um die Anträge zu sortieren:\n• Antragsdatum: Sortierung nach Einreichungsdatum\n• Letzte Änderung: Sortierung nach letzter Bearbeitung\n• Prüfungsdatum: Sortierung nach Abschlussdatum (nur bei geprüften Anträgen)\n\nEin Pfeil (↑/↓) zeigt die aktuelle Sortierrichtung an. Klicken Sie erneut, um die Richtung umzukehren.',
        linkedPage: 'applications'
      },
      {
        id: 'search-applications',
        title: 'Anträge suchen',
        content: 'Klicken Sie auf das Lupen-Symbol (🔍) in der oberen rechten Ecke der Antragsübersicht, um die Suchfunktion zu öffnen. Sie können nach folgenden Kriterien suchen:\n• Antragsnummer: Direkte Suche nach Antrags-ID\n• Name: Suche nach Vor- oder Nachname des Hauptantragstellers\n• E-Mail: Suche nach E-Mail-Adresse des Antragstellers\n• Telefon: Suche nach Telefonnummer\n• Adresse: Suche nach Objektadresse (Straße, Hausnummer, PLZ, Stadt)\n\nGeben Sie Ihren Suchbegriff ein und klicken Sie auf "Suchen" oder drücken Sie Enter. Die Suchfunktion scant die Anträge aller Tabs ("Neue Anträge", "In Bearbeitung" und "Geprüfte Anträge") gleichzeitig. Umso spezifischer ihre Eingabe ist, desto schneller wird das Ergebnis angezeigt.',
        linkedPage: 'applications'
      },
      {
        id: 'select-multiple-applications',
        title: 'Mehrere Anträge auswählen',
        content: 'Verwenden Sie die Checkboxen in der ersten Spalte der Tabelle (links von der Antragsnummer):\n• Einzelne Anträge: Aktivieren Sie die Checkbox in der entsprechenden Zeile\n• Alle Anträge: Aktivieren Sie die Checkbox im Tabellenkopf, um alle sichtbaren Anträge auszuwählen\n• Auswahl aufheben: Deaktivieren Sie die Checkboxen, um die Auswahl zu entfernen\n\nAusgewählte Anträge können Sie dann teilen oder zuweisen (siehe entsprechende Hilfe-Items).',
        linkedPage: 'applications'
      },
      {
        id: 'assign-applications',
        title: 'Anträge zuweisen',  
        content: '1. Wählen Sie einen oder mehrere Anträge mit den Checkboxen aus\n2. Klicken Sie auf das Zuweisungs-Symbol (👤) in der oberen rechten Ecke\n3. Wählen Sie im Modal den gewünschten Sachbearbeiter aus\n4. Klicken Sie auf "Zuweisen"\n\nHinweis: Nur Sachbearbeiter mit der Rolle Admin oder Eigentümer können Anträge Team-Mitgliedern zuweisen und Zuweisungen aufheben, um Anträge freizugeben; beim Aufheben, Überschreiben oder Neuzuweisen wird die betroffene Person über die Änderung benachrichtigt, und jeder Sachbearbeiter, auch mit der Rolle Benutzer, kann sich selbst zuweisen.',
        linkedPage: 'applications'
      },
      {
        id: 'share-applications',
        title: 'Anträge mit Team-Mitgliedern teilen',
        content: 'Sie können Anträge entweder in der Antragsübersicht oder im Antragsreview-Fenster mit Team-Mitgliedern teilen.\n\nAntragsübersicht:\n1. Wählen Sie einen oder mehrere Anträge mit den Checkboxen aus.\n2. Klicken Sie auf das Teilen-Symbol (drei Punkte, verbunden durch zwei Linien) in der oberen rechten Ecke.\n3. Wählen Sie die Empfänger aus dem Dropdown-Menü aus.\n4. Fügen Sie optional eine Nachricht hinzu.\n5. Klicken Sie auf \"Teilen\".\n\nAntragsreview-Fenster:\n1. Oberhalb des geöffneten Antrags sehen Sie rechts neben der Fortschrittsanzeige einen blauen Button (\"Dokumente nachfordern\") sowie einen weißen Pfeil daneben. Klicken Sie auf den weißen Pfeil.\n2. Es wird eine Auswahl verschiedener Aktionen angezeigt – wählen Sie \"Antrag teilen\" aus.\n3. Wählen Sie die Empfänger aus dem Dropdown-Menü aus.\n4. Optional können Sie einen oder mehrere Checklistenpunkte auswählen, die Sie teilen möchten.\n5. Fügen Sie optional eine Nachricht hinzu.\n6. Klicken Sie auf \"Teilen\".\n\nDie Empfänger erhalten eine Nachricht in ihrem internen Posteingang und – falls aktiviert – zusätzlich per E-Mail. In der Nachricht sind Links enthalten, die direkt zu den geteilten Anträgen oder Checklistenpunkten führen.',
        linkedPage: 'applications'
      },
      {
        id: 'refresh-applications',
        title: 'Antragsliste aktualisieren',
        content: 'Klicken Sie auf das Aktualisieren-Symbol (🔄) in der oberen rechten Ecke der Antragsübericht, um die Antragsliste zu aktualisieren. Dies lädt die neuesten Daten aus der Datenbank und zeigt alle Änderungen an, die seit dem letzten Laden vorgenommen wurden.',
        linkedPage: 'applications'
      },
      {
        id: 'review-application-checklist',
        title: 'Checkliste verstehen und verwenden',
        content: 'Nach dem Öffnen eines Antrags sehen Sie die Checkliste. Falls diese nicht angezeigt wird, klicken Sie oben rechts auf \"Checkliste\" neben \"Formulare & Dokumente\".\n\nWas ist die Checkliste?\nDie Checkliste wird automatisch basierend auf den im Antrag gemachten Angaben und eingereichten Dokumenten erstellt. Sie unterstützt Sachbearbeiter dabei, den Antrag systematisch zu prüfen. Dazu gehören unter anderem:\n- Automatisch berechnete Ergebnisse (z. B. Einkommenskalkulationen)\n- Prüfpunkte zum Abgleich der Angaben mit eingereichten Nachweisen\n\nWenn Sie einen Checklistenpunkt auswählen, sehen Sie, ob das System Auffälligkeiten gefunden hat. Der Punkt \"Systemstatus\" zeigt an, ob laut den verfügbaren Daten Fehler vorliegen oder die Angaben plausibel sind. Oft wird der Systemstatus jedoch als \"Ungeprüft\" angezeigt – z. B. wenn die App keine automatischen Vergleiche zwischen Nachweisen und Formularangaben durchführen kann. Der Systemstatus dient lediglich als Hilfestellung.\n\nPrüfung durch Sachbearbeiter\nNeben dem Systemstatus finden Sie das Feld \"Prüfung\". Hier wählen Sachbearbeiter ihr Ergebnis:\n- \"Gültig\" → Angaben stimmen mit den Nachweisen überein\n- \"Ungültig\" → Angaben stimmen nicht mit den Nachweisen überein\n\nBeispiel: In der Einkommenserklärung wurde ein Nettoeinkommen von X angegeben. Stimmen die eingereichten Lohnabrechnungen überein, wählen Sie \"Gültig\". Stimmen sie nicht überein, wählen Sie \"Ungültig\".\n\nHinweis: Es ist nicht erforderlich, alle Checklistenpunkte zu bearbeiten, um einen Antrag zu bewilligen oder abzulehnen. Die Checkliste soll lediglich als Leitfaden dienen und die Prüfung in kleinere Unterpunkte gliedern.\n\nWeitere Informationen\nDie Checkliste ist in verschiedene Kategorien unterteilt, z. B. Formular-Vollständigkeit, Einkommensberechnungen oder Dokumentenprüfungen. In der Übersichtsliste sehen Sie neben jedem Checklistenpunkt einen Status:\n- \"Unbearbeitet\" → kein Kommentar und keine Bewertung\n- \"Bearbeitet (grün)\" → als Gültig markiert\n- \"Bearbeitet (rot)\" → als Ungültig markiert\n- \"In Bearbeitung\" → nur ein Kommentar wurde hinzugefügt\n\nKommentare und Fortschritt\nWenn Sie einen Checklistenpunkt auswählen, können Sie Kommentare hinzufügen, um Ihre Entscheidung zu dokumentieren oder Gedanken zu notieren. Markieren Sie einen Punkt als Gültig oder Ungültig, passt sich der Prüffortschritt automatisch an.\n\nVerknüpfte Dokumente\nUnterhalb der Kommentarspalte finden Sie Formulare und Dokumente, die für die Prüfung des gewählten Checklistenpunkts relevant sind. Mit einem Klick öffnen sich diese rechts neben der Checkliste. Es kann immer nur ein Dokument bzw. Formular gleichzeitig angezeigt werden.\n\nNavigation\nWenn Sie einen Punkt aus der Liste ausgewählt haben, sehen Sie unterhalb des Punktes drei Navigationsbuttons:\n- \"Zur Liste\" → schließt den Punkt und zeigt die gesamte Liste an\n- \"Nächster\" → wechselt zum nächsten Checklistenpunkt\n- \"Letzter\" → wechselt zum vorherigen Checklistenpunkt',
        linkedPage: ''
      },
      {
        id: 'add-custom-checklist-item',
        title: 'Eigene Checklisten-Punkte hinzufügen',
        content: 'In der Checkliste können Sie eigene Punkte hinzufügen:\n1. Klicken Sie oberhalb der Checkliste auf \"Neues To-Do hinzufügen\".\n2. Geben Sie einen Titel und eine Beschreibung ein.\n3. Verlinken Sie relevante Dokumente oder Formulare.\n4. Klicken Sie auf \"Hinzufügen\".\n\nEigene Punkte erscheinen in der Sektion \"Benutzerdefinierte To-Dos\" und können wie normale Checklistenpunkte bearbeitet werden. Wenn Sie einen selbst erstellten Checklistenpunkt auswählen, können Sie diesen jederzeit nachträglich ändern – z. B. Fehler eintragen, Titel oder Kommentare anpassen oder verknüpfte Dokumente aktualisieren.',
        linkedPage: ''
      },
      {
        id: 'request-documents',
        title: 'Dokumente nachfordern',
        content: 'Im Antragsreview-Fenster (oben im Aktionspanel):\n1. Klicken Sie auf \"Dokumente nachfordern\".\n2. Wählen Sie den gewünschten Dokumenttyp aus der Liste.\n3. Wählen Sie den Antragsteller aus (z. B. Hauptantragsteller, Mitantragsteller), falls zutreffend.\n4. Fügen Sie optional eine individuelle Nachricht hinzu.\n5. Klicken Sie auf \"Anfrage senden\".\n\nDer Antragsteller erhält eine E-Mail mit der Bitte um Nachreichung der spezifischen Dokumente sowie einen Upload-Link. Sie können mehrere Dokumente gleichzeitig nachfordern. Bestehende offene Anfragen werden angezeigt, wenn Sie erneut auf \"Dokumente nachfordern\" klicken.\n\nSolange offene Anfragen bestehen, lautet der Antragsstatus \"Dokumente angefragt\". Sobald der Antragsteller alle Dokumente eingereicht hat, ändert sich der Status zu \"Dokumente erhalten\".\n\nDie eingereichten Dokumente werden automatisch in der Übersicht \"Formulare & Dokumente\" gespeichert und den relevanten Checklistenpunkten zugeordnet. Außerdem können Sie die neuen Dokumente auch selbst erstellten Checklistenpunkten hinzufügen.\n\nÜber jede Einreichung von angeforderten Dokumenten werden Sie im internen Posteingang sowie optional per E-Mail informiert.',
        linkedPage: ''
      },
      {
        id: 'contact-applicant',
        title: 'Antragsteller kontaktieren',
        content: 'Antragsreview-Fenster:\n1. Oberhalb des geöffneten Antrags sehen Sie rechts neben der Fortschrittsanzeige einen blauen Button (\"Dokumente nachfordern\") sowie einen weißen Pfeil daneben. Klicken Sie auf den weißen Pfeil.\n2. Es wird eine Auswahl verschiedener Aktionen angezeigt – wählen Sie \"Antragsteller kontaktieren\" aus.\n3. Sie können nun entweder die E-Mail-Adresse des Antragstellers kopieren oder eine Nachricht in das Textfeld eintragen, die automatisch an die E-Mail-Adresse des Antragstellers weitergeleitet wird.\n4. Klicken Sie auf \"Nachricht senden\".\n\nWichtig: Antragsteller können auf Nachrichten, die über das System versendet werden, nicht direkt antworten. Falls Sie eine Rückmeldung wünschen, weisen Sie den Antragsteller in Ihrer Nachricht darauf hin, Sie unter Ihrer dienstlichen E-Mail-Adresse oder einer anderen Kontaktmöglichkeit zu erreichen.',
        linkedPage: ''
      },
      {
        id: 'finish-review',
        title: 'Prüfung abschließen',
        content: 'Im Antragsreview-Fenster oberhalb des geöffneten Antrags finden Sie den Button \"Prüfung abschließen\". Dieser wird mit grünem Hintergrund angezeigt, sobald der Prüfungsfortschritt 100% erreicht.\n\nLiegt der Fortschritt unter 100%, sehen Sie rechts neben der Fortschrittsanzeige einen blauen Button (\"Dokumente nachfordern\") sowie einen weißen Pfeil daneben. Klicken Sie auf den weißen Pfeil und wählen Sie \"Prüfung abschließen\" aus der Aktionsliste.\n\nAnschließend sehen Sie eine Zusammenfassung aller Checklistenpunkte und des Prüfstatus. Gehen Sie dann wie folgt vor:\n1. Wählen Sie das Ergebnis: \"Bewilligen\" oder \"Ablehnen\".\n2. Fügen Sie optional eine Begründung hinzu.\n3. Klicken Sie auf \"Entscheidung absenden\".\n\nDer Antragsteller wird automatisch per E-Mail über Ihre Entscheidung informiert.\n\nHinweis: Abgeschlossene Anträge erscheinen im Tab \"Geprüfte Anträge\" und können nicht mehr bearbeitet werden. Falls erforderlich, können Sie die Bearbeitung jedoch wieder aktivieren (siehe entsprechender Hilfepunkt).',
        linkedPage: ''
      },
      {
        id: 'edit-finished-review',
        title: 'Geprüften Antrag erneut bearbeiten',
        content: 'Um einen bereits geprüften Antrag wieder zu bearbeiten, gehen Sie wie folgt vor:\n1. Wählen Sie in der Antragsübersicht einen Antrag aus dem Tab \"Geprüfte Anträge\" aus und öffnen Sie ihn.\n2. Im Antragsreview-Fenster oberhalb des geöffneten Antrags finden Sie den Button \"Erneut prüfen\".\n3. Klicken Sie auf den Button und bestätigen Sie, dass Sie den Antrag erneut bearbeiten möchten.\n\nNach der Bestätigung wechselt der Antrag automatisch in den Status \"In Bearbeitung\" und erscheint wieder im entsprechenden Tab der Antragsübersicht. Ab diesem Zeitpunkt kann er wie gewohnt weiterbearbeitet werden.',
        linkedPage: 'applications'
      },
      {
        id: 'download-application',
        title: 'Antrag herunterladen',
        content: 'Antragsreview-Fenster:\n1. Oberhalb des geöffneten Antrags sehen Sie rechts neben der Fortschrittsanzeige einen blauen Button (\"Dokumente nachfordern\") sowie einen weißen Pfeil daneben. Klicken Sie auf den weißen Pfeil.\n2. Es wird eine Auswahl verschiedener Aktionen angezeigt – wählen Sie \"Antrag herunterladen\" aus.\n3. Sie können nun entweder alle unterschrieben und oder alle eingereichten Dokuemnte herunterladen.\n4. Klicken Sie auf "Herunterladen"\n\nDie Dateien werden als ZIP-Archiv heruntergeladen, dies kann einige Momente dauern.',
        linkedPage: ''
      }
    ]
  },
  {
    id: 'documents',
    title: 'Dokumente & Formulare',
    icon: '📄',
    items: [
      {
        id: 'access-forms-documents-panel',
        title: 'Formulare & Dokumente Panel öffnen',
        content: 'Nach dem Öffnen eines Antrags finden Sie das "Formulare & Dokumente" Panel auf der rechten Seite. Falls es nicht sichtbar ist, klicken Sie auf den "Formulare & Dokumente" Tab oben rechts.',
        linkedPage: ''
      },
      {
        id: 'view-forms',
        title: 'Formulare anzeigen',
        content: 'Im Formulare & Dokumente Panel:\n• Verfügbare Formulare: Hauptantrag, Einkommenserklärung, Selbstauskunft, Haushaltsauskunft, WoFIV-Berechnung, DIN277-Berechnung, Selbsthilfeleistungen\n• Formular öffnen: Klicken Sie auf den Namen des Formulars. Sie können zwei Dokumente oder Formulare gleichzeitig öffnen, um Angaben zu vergleichen.\n• Formular schließen: Klicken Sie auf das X-Symbol oder den "Schließen" Button',
        linkedPage: ''
      },
      {
        id: 'validate-forms',
        title: 'Formulare auf Vollständigkeit prüfen',
        content: 'Beim Öffnen eines Formulars:\n• Automatische Validierung: Das System überprüft automatisch auf fehlende oder fehlerhafte Eingaben\n• Fehleranzeige: Rote Markierungen zeigen problematische Felder an\n• Vollständigkeitsprüfung: klicken Sie auf das rote Ausrufezeichen oberhalb des geöffneten Antrages um alle Fehlerhaften Angaben inerhalb des Formualres anzuzeigen\n• Suchen: Klicken Sie auf den Suchen Button neben dem Ausrufezeichen um nach bestimmten Feldern im Formular zu suchen',
        linkedPage: ''
      },
      {
        id: 'view-documents',
        title: 'Dokumente anzeigen',
        content: 'Im Formulare & Dokumente Panel:\n• Dokumentkategorien: Allgemeine Dokumente, Hauptantragsteller, weitere Haushaltsmitglieder/Mitantragsteller\n• Dokument öffnen: Klicken Sie auf den Namen des Dokuments und wählen Sie "Öffnen"\n• Vorschau: Dokumente werden im eingebetteten Viewer angezeigt. Sie können zwei Dokumente oder Formulare gleichzeitig öffnen, um Angaben zu vergleichen.\n• Vollbild-Modus: Klicken Sie auf "Extern Öffnen", um das Dokument in einem separaten Fenster zu öffnen\n\nWenn Sie ein Dokument aus der Liste auswählen, können Sie auch direkt "In neuem Tab öffnen" wählen, um es in einem separaten Fenster anzuzeigen. Je nach Dateityp kann das Dokument möglicherweise nicht im Browser dargestellt werden.\nZusätzlich können Sie neben "Öffnen" und "In neuem Tab öffnen" auch "Herunterladen" auswählen, um das Dokument direkt herunterzuladen.',
        linkedPage: ''
      },
      {
        id: 'document-categories',
        title: 'Dokumentkategorien verstehen',
        content: 'Dokumente sind in folgende Kategorien unterteilt:\n• Allgemeine Dokumente: Meldebescheinigung, Bauzeichnung, Lageplan, Grundbuchblattkopie, Baugenehmigung, Kaufvertrag, etc.\n• Hauptantragsteller: Lohn-/Gehaltsbescheinigungen, Einkommenssteuerbescheid, Rentenbescheid, etc.\n• Mitantragsteller: Einkommensnachweise für weitere Antragsteller.',
        linkedPage: ''
      },
      {
        id: 'form-sections',
        title: 'Formular-Abschnitte navigieren',
        content: 'Bei komplexen Formularen:\n• Abschnitts-Navigation: Nutzen Sie die Abschnittsüberschriften zur Navigation\n• Scrollen Sie nach links bzw. nach rechts um alle verfügbaren Abschnitte einzusehen (z.B. beim Hauptantrag).',
        linkedPage: ''
      },
      {
        id: 'document-validation-checklist',
        title: 'Dokumente validieren und auf Vollständigkeit prüfen',
        content: 'In der Checkliste (linke Seite) werden automatisch Checklistenpunkte erstellt, die den Sachbearbeitern helfen zu überprüfen, ob die erforderlichen Dokumente vorliegen und mit den in den Formularen gemachten Angaben übereinstimmen.',
        linkedPage: ''
      }
    ]
  },
  {
    id: 'navigation',
    title: 'Navigation & Bedienung',
    icon: '🧭',
    items: [
      {
        id: 'sidebar-navigation',
        title: 'Seitenleiste verwenden',
        content: 'Die linke Seitenleiste enthält die Hauptnavigation:\n• Dashboard: Übersicht mit Statistiken und Charts\n• Anträge: Antragsübersicht und -bearbeitung\n• Nachrichten: Interner Posteingang für Team-Kommunikation\n• Profil: Persönliche Einstellungen und Sicherheit\n• Hilfe: Diese Hilfeseite\n• Abmelden: Beendet die Sitzung\n\nKlicken Sie auf einen Menüpunkt, um zur entsprechenden Seite zu navigieren.',
        linkedPage: 'applications'
      },
      {
        id: 'dashboard-overview',
        title: 'Dashboard verstehen',
        content: 'Das Dashboard (klicken Sie auf "Dashboard" in der Seitenleiste) zeigt:\n• Statistiken: Anzahl neuer, in Bearbeitung befindlicher und abgeschlossener Anträge\n• Charts: Grafische Darstellung der Antragsentwicklung über Zeit\n• Filter: Nach Fördervariante, Zeitraum und anderen Kriterien\n• Zeiträume: 7 Tage, 30 Tage, 90 Tage, 1 Jahr\n• Export: Eine funktion um Daten zu exportieren ist momentan nicht möglich.\n\nNutzen Sie die Filter, um spezifische Zeiträume oder Antragstypen zu analysieren.',
        linkedPage: 'dashboard'
      },
      {
        id: 'application-review-navigation',
        title: 'Im Antragsreview navigieren',
        content: 'Nach dem Öffnen eines Antrags haben Sie drei Hauptbereiche:\n• Checkliste (links): Systematische Überprüfung aller Anforderungen\n• Formulare & Dokumente (rechts): Anzeige und Überprüfung von Formularen und Dokumenten\n• Aktionspanel (oben): Wichtige Aktionen wie Dokumente anfordern, Antragsteller kontaktieren\n\nWechseln Sie zwischen den Bereichen, indem Sie auf die entsprechenden Tabs klicken.',
        linkedPage: ''
      },
      {
        id: 'checklist-navigation',
        title: 'In der Checkliste navigieren',
        content: 'Die Checkliste ist in Sektionen unterteilt:\n• Formular-Vollständigkeit: Überprüfung ausgefüllter Formulare\n• Einkommens-Berechnungen: Prüfung von Einkommensberechnungen\n• Allgemeine Nachweis-Prüfungen: Validierung allgemeiner Dokumente\n• Personenbezogene Nachweis-Prüfungen: Validierung persönlicher Dokumente\n• Zusatzdarlehen-Prüfungen: Überprüfung von Darlehensnachweisen\n• Generale Prüfungen: Weitere Validierungen\n\nKlicken Sie auf Sektionsüberschriften, um sie zu erweitern oder zu minimieren.',
        linkedPage: 'applications'
      },
      {
        id: 'forms-documents-navigation',
        title: 'Im Formulare & Dokumente Panel navigieren',
        content: 'Das Panel zeigt drei Hauptbereiche:\n• Formulare: Hauptantrag, Einkommenserklärung, Selbstauskunft, etc.\n• Dokumente: Organisiert nach Kategorien (Allgemeine Dokumente, Hauptantragsteller, etc.)\n• Unterschriebene Formulare: Diese Dokumente werden basierend auf den digitalen angeben der Antragsteller generiert und den relevanten Antragstellern und Haushaltsmitgliedern zur Unterschrift vorgelegt.',
        linkedPage: 'applications'
      },
      {
        id: 'table-navigation',
        title: 'In der Antragstabelle navigieren',
        content: 'In der Antragsübersicht:\n• Sortieren: Klicken Sie auf Spaltenüberschriften (Antragsdatum, Letzte Änderung, etc.)\n• Filtern: Verwenden Sie die Filterfelder unter den Spaltenüberschriften\n• Auswählen: Aktivieren Sie Checkboxen für einzelne oder alle Anträge\n• Öffnen: Klicken Sie auf eine Tabellenzeile, um den Antrag zu öffnen\n• Aktionen: Nutzen Sie die Aktions-Buttons in der oberen rechten Ecke (Suchen, Teilen, Zuweisen)',
        linkedPage: 'applications'
      },
      {
        id: 'responsive-navigation',
        title: 'Auf verschiedenen Bildschirmgrößen navigieren',
        content: 'Die Anwendung passt sich verschiedenen Bildschirmgrößen an:\n• Desktop: Vollständige Seitenleiste und alle Funktionen sichtbar\n• Tablet: Kompakte Seitenleiste, einige Funktionen in Dropdown-Menüs\n• Seitenleiste ein-/ausblenden: Klicken Sie auf das Hamburger-Menü (☰)\n• Vollbild-Modus: Nutzen Sie Pop-out-Funktionen für bessere Sichtbarkeit',
        linkedPage: 'applications'
      }
    ]
  },
  {
    id: 'profile',
    title: 'Profil Verwalten',
    icon: '👤',
    items: [
      {
        id: 'change-password',
        title: 'Passwort Ändern',
        content: 'Sie können Ihr Passwort ändern, indem Sie in der Seitenleiste \"Profil\" auswählen.\nUnter \"Sicherheit\" finden Sie den Punkt \"Passwort ändern\". Klicken Sie dort auf \"Ändern\" und geben Sie Ihr altes sowie Ihr neues Passwort ein.\n\nFalls Sie Ihr Passwort vergessen haben, kontaktieren Sie bitte unseren Support unter support@fördercheck.nrw',
        linkedPage: 'profile'
      },
      {
        id: 'enable-mfa',
        title: 'Zwei-Faktor-Authentifizierung einrichten',
        content: 'Für mehr Sicherheit empfehlen wir, die Zwei-Faktor-Authentifizierung (MFA) zu aktivieren.\n\n1. Öffnen Sie in der Seitenleiste den Bereich \"Profil\".\n2. Unter \"Sicherheit\" wählen Sie den Punkt \"Zwei-Faktor-Authentifizierung\" und klicken auf \"Aktivieren\".\n3. Installieren Sie eine Authenticator-App wie Google Authenticator oder Microsoft Authenticator. Diese Apps sind kostenlos im App Store (für Apple-Geräte) oder im Google Play Store (für Android-Geräte) verfügbar.\n4. Öffnen Sie nach der Installation die App. Dort haben Sie die Möglichkeit, einen QR-Code zu scannen.\n5. Scannen Sie nun den QR-Code, der Ihnen in der Fördercheck-App angezeigt wird, sobald Sie auf \"Aktivieren\" klicken.\n6. Nach dem Scannen zeigt die Authenticator-App einen 6-stelligen Code an. Geben Sie diesen unter \"Verifizierungscode\" in der Fördercheck-App ein und klicken Sie auf \"Verifizieren und aktivieren\".\n\nSobald MFA erfolgreich aktiviert ist, werden Sie bei jeder erneuten Anmeldung zusätzlich nach einem Verifizierungscode gefragt. Öffnen Sie dafür Ihre Authenticator-App und geben Sie den jeweils angezeigten 6-stelligen Code ein.',
        linkedPage: 'profile'
      },
      {
        id: 'update-profile',
        title: 'Profilinformationen aktualisieren',
        content: 'Ihre persönlichen Informationen finden Sie unter \"Profil\" → \"Persönliche Informationen\".\nHier können Sie Ihren Anzeigenamen anpassen.\nBitte beachten Sie: Ihre E-Mail-Adresse und Ihre Rolle können nicht geändert werden.',
        linkedPage: 'profile'
      },
      {
        id: 'auto-logout',
        title: 'Automatische Abmeldung einrichten',
        content: 'Sie können die automatische Abmeldung konfigurieren, indem Sie in der Seitenleiste \"Profil\" auswählen.\nUnter \"Sicherheit\" finden Sie den Punkt \"Automatische Abmeldung\". Klicken Sie dort auf \"Ändern\" und wählen Sie die gewünschte Abmeldezeit in Minuten.\n\nWenn Sie die automatische Abmeldung deaktivieren möchten, entfernen Sie das Häkchen bei \"Automatische Abmeldung aktivieren\" und klicken anschließend auf \"Einstellungen speichern\".',
        linkedPage: 'profile'
      }
    ]
  },
  {
    id: 'settings',
    title: 'Einstellungen',
    icon: '⚙️',
    items: [
      {
        id: 'notification-settings',
        title: 'Benachrichtigungseinstellungen',
        content: 'Öffnen Sie in der Seitenleiste den Bereich \"Einstellungen\".\nUnter \"Benachrichtigungseinstellungen\" können Sie festlegen, welche Nachrichten aus Ihrem App-Posteingang Sie zusätzlich auch per E-Mail erhalten möchten.\n\nSie haben die Möglichkeit, drei Arten von Nachrichten, die normalerweise nur im internen Posteingang der App erscheinen, auch per E-Mail zu empfangen.\n\nZusätzlich können Sie bestimmen, ob Sie Benachrichtigungen und E-Mails auch zu Anträgen erhalten möchten, die nicht direkt Ihnen zugewiesen sind.',
        linkedPage: 'settings'
      },
      {
        id: 'assignment-rules',
        title: 'Zuweisungsregeln',
        content: 'Als Administrator und Eigentümer können Sie Zuweisungsregeln einrichten, die automatisch festlegen, welcher Sachbearbeiter für bestimmte Antragstypen zuständig ist.\n\nGehen Sie dazu in der Seitenleiste zu \"Einstellungen\" → \"Zuweisungseinstellungen\".\n\n- Sie können einen Filtertyp auswählen, nach dem Anträge automatisch zugewiesen werden sollen:\n  - Fördervariante\n  - Postleitzahl des Förderobjekts\n  - Haushaltsgröße\n  - Beschäftigungsart des Hauptantragstellers\n\n- Für jeden möglichen Wert innerhalb des gewählten Filtertyps können Sie einen Sachbearbeiter aus Ihrem Team festlegen.\n  - Beispiel: Alle Neubauprojekte werden automatisch Sachbearbeiter X zugewiesen.\n\n- Pro Wert kann nur ein Sachbearbeiter ausgewählt werden.\n- Ein Sachbearbeiter kann für mehrere Werte ausgewählt werden.\n- Falls Sie für einen Wert keinen Sachbearbeiter festlegen, werden die betroffenen Anträge nicht automatisch zugewiesen.\n\nDer ausgewählte Sachbearbeiter wird automatisch über alle neu eingereichten Anträge informiert, die dem jeweiligen Wert entsprechen.',
        linkedPage: 'settings'
      },
      {
        id: 'team-management',
        title: 'Sicherheits Übersicht',
        content: 'Als Administrator und Eigentümer können Sie Ihr Team unter "Einstellungen" → "Sicherheits Übersicht" einsehen, Sicherheitshinweise senden und Team-Mitglieder überwachen. Falls Sie auf MFA-Einrichten bzw. Passwort-Erneuerung klicken, können Sie eine Nachricht an das Team-Mitglied senden um diese auf MFA-Einrichten bzw. Passwort-Erneuerung hinzuweisen.',
        linkedPage: 'settings'
      },
      {
        id: 'role-management',
        title: 'Team Rollen verwalten',
        content: 'Öffnen Sie in der Seitenleiste den Bereich \"Einstellungen\".\nUnter \"Eigentümer Einstellungen\" können Sie als Eigentümer die Rollen der restlichen Team-Mitglieder anpassen. So können Sie beispielsweise neue Administratoren bestimmen oder die Rolle eines Team-Mitglieds herunterstufen.',
        linkedPage: 'settings'
      }
    ]
  },
  {
    id: 'troubleshooting',
    title: 'Problemlösung',
    icon: '🔧',
    items: [
      {
        id: 'login-issues',
        title: 'Anmelde-Probleme',
        content: 'Überprüfen Sie zunächst Ihre E-Mail-Adresse und Ihr Passwort. Achten Sie außerdem darauf, dass Sie sich bei der korrekten Stadtverwaltung anmelden.\n\nFalls Sie Ihr Passwort vergessen haben, wenden Sie sich bitte an unseren Support unter support@fördercheck.nrw.\n\nBei Problemen mit der Zwei-Faktor-Authentifizierung (MFA) stellen Sie sicher, dass Sie einen aktiven 6-stelligen Code aus Ihrer Authenticator-App verwenden.\n\nSollten E-Mail-Adresse und Passwort korrekt sein und die Anmeldung dennoch nicht möglich sein, kontaktieren Sie bitte unseren Support, um mögliche Systemprobleme zu melden.',
        linkedPage: ''
      },
      {
        id: 'slow-loading',
        title: 'Langsame Ladezeiten',
        content: 'Überprüfen Sie zunächst Ihre Internetverbindung. Leeren Sie anschließend den Browser-Cache oder versuchen Sie den Zugriff in einem anderen Browser.\n\nEin weiterer Tipp: Schließen Sie alle Tabs, in denen die App geöffnet ist, und rufen Sie Fördercheck.NRW erneut auf.\n\nSollten die Probleme weiterhin bestehen, wenden Sie sich bitte an unseren Support.',
        linkedPage: ''
      },
      {
        id: 'missing-features',
        title: 'Fehlende Funktionen',
        content: 'Manche Funktionen stehen nur Benutzern mit der Rolle Eigentümer oder Administrator zur Verfügung. Ihre aktuelle Rolle können Sie in der Seitenleiste unter \"Profil\" → \"Persönliche Informationen\" einsehen.\n\nBeispiel: Sachbearbeiter mit der Rolle Benutzer können zwar Anträge bearbeiten, jedoch keine Zuweisungsregeln anpassen, Sicherheitshinweise versenden oder Rollen ändern.\n\nFalls bestimmte Funktionen nicht angezeigt werden, kann ein Neuladen der Seite im Browser helfen.',
        linkedPage: 'profile'
      },
      {
        id: 'contact-support',
        title: 'Support kontaktieren',
        content: 'Bei technischen Problemen oder Fragen wenden Sie sich an support@fördercheck.nrw. Beschreiben Sie Ihr Problem detailliert und fügen Sie Screenshots bei, falls möglich.',
        linkedPage: ''
      }
    ]
  }
];

interface GovernmentHelpPageProps {
  onNavigate?: (page: string) => void;
}

const GovernmentHelpPage: React.FC<GovernmentHelpPageProps> = ({ onNavigate }) => {
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [expandedItem, setExpandedItem] = useState<string | null>(null);
  const [showSearchModal, setShowSearchModal] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const handleCategorySelect = (categoryId: string) => {
    setSelectedCategory(selectedCategory === categoryId ? null : categoryId);
    setExpandedItem(null); // Reset expanded item when switching categories
  };

  const handleItemExpand = (itemId: string) => {
    setExpandedItem(expandedItem === itemId ? null : itemId);
  };

  const handleNavigateToPage = (linkedPage: string) => {
    // Navigate to the specific page in the government dashboard
    if (onNavigate) {
      onNavigate(linkedPage);
    } else {
      // Fallback: use postMessage for iframe communication
      if (window.parent && window.parent !== window) {
        window.parent.postMessage({ type: 'navigate', page: linkedPage }, '*');
      } else {
        console.log(`Navigate to: ${linkedPage}`);
      }
    }
  };

  // Search functionality
  const searchResults = useMemo(() => {
    if (!searchQuery.trim()) return [];
    
    const query = searchQuery.toLowerCase();
    const results: Array<{
      category: HelpCategory;
      item: HelpItem;
      matchType: 'title' | 'content';
    }> = [];

    helpData.forEach(category => {
      category.items.forEach(item => {
        const titleMatch = item.title.toLowerCase().includes(query);
        const contentMatch = item.content.toLowerCase().includes(query);
        
        if (titleMatch || contentMatch) {
          results.push({
            category,
            item,
            matchType: titleMatch ? 'title' : 'content'
          });
        }
      });
    });

    // Sort results: title matches first, then content matches
    return results.sort((a, b) => {
      if (a.matchType === 'title' && b.matchType === 'content') return -1;
      if (a.matchType === 'content' && b.matchType === 'title') return 1;
      return 0;
    });
  }, [searchQuery]);

  const handleSearchResultClick = (categoryId: string, itemId: string) => {
    setSelectedCategory(categoryId);
    setExpandedItem(itemId);
    setShowSearchModal(false);
    setSearchQuery('');
  };

  const handleSearchModalOpen = () => {
    setShowSearchModal(true);
    setSearchQuery('');
  };

  const handleSearchModalClose = () => {
    setShowSearchModal(false);
    setSearchQuery('');
  };

  // Keyboard support for search modal
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (!showSearchModal) return;
      
      if (event.key === 'Escape') {
        handleSearchModalClose();
      } else if (event.key === 'Enter' && searchResults.length > 0) {
        event.preventDefault();
        const firstResult = searchResults[0];
        handleSearchResultClick(firstResult.category.id, firstResult.item.id);
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [showSearchModal, searchResults]);

  return (
    <div style={{ maxWidth: 1200, margin: '0 auto', padding: '24px' }}>
      <div style={{ marginBottom: 32 }}>
        <div style={{ 
          display: 'flex', 
          justifyContent: 'space-between', 
          alignItems: 'center',
          marginBottom: 16
        }}>
          <h1 style={{ 
            color: '#064497', 
            fontSize: '2rem', 
            fontWeight: 600, 
            margin: 0
          }}>
            Hilfe & Support
          </h1>
          <button
            onClick={handleSearchModalOpen}
            style={{
              background: '#064497',
              color: '#fff',
              border: 'none',
              borderRadius: 8,
              padding: '12px 20px',
              fontSize: '1rem',
              fontWeight: 500,
              cursor: 'pointer',
              transition: 'background 0.2s ease'
            }}
            onMouseOver={(e) => e.currentTarget.style.background = '#053a7a'}
            onMouseOut={(e) => e.currentTarget.style.background = '#064497'}
          >
            Suchen
          </button>
        </div>
        <p style={{ 
          color: '#666', 
          fontSize: '1.1rem', 
          textAlign: 'left',
          margin: 0
        }}>
          Finden Sie Antworten auf häufige Fragen und lernen Sie, wie Sie die Plattform optimal nutzen
        </p>
      </div>

      {/* Category Cards */}
      <div style={{ 
        display: 'grid', 
        gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', 
        gap: 20, 
        marginBottom: 32 
      }}>
        {helpData.map((category) => (
          <div
            key={category.id}
            onClick={() => handleCategorySelect(category.id)}
            style={{
              background: selectedCategory === category.id ? '#064497' : '#fff',
              color: selectedCategory === category.id ? '#fff' : '#064497',
              border: `2px solid ${selectedCategory === category.id ? '#064497' : '#e0e0e0'}`,
              borderRadius: 12,
              padding: 24,
              cursor: 'pointer',
              transition: 'all 0.2s ease',
              boxShadow: selectedCategory === category.id 
                ? '0 4px 16px rgba(6, 68, 151, 0.3)' 
                : '0 2px 8px rgba(0,0,0,0.06)',
              transform: selectedCategory === category.id ? 'translateY(-2px)' : 'none'
            }}
          >
            <div style={{ 
              display: 'flex', 
              alignItems: 'center', 
              marginBottom: 12 
            }}>
              <span style={{ fontSize: '1.5rem', marginRight: 12 }}>
                {category.icon}
              </span>
              <h3 style={{ 
                margin: 0, 
                fontSize: '1.2rem', 
                fontWeight: 500 
              }}>
                {category.title}
              </h3>
            </div>
            <p style={{ 
              margin: 0, 
              opacity: 0.8,
              fontSize: '0.95rem',
              color: selectedCategory === category.id ? '#fff' : '#000',
            }}>
              {category.items.length} Hilfethemen
            </p>
          </div>
        ))}
      </div>

      {/* Help Items */}
      {selectedCategory && (
        <div style={{
          background: '#fff',
          borderRadius: 12,
          boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
          padding: 24,
          marginBottom: 24
        }}>
                    <div style={{ 
            marginBottom: 24,
            paddingBottom: 16,
            borderBottom: '1px solid #e0e0e0'
          }}>
            <h2 style={{ 
              margin: 0, 
              color: '#064497', 
              fontSize: '1.3rem',
              fontWeight: 500
            }}>
              {helpData.find(c => c.id === selectedCategory)?.title}
            </h2>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {helpData.find(c => c.id === selectedCategory)?.items.map((item) => (
              <div
                key={item.id}
                style={{
                  border: '1px solid #e0e0e0',
                  borderRadius: 8,
                  overflow: 'hidden',
                  transition: 'all 0.2s ease'
                }}
              >
                <button
                  onClick={() => handleItemExpand(item.id)}
                  style={{
                    width: '100%',
                    padding: '16px 20px',
                    background: expandedItem === item.id ? '#f8f9fa' : '#fff',
                    border: 'none',
                    textAlign: 'left',
                    cursor: 'pointer',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    fontSize: '1rem',
                    fontWeight: 500,
                    color: '#333',
                    transition: 'all 0.2s ease'
                  }}
                >
                  <span>{item.title}</span>
                  <span style={{ 
                    fontSize: '1rem',
                    transform: expandedItem === item.id ? 'rotate(180deg)' : 'rotate(0deg)',
                    transition: 'transform 0.2s ease',
                    color: '#666'
                  }}>
                    ▼
                  </span>
                </button>
                
                {expandedItem === item.id && (
                  <div style={{
                    padding: '20px',
                    background: '#f8f9fa',
                    borderTop: '1px solid #e0e0e0'
                  }}>
                    <div style={{ 
                      margin: '0 0 16px 0', 
                      lineHeight: 1.6,
                      color: '#555',
                      whiteSpace: 'pre-line'
                    }}>
                      {item.content}
                    </div>
                    
                    {item.linkedPage && (
                      <button
                        onClick={() => handleNavigateToPage(item.linkedPage!)}
                        style={{
                          background: '#064497',
                          color: '#fff',
                          border: 'none',
                          borderRadius: 6,
                          padding: '8px 16px',
                          fontSize: '0.9rem',
                          fontWeight: 500,
                          cursor: 'pointer',
                          transition: 'background 0.2s ease'
                        }}
                        onMouseOver={(e) => e.currentTarget.style.background = '#053a7a'}
                        onMouseOut={(e) => e.currentTarget.style.background = '#064497'}
                      >
                        Zur entsprechenden Seite →
                      </button>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Contact Support Section */}
      <div style={{
        background: '#f8f9fa',
        borderRadius: 12,
        padding: 24,
        textAlign: 'center'
      }}>
        <h3 style={{ 
          color: '#064497', 
          marginBottom: 12,
          fontSize: '1.1rem',
          fontWeight: 500
        }}>
          Weitere Hilfe benötigt?
        </h3>
        <p style={{ 
          margin: '0 0 16px 0', 
          color: '#666',
          lineHeight: 1.5
        }}>
          Falls Sie hier keine Antwort auf Ihre Frage finden, kontaktieren Sie unseren Support.
        </p>
        <a
          href="mailto:support@fördercheck.nrw"
          style={{
            background: '#064497',
            color: '#fff',
            textDecoration: 'none',
            padding: '12px 24px',
            borderRadius: 6,
            fontSize: '1rem',
            fontWeight: 500,
            display: 'inline-block',
            transition: 'background 0.2s ease'
          }}
          onMouseOver={(e) => e.currentTarget.style.background = '#053a7a'}
          onMouseOut={(e) => e.currentTarget.style.background = '#064497'}
        >
          support@fördercheck.nrw
        </a>
      </div>

      {/* Search Modal */}
      {showSearchModal && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0, 0, 0, 0.5)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000,
          padding: 20
        }}>
          <div style={{
            background: '#fff',
            borderRadius: 12,
            width: '100%',
            maxWidth: 600,
            maxHeight: '80vh',
            display: 'flex',
            flexDirection: 'column',
            boxShadow: '0 8px 32px rgba(0, 0, 0, 0.2)'
          }}>
            {/* Modal Header */}
            <div style={{
              padding: '20px 24px',
              borderBottom: '1px solid #e0e0e0',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center'
            }}>
              <h3 style={{
                margin: 0,
                color: '#064497',
                fontSize: '1.2rem',
                fontWeight: 500
              }}>
                Hilfe durchsuchen
              </h3>
              <button
                onClick={handleSearchModalClose}
                style={{
                  background: 'none',
                  border: 'none',
                  fontSize: '1.25rem',
                  cursor: 'pointer',
                  color: '#666',
                  padding: '4px 8px',
                  borderRadius: 4,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  width: 32,
                  height: 32,
                  transition: 'all 0.2s ease'
                }}
                onMouseOver={(e) => {
                  e.currentTarget.style.background = '#f5f5f5';
                  e.currentTarget.style.color = '#333';
                }}
                onMouseOut={(e) => {
                  e.currentTarget.style.background = 'none';
                  e.currentTarget.style.color = '#666';
                }}
              >
                ×
              </button>
            </div>

            {/* Search Input */}
            <div style={{ padding: '20px 24px' }}>
              <input
                type="text"
                placeholder="Geben Sie Ihre Frage oder ein Stichwort ein..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                style={{
                  width: '100%',
                  padding: '12px 16px',
                  border: '2px solid #e0e0e0',
                  borderRadius: 8,
                  fontSize: '1rem',
                  outline: 'none',
                  transition: 'border-color 0.2s ease'
                }}
                onFocus={(e) => e.target.style.borderColor = '#064497'}
                onBlur={(e) => e.target.style.borderColor = '#e0e0e0'}
                autoFocus
              />
            </div>

            {/* Search Results */}
            <div style={{
              flex: 1,
              overflow: 'auto',
              padding: '0 24px 20px 24px'
            }}>
              {searchQuery.trim() === '' ? (
                <div style={{
                  textAlign: 'center',
                  color: '#666',
                  padding: '40px 20px'
                }}>
                  <p style={{ margin: 0, fontSize: '1rem' }}>
                    Geben Sie ein Stichwort ein, um in der Hilfe zu suchen
                  </p>
                </div>
              ) : searchResults.length === 0 ? (
                <div style={{
                  textAlign: 'center',
                  color: '#666',
                  padding: '40px 20px'
                }}>
                  <p style={{ margin: 0, fontSize: '1rem' }}>
                    Keine Ergebnisse für "{searchQuery}" gefunden
                  </p>
                  <p style={{ margin: '8px 0 0 0', fontSize: '0.9rem', opacity: 0.8 }}>
                    Versuchen Sie andere Suchbegriffe oder durchsuchen Sie die Kategorien
                  </p>
                </div>
              ) : (
                <div>
                  <p style={{
                    margin: '0 0 16px 0',
                    color: '#666',
                    fontSize: '0.9rem'
                  }}>
                    {searchResults.length} Ergebnis{searchResults.length !== 1 ? 'se' : ''} gefunden
                  </p>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    {searchResults.map((result, index) => (
                      <button
                        key={`${result.category.id}-${result.item.id}`}
                        onClick={() => handleSearchResultClick(result.category.id, result.item.id)}
                        style={{
                          background: '#fff',
                          border: '1px solid #e0e0e0',
                          borderRadius: 8,
                          padding: 16,
                          textAlign: 'left',
                          cursor: 'pointer',
                          transition: 'all 0.2s ease',
                          display: 'flex',
                          flexDirection: 'column',
                          gap: 8
                        }}
                        onMouseOver={(e) => {
                          e.currentTarget.style.borderColor = '#064497';
                          e.currentTarget.style.background = '#f8f9fa';
                        }}
                        onMouseOut={(e) => {
                          e.currentTarget.style.borderColor = '#e0e0e0';
                          e.currentTarget.style.background = '#fff';
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                          <span style={{ fontSize: '1.1rem' }}>
                            {result.category.icon}
                          </span>
                          <div style={{ flex: 1 }}>
                            <div style={{
                              fontWeight: 500,
                              color: '#064497',
                              fontSize: '0.95rem',
                              marginBottom: 4
                            }}>
                              {result.item.title}
                            </div>
                            <div style={{
                              fontSize: '0.8rem',
                              color: '#666',
                              fontWeight: 400
                            }}>
                              {result.category.title}
                            </div>
                          </div>
                          <div style={{
                            background: result.matchType === 'title' ? '#f0f4ff' : '#f5f5f5',
                            color: result.matchType === 'title' ? '#064497' : '#666',
                            padding: '3px 8px',
                            borderRadius: 4,
                            fontSize: '0.7rem',
                            fontWeight: 400
                          }}>
                            {result.matchType === 'title' ? 'Titel' : 'Inhalt'}
                          </div>
                        </div>
                        <div style={{
                          fontSize: '0.85rem',
                          color: '#666',
                          lineHeight: 1.4,
                          maxHeight: 40,
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          display: '-webkit-box',
                          WebkitLineClamp: 2,
                          WebkitBoxOrient: 'vertical'
                        }}>
                          {result.item.content}
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default GovernmentHelpPage;
