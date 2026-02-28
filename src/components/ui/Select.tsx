import * as SelectPrimitive from '@radix-ui/react-select';
import type { ReactNode } from 'react';

export interface SelectOption {
  value: string;
  label: ReactNode;
}

interface SelectProps {
  value: string;
  onValueChange: (value: string) => void;
  options: SelectOption[];
  placeholder?: string;
  className?: string;
  /** 与 .chart-select 等现有样式兼容 */
  variant?: 'default' | 'chart';
}

export function Select({
  value,
  onValueChange,
  options,
  placeholder = '请选择',
  className = '',
  variant = 'default',
}: SelectProps) {
  const triggerClass = variant === 'chart' ? 'radix-select-trigger chart-select' : 'radix-select-trigger';
  return (
    <SelectPrimitive.Root value={value || undefined} onValueChange={onValueChange}>
      <SelectPrimitive.Trigger className={`${triggerClass} ${className}`.trim()}>
        <SelectPrimitive.Value placeholder={placeholder} />
        <SelectPrimitive.Icon className="radix-select-icon" />
      </SelectPrimitive.Trigger>
      <SelectPrimitive.Portal>
        <SelectPrimitive.Content className="radix-select-content" position="popper" sideOffset={4}>
          <SelectPrimitive.Viewport>
            {options.map((opt) => (
              <SelectPrimitive.Item
                key={opt.value}
                value={opt.value}
                className="radix-select-item"
              >
                <SelectPrimitive.ItemText>{opt.label}</SelectPrimitive.ItemText>
              </SelectPrimitive.Item>
            ))}
          </SelectPrimitive.Viewport>
        </SelectPrimitive.Content>
      </SelectPrimitive.Portal>
    </SelectPrimitive.Root>
  );
}
