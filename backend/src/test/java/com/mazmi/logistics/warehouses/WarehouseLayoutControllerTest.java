package com.mazmi.logistics.warehouses;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.mazmi.logistics.common.exception.BusinessException;
import java.util.List;
import java.util.UUID;
import org.junit.jupiter.api.Test;
import org.springframework.http.HttpStatus;
import org.springframework.jdbc.core.JdbcTemplate;

class WarehouseLayoutControllerTest {
  @Test
  void acceptsAValidNonOverlappingLayout() {
    WarehouseLayoutController.validate(
        new WarehouseLayoutController.Save(
            0L,
            List.of(
                new WarehouseLayoutController.Item(
                    "rack-1", WarehouseLayoutController.Kind.RACK, -6, -3, 0),
                new WarehouseLayoutController.Item(
                    "dock-1", WarehouseLayoutController.Kind.DOCK, 6, 5, 0))));
  }

  @Test
  void rejectsOverlappingObjectsAndDuplicateIdentifiers() {
    var rack =
        new WarehouseLayoutController.Item("rack-1", WarehouseLayoutController.Kind.RACK, 0, 0, 0);
    var overlap =
        new WarehouseLayoutController.Item("rack-2", WarehouseLayoutController.Kind.RACK, 2, 0, 90);
    assertThatThrownBy(
            () ->
                WarehouseLayoutController.validate(
                    new WarehouseLayoutController.Save(0L, List.of(rack, overlap))))
        .isInstanceOf(BusinessException.class)
        .hasMessageContaining("overlapping");
    assertThatThrownBy(
            () ->
                WarehouseLayoutController.validate(
                    new WarehouseLayoutController.Save(0L, List.of(rack, rack))))
        .isInstanceOf(BusinessException.class);
  }

  @Test
  void rejectsInvalidGridLocationAndRevision() {
    assertThatThrownBy(
            () ->
                WarehouseLayoutController.validate(
                    new WarehouseLayoutController.Save(
                        -1L,
                        List.of(
                            new WarehouseLayoutController.Item(
                                "dock", WarehouseLayoutController.Kind.DOCK, 0, 0, 0)))))
        .isInstanceOf(BusinessException.class);
    assertThatThrownBy(
            () ->
                WarehouseLayoutController.validate(
                    new WarehouseLayoutController.Save(
                        0L,
                        List.of(
                            new WarehouseLayoutController.Item(
                                "rack", WarehouseLayoutController.Kind.RACK, 11, 0, 0)))))
        .isInstanceOf(BusinessException.class);
  }

  @Test
  void staleRevisionsNeverReplaceSavedPositions() {
    JdbcTemplate jdbc = mock(JdbcTemplate.class);
    WarehouseRepository warehouses = mock(WarehouseRepository.class);
    UUID id = UUID.randomUUID();
    when(warehouses.existsById(id)).thenReturn(true);
    when(jdbc.update(
            anyString(), org.mockito.ArgumentMatchers.eq(id), org.mockito.ArgumentMatchers.eq(3L)))
        .thenReturn(0);
    var controller = new WarehouseLayoutController(jdbc, warehouses);
    assertThatThrownBy(() -> controller.save(id, new WarehouseLayoutController.Save(3L, List.of())))
        .isInstanceOfSatisfying(
            BusinessException.class,
            error -> assertThat(error.getStatus()).isEqualTo(HttpStatus.CONFLICT));
    verify(jdbc)
        .update(
            "UPDATE warehouse_visual_layouts SET revision = revision + 1, updated_at = NOW()"
                + " WHERE warehouse_id = ? AND revision = ?",
            id,
            3L);
  }
}
