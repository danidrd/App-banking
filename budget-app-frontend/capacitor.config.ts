import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.budgetapp.mobile',
  appName: 'Budget',
  webDir: 'dist/budget-app-frontend/browser',

  /**
   * Configurazione di SVILUPPO: il backend locale parla http (non https),
   * quindi serviamo l'app con schema http e permettiamo il traffico in
   * chiaro, altrimenti Android bloccherebbe le chiamate come mixed content.
   *
   * Quando un giorno il backend sarà pubblicato dietro HTTPS, questa
   * sezione va rimossa (tornando ai default, che sono più restrittivi).
   *
   * Nota edge-to-edge: in Capacitor 8 la sovrapposizione con le barre di
   * sistema si gestisce via CSS (variabili --safe-area-inset-* iniettate
   * dal plugin core SystemBars, attivo di default) — vedi styles.scss.
   */
  server: {
    androidScheme: 'http',
    cleartext: true,
  },
};

export default config;
