# Suppressing the "Accessible challenge" tooltip on page load

## Problem

The HUMAN challenge iframe (`https://iframe.hsprotect.net`) renders an accessibility
button with `aria-label="Accessible challenge"`:

```html
<a tabindex="0" role="button" aria-label="Accessible challenge" aria-describedby="...">
```

Chrome (101+) shows `aria-label` values as native browser tooltips for focused
`role="button"` elements. The HUMAN SDK auto-focuses this button when the challenge
renders, so "Accessible challenge" flashes as a tooltip every time the page loads.
The setting cannot be changed from the HUMAN Security account dashboard.

---

## Why standard approaches do not work

The tooltip is rendered by **the browser at the OS/chrome layer**, not by web content
inside the iframe. Parent-page CSS and simple focus manipulation cannot suppress it.

| Approach | Why it failed |
|---|---|
| `opacity: 0` on the iframe | Element stays in the accessibility tree; Chrome still shows the tooltip. Timing was also wrong — the tooltip appears after the `rendered` postMessage, not at `load`. |
| `pointer-events: none` | Prevents hover tooltips only; this tooltip is triggered by programmatic focus (HUMAN SDK calls `.focus()` internally). |
| `setTimeout(() => challengeIframe.blur(), 200)` | `blur()` on the iframe element removes it from the parent's `document.activeElement`, but the button **inside the iframe's own document** may remain focused. Chrome's tooltip decision is keyed to the iframe-internal focus state, not the parent's view. |
| `challengeIframe.addEventListener('focus', () => challengeIframe.blur())` | Same root cause as above. Also, the `focus` event on the iframe element in the parent may not fire when cross-origin JS inside the iframe calls `element.focus()` directly. |
| `visibility: hidden` instead of `opacity: 0` | Excludes the element from the parent accessibility tree, but Chrome still paints the tooltip because the button is focused inside the iframe's own browsing context. |
| `inert` attribute on `<iframe>` | Prevents user-driven and parent-driven focus from entering the iframe, but does **not** prevent the iframe's own JavaScript from focusing elements inside its own document. |
| Anchoring reveal to the `rendered` postMessage + 2500 ms delay | Better timing logic, but none of the CSS/attribute approaches actually suppress a browser-native tooltip regardless of timing. |

---

## Root cause

The HUMAN SDK calls `button.focus()` inside the cross-origin iframe. This focuses
the button within the **iframe's own browsing context**. Chrome then shows the
`aria-label` as a native tooltip. Parent-page CSS properties (`opacity`, `visibility`,
`inert`) are applied to the `<iframe>` element in the parent document, not to the
internal document, so Chrome ignores them when deciding whether to display the tooltip.

Calling `challengeIframe.blur()` in the parent only clears `document.activeElement`
in the parent — it does not remove focus from the button inside the iframe's document.
Chrome's tooltip logic is driven by that internal focus, so `blur()` alone is
ineffective.

---

## Solution that works

Two mechanisms are layered together. Either alone may be sufficient; both are kept
for robustness.

### 1. requestAnimationFrame focus trap

A tiny invisible `<div tabindex="-1">` is appended to the parent page. A
`requestAnimationFrame` loop runs every frame (~16 ms) while the iframe is hidden.
Whenever `document.activeElement === challengeIframe`, it calls `focusTrap.focus()`
— **actively focusing a parent-page element** rather than merely blurring the iframe.
Focusing a real parent element forces the iframe's browsing context to lose focus
entirely, removing focus from the button inside the iframe's document and preventing
Chrome from painting the tooltip.

Because `requestAnimationFrame` runs before each paint, the focus is stolen before
Chrome has a chance to render the tooltip. The guard stops and removes itself when
the challenge is revealed.

```js
const focusTrap = document.createElement('div');
focusTrap.tabIndex = -1;
focusTrap.style.cssText =
    'position:absolute;width:1px;height:1px;overflow:hidden;clip:rect(0 0 0 0);left:-9999px;top:0;';
document.body.appendChild(focusTrap);

function runFocusGuard() {
    if (challengeIframe.classList.contains('captcha-ready')) return;
    if (document.activeElement === challengeIframe) focusTrap.focus({ preventScroll: true });
    requestAnimationFrame(runFocusGuard);
}
```

The guard starts in the iframe's `load` event handler (`requestAnimationFrame(runFocusGuard)`)
and terminates itself once `captcha-ready` is on the iframe. A `captchaRevealed` boolean
in `scheduleCaptchaReveal` ensures only one reveal timer is ever queued, even if HUMAN's
SDK fires `rendered` more than once.


### Supporting mechanism

- `opacity: 0` on `#challengeIframe` hides the iframe visually until the challenge is
  ready. `captcha-ready` sets it to `opacity: 1` with a short fade.
- The reveal is triggered 2500 ms after the `rendered` postMessage, with a 6-second
  absolute fallback in case `rendered` never arrives.

### What was tried and discarded

`visibility: hidden` and `inert` were applied together with the rAF focus trap when the
fix first worked, but neither is necessary:

- `visibility: hidden` — adds no suppression beyond `opacity: 0`; both failed alone.
- `inert` attribute — confirmed failed alone; doesn't prevent the iframe's own JS from
  calling `.focus()` on its internal elements.

---

## Timeline of the fix (captcha-on/index.html)

```
page load
  └─ bootstrap() → /api/config
       └─ startChallenge()
            ├─ iframe src set  (opacity: 0)
            └─ iframe load
                 ├─ requestAnimationFrame(runFocusGuard) starts
                 ├─ postMessage: setToWindow (challenge config)
                 ├─ postMessage: block       (initiates challenge render)
                 └─ fallback: scheduleCaptchaReveal(0) after 6 s

  iframe renders → 'rendered' postMessage received by parent
       └─ scheduleCaptchaReveal(2500)   ← captchaRevealed=true; subsequent calls are no-ops
            └─ after 2500 ms:
                 ├─ focusTrap.remove()
                 └─ challengeIframe.classList.add('captcha-ready')
                      → opacity: 1 (fades in via CSS transition)

  every frame until captcha-ready:
       └─ runFocusGuard: if document.activeElement === iframe → focusTrap.focus()
            (evicts focus from iframe's browsing context; Chrome never paints the tooltip)
```
