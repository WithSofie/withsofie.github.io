
(function () {
  "use strict";

  const scriptPath = document.currentScript ? document.currentScript.src : "";
  if (window.Standby && window.Standby.utils && scriptPath) {
    window.Standby.utils.loadStyleSheet(scriptPath.replace(/\.js(\?.*)?$/, ".css$1"));
  }

  const SEGMENTS = {
    "0": ["a", "b", "c", "d", "e", "f"],
    "1": ["b", "c"],
    "2": ["a", "b", "g", "e", "d"],
    "3": ["a", "b", "g", "c", "d"],
    "4": ["f", "g", "b", "c"],
    "5": ["a", "f", "g", "c", "d"],
    "6": ["a", "f", "g", "c", "d", "e"],
    "7": ["a", "b", "c"],
    "8": ["a", "b", "c", "d", "e", "f", "g"],
    "9": ["a", "b", "c", "d", "f", "g"]
  };

  function createDigit() {
    const node = document.createElement("div");
    node.className = "retro-digit";
    node.innerHTML = `
      <span class="retro-seg retro-seg-a"></span>
      <span class="retro-seg retro-seg-b"></span>
      <span class="retro-seg retro-seg-c"></span>
      <span class="retro-seg retro-seg-d"></span>
      <span class="retro-seg retro-seg-e"></span>
      <span class="retro-seg retro-seg-f"></span>
      <span class="retro-seg retro-seg-g"></span>
    `;
    return node;
  }

  function createColon() {
    const node = document.createElement("div");
    node.className = "retro-colon";
    node.innerHTML = `<span></span><span></span>`;
    return node;
  }

  function setDigitValue(node, value) {
    for (const seg of node.querySelectorAll(".retro-seg")) {
      seg.classList.remove("on");
    }
    const active = SEGMENTS[value] || [];
    for (const name of active) {
      const seg = node.querySelector(`.retro-seg-${name}`);
      if (seg) seg.classList.add("on");
    }
  }

  window.Standby.registerDesign({
    id: "retro7",
    name: "Retro 7-Segment",
    sourcePath: scriptPath,
    styles: [
      { id: "amber", name: "Amber" },
      { id: "green", name: "Green" }
    ],
    settingsSchema: [
      {
        key: "retroGlow",
        label: "Tube glow",
        type: "range",
        min: 0.2,
        max: 1.2,
        step: 0.01,
        default: 0.75
      }
    ],
    mount(ctx) {
      const root = document.createElement("div");
      root.className = "retro-design";
      root.innerHTML = `
        <div class="retro-wrap">
          <div class="retro-clock"></div>
          <div class="retro-date"></div>
        </div>
      `;
      ctx.host.appendChild(root);
      const clock = root.querySelector(".retro-clock");
      const date = root.querySelector(".retro-date");
      let structureKey = "";

      function rebuild(pattern) {
        clock.innerHTML = "";
        for (const char of pattern) {
          if (char === ":") clock.appendChild(createColon());
          else clock.appendChild(createDigit());
        }
      }

      function applyTime(text) {
        const key = text.replace(/[0-9]/g, "d");
        if (key !== structureKey) {
          structureKey = key;
          rebuild(text);
        }
        const children = [...clock.children];
        let index = 0;
        for (const char of text) {
          const node = children[index];
          if (char !== ":") setDigitValue(node, char);
          index += 1;
        }
      }

      return {
        render({ now, settings, styleIndex }) {
          root.dataset.style = String(styleIndex);
          root.style.setProperty("--retro-glow", settings.retroGlow || 0.75);

          const parts = window.Standby.utils.formatTimeParts(now, settings);
          const text = settings.showSeconds
            ? `${parts.displayHour.padStart(2, "0")}:${parts.minutes}:${parts.seconds}`
            : `${parts.displayHour.padStart(2, "0")}:${parts.minutes}`;
          applyTime(text);
          date.textContent = `${window.Standby.utils.weekdayShort(now)} ${window.Standby.utils.monthShort(now)} ${String(now.getDate()).padStart(2, "0")}`;
        },
        destroy() {}
      };
    }
  });
})();
