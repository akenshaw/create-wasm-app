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

window.addEventListener(
  "renderEvent",
  function (e) {
    manager.render();
  },
  false
);

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
function scheduleFetchOI() {
  const now = new Date();
  const delay = (60 - now.getSeconds() - 1) * 1000 - now.getMilliseconds();

  setTimeout(() => {
    fetchOI();
    setInterval(fetchOI, 60000);
  }, delay);
}
scheduleFetchOI();

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
setInterval(fetchDepthAsync, 12000);
