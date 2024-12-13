import { createContext, useContext, useEffect, useState } from "react"
import { ThemeProvider as NextThemesProvider, type ThemeProviderProps as NextThemeProviderProps } from "next-themes"

type Theme = 'dark' | 'light' | 'system'

interface ThemeContextType {
  theme: Theme
  setTheme: (theme: Theme) => void
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined)

type ThemeProviderProps = {
  children: React.ReactNode
  defaultTheme?: string
  storageKey?: string
  enableSystem?: boolean
  enableColorScheme?: boolean
  disableTransitionOnChange?: boolean
  attribute?: NextThemeProviderProps['attribute']
}

export function ThemeProvider({ 
  children,
  defaultTheme = "system",
  storageKey = "theme",
  enableSystem = true,
  attribute = "class",
  ...props 
}: ThemeProviderProps) {
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  if (!mounted) {
    return <>{children}</>
  }

  return (
    <NextThemesProvider
      defaultTheme={defaultTheme}
      storageKey={storageKey}
      enableSystem={enableSystem}
      attribute={attribute}
      {...props}
    >
      {children}
    </NextThemesProvider>
  )
}

export function useTheme() {
  const context = useContext(ThemeContext)
  if (context === undefined) {
    throw new Error('useTheme must be used within a ThemeProvider')
  }
  return context
}
