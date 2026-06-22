# Components Guide — Full Reference

This file documents every file inside `renderer/src/components/`, explaining its
**purpose**, **what it renders or does**, and **every function/hook** it exposes.

---

## Directory Overview

```
components/
├── COMPONENTS_GUIDE.md          ← this file
├── Versions.jsx                 ← tiny utility (unchanged)
│
├── constants/
│   └── shortcuts.js             ← shared data + pure helpers
│
├── hooks/
│   ├── useChatAPI.js            ← Gemini streaming logic
│   ├── useIPCListeners.js       ← IPC event wiring for ChatUI
│   └── useSettings.js           ← settings loader hook
│
├── ChatUI/
│   ├── index.jsx                ← main chat view (state owner)
│   ├── TopBar.jsx               ← floating pill bar
│   ├── MessageList.jsx          ← scrollable chat history
│   ├── InputArea.jsx            ← textarea + send button
│   └── CodeBlock.jsx            ← syntax-highlighted code block
│
└── Settings/
    ├── index.jsx                ← settings page (orchestrator)
    ├── ApiKeysSection.jsx       ← Gemini API key card
    ├── ShortcutsSection.jsx     ← keyboard shortcuts table card
    ├── ShortcutRecorder.jsx     ← inline key-combo recorder widget
    └── ui/
        ├── KeyBadge.jsx         ← single key pill badge (atom)
        ├── ShortcutBadges.jsx   ← row of KeyBadge pills
        └── SaveButton.jsx       ← save/saving/saved/error button
```

---

## `constants/shortcuts.js`

**What it is:** A pure data + utility module. No React. No state.
Anything that needs shortcut data or combo parsing imports from here.

### Exports

| Export | Type | Description |
|---|---|---|
| `SHORTCUT_META` | `Array` | List of all shortcut actions with `id`, `label`, `desc` |
| `DEFAULT_SHORTCUTS` | `Object` | Default key-combo string for every shortcut action |
| `parseCombo(combo)` | `Function` | Splits a combo string into display-friendly parts |
| `buildCombo(e)` | `Function` | Converts a raw KeyboardEvent into a combo string |

### `SHORTCUT_META`
An array of `{ id, label, desc }` objects — one entry per shortcut action (12 total).
- `id` — matches the key in `DEFAULT_SHORTCUTS` and the stored settings object
- `label` — human-readable name shown in the shortcuts table
- `desc` — one-line explanation shown as a subtitle in the table row

### `DEFAULT_SHORTCUTS`
A plain object mapping each `id` → Electron accelerator string.
Example: `{ sendMessage: 'CommandOrControl+Enter', captureScreen: 'CommandOrControl+S', … }`
Used as the fallback when no saved shortcuts exist yet.

### `parseCombo(combo)`
```
Input : "CommandOrControl+Shift+S"
Output: ["Ctrl", "Shift", "S"]
```
- Splits the combo string by `+`
- Replaces `"CommandOrControl"` with `"Ctrl"` for display

### `buildCombo(e)`
```
Input : KeyboardEvent { ctrlKey: true, key: 'S' }
Output: "CommandOrControl+S"
```
- Reads modifier flags (`ctrlKey/metaKey`, `shiftKey`, `altKey`) from the event
- Ignores modifier-only keypresses (returns `""`)
- Normalises arrow keys: `ArrowUp` → `Up`, `ArrowDown` → `Down`, etc.
- Uppercases single-character keys

---

## `hooks/useSettings.js`

**What it is:** A React hook. Loads persisted settings from the Electron main
process via IPC on mount and exposes a merge updater.

### Exports

| Export | Description |
|---|---|
| `useSettings()` | Hook — returns `{ storedSettings, loading, mergeSettings }` |

### `useSettings()` — return values

| Value | Type | Description |
|---|---|---|
| `storedSettings` | `Object` | `{ geminiApiKeys: string[], shortcuts: object }` |
| `loading` | `boolean` | `true` while the IPC `loadSettings` call is in flight |
| `mergeSettings(partial)` | `Function` | Shallow-merges a partial update into `storedSettings` |

### Internal flow
1. On mount: calls `window.api.loadSettings()` (IPC bridge to main process)
2. If successful: replaces the default state with the persisted value
3. Sets `loading = false` in the `finally` block (always runs even on error)
4. `mergeSettings` is used by child cards (ApiKeysSection, ShortcutsSection) after
   a successful save so the parent view stays in sync without another IPC call

---

## `hooks/useIPCListeners.js`

**What it is:** A React hook. Registers all event listeners from the Electron
main process that ChatUI needs. All listeners are automatically removed on unmount.

### Exports

| Export | Description |
|---|---|
| `useIPCListeners(params)` | Hook — registers and cleans up 6 IPC event handlers |

### Parameters

| Param | Type | What it does |
|---|---|---|
| `setScreenshots` | `Function` | Appends a new base64 screenshot to the queue |
| `setIsProtected` | `Function` | Syncs ghost/screen-protection on/off state |
| `setIsTypingMode` | `Function` | Syncs ghost-typing on/off state |
| `setInputText` | `Function` | Updates textarea value from uIOhook captured text |
| `setGhostText` | `Function` | Mirrors `setInputText` (used for ghost typing indicator) |
| `handleSendRef` | `React.RefObject` | Called by `trigger-send` hotkey to fire the send handler |
| `scrollContainerRef` | `React.RefObject` | Target element for programmatic scroll from hotkeys |

### IPC Channels Handled

| Channel | Triggered by | What happens |
|---|---|---|
| `screenshot-captured` | `Ctrl+S` global shortcut | Adds a new screenshot to the pending queue |
| `protection-toggled` | `Ctrl+H` global shortcut | Shows/hides "Ghost Mode" badge |
| `typing-mode-toggled` | `Ctrl+T` global shortcut | Activates/deactivates ghost typing mode |
| `update-text` | uIOhook keydown in main | Pushes captured characters into the textarea |
| `trigger-send` | `Ctrl+Enter` global shortcut | Calls `handleSend` via ref |
| `scroll-ui` | `Shift+Up/Down` global shortcut | Scrolls the chat container up or down |

### Why a ref for `handleSendRef`?
`handleSend` depends on current state values (inputText, screenshots, etc.).
Because the IPC listener is registered once on mount, a plain closure would
capture stale state. The ref is updated every render cycle so the listener
always calls the latest version.

---

## `hooks/useChatAPI.js`

**What it is:** A React hook that returns the `handleSend` function.
All Gemini API interaction lives here. The hook itself holds no state —
everything is passed in and out via parameters.

### Exports

| Export | Description |
|---|---|
| `useChatAPI(params)` | Hook — returns `{ handleSend }` |

### Parameters

| Param | Type | Description |
|---|---|---|
| `activeApiKey` | `string` | First non-empty stored Gemini API key |
| `inputText` | `string` | Current textarea value |
| `screenshots` | `string[]` | Array of base64 data URLs to attach |
| `messages` | `Array` | Full chat history for context |
| `setMessages` | `Function` | Appends/updates messages in ChatUI state |
| `setInputText` | `Function` | Clears input after send |
| `setGhostText` | `Function` | Clears ghost text after send |
| `setScreenshots` | `Function` | Clears screenshot queue after send |
| `setIsStreaming` | `Function` | Shows/hides the loading dots animation |
| `onOpenSettings` | `Function` | Called when no API key is configured |
| `textareaRef` | `React.RefObject` | Used to reset textarea height after send |

### `handleSend()` — step by step

1. **Guard — empty input:** If text and screenshots are both empty, returns early
2. **Guard — no API key:** Opens Settings instead of sending
3. **Snapshot** the current `inputText` + `screenshots` into `newUserMsg`
4. **Optimistic UI update:**
   - Appends the user message to the chat
   - Clears input, ghost text, and screenshot queue
   - Sets `isStreaming = true`
   - Calls `window.api.resetTypingBuffer()` to clear main-process buffer
   - Resets textarea height to `44px`
5. **Placeholder AI message:** Appends `{ role: 'ai', text: '' }` so the loading
   dots appear immediately
6. **Build LangChain history:** Converts stored `messages` into LangChain
   `HumanMessage`, `AIMessage`, `SystemMessage` objects with image support
7. **Stream tokens:** Calls `chat.stream(history)`, accumulates tokens chunk-by-chunk,
   and updates the last message in state after each chunk
8. **Error handling:** If the stream throws, writes the error into the AI message bubble
9. **Finally:** Sets `isStreaming = false` regardless of success or failure

---

## `ChatUI/index.jsx`

**What it is:** The main chat overlay view. The single state owner for all chat data.
Slim orchestrator — delegates IPC, streaming, and rendering to separate modules.

### State

| State | Initial | Description |
|---|---|---|
| `messages` | `[]` | Full chat history array |
| `inputText` | `''` | Controlled textarea value |
| `screenshots` | `[]` | Pending screenshot queue (base64 URLs) |
| `isStreaming` | `false` | Whether a Gemini response is currently streaming |
| `isProtected` | `false` | Whether ghost/screen-protection mode is active |
| `isTypingMode` | `false` | Whether global keystroke capture is active |
| `ghostText` | `''` | Mirror of inputText during ghost typing (unused in render, kept for sync) |
| `geminiApiKeys` | `['','']` | Loaded from store on mount |

### Refs

| Ref | Purpose |
|---|---|
| `messagesEndRef` | Attached to a `<div>` at the bottom of the list — used to auto-scroll |
| `textareaRef` | Attached to the `<textarea>` — used to reset height and focus |
| `handleSendRef` | Points to the latest `handleSend` — kept fresh every render |
| `scrollContainerRef` | Attached to the scrollable chat `<div>` — used by IPC scroll events |

### useEffects

| Effect | Trigger | What it does |
|---|---|---|
| Load API keys | mount | Fetches stored keys from main process via IPC |
| Sync handleSendRef | `handleSend` changes | Keeps ref pointing to the latest closure |
| Auto-focus textarea | `isTypingMode` changes | Focuses input when ghost typing activates |
| Auto-scroll | `messages` changes | Scrolls to `messagesEndRef` on new messages |

### Props

| Prop | Type | Description |
|---|---|---|
| `isDarkMode` | `boolean` | Passed down to TopBar for theme toggle display |
| `onToggleDark` | `Function` | Called by TopBar theme button |
| `onOpenSettings` | `Function` | Called by TopBar settings button and useChatAPI on missing key |

---

## `ChatUI/TopBar.jsx`

**What it is:** A pure presentational component. No state, no hooks.
Renders the floating pill bar anchored at the top-center of the overlay.

### Props

| Prop | Type | Description |
|---|---|---|
| `isDarkMode` | `boolean` | Chooses Sun vs Moon icon |
| `onToggleDark` | `Function` | Called by the theme toggle button |
| `onOpenSettings` | `Function` | Called by the settings gear button |
| `isProtected` | `boolean` | Shows "Ghost Mode" purple badge when true |
| `isTypingMode` | `boolean` | Shows "GHOST TYPING" orange badge when true |
| `activeApiKey` | `string` | Shows "No API Key" red badge when empty |

### Visual sections (left → right)
1. **LIVE dot** — red animated pulse badge, always visible
2. **Ask AI** — shortcut hint button (decorative, shows `⌘` icon)
3. **Mic** — microphone icon button (decorative)
4. **Show/Hide** — shortcut hint button (`⌘ M`, decorative)
5. **Status badges** — conditionally rendered: Ghost Mode / Ghost Typing / No API Key
6. **Divider** — 1px vertical separator
7. **Settings button** — gear icon → calls `onOpenSettings`
8. **Theme button** — sun/moon → calls `onToggleDark`

---

## `ChatUI/MessageList.jsx`

**What it is:** A pure presentational component. No state, no hooks.
Renders the scrollable chat history area.

### Props

| Prop | Type | Description |
|---|---|---|
| `messages` | `Array` | Array of `{ role, text, images? }` objects |
| `isStreaming` | `boolean` | Shows loading dots on the last AI message when true |
| `scrollContainerRef` | `React.RefObject` | Attached to the outer scroll `<div>` |
| `messagesEndRef` | `React.RefObject` | Attached to a bottom anchor `<div>` for auto-scroll |

### Rendering logic

- **Empty state:** When `messages.length === 0`, shows a centered icon + hint text
- **User messages** (`role === 'user'`):
  - Right-aligned rounded bubble
  - If `images` array exists, renders thumbnail grid above the text
- **AI messages** (`role === 'ai'`):
  - Left-aligned with a "Gemini" label + icon
  - Text rendered through `ReactMarkdown` with `remarkGfm` for tables/links
  - If `text` is empty AND `isStreaming` is true AND it's the last message → shows three bouncing blue dots

### `mdComponents` (internal constant)
A component map passed to `<ReactMarkdown>`:

| Element | What it renders |
|---|---|
| `code` (block) | `<CodeBlock>` with syntax highlighting and copy button |
| `code` (inline) | Gray pill monospace span |
| `p` | Paragraph with bottom margin |
| `ul` / `ol` | Disc / decimal list with spacing |
| `li` | List item |
| `h1` / `h2` / `h3` | Bold headings with top/bottom margins |
| `blockquote` | Left-bordered italic quote block |

---

## `ChatUI/InputArea.jsx`

**What it is:** A pure presentational component. Fully controlled — all values
and handlers come from props.

### Props

| Prop | Type | Description |
|---|---|---|
| `inputText` | `string` | Controlled value of the textarea |
| `screenshots` | `string[]` | Screenshots to show as preview thumbnails |
| `isStreaming` | `boolean` | Disables the send button while streaming |
| `isTypingMode` | `boolean` | Changes placeholder text to "Ghost Typing Active..." |
| `textareaRef` | `React.RefObject` | Attached to the `<textarea>` |
| `onInputChange(value)` | `Function` | Called on every keystroke |
| `onRemoveScreenshot(idx)` | `Function` | Called when user clicks ✕ on a thumbnail |
| `onSend()` | `Function` | Called on Enter key or Send button click |

### Behaviour details
- **Screenshot previews:** Each image shows a small ✕ button top-right that calls `onRemoveScreenshot(idx)`
- **Auto-growing textarea:** The `onInput` handler sets `height = scrollHeight` so the textarea expands as the user types, capped at `max-h-32`
- **Enter to send:** `onKeyDown` calls `onSend()` on `Enter` without `Shift`. `Shift+Enter` inserts a newline
- **Send button disabled** when: `isStreaming === true` OR both `inputText` is empty AND `screenshots` is empty

---

## `ChatUI/CodeBlock.jsx`

**What it is:** A small self-contained component used inside `MessageList`'s
markdown renderer. Handles its own `copied` state.

### Props

| Prop | Type | Description |
|---|---|---|
| `language` | `string` | Language identifier for syntax highlighting (e.g. `"python"`) |
| `value` | `string` | The raw code string to display |

### State

| State | Initial | Description |
|---|---|---|
| `copied` | `false` | Flips to `true` for 2 seconds after clicking Copy |

### `handleCopy()`
1. Writes `value` to the clipboard via `navigator.clipboard.writeText()`
2. Sets `copied = true` — button shows a green tick + "Copied!" text
3. After 2000ms, resets `copied = false` — button returns to copy icon

### Visual structure
- **Header bar:** language label (left) + Copy/Copied button (right)
- **Code body:** `<SyntaxHighlighter>` with `vscDarkPlus` theme, `pre-wrap` word-break

---

## `Settings/index.jsx`

**What it is:** The settings page view. Slim orchestrator — loads data via
`useSettings`, then composes `ApiKeysSection` and `ShortcutsSection`.

### Props

| Prop | Type | Description |
|---|---|---|
| `isDarkMode` | `boolean` | Used by the dark-mode toggle button |
| `onToggleDark` | `Function` | Called by the theme toggle button |
| `onClose` | `Function` | Called by the "← Chat" back button |

### What it renders
1. **Top bar** — Back button + "Settings" title + dark-mode toggle (same glassmorphism as ChatUI TopBar)
2. **Loading spinner** — shown while `useSettings` is fetching
3. **Page title** — "App Settings" heading + subtitle
4. **`<ApiKeysSection>`** — receives `storedSettings.geminiApiKeys` and `mergeSettings` as `onSaved`
5. **`<ShortcutsSection>`** — receives `storedSettings.shortcuts` and `mergeSettings` as `onSaved`

### Data flow
- `mergeSettings(partial)` is passed as `onSaved` to both cards
- When a card saves successfully, it calls `onSaved({ geminiApiKeys: [...] })` or `onSaved({ shortcuts: {...} })`
- `mergeSettings` shallow-merges that partial into `storedSettings` — no extra IPC call needed

---

## `Settings/ApiKeysSection.jsx`

**What it is:** A self-contained card component for viewing and editing Gemini API keys.

### Props

| Prop | Type | Description |
|---|---|---|
| `initialKeys` | `string[]` | Keys loaded from store `['key1', 'key2']` |
| `onSaved(partial)` | `Function` | Notifies parent after a successful save |

### State

| State | Initial | Description |
|---|---|---|
| `keys` | copy of `initialKeys` | The two key input values |
| `visible` | `[false, false]` | Whether each key input shows plain text |
| `editMode` | `false` | Toggles between display and edit mode |
| `saveState` | `'idle'` | Drives the SaveButton state: idle/saving/saved/error |

### Functions

#### `toggleVisible(i)`
Flips `visible[i]` between `true` (show) and `false` (password mask).
Allows the user to reveal/hide each key independently.

#### `setKey(i, val)`
Updates `keys[i]` with the new input value.
Pure immutable update: creates a copy of the array, sets the index, returns it.

#### `triggerSave()`
1. Sets `saveState = 'saving'`
2. Calls `window.api.loadSettings()` to get the current shortcuts (so they aren't overwritten)
3. Calls `window.api.saveSettings({ geminiApiKeys: keys, shortcuts: existing })`
4. On success: `saveState = 'saved'`, exits edit mode, calls `onSaved`, resets to `'idle'` after 2.5s
5. On failure: `saveState = 'error'`, resets to `'idle'` after 3s

#### `maskedKey(k)`
Returns a string of `•` dots up to 32 characters long, used in display mode.

### Display modes
- **Display mode:** Shows masked dots + a green "Set" badge for keys that are set
- **Edit mode:** Shows password inputs with eye-toggle buttons + SaveButton

---

## `Settings/ShortcutsSection.jsx`

**What it is:** A self-contained card component for viewing and re-binding all
global keyboard shortcuts.

### Props

| Prop | Type | Description |
|---|---|---|
| `initialShortcuts` | `object` | Shortcuts from the store (merged with defaults) |
| `onSaved(partial)` | `Function` | Notifies parent after a successful save |

### State

| State | Initial | Description |
|---|---|---|
| `shortcuts` | defaults merged with `initialShortcuts` | Current combo map `{ id: comboString }` |
| `editingId` | `null` | The `id` of the row currently showing the recorder, or null |
| `saveState` | `'idle'` | Drives the SaveButton: idle/saving/saved/error |

### Functions

#### `applyRecorded(id, combo)`
Called by `ShortcutRecorder`'s `onConfirm`. Updates `shortcuts[id]` to the new
combo and clears `editingId` (closes the recorder).

#### `resetToDefault(id)`
Resets `shortcuts[id]` back to `DEFAULT_SHORTCUTS[id]` and closes any open recorder.
The reset button is only visible when the current combo differs from the default.

#### `handleSaveAll()`
1. Sets `saveState = 'saving'`
2. Loads current settings to preserve the stored API keys
3. Calls `window.api.saveSettings({ geminiApiKeys: existing, shortcuts })`
4. On success: `saveState = 'saved'`, calls `onSaved({ shortcuts })`, resets after 2.5s
5. On failure: `saveState = 'error'`, resets after 3s

### Row rendering logic
For each entry in `SHORTCUT_META`:
- If `editingId === id` → renders `<ShortcutRecorder>` inline
- Otherwise → renders `<ShortcutBadges>` + Edit button + optional Reset button

---

## `Settings/ShortcutRecorder.jsx`

**What it is:** An inline widget that captures a keyboard combo from the user.
Manages its own tiny local state (the recorded combo and listening flag).

### Props

| Prop | Type | Description |
|---|---|---|
| `initial` | `string` | The current combo (not used in display, available for extension) |
| `onConfirm(combo)` | `Function` | Called with the final combo when user clicks Apply |
| `onCancel()` | `Function` | Called when user clicks Cancel |

### State

| State | Initial | Description |
|---|---|---|
| `recorded` | `''` | The combo captured from the latest keydown event |
| `listening` | `true` | Whether the keydown listener is active |

### Internal keydown handler
Registered with `capture: true` so it intercepts events before anything else:
1. Calls `e.preventDefault()` and `e.stopPropagation()` to block side effects
2. Passes the event to `buildCombo(e)` from constants
3. If a valid combo is returned, sets `recorded`

### Buttons
- **Apply** — disabled until a combo is recorded. On click: sets `listening = false`
  (removes listener), then calls `onConfirm(recorded)`
- **Cancel** — always enabled. Calls `onCancel()` without saving anything

### Visual states
- No combo yet → pulsing dashed border + "Press key combo…" text
- Combo recorded → solid blue border + `<ShortcutBadges>` showing the result

---

## `Settings/ui/KeyBadge.jsx`

**What it is:** The smallest atom component. Renders a single keyboard key as a
styled pill badge.

### Props

| Prop | Type | Description |
|---|---|---|
| `label` | `string` | The key name to display (e.g. `"Ctrl"`, `"S"`, `"Enter"`) |

No logic. Pure display. Used by `ShortcutBadges`.

---

## `Settings/ui/ShortcutBadges.jsx`

**What it is:** Composes a row of `<KeyBadge>` pills to display a full shortcut combo.

### Props

| Prop | Type | Description |
|---|---|---|
| `combo` | `string` | Electron accelerator string e.g. `"CommandOrControl+Shift+S"` |

### Rendering logic
1. Calls `parseCombo(combo)` → gets an array of parts e.g. `["Ctrl", "Shift", "S"]`
2. If empty → renders a grey dash `—`
3. Otherwise → renders each part as a `<KeyBadge>` with a `+` separator between them

---

## `Settings/ui/SaveButton.jsx`

**What it is:** A state-driven button with four distinct visual appearances.
Holds no internal state — the `state` prop drives everything.

### Props

| Prop | Type | Description |
|---|---|---|
| `state` | `'idle' \| 'saving' \| 'saved' \| 'error'` | Current save lifecycle state |
| `onClick` | `Function` | Called in `idle` and `error` states |
| `label` | `string` | Button label in idle state (default: `"Save Changes"`) |
| `size` | `'sm' \| 'md'` | Controls padding and font size (default: `'md'`) |

### State appearances

| State | Appearance | Enabled? |
|---|---|---|
| `'idle'` | Blue "Save Changes" (or custom label) button | Yes |
| `'saving'` | Dimmed blue + spinning loader + "Saving…" | No |
| `'saved'` | Green + tick icon + "Saved!" | No |
| `'error'` | Red + alert icon + "Retry" | Yes (calls `onClick` again) |

---

## `Versions.jsx` (unchanged)

**What it is:** A tiny static component that displays the Electron, Chrome, and
Node.js version numbers. Not related to the chat functionality — kept for
diagnostic/debug purposes.

---

## Data Flow Summary

```
App.jsx
  ├── ChatUI/index.jsx  ← owns all chat state
  │     ├── useIPCListeners  ← wires main→renderer events
  │     ├── useChatAPI       ← Gemini stream logic
  │     ├── TopBar           ← displays status badges + buttons
  │     ├── MessageList      ← renders messages + loading dots
  │     │     └── CodeBlock  ← syntax block inside markdown
  │     └── InputArea        ← textarea + screenshot previews
  │
  └── Settings/index.jsx  ← loads settings, composes cards
        ├── useSettings      ← IPC load on mount
        ├── ApiKeysSection   ← edit/save API keys
        │     └── SaveButton
        └── ShortcutsSection ← edit/save shortcuts
              ├── ShortcutRecorder  ← captures key combos
              ├── ShortcutBadges    ← renders combo as pills
              │     └── KeyBadge
              └── SaveButton
```
