package com.mazmi.logistics.users.dto;

import com.mazmi.logistics.users.UserRole;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

public final class UserRequests {
  private UserRequests() {}

  public record Create(
      @NotBlank String name,
      @NotBlank @Email String email,
      @NotBlank @Size(min = 10) String password,
      @NotNull UserRole role) {}

  public record Update(@NotBlank String name, @NotNull UserRole role, boolean enabled) {}

  public record Password(@NotBlank @Size(min = 10) String password) {}
}
