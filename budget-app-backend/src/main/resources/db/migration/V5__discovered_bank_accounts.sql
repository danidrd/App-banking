-- Un conto trovato durante il completamento di un collegamento bancario,
-- salvato così com'era al momento della scoperta. GET /sessions/{id} di
-- Enable Banking restituisce poi solo gli uid dei conti (non i dettagli
-- completi come nome/IBAN/valuta, a differenza di POST /sessions) — li
-- conserviamo qui per non doverli richiedere di nuovo in un formato diverso
-- durante l'importazione.
CREATE TABLE discovered_bank_accounts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    bank_connection_id UUID NOT NULL REFERENCES bank_connections(id) ON DELETE CASCADE,
    external_uid VARCHAR(64) NOT NULL,
    iban VARCHAR(34),
    name VARCHAR(255),
    details VARCHAR(255),
    currency VARCHAR(3),
    UNIQUE (bank_connection_id, external_uid)
);

CREATE INDEX idx_discovered_bank_accounts_connection ON discovered_bank_accounts(bank_connection_id);