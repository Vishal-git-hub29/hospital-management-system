package com.hospital.appointmentservice.feign;

import com.hospital.appointmentservice.dto.DoctorDto;
import org.springframework.cloud.openfeign.FeignClient;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;

@FeignClient(name = "doctor-service", url = "http://doctor-service:8083")
public interface DoctorFeignClient {

    @GetMapping("/doctors/{id}")
    DoctorDto getDoctorById(@PathVariable Long id);
}
