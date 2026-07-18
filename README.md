# LaserCAD

Parametarski CAD sistem za lasersko rezanje kutija i drugih konstrukcija od
pločastih materijala (lesonit, MDF, HDF, šperploča, akril, PVC, karton).
Korisnik opiše šta želi prirodnim jezikom ("Napravi kutiju za bocu vina.") i
aplikacija generiše potpuno parametarski, proizvodno-spreman model: kerf i
tolerancija kompenzacija, prstasti (finger/box) spojevi, mortise/tenon,
living hinge, snap-fit, prave laserom-rezane šarke (knuckle hinge),
2D/3D pregled i export u SVG/DXF/PDF/EPS/AI/LightBurn.

## Arhitektura

```
src/
  core/                 Čist TypeScript, bez ijedne zavisnosti na React —
                         matematika/geometrija potpuno odvojena od UI-ja.
    geometry/            Vector2, Polygon offset (kerf), intersection/collision
    materials/           Materijal presetovi, debljina, kerf, tolerancije
    joints/               Finger/box joint, living hinge, mortise/tenon,
                         snap-fit, screw/magnet holes, knuckle hinge
    validation/           Provjera geometrije, kolizija, strukturalna upozorenja
    shapes/               Generator po tipu predmeta (box, wine-box,
                         test-tube-rack, tool-organizer, shelf, birdhouse,
                         phone-stand) + zajednički panelBuilder
    svg/                  Multi-layer SVG builder (cut/engrave/score/text/
                         center/reference), sheet layout (nesting), hatch fill
    export/               DXF / PDF / EPS / AI / LightBurn (.lbrn2) writeri
    nlu/                  Heuristički parser prirodnog jezika + LLM adapter
                         interfejs (spreman za pravu LLM integraciju)
    model/                Zajednički Design/Panel tipovi + 3D assembly poze

  app/                   React UI (Vite + Tailwind, tamna tema)
    components/           PromptBar, Material/ParameterPanel, 2D/3D pregled,
                         Warnings/Assembly/Export paneli
    state/                Zustand store
```

## Pokretanje

```bash
npm install
npm run dev      # dev server
npm run test     # vitest (unit testovi za geometriju/spojeve/NLU/export)
npm run build    # produkcioni build
```

## Proširivanje

- **Novi oblik**: dodati generator u `core/shapes/`, registrovati u
  `core/nlu/dispatch.ts` i dodati ključne riječi u `core/nlu/heuristicParser.ts`.
- **Novi spoj**: dodati u `core/joints/`, pa (ako mijenja konturu panela)
  registrovati kao novi `EdgeSpec` u `core/shapes/panelBuilder.ts`.
- **Novi materijal**: dodati u `MATERIAL_PRESETS` u `core/materials/material.ts`.
- **Pravi LLM umjesto heurističkog parsera**: implementirati `NluAdapter`
  interfejs (`core/nlu/types.ts`) — vidjeti `LlmNluAdapter` u
  `core/nlu/llmAdapter.ts` za kontrakt integracije.

## Poznata ograničenja (namjerno van obima ove verzije)

- Nesting/packing na listu je jednostavan "shelf" algoritam (bez rotacije
  dijelova radi optimalnog iskorištenja materijala).
- LightBurn export (.lbrn2) je "best effort" — format nije zvanično
  dokumentovan od strane proizvođača; uvoz generisanog SVG-a u LightBurn je
  garantovano pouzdaniji put.
- Foto-graviranje (halftone) i QR/barkod su podržani na nivou modela/SVG
  engine-a, ali još nisu povezani na UI za upload slike.
