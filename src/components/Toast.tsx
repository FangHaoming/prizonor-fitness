import { createContext, useContext, useState, useCallback, ReactNode } from 'react';

type ToastType = 'success' | 'info' | 'error';

interface ToastState {
  message: string;
  type: ToastType;
  visible: boolean;
}

interface ToastContextValue {
  showToast: (message: string, type?: ToastType) => void;
}

const ToastContext = createContext<ToastContextValue | undefined>(undefined);

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toast, setToast] = useState<ToastState>({
    message: '',
    type: 'info',
    visible: false,
  });

  const showToast = useCallback((message: string, type: ToastType = 'info') => {
    setToast({ message, type, visible: true });
    window.clearTimeout((showToast as any)._timer);
    (showToast as any)._timer = window.setTimeout(() => {
      setToast((prev) => ({ ...prev, visible: false }));
    }, 2400);
  }, []);

  const bgClass =
    toast.type === 'success'
      ? 'toast-success'
      : toast.type === 'error'
      ? 'toast-error'
      : 'toast-info';

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      <div className={`toast-container ${toast.visible ? 'visible' : ''}`}>
        <div className={`toast ${bgClass}`}>{toast.message}</div>
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) {
    throw new Error('useToast must be used within ToastProvider');
  }
  return ctx;
}

