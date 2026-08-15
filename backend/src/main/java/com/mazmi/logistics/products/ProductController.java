package com.mazmi.logistics.products;

import com.mazmi.logistics.common.exception.BusinessException;
import jakarta.validation.Valid;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import java.math.BigDecimal;
import java.util.List;
import java.util.UUID;
import org.springframework.http.HttpStatus;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/products")
public class ProductController {
  private final ProductRepository products;

  public ProductController(ProductRepository products) {
    this.products = products;
  }

  public record Save(
      @NotBlank String sku,
      @NotBlank String name,
      @NotBlank String category,
      @NotBlank String description,
      @NotNull @DecimalMin("0.001") BigDecimal weightKg,
      @NotNull @DecimalMin("0") BigDecimal unitPrice,
      boolean active) {}

  public record Response(
      UUID id,
      String sku,
      String name,
      String category,
      String description,
      BigDecimal weightKg,
      BigDecimal unitPrice,
      boolean active) {
    static Response from(Product p) {
      return new Response(
          p.getId(),
          p.getSku(),
          p.getName(),
          p.getCategory(),
          p.getDescription(),
          p.getWeightKg(),
          p.getUnitPrice(),
          p.isActive());
    }
  }

  @GetMapping
  public List<Response> list() {
    return products.findAll().stream().map(Response::from).toList();
  }

  @GetMapping("/{id}")
  public Response get(@PathVariable UUID id) {
    return Response.from(find(id));
  }

  @PostMapping
  @ResponseStatus(HttpStatus.CREATED)
  @PreAuthorize("hasAnyRole('ADMIN','OPERATOR')")
  public Response create(@Valid @RequestBody Save request) {
    if (products.existsBySkuIgnoreCase(request.sku()))
      throw BusinessException.conflict(
          "SKU_ALREADY_EXISTS", "A product with this SKU already exists");
    return Response.from(products.save(apply(new Product(), request)));
  }

  @PutMapping("/{id}")
  @PreAuthorize("hasAnyRole('ADMIN','OPERATOR')")
  public Response update(@PathVariable UUID id, @Valid @RequestBody Save request) {
    return Response.from(products.save(apply(find(id), request)));
  }

  private Product find(UUID id) {
    return products.findById(id).orElseThrow(() -> BusinessException.notFound("Product"));
  }

  private Product apply(Product p, Save r) {
    p.setSku(r.sku());
    p.setName(r.name());
    p.setCategory(r.category());
    p.setDescription(r.description());
    p.setWeightKg(r.weightKg());
    p.setUnitPrice(r.unitPrice());
    p.setActive(r.active());
    return p;
  }
}
