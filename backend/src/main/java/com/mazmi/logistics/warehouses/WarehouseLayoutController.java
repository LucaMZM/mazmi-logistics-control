package com.mazmi.logistics.warehouses;

import com.mazmi.logistics.common.exception.BusinessException;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotNull;
import java.util.ArrayList;
import java.util.HashSet;
import java.util.List;
import java.util.UUID;
import org.springframework.http.HttpStatus;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

/**
 * An explicitly illustrative spatial plan. No stock location or product assignment is inferred.
 * Optimistic compare-and-swap prevents simultaneous editors from silently overwriting one another.
 */
@RestController
@RequestMapping("/api/v1/warehouses/{warehouseId}/visual-layout")
public class WarehouseLayoutController {
  private final JdbcTemplate jdbc;
  private final WarehouseRepository warehouses;

  public WarehouseLayoutController(JdbcTemplate jdbc, WarehouseRepository warehouses) {
    this.jdbc = jdbc;
    this.warehouses = warehouses;
  }

  public enum Kind {
    RACK,
    DOCK,
    STAGING,
    PICKING
  }

  public record Item(String id, Kind kind, Integer x, Integer z, Integer orientation) {}

  public record Save(@NotNull Long revision, @NotNull List<@Valid Item> items) {}

  public record Layout(UUID warehouseId, long revision, boolean saved, List<Item> items) {}

  @GetMapping
  @Transactional(
      readOnly = true,
      isolation = org.springframework.transaction.annotation.Isolation.REPEATABLE_READ)
  public Layout get(@PathVariable UUID warehouseId) {
    requireWarehouse(warehouseId);
    List<Long> revisions =
        jdbc.query(
            "SELECT revision FROM warehouse_visual_layouts WHERE warehouse_id = ?",
            (rs, i) -> rs.getLong("revision"),
            warehouseId);
    if (revisions.isEmpty()) return new Layout(warehouseId, 0, false, List.of());
    return new Layout(warehouseId, revisions.get(0), true, readItems(warehouseId));
  }

  @PutMapping
  @PreAuthorize("hasAnyRole('ADMIN','OPERATOR')")
  @Transactional
  public Layout save(@PathVariable UUID warehouseId, @Valid @RequestBody Save request) {
    requireWarehouse(warehouseId);
    validate(request);
    List<Item> items = List.copyOf(request.items());

    if (request.revision() == 0) {
      jdbc.update(
          "INSERT INTO warehouse_visual_layouts(warehouse_id, revision) VALUES (?, 0)"
              + " ON CONFLICT (warehouse_id) DO NOTHING",
          warehouseId);
    }
    int changed =
        jdbc.update(
            "UPDATE warehouse_visual_layouts SET revision = revision + 1, updated_at = NOW()"
                + " WHERE warehouse_id = ? AND revision = ?",
            warehouseId,
            request.revision());
    if (changed != 1)
      throw BusinessException.conflict(
          "LAYOUT_STALE", "Warehouse layout changed. Reload before saving again.");

    jdbc.update("DELETE FROM warehouse_visual_layout_items WHERE warehouse_id = ?", warehouseId);
    for (Item item : items) {
      jdbc.update(
          "INSERT INTO warehouse_visual_layout_items"
              + "(warehouse_id, object_id, kind, grid_x, grid_z, orientation)"
              + " VALUES (?,?,?,?,?,?)",
          warehouseId,
          item.id(),
          item.kind().name(),
          item.x(),
          item.z(),
          item.orientation());
    }
    return new Layout(warehouseId, request.revision() + 1, true, items);
  }

  private List<Item> readItems(UUID warehouseId) {
    return jdbc.query(
        "SELECT object_id, kind, grid_x, grid_z, orientation"
            + " FROM warehouse_visual_layout_items WHERE warehouse_id = ? ORDER BY object_id",
        (rs, i) ->
            new Item(
                rs.getString("object_id"),
                Kind.valueOf(rs.getString("kind")),
                rs.getInt("grid_x"),
                rs.getInt("grid_z"),
                rs.getInt("orientation")),
        warehouseId);
  }

  private void requireWarehouse(UUID id) {
    if (!warehouses.existsById(id)) throw BusinessException.notFound("Warehouse");
  }

  static void validate(Save request) {
    if (request == null
        || request.revision() == null
        || request.revision() < 0
        || request.items() == null
        || request.items().size() > 60) throw invalid();
    var ids = new HashSet<String>();
    var accepted = new ArrayList<Item>();
    for (Item item : request.items()) {
      if (item == null
          || item.id() == null
          || !item.id().matches("[a-zA-Z0-9_-]{1,40}")
          || !ids.add(item.id())
          || item.kind() == null
          || item.x() == null
          || item.z() == null
          || item.orientation() == null
          || item.x() < -10
          || item.x() > 10
          || item.z() < -6
          || item.z() > 6
          || item.orientation() % 90 != 0
          || item.orientation() < 0
          || item.orientation() > 270) throw invalid();
      if (item.kind() == Kind.DOCK && item.z() < 4) throw invalid();
      for (Item other : accepted) {
        double[] a = footprint(item);
        double[] b = footprint(other);
        if (Math.abs(item.x() - other.x()) < (a[0] + b[0]) / 2 + 0.25
            && Math.abs(item.z() - other.z()) < (a[1] + b[1]) / 2 + 0.25) throw invalid();
      }
      accepted.add(item);
    }
  }

  private static double[] footprint(Item item) {
    double width;
    double depth;
    switch (item.kind()) {
      case RACK -> {
        width = 3.4;
        depth = 1.9;
      }
      case DOCK -> {
        width = 3.7;
        depth = 3.5;
      }
      case STAGING -> {
        width = 2.8;
        depth = 2.8;
      }
      case PICKING -> {
        width = 3;
        depth = 2.2;
      }
      default -> throw invalid();
    }
    if (item.orientation() == 90 || item.orientation() == 270) return new double[] {depth, width};
    return new double[] {width, depth};
  }

  private static BusinessException invalid() {
    return new BusinessException(
        HttpStatus.BAD_REQUEST, "LAYOUT_INVALID", "Invalid or overlapping warehouse layout.");
  }
}
