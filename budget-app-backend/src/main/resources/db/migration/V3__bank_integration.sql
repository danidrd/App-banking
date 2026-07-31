-- NOTA: presumiamo che bank_connections abbia già da V1 le colonne base
-- (id, user_id, created_at). Se la tua V1 usa nomi diversi, segnalalo
-- prima di applicare questa migrazione: qui aggiungiamo solo le colonne
-- necessarie all'integrazione con Enable Banking.

ALTER TABLE bank_connections ADD COLUMN aspsp_name VARCHAR(255);
ALTER TABLE bank_connections ADD COLUMN aspsp_country VARCHAR(2);
ALTER TABLE bank_connections ADD COLUMN session_id VARCHAR(64);
ALTER TABLE bank_connections ADD COLUMN status VARCHAR(20) NOT NULL DEFAULT 'ACTIVE';
ALTER TABLE bank_connections ADD COLUMN valid_until TIMESTAMP;

-- Un conto reale collegato via Open Banking ha un identificativo stabile
-- (external_uid, es. lo "uid" di Enable Banking) che usiamo per la
-- sincronizzazione; l'IBAN è nullable perché gli "Spaces"/sotto-conti
-- (es. i vault di N26) non ne hanno uno.
ALTER TABLE accounts ADD COLUMN external_uid VARCHAR(64);
ALTER TABLE accounts ADD COLUMN external_iban VARCHAR(34);

-- Collegamento "in sospeso": creata quando l'utente avvia l'autorizzazione
-- verso una banca, usata per far combaciare il ritorno (code + state) con
-- l'utente e la banca giusti. Vita breve: scade dopo pochi minuti.
CREATE TABLE pending_bank_connections (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    state_token VARCHAR(64) NOT NULL UNIQUE,
    aspsp_name VARCHAR(255) NOT NULL,
    aspsp_country VARCHAR(2) NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT now(),
    expires_at TIMESTAMP NOT NULL
);

CREATE INDEX idx_pending_bank_connections_state ON pending_bank_connections(state_token);