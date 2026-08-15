package com.mazmi.logistics.common.security;

import io.jsonwebtoken.Claims;
import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.security.Keys;
import java.nio.charset.StandardCharsets;
import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.Date;
import javax.crypto.SecretKey;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

@Service
public class JwtService {
  private final SecretKey key;
  private final long accessTokenMinutes;

  public JwtService(
      @Value("${app.security.jwt-secret}") String secret,
      @Value("${app.security.access-token-minutes:60}") long accessTokenMinutes) {
    if (secret == null || secret.length() < 32)
      throw new IllegalStateException("JWT_SECRET must contain at least 32 characters");
    this.key = Keys.hmacShaKeyFor(secret.getBytes(StandardCharsets.UTF_8));
    this.accessTokenMinutes = accessTokenMinutes;
  }

  public String issue(String email, String role) {
    Instant now = Instant.now();
    return Jwts.builder()
        .subject(email)
        .claim("role", role)
        .issuedAt(Date.from(now))
        .expiration(Date.from(now.plus(accessTokenMinutes, ChronoUnit.MINUTES)))
        .signWith(key)
        .compact();
  }

  public String subject(String token) {
    Claims claims = Jwts.parser().verifyWith(key).build().parseSignedClaims(token).getPayload();
    return claims.getSubject();
  }

  public long maxAgeSeconds() {
    return accessTokenMinutes * 60;
  }
}
