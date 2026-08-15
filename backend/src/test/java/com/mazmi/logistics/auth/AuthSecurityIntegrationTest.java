package com.mazmi.logistics.auth;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.mazmi.logistics.common.config.SecurityConfig;
import com.mazmi.logistics.common.security.CurrentUser;
import com.mazmi.logistics.common.security.JwtCookieFilter;
import com.mazmi.logistics.common.security.JwtService;
import com.mazmi.logistics.common.security.RestSecurityErrorHandler;
import com.mazmi.logistics.users.User;
import com.mazmi.logistics.users.UserRepository;
import com.mazmi.logistics.users.UserRole;
import jakarta.servlet.http.Cookie;
import java.util.Optional;
import java.util.UUID;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.webmvc.test.autoconfigure.WebMvcTest;
import org.springframework.context.annotation.Import;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.MvcResult;

@WebMvcTest(
    controllers = AuthController.class,
    properties = {
      "app.security.allowed-origin=http://localhost:4200",
      "app.security.secure-cookie=false"
    })
@Import({SecurityConfig.class, JwtCookieFilter.class, RestSecurityErrorHandler.class})
class AuthSecurityIntegrationTest {
  private static final String EMAIL = "operator@mazmilogistics.test";

  @Autowired MockMvc mvc;
  @MockitoBean AuthenticationManager authenticationManager;
  @MockitoBean JwtService jwtService;
  @MockitoBean UserRepository users;
  @MockitoBean CurrentUser currentUser;
  @MockitoBean UserDetailsService userDetailsService;

  @BeforeEach
  void setUp() {
    User operator = new User();
    operator.setId(UUID.randomUUID());
    operator.setName("Operations Coordinator");
    operator.setEmail(EMAIL);
    operator.setRole(UserRole.OPERATOR);
    operator.setEnabled(true);
    when(authenticationManager.authenticate(any()))
        .thenReturn(new UsernamePasswordAuthenticationToken(EMAIL, null));
    when(users.findByEmailIgnoreCase(EMAIL)).thenReturn(Optional.of(operator));
    when(jwtService.issue(EMAIL, "OPERATOR")).thenReturn("signed.jwt.token");
    when(jwtService.maxAgeSeconds()).thenReturn(3600L);
  }

  @Test
  void angularRawCookieTokenAuthenticatesLoginAndCreatesHttpOnlyAccessCookie() throws Exception {
    Cookie csrfCookie = csrfCookie();

    MvcResult result =
        mvc.perform(
                post("/api/v1/auth/login")
                    .cookie(csrfCookie)
                    .header("X-XSRF-TOKEN", csrfCookie.getValue())
                    .contentType(MediaType.APPLICATION_JSON)
                    .content(
                        """
                        {"email":"operator@mazmilogistics.test","password":"Demo2026!"}
                        """))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.email").value(EMAIL))
            .andExpect(jsonPath("$.role").value("OPERATOR"))
            .andReturn();

    Cookie accessCookie = result.getResponse().getCookie(JwtCookieFilter.COOKIE_NAME);
    assertThat(accessCookie).isNotNull();
    assertThat(accessCookie.isHttpOnly()).isTrue();
    assertThat(accessCookie.getSecure()).isFalse();
    assertThat(result.getResponse().getHeader(HttpHeaders.SET_COOKIE))
        .contains("SameSite=Lax", "Path=/", "HttpOnly");
  }

  @Test
  void loginWithoutCsrfHeaderIsRejected() throws Exception {
    Cookie csrfCookie = csrfCookie();

    mvc.perform(
            post("/api/v1/auth/login")
                .cookie(csrfCookie)
                .contentType(MediaType.APPLICATION_JSON)
                .content(
                    """
                    {"email":"operator@mazmilogistics.test","password":"Demo2026!"}
                    """))
        .andExpect(status().isForbidden())
        .andExpect(jsonPath("$.code").value("CSRF_VALIDATION_FAILED"))
        .andExpect(jsonPath("$.status").value(403));
  }

  @Test
  void protectedEndpointWithoutAccessCookieReturnsJsonUnauthorized() throws Exception {
    mvc.perform(get("/api/v1/auth/me"))
        .andExpect(status().isUnauthorized())
        .andExpect(jsonPath("$.code").value("AUTHENTICATION_REQUIRED"))
        .andExpect(jsonPath("$.status").value(401))
        .andExpect(jsonPath("$.path").value("/api/v1/auth/me"));
  }

  private Cookie csrfCookie() throws Exception {
    MvcResult result =
        mvc.perform(get("/api/v1/auth/csrf"))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.headerName").value("X-XSRF-TOKEN"))
            .andReturn();
    Cookie cookie = result.getResponse().getCookie("XSRF-TOKEN");
    assertThat(cookie).isNotNull();
    assertThat(cookie.isHttpOnly()).isFalse();
    assertThat(cookie.getPath()).isEqualTo("/");
    return cookie;
  }
}
