package com.hospital.billingservice.kafka;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.hospital.billingservice.dto.AppointmentEvent;
import com.hospital.billingservice.entity.Billing;
import com.hospital.billingservice.repository.BillingRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.kafka.annotation.KafkaListener;
import org.springframework.stereotype.Service;

@Service
@RequiredArgsConstructor
public class BillingConsumer {

    private final BillingRepository billingRepository;

    private final ObjectMapper objectMapper = new ObjectMapper();

    @KafkaListener(
            topics = "appointment-topic",
            groupId = "billing-group"
    )
    public void consume(String message) {

        try {

            System.out.println("🔥 RAW MESSAGE: " + message);

            AppointmentEvent event =
                    objectMapper.readValue(message, AppointmentEvent.class);

            Billing bill = Billing.builder()
                    .appointmentId(event.getId())
                    .amount(500.0)
                    .status("PENDING")
                    .build();

            billingRepository.save(bill);

            System.out.println(
                    "✅ Bill generated for appointment: "
                            + event.getId()
            );

        } catch (Exception e) {
            e.printStackTrace();
        }
    }
}