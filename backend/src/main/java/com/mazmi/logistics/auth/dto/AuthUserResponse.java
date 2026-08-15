package com.mazmi.logistics.auth.dto;

import com.mazmi.logistics.users.User;
import com.mazmi.logistics.users.UserRole;
import java.util.UUID;

public record AuthUserResponse(UUID id, String name, String email, UserRole role) {
  public static AuthUserResponse from(User user) {
    return new AuthUserResponse(user.getId(), user.getName(), user.getEmail(), user.getRole());
  }
}
