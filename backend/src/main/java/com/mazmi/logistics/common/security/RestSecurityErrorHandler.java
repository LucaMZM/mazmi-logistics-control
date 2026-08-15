package com.mazmi.logistics.common.security;

import com.mazmi.logistics.common.web.ApiError;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import java.io.IOException;
import java.time.Instant;
import java.util.List;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.security.core.AuthenticationException;
import org.springframework.security.web.AuthenticationEntryPoint;
import org.springframework.security.web.access.AccessDeniedHandler;
import org.springframework.security.web.csrf.CsrfException;
import org.springframework.stereotype.Component;
import tools.jackson.databind.json.JsonMapper;

@Component
public class RestSecurityErrorHandler implements AuthenticationEntryPoint, AccessDeniedHandler {
  private final JsonMapper jsonMapper;

  public RestSecurityErrorHandler(JsonMapper jsonMapper) {
    this.jsonMapper = jsonMapper;
  }

  @Override
  public void commence(
      HttpServletRequest request, HttpServletResponse response, AuthenticationException exception)
      throws IOException, ServletException {
    write(
        response,
        request,
        HttpStatus.UNAUTHORIZED,
        "AUTHENTICATION_REQUIRED",
        "Authentication is required");
  }

  @Override
  public void handle(
      HttpServletRequest request,
      HttpServletResponse response,
      org.springframework.security.access.AccessDeniedException exception)
      throws IOException, ServletException {
    boolean csrfFailure = exception instanceof CsrfException;
    write(
        response,
        request,
        HttpStatus.FORBIDDEN,
        csrfFailure ? "CSRF_VALIDATION_FAILED" : "ACCESS_DENIED",
        csrfFailure
            ? "The CSRF token is missing or invalid"
            : "You do not have permission for this operation");
  }

  private void write(
      HttpServletResponse response,
      HttpServletRequest request,
      HttpStatus status,
      String code,
      String message)
      throws IOException {
    response.setStatus(status.value());
    response.setContentType(MediaType.APPLICATION_JSON_VALUE);
    response.setCharacterEncoding("UTF-8");
    jsonMapper.writeValue(
        response.getOutputStream(),
        new ApiError(
            status.value(), code, message, Instant.now(), request.getRequestURI(), List.of()));
  }
}
