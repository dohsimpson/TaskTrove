"use client";

import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import { initReactI18next } from "react-i18next";
import i18next from "i18next";
import LanguageDetector from "i18next-browser-languagedetector";
import type { I18nConfig, Language } from "../types";
import resourcesToBackend from "i18next-resources-to-backend";

/**
 * Language context type
 *
 * Provides language state, setter, and translation function
 *
 * @template L - Language type (defaults to string, can be narrowed to specific codes)
 */
interface LanguageContextType<L extends Language = Language> {
  /**
   * Current language code
   */
  language: L;

  /**
   * Function to change the current language
   *
   * This will:
   * - Update the language state
   * - Persist the language in a cookie (if cookieName is configured)
   * - Update i18next's language
   */
  setLanguage: (lng: L) => void;

  /**
   * Translation function for the default namespace
   *
   * @param key - Translation key to look up
   * @returns Translated string
   */
  t: (key: string) => string;
}

/**
 * Language context
 *
 * Internal context used by LanguageProvider and useLanguage
 * Uses Language (string) as base type to allow generic usage
 */
const LanguageContext = createContext<
  LanguageContextType<Language> | undefined
>(undefined);

/**
 * Props for LanguageProvider component
 *
 * @template L - Language type (defaults to string, can be narrowed to specific codes)
 * @template NS - Namespace type (defaults to string, can be narrowed to specific namespaces)
 */
interface LanguageProviderProps<
  L extends Language = Language,
  NS extends string = string,
> {
  /**
   * Child components to render within the provider
   */
  children: ReactNode;

  /**
   * I18n configuration object
   *
   * Provides settings for supported languages, namespaces,
   * resource loading, and cookie persistence
   */
  config: I18nConfig<L, NS>;

  /**
   * Optional initial language to use
   *
   * If not provided, falls back to config.fallbackLng
   * Typically passed from server-side language detection
   */
  initialLanguage?: L;
}

/**
 * Language Provider component
 *
 * Provides internationalization context to the application including:
 * - Current language state
 * - Language switching functionality
 * - Translation function for the default namespace
 * - Cookie-based language persistence
 * - Automatic i18next initialization
 *
 * This component wraps the application and initializes i18next with
 * the provided configuration. It manages language state and provides
 * a context that child components can access via the useLanguage hook.
 *
 * @template L - Language type (defaults to string)
 * @template NS - Namespace type (defaults to string)
 *
 * @example
 * ```typescript
 * // In app layout:
 * import { LanguageProvider } from "@tasktrove/i18n"
 *
 * const config: I18nConfig<"en" | "zh", "common" | "task"> = {
 *   languages: ["en", "zh"],
 *   fallbackLng: "en",
 *   namespaces: ["common", "task"],
 *   defaultNS: "common",
 *   cookieName: "tasktrove_language",
 *   resourceLoader: async (lang, ns) => {
 *     return await import(`./locales/${lang}/${ns}.json`)
 *   }
 * }
 *
 * export default function RootLayout({ children }) {
 *   return (
 *     <LanguageProvider config={config} initialLanguage="en">
 *       {children}
 *     </LanguageProvider>
 *   )
 * }
 * ```
 *
 * @example
 * ```typescript
 * // In a component:
 * import { useLanguage } from "@tasktrove/i18n"
 *
 * function MyComponent() {
 *   const { language, setLanguage, t } = useLanguage()
 *
 *   return (
 *     <div>
 *       <p>{t("welcome")}</p>
 *       <button onClick={() => setLanguage("zh")}>
 *         Switch to Chinese
 *       </button>
 *     </div>
 *   )
 * }
 * ```
 */
// Cache for initialization promise to ensure consistent Suspense behavior
let initPromise: Promise<void> | null = null;

export function LanguageProvider<
  L extends Language = Language,
  NS extends string = string,
>({ children, config, initialLanguage }: LanguageProviderProps<L, NS>) {
  // Initialize language state with initialLanguage or fallback
  // Store as base Language type internally to avoid type assertion issues
  const [language, setLanguageState] = useState<Language>(() => {
    return initialLanguage || config.fallbackLng;
  });

  // Suspense-compatible initialization
  // Throw a promise on first render if i18next isn't ready
  if (!i18next.isInitialized && !initPromise) {
    initPromise = (async () => {
      const resourceBackend = resourcesToBackend(config.resourceLoader);

      const i18nBuilder = config.cookieName
        ? i18next
            .use(initReactI18next)
            .use(LanguageDetector)
            .use(resourceBackend)
        : i18next.use(initReactI18next).use(resourceBackend);

      await i18nBuilder.init({
        supportedLngs: [...config.languages],
        fallbackLng: config.fallbackLng,
        lng: initialLanguage || undefined,
        ns: [...config.namespaces],
        defaultNS: config.defaultNS,
        react: {
          useSuspense: true, // Enable Suspense for proper loading states
        },
        // Configure LanguageDetector to auto-persist language changes to cookies
        detection: config.cookieName
          ? {
              order: ["cookie", "navigator"],
              lookupCookie: config.cookieName,
              caches: ["cookie"], // Enable automatic cookie caching
              cookieOptions: {
                path: "/",
                maxAge: 60 * 60 * 24 * 365, // 1 year
                sameSite: "lax",
              },
            }
          : undefined,
      });

      // Clear the promise cache after successful initialization
      initPromise = null;
    })();
  }

  // Throw the promise to trigger Suspense
  if (!i18next.isInitialized && initPromise) {
    throw initPromise;
  }

  // Ensure we're on the correct language after initialization
  useEffect(() => {
    if (i18next.isInitialized && i18next.language !== initialLanguage) {
      i18next.changeLanguage(initialLanguage || config.fallbackLng);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Use i18next directly to avoid re-render loops from useTranslation hook subscriptions
  const t = (key: string) => i18next.t(key, { ns: config.defaultNS });

  /**
   * Set language and persist to cookie
   *
   * Validates the language is supported, then updates i18next.
   * LanguageDetector automatically handles cookie persistence.
   */
  const setLanguage = (lng: Language) => {
    // Validate language is supported
    const isSupported = config.languages.some(
      (supportedLng) => supportedLng === lng,
    );

    if (!isSupported) {
      console.warn(
        `Language "${lng}" is not supported. Supported languages:`,
        config.languages,
      );
      return;
    }

    // Change i18next language - LanguageDetector will auto-persist to cookie
    i18next.changeLanguage(lng);
    setLanguageState(lng);
  };

  // Sync initial state with i18next's detected language (e.g., from cookie)
  // Runs once on mount only to avoid re-render loops
  useEffect(() => {
    const resolvedLng = i18next.resolvedLanguage;

    if (!resolvedLng || resolvedLng === language) return;

    const isSupported = config.languages.some(
      (supported) => supported === resolvedLng,
    );

    if (isSupported) {
      setLanguageState(resolvedLng);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Build context value
  const value: LanguageContextType<Language> = {
    language,
    setLanguage,
    t,
  };

  return (
    <LanguageContext.Provider value={value}>
      {children}
    </LanguageContext.Provider>
  );
}

/**
 * Hook to access language context
 *
 * Must be used within a LanguageProvider component.
 * Provides access to:
 * - Current language
 * - Language setter function
 * - Translation function for the default namespace
 *
 * @throws {Error} If used outside of LanguageProvider
 *
 * @example
 * ```typescript
 * function MyComponent() {
 *   const { language, setLanguage, t } = useLanguage()
 *
 *   return (
 *     <div>
 *       <p>Current: {language}</p>
 *       <p>{t("greeting")}</p>
 *       <button onClick={() => setLanguage("zh")}>
 *         Switch Language
 *       </button>
 *     </div>
 *   )
 * }
 * ```
 *
 * @example
 * ```typescript
 * // Just get translation function
 * function SimpleComponent() {
 *   const { t } = useLanguage()
 *   return <h1>{t("title")}</h1>
 * }
 * ```
 */
export function useLanguage(): LanguageContextType<Language> {
  const context = useContext(LanguageContext);
  if (context === undefined) {
    throw new Error("useLanguage must be used within a LanguageProvider");
  }
  return context;
}
