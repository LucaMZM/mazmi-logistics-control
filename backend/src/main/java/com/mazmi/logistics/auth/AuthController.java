package com.mazmi.logistics.auth;

import com.mazmi.logistics.auth.dto.AuthUserResponse;
import com.mazmi.logistics.auth.dto.LoginRequest;
import com.mazmi.logistics.common.security.CurrentUser;
import com.mazmi.logistics.common.security.JwtCookieFilter;
import com.mazmi.logistics.common.security.JwtService;
import com.mazmi.logistics.users.User;
import com.mazmi.logistics.users.UserRepository;
import jakarta.validation.Valid;
import java.util.Map;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpHeaders;
import org.springframework.http.ResponseCookie;
import org.springframework.http.ResponseEntity;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.web.csrf.CsrfToken;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/auth")
public class AuthController {
  private final AuthenticationManager authenticationManager;
  private final JwtService jwtService;
  private final UserRepository users;
  private final CurrentUser currentUser;
  private final boolean secureCookie;

  public AuthController(
      AuthenticationManager authenticationManager,
      JwtService jwtService,
      UserRepository users,
      CurrentUser currentUser,
      @Value("${app.security.secure-cookie:false}") boolean secureCookie) {
    this.authenticationManager = authenticationManager;
    this.jwtService = jwtService;
    this.users = users;
    this.currentUser = currentUser;
    this.secureCookie = secureCookie;
  }

  @GetMapping("/csrf")
  Map<String, String> csrf(CsrfToken token) {
    return Map.of("headerName", token.getHeaderName(), "token", token.getToken());
  }

  @PostMapping("/login")
  ResponseEntity<AuthUserResponse> login(@Valid @RequestBody LoginRequest request) {
    authenticationManager.authenticate(
        new UsernamePasswordAuthenticationToken(request.email(), request.password()));
    User user = users.findByEmailIgnoreCase(request.email()).orElseThrow();
    ResponseCookie cookie =
        ResponseCookie.from(
                JwtCookieFilter.COOKIE_NAME,
                jwtService.issue(user.getEmail(), user.getRole().name()))
            .httpOnly(true)
            .secure(secureCookie)
            .sameSite("Lax")
            .path("/")
            .maxAge(jwtService.maxAgeSeconds())
            .build();
    return ResponseEntity.ok()
        .header(HttpHeaders.SET_COOKIE, cookie.toString())
        .body(AuthUserResponse.from(user));
  }

  @PostMapping("/logout")
  ResponseEntity<Void> logout() {
    ResponseCookie cookie =
        ResponseCookie.from(JwtCookieFilter.COOKIE_NAME, "")
            .httpOnly(true)
            .secure(secureCookie)
            .sameSite("Lax")
            .path("/")
            .maxAge(0)
            .build();
    return ResponseEntity.noContent().header(HttpHeaders.SET_COOKIE, cookie.toString()).build();
  }

  @GetMapping("/me")
  AuthUserResponse me() {
    return AuthUserResponse.from(currentUser.require());
  }
}
