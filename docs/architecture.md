# Architecture

## Layers

Dependencies point one way: pages → components → lib → types/data. Nothing in
`lib/` imports a component, and nothing below `lib/rig.ts` imports the JSON.

| Layer              | Owns                                                        | Depends on            |
| ------------------ | ----------------------------------------------------------- | --------------------- |
| `schemas/`         | The contract. Generates `src/types.generated.ts`.           | —                     |
| `data/`            | The rig itself.                                             | `schemas/`            |
| `src/lib/*` (pure) | Domain logic. Takes its data as arguments.                  | `src/types`           |
| `src/lib/data.ts`  | The only module that imports the JSON.                      | `data/`, `src/types`  |
| `src/lib/rig.ts`   | Composition root: binds the pure functions to the real rig. | pure lib + `data.ts`  |
| `src/store/`       | Browser-only tuning state.                                  | `lib/rig`             |
| `src/components/`  | Rendering and interaction.                                  | `lib/`, `store/`      |
| `src/pages/`       | Route composition.                                          | `components/`, `lib/` |

## Why the pure/bound split

`panel.ts`, `value.ts`, `clock.ts`, `chain.ts`, `pedalGeometry.ts` and
`export.ts` never import `data.ts`. They take a `Device`, a `Setting[]`, a
`Rig` — whatever they need — as arguments. That is what lets the tests build a
three-knob fixture pedal and assert layout behaviour without loading the real
rig, and what stops a change to the rig from breaking unrelated tests.

`lib/rig.ts` is the one place those functions meet the real data. Components
import from there; tests import the pure modules directly.

## Module map

```
src/lib/
  clock.mjs          07:00–17:30 half-hour scale — plain ESM, shared with scripts/
  value.ts           Setting -> value -> 0..1 position, and back (positionValue, nudge)
  panel.ts           which controls are on the enclosure, and their state
  pedalGeometry.ts   where they sit, in enclosure units
  chain.ts           signal order, adjacency, and placement (chain vs reference)
  merge.mjs          preset inheritance — shared with scripts/, hence plain ESM
  export.ts          local tuning -> rig.json / tuning-log blocks
  format.ts          pad2, truncate
  data.ts            the JSON singletons
  rig.ts             composition root

src/components/
  primitives/        Kicker, PageHeader, SectionHeader, Notice, Disclosure,
                     StepList, InfoCard, DataTable
  DeviceEvaluation   ComparisonTable and ChainEvaluation for reference devices
  pedal/             PedalGraphic (composition), parts.tsx (presentational SVG),
                     usePedalControl.ts (pointer + keyboard), Pedalboard
  parameters/        ParameterControl, DeviceParameters, renderers
```

## On the board, or on the shelf

Every catalog entry declares a `placement`. `chain` means it is routed right
now and must appear in `rig.signalChain`; `reference` means it is kept only to
be compared against, must _not_ appear on the chain, and carries no settings in
any voice. `scripts/validate-data.mjs` checks both directions, so the catalog
and the diagram cannot drift apart.

Each guide carries exactly one of two things, and the validator enforces the
symmetry: a chain device has `chainRole[]` (the job this position does, and
what it must not be asked to do); a reference device has `evaluation` (the
positions considered, each judged on its own, plus the verdict and the cost of
adopting it). Both may carry `comparisons[]`. Everything names devices by id,
so a comparison cannot outlive the pedal it names.

An **open slot** is the third case: a job with no device at all, living in
`rig.json` rather than the catalog. There is nothing to model — no controls, no
panel to draw — only a decision that has not been made and a shortlist of
candidates. Reference device and open slot are not the same shape on purpose.

Rig-level knowledge that no single device owns lives in `rig.json` too:
`calibration` (the order this chain is dialled in from nothing),
`diagnostics[]` (symptoms that span more than one pedal — anything scoped to
one device belongs in that device's `troubleshooting`), and `safetyRules[]`.
A safety rule names the devices it constrains, and the device page renders the
rules that name it; that is why there is one copy rather than a rule in
`rig.json` plus a near-identical `warning` on the device.

## One fact, one field

Three rules that keep the catalog from saying the same thing twice:

- `control.type` is the **shape** and nothing else. Where it lives is `surface`,
  how many positions it has is `options`, what it reads is `valueType`. That is
  why there is no `software-toggle` or `three-way-toggle` — both were a second
  copy of a neighbouring field. Seven values, closed.
- A setting's `confidence` is how much that **value** has been earned. It is
  named apart from `rig.status` and `preset.status` because those are three
  different scales, and sharing `status` invited reading the wrong one.
- Every panel control on a chain device must have a setting in some voice. When
  the right position genuinely cannot be a number — a gain-staging knob that
  depends on the guitar and the room — that is what `target` is for. Silence is
  not an option, because a dimmed knob reads the same whether it was a decision
  or an oversight.

## Responsive values

`src/lib/responsive.ts` is the registry. A scale declares only _what value at
which viewport_; the `clamp()` is computed, not guessed:

```ts
'pedal-board': { min: 44, max: 66 }   // px per enclosure unit
```

`scripts/generate-responsive.mjs` turns the registry into
`src/responsive.generated.css` as `--scale-*` custom properties, and
`check-generated` fails on drift. CSS uses `var(--scale-pedal-board)`; a
component that needs the number uses `useFluid('pedal-board')`, reading the
same registry. Breakpoints are emitted as `--breakpoint-*` for the same reason.

`fluidAt` is the maths the browser runs, so the test suite asserts the curve
and then re-evaluates the emitted CSS against it — the two agree to 0.02px in a
real browser, which is the point of computing rather than eyeballing the `vw`
coefficient.

`validate:app` rejects a hand-written `clamp(... vw ...)` anywhere outside the
registry, and any `text-[Npx]` outside the type scale.

## The pedal drawing

Three separated concerns:

1. `lib/panel.ts` — _what_ is on the panel and at what value. Pure.
2. `lib/pedalGeometry.ts` — _where_ it sits, in enclosure units. Pure.
3. `components/pedal/parts.tsx` — _how_ it is drawn. Presentational, no state.
4. `components/pedal/usePedalControl.ts` — _how it is changed_. No drawing.

`PedalGraphic` composes them and is read-only unless given `onChange`, so the
same component serves the board, the library card and the editable device page.

Every pedal renders at the same px-per-unit, set by the container through
`--pedal-scale`, so relative sizes are true and one custom property resizes a
whole board. An editable drawing additionally grows until its smallest control
meets the 24px touch target, capped at its container.

## Testing

`npm run test` runs Vitest; `npm run check` runs it with coverage thresholds
(85% lines/functions, 80% branches) over `src/lib` and `src/components/pedal`.

Composition roots are excluded from coverage on purpose — `data.ts` and
`rig.ts` only wire things together, and asserting on the real rig's contents
would make the tests fail every time a knob value changes. What is worth
testing is the logic that decides what a value _means_.
