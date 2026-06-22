import { useToast } from "@/components/ui/use-toast";
import {
  Toast,
  ToastClose,
  ToastDescription,
  ToastProvider,
  ToastTitle,
  ToastViewport,
} from "@/components/ui/toast";
import { Check, AlertCircle, AlertTriangle, Info, X } from 'lucide-react';

export function Toaster() {
  const { toasts, dismiss } = useToast();

  const getVariantIcon = (variant) => {
    switch (variant) {
      case 'success':
        return <div className="flex-shrink-0 w-6 h-6 rounded-full bg-success/10 flex items-center justify-center"><Check className="w-4 h-4 text-success" /></div>;
      case 'error':
      case 'destructive':
        return <div className="flex-shrink-0 w-6 h-6 rounded-full bg-destructive/10 flex items-center justify-center"><AlertCircle className="w-4 h-4 text-destructive" /></div>;
      case 'warning':
        return <div className="flex-shrink-0 w-6 h-6 rounded-full bg-warning/10 flex items-center justify-center"><AlertTriangle className="w-4 h-4 text-warning" /></div>;
      case 'info':
        return <div className="flex-shrink-0 w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center"><Info className="w-4 h-4 text-primary" /></div>;
      default:
        return <div className="flex-shrink-0 w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center"><Check className="w-4 h-4 text-primary" /></div>;
    }
  };

  return (
    <ToastProvider>
      {toasts.filter(t => t.open !== false).map(function ({ id, title, description, action, variant = 'default', ...props }) {
        return (
          <Toast key={id} variant={variant} {...props}>
            {getVariantIcon(variant)}
            <div className="flex-1 grid gap-1">
              {title && <ToastTitle>{title}</ToastTitle>}
              {description && (
                <ToastDescription>{description}</ToastDescription>
              )}
            </div>
            {action}
            <button
              onClick={() => dismiss(id)}
              className="flex-shrink-0 p-1 hover:bg-muted rounded-lg transition-colors"
              aria-label="Close"
            >
              <X className="w-4 h-4 text-muted-foreground" />
            </button>
          </Toast>
        );
      })}
      <ToastViewport />
    </ToastProvider>
  );
}