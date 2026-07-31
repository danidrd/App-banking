package com.budget.budget_app_backend.integration;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.security.KeyFactory;
import java.security.PrivateKey;
import java.security.Signature;
import java.security.spec.PKCS8EncodedKeySpec;
import java.time.Instant;
import java.util.Base64;

/**
 * Genera i JWT RS256 richiesti da ogni chiamata all'API di Enable Banking.
 *
 * Stessa struttura del client JS ufficiale (enablebanking-api-samples,
 * js_example/utils.js: getJWT), con una differenza intenzionale: qui
 * usiamo Base64url senza padding su tutti e tre i segmenti, come richiede
 * lo standard JWT (RFC 7519) — il client JS di riferimento usa Base64
 * "normale" con una rimozione del padding non del tutto corretta per
 * header/payload. Non l'abbiamo replicata: un'implementazione conforme
 * allo standard è più robusta ed è comunque accettata da qualunque
 * server JWT scritto correttamente.
 *
 * Header e payload sono costruiti a mano (niente Jackson/ObjectMapper):
 * sono solo 3-4 campi a forma fissa, non vale la pena tirarsi dietro una
 * libreria di serializzazione per così poco — ed evita ogni ambiguità
 * con la transizione Jackson 2 → Jackson 3 introdotta da Spring Boot 4.
 * applicationId è sempre un UUID, quindi non serve escaping JSON.
 */
@Service
public class EnableBankingJwtService {

    private final String applicationId;
    private final PrivateKey privateKey;

    public EnableBankingJwtService(
            @Value("${app.enablebanking.application-id}") String applicationId,
            @Value("${app.enablebanking.private-key-path}") String privateKeyPath) throws Exception {
        this.applicationId = applicationId;
        this.privateKey = loadPrivateKey(privateKeyPath);
    }

    /** Genera un JWT valido per la durata indicata (in secondi). */
    public String generateJwt(int validitySeconds) {
        try {
            long now = Instant.now().getEpochSecond();

            String header = String.format(
                    "{\"typ\":\"JWT\",\"alg\":\"RS256\",\"kid\":\"%s\"}", applicationId);
            String payload = String.format(
                    "{\"iss\":\"enablebanking.com\",\"aud\":\"api.enablebanking.com\",\"iat\":%d,\"exp\":%d}",
                    now, now + validitySeconds);

            String encodedHeader = base64UrlEncode(header.getBytes(StandardCharsets.UTF_8));
            String encodedPayload = base64UrlEncode(payload.getBytes(StandardCharsets.UTF_8));
            String signingInput = encodedHeader + "." + encodedPayload;

            Signature signature = Signature.getInstance("SHA256withRSA");
            signature.initSign(privateKey);
            signature.update(signingInput.getBytes(StandardCharsets.UTF_8));
            String encodedSignature = base64UrlEncode(signature.sign());

            return signingInput + "." + encodedSignature;
        } catch (Exception e) {
            throw new IllegalStateException("Impossibile generare il JWT per Enable Banking", e);
        }
    }

    private PrivateKey loadPrivateKey(String path) throws Exception {
        String pem = Files.readString(Path.of(path), StandardCharsets.UTF_8);
        String base64 = pem
                .replace("-----BEGIN PRIVATE KEY-----", "")
                .replace("-----END PRIVATE KEY-----", "")
                .replaceAll("\\s", "");
        byte[] der = Base64.getDecoder().decode(base64);
        KeyFactory keyFactory = KeyFactory.getInstance("RSA");
        return keyFactory.generatePrivate(new PKCS8EncodedKeySpec(der));
    }

    private String base64UrlEncode(byte[] data) {
        return Base64.getUrlEncoder().withoutPadding().encodeToString(data);
    }
}