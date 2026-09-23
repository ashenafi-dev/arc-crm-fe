import toast from 'react-hot-toast'
import { Toast, type ToastLevel } from '@/components/ui/Toast'

const MAX_WORDS = 10

// Toasts stay short: anything past ten words is cut with an ellipsis
function clamp(message: string) {
  const words = message.trim().split(/\s+/)
  return words.length <= MAX_WORDS ? message.trim() : `${words.slice(0, MAX_WORDS).join(' ')}…`
}

function show(level: ToastLevel, message: string) {
  return toast.custom((t) => <Toast t={t} level={level} message={clamp(message)} />, {
    // The toast runs its own countdown and dismisses itself
    duration: Infinity,
    removeDelay: 300,
  })
}

export const notify = {
  success: (message: string) => show('success', message),
  error: (message: string) => show('error', message),
  warning: (message: string) => show('warning', message),
  info: (message: string) => show('info', message),
}
