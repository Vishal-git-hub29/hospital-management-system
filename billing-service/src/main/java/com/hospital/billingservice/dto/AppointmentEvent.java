package com.hospital.billingservice.dto;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import lombok.*;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
@JsonIgnoreProperties(ignoreUnknown = true)
public class AppointmentEvent {

    private Long id;

    private Long patientId;

    private Long doctorId;

    private String appointmentDate;

    private String status;
}