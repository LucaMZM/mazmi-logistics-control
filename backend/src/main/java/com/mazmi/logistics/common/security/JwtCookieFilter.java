package com.mazmi.logistics.common.security;

import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.Cookie;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import java.io.IOException;
import java.util.Arrays;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

@Component
public class JwtCookieFilter extends OncePerRequestFilter {
  public static final String COOKIE_NAME = "mazmi_access";
  private final JwtService jwtService;
  private final UserDetailsService userDetailsService;

  public JwtCookieFilter(JwtService jwtService, UserDetailsService userDetailsService) {
    this.jwtService = jwtService;
    this.userDetailsService = userDetailsService;
  }

  @Override
  protected void doFilterInternal(
      HttpServletRequest request, HttpServletResponse response, FilterChain chain)
      throws ServletException, IOException {
    if (SecurityContextHolder.getContext().getAuthentication() == null
        && request.getCookies() != null) {
      Arrays.stream(request.getCookies())
          .filter(cookie -> COOKIE_NAME.equals(cookie.getName()))
          .findFirst()
          .ifPresent(cookie -> authenticate(cookie, request));
    }
    chain.doFilter(request, response);
  }

  private void authenticate(Cookie cookie, HttpServletRequest request) {
    try {
      String email = jwtService.subject(cookie.getValue());
      UserDetails details = userDetailsService.loadUserByUsername(email);
      if (details.isEnabled()) {
        UsernamePasswordAuthenticationToken authentication =
            new UsernamePasswordAuthenticationToken(details, null, details.getAuthorities());
        authentication.setDetails(request.getRemoteAddr());
        SecurityContextHolder.getContext().setAuthentication(authentication);
      }
    } catch (RuntimeException ignored) {
      SecurityContextHolder.clearContext();
    }
  }
}
