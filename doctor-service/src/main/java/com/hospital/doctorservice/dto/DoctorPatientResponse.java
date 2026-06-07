package com.hospital.doctorservice.dto;

import com.hospital.doctorservice.entity.Doctor;
import lombok.*;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class DoctorPatientResponse {

    private Doctor doctor;

    private PatientDto patient;
}