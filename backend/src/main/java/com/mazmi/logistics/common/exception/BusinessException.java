package com.mazmi.logistics.common.exception;

import org.springframework.http.HttpStatus;

public class BusinessException extends RuntimeException {
  private final HttpStatus status;
  private final String code;

  public BusinessException(HttpStatus status, String code, String message) {
    super(message);
    this.status = status;
    this.code = code;
  }

  public static BusinessException conflict(String code, String message) {
    return new BusinessException(HttpStatus.CONFLICT, code, message);
  }

  public static BusinessException notFound(String resource) {
    return new BusinessException(
        HttpStatus.NOT_FOUND, "RESOURCE_NOT_FOUND", resource + " was not found");
  }

  public HttpStatus getStatus() {
    return status;
  }

  public String getCode() {
    return code;
  }
}
