export interface Aspsp {
  name: string;
  country: string;
}

export interface DiscoveredAccount {
  uid: string;
  name: string | null;
  details: string | null;
  product: string | null;
  currency: string;
  account_id: {
    iban: string | null;
  } | null;
}

export interface CompleteConnectionResponse {
  bankConnectionId: string;
  accounts: DiscoveredAccount[];
}

export interface ImportedAccount {
  id: string;
  nome: string;
  tipo: string;
  saldo: number;
  valuta: string;
}

export interface BankConnectionSummary {
  id: string;
  aspspName: string;
  aspspCountry: string;
  status: 'ACTIVE' | 'EXPIRED' | 'REVOKED';
  validUntil: string | null;
  linkedAccountNames: string[];
}
