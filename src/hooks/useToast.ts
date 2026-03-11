"use client";

import { toast as hotToast } from "react-hot-toast";

export function useToast() {
  return {
    toast: hotToast,
    success: hotToast.success,
    error: hotToast.error,
    loading: hotToast.loading,
    dismiss: hotToast.dismiss,
  };
}
