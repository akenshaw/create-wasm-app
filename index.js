import * as wasm_module from "rsdepth";
import {
  combineDicts,
  fetchDepthAsync,
  fetchHistOI,
  fetchOI,
  initialKlineFetch,
  fetchHistTrades,
} from "./connectorUtils.js";

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

function canvasStarter(symbol, price) {
  changeSymbol(symbol.toLowerCase());
}

function debounce(func, wait) {
  let timeout;
  return function executedFunction(...args) {
    const later = () => {
      clearTimeout(timeout);
      func(...args);
    };
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
}

function adjustDPIonResize(canvas, index) {
  let dpi = window.devicePixelRatio;
  let style_height = +getComputedStyle(canvas)
    .getPropertyValue("height")
    .slice(0, -2);
  let style_width = +getComputedStyle(canvas)
    .getPropertyValue("width")
    .slice(0, -2);
  canvas.setAttribute("height", style_height * dpi);
  canvas.setAttribute("width", style_width * dpi);

  new_widths[index] = style_width * dpi;
  new_heights[index] = style_height * dpi;
}

let new_widths = [];
let new_heights = [];

window.addEventListener(
  "resize",
  debounce(() => {
    console.log("resizing...");
    canvases.forEach((canvas, i) => adjustDPIonResize(canvas, i));
    manager.resize(new_widths, new_heights);
  }, 300)
);

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

let currentSymbol = "btcusdt";
let depthIntervalId, oiIntervalId;

let manager = wasm_module.CanvasManager.new(...canvases);
changeSymbol(currentSymbol);

setInterval(() => {
  manager.render();
}, 1000 / 30);

function changeSymbol(newSymbol) {
  if (depthIntervalId) {
    clearInterval(depthIntervalId);
  }
  if (oiIntervalId) {
    clearInterval(oiIntervalId);
  }

  currentSymbol = newSymbol;
  manager.initialize_ws(currentSymbol);

  if (tickersMenu.style.display === "block") {
    showTickers();
  }

  fetchDepthAsync(currentSymbol).then((depth) => {
    manager.fetch_depth(depth);
  });
  initialKlineFetch(currentSymbol).then((klines) => {
    manager.fetch_klines(klines);
    //const keys = manager.get_kline_ohlcv_keys();
    //getHistTrades("btcusdt", keys, manager);
  });
  fetchHistOI(currentSymbol).then((histOI) => {
    manager.gather_hist_oi(histOI);
  });

  scheduleFetchOI();
  scheduleFetchDepth();
}
function scheduleFetchDepth() {
  depthIntervalId = setInterval(() => {
    fetchDepthAsync(currentSymbol).then((depth) => {
      manager.fetch_depth(depth);
    });
  }, 12000);
}
function scheduleFetchOI() {
  const now = new Date();
  const delay = (60 - now.getSeconds() - 1) * 1000 - now.getMilliseconds();

  setTimeout(() => {
    fetchOI(currentSymbol).then((oi) => {
      manager.fetch_oi(oi);
    });
    if (oiIntervalId) {
      clearInterval(oiIntervalId);
    }
    oiIntervalId = setInterval(() => {
      fetchOI(currentSymbol).then((oi) => {
        manager.fetch_oi(oi);
      });
    }, 60000);
  }, delay);
}

async function getHistTrades(symbol, dp, manager) {
  for (let i = dp.length - 1; i >= 0; i--) {
    let startTime = Number(dp[i]);
    const endTime = startTime + 59999;
    let trades = [];
    let lastTradeTime = 0;
    console.log(
      "getting historical trades:",
      i + 1,
      "of",
      dp.length,
      "klines..."
    );
    while (true) {
      try {
        const fetchedTrades = await fetchHistTrades(
          symbol,
          startTime,
          endTime,
          1000
        );
        trades = trades.concat(fetchedTrades);
        if (fetchedTrades.length > 0) {
          lastTradeTime = fetchedTrades[fetchedTrades.length - 1].time;
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
    manager.concat_hist_trades(
      JSON.stringify(trades),
      (endTime - 59999).toString()
    );
  }
}

// Canvas event listeners //
let canvasMain = document.querySelector("#canvas-main");
let canvasIndi1 = document.querySelector("#canvas-indi-1");
let canvasIndi2 = document.querySelector("#canvas-indi-2");

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

// Zoom X
canvasIndi1.addEventListener("wheel", function (event) {
  event.preventDefault();
  manager.zoom_x(-event.deltaY);
});
canvasIndi2.addEventListener("wheel", function (event) {
  event.preventDefault();
  manager.zoom_x(-event.deltaY);
});
