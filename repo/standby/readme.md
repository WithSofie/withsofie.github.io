# Standby Suite

A modular iPhone StandBy-style web app with one central controller and separately loaded design scripts.

## Structure

- `index.html`
  - main entry
  - owns shared overlays, gesture handling, settings panel, sleep timer, and anti burn-in behavior
- `css/core.css`
  - shared layout and settings UI
- `js/core.js`
  - registry, persistence, wake-lock attempt, fullscreen attempt, sleep logic, style swiping, and dynamic settings rendering
- `designs/*.js`
  - each file registers one design through `window.Standby.registerDesign(...)`
  - each design auto-loads its matching CSS file
- `designs/*.css`
  - design-local styling

## Current designs

- `vanilla.js`
  - iPhone-like vanilla design
  - 4 swipeable styles inside the design:
    - Soft Gradient
    - Night Clock
    - World Map
    - Analog Calendar
- `neon.js`
  - glow-heavy alternate design
- `retro-sevenseg.js`
  - plain retro seven-segment digital clock

## How to add a new design

1. Add a new script tag in `index.html`, for example:
   `<script src="./designs/minimal.js"></script>`
2. Create `designs/minimal.js`
3. Create `designs/minimal.css`
4. Register the design in the script:

```js
window.Standby.registerDesign({
  id: "minimal",
  name: "Minimal",
  sourcePath: document.currentScript ? document.currentScript.src : "",
  styles: [
    { id: "clean", name: "Clean" },
    { id: "alt", name: "Alt" }
  ],
  settingsSchema: [
    {
      key: "minimalAccent",
      label: "Accent color",
      type: "color",
      default: "#ffffff"
    }
  ],
  mount(ctx) {
    const root = document.createElement("div");
    root.className = "minimal-design";
    root.innerHTML = `<div class="minimal-time"></div>`;
    ctx.host.appendChild(root);

    const time = root.querySelector(".minimal-time");

    return {
      render({ now, settings, styleIndex }) {
        root.dataset.style = String(styleIndex);
        const parts = window.Standby.utils.formatTimeParts(now, settings);
        time.textContent = `${parts.displayHour}:${parts.minutes}`;
      },
      destroy() {}
    };
  }
});
```

## Hidden settings

Tap 5 times quickly anywhere on the standby screen.

## Gestures

- swipe left/right: switch style inside the current design
- settings panel: switch design globally

## Notes

- settings are saved in localStorage
- wake lock and fullscreen are attempted when supported, but mobile browsers may still limit them
- sleep timer turns the display black after the selected time; tap once to wake
