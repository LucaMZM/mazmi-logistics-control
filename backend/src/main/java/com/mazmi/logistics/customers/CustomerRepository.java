package com.mazmi.logistics.customers;

import java.util.UUID;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;

public interface CustomerRepository extends JpaRepository<Customer, UUID> {
  Page<Customer> findByCompanyNameContainingIgnoreCaseOrCodeContainingIgnoreCase(
      String name, String code, Pageable pageable);
}
