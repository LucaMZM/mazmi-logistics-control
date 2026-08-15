package com.mazmi.logistics.fleet.vehicles;

import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.anyList;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.mazmi.logistics.common.exception.BusinessException;
import com.mazmi.logistics.shipments.ShipmentRepository;
import java.math.BigDecimal;
import java.util.Optional;
import java.util.UUID;
import org.junit.jupiter.api.Test;

class VehicleControllerTest {
  private final VehicleRepository vehicles = mock(VehicleRepository.class);
  private final ShipmentRepository shipments = mock(ShipmentRepository.class);
  private final VehicleController controller = new VehicleController(vehicles, shipments);

  @Test
  void inServiceCannotBeSetThroughCatalogMutation() {
    VehicleController.Save request = request(VehicleStatus.IN_SERVICE);

    assertThatThrownBy(() -> controller.create(request))
        .isInstanceOf(BusinessException.class)
        .hasMessageContaining("managed by the shipment workflow");
    verify(vehicles, never()).save(org.mockito.ArgumentMatchers.any());
  }

  @Test
  void assignedVehicleCannotBeEdited() {
    UUID id = UUID.randomUUID();
    Vehicle vehicle = new Vehicle();
    vehicle.setId(id);
    when(vehicles.findById(id)).thenReturn(Optional.of(vehicle));
    when(shipments.existsByVehicleIdAndStatusIn(org.mockito.ArgumentMatchers.eq(id), anyList()))
        .thenReturn(true);

    assertThatThrownBy(() -> controller.update(id, request(VehicleStatus.AVAILABLE)))
        .isInstanceOf(BusinessException.class)
        .hasMessageContaining("cannot be edited");
    verify(vehicles, never()).save(org.mockito.ArgumentMatchers.any());
  }

  private VehicleController.Save request(VehicleStatus status) {
    return new VehicleController.Save(
        "MZ00TEST", "Demo Van", VehicleType.VAN, BigDecimal.valueOf(1500), status, true);
  }
}
