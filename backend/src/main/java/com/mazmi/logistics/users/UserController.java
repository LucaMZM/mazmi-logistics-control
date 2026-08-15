package com.mazmi.logistics.users;

import com.mazmi.logistics.users.dto.UserRequests;
import com.mazmi.logistics.users.dto.UserResponse;
import jakarta.validation.Valid;
import java.util.List;
import java.util.UUID;
import org.springframework.http.HttpStatus;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/users")
@PreAuthorize("hasRole('ADMIN')")
public class UserController {
  private final UserService service;

  public UserController(UserService service) {
    this.service = service;
  }

  @GetMapping
  public List<UserResponse> list() {
    return service.list();
  }

  @PostMapping
  @ResponseStatus(HttpStatus.CREATED)
  public UserResponse create(@Valid @RequestBody UserRequests.Create request) {
    return service.create(request);
  }

  @PutMapping("/{id}")
  public UserResponse update(
      @PathVariable UUID id, @Valid @RequestBody UserRequests.Update request) {
    return service.update(id, request);
  }

  @PostMapping("/{id}/password")
  @ResponseStatus(HttpStatus.NO_CONTENT)
  public void password(@PathVariable UUID id, @Valid @RequestBody UserRequests.Password request) {
    service.password(id, request);
  }
}
