package com.calishome.api.common.config;

import io.swagger.v3.oas.models.OpenAPI;
import io.swagger.v3.oas.models.info.Info;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

@Configuration
public class OpenApiConfig {

    @Bean
    public OpenAPI calisHomeOpenApi() {
        return new OpenAPI()
                .info(new Info()
                        .title("CalisHome API")
                        .version("v1")
                        .description("API REST de CalisHome para rutinas de calistenia sin material, progresión adaptativa y recordatorios."));
    }
}
