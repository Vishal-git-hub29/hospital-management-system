package com.hospital.appointmentservice.dto;

import lombok.*;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class DoctorDto {

    private Long id;

    private String name;

    private String specialization;

    private Long patientId;
}
