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
| `dashboards/alarms.yaml` | `dashboards/alarms.yaml` | The **Alarms** dashboard (YAML mode, `sections` layout, built-in cards). Registered in `configuration.yaml` under `lovelace.dashboards`. |
| `dashboards/alarms-card.yaml` | — | Paste-in card variant of the same view (for adding to an existing dashboard). |
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

## Deploy notes

- NAS is authoritative for runtime (`~/Git/home-lab/ha/`). Copy over SSH; Docker
  at `/usr/local/bin/docker`; restart with `docker restart homeassistant`.
- Custom integrations and themes load at **startup only** — restart after changes.
- Validate before restarting:
  `docker exec homeassistant python3 -m homeassistant --script check_config -c /config`
