import { createContext, useContext, ReactNode } from 'react';
import toast from 'react-hot-toast';
import { Toaster } from 'react-hot-toast';

type ToastType = 'success' | 'info' | 'error';

interface ToastContextValue {
  showToast: (message: string, type?: ToastType) => void;
}

const ToastContext = createContext<ToastContextValue | undefined>(undefined);

export function ToastProvider({ children }: { children: ReactNode }) {
  const showToast = (message: string, type: ToastType = 'info') => {
    if (type === 'success') toast.success(message, { duration: 2400 });
    else if (type === 'error') toast.error(message, { duration: 2400 });
    else toast(message, { duration: 2400 });
  };

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      <Toaster
        position="bottom-center"
        toastOptions={{
          duration: 2400,
          className: 'app-toast',
          style: {
            background: 'var(--surface)',
            color: 'var(--text)',
            border: '1px solid var(--border)',
            borderRadius: '999px',
          },
          success: {
            style: {
              background: 'linear-gradient(135deg, #16a34a, #22c55e)',
              color: '#ecfdf3',
              border: 'none',
            },
          },
          error: {
            style: {
              background: 'linear-gradient(135deg, #b91c1c, #ef4444)',
              color: '#fee2e2',
              border: 'none',
            },
          },
        }}
      />
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
