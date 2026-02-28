import type { InputHTMLAttributes } from 'react';

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  /** 小号输入框（如组数、次数） */
  small?: boolean;
}

export function Input({ small, className = '', ...props }: InputProps) {
  return (
    <input
      className={`input ${small ? 'input-small' : ''} ${className}`.trim()}
      {...props}
    />
  );
}
