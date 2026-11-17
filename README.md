# AME 101 Interactive Lessons

Live phone voting for AME 101 lectures. Same system for every lesson.

## Lessons
- **Chapter 8 · Grading Game** — `/present?lesson=grading` (default)
- **Chapter 7 · Second Law** — `/present?lesson=second-law`

Home page lets you pick.

## Features
- Presenter view: slide on left, poll controls + histogram + QR on right
- Student mobile view via QR code (anonymous browser UUID + optional name)
- Votes sealed until “Show Results”
- Random volunteer picker
- Fully synced: next/prev updates every phone
- Same Supabase project for all lessons

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

Open http://localhost:3000 for the lesson picker.

## Deploy
Push to GitHub, connect to Vercel, add the two NEXT_PUBLIC_ env vars.

## Notes
- Session ID defaults to “class”. Add `?session=yourname` for multiple rooms.
- Students stay anonymous (browser UUID) unless they volunteer a name.
- Add new lessons by dropping a JSON file in `data/` and wiring it in the present/vote pages.

Original grading game from AME101_Ch8_and_Grading_Game.pptx.
Second Law from AME101_Entropy_Lecture_v12.pptx.
