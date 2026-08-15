package com.mazmi.logistics.common.security;

import com.mazmi.logistics.users.User;
import com.mazmi.logistics.users.UserRepository;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.security.core.userdetails.UsernameNotFoundException;
import org.springframework.stereotype.Service;

@Service
public class LogisticsUserDetailsService implements UserDetailsService {
  private final UserRepository users;

  public LogisticsUserDetailsService(UserRepository users) {
    this.users = users;
  }

  @Override
  public UserDetails loadUserByUsername(String email) throws UsernameNotFoundException {
    User user =
        users
            .findByEmailIgnoreCase(email)
            .orElseThrow(() -> new UsernameNotFoundException("Invalid credentials"));
    return org.springframework.security.core.userdetails.User.withUsername(user.getEmail())
        .password(user.getPasswordHash())
        .roles(user.getRole().name())
        .disabled(!user.isEnabled())
        .build();
  }
}
