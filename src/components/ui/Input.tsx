import { useState, useEffect, useCallback } from 'react';
import type { InputHTMLAttributes } from 'react';

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  /** 小号输入框（如组数、次数） */
  small?: boolean;
}

export function Input({ small, className = '', value, onChange, type, ...props }: InputProps) {
  // number 且 value 为 0 时，允许清空后显示空白再输入（否则删掉 0 会立刻变回 0）
  const [isEmptyZero, setIsEmptyZero] = useState(false);
  const isNumberZero = type === 'number' && value === 0;

  useEffect(() => {
    if (!isNumberZero) setIsEmptyZero(false);
  }, [isNumberZero]);

  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      if (type === 'number' && e.target.value === '') setIsEmptyZero(true);
      else if (type === 'number') setIsEmptyZero(false);
      onChange?.(e);
    },
    [onChange, type]
  );

  const displayValue =
    type === 'number' && value === 0 && isEmptyZero
      ? ''
      : (type === 'number' && typeof value === 'number' ? String(value) : value);

  return (
    <input
      type={type}
      className={`input ${type === 'number' ? 'input-type-number' : ''} ${small ? 'input-small' : ''} ${className}`.trim()}
      value={displayValue}
      onChange={handleChange}
      {...props}
    />
  );
}
