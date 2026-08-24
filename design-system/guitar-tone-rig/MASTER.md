# YUHUAN Rig Control Console — Design System

**Updated:** 2026-08-21 (refinement pass)
**Category:** Audio equipment control dashboard / personal rig utility
**Design direction:** Lo-fi analog studio utility, muted earth tones, restrained terracotta status accent
**Density:** 7/10 — compact enough for parameter work without crowding touch controls

## Product model

This is an application, not a documentation landing page. The primary loop is:

1. Choose a voice preset.
2. Choose one signal stage.
3. Adjust and compare its controls.
4. Open reference material only when needed.

Four destinations — overview, workbench, signal chain, library — plus the device
detail, reached by two paths: the chain (board → voice → controls → device) and
the library (browse or search → device).
Reference material is not a destination: it sits next to the device, parameter
or stage it describes. A device page links to its neighbours in the chain so the
rig can be walked in the order it is actually dialled in.

The overview is a status console. Long instructions use progressive disclosure. The workbench never renders every device as one continuous control wall.

## Responsive architecture

| Viewport          | Navigation                                                      | Workspace                                                                             |
| ----------------- | --------------------------------------------------------------- | ------------------------------------------------------------------------------------- |
| 320–1023 px       | Compact sticky top identity + fixed four-item bottom navigation | Single column; horizontally scrollable preset and device selectors; one active device |
| 1024–1439 px      | Fixed 256 px desktop sidebar                                    | Device navigator + parameter editor                                                   |
| 1440 px and above | Fixed 256 px desktop sidebar                                    | Device navigator + parameter editor + sticky preset context                           |

- Mobile-first CSS.
- Required visual checks: 375, 768, 1024, and 1440 px.
- Fixed navigation reserves content space and safe-area insets.
- Page-level horizontal scrolling is forbidden, and local horizontal rails are
  avoided too: a sideways scroller inside a vertically scrolling page hides its
  own tail. Preset tabs, device tabs and the signal chain wrap onto more rows;
  below `sm` a table becomes a stack of labelled rows.
- Every interactive target is at least 44 px high.

## Color tokens

| Role                             | Value     |
| -------------------------------- | --------- |
| Background                       | `#181613` |
| Deep background                  | `#11100E` |
| Surface                          | `#201D19` |
| Raised surface                   | `#29251F` |
| Analog neutral                   | `#756B5C` |
| Foreground                       | `#EEE7D9` |
| Muted foreground                 | `#B8AD99` |
| Accent / active / primary action | `#C67B5C` |
| Accent hover                     | `#D59672` |
| Warning                          | `#C9A35F` |
| Danger                           | `#C8756B` |

Terracotta is reserved for active navigation, selected controls, primary actions, status indicators, and focus. The palette stays warm and low-saturation; subtle analog texture is allowed, while VHS movement and heavy grain are not.

## Typography

- Body: Fira Sans, 400–700.
- Technical labels and data: Fira Code, 400–600.
- One modular scale, declared as `--text-3xs` … `--text-lg` (10/11/12/13/14/16 px).
  `validate:app` fails on any `font-size` in the stylesheet outside it. Headings
  use `clamp()`; nothing else invents a size.
- Page titles use Fira Sans with tight tracking; technical labels use uppercase Fira Code.
- Body copy stays between 14–16 px with at least 1.6 line height.

## Components

- `console-panel`: flat, one-pixel border, limited shadow, 14–15 px radius.
- `device-row`: compact navigational row with stage index, role, and explicit hover/focus state.
- `parameter`: hardware-inspired control surface; edited state gets an orange left rail.
- `disclosure`: native `details/summary` for reference and troubleshooting sections.
- `preset-tabs` and `device-tabs`: local horizontal rails on mobile; vertical device tabs on desktop.
- `control-group`: one front-panel section of a device, labelled from `devices.json`. The workbench groups by section and orders by catalog order; authoring order in `rig.json` is never display order.
- `range-field`: slider with the JSON recommended range drawn as a band on the track. The native appearance is switched off because Chrome's `accent-color` fill would hide the band.
- `state-badge`: per-setting `provisional` / `needs-calibration` / `verified`.
- `pedal-graphic`: schematic enclosure generated from `devices.json`, knobs bound
  to the live values. It is a diagram, never a photograph — a drawing generated
  from the data cannot fall out of date with it, and the knob sweep on a voice
  change is the fastest read of what that voice does. Unset controls are dimmed
  rather than parked at mid-travel.
- `PageHeader`, `SectionHeader`, `Kicker`, `Notice`, `Disclosure`, `StepList`, `InfoCard`, `DataTable`, and `Metric`: shared content primitives. A page must not hand-roll a card or a table wrapper; extend the primitive instead.
- Buttons and navigation never rely on color alone; active items retain icon and structural treatment.

## Scrollbars

- Global page scrollbar uses a thin warm-charcoal track and rounded terracotta thumb.
- Local horizontal rails and table scrollers use a quieter analog-neutral thumb on a transparent track.
- Thumb hover may brighten one token step; scrollbar styling must not reduce keyboard or touch scrolling.

## CSS architecture

- Hand-written component classes live in `@layer components`; base resets in `@layer base`; tokens unlayered in `:root`.
  Unlayered rules outrank every Tailwind utility, so a component class that declares `display` silently defeats `lg:hidden`.
- `justify-content` and `align-items` require a flex or grid `display` in the same selector's declarations.
- Typography scale comes from `Kicker` and the `.kicker` class, not from repeated `text-[10px] tracking-[...]` utilities.
- Zero padding comes from `pad2()`.

## Interaction and accessibility

- Use semantic `main`, `nav`, `aside`, `section`, `details`, labels, and table headings.
- `role="tab"` requires a `tabpanel`, `aria-controls`, and arrow-key navigation. Where a control selects app-wide state rather than switching panels on the page, use `role="radiogroup"` instead.
- Every `label[for]` must resolve to an element with that id; a renderer that emits no labelable element uses a `span` plus `aria-labelledby`.
- Interactive boundaries and the focus ring meet WCAG 1.4.11 (3:1); text meets
  1.4.3 (4.5:1). Both are computed from the tokens by `validate:app` against
  every surface in the ramp, not asserted by eye.
- Keep the skip link and visible focus ring.
- Preserve route deep links and browser navigation.
- Respect `prefers-reduced-motion`; no storytelling, parallax, or staggered card entrances.
- Motion is only allowed where it carries state: knobs turning to their value,
  an LED following bypass, a pulse showing signal direction. Nothing moves to
  decorate.
- Avoid hover transforms that shift layout.
- Controls remain usable at 200% zoom.

## Anti-patterns

- Documentation-style oversized hero.
- One long page containing all presets, devices, controls, instructions, and troubleshooting.
- Desktop top navigation duplicated as mobile popover navigation.
- Mixed sidebar and bottom navigation at the same breakpoint.
- Low-contrast borders or muted text.
- Universal large rounded cards and decorative glow.
- Mobile page-level horizontal overflow.
- A route reachable only from the sidebar or footer, both of which are `lg`-only.
- A page that exists to collect links or definitions belonging to something else.
- The same destination linked twice in one section.
- A flat control wall that ignores a device's declared `sections`.
- Fixed card heights that leave large dead space under short content.

## Enforcement

`npm run validate:app` fails the build on the mechanically checkable items above: cascade layering,
inert flex properties, computed contrast for borders/focus/text against all four surfaces, font sizes
outside the type scale, mobile-orphaned routes, hard-coded zero padding, and hard-coded dev ports.
Adding a rule here without adding its check is how this document drifted from the implementation before.
