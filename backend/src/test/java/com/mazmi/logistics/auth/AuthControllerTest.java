package com.mazmi.logistics.auth;

import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

import com.mazmi.logistics.auth.dto.LoginRequest;
import com.mazmi.logistics.common.security.CurrentUser;
import com.mazmi.logistics.common.security.JwtService;
import com.mazmi.logistics.users.UserRepository;
import org.junit.jupiter.api.Test;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.BadCredentialsException;

class AuthControllerTest {
  @Test
  void invalidCredentialsAreRejected() {
    AuthenticationManager authentication = mock(AuthenticationManager.class);
    when(authentication.authenticate(org.mockito.ArgumentMatchers.any()))
        .thenThrow(new BadCredentialsException("bad"));
    AuthController controller =
        new AuthController(
            authentication,
            mock(JwtService.class),
            mock(UserRepository.class),
            mock(CurrentUser.class),
            false);
    assertThatThrownBy(
            () -> controller.login(new LoginRequest("operator@mazmilogistics.test", "wrong")))
        .isInstanceOf(BadCredentialsException.class);
  }
}
