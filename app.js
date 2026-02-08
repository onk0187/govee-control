const API_BASE = "https://developer-api.govee.com/v1";
const CONFIG = {
  apiKey: window.GOVEE_API_KEY || "",
};

const elements = {
  refreshBtn: document.getElementById("refreshBtn"),
  allOffBtn: document.getElementById("allOffBtn"),
  statusNotice: document.getElementById("statusNotice"),
  deviceGroups: document.getElementById("deviceGroups"),
  deviceCount: document.getElementById("deviceCount"),
};

const state = {
  apiKey: "",
  devices: [],
  loading: false,
};

function loadState() {
  const storedKey = localStorage.getItem("goveeApiKey") || "";
  state.apiKey = CONFIG.apiKey || storedKey;
}

function setStatus(message, tone = "neutral") {
  elements.statusNotice.textContent = message;
  elements.statusNotice.dataset.tone = tone;
}

function getBaseUrl() {
  return API_BASE;
}

async function apiRequest(path, options = {}) {
  if (!state.apiKey) {
    throw new Error("Missing API key.");
  }
  const response = await fetch(`${getBaseUrl()}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      "Govee-API-Key": state.apiKey,
      ...(options.headers || {}),
    },
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Request failed (${response.status}). ${text || ""}`.trim());
  }

  const data = await response.json();
  if (data && data.code && data.code !== 200) {
    throw new Error(data.message || "Govee API returned an error.");
  }
  return data;
}

function normalizeDevices(payload) {
  if (!payload) return [];
  const devices = payload.data && payload.data.devices ? payload.data.devices : [];
  return devices.map((device) => ({
    ...device,
    supportCmds: device.supportCmds || [],
    properties: device.properties || {},
  }));
}

function getDeviceGroup(device) {
  return device.model || "Unknown Model";
}

function groupDevices(devices) {
  return devices.reduce((acc, device) => {
    const group = getDeviceGroup(device);
    if (!acc[group]) acc[group] = [];
    acc[group].push(device);
    return acc;
  }, {});
}

function deviceSupports(device, command) {
  return device.controllable !== false && device.supportCmds.includes(command);
}

function getDeviceKind(device) {
  const name = `${device.deviceName || ""} ${device.model || ""}`.toLowerCase();
  if (name.includes("strip") || name.includes("glide")) return "strip";
  if (name.includes("panel") || name.includes("hex") || name.includes("triangle")) {
    return "panel";
  }
  if (name.includes("bulb")) return "bulb";
  if (name.includes("lamp") || name.includes("floor")) return "lamp";
  if (name.includes("plug")) return "plug";
  return "light";
}

function isLightKind(kind) {
  return ["strip", "panel", "bulb", "lamp", "light"].includes(kind);
}

function getDeviceIcon(kind) {
  switch (kind) {
    case "strip":
      return "<svg width=\"22\" height=\"22\" viewBox=\"0 0 24 24\" fill=\"none\" xmlns=\"http://www.w3.org/2000/svg\"><path d=\"M4 7h16M4 12h16M4 17h10\" stroke=\"currentColor\" stroke-width=\"1.6\" stroke-linecap=\"round\"/></svg>";
    case "panel":
      return "<svg width=\"22\" height=\"22\" viewBox=\"0 0 24 24\" fill=\"none\" xmlns=\"http://www.w3.org/2000/svg\"><path d=\"M5 7l7-4 7 4v10l-7 4-7-4V7z\" stroke=\"currentColor\" stroke-width=\"1.5\" stroke-linejoin=\"round\"/></svg>";
    case "bulb":
      return "<svg width=\"22\" height=\"22\" viewBox=\"0 0 24 24\" fill=\"none\" xmlns=\"http://www.w3.org/2000/svg\"><path d=\"M12 3a6 6 0 0 1 4 10c-1 1-1.5 2-1.5 3.5h-5C9.5 15 9 14 8 13a6 6 0 0 1 4-10z\" stroke=\"currentColor\" stroke-width=\"1.5\"/><path d=\"M9 20h6\" stroke=\"currentColor\" stroke-width=\"1.5\" stroke-linecap=\"round\"/></svg>";
    case "lamp":
      return "<svg width=\"22\" height=\"22\" viewBox=\"0 0 24 24\" fill=\"none\" xmlns=\"http://www.w3.org/2000/svg\"><path d=\"M7 9h10l-2 5H9L7 9z\" stroke=\"currentColor\" stroke-width=\"1.5\"/><path d=\"M12 14v6\" stroke=\"currentColor\" stroke-width=\"1.5\" stroke-linecap=\"round\"/></svg>";
    case "plug":
      return "<svg width=\"22\" height=\"22\" viewBox=\"0 0 24 24\" fill=\"none\" xmlns=\"http://www.w3.org/2000/svg\"><path d=\"M8 3v6M16 3v6M7 9h10v4a5 5 0 0 1-10 0V9z\" stroke=\"currentColor\" stroke-width=\"1.5\" stroke-linecap=\"round\"/></svg>";
    default:
      return "<svg width=\"22\" height=\"22\" viewBox=\"0 0 24 24\" fill=\"none\" xmlns=\"http://www.w3.org/2000/svg\"><path d=\"M6 12a6 6 0 1 1 12 0\" stroke=\"currentColor\" stroke-width=\"1.5\"/><path d=\"M9 20h6\" stroke=\"currentColor\" stroke-width=\"1.5\" stroke-linecap=\"round\"/></svg>";
  }
}

function createControlRow(label, control) {
  const row = document.createElement("div");
  row.className = "control-row";
  const name = document.createElement("span");
  name.textContent = label;
  row.append(name, control);
  return row;
}

function setRangeVisual(range) {
  const min = Number(range.min || 0);
  const max = Number(range.max || 100);
  const value = Number(range.value || 0);
  const percent = ((value - min) / (max - min)) * 100;
  range.style.setProperty("--value", `${percent}%`);
}

function createPowerToggle({ initialOn = false, onToggle }) {
  const button = document.createElement("button");
  button.type = "button";
  button.className = "power-toggle";
  button.setAttribute("aria-pressed", String(initialOn));
  button.dataset.state = initialOn ? "on" : "off";
  button.innerHTML = "<span></span>";
  button.addEventListener("click", () => {
    const isOn = button.dataset.state === "on";
    const nextState = isOn ? "off" : "on";
    button.dataset.state = nextState;
    button.setAttribute("aria-pressed", String(nextState === "on"));
    if (onToggle) onToggle(nextState);
  });
  return button;
}

async function loadDevices() {
  if (!state.apiKey) {
    setStatus("Missing API key. Set it in config.js or localStorage.", "warn");
    return;
  }

  state.loading = true;
  setStatus("Loading devices...", "neutral");
  elements.refreshBtn.disabled = true;
  try {
    const payload = await apiRequest("/devices");
    state.devices = normalizeDevices(payload);
    setStatus(`Connected. ${state.devices.length} devices found.`, "success");
    renderDevices();
  } catch (error) {
    setStatus(error.message || "Failed to load devices.", "error");
  } finally {
    state.loading = false;
    elements.refreshBtn.disabled = false;
  }
}

async function sendCommand(device, name, value) {
  try {
    await apiRequest("/devices/control", {
      method: "PUT",
      body: JSON.stringify({
        device: device.device,
        model: device.model,
        cmd: { name, value },
      }),
    });
    setStatus(`${device.deviceName}: ${name} updated.`, "success");
  } catch (error) {
    setStatus(error.message || "Command failed.", "error");
  }
}

function renderDevices() {
  elements.deviceGroups.innerHTML = "";
  elements.deviceCount.textContent = `${state.devices.length} devices`;

  if (!state.devices.length) {
    const empty = document.createElement("div");
    empty.className = "muted";
    empty.textContent = "No devices loaded yet.";
    elements.deviceGroups.appendChild(empty);
    return;
  }

  const grouped = groupDevices(state.devices);
  Object.entries(grouped).forEach(([groupName, devices]) => {
    const group = document.createElement("div");
    group.className = "group";

    const head = document.createElement("div");
    head.className = "group__head";

    const title = document.createElement("div");
    title.className = "group__title";
    title.textContent = `${groupName} (${devices.length})`;

    const controls = document.createElement("div");
    controls.className = "group__controls";
    const groupToggle = createPowerToggle({
      initialOn: false,
      onToggle: (state) => {
        devices.forEach((device) => {
          if (deviceSupports(device, "turn")) {
            sendCommand(device, "turn", state);
          }
        });
      },
    });
    controls.appendChild(groupToggle);
    head.append(title, controls);

    const grid = document.createElement("div");
    grid.className = "device-grid";

    devices.forEach((device) => {
      const card = document.createElement("div");
      card.className = "device-card";

      const info = document.createElement("div");
      info.className = "device-card__info";

      const icon = document.createElement("div");
      icon.className = "device-icon";
      const kind = getDeviceKind(device);
      icon.innerHTML = getDeviceIcon(kind);

      const meta = document.createElement("div");
      const name = document.createElement("strong");
      name.textContent = device.deviceName || "Unnamed device";
      const sub = document.createElement("span");
      sub.textContent = `${device.model || "model"} - ${device.device}`;
      sub.className = "device-meta";
      const infoToggle = document.createElement("button");
      infoToggle.type = "button";
      infoToggle.className = "info-toggle";
      infoToggle.setAttribute("aria-expanded", "false");
      infoToggle.textContent = "i";
      infoToggle.addEventListener("click", () => {
        const expanded = infoToggle.getAttribute("aria-expanded") === "true";
        infoToggle.setAttribute("aria-expanded", String(!expanded));
        card.classList.toggle("show-meta", !expanded);
      });
      const metaRow = document.createElement("div");
      metaRow.className = "device-meta__row";
      metaRow.append(name, infoToggle);
      meta.append(metaRow, sub);

      info.append(icon, meta);

      const controlsWrap = document.createElement("div");
      controlsWrap.className = "device-card__controls";
      card.style.setProperty("--accent-color", "#d46a45");

      const canTurn = deviceSupports(device, "turn");
      if (canTurn || isLightKind(kind)) {
        const powerToggle = createPowerToggle({
          initialOn: false,
          onToggle: (state) => {
            card.classList.toggle("is-on", state === "on");
            if (canTurn) sendCommand(device, "turn", state);
          },
        });
        powerToggle.disabled = !canTurn;
        controlsWrap.appendChild(powerToggle);
      }

      if (deviceSupports(device, "brightness")) {
        const slider = document.createElement("input");
        slider.type = "range";
        slider.min = "0";
        slider.max = "100";
        slider.value = "50";
        slider.addEventListener("input", () => setRangeVisual(slider));
        slider.addEventListener("change", () =>
          sendCommand(device, "brightness", Number(slider.value))
        );
        setRangeVisual(slider);
        controlsWrap.appendChild(createControlRow("Brightness", slider));
      }

      if (deviceSupports(device, "color")) {
        const color = document.createElement("input");
        color.type = "color";
        color.value = "#ff7a4a";
        color.addEventListener("change", () => {
          const rgb = hexToRgb(color.value);
          if (!rgb) return;
          card.style.setProperty("--glow-color", color.value);
          card.style.setProperty("--accent-color", color.value);
          sendCommand(device, "color", rgb);
        });
        card.style.setProperty("--glow-color", color.value);
        card.style.setProperty("--accent-color", color.value);
        controlsWrap.appendChild(createControlRow("Color", color));
      }

      if (deviceSupports(device, "colorTem")) {
        const range = device.properties?.colorTem?.range || { min: 2000, max: 9000 };
        const temp = document.createElement("input");
        temp.type = "range";
        temp.min = String(range.min || 2000);
        temp.max = String(range.max || 9000);
        temp.value = String(Math.round((Number(temp.min) + Number(temp.max)) / 2));
        temp.addEventListener("input", () => setRangeVisual(temp));
        temp.addEventListener("change", () =>
          sendCommand(device, "colorTem", Number(temp.value))
        );
        setRangeVisual(temp);
        controlsWrap.appendChild(createControlRow("Temp", temp));
      }

      const tags = document.createElement("div");
      tags.className = "tag-list";
      device.supportCmds.forEach((cmd) => {
        const tag = document.createElement("span");
        tag.className = "tag";
        tag.textContent = cmd;
        tags.appendChild(tag);
      });

      controlsWrap.append(tags);

      card.append(info, controlsWrap);
      grid.appendChild(card);
    });

    group.append(head, grid);
    elements.deviceGroups.appendChild(group);
  });
}

function hexToRgb(hex) {
  const raw = hex.replace("#", "");
  if (raw.length !== 6) return null;
  const bigint = parseInt(raw, 16);
  return {
    r: (bigint >> 16) & 255,
    g: (bigint >> 8) & 255,
    b: bigint & 255,
  };
}

function wireEvents() {
  elements.refreshBtn.addEventListener("click", () => loadDevices());

  elements.allOffBtn.addEventListener("click", () => {
    state.devices.forEach((device) => {
      if (deviceSupports(device, "turn")) {
        sendCommand(device, "turn", "off");
      }
    });
  });
}

function hydrateUI() {
  renderDevices();
}

loadState();
wireEvents();
hydrateUI();
loadDevices();
