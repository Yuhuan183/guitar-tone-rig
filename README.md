# Guitar Tone Rig

React 是互動介面；`data/` 是可維護的設定來源。Zustand 只保存瀏覽器內的試調值，不會直接改寫 JSON——但工作台可以把試調結果匯出成可貼回 JSON 的區塊。

## Frontend

- React + TypeScript + Vite
- Zustand persisted store，含版本號與 rehydrate 時的孤兒 override 清理
- Tailwind CSS v4；手寫 component class 一律放在 `@layer components`
- Hash Router，可直接以本機檔案或靜態站台開啟
- dev／preview port 由專案路徑推導後探測，見下方「Ports」
- 字型自 host（`@fontsource`），離線不掉字

## Files

| 路徑                      | 內容                                                             |
| ------------------------- | ---------------------------------------------------------------- |
| `data/devices.json`       | 效果器、面板區塊（`sections`）、控制項、值型別、範圍與調節方向。 |
| `data/rig.json`           | 訊號鏈、路由、安全規則、共用基準與五組音色 Preset。              |
| `data/device-guides.json` | 各效果器的調節取向、Troubleshooting、控制項說明與原廠資料來源。  |
| `data/tuning-log.json`    | 實機調教紀錄。                                                   |
| `schemas/`                | JSON Schema 2020-12，是型別與驗證的唯一契約。                    |
| `src/types.generated.ts`  | 由 `schemas/` 產生，請勿手改。                                   |

```sh
npm install
npm run dev
npm run build
```

## 頁面

三個目的地，加上效果器詳細頁：

| 路徑            | 用途                                                                             |
| --------------- | -------------------------------------------------------------------------------- |
| `/`             | 現在載入哪一組音色、訊號鏈長什麼樣。鏈上每一級就是效果器的入口。                 |
| `/presets`      | 音色工作台：選音色 → 選一級 → 調參數 → 匯出回 JSON。                             |
| `/signal-chain` | Gain Stacking、Gate 拓樸、電源與接地、安全規則，以及暫時不放進鏈上的 Gain。      |
| `/devices/:id`  | 單一效果器的參數、調節取向、診斷、信心邊界與原廠來源；底部可直接走到前／後一級。 |

原本的 `/data-model`、`/references`、`/alternatives` 已移除——那三頁是「跟某個東西有關、卻放在別處」的集散地。參數表示法與狀態定義進了工作台的說明區，各器材的信心邊界與原廠連結進了該器材頁，Gate 與備選 Gain 的連結進了訊號鏈頁。同一個 URL 不會再出現在兩個地方（`validate:data` 會擋）。

## 面板示意圖

效果盤與效果器頁上的圖是 **SVG 示意圖，不是產品照片**，由 `data/devices.json` 產生：

- 每個控制項有 `surface`（`panel` / `software` / `derived`）決定它畫不畫在機殼上；`src/lib/panel.ts` 的 `PANEL_SHAPES` 決定它畫成旋鈕、撥桿、腳踏開關還是 LED 表頭。兩者不同步時 `validate:app` 會失敗。
- **旋鈕角度取自目前音色的實際設定值**，切換音色時會轉過去，在工作台拖滑桿時也會即時跟著動。
- 這個音色沒有指定的控制項畫成暗色，不會停在正中央假裝有值。
- 機殼比例與顏色在 `appearance`，是示意用的，可以自行調整。

因為圖是資料產生的，它不可能跟資料脫節——這是選示意圖而不是照片的主要理由。

## Ports

Port 不寫死，也不用 Vite 從 5173 往上加——那只會撞到下一個專案。`scripts/pick-port.mjs`
以專案路徑的 hash 在 **20000–39999** 取一個基準 port（避開常用的 3000/5173/8080 一帶，
也避開 macOS/Linux 的 ephemeral 範圍 49152–65535），再實際嘗試 bind：

- **同一個 checkout 每次都是同一個 port** — 書籤、proxy 設定不會失效。
- **不同 checkout 是不同 port** — 兩個專案同時開不會撞。
- **已經有人在聽的 port 會被跳過** — 往上探測最多 64 個。

要指定就用環境變數：

```sh
PORT=3000 npm run dev
PREVIEW_PORT=4000 npm run preview
```

啟動時 Vite 會印出實際使用的位址。

## Maintenance contract

1. 效果器新增控制項：先改 `data/devices.json`，並確認它的 `section` 已在該效果器的 `sections` 宣告。
2. 音色改值：改 `data/rig.json`。
3. 器材知識（原則、Troubleshooting、控制項說明）：改 `data/device-guides.json`，不要寫進 React 元件。
4. 改了 `schemas/` 之後執行 `npm run generate:types`。
5. 每次實機測試：先記 `data/tuning-log.json`。
6. 只在聽感穩定且測試條件完整時，把 Setting 或 Preset 改為 `verified`。
7. 修改後執行：

   ```sh
   npm run check
   ```

## 從工作台回寫 JSON

工作台的「把本機微調寫回 JSON」會把這組音色的本機試調整理成 Before／After 表，並產生兩種可直接貼回的區塊：

- **rig.json 覆寫區塊**：貼進對應 preset 的 `settings`。`status` 一律輸出 `needs-calibration`——在瀏覽器裡調過不等於用耳朵確認過。
- **tuning-log 測試紀錄**：補上吉他、拾音器、監聽、音量與保留／退回理由後，加進 `sessions`。

查看合併後的完整 Preset：

```sh
node scripts/show-preset.mjs mayer-asato-clean
```

## 架構

模組分層與相依方向見 [`docs/architecture.md`](docs/architecture.md)。重點：`src/lib/` 的領域邏輯全部把資料當參數收，只有 `lib/data.ts` 碰 JSON，`lib/rig.ts` 是唯一的組裝點。測試直接測純模組，不必載入真實 rig。

## RWD

所有隨視窗寬度變化的值集中在 `src/lib/responsive.ts`。一個 scale 只宣告「在哪個視窗寬度該是多少」，`clamp()` 由程式算出來，不是手調 `vw` 係數：

```ts
'pedal-board': { min: 44, max: 66 }   // 每個機殼單位幾 px
```

`npm run generate:responsive` 產生 `src/responsive.generated.css`（`--scale-*` 與 `--breakpoint-*`）。CSS 用 `var(--scale-pedal-board)`，需要數字的元件用 `useFluid('pedal-board')`，兩邊讀同一份登錄表。改了 `responsive.ts` 沒重新產生，`npm run check` 會擋。

## Checks

`npm run check` 依序執行下列項目，CI（`.github/workflows/check.yml`）跑同一組：

| 指令                         | 檢查內容                                                                                             |
| ---------------------------- | ---------------------------------------------------------------------------------------------------- |
| `npm run validate:data`      | 以 ajv 對 `schemas/` 實際驗證四份文件，再檢查跨文件參照（controlId、section、category、preset 等）。 |
| `npm run validate:generated` | `src/types.generated.ts` 與 `schemas/` 是否同步、`data/` 格式是否符合 `format-data`。                |
| `npm run typecheck`          | `tsc -b`。                                                                                           |
| `npm run lint`               | ESLint（含 react-hooks）。                                                                           |
| `npm run format:check`       | Prettier。                                                                                           |
| `npm run validate:app`       | 路由與本機連結，加上 `design-system/` 可機械驗證的條款（見下）。                                     |

`validate:app` 會擋掉的 design system 違規：

- 手寫 component class 沒有包在 `@layer components`（會壓過 Tailwind utilities，`lg:hidden` 會失效）。
- 宣告 `justify-content`／`align-items` 卻沒有 flex/grid display。
- 邊界、focus ring 與各級文字色對四層 surface 的實算對比不足（3:1／4.5:1）。
- 在 `src/lib/responsive.ts` 以外手寫 `clamp(... vw ...)`。
- 元件裡用 `text-[Npx]` 之類的任意字級。
- `font-size` 不在 `--text-*` 尺度內。
- 某條路由在手機上沒有導覽入口（sidebar 與 footer 都是 `lg` 以上才顯示）。
- 用 `0{n}` 寫死補零，而不是 `pad2()`。

## 版本

- `rigVersion`（`data/rig.json`）記錄這副 rig 的設定版本，目前 `0.1.0`，狀態 `draft-unverified`。
- `package.json` 的 `version` 是應用程式版本，與 `rigVersion` 各自獨立遞增。
