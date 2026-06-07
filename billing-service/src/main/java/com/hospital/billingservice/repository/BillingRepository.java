package com.hospital.billingservice.repository;

import com.hospital.billingservice.entity.Billing;
import org.springframework.data.jpa.repository.JpaRepository;

public interface BillingRepository
        extends JpaRepository<Billing, Long> {
}