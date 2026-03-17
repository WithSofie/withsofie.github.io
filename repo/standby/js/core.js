
(function () {
  "use strict";

  const STORAGE_KEY = "standby-suite-settings-v1";

  const defaultSettings = {
    designId: "vanilla",
    designStyles: {},
    turnOffMinutes: 30,
    fullScreen: true,
    wakeLockEnabled: true,
    use24Hour: false,
    showSeconds: false,
    brightness: 0.82,
    antiBurnInPixelShift: true,
    antiBurnInDrift: true,
    antiBurnInDimPulse: true,
    shiftAmount: 8,
    shiftIntervalSec: 90,
    alarmText: "8:30 AM",
    travelTimeText: "12:17",
    accentColor: "#ff453a"
  };

  const registry = [];
  let dynamicFieldRefs = [];

  function deepClone(value) {
    return JSON.parse(JSON.stringify(value));
  }

  function loadSettings() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return deepClone(defaultSettings);
      return { ...deepClone(defaultSettings), ...JSON.parse(raw) };
    } catch (_) {
      return deepClone(defaultSettings);
    }
  }

  function saveSettings(settings) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
  }

  function clamp(value, min, max) {
    return Math.min(max, Math.max(min, value));
  }

  function loadStyleSheet(href) {
    if (!href) return;
    if ([...document.querySelectorAll('link[rel="stylesheet"]')].some((node) => node.href === href)) {
      return;
    }
    const link = document.createElement("link");
    link.rel = "stylesheet";
    link.href = href;
    document.head.appendChild(link);
  }

  function ensureDesignDefaults(settings, design) {
    const schema = design.settingsSchema || [];
    for (const item of schema) {
      if (!(item.key in settings) && Object.prototype.hasOwnProperty.call(item, "default")) {
        settings[item.key] = item.default;
      }
    }
    if (!settings.designStyles || typeof settings.designStyles !== "object") {
      settings.designStyles = {};
    }
    if (!(design.id in settings.designStyles)) {
      settings.designStyles[design.id] = 0;
    }
  }

  function registerDesign(design) {
    if (!design || !design.id || !design.name || typeof design.mount !== "function") {
      throw new Error("A design must provide id, name, and mount(ctx).");
    }
    if (registry.some((item) => item.id === design.id)) {
      throw new Error(`Duplicate design id: ${design.id}`);
    }
    registry.push(design);
    if (window.Standby && window.Standby.app) {
      window.Standby.app.handleRegistryChange();
    }
  }

  window.Standby = {
    version: "2.0.0",
    registry,
    registerDesign,
    utils: {
      clamp,
      loadStyleSheet,
      formatTimeParts(date, settings) {
        const hoursRaw = date.getHours();
        const minutes = String(date.getMinutes()).padStart(2, "0");
        const seconds = String(date.getSeconds()).padStart(2, "0");
        const use24 = !!settings.use24Hour;
        const hours24 = String(hoursRaw).padStart(2, "0");
        const hours12Num = hoursRaw % 12 || 12;
        const hours12 = String(hours12Num);
        return {
          hoursRaw,
          hours24,
          hours12,
          minutes,
          seconds,
          period: hoursRaw >= 12 ? "PM" : "AM",
          displayHour: use24 ? hours24 : hours12
        };
      },
      weekdayShort(date) {
        return ["SUN", "MON", "TUE", "WED", "THU", "FRI", "SAT"][date.getDay()];
      },
      monthLong(date) {
        return [
          "JANUARY", "FEBRUARY", "MARCH", "APRIL", "MAY", "JUNE",
          "JULY", "AUGUST", "SEPTEMBER", "OCTOBER", "NOVEMBER", "DECEMBER"
        ][date.getMonth()];
      },
      monthShort(date) {
        return ["JAN", "FEB", "MAR", "APR", "MAY", "JUN", "JUL", "AUG", "SEP", "OCT", "NOV", "DEC"][date.getMonth()];
      },
      currentScriptPath() {
        return document.currentScript ? document.currentScript.src : "";
      }
    },
    app: null
  };

  document.addEventListener("DOMContentLoaded", () => {
    const app = createApp();
    window.Standby.app = app;
    app.init();
  });

  function createApp() {
    const state = {
      settings: loadSettings(),
      currentDesign: null,
      currentDesignApi: null,
      wakeLock: null,
      shiftTimer: null,
      renderTimer: null,
      sleepTimer: null,
      sleepActive: false,
      settingsOpen: false,
      stageTapCount: 0,
      lastTapAt: 0,
      pointerStart: null,
      lastWakeAt: Date.now(),
      toastTimer: null
    };

    const els = {
      app: document.getElementById("app"),
      stageShell: document.getElementById("stage-shell"),
      burninLayer: document.getElementById("burnin-layer"),
      host: document.getElementById("design-host"),
      rotateOverlay: document.getElementById("rotate-overlay"),
      sleepOverlay: document.getElementById("sleep-overlay"),
      settingsOverlay: document.getElementById("settings-overlay"),
      designSelect: document.getElementById("field-designId"),
      styleSelect: document.getElementById("field-styleId"),
      turnOffMinutes: document.getElementById("field-turnOffMinutes"),
      fullScreen: document.getElementById("field-fullScreen"),
      wakeLockEnabled: document.getElementById("field-wakeLockEnabled"),
      use24Hour: document.getElementById("field-use24Hour"),
      showSeconds: document.getElementById("field-showSeconds"),
      brightness: document.getElementById("field-brightness"),
      antiBurnInPixelShift: document.getElementById("field-antiBurnInPixelShift"),
      antiBurnInDrift: document.getElementById("field-antiBurnInDrift"),
      antiBurnInDimPulse: document.getElementById("field-antiBurnInDimPulse"),
      shiftAmount: document.getElementById("field-shiftAmount"),
      shiftIntervalSec: document.getElementById("field-shiftIntervalSec"),
      alarmText: document.getElementById("field-alarmText"),
      travelTimeText: document.getElementById("field-travelTimeText"),
      accentColor: document.getElementById("field-accentColor"),
      designSource: document.getElementById("design-source"),
      loadedDesigns: document.getElementById("loaded-designs"),
      dynamicFields: document.getElementById("dynamic-design-fields")
    };

    function init() {
      registry.forEach((design) => ensureDesignDefaults(state.settings, design));
      if (!registry.some((item) => item.id === state.settings.designId) && registry.length) {
        state.settings.designId = registry[0].id;
      }
      wireCommonEvents();
      buildSettingsUI();
      applyCommonUISettings();
      mountDesign(state.settings.designId);
      startRenderLoop();
      startBurnInLoop();
      restartSleepTimer();
      updateRotateOverlay();
      attemptWakeLockIfAllowed();
    }

    function handleRegistryChange() {
      registry.forEach((design) => ensureDesignDefaults(state.settings, design));
      buildSettingsUI();
      if (!registry.some((item) => item.id === state.settings.designId) && registry.length) {
        state.settings.designId = registry[0].id;
      }
      mountDesign(state.settings.designId);
    }

    function wireCommonEvents() {
      for (const node of document.querySelectorAll("[data-action='close-settings']")) {
        node.addEventListener("click", closeSettings);
      }

      els.designSelect.addEventListener("change", (event) => {
        updateSetting("designId", event.target.value, { mount: true });
      });

      els.styleSelect.addEventListener("change", (event) => {
        const design = getCurrentDesign();
        if (!design) return;
        state.settings.designStyles[design.id] = Number(event.target.value);
        saveSettings(state.settings);
        syncStyleSelect();
        renderNow();
      });

      bindInput(els.turnOffMinutes, "turnOffMinutes", "number", { after: restartSleepTimer });
      bindInput(els.fullScreen, "fullScreen", "boolean");
      bindInput(els.wakeLockEnabled, "wakeLockEnabled", "boolean", { after: attemptWakeLockIfAllowed });
      bindInput(els.use24Hour, "use24Hour", "boolean");
      bindInput(els.showSeconds, "showSeconds", "boolean");
      bindInput(els.brightness, "brightness", "number", { after: applyCommonUISettings });
      bindInput(els.antiBurnInPixelShift, "antiBurnInPixelShift", "boolean", { after: startBurnInLoop });
      bindInput(els.antiBurnInDrift, "antiBurnInDrift", "boolean", { after: startBurnInLoop });
      bindInput(els.antiBurnInDimPulse, "antiBurnInDimPulse", "boolean", { after: applyCommonUISettings });
      bindInput(els.shiftAmount, "shiftAmount", "number");
      bindInput(els.shiftIntervalSec, "shiftIntervalSec", "number", { after: startBurnInLoop });
      bindInput(els.alarmText, "alarmText", "string");
      bindInput(els.travelTimeText, "travelTimeText", "string");
      bindInput(els.accentColor, "accentColor", "string");

      document.addEventListener("visibilitychange", () => {
        if (document.visibilityState === "visible") {
          attemptWakeLockIfAllowed();
          restartSleepTimer();
          renderNow();
        }
      });

      window.addEventListener("orientationchange", updateRotateOverlay);
      window.addEventListener("resize", () => {
        updateRotateOverlay();
        renderNow();
      });

      document.addEventListener("pointerdown", onPointerDown, { passive: true });
      document.addEventListener("pointerup", onPointerUp, { passive: true });
      document.addEventListener("pointermove", onPointerMove, { passive: true });
    }

    function bindInput(element, key, type, options = {}) {
      const eventName = element.type === "range" || element.tagName === "INPUT" ? "input" : "change";
      element.addEventListener(eventName, (event) => {
        let value;
        if (type === "boolean") value = !!event.target.checked;
        else if (type === "number") value = Number(event.target.value);
        else value = event.target.value;
        updateSetting(key, value, { after: options.after });
      });
    }

    function updateSetting(key, value, options = {}) {
      state.settings[key] = value;
      if (typeof options.after === "function") {
        options.after();
      }
      if (options.mount) {
        mountDesign(value);
      } else {
        applyCommonUISettings();
        renderNow();
      }
      saveSettings(state.settings);
    }

    function buildSettingsUI() {
      const design = getCurrentDesign() || registry[0];

      els.designSelect.innerHTML = registry
        .map((item) => `<option value="${escapeHtml(item.id)}">${escapeHtml(item.name)}</option>`)
        .join("");
      els.designSelect.value = state.settings.designId;

      syncStyleSelect();

      els.turnOffMinutes.value = String(state.settings.turnOffMinutes);
      els.fullScreen.checked = !!state.settings.fullScreen;
      els.wakeLockEnabled.checked = !!state.settings.wakeLockEnabled;
      els.use24Hour.checked = !!state.settings.use24Hour;
      els.showSeconds.checked = !!state.settings.showSeconds;
      els.brightness.value = String(state.settings.brightness);
      els.antiBurnInPixelShift.checked = !!state.settings.antiBurnInPixelShift;
      els.antiBurnInDrift.checked = !!state.settings.antiBurnInDrift;
      els.antiBurnInDimPulse.checked = !!state.settings.antiBurnInDimPulse;
      els.shiftAmount.value = String(state.settings.shiftAmount);
      els.shiftIntervalSec.value = String(state.settings.shiftIntervalSec);
      els.alarmText.value = state.settings.alarmText || "";
      els.travelTimeText.value = state.settings.travelTimeText || "";
      els.accentColor.value = state.settings.accentColor || "#ff453a";

      els.loadedDesigns.innerHTML = registry.map((item) => (
        `<div class="loaded-designs-item"><strong>${escapeHtml(item.name)}</strong> · ${escapeHtml(item.id)}${item.sourcePath ? ` · ${escapeHtml(item.sourcePath.split("/").slice(-1)[0])}` : ""}</div>`
      )).join("");

      els.designSource.textContent = design && design.sourcePath
        ? `Loaded from: ${design.sourcePath.split("/").slice(-1)[0]}`
        : "Loaded from script tag.";

      renderDynamicDesignFields();
    }

    function syncStyleSelect() {
      const design = getCurrentDesign() || registry[0];
      const styles = design && design.styles && design.styles.length
        ? design.styles
        : [{ id: "default", name: "Default" }];

      if (!(design.id in state.settings.designStyles)) {
        state.settings.designStyles[design.id] = 0;
      }
      state.settings.designStyles[design.id] = clamp(
        Number(state.settings.designStyles[design.id]) || 0,
        0,
        styles.length - 1
      );

      els.styleSelect.innerHTML = styles.map((style, index) => (
        `<option value="${index}">${escapeHtml(style.name || style.id || `Style ${index + 1}`)}</option>`
      )).join("");
      els.styleSelect.value = String(state.settings.designStyles[design.id]);
    }

    function renderDynamicDesignFields() {
      dynamicFieldRefs = [];
      const design = getCurrentDesign() || registry[0];
      const schema = design && design.settingsSchema ? design.settingsSchema : [];
      els.dynamicFields.innerHTML = "";

      for (const item of schema) {
        if (!(item.key in state.settings) && Object.prototype.hasOwnProperty.call(item, "default")) {
          state.settings[item.key] = item.default;
        }

        const label = document.createElement("label");
        label.className = item.type === "checkbox" ? "field checkbox-field" : "field";

        let input;
        if (item.type === "select") {
          const wrap = document.createElement("span");
          wrap.textContent = item.label;
          label.appendChild(wrap);
          input = document.createElement("select");
          for (const option of item.options || []) {
            const node = document.createElement("option");
            node.value = option.value;
            node.textContent = option.label;
            input.appendChild(node);
          }
          input.value = String(state.settings[item.key] ?? "");
          label.appendChild(input);
        } else if (item.type === "checkbox") {
          input = document.createElement("input");
          input.type = "checkbox";
          input.checked = !!state.settings[item.key];
          label.appendChild(input);
          const wrap = document.createElement("span");
          wrap.textContent = item.label;
          label.appendChild(wrap);
        } else {
          const wrap = document.createElement("span");
          wrap.textContent = item.label;
          label.appendChild(wrap);
          input = document.createElement("input");
          input.type = item.type || "text";
          if (item.min !== undefined) input.min = item.min;
          if (item.max !== undefined) input.max = item.max;
          if (item.step !== undefined) input.step = item.step;
          input.value = String(state.settings[item.key] ?? "");
          label.appendChild(input);
        }

        const eventName = item.type === "checkbox" ? "change" : "input";
        input.addEventListener(eventName, () => {
          let value;
          if (item.type === "checkbox") value = !!input.checked;
          else if (item.type === "range" || item.type === "number") value = Number(input.value);
          else value = input.value;
          state.settings[item.key] = value;
          saveSettings(state.settings);
          renderNow();
        });

        dynamicFieldRefs.push({ key: item.key, input, type: item.type });
        els.dynamicFields.appendChild(label);
      }
    }

    function applyCommonUISettings() {
      document.documentElement.style.setProperty("--app-brightness", String(clamp(Number(state.settings.brightness) || 0.82, 0.35, 1)));
      document.documentElement.style.setProperty("--dim-pulse-factor", state.settings.antiBurnInDimPulse ? "0.985" : "1");
      if (state.settings.antiBurnInDimPulse) {
        els.burninLayer.animate(
          [
            { opacity: 0.985 },
            { opacity: 1 },
            { opacity: 0.985 }
          ],
          {
            duration: 14000,
            iterations: Infinity,
            easing: "ease-in-out"
          }
        );
      } else {
        els.burninLayer.getAnimations().forEach((animation) => animation.cancel());
        els.burninLayer.style.opacity = "1";
      }
    }

    function getCurrentDesign() {
      return registry.find((item) => item.id === state.settings.designId) || registry[0] || null;
    }

    function mountDesign(designId) {
      const design = registry.find((item) => item.id === designId) || registry[0];
      if (!design) return;

      registry.forEach((item) => ensureDesignDefaults(state.settings, item));
      state.settings.designId = design.id;

      if (state.currentDesignApi && typeof state.currentDesignApi.destroy === "function") {
        state.currentDesignApi.destroy();
      }

      els.host.innerHTML = "";
      const ctx = {
        host: els.host,
        settings: state.settings,
        utils: window.Standby.utils,
        app: publicApi()
      };
      state.currentDesign = design;
      state.currentDesignApi = design.mount(ctx) || null;
      syncStyleSelect();
      renderDynamicDesignFields();
      buildSettingsUI();
      renderNow();
      saveSettings(state.settings);
    }

    function renderNow() {
      if (!state.currentDesignApi || typeof state.currentDesignApi.render !== "function") return;
      state.currentDesignApi.render({
        now: new Date(),
        settings: state.settings,
        styleIndex: getCurrentStyleIndex(),
        app: publicApi()
      });
    }

    function startRenderLoop() {
      clearInterval(state.renderTimer);
      state.renderTimer = setInterval(renderNow, 250);
      renderNow();
    }

    function getCurrentStyleIndex() {
      const design = getCurrentDesign();
      if (!design) return 0;
      const max = (design.styles && design.styles.length ? design.styles.length : 1) - 1;
      state.settings.designStyles[design.id] = clamp(Number(state.settings.designStyles[design.id]) || 0, 0, max);
      return state.settings.designStyles[design.id];
    }

    function cycleStyle(direction) {
      const design = getCurrentDesign();
      if (!design || !design.styles || design.styles.length < 2) return;
      const count = design.styles.length;
      const current = getCurrentStyleIndex();
      const next = (current + direction + count) % count;
      state.settings.designStyles[design.id] = next;
      saveSettings(state.settings);
      syncStyleSelect();
      renderNow();
    }

    function startBurnInLoop() {
      clearInterval(state.shiftTimer);
      updateBurnInShift();
      state.shiftTimer = setInterval(updateBurnInShift, Math.max(15, Number(state.settings.shiftIntervalSec) || 90) * 1000);
    }

    function updateBurnInShift() {
      const amount = Number(state.settings.shiftAmount) || 8;
      const pixelShift = !!state.settings.antiBurnInPixelShift;
      const drift = !!state.settings.antiBurnInDrift;
      const x = pixelShift ? Math.round((Math.random() * 2 - 1) * amount) : 0;
      const y = pixelShift ? Math.round((Math.random() * 2 - 1) * amount) : 0;
      const r = drift ? ((Math.random() * 2 - 1) * 0.35).toFixed(3) : "0";
      document.documentElement.style.setProperty("--burnin-x", `${x}px`);
      document.documentElement.style.setProperty("--burnin-y", `${y}px`);
      document.documentElement.style.setProperty("--burnin-rotate", `${r}deg`);
    }

    function restartSleepTimer() {
      state.lastWakeAt = Date.now();
      if (state.sleepActive) {
        state.sleepActive = false;
        els.sleepOverlay.classList.remove("visible");
      }
      clearTimeout(state.sleepTimer);
      const minutes = Number(state.settings.turnOffMinutes) || 0;
      if (!minutes) return;
      state.sleepTimer = setTimeout(() => {
        state.sleepActive = true;
        els.sleepOverlay.classList.add("visible");
      }, minutes * 60 * 1000);
    }

    function onPointerDown(event) {
      if (state.settingsOpen) return;
      if (state.sleepActive) {
        restartSleepTimer();
      }
      state.pointerStart = { x: event.clientX, y: event.clientY, at: Date.now() };
    }

    function onPointerMove() {
      // reserved for future gesture upgrades
    }

    function onPointerUp(event) {
      const now = Date.now();

      if (state.sleepActive) {
        restartSleepTimer();
        attemptWakeLockIfAllowed();
        return;
      }

      maybeRequestFullscreen();
      attemptWakeLockIfAllowed();
      restartSleepTimer();

      if (state.settingsOpen) return;

      const isQuickTap = now - state.lastTapAt < 700;
      if (isQuickTap) state.stageTapCount += 1;
      else state.stageTapCount = 1;
      state.lastTapAt = now;

      if (state.stageTapCount >= 5) {
        state.stageTapCount = 0;
        openSettings();
        return;
      }

      if (!state.pointerStart) return;
      const dx = event.clientX - state.pointerStart.x;
      const dy = event.clientY - state.pointerStart.y;
      const duration = now - state.pointerStart.at;
      state.pointerStart = null;

      if (duration < 700 && Math.abs(dx) > 70 && Math.abs(dx) > Math.abs(dy) * 1.2) {
        cycleStyle(dx < 0 ? 1 : -1);
      }
    }

    async function attemptWakeLockIfAllowed() {
      if (!state.settings.wakeLockEnabled || !("wakeLock" in navigator) || document.visibilityState !== "visible") return;
      try {
        if (state.wakeLock) return;
        state.wakeLock = await navigator.wakeLock.request("screen");
        state.wakeLock.addEventListener("release", () => {
          state.wakeLock = null;
        });
      } catch (_) {
        state.wakeLock = null;
      }
    }

    async function maybeRequestFullscreen() {
      if (!state.settings.fullScreen) return;
      const root = document.documentElement;
      if (!root.requestFullscreen || document.fullscreenElement) return;
      try {
        await root.requestFullscreen();
      } catch (_) {
        // iPhone Safari often ignores this; graceful fallback only.
      }
    }

    function updateRotateOverlay() {
      const landscape = window.innerWidth > window.innerHeight;
      els.rotateOverlay.classList.toggle("visible", !landscape);
    }

    function openSettings() {
      state.settingsOpen = true;
      els.settingsOverlay.classList.remove("hidden");
      buildSettingsUI();
    }

    function closeSettings() {
      state.settingsOpen = false;
      els.settingsOverlay.classList.add("hidden");
      saveSettings(state.settings);
      renderNow();
    }

    function showToast(text) {
      let toast = document.querySelector(".transient-toast");
      if (!toast) {
        toast = document.createElement("div");
        toast.className = "transient-toast";
        document.body.appendChild(toast);
      }
      toast.textContent = text;
      toast.classList.add("visible");
      clearTimeout(state.toastTimer);
      state.toastTimer = setTimeout(() => toast.classList.remove("visible"), 1050);
    }

    function publicApi() {
      return {
        getSettings: () => state.settings,
        setSetting(key, value) {
          state.settings[key] = value;
          saveSettings(state.settings);
          buildSettingsUI();
          renderNow();
        },
        setStyleIndex(index) {
          const design = getCurrentDesign();
          if (!design) return;
          const max = (design.styles && design.styles.length ? design.styles.length : 1) - 1;
          state.settings.designStyles[design.id] = clamp(index, 0, max);
          syncStyleSelect();
          saveSettings(state.settings);
          renderNow();
        },
        getStyleIndex: getCurrentStyleIndex,
        closeSettings,
        openSettings,
        requestWakeLock: attemptWakeLockIfAllowed,
        restartSleepTimer,
        showToast
      };
    }

    return {
      init,
      handleRegistryChange
    };
  }

  function escapeHtml(value) {
    return String(value)
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;");
  }
})();
