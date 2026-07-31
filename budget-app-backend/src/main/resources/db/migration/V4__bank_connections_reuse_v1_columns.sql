-- V3 aveva aggiunto colonne nuove (aspsp_name, session_id, valid_until)
-- senza accorgersi che bank_connections aveva già da V1 colonne
-- equivalenti con altri nomi (provider, access_token, expires_at) — e
-- "provider", essendo NOT NULL senza default, faceva fallire ogni
-- inserimento perché il codice non la valorizzava mai (popolava solo
-- la colonna nuova aspsp_name).
--
-- Qui rimuoviamo la ridondanza: riusiamo le colonne originali di V1
-- (vedi i commenti in BankConnection.java per la mappatura esatta Java
-- <-> colonna). Teniamo aspsp_country e status, quelle sì genuinamente
-- nuove, introdotte comunque da V3.
ALTER TABLE bank_connections DROP COLUMN aspsp_name;
ALTER TABLE bank_connections DROP COLUMN session_id;
ALTER TABLE bank_connections DROP COLUMN valid_until;