import { Capacitor } from '@capacitor/core';

export const API_BASE = Capacitor.isNativePlatform()
  ? (import.meta.env.VITE_NETLIFY_URL || 'https://arcticalls.netlify.app')
  : '';
