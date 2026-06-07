package com.hospital.billingservice.entity;

import jakarta.persistence.*;
import lombok.*;

@Entity
@Table(name = "bills")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Billing {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    private Long appointmentId;

    private Double amount;

    private String status;
}