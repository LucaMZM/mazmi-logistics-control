package com.mazmi.logistics.dashboard;

import com.mazmi.logistics.incidents.Incident;
import com.mazmi.logistics.incidents.IncidentRepository;
import com.mazmi.logistics.incidents.IncidentSeverity;
import com.mazmi.logistics.incidents.IncidentStatus;
import com.mazmi.logistics.inventory.InventoryLevel;
import com.mazmi.logistics.inventory.InventoryRepository;
import com.mazmi.logistics.orders.OrderRepository;
import com.mazmi.logistics.shipments.DeliveryHealth;
import com.mazmi.logistics.shipments.Shipment;
import com.mazmi.logistics.shipments.ShipmentRepository;
import com.mazmi.logistics.shipments.ShipmentStatus;
import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;
import java.time.ZoneOffset;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;
import org.springframework.data.domain.PageRequest;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class DashboardService {
  private final OrderRepository orders;
  private final ShipmentRepository shipments;
  private final IncidentRepository incidents;
  private final InventoryRepository inventory;

  public DashboardService(
      OrderRepository orders,
      ShipmentRepository shipments,
      IncidentRepository incidents,
      InventoryRepository inventory) {
    this.orders = orders;
    this.shipments = shipments;
    this.incidents = incidents;
    this.inventory = inventory;
  }

  public record DailyVolume(LocalDate date, long orders) {}

  public record CriticalStock(
      UUID inventoryId,
      String sku,
      String product,
      String warehouse,
      int available,
      int reorderLevel) {
    static CriticalStock from(InventoryLevel i) {
      return new CriticalStock(
          i.getId(),
          i.getProduct().getSku(),
          i.getProduct().getName(),
          i.getWarehouse().getName(),
          i.available(),
          i.getReorderLevel());
    }
  }

  public record RecentIncident(
      UUID id,
      UUID shipmentId,
      String trackingNumber,
      String title,
      IncidentSeverity severity,
      IncidentStatus status,
      Instant openedAt) {
    static RecentIncident from(Incident i) {
      return new RecentIncident(
          i.getId(),
          i.getShipment().getId(),
          i.getShipment().getTrackingNumber(),
          i.getTitle(),
          i.getSeverity(),
          i.getStatus(),
          i.getOpenedAt());
    }
  }

  public record MapItem(
      UUID id,
      String trackingNumber,
      BigDecimal latitude,
      BigDecimal longitude,
      DeliveryHealth deliveryHealth,
      int progress) {
    static MapItem from(Shipment s) {
      return new MapItem(
          s.getId(),
          s.getTrackingNumber(),
          s.getCurrentLatitude(),
          s.getCurrentLongitude(),
          s.getDeliveryHealth(),
          s.getSimulationProgress());
    }
  }

  public record Response(
      long ordersToday,
      long activeShipments,
      long delayedShipments,
      long openIncidents,
      List<DailyVolume> orderVolumeLast7Days,
      List<CriticalStock> criticalInventory,
      List<RecentIncident> recentIncidents,
      List<MapItem> activeShipmentMapItems) {}

  @Transactional(readOnly = true)
  public Response get() {
    LocalDate today = LocalDate.now(ZoneOffset.UTC);
    Instant startToday = today.atStartOfDay().toInstant(ZoneOffset.UTC);
    List<DailyVolume> volume = new ArrayList<>();
    for (int days = 6; days >= 0; days--) {
      LocalDate date = today.minusDays(days);
      Instant start = date.atStartOfDay().toInstant(ZoneOffset.UTC);
      volume.add(
          new DailyVolume(date, orders.countByCreatedAtBetween(start, start.plusSeconds(86400))));
    }
    List<Shipment> active = shipments.findByStatusOrderByUpdatedAtDesc(ShipmentStatus.IN_TRANSIT);
    return new Response(
        orders.countByCreatedAtBetween(startToday, startToday.plusSeconds(86400)),
        active.size(),
        shipments.countByDeliveryHealthAndStatus(DeliveryHealth.DELAYED, ShipmentStatus.IN_TRANSIT),
        incidents.countByStatus(IncidentStatus.OPEN),
        volume,
        inventory.findCritical(PageRequest.of(0, 7)).stream().map(CriticalStock::from).toList(),
        incidents.findTop6ByOrderByOpenedAtDesc().stream().map(RecentIncident::from).toList(),
        active.stream().map(MapItem::from).toList());
  }
}
