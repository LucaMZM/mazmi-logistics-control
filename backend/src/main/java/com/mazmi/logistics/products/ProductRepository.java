package com.mazmi.logistics.products;

import java.util.List;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;

public interface ProductRepository extends JpaRepository<Product, UUID> {
  List<Product> findByActiveTrueOrderByName();

  boolean existsBySkuIgnoreCase(String sku);
}
