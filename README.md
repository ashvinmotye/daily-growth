# Daily Growth

**One short lesson, one concrete action and one reflection every day.**

Daily Growth is an installable, offline-first PWA for private personal-development content. The public app contains no book summaries. You import private JSON content packs locally, and the app stores the lessons, progress and journal entries in IndexedDB on that device.

## What is included

- Daily lesson reader with action and reflection prompts
- An editable Today’s Action field that keeps the lesson suggestion and completion checkbox
- Selectable reading track with an independent remembered position for every content pack
- Journey view with all imported lessons—future lessons are never locked
- Explore: 12 Worlds, 60 territories and five focused days per territory
- “Take Me Somewhere New” rotation that avoids recent/familiar topics and favours underexplored Worlds
- Explore breadth, territory and self-rated recall analytics
- Private journal connected to each lesson
- XP, levels, completion progress and a gentle reading rhythm
- Additive JSON imports with a preview of new, updated and unchanged lessons
- IndexedDB storage, full JSON backup and merge-based restore
- Removable content packs; progress reconnects if the same pack is re-imported
- Responsive mobile layout, dark mode, adjustable text size and offline support
- Settings in the top header beside the dark-mode toggle, keeping primary navigation focused on learning
- A three-lesson original sample pack and a formal JSON Schema

## Run locally

The app uses JavaScript modules and a service worker, so open it through a local web server rather than double-clicking `index.html`.

```bash
python3 -m http.server 8080
```

Then open `http://localhost:8080`.

## Deploy on GitHub Pages

1. Put all files from this folder in the root of a GitHub repository.
2. In the repository, open **Settings → Pages**.
3. Choose **Deploy from a branch**, select `main` and `/ (root)`, then save.
4. Open the published HTTPS address once while online so the app shell can be cached.

On iPhone or iPad, open the site in Safari, tap **Share**, then **Add to Home Screen**. Other iOS browsers may not expose the installation option reliably.

## Import a content pack

Open **Settings → Content library → Import pack** and select a JSON file.

Every pack and lesson needs a permanent ID. Import behaviour is additive:

- a new lesson ID is added;
- a matching lesson ID in the same pack is updated;
- identical content is left unchanged;
- an ID already owned by another pack is rejected;
- reading progress and reflections are never reset by a content update.

## Continue a content pack

Use the content-pack selector above the lesson on **Today**, or choose a pack in the **Journey** filter. That pack becomes your current reading track. Daily Growth remembers a separate position for every pack, keeps Previous and Next inside the selected pack, and prepares the next unfinished lesson from that pack when you complete one.

Completing a lesson moves to the next unfinished lesson and scrolls the new lesson to the top automatically.

Selecting **All content packs** in Journey changes only the list view; it does not replace your current reading track. Overall XP, journal entries and Insights still combine activity from every imported pack.

## Explore a World

Open **Explore** to browse 12 broad Worlds and five territories within each World. A territory is a self-paced five-day journey; every day contains a short reading, a concrete action, a reflection and a simple recall check. Explore is a second lane alongside imported book/content packs, so starting a territory never changes the current content pack on Today.

**Take Me Somewhere New** uses local progress only. It avoids recently studied territories, lowers the priority of areas with high completion/recall signals, and favours Worlds with less coverage. Insights explains breadth as Worlds entered and retention as the average of your own Revisit, Familiar and Remembered checks.

The built-in Explore catalog is original app content. Explore progress, action notes, reflections, recall checks and rotation history are included in full backups.

Use `sample-content-pack.json` as a readable example and `content-pack.schema.json` as the specification.

## Private content and Git

Place working private JSON files in `content-packs/` or `private-content/`; both locations are ignored by Git. Imported files do not need to remain beside the app—the browser stores their data locally after import.

Before clearing browser data or moving devices, use **Settings → Backup & transfer → Export full backup**. A backup includes imported content, progress, reflections and settings.

## Copyright boundary

Daily Growth is an independent educational tool and is not affiliated with or endorsed by any author or publisher. Do not commit EPUB files, book covers, publisher artwork, extensive quotations or private lesson packs to the public repository. The MIT license covers this app's code and bundled original sample content; it does not grant rights to third-party material imported by a user.

## Data and privacy

There is no account, server database, analytics SDK or cloud sync. App data lives in the current browser profile. Different browsers and devices have separate libraries unless you transfer a backup manually.
