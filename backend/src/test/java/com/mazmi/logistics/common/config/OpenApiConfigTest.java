package com.mazmi.logistics.common.config;

import static org.assertj.core.api.Assertions.assertThat;

import io.swagger.v3.oas.models.OpenAPI;
import io.swagger.v3.oas.models.security.SecurityScheme;
import org.junit.jupiter.api.Test;

class OpenApiConfigTest {
  @Test
  void documentsCookieAuthenticationAndApiErrorSchema() {
    OpenAPI api = new OpenApiConfig().logisticsOpenApi();

    SecurityScheme cookieAuth = api.getComponents().getSecuritySchemes().get("cookieAuth");
    assertThat(cookieAuth.getType()).isEqualTo(SecurityScheme.Type.APIKEY);
    assertThat(cookieAuth.getIn()).isEqualTo(SecurityScheme.In.COOKIE);
    assertThat(cookieAuth.getName()).isEqualTo("mazmi_access");
    assertThat(api.getComponents().getSchemas()).containsKey("ApiError");
  }
}
