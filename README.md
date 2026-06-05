# 金马伦农友天气 · Cameron WeatherNext

A single-file Progressive Web App (PWA) delivering **highland farm weather +
microclimate fungal-disease risk alerts** for the vegetable, tea, strawberry
and flower farms of the Cameron Highlands, Pahang. Bilingual interface
(中文 / English) with optional AI-generated farming briefings.

Part of the WeatherNext family of per-region agricultural weather builds — this
is the **Cameron Highlands microclimate edition**.

---

## What makes this build special

Cameron Highlands is not lowland Malaysia. At 1,100–1,600 m it is cool
(≈12–24 °C), frequently fogged in, and its overnight humidity stays near
saturation for hours. Those are precisely the conditions that drive the
fungal diseases that cost highland farmers the most. So this build adds a
**microclimate disease-risk engine** on top of the normal forecast.

### 1. Microclimate zones
Each seeded farm carries an **elevation band** and a **microclimate zone**
(valley / fog-pool / mid-slope / ridge). Disease pressure is adjusted per zone,
because a foggy valley holds leaf wetness far longer than an airy ridge a few
kilometres away:

| Zone | Multiplier | Why |
|---|---|---|
| Fog zone (Blue Valley, Kg. Raja) | x1.30 | Persistent fog, longest leaf wetness |
| Valley / moisture pool (Ringlet, Bertam) | x1.20 | Cold air & moisture settle overnight |
| Mid-slope main belt (Tringkap, Kuala Terla Tea Estate, Brinchang) | x1.00 | The main growing belt |
| Ridge (Kea Farm upper) | x0.90 | Windier, dries faster |

| Elevation | Effect |
|---|---|
| ~1200 m | Warmer low band |
| ~1400 m | Main agricultural belt |
| ~1600 m | High-humidity band |
| 1800 m+ | Cold / fog |

### 2. Disease Risk Index (the headline feature)
For every farm and every day in the 7-day window, the app computes a 0-100
risk score for three diseases that matter most in the highlands:

| Disease | Driven mainly by |
|---|---|
| Botrytis (gray mould) | RH >= 90 %, long leaf wetness, 15-22 C, fog persistence |
| Downy mildew | Very high RH + long leaf wetness + cool nights |
| Late blight | Sustained wetness + cool 10-18 C + consecutive rain/cloud |

Each score is multiplied by a **crop-susceptibility factor** (e.g. strawberry
is Botrytis-prone x1.3; leafy veg is mildew-prone x1.2; tea is low-risk) and
the zone multiplier above, then classified:

| Score | Band | Action |
|---|---|---|
| 0-30 | Low | Manage as usual |
| 31-55 | Moderate | Scout fields, improve airflow |
| 56-75 | High | Prepare preventive spray |
| 76-100 | Critical | Spray promptly, improve drainage & airflow |

### 3. Leaf-wetness focus
Most fungal infection depends on *how long the leaf stays wet*, not simply
whether it rained. Where Open-Meteo provides a native
`leaf_wetness_probability`, the app uses it; otherwise it estimates wet-hours
from RH, dew-point spread, rain and cloud cover. The driving metrics
(leaf-wetness hours, high-RH hours, rain, mean RH, mean temp) are shown openly
so farmers can see *why* the risk is what it is.

The disease dashboard appears at the top of each farm's detail view, and a
coloured risk badge appears on every farm card on the home list. The AI
briefings are also altitude- and fog-aware, and are fed the computed risk
figures for the day.

---

## Live app

Once GitHub Pages is enabled, the app is served at:

```
https://stanleywoosweeleong.github.io/weathernextforcameronhighlands/
```

Open that link on a phone and use **"Add to Home Screen"** to install it as an
app. It works offline after the first visit (service-worker cached).

---

## Seeded zones

On first launch the app seeds these 15 Cameron Highlands farm zones. They are
auto-favourited and can be renamed, edited, or deleted freely afterwards. Add
as many more farms as you like from inside the app. Each zone ships with a
default crop and microclimate classification (editable per farm).

| English | 中文 | Coordinates | Elev | Zone | Default crop |
|---|---|---|---|---|---|
| Ringlet | 冷力 | 4.41453, 101.38415 | 1135 m | valley | leafy |
| Bertam Valley | 伯坦谷 | 4.39700, 101.38100 | 1100 m | valley | leafy |
| Habu | 哈布 | 4.44011, 101.38921 | 1300 m | mid-slope | tea |
| Tanah Rata | 丹那拉打 | 4.47135, 101.37565 | 1440 m | mid-slope | strawberry |
| Brinchang | 碧兰璋 | 4.49223, 101.38732 | 1470 m | mid-slope | strawberry |
| Kea Farm | 吉亚农场 | 4.50436, 101.40734 | 1530 m | ridge | leafy |
| Tringkap | 丁甲 | 4.51494, 101.42771 | 1450 m | mid-slope | leafy |
| Kampung Raja | 甘榜拉惹 | 4.56709, 101.40968 | 1470 m | fog | tomato |
| Blue Valley | 蓝谷 | 4.58322, 101.41243 | 1600 m | fog | leafy |
| Sungai Palas | 双溪巴拉斯 | 4.52250, 101.36700 | 1550 m | mid-slope | tea |
| Cameron Valley | 金马伦谷 | 4.43050, 101.40100 | 1180 m | valley | tea |
| Boh Tea Plantation | BOH 茶园 | 4.52000, 101.37000 | 1560 m | mid-slope | tea |
| Kuala Terla Tea Estate | 吉拉烈茶园 | 4.54800, 101.42000 | 1440 m | mid-slope | tea |
| Kampung Taman Sedia | 塔曼斯迪亚村 | 4.45800, 101.38400 | 1400 m | mid-slope | strawberry |
| MARDI Cameron Highlands | MARDI 农业站 | 4.46190, 101.38380 | 1420 m | mid-slope | leafy |

The app also seeds a default user display name (**金马伦 / Cameron**), which
stays editable via **Edit Name** in the app.

---

## API key — bring your own (important)

This app **does not ship with an embedded API key.** AI features (the farming
briefings) are powered by Google's Gemini API, and each user supplies their
own free key.

To enable the AI briefing:

1. Visit https://aistudio.google.com/app/apikey
2. Click **"Create API key"** — it's free.
3. In the app, open the **API Key** modal and paste the key (starts with `AIzaSy...`).

The key is stored only in that device's browser (`localStorage`) and is never
uploaded anywhere or committed to this repo. The core weather forecast **and
the disease-risk engine** work without a key — only the AI briefing needs one.

**Recommended for users:** restrict your key in Google Cloud Console
(Application restrictions -> Websites) to `stanleywoosweeleong.github.io/*`,
and limit it to the Generative Language API.

---

## Deploying

All 7 files live in the **repository root** — the service worker and manifest
use relative `./` paths, so a root deploy works with no changes.

```
index.html            — the app (single file: HTML + CSS + JS + disease engine)
manifest.json         — PWA metadata
sw.js                 — service worker (offline cache)
icon-512.png          — app icon 512x512
icon-192.png          — app icon 192x192
apple-touch-icon.png  — iOS home-screen icon 180x180
favicon-32.png        — browser tab icon 32x32
```

To enable GitHub Pages: **Settings -> Pages -> Source: Deploy from branch ->
`main` / `root`.** Pages serves over HTTPS automatically, which the service
worker requires.

> **Icons:** the four icon PNGs use Cameron-Highlands artwork (misty hills /
> tea-terrace theme). To change them, just replace the files — no code change
> needed; the boot screen and home-screen icon both reference `icon-192.png`.

### Updating the app

The service worker caches the app shell. When you push changes, bump the
`CACHE_VERSION` string at the top of `sw.js` so users receive the update on
their next visit. The current value is:

```
wnext-weathernextforcameron-202606060145
```

---

## Tech notes

- **Weather data:** Open-Meteo API (no key required, network-first with cache fallback).
  The build requests RH, dew point, leaf-wetness probability, precipitation,
  cloud cover, soil moisture/temperature, UV and radiation — everything the
  disease engine needs.
- **Disease engine:** rule-based, fully on-device; no key, no server. See the
  `MICROCLIMATE DISEASE-RISK ENGINE` block in `index.html`.
- **AI model:** `gemini-2.5-flash` via the Generative Language API (altitude/fog-aware prompts).
- **Storage namespace:** `weathernextforcameron__*` keys in `localStorage`,
  isolated from other WeatherNext regional builds so data never collides.
- **Cloud sync:** Firebase, namespaced under `appId: wnext-ag-v41-weathernextforcameron`.
- **Offline:** full app shell + last-fetched weather cached by the service worker.

---

## Disclaimer

The disease-risk scores are a **decision-support heuristic** based on weather
conditions and published infection thresholds — not a guarantee. They do not
replace field scouting or a qualified agronomist's judgment. Always confirm
with on-the-ground inspection before acting.
