package com.mazmi.logistics.common.web;

import java.time.Instant;
import java.util.List;

public record ApiError(
    int status,
    String code,
    String message,
    Instant timestamp,
    String path,
    List<FieldError> fieldErrors) {
  public record FieldError(String field, String message) {}
}
