package com.mazmi.logistics.common.web;

import com.mazmi.logistics.common.exception.BusinessException;
import jakarta.servlet.http.HttpServletRequest;
import java.time.Instant;
import java.util.List;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.orm.ObjectOptimisticLockingFailureException;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.core.AuthenticationException;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;

@RestControllerAdvice
public class GlobalExceptionHandler {
  @ExceptionHandler(BusinessException.class)
  ResponseEntity<ApiError> handleBusiness(BusinessException exception, HttpServletRequest request) {
    return response(
        exception.getStatus(), exception.getCode(), exception.getMessage(), request, List.of());
  }

  @ExceptionHandler(MethodArgumentNotValidException.class)
  ResponseEntity<ApiError> handleValidation(
      MethodArgumentNotValidException exception, HttpServletRequest request) {
    List<ApiError.FieldError> fields =
        exception.getBindingResult().getFieldErrors().stream()
            .map(error -> new ApiError.FieldError(error.getField(), error.getDefaultMessage()))
            .toList();
    return response(
        HttpStatus.BAD_REQUEST, "VALIDATION_FAILED", "Request validation failed", request, fields);
  }

  @ExceptionHandler(ObjectOptimisticLockingFailureException.class)
  ResponseEntity<ApiError> handleOptimisticLock(
      ObjectOptimisticLockingFailureException exception, HttpServletRequest request) {
    return response(
        HttpStatus.CONFLICT,
        "CONCURRENT_INVENTORY_UPDATE",
        "Inventory changed concurrently; refresh and retry",
        request,
        List.of());
  }

  @ExceptionHandler(DataIntegrityViolationException.class)
  ResponseEntity<ApiError> handleConstraint(
      DataIntegrityViolationException exception, HttpServletRequest request) {
    return response(
        HttpStatus.CONFLICT,
        "DATA_INTEGRITY_VIOLATION",
        "The operation conflicts with existing data",
        request,
        List.of());
  }

  @ExceptionHandler(AccessDeniedException.class)
  ResponseEntity<ApiError> handleDenied(
      AccessDeniedException exception, HttpServletRequest request) {
    return response(
        HttpStatus.FORBIDDEN,
        "ACCESS_DENIED",
        "You do not have permission for this operation",
        request,
        List.of());
  }

  @ExceptionHandler(AuthenticationException.class)
  ResponseEntity<ApiError> handleAuthentication(
      AuthenticationException exception, HttpServletRequest request) {
    return response(
        HttpStatus.UNAUTHORIZED,
        "INVALID_CREDENTIALS",
        "Invalid email or password",
        request,
        List.of());
  }

  @ExceptionHandler(Exception.class)
  ResponseEntity<ApiError> handleUnexpected(Exception exception, HttpServletRequest request) {
    return response(
        HttpStatus.INTERNAL_SERVER_ERROR,
        "INTERNAL_ERROR",
        "An unexpected error occurred",
        request,
        List.of());
  }

  private ResponseEntity<ApiError> response(
      HttpStatus status,
      String code,
      String message,
      HttpServletRequest request,
      List<ApiError.FieldError> fields) {
    return ResponseEntity.status(status)
        .body(
            new ApiError(
                status.value(), code, message, Instant.now(), request.getRequestURI(), fields));
  }
}
