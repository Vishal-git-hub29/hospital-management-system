package com.hospital.appointmentservice.feign;

import com.hospital.appointmentservice.dto.PatientDto;
import org.springframework.cloud.openfeign.FeignClient;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;

@FeignClient(name = "patient-service", url = "http://patient-service:8081")
public interface PatientFeignClient {

    @GetMapping("/patients/{id}")
    PatientDto getPatientById(@PathVariable Long id);
}
