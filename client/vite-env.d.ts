/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_API_URL: string
  readonly VITE_VAPID_PUBLIC_KEY: string
  // Add more env variables here
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}

