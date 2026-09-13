/* Master Games Arcade Web — navegação por toque no launcher (celular/tablet).
 *
 * O launcher original foi feito para teclado/joystick: ele responde a
 * ArrowUp/Down/Left/Right, Enter e Escape. No celular não existe teclado,
 * então este arquivo desenha um mini-controle na tela e traduz cada toque
 * em um evento de teclado real (keydown/keyup) enviado ao documento.
 *
 * Nada da interface original é alterado: é apenas uma camada por cima,
 * exibida somente em telas de toque, e que pode ser recolhida.
 */
(() => {
  const isTouch =
    matchMedia("(pointer:coarse)").matches ||
    navigator.maxTouchPoints > 0 ||
    "ontouchstart" in window;

  if (!isTouch || window.MGA_MOBILE_NAV) return;

  const KEYS = {
    up: { key: "ArrowUp", code: "ArrowUp", keyCode: 38 },
    down: { key: "ArrowDown", code: "ArrowDown", keyCode: 40 },
    left: { key: "ArrowLeft", code: "ArrowLeft", keyCode: 37 },
    right: { key: "ArrowRight", code: "ArrowRight", keyCode: 39 },
    enter: { key: "Enter", code: "Enter", keyCode: 13 },
    escape: { key: "Escape", code: "Escape", keyCode: 27 }
  };

  const send = (type, spec) => {
    const event = new KeyboardEvent(type, {
      key: spec.key,
      code: spec.code,
      keyCode: spec.keyCode,
      which: spec.keyCode,
      bubbles: true,
      cancelable: true,
      composed: true
    });
    (document.activeElement || document.body).dispatchEvent(event);
    if (document.activeElement !== document.body) {
      document.dispatchEvent(event);
    }
  };

  const press = (name) => {
    const spec = KEYS[name];
    if (!spec) return;
    send("keydown", spec);
    setTimeout(() => send("keyup", spec), 90);
  };

  const style = document.createElement("style");
  style.textContent = `
  #mga-mnav{position:fixed;z-index:2147483000;right:calc(10px + env(safe-area-inset-right));bottom:calc(10px + env(safe-area-inset-bottom));display:grid;grid-template-columns:repeat(3,46px);grid-auto-rows:46px;gap:6px;font-family:monospace;touch-action:manipulation}
  #mga-mnav.mga-hidden > .mga-key{display:none}
  #mga-mnav .mga-key{-webkit-appearance:none;appearance:none;display:grid;place-items:center;background:rgba(8,0,15,.82);color:#00e5ff;border:1px solid rgba(0,229,255,.55);border-radius:10px;font-size:16px;font-weight:700;box-shadow:0 0 10px rgba(0,229,255,.25);user-select:none;-webkit-user-select:none;-webkit-tap-highlight-color:transparent}
  #mga-mnav .mga-key:active{background:#00e5ff;color:#08000f}
  #mga-mnav .mga-wide{grid-column:span 2;font-size:12px;letter-spacing:1px}
  #mga-mnav .mga-toggle{grid-column:3;background:rgba(22,5,29,.85);color:#ff2bd6;border-color:rgba(255,43,214,.6);box-shadow:0 0 10px rgba(255,43,214,.3);font-size:13px}
  @media (min-width:900px){#mga-mnav{grid-template-columns:repeat(3,54px);grid-auto-rows:54px}}
  `;

  const pad = document.createElement("div");
  pad.id = "mga-mnav";

  const cell = (label, action, cls) => {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "mga-key" + (cls ? " " + cls : "");
    button.textContent = label;
    button.setAttribute("aria-label", label);
    button.addEventListener(
      "pointerdown",
      (event) => {
        event.preventDefault();
        event.stopPropagation();
        if (action) action();
      },
      { passive: false }
    );
    button.addEventListener("click", (event) => event.preventDefault());
    return button;
  };

  const spacer = () => {
    const empty = document.createElement("span");
    empty.style.visibility = "hidden";
    return empty;
  };

  const toggle = cell("⌨", null, "mga-toggle");
  toggle.addEventListener(
    "pointerdown",
    (event) => {
      event.preventDefault();
      pad.classList.toggle("mga-hidden");
      toggle.textContent = pad.classList.contains("mga-hidden") ? "⌨" : "✕";
    },
    { passive: false }
  );

  pad.append(
    toggle,
    spacer(),
    cell("▲", () => press("up")),
    spacer(),
    cell("◀", () => press("left")),
    cell("▼", () => press("down")),
    cell("▶", () => press("right")),
    cell("OK", () => press("enter"), "mga-wide"),
    cell("VOLTAR", () => press("escape"))
  );

  // Começa recolhido: só o botão de abrir aparece.
  pad.classList.add("mga-hidden");
  toggle.textContent = "⌨";

  const mount = () => {
    document.head.appendChild(style);
    document.body.appendChild(pad);
  };

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", mount, { once: true });
  } else {
    mount();
  }

  // Enquanto um jogo está aberto (overlay do player em tela cheia) o
  // mini-controle sai da frente: o gamepad virtual do emulador assume.
  const observer = new MutationObserver(() => {
    const playing = !!document.getElementById("mga-web-player");
    pad.style.display = playing ? "none" : "";
  });
  observer.observe(document.documentElement, { childList: true, subtree: true });

  window.MGA_MOBILE_NAV = Object.freeze({ press, version: "1.0.0" });
})();
