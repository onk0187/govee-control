// F1 Car Night Live Wallpaper Animation
const canvas = document.getElementById('wallpaper');
const ctx = canvas.getContext('2d');

function resize() {
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;
}
window.addEventListener('resize', resize);
resize();

// Car properties
const car = {
  x: () => canvas.width / 2,
  y: () => canvas.height * 0.7,
  width: 320,
  height: 80,
  color: '#e10600',
};

// Street properties
function drawStreet() {
  ctx.save();
  ctx.fillStyle = '#222';
  ctx.fillRect(0, canvas.height * 0.6, canvas.width, canvas.height * 0.4);
  // Lane lines
  ctx.strokeStyle = '#fff8';
  ctx.lineWidth = 6;
  ctx.setLineDash([40, 30]);
  ctx.beginPath();
  ctx.moveTo(0, canvas.height * 0.8);
  ctx.lineTo(canvas.width, canvas.height * 0.8);
  ctx.stroke();
  ctx.setLineDash([]);
  ctx.restore();
}

// Simple F1 car shape
function drawCar() {
  const x = car.x();
  const y = car.y();
  ctx.save();
  ctx.translate(x, y);
  // Body
  ctx.fillStyle = car.color;
  ctx.fillRect(-car.width/2, -car.height/2, car.width, car.height/2);
  // Cockpit
  ctx.fillStyle = '#222';
  ctx.fillRect(-30, -car.height/2-10, 60, 30);
  // Front/rear wings
  ctx.fillStyle = '#888';
  ctx.fillRect(-car.width/2-20, -car.height/2+10, 40, 10);
  ctx.fillRect(car.width/2-20, -car.height/2+10, 40, 10);
  ctx.fillRect(-car.width/2-20, 0, 40, 10);
  ctx.fillRect(car.width/2-20, 0, 40, 10);
  // Wheels
  ctx.fillStyle = '#111';
  for (let dx of [-car.width/2+30, car.width/2-30]) {
    ctx.beginPath();
    ctx.ellipse(dx, -car.height/2+5, 18, 10, 0, 0, Math.PI*2);
    ctx.ellipse(dx, car.height/4, 18, 10, 0, 0, Math.PI*2);
    ctx.fill();
  }
  ctx.restore();
}

// Night lights
function drawLights(time) {
  for (let i = 0; i < 8; i++) {
    const lx = (canvas.width / 8) * i + 60;
    const ly = canvas.height * 0.6;
    ctx.save();
    ctx.globalAlpha = 0.25 + 0.15 * Math.sin(time/600 + i);
    ctx.beginPath();
    ctx.arc(lx, ly, 80, 0, Math.PI*2);
    ctx.fillStyle = '#fffbe6';
    ctx.shadowColor = '#fffbe6';
    ctx.shadowBlur = 40;
    ctx.fill();
    ctx.restore();
  }
}

// Steam particles
const steamParticles = [];
function spawnSteam() {
  const baseX = car.x();
  const baseY = car.y() - car.height/2;
  for (let i = 0; i < 2; i++) {
    steamParticles.push({
      x: baseX + (Math.random()-0.5)*30,
      y: baseY + 10 + Math.random()*10,
      vx: (Math.random()-0.5)*0.3,
      vy: -0.5 - Math.random()*0.7,
      alpha: 0.5 + Math.random()*0.3,
      radius: 18 + Math.random()*12,
      life: 0
    });
  }
}

function drawSteam(time) {
  spawnSteam();
  for (let i = steamParticles.length-1; i >= 0; i--) {
    const p = steamParticles[i];
    p.x += p.vx;
    p.y += p.vy;
    p.life += 1;
    p.alpha *= 0.985;
    ctx.save();
    ctx.globalAlpha = p.alpha * (1 - p.life/120);
    ctx.beginPath();
    ctx.ellipse(p.x, p.y, p.radius, p.radius*0.6, 0, 0, Math.PI*2);
    ctx.fillStyle = '#e0e6f6';
    ctx.shadowColor = '#e0e6f6';
    ctx.shadowBlur = 16;
    ctx.fill();
    ctx.restore();
    if (p.life > 120 || p.alpha < 0.05) steamParticles.splice(i, 1);
  }
}

// Enhanced glittering lights
function drawGlitteringLights(time) {
  for (let i = 0; i < 8; i++) {
    const lx = (canvas.width / 8) * i + 60;
    const ly = canvas.height * 0.6;
    ctx.save();
    // Main glow
    ctx.globalAlpha = 0.22 + 0.18 * Math.abs(Math.sin(time/600 + i));
    ctx.beginPath();
    ctx.arc(lx, ly, 80, 0, Math.PI*2);
    ctx.fillStyle = '#fffbe6';
    ctx.shadowColor = '#fffbe6';
    ctx.shadowBlur = 40;
    ctx.fill();
    // Glitter
    for (let j = 0; j < 6; j++) {
      const angle = (time/400 + i*2 + j) % (Math.PI*2);
      const rx = lx + Math.cos(angle) * (60 + Math.random()*20);
      const ry = ly + Math.sin(angle) * (60 + Math.random()*20);
      ctx.globalAlpha = 0.08 + 0.08 * Math.random();
      ctx.beginPath();
      ctx.arc(rx, ry, 2 + Math.random()*2, 0, Math.PI*2);
      ctx.fillStyle = '#fffbe6';
      ctx.fill();
    }
    ctx.restore();
  }
}

// Animation loop
function animate(time) {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  drawStreet();
  drawGlitteringLights(time);
  drawCar();
  drawSteam(time);
  requestAnimationFrame(animate);
}

animate(0);
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
