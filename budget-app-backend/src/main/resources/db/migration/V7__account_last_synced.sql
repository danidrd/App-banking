-- Traccia quando un conto collegato è stato sincronizzato l'ultima volta
-- (manualmente o dal job automatico) — serve per evitare di interrogare
-- la banca troppo spesso e per mostrare il contesto all'utente prima
-- che tocchi il pulsante "Sincronizza".
ALTER TABLE accounts ADD COLUMN last_synced_at TIMESTAMP;