package com.calishome.api.common.web;

import java.net.URI;
import org.springframework.http.HttpStatus;

public class ApiException extends RuntimeException {

    private final HttpStatus status;
    private final String title;
    private final URI type;

    public ApiException(HttpStatus status, String title, String detail, String errorSlug) {
        super(detail);
        this.status = status;
        this.title = title;
        this.type = URI.create("https://calishome.app/errors/" + errorSlug);
    }

    public HttpStatus getStatus() {
        return status;
    }

    public String getTitle() {
        return title;
    }

    public URI getType() {
        return type;
    }
}
