
(function () {
  "use strict";

  const scriptPath = document.currentScript ? document.currentScript.src : "";
  if (window.Standby && window.Standby.utils && scriptPath) {
    window.Standby.utils.loadStyleSheet(scriptPath.replace(/\.js(\?.*)?$/, ".css$1"));
  }

  function makeStarField(count) {
    let html = "";
    for (let i = 0; i < count; i += 1) {
      const left = Math.random() * 100;
      const top = Math.random() * 100;
      const size = 1 + Math.random() * 2.8;
      const delay = Math.random() * 9;
      html += `<span class="neon-star" style="left:${left}%;top:${top}%;width:${size}px;height:${size}px;animation-delay:${delay}s"></span>`;
    }
    return html;
  }

  window.Standby.registerDesign({
    id: "neon",
    name: "Neon",
    sourcePath: scriptPath,
    styles: [
      { id: "aura", name: "Aura" },
      { id: "split-grid", name: "Split Grid" }
    ],
    settingsSchema: [
      {
        key: "neonGlow",
        label: "Glow strength",
        type: "range",
        min: 0.2,
        max: 1.4,
        step: 0.01,
        default: 0.8
      }
    ],
    mount(ctx) {
      const root = document.createElement("div");
      root.className = "neon-design";
      root.innerHTML = `
        <section class="neon-scene neon-scene--aura">
          <div class="neon-stars">${makeStarField(70)}</div>
          <div class="neon-aura neon-aura--left"></div>
          <div class="neon-aura neon-aura--right"></div>
          <div class="neon-main">
            <div class="neon-date"></div>
            <div class="neon-time neon-time--hero"></div>
          </div>
        </section>

        <section class="neon-scene neon-scene--split">
          <div class="neon-grid-bg"></div>
          <div class="neon-card neon-card--time">
            <div class="neon-card-label">TIME</div>
            <div class="neon-time neon-time--split"></div>
          </div>
          <div class="neon-card neon-card--meta">
            <div class="neon-card-label">NEXT</div>
            <div class="neon-next-alarm"></div>
            <div class="neon-small-date"></div>
          </div>
        </section>
      `;
      ctx.host.appendChild(root);

      const els = {
        date: root.querySelector(".neon-date"),
        heroTime: root.querySelector(".neon-time--hero"),
        splitTime: root.querySelector(".neon-time--split"),
        nextAlarm: root.querySelector(".neon-next-alarm"),
        smallDate: root.querySelector(".neon-small-date")
      };

      return {
        render({ now, settings, styleIndex }) {
          root.dataset.style = String(styleIndex);
          root.style.setProperty("--neon-glow", settings.neonGlow || 0.8);
          const parts = window.Standby.utils.formatTimeParts(now, settings);
          const timeText = settings.showSeconds
            ? `${parts.displayHour}:${parts.minutes}:${parts.seconds}`
            : `${parts.displayHour}:${parts.minutes}`;
          const dateText = `${window.Standby.utils.weekdayShort(now)} · ${window.Standby.utils.monthShort(now)} ${now.getDate()}`;
          els.date.textContent = dateText;
          els.heroTime.textContent = timeText;
          els.splitTime.textContent = timeText;
          els.nextAlarm.textContent = settings.alarmText || "8:30 AM";
          els.smallDate.textContent = dateText;
        },
        destroy() {}
      };
    }
  });
})();
