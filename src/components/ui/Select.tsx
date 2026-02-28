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
  /** 是否支持清空选择（会多出一项「清空」选项） */
  clearable?: boolean;
  /** clearable 时清空项的文案，默认「清空」 */
  clearLabel?: string;
}

/** Radix Select 不允许 value=""，用占位值表示清空，onChange 时转为 '' */
const CLEAR_PLACEHOLDER_VALUE = '__clear__';

export function Select({
  value,
  onValueChange,
  options,
  placeholder = '请选择',
  className = '',
  variant = 'default',
  clearable = false,
  clearLabel = '清空',
}: SelectProps) {
  const triggerClass = variant === 'chart' ? 'radix-select-trigger chart-select' : 'radix-select-trigger';
  const displayOptions: SelectOption[] = clearable
    ? [{ value: CLEAR_PLACEHOLDER_VALUE, label: clearLabel }, ...options]
    : options;
  const rootValue = value === '' ? CLEAR_PLACEHOLDER_VALUE : value;
  const handleChange = (v: string) => onValueChange(v === CLEAR_PLACEHOLDER_VALUE ? '' : v);

  return (
    <SelectPrimitive.Root value={rootValue} onValueChange={handleChange}>
      <SelectPrimitive.Trigger className={`${triggerClass} ${className}`.trim()}>
        <SelectPrimitive.Value placeholder={placeholder} />
        <SelectPrimitive.Icon className="radix-select-icon" />
      </SelectPrimitive.Trigger>
      <SelectPrimitive.Portal>
        <SelectPrimitive.Content className="radix-select-content" position="popper" sideOffset={4}>
          <SelectPrimitive.Viewport>
            {displayOptions.map((opt) => (
              <SelectPrimitive.Item
                key={opt.value === CLEAR_PLACEHOLDER_VALUE ? '__clear__' : opt.value}
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
