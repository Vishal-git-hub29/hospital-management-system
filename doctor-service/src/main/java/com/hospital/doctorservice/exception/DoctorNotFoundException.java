package com.hospital.doctorservice.exception;

public class DoctorNotFoundException extends RuntimeException {

    public DoctorNotFoundException(String message) {
        super(message);
    }
}