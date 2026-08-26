# Daily Growth Supabase setup

Daily Growth is already configured to use the same Supabase project and publishable key as Forge and Level90.

## One-time database setup

1. Open the existing Forge / Level90 project in Supabase.
2. Open **SQL Editor** and create a new query.
3. Copy the complete contents of `supabase/migrations/20260826_create_daily_growth_sync.sql` into the query.
4. Select **Run**.
5. Deploy the updated Daily Growth files.

The migration creates one private `daily_growth_records` table. Row Level Security restricts every row to its authenticated owner. No service-role key is used by the app.

## First sign-in

Sign in first on the device containing the most complete Daily Growth library. When the Daily Growth cloud table is empty, that device's existing IndexedDB content is uploaded automatically. A pre-merge recovery snapshot is retained in that browser before the first cloud merge.

On another device, sign in with the same email and password used by Forge and Level90. Daily Growth merges lessons that exist only on that device and then downloads the unified cloud library.

## Synced data

- Imported content packs and lessons
- Current pack and independent reading positions
- Lesson and Explore completion
- Today's Action notes and completion
- Recall ratings
- Reflections
- Appearance and Explore rotation settings

The app remains local-first. Changes are saved to IndexedDB immediately, queued while offline, and uploaded after the connection returns. Full JSON backup and restore remain available in Settings.
