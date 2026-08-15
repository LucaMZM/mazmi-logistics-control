package com.mazmi.logistics.users;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

import com.mazmi.logistics.users.dto.UserResponse;
import java.time.Instant;
import java.util.List;
import java.util.UUID;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.context.annotation.Import;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.config.annotation.method.configuration.EnableMethodSecurity;
import org.springframework.security.test.context.support.WithMockUser;
import org.springframework.test.context.junit.jupiter.SpringJUnitConfig;

@SpringJUnitConfig(AuthorizationRulesTest.Config.class)
class AuthorizationRulesTest {
  @Configuration
  @EnableMethodSecurity
  @Import(UserController.class)
  static class Config {
    @Bean
    UserService userService() {
      UserService service = mock(UserService.class);
      when(service.list())
          .thenReturn(
              List.of(
                  new UserResponse(
                      UUID.randomUUID(),
                      "Admin",
                      "admin@test",
                      UserRole.ADMIN,
                      true,
                      Instant.now())));
      return service;
    }
  }

  @Autowired UserController controller;

  @Test
  @WithMockUser(roles = "VIEWER")
  void viewerCannotManageUsers() {
    assertThatThrownBy(() -> controller.list()).isInstanceOf(AccessDeniedException.class);
  }

  @Test
  @WithMockUser(roles = "OPERATOR")
  void operatorCannotManageUsers() {
    assertThatThrownBy(() -> controller.list()).isInstanceOf(AccessDeniedException.class);
  }

  @Test
  @WithMockUser(roles = "ADMIN")
  void adminCanManageUsers() {
    assertThat(controller.list()).hasSize(1);
  }
}
