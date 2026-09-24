'use client';

import React from 'react';

/**
 * Shared form primitives for the trade desk panels.
 *
 * The admin forms are long and repetitive; keeping the field chrome here means
 * each panel reads as a list of what it edits rather than a wall of class
 * names, and the three panels stay visually identical.
 */

const inputClass =
  'w-full px-3 py-2 rounded-lg bg-[#FAF8F5] dark:bg-[#121110] border border-[#E0D8CE] dark:border-[#332F2B] text-sm text-[#1A1918] dark:text-[#F5F2ED] placeholder:text-[#A8A29E] dark:placeholder:text-[#6E6760] focus:outline-none focus:border-[#C5A880] transition-colors';

export const Label: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <span className="block text-xs uppercase tracking-[0.16em] text-[#57534E] dark:text-[#A69C94] font-bold mb-1.5">
    {children}
  </span>
);

interface FieldProps {
  label: string;
  value: string | number;
  onChange: (value: string) => void;
  placeholder?: string;
  type?: string;
  step?: string;
}

export const Field: React.FC<FieldProps> = ({
  label,
  value,
  onChange,
  placeholder,
  type = 'text',
  step,
}) => (
  <label className="block">
    <Label>{label}</Label>
    <input
      type={type}
      step={step}
      value={value}
      placeholder={placeholder}
      onChange={(e) => onChange(e.target.value)}
      className={inputClass}
    />
  </label>
);

interface AreaProps {
  label: string;
  value: string;
  onChange: (value: string) => void;
  rows?: number;
  placeholder?: string;
  hint?: string;
}

export const Area: React.FC<AreaProps> = ({
  label,
  value,
  onChange,
  rows = 3,
  placeholder,
  hint,
}) => (
  <label className="block">
    <Label>{label}</Label>
    <textarea
      rows={rows}
      value={value}
      placeholder={placeholder}
      onChange={(e) => onChange(e.target.value)}
      className={inputClass}
    />
    {hint && (
      <span className="block mt-1 text-xs text-[#8C827A] dark:text-[#6E6760] font-light">
        {hint}
      </span>
    )}
  </label>
);

interface SelectProps {
  label: string;
  value: string;
  options: readonly string[];
  onChange: (value: string) => void;
}

export const Select: React.FC<SelectProps> = ({ label, value, options, onChange }) => (
  <label className="block">
    <Label>{label}</Label>
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className={`${inputClass} cursor-pointer`}
    >
      {options.map((option) => (
        <option key={option} value={option}>
          {option}
        </option>
      ))}
    </select>
  </label>
);

export const Toggle: React.FC<{
  label: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
}> = ({ label, checked, onChange }) => (
  <label className="flex items-center gap-2.5 cursor-pointer select-none pt-1">
    <input
      type="checkbox"
      checked={checked}
      onChange={(e) => onChange(e.target.checked)}
      className="w-4 h-4 accent-[#C5A880] cursor-pointer"
    />
    <span className="text-xs uppercase tracking-[0.16em] text-[#57534E] dark:text-[#A69C94] font-bold">
      {label}
    </span>
  </label>
);

/** Success or failure banner shown above each panel's form. */
export const Notice: React.FC<{ error?: string | null; message?: string | null }> = ({
  error,
  message,
}) => {
  if (!error && !message) return null;

  return (
    <p
      role={error ? 'alert' : 'status'}
      className={`text-xs sm:text-sm font-semibold rounded-lg px-4 py-2.5 border ${
        error
          ? 'text-[#A3524A] dark:text-[#E0897F] bg-[#FDF3F2] dark:bg-[#2A1614] border-[#E9C9C4] dark:border-[#4A2622]'
          : 'text-[#2E7D32] dark:text-[#81C784] bg-[#F1F8F1] dark:bg-[#15291A] border-[#C8E6C9] dark:border-[#2E5235]'
      }`}
    >
      {error ?? message}
    </p>
  );
};

export const PrimaryButton: React.FC<{
  children: React.ReactNode;
  onClick?: () => void;
  disabled?: boolean;
  type?: 'button' | 'submit';
}> = ({ children, onClick, disabled, type = 'button' }) => (
  <button
    type={type}
    onClick={onClick}
    disabled={disabled}
    className="px-6 py-2.5 bg-[#1A1918] dark:bg-[#F5F2ED] text-[#FAF8F5] dark:text-[#1A1918] rounded text-xs uppercase tracking-wider font-bold hover:bg-[#33312E] dark:hover:bg-[#E3DDD4] transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
  >
    {children}
  </button>
);

export const GhostButton: React.FC<{
  children: React.ReactNode;
  onClick?: () => void;
  disabled?: boolean;
  danger?: boolean;
}> = ({ children, onClick, disabled, danger }) => (
  <button
    type="button"
    onClick={onClick}
    disabled={disabled}
    className={`px-4 py-2 rounded text-xs uppercase tracking-wider font-bold border transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed ${
      danger
        ? 'border-[#E9C9C4] dark:border-[#4A2622] text-[#A3524A] dark:text-[#E0897F] hover:bg-[#FDF3F2] dark:hover:bg-[#2A1614]'
        : 'border-[#D5CDC4] dark:border-[#38332E] text-[#57534E] dark:text-[#D5CDC4] hover:border-[#1A1918] dark:hover:border-[#F5F2ED]'
    }`}
  >
    {children}
  </button>
);
