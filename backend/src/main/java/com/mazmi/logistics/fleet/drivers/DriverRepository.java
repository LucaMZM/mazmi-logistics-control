package com.mazmi.logistics.fleet.drivers;

import java.util.List;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;

public interface DriverRepository extends JpaRepository<Driver, UUID> {
  List<Driver> findByActiveTrueOrderByFirstName();
}
