"use client";

import { UAE_EMIRATES, buildPlate, parsePlate } from "@/lib/booking-helpers";
import { useEffect, useState } from "react";

interface PlateInputProps {
  value: string;        // stored format e.g. DXBAA29999
  onChange: (stored: string) => void;
  disabled?: boolean;
}

export function PlateInput({ value, onChange, disabled }: PlateInputProps) {
  const parsed = parsePlate(value || null);
  const [emirate, setEmirate] = useState(parsed.emirate || "DXB");
  const [code, setCode] = useState(parsed.code || "");
  const [num, setNum] = useState(parsed.num || "");

  // Sync outward whenever any part changes
  useEffect(() => {
    onChange(buildPlate(emirate, code, num));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [emirate, code, num]);

  // If parent resets value to empty string
  useEffect(() => {
    if (!value) { setEmirate("DXB"); setCode(""); setNum(""); }
  }, [value]);

  return (
    <div className="flex gap-1.5 items-center">
      {/* Emirate */}
      <select
        value={emirate}
        onChange={(e) => setEmirate(e.target.value)}
        disabled={disabled}
        className="w-28 text-sm"
      >
        {UAE_EMIRATES.map((e) => (
          <option key={e.code} value={e.code}>{e.label}</option>
        ))}
      </select>

      {/* Plate code (letters) */}
      <input
        value={code}
        onChange={(e) => setCode(e.target.value.toUpperCase().replace(/[^A-Z]/g, ""))}
        placeholder="AA"
        maxLength={3}
        disabled={disabled}
        className="w-16 text-sm text-center font-mono"
      />

      {/* Plate number */}
      <input
        value={num}
        onChange={(e) => setNum(e.target.value.replace(/[^0-9]/g, ""))}
        placeholder="12345"
        maxLength={6}
        disabled={disabled}
        className="w-24 text-sm text-center font-mono"
      />
    </div>
  );
}
