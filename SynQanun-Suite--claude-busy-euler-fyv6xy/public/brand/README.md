# Brand assets

Do not edit, recolour, redraw, crop, or regenerate anything in this folder.
`brand-guidelines.md` §2 and §5 govern every file here. Always render them
through `components/brand/Logo.tsx` and `components/brand/FeatherMark.tsx`,
which enforce minimum sizes, clear space, and the no-mirroring rule.

## Files

| File in repo | Delivered as | Purpose |
|---|---|---|
| `synqanun-wordmark-en.png` | `synqanun png.png` (1080×1080 PNG) | English wordmark — primary mark for English contexts |
| `synqanun-wordmark-ar.png` | `Synqanun arabic png.png` (1080×1080 PNG) | Arabic wordmark — a distinct native-script lockup, **not** a mirror of the English mark |
| `synqanun-feather.png` | `synqanun_feather.png` (48×48 PNG) | Feather mark — favicon, app icon, and the "AI is present/acting" motif |

Files were renamed on import for legibility; content is byte-identical to what
was delivered. `brand-guidelines.md` §2.1 refers to them by their original
names (`synqanun_png__2_.png`, `Synqanun_arabic_png__1_.png`,
`_Feathre_logo_synqanun.ico`) — the table above is the mapping. The feather was
supplied as PNG rather than the ICO the guidelines list.

`app/icon.png` is a copy of the feather, which Next.js serves as the favicon.

## Measured geometry

All three files are square canvases with a large transparent margin — the
artwork does not fill the frame. `components/brand/assets.ts` records the
measured bounding box of each mark so the components can size and position the
untouched file by the artwork rather than by the canvas. Recompute those
numbers if any asset is ever replaced.

| File | Canvas | Artwork | Offset |
|---|---|---|---|
| `synqanun-wordmark-en.png` | 1080×1080 | 813×415 | x 133, y 333 |
| `synqanun-wordmark-ar.png` | 1080×1080 | 730×479 | x 175, y 300 |
| `synqanun-feather.png` | 48×48 | 12×34 | x 18, y 7 |

## ⚠ Outstanding: vector masters

`brand-guidelines.md` §2.1 and §8: all three marks were delivered as raster
only, and the guidelines instruct that true vector (SVG/AI/EPS) masters be
requested from whoever designed the originals **before production use**.

- The **wordmarks** are fine at every size this UI currently uses, but will
  blur in hero lockups, print and signage.
- The **feather is the blocking one.** Its artwork is 12×34px. That is enough
  for a favicon and adequate as a 20–24px inline AI marker, but
  `brand-guidelines.md` §5 also wants it as an empty-state illustration and an
  animated "agent is thinking" indicator — both larger than the pixels that
  exist. §2.1 caps raster use at 48×48 and says to re-render anything bigger
  from a redrawn vector.

This needs resolving before Batch 5 (AI surfaces). It does not block Batch 0.

Two other assets do not exist yet and will be needed:

- A **flattened single-colour** version of each mark, for dark and
  photographic backgrounds (§2.4, §5). Required before dark mode.
- `{{CLIENT_LOGO_LIGHT}}` / `{{CLIENT_LOGO_DARK}}` placeholders — these are
  supplied per tenant at runtime and must never be committed here
  (`brand-guidelines.md` §7.3).
