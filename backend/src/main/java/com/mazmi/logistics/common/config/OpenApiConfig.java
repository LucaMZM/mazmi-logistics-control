package com.mazmi.logistics.common.config;

import com.mazmi.logistics.common.web.ApiError;
import io.swagger.v3.core.converter.ModelConverters;
import io.swagger.v3.oas.models.Components;
import io.swagger.v3.oas.models.OpenAPI;
import io.swagger.v3.oas.models.info.Info;
import io.swagger.v3.oas.models.security.SecurityScheme;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

@Configuration
public class OpenApiConfig {
  @Bean
  OpenAPI logisticsOpenApi() {
    return new OpenAPI()
        .components(
            new Components()
                .schemas(ModelConverters.getInstance().read(ApiError.class))
                .addSecuritySchemes(
                    "cookieAuth",
                    new SecurityScheme()
                        .type(SecurityScheme.Type.APIKEY)
                        .in(SecurityScheme.In.COOKIE)
                        .name("mazmi_access")
                        .description(
                            "HttpOnly JWT cookie issued by POST /api/v1/auth/login. "
                                + "State-changing requests also require the X-XSRF-TOKEN header.")))
        .info(
            new Info()
                .title("Mazmi Logistics Control API")
                .version("v1")
                .description("REST API for the fictional logistics operations demo."));
  }
}
