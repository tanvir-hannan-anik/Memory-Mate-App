import { createContext, useContext, useState, ReactNode } from 'react'

type Lang = 'en' | 'bn'

interface LangContextValue {
  lang: Lang
  setLang: (l: Lang) => void
  tr: (en: string, bn: string) => string
}

const LangContext = createContext<LangContextValue | null>(null)

const STORAGE_KEY = 'memora_lang'

export function LangProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<Lang>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY)
      return saved === 'bn' ? 'bn' : 'en'
    } catch {
      return 'en'
    }
  })

  function setLang(l: Lang) {
    setLangState(l)
    try { localStorage.setItem(STORAGE_KEY, l) } catch {}
  }

  const tr = (en: string, bn: string) => lang === 'bn' ? bn : en

  return (
    <LangContext.Provider value={{ lang, setLang, tr }}>
      {children}
    </LangContext.Provider>
  )
}

export function useLang() {
  const ctx = useContext(LangContext)
  if (!ctx) throw new Error('useLang must be used within LangProvider')
  return ctx
}
