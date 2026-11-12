package com.mazmi.logistics.common.security;

import java.util.UUID;
import org.springframework.messaging.Message;
import org.springframework.messaging.MessageChannel;
import org.springframework.messaging.simp.stomp.StompCommand;
import org.springframework.messaging.simp.stomp.StompHeaderAccessor;
import org.springframework.messaging.support.ChannelInterceptor;
import org.springframework.messaging.support.MessageHeaderAccessor;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.authentication.AnonymousAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.stereotype.Component;

@Component
public class WebSocketInboundGuard implements ChannelInterceptor {
  @Override
  public Message<?> preSend(Message<?> message, MessageChannel channel) {
    StompHeaderAccessor headers =
        MessageHeaderAccessor.getAccessor(message, StompHeaderAccessor.class);
    if (headers == null
        || !(headers.getUser() instanceof Authentication user)
        || !user.isAuthenticated()
        || user instanceof AnonymousAuthenticationToken) {
      throw new AccessDeniedException("Authenticated WebSocket session required");
    }
    StompCommand command = headers.getCommand();
    if (command == StompCommand.SUBSCRIBE) {
      if (!allowedDestination(headers.getDestination())) {
        throw new AccessDeniedException("Subscription destination not allowed");
      }
    } else if (command != null
        && command != StompCommand.CONNECT
        && command != StompCommand.STOMP
        && command != StompCommand.DISCONNECT
        && command != StompCommand.UNSUBSCRIBE) {
      // Operational updates are server-authored; clients must never publish to the broker.
      throw new AccessDeniedException("Client publication not allowed");
    }
    return message;
  }

  private boolean allowedDestination(String destination) {
    if ("/topic/dashboard".equals(destination)) return true;
    String prefix = "/topic/shipments/";
    if (destination == null || !destination.startsWith(prefix)) return false;
    String id = destination.substring(prefix.length());
    try {
      return UUID.fromString(id).toString().equalsIgnoreCase(id);
    } catch (IllegalArgumentException exception) {
      return false;
    }
  }
}
