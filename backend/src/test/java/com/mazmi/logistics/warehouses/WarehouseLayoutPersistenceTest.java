package com.mazmi.logistics.warehouses;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import com.mazmi.logistics.common.exception.BusinessException;
import java.util.List;
import java.util.UUID;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.test.context.DynamicPropertyRegistry;
import org.springframework.test.context.DynamicPropertySource;
import org.testcontainers.containers.PostgreSQLContainer;
import org.testcontainers.junit.jupiter.Container;
import org.testcontainers.junit.jupiter.Testcontainers;

@SpringBootTest(
    properties = {
      "app.demo-enabled=false",
      "app.security.jwt-secret=test-secret-at-least-thirty-two-characters",
      "springdoc.api-docs.enabled=false"
    })
@Testcontainers
class WarehouseLayoutPersistenceTest {
  @Container
  static final PostgreSQLContainer<?> POSTGRES = new PostgreSQLContainer<>("postgres:17-alpine");

  @DynamicPropertySource
  static void database(DynamicPropertyRegistry registry) {
    registry.add("spring.datasource.url", POSTGRES::getJdbcUrl);
    registry.add("spring.datasource.username", POSTGRES::getUsername);
    registry.add("spring.datasource.password", POSTGRES::getPassword);
  }

  @Autowired WarehouseLayoutController controller;
  @Autowired JdbcTemplate jdbc;

  private UUID warehouseId;

  @BeforeEach
  void setup() {
    warehouseId = UUID.randomUUID();
    jdbc.update(
        "INSERT INTO warehouses"
            + "(id,code,name,address,city,postal_code,country,latitude,longitude,active,created_at,updated_at)"
            + " VALUES (?,?,?,?,?,?,?,?,?,?,now(),now())",
        warehouseId,
        "EDIT-" + warehouseId.toString().substring(0, 8),
        "Layout editor test",
        "Example",
        "Valencia",
        "46000",
        "Spain",
        39.5,
        -0.4,
        true);
    SecurityContextHolder.getContext()
        .setAuthentication(
            new UsernamePasswordAuthenticationToken(
                "editor",
                null,
                List.of(new SimpleGrantedAuthority("ROLE_OPERATOR"))));
  }

  @AfterEach
  void cleanup() {
    SecurityContextHolder.clearContext();
  }

  @Test
  void savedPlansPersistPerWarehouseAndRejectStaleWritesWithoutMutatingStock() {
    var initial = controller.get(warehouseId);
    assertThat(initial.saved()).isFalse();
    assertThat(initial.revision()).isZero();
    assertThat(initial.items()).isEmpty();

    var items =
        List.of(
            new WarehouseLayoutController.Item(
                "rack-a", WarehouseLayoutController.Kind.RACK, -5, -3, 0),
            new WarehouseLayoutController.Item(
                "dock-a", WarehouseLayoutController.Kind.DOCK, 6, 5, 0));
    var saved = controller.save(warehouseId, new WarehouseLayoutController.Save(0L, items));

    assertThat(saved.revision()).isEqualTo(1);
    assertThat(saved.saved()).isTrue();
    assertThat(controller.get(warehouseId).items()).containsExactlyInAnyOrderElementsOf(items);
    assertThatThrownBy(
            () -> controller.save(warehouseId, new WarehouseLayoutController.Save(0L, List.of())))
        .isInstanceOf(BusinessException.class)
        .hasMessageContaining("changed");

    assertThat(controller.get(warehouseId).revision()).isEqualTo(1);
    assertThat(controller.get(warehouseId).items()).containsExactlyInAnyOrderElementsOf(items);

    var updated =
        controller.save(
            warehouseId,
            new WarehouseLayoutController.Save(
                1L,
                List.of(
                    new WarehouseLayoutController.Item(
                        "rack-a", WarehouseLayoutController.Kind.RACK, -6, -4, 90))));
    assertThat(updated.revision()).isEqualTo(2);
    assertThat(controller.get(warehouseId).items())
        .extracting(WarehouseLayoutController.Item::id)
        .containsExactly("rack-a");
  }

  @Test
  void nonExistingWarehouseCannotReceivePlans() {
    UUID missing = UUID.randomUUID();
    assertThatThrownBy(() -> controller.get(missing))
        .isInstanceOf(BusinessException.class)
        .hasMessageContaining("Warehouse");
    assertThatThrownBy(
            () -> controller.save(missing, new WarehouseLayoutController.Save(0L, List.of())))
        .isInstanceOf(BusinessException.class);
  }
}
