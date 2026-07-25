/*
 * Smart Alarm Clock — custom Home Assistant panel.
 *
 * A bespoke "Alarms" screen (sidebar route /alarms), wired to the live entities
 * and inheriting the active HA theme (colour is owned by the theme — this file
 * only reads HA CSS variables). Reproduces the approved mockup: clock hero,
 * "next alarm" summary, the alarm slots (first 3 shown, "add" reveals more up to
 * 8), and Snooze/Dismiss that step forward while ringing.
 *
 * Deploy: copy to <config>/www/alarms-panel.js and register in configuration.yaml:
 *
 *   panel_custom:
 *     - name: sac-alarms-panel
 *       sidebar_title: Alarms
 *       sidebar_icon: mdi:alarm
 *       url_path: alarms
 *       module_url: /local/alarms-panel.js
 *       embed_iframe: false
 *       require_admin: false
 */

const MAX_SLOTS = 8;
const DEFAULT_SHOWN = 3;
const DOMAIN = "smart_alarm_clock";

const styles = `
  :host {
    --line: var(--divider-color, #3a352e);
    --ink: var(--primary-text-color, #e8e0d2);
    --muted: var(--secondary-text-color, #9c9284);
    --surface: var(--card-background-color, #26221d);
    --surface-2: var(--secondary-background-color, #242019);
    --bg: var(--primary-background-color, #1b1815);
    --accent: var(--accent-color, #c08a54);
    --on-accent: var(--text-primary-color, #1b1815);
    --glow: color-mix(in srgb, var(--accent) 15%, transparent);
    --glow-strong: color-mix(in srgb, var(--accent) 28%, transparent);
    --radius: 4px;
    --font-time: ui-monospace, "SF Mono", "JetBrains Mono", "Roboto Mono", monospace;
    display: block;
    min-height: 100%;
    background: var(--bg);
    color: var(--ink);
    font-family: var(--paper-font-body1_-_font-family, system-ui, -apple-system, "Segoe UI", Roboto, sans-serif);
  }
  * { box-sizing: border-box; }

  .panel {
    width: 100%; max-width: 440px; margin: 0 auto;
    padding: 26px 18px 48px;
    display: flex; flex-direction: column; gap: 22px;
  }

  header { display: flex; flex-direction: column; gap: 10px; }
  .eyebrow { margin: 0; font-size: .68rem; letter-spacing: .28em; text-transform: uppercase; color: var(--muted); }
  .clock {
    font-family: var(--font-time); font-variant-numeric: tabular-nums;
    font-size: clamp(3rem, 15vw, 3.9rem); font-weight: 500; line-height: 1;
    display: flex; align-items: baseline; gap: .3em;
  }
  .clock .sec { font-size: .34em; color: var(--muted); }
  :host([data-phase="armed"]) .clock,
  :host([data-phase="ringing"]) .clock { color: var(--accent); }
  @media (prefers-reduced-motion: no-preference) {
    :host([data-phase="ringing"]) .clock { animation: breathe 2s ease-in-out infinite; }
    @keyframes breathe { 0%,100% { opacity: 1 } 50% { opacity: .62 } }
  }

  .statusline { display: flex; align-items: center; gap: 10px; flex-wrap: wrap; }
  .pill { font-size: .68rem; letter-spacing: .16em; text-transform: uppercase; padding: 4px 9px; border-radius: var(--radius); border: 1px solid var(--line); color: var(--muted); }
  :host([data-phase="armed"]) .pill { border-color: var(--accent); color: var(--accent); }
  :host([data-phase="ringing"]) .pill { background: var(--accent); color: var(--on-accent); border-color: var(--accent); }
  .next { font-size: .86rem; color: var(--muted); }
  .next b { color: var(--ink); font-weight: 600; font-variant-numeric: tabular-nums; }

  .sec-head { display: flex; align-items: baseline; justify-content: space-between; }
  .sec-head h2 { margin: 0; font-size: .8rem; letter-spacing: .2em; text-transform: uppercase; color: var(--muted); font-weight: 600; }
  .sec-head .count { font-size: .78rem; color: var(--muted); font-variant-numeric: tabular-nums; }

  .slots { display: flex; flex-direction: column; gap: 8px; margin-top: 12px; }
  .slot {
    position: relative; display: grid; grid-template-columns: auto 1fr auto;
    align-items: center; column-gap: 14px; padding: 13px 14px 13px 15px;
    background: var(--surface-2); border: 1px solid var(--line); border-radius: var(--radius);
    overflow: hidden; transition: border-color .18s ease;
  }
  .slot::before { content: ""; position: absolute; inset: 0 auto 0 0; width: 3px; background: transparent; transition: background .18s ease; }
  .slot.on { background: linear-gradient(90deg, var(--glow), transparent 62%), var(--surface-2); border-color: color-mix(in srgb, var(--accent) 35%, var(--line)); }
  .slot.on::before { background: var(--accent); }
  .slot.ringing { border-color: var(--accent); background: linear-gradient(90deg, var(--glow-strong), transparent 70%), var(--surface-2); }

  .idx { font-family: var(--font-time); font-size: .74rem; color: var(--muted); font-variant-numeric: tabular-nums; }
  .slot.on .idx { color: var(--accent); }
  .body { display: flex; flex-direction: column; gap: 2px; min-width: 0; }
  .time {
    font-family: var(--font-time); font-variant-numeric: tabular-nums;
    font-size: 1.6rem; font-weight: 500; line-height: 1.05; color: var(--muted);
    background: transparent; border: 0; padding: 0; width: 5.4ch; color-scheme: dark light;
  }
  .slot.on .time { color: var(--ink); }
  .time::-webkit-calendar-picker-indicator { opacity: .35; filter: none; }
  .time:focus-visible { outline: 2px solid var(--accent); outline-offset: 3px; }
  .sub { font-size: .76rem; color: var(--muted); }
  .slot.on .sub { color: var(--accent); }
  .slot.ringing .sub { color: var(--accent); font-weight: 600; }

  .tog { appearance: none; -webkit-appearance: none; margin: 0; width: 44px; height: 26px; border-radius: 13px; background: var(--line); border: 1px solid var(--line); position: relative; cursor: pointer; flex: none; transition: background .18s ease; }
  .tog::after { content: ""; position: absolute; top: 2px; left: 2px; width: 20px; height: 20px; border-radius: 50%; background: var(--surface); transition: transform .18s ease; }
  .tog:checked { background: var(--ink); border-color: var(--ink); }
  .tog:checked::after { transform: translateX(18px); }
  .tog:focus-visible { outline: 2px solid var(--accent); outline-offset: 2px; }

  .add { display: flex; align-items: center; justify-content: center; gap: 8px; font: inherit; font-size: .82rem; color: var(--muted); background: transparent; border: 1px dashed var(--line); border-radius: var(--radius); padding: 11px; cursor: pointer; margin-top: 8px; transition: color .15s ease, border-color .15s ease; }
  .add:hover { color: var(--ink); border-color: var(--muted); }
  .add[hidden] { display: none; }
  .add .free { color: var(--muted); font-variant-numeric: tabular-nums; }

  .actions { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; }
  .btn { font: inherit; font-size: .9rem; font-weight: 600; padding: 13px; border-radius: var(--radius); cursor: pointer; border: 1px solid var(--line); background: transparent; color: var(--muted); transition: color .15s ease, background .15s ease, border-color .15s ease; }
  .btn:hover { color: var(--ink); border-color: var(--muted); }
  .btn:focus-visible { outline: 2px solid var(--accent); outline-offset: 2px; }
  :host([data-phase="ringing"]) .dismiss { background: var(--accent); color: var(--on-accent); border-color: var(--accent); }
  :host([data-phase="ringing"]) .snooze { color: var(--ink); border-color: var(--muted); }
  :host(:not([data-phase="ringing"])) .actions { opacity: .55; }
`;

class SacAlarmsPanel extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: "open" });
    this._built = false;
    this._shown = Number(localStorage.getItem("sac_shown")) || DEFAULT_SHOWN;
  }

  set hass(hass) { this._hass = hass; this._render(); }
  set panel(_) {}
  set narrow(_) {}

  connectedCallback() { this._build(); this._render(); }

  _build() {
    if (this._built) return;
    const root = this.shadowRoot;
    root.innerHTML = `<style>${styles}</style>
      <div class="panel">
        <header>
          <p class="eyebrow">Smart Alarm Clock</p>
          <div class="clock"><span class="hh">--:--</span><span class="sec"></span></div>
          <div class="statusline">
            <span class="pill">—</span>
            <span class="next"></span>
          </div>
        </header>
        <section>
          <div class="sec-head"><h2>Alarms</h2><span class="count"></span></div>
          <div class="slots"></div>
          <button class="add" type="button">＋ Add alarm <span class="free"></span></button>
        </section>
        <div class="actions">
          <button class="btn snooze" type="button">Snooze</button>
          <button class="btn dismiss" type="button">Dismiss</button>
        </div>
      </div>`;

    root.querySelector(".add").addEventListener("click", () => {
      this._shown = Math.min(MAX_SLOTS, this._shown + 1);
      localStorage.setItem("sac_shown", String(this._shown));
      this._slotsDirty = true;
      this._render();
    });
    root.querySelector(".snooze").addEventListener("click", () => this._press("snooze"));
    root.querySelector(".dismiss").addEventListener("click", () => this._press("dismiss"));
    this._built = true;
    this._slotsDirty = true;
  }

  _st(id) { return this._hass && this._hass.states[id]; }
  _secs(hms) { if (!hms) return null; const p = String(hms).split(":"); return (+p[0]) * 3600 + (+p[1]) * 60 + (+(p[2] || 0)); }
  _hhmm(hms) { return hms ? String(hms).slice(0, 5) : "--:--"; }

  _press(kind) {
    this._hass.callService("button", "press", { entity_id: `button.${DOMAIN}_${kind}` });
  }

  _rebuildSlots() {
    const wrap = this.shadowRoot.querySelector(".slots");
    wrap.innerHTML = "";
    for (let n = 1; n <= this._shown; n++) {
      const li = document.createElement("div");
      li.className = "slot";
      li.dataset.n = n;
      li.innerHTML = `
        <span class="idx">${String(n).padStart(2, "0")}</span>
        <span class="body">
          <input class="time" type="time" step="60" aria-label="Alarm ${n} time">
          <span class="sub"></span>
        </span>
        <input class="tog" type="checkbox" aria-label="Alarm ${n} enabled">`;
      const tog = li.querySelector(".tog");
      tog.addEventListener("change", () => {
        this._hass.callService("switch", tog.checked ? "turn_on" : "turn_off",
          { entity_id: `switch.${DOMAIN}_alarm_${n}` });
      });
      const time = li.querySelector(".time");
      time.addEventListener("change", () => {
        if (!time.value) return;
        this._hass.callService("time", "set_value",
          { entity_id: `time.${DOMAIN}_alarm_${n}_time`, time: time.value + ":00" });
      });
      wrap.appendChild(li);
    }
    this._slotsDirty = false;
  }

  _render() {
    if (!this._built || !this._hass) return;
    if (this._slotsDirty) this._rebuildSlots();
    const root = this.shadowRoot;

    // Clock + phase
    const clock = this._st(`sensor.${DOMAIN}_time`);
    const phaseSt = this._st(`sensor.${DOMAIN}_phase`);
    const phase = phaseSt ? phaseSt.state : "idle";
    const nowHms = clock ? clock.state : null;
    root.querySelector(".hh").textContent = this._hhmm(nowHms);
    root.querySelector(".sec").textContent = nowHms ? ":" + String(nowHms).slice(6, 8) : "";
    this.setAttribute("data-phase", phase);
    root.querySelector(".pill").textContent = phase.charAt(0).toUpperCase() + phase.slice(1);

    // Next alarm + count, across all 8 slots
    const nowSecs = this._secs(nowHms) ?? 0;
    let onCount = 0, best = null;
    for (let n = 1; n <= MAX_SLOTS; n++) {
      const sw = this._st(`switch.${DOMAIN}_alarm_${n}`);
      const tm = this._st(`time.${DOMAIN}_alarm_${n}_time`);
      if (sw && sw.state === "on") {
        onCount++;
        const s = this._secs(tm && tm.state);
        if (s != null) {
          const delta = (s - nowSecs + 86400) % 86400;
          if (best === null || delta < best.delta) best = { delta, hms: tm.state, n };
        }
      }
    }
    root.querySelector(".count").textContent = onCount + " on";
    const next = root.querySelector(".next");
    if (phase === "idle" || !best) {
      next.innerHTML = "No alarms set";
    } else {
      next.innerHTML = `Next <b>${this._hhmm(best.hms)}</b> · ${this._rel(best.delta)}`;
    }

    // Slot rows
    const ringingN = (phase === "ringing" && best) ? best.n : -1;
    root.querySelectorAll(".slot").forEach((li) => {
      const n = +li.dataset.n;
      const sw = this._st(`switch.${DOMAIN}_alarm_${n}`);
      const tm = this._st(`time.${DOMAIN}_alarm_${n}_time`);
      const on = sw && sw.state === "on";
      li.classList.toggle("on", !!on);
      li.classList.toggle("ringing", n === ringingN);
      const tog = li.querySelector(".tog");
      if (document.activeElement !== tog) tog.checked = !!on;
      const time = li.querySelector(".time");
      const val = this._hhmm(tm && tm.state);
      if (document.activeElement !== time && val !== "--:--") time.value = val;
      const sub = li.querySelector(".sub");
      if (n === ringingN) sub.textContent = "Ringing now";
      else if (on) { const s = this._secs(tm && tm.state); sub.textContent = s != null ? this._rel((s - nowSecs + 86400) % 86400) : "On"; }
      else sub.textContent = "Off";
    });

    // Add affordance
    const add = root.querySelector(".add");
    add.hidden = this._shown >= MAX_SLOTS;
    add.querySelector(".free").textContent = "· " + (MAX_SLOTS - this._shown) + " slots free";
  }

  _rel(delta) {
    const m = Math.round(delta / 60);
    if (m <= 0) return "now";
    if (m < 60) return "in " + m + " min";
    const h = Math.floor(m / 60), mm = m % 60;
    return "in " + h + " h" + (mm ? " " + mm + " min" : "");
  }
}

customElements.define("sac-alarms-panel", SacAlarmsPanel);
