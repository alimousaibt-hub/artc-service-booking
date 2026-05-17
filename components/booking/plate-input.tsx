"use client";

import { UAE_EMIRATES, PLATE_CODES_BY_EMIRATE, buildPlate, parsePlate } from "@/lib/booking-helpers";
import { useEffect, useState } from "react";

interface PlateInputProps {
  value: string;
  onChange: (stored: string) => void;
  disabled?: boolean;
}

export function PlateInput({ value, onChange, disabled }: PlateInputProps) {
  const parsed = parsePlate(value || null);
  const [emirate, setEmirate] = useState(parsed.emirate || "DXB");
  const [code, setCode] = useState(parsed.code || "");
  const [num, setNum] = useState(parsed.num || "");

  const codes = PLATE_CODES_BY_EMIRATE[emirate] ?? [""];

  useEffect(() => {
    if (!codes.includes(code)) setCode(codes[0] ?? "");
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [emirate]);

  useEffect(() => {
    onChange(buildPlate(emirate, code, num));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [emirate, code, num]);

  useEffect(() => {
    if (!value) { setEmirate("DXB"); setCode(""); setNum(""); }
  }, [value]);

  return (
    <div className="flex gap-1.5 items-center flex-wrap">
      <select value={emirate} onChange={e => setEmirate(e.target.value)}
        disabled={disabled} className="w-28 text-sm">
        {UAE_EMIRATES.map(e => (
          <option key={e.code} value={e.code}>{e.label}</option>
        ))}
      </select>

      <select value={code} onChange={e => setCode(e.target.value)}
        disabled={disabled} className="w-20 text-sm font-mono">
        {codes.map(c => (
          <option key={c} value={c}>{c || "(none)"}</option>
        ))}
      </select>

      <input value={num} onChange={e => setNum(e.target.value.replace(/[^0-9]/g, ""))}
        placeholder="12345" maxLength={6} disabled={disabled}
        className="w-24 text-sm text-center font-mono" />

      {(code || num) && (
        <span className="text-xs font-mono text-slate-400 ml-1">
          → {buildPlate(emirate, code, num)}
        </span>
      )}
    </div>
  );
}
