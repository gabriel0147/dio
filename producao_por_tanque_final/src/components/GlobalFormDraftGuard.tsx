import { useEffect } from 'react'
import { useLocation } from 'react-router-dom'
import { useProject } from '@/context/ProjectContext'
import { useAuth } from '@/hooks/use-auth'

const STORAGE_PREFIX = 'global-form-draft:'
const DRAFT_MAX_AGE_MS = 24 * 60 * 60 * 1000
const RESTORE_RETRY_DELAYS = [0, 100, 300, 700, 1500, 3000, 5000, 8000]

type DraftValue =
  | { kind: 'checked'; value: boolean }
  | { kind: 'value'; value: string }

type DraftPayload = {
  updatedAt: number
  values: Record<string, DraftValue>
}

type DraftElement = HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement

const isDraftElement = (element: Element | null): element is DraftElement => {
  if (
    !(element instanceof HTMLInputElement) &&
    !(element instanceof HTMLTextAreaElement) &&
    !(element instanceof HTMLSelectElement)
  ) {
    return false
  }

  if (element.disabled) return false
  if (!(element instanceof HTMLSelectElement) && element.readOnly) {
    return false
  }
  if (element instanceof HTMLInputElement) {
    return ![
      'button',
      'submit',
      'reset',
      'file',
      'hidden',
      'password',
    ].includes(element.type)
  }

  return true
}

const getDraftElements = () =>
  Array.from(document.querySelectorAll('input, textarea, select')).filter(
    isDraftElement,
  )

const getElementKey = (element: DraftElement, elements: DraftElement[]) => {
  const form = element.form
  const formKey = form?.id || form?.getAttribute('name') || 'page'
  const ownKey =
    element.getAttribute('name') ||
    element.id ||
    element.getAttribute('aria-label') ||
    element.getAttribute('placeholder') ||
    element.getAttribute('data-draft-key') ||
    element.tagName.toLowerCase()
  const sameKeyIndex = elements
    .slice(0, elements.indexOf(element) + 1)
    .filter((item) => {
      const itemKey =
        item.getAttribute('name') ||
        item.id ||
        item.getAttribute('aria-label') ||
        item.getAttribute('placeholder') ||
        item.getAttribute('data-draft-key') ||
        item.tagName.toLowerCase()

      return itemKey === ownKey
    }).length

  return `${formKey}:${ownKey}:${sameKeyIndex}`
}

const readElementValue = (element: DraftElement): DraftValue => {
  if (
    element instanceof HTMLInputElement &&
    ['checkbox', 'radio'].includes(element.type)
  ) {
    return { kind: 'checked', value: element.checked }
  }

  return { kind: 'value', value: element.value }
}

const setNativeValue = (
  element: HTMLInputElement | HTMLTextAreaElement,
  value: string,
) => {
  const prototype =
    element instanceof HTMLInputElement
      ? HTMLInputElement.prototype
      : HTMLTextAreaElement.prototype
  const valueSetter = Object.getOwnPropertyDescriptor(prototype, 'value')?.set
  valueSetter?.call(element, value)
}

const applyElementValue = (element: DraftElement, draft: DraftValue) => {
  if (draft.kind === 'checked' && element instanceof HTMLInputElement) {
    const checkedSetter = Object.getOwnPropertyDescriptor(
      HTMLInputElement.prototype,
      'checked',
    )?.set
    checkedSetter?.call(element, draft.value)
  } else if (draft.kind === 'value') {
    if (element instanceof HTMLSelectElement) {
      element.value = draft.value
    } else {
      setNativeValue(element, draft.value)
    }
  }

  element.dispatchEvent(new Event('input', { bubbles: true }))
  element.dispatchEvent(new Event('change', { bubbles: true }))
}

const readDraftPayload = (storageKey: string) => {
  const raw = localStorage.getItem(storageKey)
  if (!raw) return null

  try {
    const payload = JSON.parse(raw) as DraftPayload
    if (
      !payload?.updatedAt ||
      Date.now() - payload.updatedAt > DRAFT_MAX_AGE_MS
    ) {
      localStorage.removeItem(storageKey)
      return null
    }

    return payload
  } catch {
    localStorage.removeItem(storageKey)
    return null
  }
}

const restoreDraft = (storageKey: string) => {
  const payload = readDraftPayload(storageKey)
  if (!payload) return

  const elements = getDraftElements()
  elements.forEach((element) => {
    const draft = payload.values[getElementKey(element, elements)]
    if (draft) applyElementValue(element, draft)
  })
}

export function GlobalFormDraftGuard() {
  const location = useLocation()
  const { user } = useAuth()
  const { currentProject } = useProject()
  const storageKey = `${STORAGE_PREFIX}${user?.id ?? 'anonymous'}:${currentProject?.id ?? 'no-project'}:${location.pathname}${location.search}`

  useEffect(() => {
    const saveDraft = () => {
      const elements = getDraftElements()
      const values = elements.reduce<Record<string, DraftValue>>(
        (acc, element) => {
          acc[getElementKey(element, elements)] = readElementValue(element)
          return acc
        },
        {},
      )

      localStorage.setItem(
        storageKey,
        JSON.stringify({
          updatedAt: Date.now(),
          values,
        } satisfies DraftPayload),
      )
    }

    const handleChange = (event: Event) => {
      if (isDraftElement(event.target as Element | null)) {
        saveDraft()
      }
    }

    document.addEventListener('input', handleChange, true)
    document.addEventListener('change', handleChange, true)

    const saveOnPageHide = () => saveDraft()
    const saveOnHidden = () => {
      if (document.visibilityState === 'hidden') saveDraft()
    }

    window.addEventListener('pagehide', saveOnPageHide)
    document.addEventListener('visibilitychange', saveOnHidden)
    return () => {
      document.removeEventListener('input', handleChange, true)
      document.removeEventListener('change', handleChange, true)
      window.removeEventListener('pagehide', saveOnPageHide)
      document.removeEventListener('visibilitychange', saveOnHidden)
    }
  }, [storageKey])

  useEffect(() => {
    if (!readDraftPayload(storageKey)) return

    restoreDraft(storageKey)
    const timeouts = RESTORE_RETRY_DELAYS.map((delay) =>
      window.setTimeout(() => restoreDraft(storageKey), delay),
    )

    const handleVisible = () => {
      if (document.visibilityState === 'visible') restoreDraft(storageKey)
    }
    const handlePageShow = () => restoreDraft(storageKey)
    const handleFocus = () => restoreDraft(storageKey)
    const observer = new MutationObserver(() => restoreDraft(storageKey))

    document.addEventListener('visibilitychange', handleVisible)
    window.addEventListener('pageshow', handlePageShow)
    window.addEventListener('focus', handleFocus)
    observer.observe(document.body, { childList: true, subtree: true })

    return () => {
      timeouts.forEach((timeout) => window.clearTimeout(timeout))
      document.removeEventListener('visibilitychange', handleVisible)
      window.removeEventListener('pageshow', handlePageShow)
      window.removeEventListener('focus', handleFocus)
      observer.disconnect()
    }
  }, [storageKey])

  return null
}
