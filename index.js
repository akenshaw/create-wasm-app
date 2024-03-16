import * as wasm_module from "rsdepth";
import { combineDicts } from "./connectorUtils.js";

console[window.crossOriginIsolated ? "log" : "error"](
  "Cross-origin isolation is " +
    (window.crossOriginIsolated ? "enabled" : "not enabled")
);
typeof SharedArrayBuffer !== "undefined"
  ? console.log("TriHard enabled (SharedArrayBuffer is available)")
  : console.error("SharedArrayBuffer is not available in this environment");

const buttons = ["btn1", "btn2", "btn3", "btn4"];
const menuIds = ["tickers-menu", "menu2", "menu3", "settings-menu"];
const functions = [showTickers, showMenu, showMenu, showSettings];

for (let i = 0; i < buttons.length; i++) {
  const button = document.getElementById(buttons[i]);
  button.addEventListener("click", functions[i]);
  button.addEventListener("click", function () {
    updateButtonState(buttons[i], menuIds[i]);
  });
}

const tickersMenu = document.getElementById("tickers-menu");
const settingsMenu = document.getElementById("settings-menu");

let input = document.getElementById("ticker-search");
let searchTerm;
input.addEventListener("keyup", function () {
  searchTerm = this.value.toLowerCase();
  let rows = document.querySelectorAll("#ticker-table tbody tr");

  for (let row of rows) {
    let symbol = row.cells[0].textContent.toLowerCase();

    if (symbol.includes(searchTerm)) {
      row.style.display = "";
    } else {
      row.style.display = "none";
    }
  }
});

function getCurrentTime() {
  const now = new Date();
  const hours = now.getHours().toString().padStart(2, "0");
  const minutes = now.getMinutes().toString().padStart(2, "0");
  const seconds = now.getSeconds().toString().padStart(2, "0");
  return hours + ":" + minutes + ":" + seconds;
}
function updateLastUpdatedInfo() {
  const tickersUpdateInfo = document.getElementById("tickers-update-info");
  tickersUpdateInfo.textContent = "Last updated at " + getCurrentTime();
}

const tickersUpdateBtn = document.getElementById("tickers-update-btn");
tickersUpdateBtn.addEventListener("click", function () {
  tickersUpdateBtn.className = "loading-animation";
  tickersUpdateBtn.disabled = true;
  combineDicts().then((data) => {
    tickersUpdateBtn.className = "";
    generateTable(data);
    updateLastUpdatedInfo();
    tickersUpdateBtn.disabled = false;
  });
});

tickersUpdateBtn.className = "loading-animation";
tickersUpdateBtn.disabled = true;
combineDicts().then((data) => {
  tickersUpdateBtn.className = "";
  generateTable(data);
  updateLastUpdatedInfo();
  tickersUpdateBtn.disabled = false;
});

function showMenu() {
  console.log("show menu");
}
function showTickers() {
  input.value = "";
  searchTerm = "";
  let rows = document.querySelectorAll("#ticker-table tbody tr");

  for (let row of rows) {
    row.style.display = "";
  }
  tickersMenu.style.display =
    tickersMenu.style.display === "none" ? "block" : "none";
  updateButtonState("btn1", "tickers-menu");

  if (tickersMenu.style.display === "block") {
    document.addEventListener("click", closeMenu);
  } else {
    document.removeEventListener("click", closeMenu);
  }
}
function showSettings() {
  settingsMenu.style.display =
    settingsMenu.style.display === "none" ? "block" : "none";
  updateButtonState("btn4", "settings-menu");

  if (settingsMenu.style.display === "block") {
    document.addEventListener("click", closeMenu);
  } else {
    document.removeEventListener("click", closeMenu);
  }
}
function closeMenu(e) {
  const btn1 = document.querySelector("#btn1");
  const btn4 = document.querySelector("#btn4");

  if (!settingsMenu.contains(e.target) && !btn4.contains(e.target)) {
    settingsMenu.style.display = "none";
    updateButtonState("btn4", "settings-menu");
  }
  if (!tickersMenu.contains(e.target) && !btn1.contains(e.target)) {
    tickersMenu.style.display = "none";
    updateButtonState("btn1", "tickers-menu");
  }

  if (
    settingsMenu.style.display === "none" &&
    tickersMenu.style.display === "none"
  ) {
    document.removeEventListener("click", closeMenu);
  }
}

function updateButtonState(buttonId, menuId) {
  const menu = document.getElementById(menuId);
  const button = document.getElementById(buttonId);

  if (buttonId === "btn1" || buttonId === "btn4") {
    if (menu.style.display === "block") {
      button.classList.add("active");
    } else {
      button.classList.remove("active");
    }
  }
}

function formatLargeNumber(num) {
  if (num >= 1.0e9) {
    return (num / 1.0e9).toFixed(2) + "b";
  } else if (num >= 1.0e6) {
    return (num / 1.0e6).toFixed(2) + "m";
  } else if (num >= 1.0e3) {
    return (num / 1.0e3).toFixed(2) + "k";
  } else {
    return num;
  }
}
function formatNumber(value, type, price) {
  let displayValue;

  if (type === "mark_price") {
    if (value > 10) {
      displayValue = Math.round(value * 100) / 100;
    } else {
      displayValue = Math.round(value * 10000) / 10000;
    }
  } else if (type === "volume") {
    displayValue = formatLargeNumber(value);
    displayValue = "$" + displayValue;
  } else if (type === "open_interest") {
    displayValue = formatLargeNumber(value * price);
    displayValue = "$" + displayValue;
  }
  return displayValue;
}
function generateTable(data) {
  let tableBody = document.querySelector("#tickers-menu table tbody");
  tableBody.innerHTML = "";

  let entries = Object.entries(data);
  entries.sort(([, a], [, b]) => b.volume - a.volume);

  for (let i = 0; i < entries.length; i++) {
    let [symbol, symbolData] = entries[i];
    let row;

    if (i < tableBody.rows.length) {
      row = tableBody.rows[i];
    } else {
      row = tableBody.insertRow();
      row.insertCell(); // symbol
      row.insertCell(); // mark_price
      row.insertCell(); // change
      row.insertCell(); // funding
      row.insertCell(); // OI
      row.insertCell(); // OI change
      row.insertCell(); // volume
    }
    row.classList.add("table-row");

    row.cells[0].textContent = symbol;
    row.cells[1].textContent = formatNumber(
      symbolData.mark_price,
      "mark_price",
      symbolData.mark_price
    );
    row.cells[2].textContent =
      (Math.round(symbolData.change * 100) / 100).toFixed(2) + "%";
    row.cells[3].textContent = symbolData.funding_rate + "%";
    row.cells[4].textContent = formatNumber(
      symbolData.open_interest,
      "open_interest",
      symbolData.mark_price
    );
    row.cells[5].textContent = symbolData.OI_24hrChange + "%";
    row.cells[6].textContent = formatNumber(
      symbolData.volume,
      "volume",
      symbolData.mark_price
    );

    const chng_color_a = Math.min(Math.abs(symbolData.change / 100), 1);
    const fndng_color_a = Math.max(Math.abs(symbolData.funding_rate * 50), 0.2);

    if (symbolData.change < 0) {
      row.style.backgroundColor =
        "rgba(192, 80, 78, " + chng_color_a * 1.5 + ")";
    } else {
      row.style.backgroundColor = "rgba(81, 205, 160, " + chng_color_a + ")";
    }
    if (symbolData.funding_rate > 0) {
      row.cells[3].style.color =
        "rgba(212, 80, 78, " + fndng_color_a * 1.5 + ")";
    } else {
      row.cells[3].style.color =
        "rgba(81, 246, 160, " + fndng_color_a * 1.5 + ")";
    }
    row.addEventListener("click", function () {
      canvasStarter(symbol, symbolData.mark_price);
    });
  }
}

function adjustDPI(canvas) {
  let dpi = window.devicePixelRatio;
  let style_height = +getComputedStyle(canvas)
    .getPropertyValue("height")
    .slice(0, -2);
  let style_width = +getComputedStyle(canvas)
    .getPropertyValue("width")
    .slice(0, -2);
  canvas.setAttribute("height", style_height * dpi);
  canvas.setAttribute("width", style_width * dpi);
}
let canvasIds = [
  "#canvas-main",
  "#canvas-depth",
  "#canvas-indi-2",
  "#canvas-bubble",
  "#canvas-indi-1",
];
let canvases = canvasIds.map((id) => document.querySelector(id));
canvases.forEach(adjustDPI);

let manager = wasm_module.CanvasManager.new(...canvases);
window.addEventListener(
  "renderEvent",
  function (e) {
    manager.render();
  },
  false
);
manager.initialize_ws();
fetchDepthAsync();
setInterval(fetchDepthAsync, 12000);
initialKlineFetch();
fetchHistOI();
scheduleFetchOI();

let canvasMain = document.querySelector("#canvas-main");
// Panning
let isDragging = false;
let startDragX = 0;
canvasMain.addEventListener("mousedown", function (event) {
  isDragging = true;
  startDragX = event.clientX;
});
canvasMain.addEventListener("mousemove", function (event) {
  if (isDragging) {
    let dx = event.clientX - startDragX;
    manager.pan_x(dx);
    startDragX = event.clientX;
  }
});
canvasMain.addEventListener("mouseup", function (event) {
  isDragging = false;
});
canvasMain.addEventListener("mouseleave", function (event) {
  isDragging = false;
});

function scheduleFetchOI() {
  const now = new Date();
  const delay = (60 - now.getSeconds() - 1) * 1000 - now.getMilliseconds();

  setTimeout(() => {
    fetchOI();
    setInterval(fetchOI, 60000);
  }, delay);
}
async function fetchOI() {
  try {
    let response = await fetch(
      "https://fapi.binance.com/fapi/v1/openInterest?symbol=btcusdt"
    );
    let oi = await response.text();
    manager.fetch_oi(oi);
  } catch (error) {
    console.error(error);
  }
}
async function fetchHistOI() {
  try {
    let response = await fetch(
      "https://fapi.binance.com/futures/data/openInterestHist?symbol=btcusdt&period=5m&limit=12"
    );
    let hist_oi = await response.text();
    manager.fetch_hist_oi(hist_oi);
  } catch (error) {
    console.error(error);
  }
}
async function fetchDepthAsync() {
  try {
    let response = await fetch(
      "https://fapi.binance.com/fapi/v1/depth?symbol=btcusdt&limit=1000"
    );
    let depth = await response.text();
    manager.fetch_depth(depth);
  } catch (error) {
    console.error(error);
  }
}
async function initialKlineFetch() {
  try {
    let response = await fetch(
      "https://fapi.binance.com/fapi/v1/klines?symbol=btcusdt&interval=1m&limit=60"
    );
    let klines = await response.text();
    manager.fetch_klines(klines);
  } catch (error) {
    console.error(error);
  }
}
async function fetchHistTrades(
  symbol,
  startTime,
  endTime,
  limit,
  retryCount = 0
) {
  try {
    const url = `https://fapi.binance.com/fapi/v1/aggTrades?symbol=${symbol}${
      startTime ? "&startTime=" + startTime : ""
    }${endTime ? "&endTime=" + endTime : ""}${limit ? "&limit=" + limit : ""}`;
    const response = await fetch(url);

    if (response.status === 429) {
      const waitTime = Math.pow(2, retryCount) * 1000;
      console.log(
        `Rate limit exceeded, pausing for ${waitTime / 1000} seconds...`
      );
      await new Promise((resolve) => setTimeout(resolve, waitTime));
      return fetchHistTrades(symbol, startTime, endTime, limit, retryCount + 1);
    }

    const data = await response.json();
    const trades = data.map((trade) => {
      return {
        x: trade.T,
        y: parseFloat(trade.p),
        q: parseFloat(trade.q),
        m: trade.m,
      };
    });

    console.log(`Fetched ${trades.length} trades.`);
    return trades;
  } catch (error) {
    console.log(error, url);
    return NaN;
  }
}
async function getHistTrades(symbol, dp) {
  for (let i = 0; i < dp.length; i++) {
    const kline = dp[i];
    let startTime = kline.startTime;
    const endTime = kline.endTime;
    let trades = [];
    let lastTradeTime = 0;
    console.log(
      "getting historical trades:",
      i + 1,
      "of",
      dp_length,
      "klines..."
    );
    while (true) {
      try {
        const fetchedTrades = await fetchHistTrades(
          currentSymbol,
          startTime,
          endTime,
          1000
        );
        trades = trades.concat(fetchedTrades);
        if (fetchedTrades.length > 0) {
          lastTradeTime = fetchedTrades[fetchedTrades.length - 1].x;
          startTime = lastTradeTime + 1;
        }
        if (fetchedTrades.length < 1000) {
          break;
        }
        await new Promise((resolve) => setTimeout(resolve, 400));
      } catch (error) {
        console.log(error, startTime, endTime);
        break;
      }
    }
    dp[i] = trades;
  }
}
