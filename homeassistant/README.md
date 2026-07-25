# Home Assistant — configuration sources

Version-controlled sources for the Home Assistant instance running on the NAS
(`homeassistant` container, host networking, `http://server.home:8123`).

> **Why this dir exists.** The live HA config directory (`ha/`) is **gitignored**
> — runtime config isn't tracked. This `homeassistant/` folder holds the *canonical
> sources* worth version control (theme, dashboards, automations); deploy them
> into the live `ha/` tree on the NAS as described below.

## Layout

| Path | Deploy to (on NAS, under `ha/`) | What it is |
|---|---|---|
| `themes/mart.yaml` | `themes/mart.yaml` | **"Mart's Theme"** — household-wide *Japandi, technical* theme (beige + oak), matched light/dark modes. Whole-environment (sidebar, dialogs, inputs), not one dashboard. Pure CSS-variable overrides — no HACS. |
| `www/alarms-panel.js` | `www/alarms-panel.js` | **The Alarms screen** — a bespoke custom panel (sidebar route `/alarms`), a single web component wired to the live entities and inheriting the active theme. This is the primary alarms UI. Registered in `configuration.yaml` under `panel_custom`. |
| `dashboards/alarms.yaml` | `dashboards/alarms.yaml` | Older stock-card **Alarms** dashboard (YAML mode, `sections`). Superseded by the panel above; kept as a no-JS fallback. |
| `dashboards/alarms-card.yaml` | — | Paste-in card variant of the stock-card view (for adding to an existing dashboard). |
| `automations/nightly-alarm-reminder.yaml` | append to `automations.yaml` | Optional 21:00 "set an alarm?" actionable notification + its button handler. |

The alarm entities themselves come from the **smart_alarm_clock** custom
integration, which lives in its own repo (`MartBent/smart-alarm-clock`, under
`homeassistant/custom_components/`) — it's the device driver and is versioned
with the firmware, not here.

## Theme — install & make it the household default

1. Copy `themes/mart.yaml` → `ha/themes/mart.yaml`.
2. Ensure `configuration.yaml` loads themes:
   ```yaml
   frontend:
     themes: !include_dir_merge_named themes
   ```
3. Make it the default for everyone via a startup automation in
   `configuration.yaml` (already applied on the NAS):
   ```yaml
   automation manual:
     - id: default_household_theme
       alias: Default theme
       trigger:
         - platform: homeassistant
           event: start
       action:
         - service: frontend.set_theme
           data:
             name: "Mart's Theme"
       mode: single
   automation ui: !include automations.yaml
   ```
4. Restart HA (`docker restart homeassistant`). Every user on *"Backend-selected
   theme"* inherits it, in **Auto** light/dark. Per-user picks still override.

## Alarms panel — install

1. Copy `www/alarms-panel.js` → `ha/www/alarms-panel.js` (served by HA at `/local/alarms-panel.js`).
2. Register it in `configuration.yaml`:
   ```yaml
   panel_custom:
     - name: sac-alarms-panel      # must match customElements.define() in the JS
       sidebar_title: Alarms
       sidebar_icon: mdi:alarm
       url_path: alarms
       module_url: /local/alarms-panel.js
       embed_iframe: false
       require_admin: false
   ```
3. Restart HA. It appears in the sidebar as **Alarms**.

It reads the `smart_alarm_clock` entities (`sensor.*_phase`, `sensor.*_time`,
`switch.*_alarm_1..8`, `time.*_alarm_1_time..8`, `button.*_snooze|_dismiss`) and
writes via `switch.turn_on/off`, `time.set_value`, `button.press`. Colour comes
entirely from the active theme (it reads HA CSS variables); times are 24-hour.
Shows the first 3 slots, with an "add" affordance up to 8.

## Deploy notes

- NAS is authoritative for runtime (`~/Git/home-lab/ha/`). Copy over SSH; Docker
  at `/usr/local/bin/docker`; restart with `docker restart homeassistant`.
- Custom integrations and themes load at **startup only** — restart after changes.
- Validate before restarting:
  `docker exec homeassistant python3 -m homeassistant --script check_config -c /config`
