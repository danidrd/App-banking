/**
 * Dove vive il backend quando l'app gira come app nativa (Capacitor).
 *
 * - EMULATORE Android: 10.0.2.2 è l'alias con cui l'emulatore raggiunge
 *   il localhost del tuo PC. Il valore qui sotto funziona senza modifiche.
 *
 * - TELEFONO FISICO: sostituisci con l'IP del tuo PC nella rete locale,
 *   es. 'http://192.168.1.42:8080' (lo trovi con `ipconfig`, voce IPv4,
 *   della scheda Wi-Fi). PC e telefono devono stare sulla stessa rete.
 *
 * Nel browser (ng serve) questo valore non viene mai usato: le chiamate
 * restano relative a /api e passano dal proxy di sviluppo.
 */
export const MOBILE_API_HOST = 'https://api.budget-app.org';
