# Exercise demos: only show when verified

Right now every exercise card has a Play button. Two problems make it unreliable:

1. The button passes the original slot ID, so after a swap or substitution it shows the exercise you replaced.
2. Many curated YouTube links were hand-picked and no longer match the movement; when nothing is mapped the sheet opens a generic YouTube search.

Plan: only render the demo button when we have a confident, exercise-specific demo. Otherwise no button at all.

## What "verified" means

An exercise qualifies if either:
- It resolves to a free-exercise-db entry (ID starts with `lib-db-`, or is in the curated ID → folder map) giving real start/finish form photos, or
- It has an explicit curated video entry that has been confirmed to match the movement.

Generic YouTube-search fallback no longer counts as a demo — no button, no sheet.

## Swap correctness

The demo must follow the exercise actually being performed. The button will use the effective/substituted exercise ID and its resolved display name, so a swapped exercise shows its own demo (or no button if unverified).

## Curated video list

Rather than trusting the whole hand-written list, keep only entries explicitly marked as verified. Everything else falls through to the image library; if there is no image folder either, the exercise simply has no demo button. This removes the "wrong exercise" cases without deleting the feature where it works.

## Technical notes

- `src/lib/exercise-videos.ts`: add `hasVerifiedDemo(exerciseId, exerciseName)` returning true only for image-folder matches or verified video IDs. Change `getExerciseVideoUrl` to return `null` instead of the YouTube search URL. Add a `VERIFIED_VIDEO_IDS` set (or drop unverified keys) so curated links must be opted in.
- `src/pages/WorkoutSession.tsx`: gate both Play buttons (pre-start list at ~line 1706 and `onPlayVideo` at ~1867) on `hasVerifiedDemo(effectiveId, displayName)`, and pass the effective/substituted ID plus resolved name instead of `ex.id` / `ex.name`.
- `src/components/ExerciseVideoSheet.tsx`: drop the search-fallback branch; keep images and verified-video rendering, keep an empty state as a safety net.
- Also gate `onPlayVideo` in `src/components/workout/ExerciseDragItem.tsx` consumers so no dead button renders.
