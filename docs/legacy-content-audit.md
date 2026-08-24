# Legacy HTML content audit

Audit date: 2026-08-20

> **Status note (2026-08-24).** This is a dated record of a one-off migration,
> kept for the trail. Three destinations it names — `DataModelPage`,
> `AlternativesPage`, `ReferencesPage` — no longer exist: the routes were later
> collapsed to three, and their content moved into `PresetsPage`, per-device
> `evaluation` in `device-guides.json`, and per-guide `sources` respectively.

## Result

All knowledge from the legacy HTML pages is represented by the React UI,
structured JSON, or the maintenance documentation. Gaps found during the audit
were migrated before the legacy documents were reduced to redirect shims.

| Legacy page         | React destination                   | Migrated content                                                                       |
| ------------------- | ----------------------------------- | -------------------------------------------------------------------------------------- |
| `index.html`        | `DashboardPage`                     | Rig architecture, five voices, device roles, safety rules                              |
| `cali76.html`       | `DevicePage` + `GainReductionMeter` | Starting values, 3–5 dB simulation, control behavior, on/off guidance, buffer note     |
| `notadumble.html`   | `DevicePage`                        | Fixed order, Clean/Drive behavior, EQ/Presence, TRS loop, matching voices              |
| `ive.html`          | `DevicePage`                        | Saturation Cut direction, fixed settings, two roles, full troubleshooting, 9V warning  |
| `ir-d.html`         | `DevicePage`                        | Three gain structures, both channels, OX routing workflow, power amp/cab split         |
| `ox-stomp.html`     | `DevicePage` + preset workbench     | Routing, controls, five rigs, cab rationale, studio FX roles, six-step calibration     |
| `presets.html`      | `PresetsPage`                       | Baseline and overrides, five presets, channel values, first calibration, diagnostics   |
| `signal-chain.html` | `SignalChainPage`                   | Pre/Post EQ, stage ownership, gate topology/options, power and grounding               |
| `data-model.html`   | `DataModelPage`                     | Data layers, inheritance, value shapes, status fields, tuning workflow, local commands |
| `alternatives.html` | `AlternativesPage`                  | Aquaria placements, Klon amp bases, Empress overlap, add-back criteria                 |
| `references.html`   | `ReferencesPage`                    | Official links with scope descriptions and all listening/verification boundaries       |

## Gaps closed during audit

- Added detailed control behavior for Cali76, NOTADÜMBLË, IR-D, and OX Stomp.
- Restored the complete OX Stomp calibration order, connector details, mic roles,
  cabinet rationale, and post-cab effects split.
- Restored the seven-step first-rig calibration flow and cross-device diagnostics.
- Restored rig, preset, and setting verification-state definitions.
- Restored Pylon boost/cut ranges, grounding notes, and per-stage anti-patterns.
- Restored the four Aquaria placement/role decisions.
- Added source descriptions instead of retaining bare links only.

## Follow-up migration (2026-08-21)

Device guidance that the first migration parked in `src/content.ts` — principles,
troubleshooting, per-control notes and the reference list — moved to
`data/device-guides.json` under `schemas/device-guides.schema.json`. It is now
covered by the same contract as the rest of the knowledge base:
`controlNotes` keys are checked against `devices.json`, and every device must
have a guide.

## Consolidation (2026-08-21)

Three routes were removed after the content they held was moved next to what it
describes:

| Removed                                  | Content went to                                                                                                                                                                         |
| ---------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `data-model.html` → `DataModelPage`      | Value shapes and verification states are a disclosure in the workbench, where the badges they explain appear. The rest is the README.                                                   |
| `references.html` → `ReferencesPage`     | Official links became `guide.sources` per device; confidence boundaries became `guide.caveats`. Non-rig gear links moved to the gate and parked-gain sections of the signal chain page. |
| `alternatives.html` → `AlternativesPage` | Condensed into a disclosure on the signal chain page, which already owns gain-staging overlap.                                                                                          |

`validate:data` now rejects a duplicate source URL, so the flat reference list
cannot grow back.

## Cleanup policy

The legacy HTML files, stylesheet, and JavaScript were removed after migration.
The application now uses only the Vite/Node entry point and React routes; legacy
bookmarks are intentionally unsupported.
