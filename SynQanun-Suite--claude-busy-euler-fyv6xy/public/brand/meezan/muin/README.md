# معين (Mu'een) — the assistant's face

Supplied by the client in October 2026: one portrait, one idle loop, and one
lip-synced greeting clip with its audio. Rendered through
`components/mueen/MueenStage.tsx`, which reads them from
`lib/mueen/avatar.ts` and never from a path written in a component.

## Files

| File | Size | What it is |
|---|---|---|
| `muin-avatar-128.webp` | 4.8 KB | 128px circle — the floating launcher |
| `muin-avatar-512.webp` | 25.7 KB | 512px circle — the panel's still, under `prefers-reduced-motion` |
| `muin-idle.mp4` / `.webm` | 51.5 / 49.8 KB | The resting loop, 5.04s, **no audio track** |
| `muin-idle-poster.webp` | 6.0 KB | First frame, behind the loop while it arrives |
| `muin-greeting-ar.mp4` / `.webm` | 127.7 / 133.9 KB | The recorded greeting, 6.29s, Arabic, with sound |

A browser downloads **one** of each mp4/webm pair — `<source>` elements are
tried in order and the first supported one wins — so the pair costs the larger
file, never the sum. mp4 is listed first: h.264/AAC plays everywhere video
plays at all, and for the greeting it is also the smaller of the two.

## Why the avatar is cut from the clip, not from the portrait

The supplied portrait is a three-quarter pose on a grey backdrop; the clips are
head-on on a warm one. Using the portrait on the launcher and the clip in the
panel put two visibly different photographs of the same person on one screen.
Both stills here are frames of the idle loop, so the button and the panel are
the same shot.

They are circle-cropped **at build time** rather than masked with
`border-radius`: the file that ships is the circle, so it survives anywhere the
radius does not apply, and no bytes are spent on corners nobody sees. That is
also why they are served with `unoptimized` — see MueenStage for the
measurements.

## Why the idle loop is silent

It is rendered muted and looping. Its audio would be bytes nobody could ever
hear, and a muted autoplaying element that still carries an audio track is the
thing browsers block. Encoded with `-an`.

## Why there is no greeting poster

A `<video poster>` is fetched **even under `preload="none"`**. Measured at
19.3 KB on every panel open, for a frame that was never visible: the greeting
element is invisible until play is pressed, and by then it is showing real
frames. The resting loop sits behind it and covers the gap, so the file was
deleted. Do not add one back without re-measuring what it costs.

## Encoding

ffmpeg 9.0.2. The sources were 960×960 at 24fps — 8.3 Mbps for the greeting and
3.3 Mbps for the idle, one to two orders of magnitude more than a talking head
at panel size needs. **480×480 is where ~98% of the saving came from**, and it
is still 3× the 152px stage.

```sh
SCALE="scale=480:480:flags=lanczos"

# Idle loop — silent
ffmpeg -i idle.mp4 -an -vf "$SCALE" \
  -c:v libx264 -profile:v main -pix_fmt yuv420p -crf 30 -preset slow \
  -movflags +faststart muin-idle.mp4
ffmpeg -i idle.mp4 -an -vf "$SCALE" \
  -c:v libvpx-vp9 -crf 38 -b:v 0 -row-mt 1 -deadline good -cpu-used 2 \
  muin-idle.webm

# Greeting — keeps its audio
ffmpeg -i demo-greeting-ar.mp4 -vf "$SCALE" \
  -c:v libx264 -profile:v main -pix_fmt yuv420p -crf 29 -preset slow \
  -c:a aac -b:a 64k -ac 1 -movflags +faststart muin-greeting-ar.mp4
ffmpeg -i demo-greeting-ar.mp4 -vf "$SCALE" \
  -c:v libvpx-vp9 -crf 37 -b:v 0 -row-mt 1 -deadline good -cpu-used 2 \
  -c:a libopus -b:a 48k -ac 1 muin-greeting-ar.webm

# Poster — 240px is plenty for a frame shown for a moment behind a video
ffmpeg -i idle.mp4 -frames:v 1 -vf "scale=240:240:flags=lanczos" \
  -c:v libwebp -quality 62 muin-idle-poster.webp
```

Quality was checked on a decoded frame at t=3s, not on the byte count.

## Page weight

A staff screen pays for the launcher only. Nothing else is fetched until an
avatar surface is opened — and because every way into معين greets you, opening
one fetches the greeting too.

| State | Added | Running total |
|---|---|---|
| Any staff screen | 4.8 KB (launcher still) | **4.8 KB** |
| An avatar surface opened, greeting plays | 185.2 KB (loop + poster + clip) | **190.0 KB** |
| …of which, if the greeting is never played | 57.5 KB (loop + poster) | **62.3 KB** |
| Reduced motion | 25.7 KB still + 127.7 KB clip, no loop | **158.2 KB** |

The floating panel, the Digest's voice view and the Assistant screen all share
one player, so none of them pays twice and none can fall out of step: see
`components/mueen/use-mueen-greeting.ts`.

## ⚠ Outstanding: the transcript

`lib/mueen/greeting.ts` holds the words of the recording and **is empty**. The
clip plays anyway — a greeting that refuses to greet is a broken demo, not a
careful one — and the caption slot says, on screen and in both languages, that
no transcript has been supplied.

**That is a known WCAG 1.2.2 gap**, recorded here rather than left to be
discovered: audio needs a text alternative. It closes the moment somebody
pastes the recorded line into that file, which says what goes where. What stays
refused is writing the line from a guess, because a caption is a claim about
what a real person said.

There is also **no English take**. `MueenRecording.spoken` is what makes every
surface tell an English reader that the voice they are about to hear is Arabic;
record an English clip and that notice disappears by itself.
