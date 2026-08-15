package com.mazmi.logistics.fleet.drivers;

import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.anyList;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.mazmi.logistics.common.exception.BusinessException;
import com.mazmi.logistics.shipments.ShipmentRepository;
import java.util.Optional;
import java.util.UUID;
import org.junit.jupiter.api.Test;

class DriverControllerTest {
  private final DriverRepository drivers = mock(DriverRepository.class);
  private final ShipmentRepository shipments = mock(ShipmentRepository.class);
  private final DriverController controller = new DriverController(drivers, shipments);

  @Test
  void onRouteCannotBeSetThroughCatalogMutation() {
    DriverController.Save request = request(DriverStatus.ON_ROUTE);

    assertThatThrownBy(() -> controller.create(request))
        .isInstanceOf(BusinessException.class)
        .hasMessageContaining("managed by the shipment workflow");
    verify(drivers, never()).save(org.mockito.ArgumentMatchers.any());
  }

  @Test
  void assignedDriverCannotBeEdited() {
    UUID id = UUID.randomUUID();
    Driver driver = new Driver();
    driver.setId(id);
    when(drivers.findById(id)).thenReturn(Optional.of(driver));
    when(shipments.existsByDriverIdAndStatusIn(org.mockito.ArgumentMatchers.eq(id), anyList()))
        .thenReturn(true);

    assertThatThrownBy(() -> controller.update(id, request(DriverStatus.AVAILABLE)))
        .isInstanceOf(BusinessException.class)
        .hasMessageContaining("cannot be edited");
    verify(drivers, never()).save(org.mockito.ArgumentMatchers.any());
  }

  private DriverController.Save request(DriverStatus status) {
    return new DriverController.Save(
        "DRV-TEST", "Demo", "Driver", "+34 600 000 000", "TEST-LICENSE", status, true);
  }
}
