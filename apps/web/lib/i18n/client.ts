"use client"

import { useEffect, useState } from "react"
import i18next, { type FlatNamespace, type KeyPrefix } from "i18next"
import {
  initReactI18next,
  useTranslation as useTranslationOrg,
  type UseTranslationOptions,
} from "react-i18next"
import LanguageDetector from "i18next-browser-languagedetector"
import { getOptions, languages, fallbackLng, namespaces } from "./settings"
import { createCombinedResourceBackend } from "./resources"

const runsOnServerSide = typeof window === "undefined"

// Initialize i18next for client-side
i18next
  .use(initReactI18next)
  .use(LanguageDetector)
  .use(createCombinedResourceBackend())
  .init({
    ...getOptions(),
    lng: undefined, // let detect the language on client side
    ns: namespaces,
    defaultNS: "common",
    detection: {
      order: ["cookie"],
      caches: ["cookie"],
    },
    preload: runsOnServerSide ? languages : [],
  })

export function useTranslation<
  Ns extends FlatNamespace,
  KPrefix extends KeyPrefix<FlatNamespace> = undefined,
>(lng: string, ns?: Ns, options?: UseTranslationOptions<KPrefix>) {
  const [activeLng, setActiveLng] = useState(lng)
  const ret = useTranslationOrg(ns, options)
  const { i18n } = ret

  useEffect(() => {
    if (activeLng === i18n.resolvedLanguage) return
    setActiveLng(i18n.resolvedLanguage || fallbackLng)
  }, [activeLng, i18n.resolvedLanguage])

  useEffect(() => {
    if (!lng || i18n.resolvedLanguage === lng) return
    i18n.changeLanguage(lng)
  }, [lng, i18n])

  return ret
}

export { i18next }
