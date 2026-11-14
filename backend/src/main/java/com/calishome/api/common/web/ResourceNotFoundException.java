package com.calishome.api.common.web;

import org.springframework.http.HttpStatus;

public class ResourceNotFoundException extends ApiException {

    public ResourceNotFoundException(String detail) {
        super(HttpStatus.NOT_FOUND, "Recurso no encontrado", detail, "not-found");
    }
}
