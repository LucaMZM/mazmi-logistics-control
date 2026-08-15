package com.mazmi.logistics.fleet.drivers;

import com.mazmi.logistics.common.jpa.AuditedEntity;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.Table;

@Entity
@Table(name = "drivers")
public class Driver extends AuditedEntity {
  @Column(name = "employee_code", nullable = false, unique = true, length = 30)
  private String employeeCode;

  @Column(name = "first_name", nullable = false, length = 80)
  private String firstName;

  @Column(name = "last_name", nullable = false, length = 100)
  private String lastName;

  @Column(nullable = false, length = 40)
  private String phone;

  @Column(name = "license_number", nullable = false, unique = true, length = 60)
  private String licenseNumber;

  @Enumerated(EnumType.STRING)
  @Column(nullable = false, length = 20)
  private DriverStatus status = DriverStatus.AVAILABLE;

  @Column(nullable = false)
  private boolean active = true;

  public String getEmployeeCode() {
    return employeeCode;
  }

  public void setEmployeeCode(String employeeCode) {
    this.employeeCode = employeeCode;
  }

  public String getFirstName() {
    return firstName;
  }

  public void setFirstName(String firstName) {
    this.firstName = firstName;
  }

  public String getLastName() {
    return lastName;
  }

  public void setLastName(String lastName) {
    this.lastName = lastName;
  }

  public String getPhone() {
    return phone;
  }

  public void setPhone(String phone) {
    this.phone = phone;
  }

  public String getLicenseNumber() {
    return licenseNumber;
  }

  public void setLicenseNumber(String licenseNumber) {
    this.licenseNumber = licenseNumber;
  }

  public DriverStatus getStatus() {
    return status;
  }

  public void setStatus(DriverStatus status) {
    this.status = status;
  }

  public boolean isActive() {
    return active;
  }

  public void setActive(boolean active) {
    this.active = active;
  }

  public String getFullName() {
    return firstName + " " + lastName;
  }
}
