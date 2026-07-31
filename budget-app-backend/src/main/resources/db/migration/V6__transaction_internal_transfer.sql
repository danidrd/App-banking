-- Marca le transazioni che sono in realtà spostamenti tra due conti dello
-- stesso utente (entrambi collegati via Open Banking), non vere spese o
-- entrate esterne. Non le cancelliamo: restano visibili nell'elenco, ma
-- vanno escluse dai calcoli di spesa (dashboard, budget).
ALTER TABLE transactions ADD COLUMN trasferimento_interno BOOLEAN NOT NULL DEFAULT FALSE;