package com.mazmi.logistics.users.dto;

import com.mazmi.logistics.users.User;
import com.mazmi.logistics.users.UserRole;
import java.time.Instant;
import java.util.UUID;

public record UserResponse(
    UUID id, String name, String email, UserRole role, boolean enabled, Instant createdAt) {
  public static UserResponse from(User user) {
    return new UserResponse(
        user.getId(),
        user.getName(),
        user.getEmail(),
        user.getRole(),
        user.isEnabled(),
        user.getCreatedAt());
  }
}
