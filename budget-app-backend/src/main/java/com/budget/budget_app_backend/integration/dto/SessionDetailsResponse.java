package com.budget.budget_app_backend.integration.dto;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import com.fasterxml.jackson.annotation.JsonProperty;

import java.util.List;

/**
 * A differenza di CreateSessionResponse (risposta di POST /sessions, dove
 * "accounts" è una lista di oggetti completi), GET /sessions/{id}
 * restituisce in "accounts" solo un elenco di ID (uid) — verificato sia
 * con lo script Node iniziale sia con questo stesso bug. Due forme
 * diverse per lo stesso nome di campo, altra banca/endpoint che si
 * comporta diversamente da come ci si aspetterebbe.
 */
@JsonIgnoreProperties(ignoreUnknown = true)
public record SessionDetailsResponse(
        @JsonProperty("session_id") String sessionId,
        List<String> accounts,
        String status,
        EnableAspspRef aspsp
) {
}