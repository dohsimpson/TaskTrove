import type { I18nConfig } from "@tasktrove/i18n"
import { languages, fallbackLng, namespaces, defaultNS, cookieName } from "./settings"

import authZhComponent from "../../components/auth/i18n/zh/auth.json"
import authFrComponent from "../../components/auth/i18n/fr/auth.json"
import authDeComponent from "../../components/auth/i18n/de/auth.json"
import authEsComponent from "../../components/auth/i18n/es/auth.json"
import authNlComponent from "../../components/auth/i18n/nl/auth.json"
import authKoComponent from "../../components/auth/i18n/ko/auth.json"
import authJaComponent from "../../components/auth/i18n/ja/auth.json"
import authItComponent from "../../components/auth/i18n/it/auth.json"
import authPtComponent from "../../components/auth/i18n/pt/auth.json"

import dialogsZhComponent from "../../components/dialogs/i18n/zh/dialogs.json"
import dialogsFrComponent from "../../components/dialogs/i18n/fr/dialogs.json"
import dialogsDeComponent from "../../components/dialogs/i18n/de/dialogs.json"
import dialogsEsComponent from "../../components/dialogs/i18n/es/dialogs.json"
import dialogsNlComponent from "../../components/dialogs/i18n/nl/dialogs.json"
import dialogsKoComponent from "../../components/dialogs/i18n/ko/dialogs.json"
import dialogsJaComponent from "../../components/dialogs/i18n/ja/dialogs.json"
import dialogsItComponent from "../../components/dialogs/i18n/it/dialogs.json"
import dialogsPtComponent from "../../components/dialogs/i18n/pt/dialogs.json"

import layoutZhComponent from "../../components/layout/i18n/zh/layout.json"
import layoutFrComponent from "../../components/layout/i18n/fr/layout.json"
import layoutDeComponent from "../../components/layout/i18n/de/layout.json"
import layoutEsComponent from "../../components/layout/i18n/es/layout.json"
import layoutNlComponent from "../../components/layout/i18n/nl/layout.json"
import layoutKoComponent from "../../components/layout/i18n/ko/layout.json"
import layoutJaComponent from "../../components/layout/i18n/ja/layout.json"
import layoutItComponent from "../../components/layout/i18n/it/layout.json"
import layoutPtComponent from "../../components/layout/i18n/pt/layout.json"

import navigationZhComponent from "../../components/navigation/i18n/zh/navigation.json"
import navigationFrComponent from "../../components/navigation/i18n/fr/navigation.json"
import navigationDeComponent from "../../components/navigation/i18n/de/navigation.json"
import navigationEsComponent from "../../components/navigation/i18n/es/navigation.json"
import navigationNlComponent from "../../components/navigation/i18n/nl/navigation.json"
import navigationKoComponent from "../../components/navigation/i18n/ko/navigation.json"
import navigationJaComponent from "../../components/navigation/i18n/ja/navigation.json"
import navigationItComponent from "../../components/navigation/i18n/it/navigation.json"
import navigationPtComponent from "../../components/navigation/i18n/pt/navigation.json"

import settingsZhComponent from "../../components/dialogs/settings-forms/i18n/zh/settings.json"
import settingsFrComponent from "../../components/dialogs/settings-forms/i18n/fr/settings.json"
import settingsDeComponent from "../../components/dialogs/settings-forms/i18n/de/settings.json"
import settingsEsComponent from "../../components/dialogs/settings-forms/i18n/es/settings.json"
import settingsNlComponent from "../../components/dialogs/settings-forms/i18n/nl/settings.json"
import settingsKoComponent from "../../components/dialogs/settings-forms/i18n/ko/settings.json"
import settingsJaComponent from "../../components/dialogs/settings-forms/i18n/ja/settings.json"
import settingsItComponent from "../../components/dialogs/settings-forms/i18n/it/settings.json"
import settingsPtComponent from "../../components/dialogs/settings-forms/i18n/pt/settings.json"

import taskZhComponent from "../../components/task/i18n/zh/task.json"
import taskFrComponent from "../../components/task/i18n/fr/task.json"
import taskDeComponent from "../../components/task/i18n/de/task.json"
import taskEsComponent from "../../components/task/i18n/es/task.json"
import taskNlComponent from "../../components/task/i18n/nl/task.json"
import taskKoComponent from "../../components/task/i18n/ko/task.json"
import taskJaComponent from "../../components/task/i18n/ja/task.json"
import taskItComponent from "../../components/task/i18n/it/task.json"
import taskPtComponent from "../../components/task/i18n/pt/task.json"

import authEnCore from "./locales/en/auth.json"
import commonEnCore from "./locales/en/common.json"
import dialogsEnCore from "./locales/en/dialogs.json"
import layoutEnCore from "./locales/en/layout.json"
import navigationEnCore from "./locales/en/navigation.json"
import settingsEnCore from "./locales/en/settings.json"
import taskEnCore from "./locales/en/task.json"

import commonZhCore from "./locales/zh/common.json"
import commonFrCore from "./locales/fr/common.json"
import commonDeCore from "./locales/de/common.json"
import commonEsCore from "./locales/es/common.json"
import commonNlCore from "./locales/nl/common.json"
import commonKoCore from "./locales/ko/common.json"
import commonJaCore from "./locales/ja/common.json"
import commonItCore from "./locales/it/common.json"
import commonPtCore from "./locales/pt/common.json"

export type AppLanguage = (typeof languages)[number]
export type AppNamespace = (typeof namespaces)[number]

const componentNamespaces = ["auth", "dialogs", "layout", "navigation", "settings", "task"] as const
type ComponentNamespace = (typeof componentNamespaces)[number]
type ComponentLanguage = Exclude<AppLanguage, typeof fallbackLng>
type CoreNamespaceResources = Record<typeof defaultNS, unknown> &
  Partial<Record<AppNamespace, unknown>>

const COMPONENT_NAMESPACE_RESOURCES: Record<
  ComponentNamespace,
  Record<ComponentLanguage, unknown>
> = {
  auth: {
    zh: authZhComponent,
    fr: authFrComponent,
    de: authDeComponent,
    es: authEsComponent,
    nl: authNlComponent,
    ko: authKoComponent,
    ja: authJaComponent,
    it: authItComponent,
    pt: authPtComponent,
  },
  dialogs: {
    zh: dialogsZhComponent,
    fr: dialogsFrComponent,
    de: dialogsDeComponent,
    es: dialogsEsComponent,
    nl: dialogsNlComponent,
    ko: dialogsKoComponent,
    ja: dialogsJaComponent,
    it: dialogsItComponent,
    pt: dialogsPtComponent,
  },
  layout: {
    zh: layoutZhComponent,
    fr: layoutFrComponent,
    de: layoutDeComponent,
    es: layoutEsComponent,
    nl: layoutNlComponent,
    ko: layoutKoComponent,
    ja: layoutJaComponent,
    it: layoutItComponent,
    pt: layoutPtComponent,
  },
  navigation: {
    zh: navigationZhComponent,
    fr: navigationFrComponent,
    de: navigationDeComponent,
    es: navigationEsComponent,
    nl: navigationNlComponent,
    ko: navigationKoComponent,
    ja: navigationJaComponent,
    it: navigationItComponent,
    pt: navigationPtComponent,
  },
  settings: {
    zh: settingsZhComponent,
    fr: settingsFrComponent,
    de: settingsDeComponent,
    es: settingsEsComponent,
    nl: settingsNlComponent,
    ko: settingsKoComponent,
    ja: settingsJaComponent,
    it: settingsItComponent,
    pt: settingsPtComponent,
  },
  task: {
    zh: taskZhComponent,
    fr: taskFrComponent,
    de: taskDeComponent,
    es: taskEsComponent,
    nl: taskNlComponent,
    ko: taskKoComponent,
    ja: taskJaComponent,
    it: taskItComponent,
    pt: taskPtComponent,
  },
}

const CORE_NAMESPACE_RESOURCES: Record<AppLanguage, CoreNamespaceResources> = {
  en: {
    auth: authEnCore,
    common: commonEnCore,
    dialogs: dialogsEnCore,
    layout: layoutEnCore,
    navigation: navigationEnCore,
    settings: settingsEnCore,
    task: taskEnCore,
  },
  zh: {
    common: commonZhCore,
  },
  fr: {
    common: commonFrCore,
  },
  de: {
    common: commonDeCore,
  },
  es: {
    common: commonEsCore,
  },
  nl: {
    common: commonNlCore,
  },
  ko: {
    common: commonKoCore,
  },
  ja: {
    common: commonJaCore,
  },
  it: {
    common: commonItCore,
  },
  pt: {
    common: commonPtCore,
  },
}

function isComponentNamespace(namespace: AppNamespace): namespace is ComponentNamespace {
  return componentNamespaces.some((name) => name === namespace)
}

function isComponentLanguage(language: AppLanguage): language is ComponentLanguage {
  return language !== fallbackLng
}

async function loadResources(language: AppLanguage, namespace: AppNamespace): Promise<unknown> {
  if (isComponentLanguage(language) && isComponentNamespace(namespace)) {
    const componentResource = COMPONENT_NAMESPACE_RESOURCES[namespace][language]
    if (componentResource) {
      return componentResource
    }

    console.warn(
      `Failed to load colocated ${namespace} translation for ${language}: missing build-time resource`,
    )
  }

  const coreResource = CORE_NAMESPACE_RESOURCES[language][namespace]
  if (coreResource) {
    return coreResource
  }

  const error = new Error(`Missing translation for ${language}/${namespace}`)
  console.warn(`Failed to load main translation for ${language}/${namespace}:`, error)
  throw error
}

export const i18nConfig: I18nConfig<AppLanguage, AppNamespace> = {
  languages,
  fallbackLng,
  namespaces,
  defaultNS,
  cookieName,
  resourceLoader: loadResources,
}
