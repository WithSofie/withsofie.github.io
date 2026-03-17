
(function () {
  "use strict";

  const scriptPath = document.currentScript ? document.currentScript.src : "";
  if (window.Standby && window.Standby.utils && scriptPath) {
    window.Standby.utils.loadStyleSheet(scriptPath.replace(/\.js(\?.*)?$/, ".css$1"));
  }

  function generateDotMap() {
    const width = 1200;
    const height = 420;
    const spacing = 22;
    const circles = [];
    const hotspots = [
      { x: 250, y: 170, r: 18 },
      { x: 540, y: 190, r: 18 },
      { x: 920, y: 210, r: 18 },
      { x: 1000, y: 210, r: 18 }
    ];

    const ellipses = [
      [220, 150, 160, 70],
      [320, 185, 130, 86],
      [420, 260, 80, 120],
      [510, 320, 90, 85],
      [780, 150, 205, 70],
      [910, 170, 170, 86],
      [840, 250, 90, 110],
      [1000, 285, 115, 75],
      [1120, 320, 60, 42]
    ];

    function inEllipse(x, y, cx, cy, rx, ry) {
      const dx = (x - cx) / rx;
      const dy = (y - cy) / ry;
      return dx * dx + dy * dy <= 1;
    }

    function insideMap(x, y) {
      return ellipses.some(([cx, cy, rx, ry]) => inEllipse(x, y, cx, cy, rx, ry));
    }

    for (let y = 28; y < height - 20; y += spacing) {
      for (let x = 20; x < width - 20; x += spacing) {
        if (!insideMap(x, y)) continue;
        const brightWindow = x > 660 && x < 1140 && y > 36 && y < 372;
        const cls = brightWindow ? "vanilla-map-dot vanilla-map-dot--bright" : "vanilla-map-dot";
        circles.push(`<circle class="${cls}" cx="${x}" cy="${y}" r="6.4" />`);
      }
    }

    const hotspotSvg = hotspots.map((point) => (
      `<circle class="vanilla-map-hotspot-shadow" cx="${point.x}" cy="${point.y}" r="${point.r + 6}" />
       <circle class="vanilla-map-hotspot" cx="${point.x}" cy="${point.y}" r="${point.r}" />`
    )).join("");

    return `
      <svg class="vanilla-map-svg" viewBox="0 0 ${width} ${height}" preserveAspectRatio="xMidYMid meet" aria-hidden="true">
        <rect class="vanilla-map-window" x="670" y="34" width="470" height="342" rx="54" ry="54"></rect>
        ${circles.join("")}
        ${hotspotSvg}
      </svg>
    `;
  }

  function createAnalogMarks(container) {
    for (let i = 0; i < 60; i += 1) {
      const angle = (i * 6 * Math.PI) / 180;
      const radius = i % 5 === 0 ? 44.5 : 46;
      const x = 50 + Math.sin(angle) * radius;
      const y = 50 - Math.cos(angle) * radius;
      const mark = document.createElement("div");
      mark.className = `vanilla-analog-mark${i % 5 === 0 ? " vanilla-analog-mark--major" : ""}`;
      mark.style.left = `${x}%`;
      mark.style.top = `${y}%`;
      mark.style.transform = `translate(-50%, -50%) rotate(${i * 6}deg)`;
      container.appendChild(mark);
    }
  }

  function pad(n) {
    return String(n).padStart(2, "0");
  }

  function buildCalendar(now, target) {
    const month = now.getMonth();
    const year = now.getFullYear();
    const first = new Date(year, month, 1);
    const last = new Date(year, month + 1, 0);
    const startOffset = first.getDay();
    const total = last.getDate();
    const activeDay = now.getDate();

    const labels = ["S", "M", "T", "W", "T", "F", "S"];
    const html = [];
    labels.forEach((label) => html.push(`<div class="vanilla-calendar-cell vanilla-calendar-cell--label">${label}</div>`));
    for (let i = 0; i < startOffset; i += 1) {
      html.push(`<div class="vanilla-calendar-cell vanilla-calendar-cell--muted"></div>`);
    }
    for (let day = 1; day <= total; day += 1) {
      const classes = ["vanilla-calendar-cell"];
      if (day === activeDay) classes.push("vanilla-calendar-cell--today");
      html.push(`<div class="${classes.join(" ")}">${day}</div>`);
    }
    target.innerHTML = html.join("");
  }

  window.Standby.registerDesign({
    id: "vanilla",
    name: "Vanilla",
    sourcePath: scriptPath,
    styles: [
      { id: "soft-gradient", name: "Soft Gradient" },
      { id: "night-clock", name: "Night Clock" },
      { id: "world-map", name: "World Map" },
      { id: "analog-calendar", name: "Analog Calendar" }
    ],
    settingsSchema: [
      {
        key: "vanillaBlueStrength",
        label: "Night clock blue",
        type: "range",
        min: 0.65,
        max: 1.2,
        step: 0.01,
        default: 1
      },
      {
        key: "vanillaPastelTilt",
        label: "Pastel gradient tilt",
        type: "range",
        min: -30,
        max: 30,
        step: 1,
        default: 6
      }
    ],
    mount(ctx) {
      const root = document.createElement("div");
      root.className = "vanilla-design";
      root.innerHTML = `
        <section class="vanilla-scene vanilla-scene--pastel">
          <div class="vanilla-pastel-bg"></div>
          <div class="vanilla-pastel-clock">
            <span class="vanilla-time vanilla-time--pastel"></span>
          </div>
        </section>

        <section class="vanilla-scene vanilla-scene--night">
          <div class="vanilla-night-main">
            <span class="vanilla-time vanilla-time--night"></span>
          </div>
          <div class="vanilla-night-side">
            <div class="vanilla-side-day"></div>
            <div class="vanilla-side-alarm">
              <div class="vanilla-alarm-glyph">◷</div>
              <div class="vanilla-alarm-text"></div>
            </div>
          </div>
        </section>

        <section class="vanilla-scene vanilla-scene--map">
          <div class="vanilla-map-top">
            <div class="vanilla-map-alarm">◷ <span></span></div>
          </div>
          <div class="vanilla-map-wrap">${generateDotMap()}</div>
          <div class="vanilla-map-bottom">
            <div class="vanilla-map-arrow">➜</div>
            <div class="vanilla-map-travel"></div>
          </div>
        </section>

        <section class="vanilla-scene vanilla-scene--analog">
          <div class="vanilla-analog-panel">
            <div class="vanilla-analog-face">
              <div class="vanilla-analog-marks"></div>
              <div class="vanilla-analog-center"></div>
              <div class="vanilla-analog-hand vanilla-analog-hand--hour"></div>
              <div class="vanilla-analog-hand vanilla-analog-hand--minute"></div>
              <div class="vanilla-analog-hand vanilla-analog-hand--second"></div>
            </div>
          </div>
          <div class="vanilla-calendar-panel">
            <div class="vanilla-charge-ring">
              <div class="vanilla-charge-inner">⚡</div>
            </div>
            <div class="vanilla-calendar-month"></div>
            <div class="vanilla-calendar-grid"></div>
          </div>
        </section>
      `;
      ctx.host.appendChild(root);

      const els = {
        pastelTime: root.querySelector(".vanilla-time--pastel"),
        nightTime: root.querySelector(".vanilla-time--night"),
        nightDay: root.querySelector(".vanilla-side-day"),
        nightAlarm: root.querySelector(".vanilla-alarm-text"),
        mapAlarm: root.querySelector(".vanilla-map-alarm span"),
        mapTravel: root.querySelector(".vanilla-map-travel"),
        analogMarks: root.querySelector(".vanilla-analog-marks"),
        hourHand: root.querySelector(".vanilla-analog-hand--hour"),
        minuteHand: root.querySelector(".vanilla-analog-hand--minute"),
        secondHand: root.querySelector(".vanilla-analog-hand--second"),
        calendarMonth: root.querySelector(".vanilla-calendar-month"),
        calendarGrid: root.querySelector(".vanilla-calendar-grid")
      };
      createAnalogMarks(els.analogMarks);

      let lastCalendarKey = "";
      let lastTimeKey = "";

      return {
        destroy() {},
        render({ now, settings, styleIndex }) {
          root.dataset.style = String(styleIndex);
          root.style.setProperty("--vanilla-blue-strength", settings.vanillaBlueStrength || 1);
          root.style.setProperty("--vanilla-pastel-tilt", `${settings.vanillaPastelTilt || 6}deg`);
          root.style.setProperty("--vanilla-accent", settings.accentColor || "#ff453a");

          const parts = window.Standby.utils.formatTimeParts(now, settings);
          const timeText = settings.showSeconds
            ? `${parts.displayHour}:${parts.minutes}:${parts.seconds}`
            : `${parts.displayHour}:${parts.minutes}`;
          const dayKey = `${now.getFullYear()}-${now.getMonth()}-${now.getDate()}`;

          if (timeText !== lastTimeKey) {
            lastTimeKey = timeText;
            els.pastelTime.textContent = timeText;
            els.nightTime.textContent = timeText;
          }

          els.nightDay.textContent = `${window.Standby.utils.weekdayShort(now)} ${now.getDate()}`;
          els.nightAlarm.textContent = settings.alarmText || "8:30 AM";
          els.mapAlarm.textContent = settings.alarmText || "8:30 AM";
          els.mapTravel.textContent = settings.travelTimeText || "12:17";

          const seconds = now.getSeconds();
          const minute = now.getMinutes() + seconds / 60;
          const hour = (now.getHours() % 12) + minute / 60;
          els.hourHand.style.transform = `translate(-50%, -100%) rotate(${hour * 30}deg)`;
          els.minuteHand.style.transform = `translate(-50%, -100%) rotate(${minute * 6}deg)`;
          els.secondHand.style.transform = `translate(-50%, -100%) rotate(${seconds * 6}deg)`;
          els.secondHand.style.display = settings.showSeconds ? "block" : "none";

          if (dayKey !== lastCalendarKey) {
            lastCalendarKey = dayKey;
            els.calendarMonth.textContent = window.Standby.utils.monthLong(now);
            buildCalendar(now, els.calendarGrid);
          }
        }
      };
    }
  });
})();
