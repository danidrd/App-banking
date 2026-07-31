import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import {
  Aspsp,
  BankConnectionSummary,
  CompleteConnectionResponse,
  ImportedAccount,
} from '../models-integration';

@Injectable({ providedIn: 'root' })
export class IntegrationService {
  private http = inject(HttpClient);

  listAspsps(country: string): Observable<Aspsp[]> {
    return this.http.get<Aspsp[]>('/api/integration/aspsps', { params: { country } });
  }

  startConnection(aspspName: string, aspspCountry: string): Observable<{ authorizationUrl: string }> {
    return this.http.post<{ authorizationUrl: string }>('/api/integration/connections', {
      aspspName,
      aspspCountry,
    });
  }

  completeConnection(code: string, state: string): Observable<CompleteConnectionResponse> {
    return this.http.post<CompleteConnectionResponse>('/api/integration/connections/complete', {
      code,
      state,
    });
  }

  importAccounts(bankConnectionId: string, selectedUids: string[]): Observable<ImportedAccount[]> {
    return this.http.post<ImportedAccount[]>(
      `/api/integration/connections/${bankConnectionId}/import`,
      { selectedUids }
    );
  }

  /** Sincronizza manualmente un conto già collegato: nuove transazioni + saldo aggiornato. */
  syncAccount(accountId: string): Observable<{ imported: number }> {
    return this.http.post<{ imported: number }>(`/api/integration/accounts/${accountId}/sync`, {});
  }

  listConnections(): Observable<BankConnectionSummary[]> {
    return this.http.get<BankConnectionSummary[]>('/api/integration/connections');
  }

  disconnectBank(connectionId: string): Observable<{ messaggio: string }> {
    return this.http.post<{ messaggio: string }>(
      `/api/integration/connections/${connectionId}/disconnect`,
      {}
    );
  }
}
