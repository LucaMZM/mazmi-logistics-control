package com.mazmi.logistics.common.security;

import com.mazmi.logistics.common.exception.BusinessException;
import com.mazmi.logistics.users.User;
import com.mazmi.logistics.users.UserRepository;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Component;

@Component
public class CurrentUser {
  private final UserRepository users;

  public CurrentUser(UserRepository users) {
    this.users = users;
  }

  public User require() {
    String email = SecurityContextHolder.getContext().getAuthentication().getName();
    return users
        .findByEmailIgnoreCase(email)
        .orElseThrow(() -> BusinessException.notFound("Authenticated user"));
  }
}
