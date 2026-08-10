# 11U Football Depth Chart

A fast, single-page coaching board for managing an 11U football depth chart. It runs entirely in the browser, needs no account or backend, and automatically saves changes on the current device.

## Features

- 22-player starter roster
- 25 three-deep starter positions across Offense, Defense, and Special Teams
- Desktop drag-and-drop and phone/tablet tap-to-assign
- Side-specific available-player pools that hide players already assigned on the current side
- Earlier/later controls for reordering positions within each side
- List View plus a movable on-field coaching-board view for every side
- Search, add-player, and add/edit/delete-position controls
- `.xlsx`, `.xls`, and `.csv` import plus an Excel template download
- Complete JSON backup and restore
- Clean landscape print layout
- Automatic `localStorage` persistence

## Use the app

Open `index.html` in a current browser, or serve this folder with any static web server. No build or backend is required. The spreadsheet reader in `vendor/` is bundled locally, so spreadsheet data is not uploaded anywhere.

Choose **All**, **Offense**, **Defense**, or **Special Teams**. On a phone or tablet, tap a player and then tap any open or occupied depth slot. The selected player is visibly highlighted. On desktop, use the same click flow or drag a roster player onto a slot. Use the **×** beside an occupied slot to clear it.

The roster is an available-player pool for the selected view. Once a player is assigned on Offense, that player leaves the Offense list but remains available when you switch to Defense or Special Teams. To use that player at another position on the same side, tap the **↗ use again** button beside the player's occupied slot (or tap the occupied slot itself), then tap the additional slot. On desktop, you can also drag the occupied slot onto another position. The first assignment remains in place. Clearing the player's final assignment on that side returns the player to that side's roster. In the **All** view, players assigned anywhere are hidden from the available list.

A player can appear at multiple positions on Offense, Defense, and Special Teams—for example, first team at one position and second team at another. Assigning the same player to another slot within one position moves the player and prevents a duplicate in that single position.

Use **＋** in the Roster panel to add a player. Use **＋ Add Position** to add a position, and use the arrow, edit, or delete controls on each position card to reorder and maintain it. Position order is saved automatically along with all other changes and the selected view.

Use **List** for the standard depth-chart cards or **Field** for an on-field coaching board. In Field View, drag the **✥** handle on a position marker to move it. Tap a marker to open all of that position's depth slots below the field, where players can still be assigned, reused, or cleared normally. Each side has its own saved field arrangement and a **Reset layout** button. On a keyboard, focus a marker's move handle and use the arrow keys; hold Shift for a larger move.

## Spreadsheet import

The app accepts `.xlsx`, `.xls`, and `.csv`.

An Excel workbook can contain:

### Positions sheet

| Position | Side | Depth | Notes |
| --- | --- | --- | --- |
| QB | Offense | 3 | Optional note |

Valid **Side** values are `Offense`, `Defense`, and `Special Teams`. Depth must be 1 through 6; blank depth defaults to 3. Position names retain their entered spelling, capitalization, and punctuation.

### Roster sheet

| Jersey Number | Player Name | Notes |
| --- | --- | --- |
| 12 | Example Player | Optional note |

Jersey Number may be blank. Player Name is required.

### Rules

- Blank rows and roster rows named `Example Player` are ignored.
- Valid Positions rows replace the current positions.
- Valid Roster rows replace the current roster.
- Assignments clear when either positions or roster are replaced.
- A CSV may contain either the Positions headers or Roster headers. Import a second CSV to replace the other table.

Choose **Tools → Download Template** for an `.xlsx` workbook with Positions, Roster, and Instructions sheets.

## Backup, restore, and print

**Tools → Export JSON Backup** downloads roster, positions, assignments, selected side, List/Field choice, and saved field arrangements. **Restore JSON Backup** validates and restores that full state. Use a backup to move the chart to another browser or device.

Select the desired side and choose the visible **Print** button or **Tools → Print Depth Chart**. Printing follows the selected layout. List View prints the traditional full depth chart. Field View prints the on-field formation followed by a compact 1st-through-6th depth list for every position. Controls and the roster are removed automatically, and **All** prints each side on its own landscape page. The browser's print window can send the chart to a printer or save it as a PDF.

## GitHub Pages

The repository is ready to publish from the root of `main`: `index.html` is in the root and `.nojekyll` is included.

If Pages is not enabled:

1. Push `main` to GitHub.
2. Open **Settings → Pages** in the repository.
3. Under **Build and deployment**, choose **Deploy from a branch**.
4. Select `main` and `/(root)`, then save.

Expected URL:

<https://Jonathanpou1126-lang.github.io/Football-Depth-Chart/>

Custom domain:

<https://www.footballdepthcharts.com/>
