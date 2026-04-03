(function () {
  const MQTT_WS_URL = "wss://mqtt.iammeter.com:8084/mqtt";
  const DEVICE_SN = "CB0A0CFB";
  const MQTT_USERNAME = "lewei";
  const MQTT_PASSWORD = "123456";
  const MQTT_TOPIC = `device/${DEVICE_SN}/realtime`;
  const PHASE_NAMES = ["A", "B", "C"];
  const ACTIVE_FIELDS = [
    { key: "voltage", label: "Voltage", unit: "V", index: 0, digits: 1 },
    { key: "current", label: "Current", unit: "A", index: 1, digits: 3 },
    { key: "activePower", label: "Active Power", unit: "W", index: 2, digits: 1 },
    { key: "importEnergy", label: "Import Energy", unit: "kWh", index: 3, digits: 3 },
    { key: "exportEnergy", label: "Export Energy", unit: "kWh", index: 4, digits: 3 },
    { key: "frequency", label: "Frequency", unit: "Hz", index: 5, digits: 2 },
    { key: "powerFactor", label: "PF", unit: "", index: 6, digits: 3 },
  ];
  const REACTIVE_FIELDS = [
    { key: "reactivePower", label: "Reactive Power", unit: "kvar", index: 0, digits: 1 },
    { key: "inductiveEnergy", label: "Inductive Energy", unit: "kvarh", index: 1, digits: 3 },
    { key: "capacitiveEnergy", label: "Capacitive Energy", unit: "kvarh", index: 2, digits: 3 },
  ];

  function randomClientId() {
    return `web_${Math.floor(Math.random() * 1e10)}`;
  }

  function clamp(value, min, max) {
    return Math.min(max, Math.max(min, value));
  }

  function formatValue(value, digits) {
    if (typeof value !== "number" || Number.isNaN(value)) {
      return "--";
    }
    return value.toFixed(digits);
  }

  function formatWithUnit(value, digits, unit) {
    const formatted = formatValue(value, digits);
    return `${formatted}${formatted === "--" || !unit ? "" : ` ${unit}`}`;
  }

  function formatPhaseAngle(powerFactor, reactivePower) {
    if (
      typeof powerFactor !== "number" ||
      Number.isNaN(powerFactor) ||
      typeof reactivePower !== "number" ||
      Number.isNaN(reactivePower)
    ) {
      return "--";
    }

    const magnitude = clamp(Math.abs(powerFactor), 0, 1);
    const angle = (Math.acos(magnitude) * 180) / Math.PI;
    const sign = reactivePower < 0 ? -1 : 1;
    const signedAngle = angle * sign;
    return `${signedAngle.toFixed(1)}°`;
  }

  function formatPowerFactor(powerFactor) {
    if (typeof powerFactor !== "number" || Number.isNaN(powerFactor)) {
      return "--";
    }
    return powerFactor.toFixed(3);
  }

  function formatReactivePower(value) {
    if (typeof value !== "number" || Number.isNaN(value)) {
      return "--";
    }
    return `${value.toFixed(1)} kvar`;
  }

  function createStyles() {
    if (document.getElementById("iammeter-realtime-styles")) {
      return;
    }

    const style = document.createElement("style");
    style.id = "iammeter-realtime-styles";
    style.textContent = `
      .iammeter-app {
        color: #d6dce2;
        background: linear-gradient(180deg, #11161c 0%, #0b0f13 100%);
        border: 1px solid #2c3640;
        border-radius: 18px;
        padding: 16px;
        box-shadow: 0 18px 40px rgba(0, 0, 0, 0.28);
      }
      .iammeter-header {
        display: flex;
        align-items: flex-start;
        justify-content: space-between;
        gap: 12px;
        margin-bottom: 14px;
      }
      .iammeter-title-wrap {
        min-width: 0;
      }
      .iammeter-title {
        margin: 0;
        font-size: 20px;
        font-weight: 700;
        letter-spacing: 0.08em;
        text-transform: uppercase;
      }
      .iammeter-tagline {
        margin: 6px 0 0;
        color: #8b97a3;
        font-size: 12px;
        line-height: 1.4;
      }
      .iammeter-tagline a {
        color: #8fc7ff;
        text-decoration: none;
      }
      .iammeter-tagline a:hover {
        text-decoration: underline;
      }
      .iammeter-status {
        display: inline-flex;
        align-items: center;
        gap: 8px;
        padding: 7px 10px;
        min-height: 34px;
        border: 1px solid #2d3944;
        border-radius: 8px;
        background: #10161c;
        color: #c7d1da;
        font-size: 11px;
        white-space: nowrap;
        letter-spacing: 0.04em;
        text-transform: uppercase;
      }
      .iammeter-status-dot {
        width: 8px;
        height: 8px;
        border-radius: 50%;
        background: #d89222;
        box-shadow: 0 0 0 4px rgba(216, 146, 34, 0.12);
      }
      .iammeter-status.connected .iammeter-status-dot {
        background: #30c26e;
        box-shadow: 0 0 0 4px rgba(48, 194, 110, 0.12);
      }
      .iammeter-status.error .iammeter-status-dot {
        background: #e15959;
        box-shadow: 0 0 0 4px rgba(225, 89, 89, 0.12);
      }
      .iammeter-toolbar {
        display: flex;
        justify-content: flex-end;
        margin: 0 0 10px;
      }
      .iammeter-tabs {
        display: inline-flex;
        gap: 8px;
      }
      .iammeter-tab {
        appearance: none;
        border: 1px solid #2b3640;
        border-radius: 9px;
        padding: 8px 12px;
        background: #0f1419;
        color: #8f9aa6;
        font-size: 11px;
        font-weight: 600;
        cursor: pointer;
        text-transform: uppercase;
        letter-spacing: 0.06em;
      }
      .iammeter-tab.is-active {
        background: #1b252e;
        color: #f2f5f7;
      }
      .iammeter-panel {
        display: none;
      }
      .iammeter-panel.is-active {
        display: block;
      }
      .iammeter-grid {
        display: grid;
        gap: 10px;
      }
      .iammeter-grid.primary {
        grid-template-columns: repeat(3, minmax(0, 1fr));
      }
      .iammeter-grid.details {
        grid-template-columns: repeat(2, minmax(0, 1fr));
      }
      .iammeter-card {
        background: linear-gradient(180deg, #161d24 0%, #12181e 100%);
        border: 1px solid #2a333d;
        border-radius: 12px;
        overflow: hidden;
      }
      .iammeter-card-head {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 10px;
        padding: 10px 12px 8px;
        border-bottom: 1px solid #232d36;
      }
      .iammeter-card-title {
        margin: 0;
        font-size: 14px;
        font-weight: 700;
        letter-spacing: 0.06em;
      }
      .iammeter-card-meta {
        color: #6e7c89;
        font-size: 11px;
        text-transform: uppercase;
        letter-spacing: 0.08em;
      }
      .iammeter-primary {
        display: grid;
        grid-template-columns: repeat(2, minmax(0, 1fr));
        gap: 8px;
        padding: 10px;
      }
      .iammeter-primary-block {
        padding: 10px 10px 9px;
        border: 1px solid #2a333c;
        border-radius: 10px;
        background: linear-gradient(180deg, #0f151b 0%, #0c1116 100%);
        min-height: 74px;
      }
      .iammeter-primary-label {
        display: block;
        margin-bottom: 6px;
        color: #768290;
        font-size: 10px;
        text-transform: uppercase;
        letter-spacing: 0.1em;
      }
      .iammeter-primary-top {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 8px;
      }
      .iammeter-primary-value {
        display: block;
        color: #f5f7f8;
        font-size: clamp(19px, 3vw, 24px);
        line-height: 1.05;
        font-weight: 700;
        font-variant-numeric: tabular-nums;
      }
      .iammeter-primary-value.reactive {
        color: #75b8ff;
      }
      .iammeter-primary-value.pf {
        color: #9dd18b;
      }
      .iammeter-primary-value.angle {
        color: #f2c879;
      }
      .iammeter-primary-icon {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        min-width: 26px;
        height: 22px;
        padding: 0 6px;
        border: 1px solid #31404d;
        border-radius: 999px;
        color: #93a6b8;
        font-size: 10px;
        line-height: 1;
        letter-spacing: 0.08em;
        text-transform: uppercase;
      }
      .iammeter-primary-icon[data-mode="inductive"] {
        color: #73c0ff;
        border-color: #2f5f82;
        background: rgba(41, 90, 122, 0.22);
      }
      .iammeter-primary-icon[data-mode="capacitive"] {
        color: #f2c879;
        border-color: #7a6233;
        background: rgba(107, 82, 26, 0.22);
      }
      .iammeter-primary-icon[data-mode="unknown"] {
        opacity: 0.45;
      }
      .iammeter-footnote {
        margin-top: 10px;
        color: #697684;
        font-size: 11px;
        letter-spacing: 0.04em;
      }
      .iammeter-detail-list {
        padding: 6px 12px 12px;
      }
      .iammeter-detail {
        display: flex;
        justify-content: space-between;
        gap: 10px;
        padding: 9px 0;
        border-bottom: 1px solid #202931;
        font-size: 12px;
      }
      .iammeter-detail:last-child {
        border-bottom: 0;
      }
      .iammeter-detail-label {
        color: #7d8996;
      }
      .iammeter-detail-value {
        color: #f0f3f5;
        font-weight: 600;
        text-align: right;
        font-variant-numeric: tabular-nums;
      }
      @media (max-width: 900px) {
        .iammeter-grid.primary,
        .iammeter-grid.details {
          grid-template-columns: 1fr;
        }
      }
      @media (max-width: 640px) {
        .iammeter-app {
          padding: 12px;
          border-radius: 14px;
        }
        .iammeter-header {
          flex-direction: column;
          align-items: stretch;
        }
        .iammeter-title {
          font-size: 18px;
        }
        .iammeter-tagline {
          font-size: 11px;
        }
        .iammeter-status {
          white-space: normal;
        }
        .iammeter-toolbar {
          justify-content: stretch;
        }
        .iammeter-tabs {
          display: grid;
          grid-template-columns: 1fr 1fr;
          width: 100%;
        }
        .iammeter-tab {
          width: 100%;
          padding: 11px 10px;
        }
        .iammeter-card-head {
          padding: 12px 12px 10px;
        }
        .iammeter-primary {
          grid-template-columns: 1fr;
        }
        .iammeter-detail-list {
          padding: 6px 12px 12px;
        }
      }
    `;
    document.head.appendChild(style);
  }

  function createPrimaryBlock(label, key) {
    const block = document.createElement("div");
    block.className = "iammeter-primary-block";

    const title = document.createElement("span");
    title.className = "iammeter-primary-label";
    title.textContent = label;

    const top = document.createElement("div");
    top.className = "iammeter-primary-top";

    const value = document.createElement("span");
    value.className = `iammeter-primary-value ${
      key === "reactivePower"
        ? "reactive"
        : key === "powerFactor"
          ? "pf"
          : key === "phaseAngle"
            ? "angle"
            : ""
    }`;
    value.dataset.primaryField = key;
    value.textContent = "--";

    top.appendChild(value);

    if (key === "reactivePower") {
      const icon = document.createElement("span");
      icon.className = "iammeter-primary-icon";
      icon.dataset.iconField = key;
      icon.dataset.mode = "unknown";
      icon.textContent = "--";
      top.appendChild(icon);
    }

    block.appendChild(title);
    block.appendChild(top);
    return block;
  }

  function createDetailRow(label, group, key) {
    const row = document.createElement("div");
    row.className = "iammeter-detail";

    const labelNode = document.createElement("span");
    labelNode.className = "iammeter-detail-label";
    labelNode.textContent = label;

    const valueNode = document.createElement("span");
    valueNode.className = "iammeter-detail-value";
    valueNode.dataset.detailField = key;
    valueNode.dataset.group = group;
    valueNode.textContent = "--";

    row.appendChild(labelNode);
    row.appendChild(valueNode);
    return row;
  }

  function createOverviewCard(phaseKey, title) {
    const card = document.createElement("section");
    card.className = "iammeter-card";
    card.dataset.phase = phaseKey;

    const head = document.createElement("div");
    head.className = "iammeter-card-head";

    const titleNode = document.createElement("h3");
    titleNode.className = "iammeter-card-title";
    titleNode.textContent = title;

    const meta = document.createElement("span");
    meta.className = "iammeter-card-meta";
    meta.textContent = "Overview";

    head.appendChild(titleNode);
    head.appendChild(meta);
    card.appendChild(head);

    const primary = document.createElement("div");
    primary.className = "iammeter-primary";
    primary.appendChild(createPrimaryBlock("Active Power", "activePower"));
    primary.appendChild(createPrimaryBlock("Reactive Power", "reactivePower"));
    primary.appendChild(createPrimaryBlock("PF", "powerFactor"));
    primary.appendChild(createPrimaryBlock("Phase Angle", "phaseAngle"));
    card.appendChild(primary);

    return card;
  }

  function createDetailsCard(phaseKey, title) {
    const card = document.createElement("section");
    card.className = "iammeter-card";
    card.dataset.phase = phaseKey;

    const head = document.createElement("div");
    head.className = "iammeter-card-head";

    const titleNode = document.createElement("h3");
    titleNode.className = "iammeter-card-title";
    titleNode.textContent = title;

    const meta = document.createElement("span");
    meta.className = "iammeter-card-meta";
    meta.textContent = "Details";

    head.appendChild(titleNode);
    head.appendChild(meta);
    card.appendChild(head);

    const details = document.createElement("div");
    details.className = "iammeter-detail-list";
    details.appendChild(createDetailRow("Voltage", "active", "voltage"));
    details.appendChild(createDetailRow("Current", "active", "current"));
    details.appendChild(createDetailRow("Frequency", "active", "frequency"));
    details.appendChild(createDetailRow("Import Energy", "active", "importEnergy"));
    details.appendChild(createDetailRow("Export Energy", "active", "exportEnergy"));
    details.appendChild(createDetailRow("Phase Angle", "derived", "phaseAngle"));
    details.appendChild(createDetailRow("Reactive Mode", "derived", "reactiveMode"));
    details.appendChild(createDetailRow("Inductive Energy", "reactive", "inductiveEnergy"));
    details.appendChild(createDetailRow("Capacitive Energy", "reactive", "capacitiveEnergy"));
    card.appendChild(details);

    return card;
  }

  function setPanel(container, target) {
    const tabs = container.querySelectorAll("[data-tab-target]");
    const panels = container.querySelectorAll("[data-panel]");

    tabs.forEach((tab) => {
      tab.classList.toggle("is-active", tab.dataset.tabTarget === target);
    });
    panels.forEach((panel) => {
      panel.classList.toggle("is-active", panel.dataset.panel === target);
    });
  }

  function renderSkeleton(container) {
    createStyles();

    container.innerHTML = "";
    container.className = "iammeter-app";
    container.innerHTML = `
      <div class="iammeter-header">
        <div class="iammeter-title-wrap">
          <h2 class="iammeter-title">Online PF Analyzer</h2>
          <p class="iammeter-tagline">
            Test view using an IAMMETER three-phase meter.
            <a href="https://www.iammeter.com/blog/reactive-power-kvar-kvarh-pf" target="_blank" rel="noreferrer">Reactive power notes</a>
          </p>
        </div>
        <div class="iammeter-status" data-role="status">
          <span class="iammeter-status-dot"></span>
          <span data-role="status-text">Connecting</span>
        </div>
      </div>
      <div class="iammeter-toolbar">
        <div class="iammeter-tabs">
          <button class="iammeter-tab is-active" type="button" data-tab-target="primary">Overview</button>
          <button class="iammeter-tab" type="button" data-tab-target="details">Details</button>
        </div>
      </div>
      <div class="iammeter-panel is-active" data-panel="primary">
        <div class="iammeter-grid primary" data-role="primary-grid"></div>
      </div>
      <div class="iammeter-panel" data-panel="details">
        <div class="iammeter-grid details" data-role="details-grid"></div>
      </div>
      <div class="iammeter-footnote" data-role="update-time">Last update --</div>
    `;

    const primaryGrid = container.querySelector('[data-role="primary-grid"]');
    const detailsGrid = container.querySelector('[data-role="details-grid"]');

    PHASE_NAMES.forEach((phaseName) => {
      primaryGrid.appendChild(createOverviewCard(phaseName, `Phase ${phaseName}`));
      detailsGrid.appendChild(createDetailsCard(phaseName, `Phase ${phaseName}`));
    });

    container.querySelectorAll("[data-tab-target]").forEach((button) => {
      button.addEventListener("click", function () {
        setPanel(container, button.dataset.tabTarget);
      });
    });
  }

  function updateStatus(container, text, statusClass) {
    const status = container.querySelector('[data-role="status"]');
    const statusText = container.querySelector('[data-role="status-text"]');
    status.classList.remove("connected", "error");
    if (statusClass) {
      status.classList.add(statusClass);
    }
    statusText.textContent = text;
  }

  function updatePrimaryValue(container, phaseKey, key, value) {
    container
      .querySelectorAll(`[data-phase="${phaseKey}"] [data-primary-field="${key}"]`)
      .forEach((node) => {
        node.textContent = value;
      });
  }

  function updateDetailValue(container, phaseKey, group, key, value) {
    container
      .querySelectorAll(
        `[data-phase="${phaseKey}"] [data-detail-field="${key}"][data-group="${group}"]`
      )
      .forEach((node) => {
        node.textContent = value;
      });
  }

  function updateReactiveIcon(container, phaseKey, reactivePower) {
    const mode =
      typeof reactivePower !== "number" || Number.isNaN(reactivePower)
        ? "unknown"
        : reactivePower >= 0
          ? "inductive"
          : "capacitive";
    const text = mode === "inductive" ? "L" : mode === "capacitive" ? "C" : "--";

    container
      .querySelectorAll(`[data-phase="${phaseKey}"] [data-icon-field="reactivePower"]`)
      .forEach((node) => {
        node.dataset.mode = mode;
        node.textContent = text;
        node.title = mode;
      });
  }

  function updateActiveFields(container, phaseKey, values) {
    if (!Array.isArray(values)) {
      return;
    }

    ACTIVE_FIELDS.forEach((field) => {
      const text =
        field.key === "powerFactor"
          ? formatPowerFactor(values[field.index])
          : formatWithUnit(values[field.index], field.digits, field.unit);
      if (field.key === "activePower") {
        updatePrimaryValue(container, phaseKey, field.key, text);
      } else if (field.key === "powerFactor") {
        updatePrimaryValue(container, phaseKey, field.key, text);
      } else {
        updateDetailValue(container, phaseKey, "active", field.key, text);
      }
    });
  }

  function updateReactiveFields(container, phaseKey, values) {
    if (!Array.isArray(values)) {
      return;
    }

    REACTIVE_FIELDS.forEach((field) => {
      const text =
        field.key === "reactivePower"
          ? formatReactivePower(values[field.index])
          : formatWithUnit(values[field.index], field.digits, field.unit);
      if (field.key === "reactivePower") {
        updatePrimaryValue(container, phaseKey, field.key, text);
        updateReactiveIcon(container, phaseKey, values[field.index]);
        updateDetailValue(
          container,
          phaseKey,
          "derived",
          "reactiveMode",
          values[field.index] >= 0 ? "Inductive" : "Capacitive"
        );
      } else {
        updateDetailValue(container, phaseKey, "reactive", field.key, text);
      }
    });
  }

  function updatePhaseAngle(container, phaseKey, activeValues, reactiveValues) {
    const powerFactor = Array.isArray(activeValues) ? activeValues[6] : undefined;
    const reactivePower = Array.isArray(reactiveValues) ? reactiveValues[0] : undefined;
    const angleText = formatPhaseAngle(powerFactor, reactivePower);
    updatePrimaryValue(container, phaseKey, "phaseAngle", angleText);
    updateDetailValue(
      container,
      phaseKey,
      "derived",
      "phaseAngle",
      angleText
    );
  }

  function updateFootnote(container, payload) {
    const footnote = container.querySelector('[data-role="update-time"]');
    const timestamp = new Date().toLocaleString();
    footnote.textContent = `Last update ${timestamp}`;
  }

  function handleRealtimePayload(container, payload) {
    if (!payload || !Array.isArray(payload.Datas)) {
      return;
    }

    const phases = payload.Datas.slice(0, 3);
    const reactivePhases =
      payload.EA && Array.isArray(payload.EA.Reactive)
        ? payload.EA.Reactive.slice(0, 3)
        : [];

    phases.forEach((phaseValues, index) => {
      const phaseKey = PHASE_NAMES[index];
      const reactiveValues = reactivePhases[index];
      updateActiveFields(container, phaseKey, phaseValues);
      updateReactiveFields(container, phaseKey, reactiveValues);
      updatePhaseAngle(container, phaseKey, phaseValues, reactiveValues);
    });

    updateFootnote(container, payload);
  }

  function connectRealtime(container) {
    if (!window.mqtt || typeof window.mqtt.connect !== "function") {
      updateStatus(container, "mqtt.js not loaded", "error");
      throw new Error("mqtt.js was not found on window.mqtt");
    }

    const client = window.mqtt.connect(MQTT_WS_URL, {
      clean: true,
      connectTimeout: 10000,
      reconnectPeriod: 3000,
      username: MQTT_USERNAME,
      password: MQTT_PASSWORD,
      clientId: randomClientId(),
    });

    client.on("connect", function () {
      updateStatus(container, "Connected", "connected");
      client.subscribe(MQTT_TOPIC, function (error) {
        if (error) {
          updateStatus(container, "Subscribe failed", "error");
          return;
        }
        const footnote = container.querySelector('[data-role="update-time"]');
        footnote.textContent = "Last update waiting";
      });
    });

    client.on("reconnect", function () {
      updateStatus(container, "Reconnecting");
    });

    client.on("error", function (error) {
      updateStatus(container, `Error: ${error.message}`, "error");
    });

    client.on("message", function (topic, message) {
      if (topic !== MQTT_TOPIC) {
        return;
      }

      try {
        const payload = JSON.parse(message.toString());
        handleRealtimePayload(container, payload);
      } catch (error) {
        updateStatus(container, `Parse error: ${error.message}`, "error");
      }
    });

    return client;
  }

  function mount(target) {
    const container =
      typeof target === "string" ? document.querySelector(target) : target;

    if (!container) {
      throw new Error("IAMMETER mount target was not found");
    }

    renderSkeleton(container);
    const client = connectRealtime(container);
    return {
      destroy: function () {
        if (client) {
          client.end(true);
        }
      },
    };
  }

  window.IAMMETERRealtimeApp = {
    mount: mount,
  };

  document.addEventListener("DOMContentLoaded", function () {
    const autoMountNode = document.querySelector("[data-iammeter-app]");
    if (autoMountNode) {
      mount(autoMountNode);
    }
  });
})();
