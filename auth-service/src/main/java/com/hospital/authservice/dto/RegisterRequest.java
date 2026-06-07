package com.hospital.authservice.dto;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;
import lombok.*;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
public class RegisterRequest {

    @NotBlank(message = "Full name is required")
    private String fullName;

    @NotBlank(message = "Email is required")
    @Email(message = "Email must be a valid email address")
    @Pattern(
            regexp = "^[A-Za-z0-9._%+-]+@gmail\\.com$",
            message = "Email must be a @gmail.com address"
    )
    private String email;

    // At least 8 chars, with one uppercase, one lowercase, one digit, and one special character.
    @NotBlank(message = "Password is required")
    @Size(min = 8, message = "Password must be at least 8 characters")
    @Pattern(
            regexp = "^(?=.*[a-z])(?=.*[A-Z])(?=.*\\d)(?=.*[@$!%*?&#])[A-Za-z\\d@$!%*?&#]{8,}$",
            message = "Password must contain an uppercase letter, a lowercase letter, a digit, and a special character (@$!%*?&#)"
    )
    private String password;
}
