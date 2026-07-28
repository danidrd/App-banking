-- Estensione per generare UUID lato database
CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE users (
    id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email         VARCHAR(255) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    nome          VARCHAR(255) NOT NULL,
    created_at    TIMESTAMP NOT NULL DEFAULT now()
);

CREATE TABLE bank_connections (
    id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id       UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    provider      VARCHAR(100) NOT NULL,
    access_token  TEXT NOT NULL,
    refresh_token TEXT,
    expires_at    TIMESTAMP,
    created_at    TIMESTAMP NOT NULL DEFAULT now()
);
CREATE INDEX idx_bank_connections_user ON bank_connections(user_id);

CREATE TABLE accounts (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id             UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    bank_connection_id  UUID REFERENCES bank_connections(id) ON DELETE SET NULL,
    nome                VARCHAR(255) NOT NULL,
    tipo                VARCHAR(50) NOT NULL,
    saldo               NUMERIC(14,2) NOT NULL DEFAULT 0,
    valuta              VARCHAR(3) NOT NULL DEFAULT 'EUR',
    created_at          TIMESTAMP NOT NULL DEFAULT now()
);
CREATE INDEX idx_accounts_user ON accounts(user_id);
CREATE INDEX idx_accounts_bank_connection ON accounts(bank_connection_id);

CREATE TABLE categories (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id     UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    nome        VARCHAR(100) NOT NULL,
    tipo        VARCHAR(20) NOT NULL CHECK (tipo IN ('ENTRATA', 'USCITA')),
    colore      VARCHAR(7),
    created_at  TIMESTAMP NOT NULL DEFAULT now()
);
CREATE INDEX idx_categories_user ON categories(user_id);

CREATE TABLE transactions (
    id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    account_id   UUID NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
    category_id  UUID REFERENCES categories(id) ON DELETE SET NULL,
    importo      NUMERIC(14,2) NOT NULL,
    descrizione  VARCHAR(500),
    data         DATE NOT NULL,
    ricorrente   BOOLEAN NOT NULL DEFAULT FALSE,
    external_id  VARCHAR(255),
    created_at   TIMESTAMP NOT NULL DEFAULT now()
);
CREATE INDEX idx_transactions_account ON transactions(account_id);
CREATE INDEX idx_transactions_category ON transactions(category_id);
CREATE INDEX idx_transactions_data ON transactions(data);
-- Evita di duplicare la stessa transazione bancaria quando risincronizzi
CREATE UNIQUE INDEX idx_transactions_external_unique
    ON transactions(account_id, external_id)
    WHERE external_id IS NOT NULL;

CREATE TABLE budgets (
    id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id      UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    periodo      VARCHAR(20) NOT NULL,
    data_inizio  DATE NOT NULL,
    data_fine    DATE NOT NULL,
    created_at   TIMESTAMP NOT NULL DEFAULT now()
);
CREATE INDEX idx_budgets_user ON budgets(user_id);

CREATE TABLE budget_lines (
    id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    budget_id    UUID NOT NULL REFERENCES budgets(id) ON DELETE CASCADE,
    category_id  UUID NOT NULL REFERENCES categories(id) ON DELETE CASCADE,
    limite       NUMERIC(14,2) NOT NULL,
    UNIQUE (budget_id, category_id)
);
CREATE INDEX idx_budget_lines_budget ON budget_lines(budget_id);
CREATE INDEX idx_budget_lines_category ON budget_lines(category_id);
