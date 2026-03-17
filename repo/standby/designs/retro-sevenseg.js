(function () {
  "use strict";

  const SEGMENTS = {
    "0": ["a", "b", "c", "d", "e", "f"],
    "1": ["b", "c"],
    "2": ["a", "b", "d", "e", "g"],
    "3": ["a", "b", "c", "d", "g"],
    "4": ["b", "c", "f", "g"],
    "5": ["a", "c", "d", "f", "g"],
    "6": ["a", "c", "d", "e", "f", "g"],
    "7": ["a", "b", "c"],
    "8": ["a", "b", "c", "d", "e", "f", "g"],
    "9": ["a", "b", "c", "d", "f", "g"],
    "-": ["g"],
    " ": []
  };

  const SEGMENT_ORDER = ["a", "b", "c", "d", "e", "f", "g"];

  function autoloadCss() {
    const scriptPath = document.currentScript ? document.currentScript.src : "";
    if (window.Standby && window.Standby.utils && scriptPath) {
      window.Standby.utils.loadStyleSheet(
        scriptPath.replace(/\.js(\?.*)?$/, ".css$1")
      );
    }
    return scriptPath;
  }

  function createDigit(classPrefix, char) {
    if (char === ":") {
      const colon = document.createElement("div");
      colon.className = `${classPrefix}__digit ${classPrefix}__digit--colon`;
      colon.dataset.kind = "colon";
      colon.innerHTML = `
        <span class="${classPrefix}__dot ${classPrefix}__dot--top"></span>
        <span class="${classPrefix}__dot ${classPrefix}__dot--bottom"></span>
      `;
      return colon;
    }

    const digit = document.createElement("div");
    digit.className = `${classPrefix}__digit`;
    digit.dataset.kind = "digit";
    digit.dataset.value = char;

    for (const seg of SEGMENT_ORDER) {
      const node = document.createElement("span");
      node.className = `${classPrefix}__segment ${classPrefix}__segment--${seg}`;
      node.dataset.seg = seg;
      digit.appendChild(node);
    }

    return digit;
  }

  function buildDisplay(container, classPrefix, pattern) {
    container.textContent = "";
    const nodes = [];

    for (const char of pattern) {
      const node = createDigit(classPrefix, char);
      container.appendChild(node);
      nodes.push(node);
    }

    return nodes;
  }

  function applyDigit(node, char) {
    if (!node) return;

    if (node.dataset.kind === "colon") {
      node.classList.toggle("is-on", char === ":");
      return;
    }

    const active = new Set(SEGMENTS[char] || []);
    for (const segment of node.children) {
      segment.classList.toggle("is-on", active.has(segment.dataset.seg));
    }
    node.dataset.value = char;
  }

  function defaultFormat(now, use24Hour, showSeconds) {
    const rawHour = now.getHours();
    const isPM = rawHour >= 12;
    const hour = use24Hour ? rawHour : ((rawHour % 12) || 12);
    const hourText = use24Hour ? String(hour).padStart(2, "0") : String(hour);
    const minuteText = String(now.getMinutes()).padStart(2, "0");
    const secondText = String(now.getSeconds()).padStart(2, "0");
    const text = showSeconds ? `${hourText}:${minuteText}:${secondText}` : `${hourText}:${minuteText}`;
    return { text, isPM };
  }

  function registerDesign() {
    if (!window.Standby || typeof window.Standby.registerDesign !== "function") {
      return;
    }

    const scriptPath = autoloadCss();

    window.Standby.registerDesign({
      id: "retro7",
      name: "Retro 7-Segment",
      sourcePath: scriptPath,
      styles: [
        { id: "amber", name: "Amber" },
        { id: "green", name: "Green" },
        { id: "red-alarm", name: "Red Alarm" }
      ],
      settingsSchema: [
        {
          key: "retro7Glow",
          label: "Glow",
          type: "range",
          min: 0.2,
          max: 1.5,
          step: 0.01,
          default: 0.85
        },
        {
          key: "retro7CaseScale",
          label: "Clock scale",
          type: "range",
          min: 0.8,
          max: 1.15,
          step: 0.01,
          default: 1
        },
        {
          key: "retro7ShowDate",
          label: "Show date",
          type: "checkbox",
          default: true
        }
      ],
      mount(ctx) {
        const root = document.createElement("div");
        root.className = "retro7";
        root.dataset.style = "0";
        root.innerHTML = `
          <section class="retro7__case">
            <div class="retro7__panel">
              <div class="retro7__header">
                <div class="retro7__brand">Digital Clock</div>
                <div class="retro7__meta">
                  <span class="retro7__date"></span>
                  <span class="retro7__pm">PM</span>
                </div>
              </div>
              <div class="retro7__display-wrap">
                <div class="retro7__display" aria-label="digital time display"></div>
              </div>
              <div class="retro7__footer">Quartz • Solid State • 7 Segment</div>
            </div>
          </section>
        `;
        ctx.host.appendChild(root);

        const els = {
          display: root.querySelector(".retro7__display"),
          date: root.querySelector(".retro7__date"),
          pm: root.querySelector(".retro7__pm"),
          case: root.querySelector(".retro7__case")
        };

        let lastPattern = "";
        let lastText = "";
        let digitNodes = [];
        let lastDate = "";
        let lastScale = "";
        let lastGlow = "";
        let lastStyle = -1;
        let lastDateVisibility = null;

        return {
          render({ now, settings, styleIndex }) {
            if (styleIndex !== lastStyle) {
              lastStyle = styleIndex;
              root.dataset.style = String(styleIndex);
            }

            const glow = String(settings.retro7Glow ?? 0.85);
            if (glow !== lastGlow) {
              lastGlow = glow;
              root.style.setProperty("--retro7-glow", glow);
            }

            const scale = String(settings.retro7CaseScale ?? 1);
            if (scale !== lastScale) {
              lastScale = scale;
              els.case.style.transform = `scale(${scale})`;
            }

            const use24Hour = Boolean(settings.use24Hour);
            const showSeconds = Boolean(settings.showSeconds);
            const parts = ctx.utils && typeof ctx.utils.formatTimeParts === "function"
              ? ctx.utils.formatTimeParts(now, settings)
              : null;

            const text = parts
              ? (showSeconds
                  ? `${parts.displayHour}:${parts.minutes}:${parts.seconds}`
                  : `${parts.displayHour}:${parts.minutes}`)
              : defaultFormat(now, use24Hour, showSeconds).text;

            const isPM = parts ? now.getHours() >= 12 : defaultFormat(now, use24Hour, showSeconds).isPM;

            if (text !== lastText) {
              lastText = text;
              if (text !== lastPattern) {
                lastPattern = text;
                digitNodes = buildDisplay(els.display, "retro7", text);
              }
              for (let i = 0; i < text.length; i += 1) {
                applyDigit(digitNodes[i], text[i]);
              }
            }

            els.pm.classList.toggle("is-on", !use24Hour && isPM);
            els.pm.hidden = use24Hour;

            const showDate = settings.retro7ShowDate !== false;
            if (showDate !== lastDateVisibility) {
              lastDateVisibility = showDate;
              els.date.hidden = !showDate;
            }

            if (showDate) {
              const dateText = ctx.utils && typeof ctx.utils.weekdayShort === "function" && typeof ctx.utils.monthShort === "function"
                ? `${ctx.utils.weekdayShort(now)} ${ctx.utils.monthShort(now)} ${now.getDate()}`
                : now.toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric" }).toUpperCase();

              if (dateText !== lastDate) {
                lastDate = dateText;
                els.date.textContent = dateText;
              }
            }
          },
          destroy() {}
        };
      }
    });
  }

  if (window.Standby && typeof window.Standby.registerDesign === "function") {
    registerDesign();
  } else {
    autoloadCss();
  }
})();
