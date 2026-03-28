"use client";

import { useEffect, useMemo, useState } from "react";

const MONETARY_AMOUNT_OPTIONS = [100000, 50000] as const;
type MonetaryAmountPreset = `${(typeof MONETARY_AMOUNT_OPTIONS)[number]}` | "MANUAL";

const normalizeValue = (value: string | number | null | undefined) => {
  if (value === null || value === undefined) return "";
  return String(value);
};

const parseValue = (value: string | number | null | undefined) => {
  const normalized = normalizeValue(value).trim();
  if (normalized === "") return null;
  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? parsed : null;
};

const resolvePreset = (value: string | number | null | undefined): MonetaryAmountPreset => {
  const parsed = parseValue(value);
  if (parsed !== null && MONETARY_AMOUNT_OPTIONS.includes(parsed as (typeof MONETARY_AMOUNT_OPTIONS)[number])) {
    return String(parsed) as MonetaryAmountPreset;
  }
  return "MANUAL";
};

interface MonetaryAmountSelectorProps {
  value: string | number | null | undefined;
  onChange: (value: string) => void;
  disabled?: boolean;
  selectClassName?: string;
  inputClassName?: string;
  summaryClassName?: string;
  wrapperClassName?: string;
  manualPlaceholder?: string;
  showCurrencyPrefix?: boolean;
  autoFocusManualInput?: boolean;
}

export default function MonetaryAmountSelector({
  value,
  onChange,
  disabled = false,
  selectClassName = "",
  inputClassName = "",
  summaryClassName = "",
  wrapperClassName = "space-y-2",
  manualPlaceholder = "0",
  showCurrencyPrefix = false,
  autoFocusManualInput = false,
}: MonetaryAmountSelectorProps) {
  const [preset, setPreset] = useState<MonetaryAmountPreset>(resolvePreset(value));

  useEffect(() => {
    setPreset(resolvePreset(value));
  }, [value]);

  const formattedAmount = useMemo(() => {
    const parsed = parseValue(value);
    return (parsed ?? 0).toLocaleString("es-PY");
  }, [value]);

  const normalizedValue = normalizeValue(value);

  return (
    <div className={wrapperClassName}>
      <select
        className={selectClassName}
        value={preset}
        disabled={disabled}
        onChange={(e) => {
          const nextPreset = e.target.value as MonetaryAmountPreset;
          setPreset(nextPreset);
          if (nextPreset !== "MANUAL") {
            onChange(nextPreset);
          }
        }}
      >
        <option value="100000">Gs. 100.000</option>
        <option value="50000">Gs. 50.000</option>
        <option value="MANUAL">Manual</option>
      </select>

      {preset === "MANUAL" ? (
        showCurrencyPrefix ? (
          <div className="relative">
            <span className="absolute left-3 top-2 text-zinc-500 text-sm">Gs.</span>
            <input
              type="number"
              min="0"
              className={inputClassName}
              placeholder={manualPlaceholder}
              value={normalizedValue}
              onChange={(e) => onChange(e.target.value)}
              disabled={disabled}
              autoFocus={autoFocusManualInput}
            />
          </div>
        ) : (
          <input
            type="number"
            min="0"
            className={inputClassName}
            placeholder={manualPlaceholder}
            value={normalizedValue}
            onChange={(e) => onChange(e.target.value)}
            disabled={disabled}
            autoFocus={autoFocusManualInput}
          />
        )
      ) : (
        <div className={summaryClassName}>Monto seleccionado: Gs. {formattedAmount}</div>
      )}
    </div>
  );
}
