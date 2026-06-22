import { useEffect } from 'react'

export function useIPCListeners({
  setScreenshots,
  setIsProtected,
  setIsTypingMode,
  setInputText,
  setGhostText,
  handleSendRef,
  scrollContainerRef
}) {

  useEffect(() => {
    if (!window.api?.onScreenshotCaptured) return
    return window.api.onScreenshotCaptured((img) =>
      setScreenshots((prev) => [...prev, img])
    )
  }, [])


  useEffect(() => {
    if (!window.api?.onProtectionToggled) return
    return window.api.onProtectionToggled((val) => setIsProtected(val))
  }, [])


  useEffect(() => {
    if (!window.api) return

    const c1 = window.api.onTypingModeToggled((toggled) => {
      setIsTypingMode(toggled)
      if (toggled) setGhostText('')
    })

    const c2 = window.api.onUpdateText((text) => {
      setInputText(text)
      setGhostText(text)
    })

    const c3 = window.api.onTriggerSend(() => {
      handleSendRef.current?.()
    })

    const c4 = window.api.onScrollUI((amount) => {
      scrollContainerRef.current?.scrollBy({ top: amount, behavior: 'smooth' })
    })

    return () => { c1?.(); c2?.(); c3?.(); c4?.() }
  }, [])
}
