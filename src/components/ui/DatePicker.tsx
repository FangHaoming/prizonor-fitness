import { useState } from 'react';
import * as Popover from '@radix-ui/react-popover';
import { DayPicker } from 'react-day-picker';
import 'react-day-picker/style.css';

interface DatePickerProps {
  value: string;
  onChange: (value: string) => void;
  max?: string;
  min?: string;
  className?: string;
  placeholder?: string;
}

/** 将 YYYY-MM-DD 解析为本地日期（避免 UTC 导致差一天） */
function toDate(s: string): Date | undefined {
  if (!s || s.length < 10) return undefined;
  const y = parseInt(s.slice(0, 4), 10);
  const m = parseInt(s.slice(5, 7), 10) - 1;
  const day = parseInt(s.slice(8, 10), 10);
  if (Number.isNaN(y) || Number.isNaN(m) || Number.isNaN(day)) return undefined;
  const d = new Date(y, m, day);
  return Number.isNaN(d.getTime()) ? undefined : d;
}

/** 按本地日期输出 YYYY-MM-DD（避免 toISOString 转 UTC 导致差一天） */
function toYYYYMMDD(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

export function DatePicker({
  value,
  onChange,
  max,
  min,
  className = '',
  placeholder = '选择日期',
}: DatePickerProps) {
  const [open, setOpen] = useState(false);
  const selected = toDate(value);
  const maxDate = max ? toDate(max) : undefined;
  const minDate = min ? toDate(min) : undefined;

  const handleSelect = (date: Date | undefined) => {
    if (!date) return;
    onChange(toYYYYMMDD(date));
    setOpen(false);
  };

  const todayStr = toYYYYMMDD(new Date());
  const isTodayDisabled = Boolean(
    (min && todayStr < min) || (max && todayStr > max)
  );

  const handleToday = () => {
    if (!isTodayDisabled) {
      onChange(todayStr);
      setOpen(false);
    }
  };

  const handleClear = () => {
    onChange('');
    setOpen(false);
  };

  const displayText = value ? value : placeholder;

  return (
    <Popover.Root open={open} onOpenChange={setOpen}>
      <Popover.Trigger asChild>
        <button
          type="button"
          className={`input input-date-trigger ${className}`.trim()}
          aria-label="选择日期"
        >
          {displayText}
        </button>
      </Popover.Trigger>
      <Popover.Portal>
        <Popover.Content className="radix-datepicker-content" sideOffset={4} align="start">
          <DayPicker
            mode="single"
            selected={selected}
            onSelect={handleSelect}
            disabled={(date) => {
              if (minDate && date < minDate) return true;
              if (maxDate && date > maxDate) return true;
              return false;
            }}
            defaultMonth={selected ?? maxDate ?? new Date()}
          />
          <div className="datepicker-quick-actions">
            <button
              type="button"
              className="datepicker-quick-btn"
              onClick={handleToday}
              disabled={isTodayDisabled}
            >
              今天
            </button>
            <button type="button" className="datepicker-quick-btn" onClick={handleClear}>
              清空
            </button>
          </div>
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  );
}
