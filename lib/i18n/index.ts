import { createInstance } from "i18next"
import { initReactI18next } from "react-i18next/initReactI18next"
import { getOptions } from "./settings"
import { createCombinedResourceBackend } from "./resources"

const initI18next = async (lng: string, ns?: string) => {
  const i18nInstance = createInstance()
  await i18nInstance
    .use(initReactI18next)
    .use(createCombinedResourceBackend())
    .init(getOptions(lng, ns))
  return i18nInstance
}

export async function useTranslation(
  lng: string,
  ns?: string,
  options: { keyPrefix?: string } = {},
) {
  const i18nextInstance = await initI18next(lng, ns)
  return {
    t: i18nextInstance.getFixedT(lng, Array.isArray(ns) ? ns[0] : ns, options.keyPrefix),
    i18n: i18nextInstance,
  }
}
