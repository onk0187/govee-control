const cities = [
  {
    name: "Los Angeles",
    timezone: "America/Los_Angeles",
    lat: 34.05,
    lon: -118.24,
  },
  { name: "New York", timezone: "America/New_York", lat: 40.71, lon: -74 },
  { name: "London", timezone: "Europe/London", lat: 51.5, lon: -0.12 },
  { name: "Berlin", timezone: "Europe/Berlin", lat: 52.52, lon: 13.4 },
  { name: "Tokyo", timezone: "Asia/Tokyo", lat: 35.68, lon: 139.65 },
  {
    name: "Singapore",
    timezone: "Asia/Singapore",
    lat: 1.35,
    lon: 103.82,
  },
  {
    name: "Sydney",
    timezone: "Australia/Sydney",
    lat: -33.86,
    lon: 151.21,
  },
];

const activeCityNames = new Set(["Los Angeles", "New York", "London", "Tokyo"]);

const globe = document.getElementById("globe");
const globeMap = document.getElementById("globeMap");
const markerLayer = document.getElementById("markerLayer");
const terminator = document.getElementById("terminator");
const cityList = document.getElementById("cityList");
const defaultSelect = document.getElementById("defaultSelect");
const utcClock = document.getElementById("utcClock");

let rotation = 0;
let defaultTimezone = "America/Los_Angeles";
let dragging = false;
let dragStartX = 0;
let dragStartRotation = 0;

const defaultOptions = [
  { label: "UTC", timezone: "UTC" },
  ...cities.map((city) => ({ label: city.name, timezone: city.timezone })),
];

function getTimeZoneOffsetMinutes(date, timeZone) {
  const formatter = new Intl.DateTimeFormat("en-US", {
    timeZone,
    hour12: false,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
  const parts = formatter.formatToParts(date);
  const values = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  const utcTime = Date.UTC(
    Number(values.year),
    Number(values.month) - 1,
    Number(values.day),
    Number(values.hour),
    Number(values.minute),
    Number(values.second)
  );
  return (utcTime - date.getTime()) / 60000;
}

function formatTime(date, timeZone) {
  return new Intl.DateTimeFormat("en-US", {
    timeZone,
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: true,
  }).format(date);
}

function formatDate(date, timeZone) {
  return new Intl.DateTimeFormat("en-US", {
    timeZone,
    weekday: "short",
    month: "short",
    day: "2-digit",
  }).format(date);
}

function updateUtcClock() {
  const now = new Date();
  utcClock.textContent = new Intl.DateTimeFormat("en-GB", {
    timeZone: "UTC",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  }).format(now);
}

function createSelectOptions() {
  defaultSelect.innerHTML = "";
  defaultOptions.forEach((option) => {
    const opt = document.createElement("option");
    opt.value = option.timezone;
    opt.textContent = option.label;
    if (option.timezone === defaultTimezone) {
      opt.selected = true;
    }
    defaultSelect.appendChild(opt);
  });
}

function addCityCard(city) {
  const card = document.createElement("div");
  card.className = "city-card";

  const meta = document.createElement("div");
  meta.className = "city-card__meta";

  const title = document.createElement("strong");
  title.textContent = city.name;

  const timezone = document.createElement("span");
  timezone.textContent = city.timezone;

  meta.append(title, timezone);

  const actions = document.createElement("div");
  actions.className = "city-card__actions";

  const button = document.createElement("button");
  button.type = "button";
  button.textContent = "Remove";
  button.addEventListener("click", () => {
    activeCityNames.delete(city.name);
    render();
  });

  actions.appendChild(button);
  card.append(meta, actions);

  cityList.appendChild(card);
}

function getActiveCities() {
  return cities.filter((city) => activeCityNames.has(city.name));
}

function calculateMarkerPosition(city, radius) {
  const lat = (city.lat || 0) * (Math.PI / 180);
  const lon = (city.lon || 0) * (Math.PI / 180) + rotation;
  const x = Math.cos(lat) * Math.sin(lon);
  const y = Math.sin(lat);
  const z = Math.cos(lat) * Math.cos(lon);

  return {
    x: radius * x,
    y: radius * y,
    z,
  };
}

function updateMarkers(now) {
  markerLayer.innerHTML = "";
  const radius = globe.clientWidth / 2;
  const activeCities = getActiveCities();
  const defaultOffset = getTimeZoneOffsetMinutes(now, defaultTimezone);

  activeCities.forEach((city) => {
    const marker = document.createElement("div");
    marker.className = "marker";

    const position = calculateMarkerPosition(city, radius * 0.82);
    const center = radius;

    if (position.z < 0) {
      marker.classList.add("marker--back");
    }

    marker.style.left = `${center + position.x}px`;
    marker.style.top = `${center + position.y}px`;

    const line = document.createElement("div");
    line.className = "marker__line";

    const label = document.createElement("div");
    label.className = "marker__label";

    const time = formatTime(now, city.timezone);
    const date = formatDate(now, city.timezone);
    const cityOffset = getTimeZoneOffsetMinutes(now, city.timezone);
    const diffHours = (cityOffset - defaultOffset) / 60;
    const diffLabel = diffHours === 0 ? "±0" : `${diffHours > 0 ? "+" : ""}${diffHours}`;

    label.innerHTML = `
      <strong>${city.name}</strong>
      ${time} · ${date}
      <span class="delta">${diffLabel}h vs default</span>
    `;

    marker.append(line, label);
    markerLayer.appendChild(marker);
  });
}

function updateTerminator(now) {
  const utcHours =
    now.getUTCHours() + now.getUTCMinutes() / 60 + now.getUTCSeconds() / 3600;
  const subsolarLongitude = (12 - utcHours) * 15;
  const rotationDegrees = subsolarLongitude + rotation * (180 / Math.PI);
  terminator.style.transform = `rotate(${rotationDegrees}deg)`;
}

function updateMap() {
  const degrees = rotation * (180 / Math.PI);
  const offset = ((degrees / 360) * 100 + 50) % 100;
  globeMap.style.backgroundPosition = `${offset}% 50%`;
}

function render() {
  const now = new Date();
  updateUtcClock();
  updateMap();
  updateTerminator(now);
  updateMarkers(now);
  cityList.innerHTML = "";
  getActiveCities().forEach((city) => addCityCard(city));
}

function startClock() {
  render();
  setInterval(render, 1000);
}

function addCity({ name, timezone }) {
  const existing = cities.find((city) => city.timezone === timezone);
  if (existing && !cities.find((city) => city.name === name)) {
    cities.push({ ...existing, name });
  } else if (!existing) {
    const now = new Date();
    const offsetMinutes = getTimeZoneOffsetMinutes(now, timezone);
    const offsetHours = offsetMinutes / 60;
    const lon = offsetHours * 15;
    cities.push({ name, timezone, lat: 0, lon });
  }

  activeCityNames.add(name);
  if (!defaultOptions.find((option) => option.timezone === timezone)) {
    defaultOptions.push({ label: name, timezone });
  }
  createSelectOptions();
  render();
}

function handleRotationStart(event) {
  dragging = true;
  dragStartX = event.clientX;
  dragStartRotation = rotation;
}

function handleRotationMove(event) {
  if (!dragging) return;
  const delta = event.clientX - dragStartX;
  rotation = dragStartRotation + delta * 0.01;
  render();
}

function handleRotationEnd() {
  dragging = false;
}

function addEventListeners() {
  defaultSelect.addEventListener("change", (event) => {
    defaultTimezone = event.target.value;
    render();
  });

  globe.addEventListener("pointerdown", (event) => {
    globe.setPointerCapture(event.pointerId);
    handleRotationStart(event);
  });
  globe.addEventListener("pointermove", handleRotationMove);
  globe.addEventListener("pointerup", handleRotationEnd);
  globe.addEventListener("pointerleave", handleRotationEnd);

  document.getElementById("addCityForm").addEventListener("submit", (event) => {
    event.preventDefault();
    const nameInput = document.getElementById("cityName");
    const timezoneInput = document.getElementById("cityTimezone");
    if (!nameInput.value || !timezoneInput.value) return;
    addCity({ name: nameInput.value.trim(), timezone: timezoneInput.value.trim() });
    nameInput.value = "";
    timezoneInput.value = "";
  });
}

createSelectOptions();
addEventListeners();
startClock();
