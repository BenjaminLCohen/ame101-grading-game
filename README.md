# AME 101 Grading Game

Interactive presentation for Chapter 8 + live class polling.

## Features
- Presenter view: slide on left, poll controls + histogram on right
- Student mobile view via QR code
- Votes queued until "Show Results"
- Random volunteer picker (can select multiple)
- Fully synced: next/prev updates every phone
- Normal slides (Chapter 8) have only navigation

## Setup

1. Create a free Supabase project at https://supabase.com
2. Run the SQL in `supabase/schema.sql` in the SQL Editor
3. Copy Project URL and anon key into `.env.local` (see `.env.example`)
4. Deploy to Vercel (or run locally)

## Local
```bash
npm install
npm run dev
```

Open http://localhost:3000/present for presenter.
Student URL is shown as QR code.

## Deploy
Push to GitHub, connect to Vercel, add the two NEXT_PUBLIC_ env vars.

## Notes
- Session ID is hardcoded to "class" for simplicity. Change if running multiple sessions.
- Students are anonymous (browser UUID) + optional name for volunteers.
- Images from the original PPT are expected in `public/images/` (see extracted files).

## Original PPT
Converted from AME101_Ch8_and_Grading_Game.pptx
