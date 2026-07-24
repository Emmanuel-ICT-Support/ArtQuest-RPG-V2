# Preloaded Class Packs

Place teacher-exported ArtQuest Class Pack `.json` files in this folder to make
them available through **Find a Class**. The app discovers every valid JSON
file here when its standalone build is refreshed, so the file name can be anything meaningful to
your school (for example, `year-10-landscape-unit.json`).

Use **Teacher Mode → Build a Class Pack → Export Class Pack** to create a
compatible file. Invalid or incomplete packs are excluded from the student
list rather than being shown as selectable. After adding or replacing a pack,
run `node scripts/build-standalone.mjs` before distributing `index.html`.
