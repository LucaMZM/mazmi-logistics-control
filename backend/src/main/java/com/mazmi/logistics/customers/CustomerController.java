package com.mazmi.logistics.customers;

import com.mazmi.logistics.common.exception.BusinessException;
import com.mazmi.logistics.common.web.PageResponse;
import jakarta.validation.Valid;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import java.math.BigDecimal;
import java.time.Instant;
import java.util.UUID;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.http.HttpStatus;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/customers")
public class CustomerController {
  private final CustomerRepository customers;

  public CustomerController(CustomerRepository customers) {
    this.customers = customers;
  }

  public record Save(
      @NotBlank String code,
      @NotBlank String companyName,
      @NotBlank String contactName,
      @NotBlank @Email String email,
      @NotBlank String phone,
      @NotBlank String address,
      @NotBlank String city,
      @NotBlank String postalCode,
      @NotBlank String country,
      @NotNull BigDecimal latitude,
      @NotNull BigDecimal longitude,
      boolean active) {}

  public record Response(
      UUID id,
      String code,
      String companyName,
      String contactName,
      String email,
      String phone,
      String address,
      String city,
      String postalCode,
      String country,
      BigDecimal latitude,
      BigDecimal longitude,
      boolean active,
      Instant createdAt) {
    static Response from(Customer c) {
      return new Response(
          c.getId(),
          c.getCode(),
          c.getCompanyName(),
          c.getContactName(),
          c.getEmail(),
          c.getPhone(),
          c.getAddress(),
          c.getCity(),
          c.getPostalCode(),
          c.getCountry(),
          c.getLatitude(),
          c.getLongitude(),
          c.isActive(),
          c.getCreatedAt());
    }
  }

  @GetMapping
  public PageResponse<Response> list(
      @RequestParam(defaultValue = "") String search,
      @RequestParam(defaultValue = "0") int page,
      @RequestParam(defaultValue = "20") int size) {
    Page<Customer> result =
        search.isBlank()
            ? customers.findAll(PageRequest.of(page, Math.min(size, 100), Sort.by("companyName")))
            : customers.findByCompanyNameContainingIgnoreCaseOrCodeContainingIgnoreCase(
                search, search, PageRequest.of(page, Math.min(size, 100), Sort.by("companyName")));
    return PageResponse.from(result, Response::from);
  }

  @GetMapping("/{id}")
  public Response get(@PathVariable UUID id) {
    return Response.from(find(id));
  }

  @PostMapping
  @ResponseStatus(HttpStatus.CREATED)
  @PreAuthorize("hasAnyRole('ADMIN','OPERATOR')")
  public Response create(@Valid @RequestBody Save request) {
    return Response.from(customers.save(apply(new Customer(), request)));
  }

  @PutMapping("/{id}")
  @PreAuthorize("hasAnyRole('ADMIN','OPERATOR')")
  public Response update(@PathVariable UUID id, @Valid @RequestBody Save request) {
    return Response.from(customers.save(apply(find(id), request)));
  }

  private Customer find(UUID id) {
    return customers.findById(id).orElseThrow(() -> BusinessException.notFound("Customer"));
  }

  private Customer apply(Customer c, Save r) {
    c.setCode(r.code());
    c.setCompanyName(r.companyName());
    c.setContactName(r.contactName());
    c.setEmail(r.email());
    c.setPhone(r.phone());
    c.setAddress(r.address());
    c.setCity(r.city());
    c.setPostalCode(r.postalCode());
    c.setCountry(r.country());
    c.setLatitude(r.latitude());
    c.setLongitude(r.longitude());
    c.setActive(r.active());
    return c;
  }
}
