package com.mazmi.logistics.dashboard;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

import com.mazmi.logistics.fleet.vehicles.Vehicle;
import com.mazmi.logistics.fleet.vehicles.VehicleType;
import com.mazmi.logistics.orders.Order;
import com.mazmi.logistics.shipments.Shipment;
import java.util.UUID;
import org.junit.jupiter.api.Test;
import org.mockito.Answers;

class DashboardMapItemTest {
  @Test
  void preservesVerifiedVehicleIdentityWithoutConfusingShipmentId() {
    Shipment shipment = mock(Shipment.class);
    Order order = mock(Order.class, Answers.RETURNS_DEEP_STUBS);
    Vehicle vehicle = mock(Vehicle.class);
    UUID shipmentId = UUID.randomUUID();
    UUID vehicleId = UUID.randomUUID();
    when(shipment.getId()).thenReturn(shipmentId);
    when(shipment.getOrder()).thenReturn(order);
    when(shipment.getVehicle()).thenReturn(vehicle);
    when(vehicle.getId()).thenReturn(vehicleId);
    when(vehicle.getRegistrationPlate()).thenReturn("DEMO 01");
    when(vehicle.getVehicleType()).thenReturn(VehicleType.VAN);
    var item = DashboardService.MapItem.from(shipment);
    assertThat(item.id()).isEqualTo(shipmentId);
    assertThat(item.vehicleId()).isEqualTo(vehicleId).isNotEqualTo(shipmentId);
    assertThat(item.registrationPlate()).isEqualTo("DEMO 01");
    assertThat(item.vehicleType()).isEqualTo("VAN");
    assertThat(item.driver()).isNull();
  }

  @Test
  void unassignedShipmentDoesNotInventVehicleOrDriver() {
    Shipment shipment = mock(Shipment.class);
    when(shipment.getOrder()).thenReturn(mock(Order.class, Answers.RETURNS_DEEP_STUBS));
    var item = DashboardService.MapItem.from(shipment);
    assertThat(item.vehicleId()).isNull();
    assertThat(item.registrationPlate()).isNull();
    assertThat(item.vehicleType()).isNull();
    assertThat(item.driver()).isNull();
  }
}
