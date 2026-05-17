"use client";

import { useState } from "react";
import { isValidUAEPhone } from "@/lib/booking-helpers";

interface PhoneInputProps {
  value: string;
  onChange: (val: string) => void;
  disabled?: boolean;
  required?: boolean;
}

export function PhoneInput({ value, onChange, disabled, required }: PhoneInputProps) {
  const [touched, setTouched] = useState(false);

  const digits = value.replace(/\D/g, "");
  const isValid = !value || isValidUAEPhone(value);
  const showError = touched && value && !isValid;

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    // Allow only digits, spaces, dashes, +
    const raw = e.target.value.replace(/[^\d\s\-+]/g, "");
    onChange(raw);
  };

  return (
    <div>
      <input
        type="tel"
        value={value}
        onChange={handleChange}
        onBlur={() => setTouched(true)}
        placeholder="050 123 4567"
        disabled={disabled}
        required={required}
        maxLength={15}
        className={`w-full ${showError ? "border-red-400 focus:border-red-500 focus:ring-red-500/20" : ""}`}
      />
      {showError && (
        <p className="mt-1 text-xs text-red-600 dark:text-red-400">
          Enter a valid UAE number (e.g. 050 123 4567 or 04 123 4567)
        </p>
      )}
      {!showError && !value && (
        <p className="mt-1 text-xs text-slate-400">
          Mobile: 050 / 052 / 054 / 055 / 056 / 058 &nbsp;·&nbsp; Landline: 02 / 04 / 06 / 07 / 09
        </p>
      )}
    </div>
  );
}
