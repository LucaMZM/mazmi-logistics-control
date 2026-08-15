package com.mazmi.logistics.users;

import com.mazmi.logistics.common.exception.BusinessException;
import com.mazmi.logistics.users.dto.UserRequests;
import com.mazmi.logistics.users.dto.UserResponse;
import java.util.List;
import java.util.UUID;
import org.springframework.http.HttpStatus;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class UserService {
  private final UserRepository users;
  private final PasswordEncoder passwordEncoder;

  public UserService(UserRepository users, PasswordEncoder passwordEncoder) {
    this.users = users;
    this.passwordEncoder = passwordEncoder;
  }

  @Transactional(readOnly = true)
  public List<UserResponse> list() {
    return users.findAll().stream().map(UserResponse::from).toList();
  }

  @Transactional
  public UserResponse create(UserRequests.Create request) {
    if (users.existsByEmailIgnoreCase(request.email()))
      throw new BusinessException(
          HttpStatus.CONFLICT, "EMAIL_ALREADY_EXISTS", "A user with this email already exists");
    User user = new User();
    user.setName(request.name());
    user.setEmail(request.email());
    user.setPasswordHash(passwordEncoder.encode(request.password()));
    user.setRole(request.role());
    user.setEnabled(true);
    return UserResponse.from(users.save(user));
  }

  @Transactional
  public UserResponse update(UUID id, UserRequests.Update request) {
    User user = find(id);
    user.setName(request.name());
    user.setRole(request.role());
    user.setEnabled(request.enabled());
    return UserResponse.from(user);
  }

  @Transactional
  public void password(UUID id, UserRequests.Password request) {
    find(id).setPasswordHash(passwordEncoder.encode(request.password()));
  }

  private User find(UUID id) {
    return users.findById(id).orElseThrow(() -> BusinessException.notFound("User"));
  }
}
