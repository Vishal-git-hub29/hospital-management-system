package com.hospital.appointmentservice.dto;

import lombok.*;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class PatientDto {

    private Long id;

    private String name;

    private Integer age;

    private String gender;

    private String department;

    private String phone;
}
