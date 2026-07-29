/**
 * Modelli allineati ai DTO del backend Spring.
 * Se cambi un DTO lato Java, aggiorna anche qui.
 */

export interface AuthResponse {
  token: string;
  email: string;
  nome: string;
}

export interface AuthUser {
  email: string;
  nome: string;
}

export interface Account {
  id: string;
  nome: string;
  tipo: string;
  saldo: number;
  valuta: string;
  bankConnectionId: string | null;
  createdAt: string;
}

/** Corpo di POST /api/accounts — coerente con CreateAccountRequest lato Java */
export interface CreateAccountPayload {
  nome: string;
  tipo: string;
  saldo: number;
  valuta: string;
}

/** Corpo di PUT /api/accounts/{id} — il saldo non è modificabile da qui (scelta di design) */
export interface UpdateAccountPayload {
  nome: string;
  tipo: string;
  valuta: string;
}

export type CategoryType = 'ENTRATA' | 'USCITA';

export interface Category {
  id: string;
  nome: string;
  tipo: CategoryType;
}

/** Corpo di POST/PUT /api/categories — coerente con Create/UpdateCategoryRequest lato Java */
export interface CategoryPayload {
  nome: string;
  tipo: CategoryType;
}

export interface Transaction {
  id: string;
  accountId: string;
  categoryId: string | null;
  importo: number;
  descrizione: string | null;
  data: string;
  ricorrente: boolean;
  createdAt: string;
}

/** Corpo di POST /api/transactions — importo già firmato (negativo = uscita) */
export interface CreateTransactionPayload {
  accountId: string;
  categoryId: string | null;
  importo: number;
  descrizione: string | null;
  data: string;
  ricorrente: boolean;
}

/** Corpo di PUT /api/transactions/{id} — il conto non è modificabile (scelta di design) */
export interface UpdateTransactionPayload {
  categoryId: string | null;
  importo: number;
  descrizione: string | null;
  data: string;
  ricorrente: boolean;
}

export interface BudgetLine {
  id: string;
  categoryId: string;
  limite: number;
}

export interface Budget {
  id: string;
  periodo: string;
  dataInizio: string;
  dataFine: string;
  createdAt: string;
  righe: BudgetLine[];
}

/** Riga inviata in creazione/modifica budget — coerente con BudgetLineRequest lato Java */
export interface BudgetLinePayload {
  categoryId: string;
  limite: number;
}

/** Corpo di POST/PUT /api/budgets — l'update sostituisce integralmente le righe */
export interface BudgetPayload {
  periodo: string;
  dataInizio: string;
  dataFine: string;
  righe: BudgetLinePayload[];
}

/** Corpo standard degli errori del GlobalExceptionHandler */
export interface ApiError {
  errore: string;
}
