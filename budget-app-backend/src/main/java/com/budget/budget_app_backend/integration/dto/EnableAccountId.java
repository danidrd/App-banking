package com.budget.budget_app_backend.integration.dto;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;

/**
 * iban è null per i sotto-conti/Spaces senza IBAN proprio (es. i vault N26).
 *
 * Il campo "other" dello standard Berlin Group NON è incluso qui: in teoria
 * dovrebbe essere un semplice testo, ma su alcuni conti (visto con isybank)
 * arriva come oggetto annidato — e comunque non ci serve. @JsonIgnoreProperties
 * fa sì che qualunque campo che non conosciamo (questo compreso, o futuri
 * campi con forma imprevista) venga ignorato invece di far fallire l'intero
 * parsing della risposta.
 */
@JsonIgnoreProperties(ignoreUnknown = true)
public record EnableAccountId(
        String iban
) {
}