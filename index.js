import * as wasm_module from "rsdepth";
import { memory } from "rsdepth/rsdepth_bg";

console[window.crossOriginIsolated ? "log" : "error"](
  "Cross-origin isolation is " +
    (window.crossOriginIsolated ? "enabled" : "not enabled")
);
if (typeof SharedArrayBuffer !== "undefined") {
  console.log("TriHard enabled (SharedArrayBuffer is available)");
} else {
  console.error("SharedArrayBuffer is not available in this environment");
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
manager.initialize_ws();
fetchDepthAsync();
setInterval(fetchDepthAsync, 12000);
initialKlineFetch();
fetchHistOI();
scheduleFetchOI();

window.addEventListener(
  "renderEvent",
  function (e) {
    manager.render();
  },
  false
);

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
      "https://fapi.binance.com/fapi/v1/klines?symbol=btcusdt&interval=1m&limit=1000"
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
