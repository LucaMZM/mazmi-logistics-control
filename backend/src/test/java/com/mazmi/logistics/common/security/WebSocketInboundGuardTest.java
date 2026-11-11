package com.mazmi.logistics.common.security;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.Mockito.mock;

import java.util.List;
import org.junit.jupiter.api.Test;
import org.springframework.messaging.Message;
import org.springframework.messaging.MessageChannel;
import org.springframework.messaging.simp.stomp.StompCommand;
import org.springframework.messaging.simp.stomp.StompHeaderAccessor;
import org.springframework.messaging.support.MessageBuilder;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.authority.SimpleGrantedAuthority;

class WebSocketInboundGuardTest {
  private final WebSocketInboundGuard guard = new WebSocketInboundGuard();
  private final MessageChannel channel = mock(MessageChannel.class);

  @Test
  void authenticatedViewersCanSubscribeToOperationalTopics() {
    for (String destination :
        List.of("/topic/dashboard", "/topic/shipments/00000000-0000-0000-0000-000000000001")) {
      Message<?> message = message(StompCommand.SUBSCRIBE, destination, true);
      assertThat(guard.preSend(message, channel)).isSameAs(message);
    }
  }

  @Test
  void clientsCannotForgeOperationalUpdates() {
    for (String destination :
        List.of(
            "/topic/dashboard",
            "/topic/shipments/00000000-0000-0000-0000-000000000001",
            "/app/test")) {
      assertThatThrownBy(
              () -> guard.preSend(message(StompCommand.SEND, destination, true), channel))
          .isInstanceOf(AccessDeniedException.class);
    }
  }

  @Test
  void subscriptionsRejectUnknownDestinationsAndWildcards() {
    for (String destination :
        List.of(
            "/topic/**", "/topic/shipments/*", "/topic/shipments/not-a-uuid", "/queue/private")) {
      assertThatThrownBy(
              () -> guard.preSend(message(StompCommand.SUBSCRIBE, destination, true), channel))
          .isInstanceOf(AccessDeniedException.class);
    }
  }

  @Test
  void unauthenticatedFramesAreRejected() {
    assertThatThrownBy(() -> guard.preSend(message(StompCommand.CONNECT, null, false), channel))
        .isInstanceOf(AccessDeniedException.class);
  }

  private Message<?> message(StompCommand command, String destination, boolean authenticated) {
    StompHeaderAccessor accessor = StompHeaderAccessor.create(command);
    if (destination != null) accessor.setDestination(destination);
    if (authenticated)
      accessor.setUser(
          new UsernamePasswordAuthenticationToken(
              "viewer", null, List.of(new SimpleGrantedAuthority("ROLE_VIEWER"))));
    accessor.setLeaveMutable(true);
    return MessageBuilder.createMessage(new byte[0], accessor.getMessageHeaders());
  }
}
