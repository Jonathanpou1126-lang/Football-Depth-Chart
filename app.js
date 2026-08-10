(() => {
  "use strict";
  const KEY = "football-depth-chart-11u-v1";
  const SIDES = ["Offense", "Defense", "Special Teams"];
  const VIEWS = ["All", ...SIDES];
  const rosterDefaults = [
    ["0", "Dustin Juarez Zarco"], ["1", "Harrison Edwards"], ["2", "Jesiah Baker"],
    ["3", "Jayden Long"], ["5", "Jackson Owens"], ["6", "Jacob Johnson"],
    ["7", "Hayes Miller"], ["10", "Gus Bridges"], ["11", "Aaron Rodriguez"],
    ["13", "Stevie Watkins III"], ["14", "Hayden Hancock"], ["19", "Henry Strickland"],
    ["21", "Colton Thomason"], ["22", "Ben Burkhalter"], ["23", "Brayden Perpall"],
    ["30", "Jacob Pou"], ["42", "Trent Pierce"], ["67", "Sawyer Herring"],
    ["72", "Kavan Atkinson"], ["97", "Baylor Vaughn"], ["99", "Cullen Moore"],
    ["", "Caden Hurd"],
  ];
  const positionDefaults = {
    Offense: ["1 Back", "2 Back", "3 Back", "4 Back", "X (RTE)", "Y (LTE)", "LT", "LG", "C", "RG", "RT"],
    Defense: ["LC", "RC", "FS", "SAM", "MIKE", "WILL", "LDE", "LDT", "N", "RDT", "RDE"],
    "Special Teams": ["PUNTER", "PAT", "KO"],
  };
  const $ = (selector) => document.querySelector(selector);
  const els = {
    tabs: [...document.querySelectorAll(".tab")], rosterList: $("#rosterList"), rosterCount: $("#rosterCount"),
    rosterEmpty: $("#rosterEmpty"), rosterSearch: $("#rosterSearch"), rosterHelp: $("#rosterHelp"), groups: $("#positionGroups"),
    chartTitle: $("#chartTitle"), selection: $("#selectionBanner"), selectedName: $("#selectedPlayerName"),
    toolsButton: $("#toolsButton"), toolsMenu: $("#toolsMenu"), playerDialog: $("#playerDialog"),
    playerForm: $("#playerForm"), playerName: $("#playerName"), playerJersey: $("#playerJersey"),
    playerNotes: $("#playerNotes"), positionDialog: $("#positionDialog"), positionForm: $("#positionForm"),
    positionId: $("#positionId"), positionName: $("#positionName"), positionSide: $("#positionSide"),
    positionDepth: $("#positionDepth"), positionNotes: $("#positionNotes"), dialogTitle: $("#positionDialogTitle"),
    savePosition: $("#savePositionButton"), spreadsheetInput: $("#spreadsheetInput"), backupInput: $("#backupInput"),
    toast: $("#toast"),
  };
  let selectedPlayerId = null;
  let toastTimer;

  function slug(value) {
    return String(value).toLowerCase().normalize("NFKD").replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "") || "item";
  }
  function makeId(prefix, value) {
    const unique = crypto?.randomUUID?.() || `${Date.now()}-${Math.random().toString(16).slice(2)}`;
    return `${prefix}-${slug(value)}-${unique}`;
  }
  function sideValue(value) {
    const clean = String(value ?? "").trim().toLowerCase();
    return SIDES.find((side) => side.toLowerCase() === clean) || null;
  }
  function depthValue(value, blankIsThree = false) {
    if (blankIsThree && String(value ?? "").trim() === "") return 3;
    const depth = Number.parseInt(String(value), 10);
    return Number.isInteger(depth) && depth >= 1 && depth <= 6 ? depth : null;
  }
  function defaultState() {
    const roster = rosterDefaults.map(([jersey, name], index) => ({ id: `player-${index + 1}-${slug(name)}`, jersey, name, notes: "" }));
    const positions = SIDES.flatMap((side) => positionDefaults[side].map((name, index) => ({
      id: `${slug(side)}-${slug(name)}-${index + 1}`, name, side, depth: 3, notes: "",
    })));
    return { version: 1, roster, positions, assignments: {}, selectedView: "All" };
  }
  function sanitize(candidate) {
    if (!candidate || !Array.isArray(candidate.roster) || !Array.isArray(candidate.positions)) return null;
    const playerIds = new Set();
    const roster = candidate.roster.filter((p) => p && String(p.name ?? "").trim()).map((p) => {
      let id = String(p.id || makeId("player", p.name));
      while (playerIds.has(id)) id = makeId("player", p.name);
      playerIds.add(id);
      return { id, jersey: String(p.jersey ?? "").trim(), name: String(p.name).trim(), notes: String(p.notes ?? "").trim() };
    });
    const positionIds = new Set();
    const positions = candidate.positions.map((p) => {
      const name = String(p?.name ?? "").trim(); const side = sideValue(p?.side); const depth = depthValue(p?.depth);
      if (!name || !side || !depth) return null;
      let id = String(p.id || makeId("position", name));
      while (positionIds.has(id)) id = makeId("position", name);
      positionIds.add(id);
      return { id, name, side, depth, notes: String(p.notes ?? "").trim() };
    }).filter(Boolean);
    if (!roster.length || !positions.length) return null;
    const assignments = {};
    positions.forEach((position) => {
      const source = Array.isArray(candidate.assignments?.[position.id]) ? candidate.assignments[position.id] : [];
      const seen = new Set();
      assignments[position.id] = Array.from({ length: position.depth }, (_, i) => {
        const id = source[i]; if (!playerIds.has(id) || seen.has(id)) return null; seen.add(id); return id;
      });
    });
    return { version: 1, roster, positions, assignments, selectedView: VIEWS.includes(candidate.selectedView) ? candidate.selectedView : "All" };
  }
  function load() {
    try { return sanitize(JSON.parse(localStorage.getItem(KEY))) || defaultState(); }
    catch { return defaultState(); }
  }
  let state = load();
  function save() {
    try { localStorage.setItem(KEY, JSON.stringify(state)); }
    catch { notify("Changes could not be saved on this device.", true); }
  }
  function commit(message) { save(); render(); if (message) notify(message); }
  function esc(value) {
    return String(value).replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;").replaceAll("'", "&#039;");
  }
  function ordinal(number) {
    const mod = number % 100;
    if (mod >= 11 && mod <= 13) return `${number}th`;
    return `${number}${number % 10 === 1 ? "st" : number % 10 === 2 ? "nd" : number % 10 === 3 ? "rd" : "th"}`;
  }
  function player(id) { return state.roster.find((p) => p.id === id) || null; }
  function slots(position) {
    const current = Array.isArray(state.assignments[position.id]) ? state.assignments[position.id] : [];
    state.assignments[position.id] = Array.from({ length: position.depth }, (_, i) => current[i] || null);
    return state.assignments[position.id];
  }
  function notify(message, error = false) {
    clearTimeout(toastTimer); els.toast.textContent = message; els.toast.classList.toggle("error", error); els.toast.hidden = false;
    toastTimer = setTimeout(() => { els.toast.hidden = true; }, 3500);
  }
  function render() { renderTabs(); renderRoster(); renderSelection(); renderPositions(); }
  function renderTabs() {
    els.tabs.forEach((tab) => { const active = tab.dataset.view === state.selectedView; tab.classList.toggle("active", active); tab.setAttribute("aria-selected", active); });
    els.chartTitle.textContent = state.selectedView === "All" ? "All Positions" : state.selectedView;
  }
  function assignedPlayerIdsForView() {
    const positions = state.positions.filter((position) => state.selectedView === "All" || position.side === state.selectedView);
    return new Set(positions.flatMap((position) => slots(position).filter(Boolean)));
  }
  function renderRoster() {
    const query = els.rosterSearch.value.trim().toLowerCase();
    const assignedIds = assignedPlayerIdsForView();
    const available = state.roster.filter((p) => !assignedIds.has(p.id));
    const roster = [...available].sort((a, b) => {
      const an = Number.parseInt(a.jersey, 10), bn = Number.parseInt(b.jersey, 10), ah = Number.isFinite(an), bh = Number.isFinite(bn);
      if (ah && bh && an !== bn) return an - bn; if (ah !== bh) return ah ? -1 : 1; return a.name.localeCompare(b.name);
    }).filter((p) => !query || p.name.toLowerCase().includes(query) || p.jersey.toLowerCase().includes(query));
    els.rosterCount.textContent = `${available.length}/${state.roster.length}`;
    els.rosterHelp.textContent = state.selectedView === "All"
      ? "Assigned players leave this list. Tap or drag a filled slot to reuse that player elsewhere."
      : `Assigned ${state.selectedView} players leave this list. Tap or drag a filled slot to reuse them.`;
    els.rosterEmpty.textContent = query
      ? "No available players match that search."
      : `Every player is assigned in the ${state.selectedView === "All" ? "visible chart" : state.selectedView + " pool"}.`;
    els.rosterEmpty.hidden = roster.length > 0;
    els.rosterList.innerHTML = roster.map((p) => `<button type="button" draggable="true" class="player${p.id === selectedPlayerId ? " selected" : ""}" data-player-id="${esc(p.id)}" aria-pressed="${p.id === selectedPlayerId}" title="${esc(p.notes || `Select ${p.name}`)}"><span class="jersey${p.jersey ? "" : " blank"}">${esc(p.jersey || "—")}</span><span class="player-name">${esc(p.name)}</span><span class="grip" aria-hidden="true">⋮⋮</span></button>`).join("");
  }
  function renderSelection() {
    const chosen = player(selectedPlayerId);
    if (!chosen) { selectedPlayerId = null; els.selection.hidden = true; return; }
    els.selectedName.textContent = `${chosen.jersey ? `#${chosen.jersey} ` : ""}${chosen.name}`; els.selection.hidden = false;
  }
  function renderPositions() {
    const visibleSides = state.selectedView === "All" ? SIDES : [state.selectedView];
    els.groups.innerHTML = visibleSides.map((side) => {
      const positions = state.positions.filter((p) => p.side === side); if (!positions.length) return "";
      return `<section class="group" data-side="${esc(side)}" aria-label="${esc(side)} positions"><div class="group-head"><h3>${esc(side)} · ${positions.length}</h3><i class="group-line"></i></div><div class="position-grid">${positions.map((position, index) => card(position, index, positions.length)).join("")}</div></section>`;
    }).join("") || '<p class="no-positions">No positions in this view yet.</p>';
  }
  function card(position, sideIndex, sideCount) {
    const rows = slots(position).map((playerId, index) => {
      const assigned = player(playerId);
      const content = assigned ? `<span class="slot-player"><span class="slot-num">${assigned.jersey ? `#${esc(assigned.jersey)}` : "—"}</span><span class="slot-name">${esc(assigned.name)}</span></span>` : '<span class="open">Open slot</span>';
      const reuse = assigned ? `<button type="button" class="reuse-slot" data-reuse-player-id="${esc(assigned.id)}" aria-label="Use ${esc(assigned.name)} again" title="Use ${esc(assigned.name)} at another position">↗</button>` : "";
      return `<div class="slot-row${assigned ? " with-reuse" : ""}"><button type="button" class="slot${assigned ? " filled" : ""}${selectedPlayerId ? " ready" : ""}" data-position-id="${esc(position.id)}" data-depth-index="${index}" ${assigned ? `data-assigned-player-id="${esc(assigned.id)}" draggable="true" title="Select ${esc(assigned.name)} to reuse at another position"` : ""} aria-label="${ordinal(index + 1)} depth for ${esc(position.name)}${assigned ? `, currently ${esc(assigned.name)}; tap to reuse` : ", open"}"><span class="depth">${ordinal(index + 1)}</span>${content}</button>${reuse}<button type="button" class="clear-slot" data-position-id="${esc(position.id)}" data-clear-index="${index}" aria-label="Clear ${ordinal(index + 1)} depth for ${esc(position.name)}" ${assigned ? "" : "disabled"}>×</button></div>`;
    }).join("");
    return `<article class="position" data-side="${esc(position.side)}" data-position-card-id="${esc(position.id)}"><header class="position-head"><div class="position-title"><h3 title="${esc(position.name)}">${esc(position.name)}</h3><span>${esc(position.side)} · ${position.depth} deep</span></div><div class="position-actions"><button class="move-position" data-move-position="${esc(position.id)}" data-move-direction="-1" aria-label="Move ${esc(position.name)} earlier" title="Move earlier" ${sideIndex === 0 ? "disabled" : ""}>←</button><button class="move-position" data-move-position="${esc(position.id)}" data-move-direction="1" aria-label="Move ${esc(position.name)} later" title="Move later" ${sideIndex === sideCount - 1 ? "disabled" : ""}>→</button><button class="edit" data-edit="${esc(position.id)}" aria-label="Edit ${esc(position.name)}" title="Edit position">✎</button><button class="delete" data-delete="${esc(position.id)}" aria-label="Delete ${esc(position.name)}" title="Delete position">×</button></div></header>${position.notes ? `<p class="position-note">${esc(position.notes)}</p>` : ""}<div class="depth-list">${rows}</div></article>`;
  }
  function selectPlayer(id) { selectedPlayerId = selectedPlayerId === id ? null : id; render(); }
  function selectPlayerForReuse(id) {
    const assignedPlayer = player(id); if (!assignedPlayer) return;
    selectedPlayerId = assignedPlayer.id; render();
    notify(`${assignedPlayer.name} selected. Tap another slot to add this player there too.`);
  }
  function assign(positionId, index, playerId) {
    const position = state.positions.find((p) => p.id === positionId), chosen = player(playerId);
    if (!position || !chosen || index < 0 || index >= position.depth) return;
    const list = slots(position); list.forEach((id, i) => { if (id === playerId) list[i] = null; }); list[index] = playerId;
    selectedPlayerId = null; commit(`${chosen.name} assigned to ${position.name} (${ordinal(index + 1)}).`);
  }
  function clearSlot(positionId, index) {
    const position = state.positions.find((p) => p.id === positionId); if (!position || !slots(position)[index]) return;
    slots(position)[index] = null; commit(`${position.name} slot cleared.`);
  }
  function movePosition(positionId, direction) {
    const position = state.positions.find((item) => item.id === positionId);
    if (!position) return;
    const sidePositions = state.positions.filter((item) => item.side === position.side);
    const currentIndex = sidePositions.findIndex((item) => item.id === positionId);
    const target = sidePositions[currentIndex + direction];
    if (!target) return;
    const sourceIndex = state.positions.findIndex((item) => item.id === position.id);
    const targetIndex = state.positions.findIndex((item) => item.id === target.id);
    [state.positions[sourceIndex], state.positions[targetIndex]] = [state.positions[targetIndex], state.positions[sourceIndex]];
    commit(`${position.name} moved ${direction < 0 ? "earlier" : "later"} in ${position.side}.`);
  }
  function openDialog(dialog) { dialog.showModal ? dialog.showModal() : dialog.setAttribute("open", ""); }
  function closeDialog(dialog) { dialog.close ? dialog.close() : dialog.removeAttribute("open"); }
  function menu(open = els.toolsMenu.hidden) { els.toolsMenu.hidden = !open; els.toolsButton.setAttribute("aria-expanded", open); }
  function openAddPosition() {
    els.positionForm.reset(); els.positionId.value = ""; els.positionDepth.value = "3"; els.positionSide.value = state.selectedView === "All" ? "Offense" : state.selectedView;
    els.dialogTitle.textContent = "Add Position"; els.savePosition.textContent = "Add Position"; openDialog(els.positionDialog); els.positionName.focus();
  }
  function openEdit(id) {
    const p = state.positions.find((item) => item.id === id); if (!p) return;
    els.positionId.value = p.id; els.positionName.value = p.name; els.positionSide.value = p.side; els.positionDepth.value = p.depth; els.positionNotes.value = p.notes;
    els.dialogTitle.textContent = "Edit Position"; els.savePosition.textContent = "Save Changes"; openDialog(els.positionDialog); els.positionName.focus();
  }
  function download(blob, filename) {
    const url = URL.createObjectURL(blob), link = document.createElement("a"); link.href = url; link.download = filename; document.body.append(link); link.click(); link.remove(); setTimeout(() => URL.revokeObjectURL(url), 1000);
  }
  function exportBackup() {
    download(new Blob([JSON.stringify({ app: "11U Football Depth Chart", exportedAt: new Date().toISOString(), ...state }, null, 2)], { type: "application/json" }), `football-depth-chart-backup-${new Date().toISOString().slice(0, 10)}.json`);
    notify("Full JSON backup downloaded.");
  }
  async function restoreBackup(file) {
    try { const restored = sanitize(JSON.parse(await file.text())); if (!restored) throw new Error("This file is not a valid depth chart backup."); state = restored; selectedPlayerId = null; els.rosterSearch.value = ""; commit("Backup restored successfully."); }
    catch (error) { notify(error.message || "Backup could not be restored.", true); }
  }
  function hasXlsx() { if (globalThis.XLSX) return true; notify("The spreadsheet tool did not load. Refresh and try again.", true); return false; }
  function template() {
    if (!hasXlsx()) return;
    const wb = XLSX.utils.book_new();
    const ps = XLSX.utils.json_to_sheet([{ Position: "QB", Side: "Offense", Depth: 3, Notes: "Example position — edit or replace" }, { Position: "MLB", Side: "Defense", Depth: 3, Notes: "Example position — edit or replace" }, { Position: "KICKER", Side: "Special Teams", Depth: 2, Notes: "Example position — edit or replace" }]);
    const rs = XLSX.utils.json_to_sheet([{ "Jersey Number": 12, "Player Name": "Example Player", Notes: "This row is ignored during import" }]);
    const instructions = [["11U Football Depth Chart Import Template"], [""], ["Positions: use Position, Side, Depth, Notes."], ["Valid Side values: Offense, Defense, Special Teams."], ["Depth is 1 through 6; blank defaults to 3."], ["Valid imported positions replace current positions; names keep their entered spelling."], [""], ["Roster: use Jersey Number, Player Name, Notes."], ["Jersey Number may be blank; Player Name is required."], ["Valid imported players replace the current roster."], ["Blank rows and rows named Example Player are ignored."], ["Assignments clear when roster or positions are replaced."], ["CSV may contain either the Positions or Roster headers."]];
    const ins = XLSX.utils.aoa_to_sheet(instructions); ps["!cols"] = [{ wch: 22 }, { wch: 18 }, { wch: 10 }, { wch: 38 }]; rs["!cols"] = [{ wch: 16 }, { wch: 28 }, { wch: 38 }]; ins["!cols"] = [{ wch: 100 }];
    XLSX.utils.book_append_sheet(wb, ps, "Positions"); XLSX.utils.book_append_sheet(wb, rs, "Roster"); XLSX.utils.book_append_sheet(wb, ins, "Instructions");
    XLSX.writeFile(wb, "football-depth-chart-import-template.xlsx", { compression: true }); notify("Excel import template downloaded.");
  }
  function rowKeys(row) { return Object.entries(row || {}).reduce((out, [key, value]) => { out[String(key).trim().toLowerCase()] = value; return out; }, {}); }
  function namedRows(workbook, name) {
    const actual = workbook.SheetNames.find((n) => n.trim().toLowerCase() === name.toLowerCase());
    return actual ? XLSX.utils.sheet_to_json(workbook.Sheets[actual], { defval: "", raw: false }) : null;
  }
  function csvRows(workbook, type) {
    if (workbook.SheetNames.length !== 1) return null;
    const rows = XLSX.utils.sheet_to_json(workbook.Sheets[workbook.SheetNames[0]], { defval: "", raw: false }); const first = rowKeys(rows[0]);
    return type === "positions" ? (("position" in first && "side" in first) ? rows : null) : (("player name" in first) ? rows : null);
  }
  function parsePositions(rows) {
    return (rows || []).map((source) => { const row = rowKeys(source), name = String(row.position ?? "").trim(), side = sideValue(row.side), depth = depthValue(row.depth, true); if (!name || name.toLowerCase() === "example player" || !side || !depth) return null; return { id: makeId("position", name), name, side, depth, notes: String(row.notes ?? "").trim() }; }).filter(Boolean);
  }
  function parseRoster(rows) {
    return (rows || []).map((source) => { const row = rowKeys(source), name = String(row["player name"] ?? "").trim(); if (!name || name.toLowerCase() === "example player") return null; return { id: makeId("player", name), jersey: String(row["jersey number"] ?? "").trim(), name, notes: String(row.notes ?? "").trim() }; }).filter(Boolean);
  }
  async function importSheet(file) {
    if (!hasXlsx()) return;
    try {
      const workbook = XLSX.read(await file.arrayBuffer(), { type: "array" }); let pRows = namedRows(workbook, "Positions"), rRows = namedRows(workbook, "Roster");
      if (file.name.toLowerCase().endsWith(".csv")) { pRows ||= csvRows(workbook, "positions"); rRows ||= csvRows(workbook, "roster"); }
      const positions = parsePositions(pRows), roster = parseRoster(rRows); if (!positions.length && !roster.length) throw new Error("No valid Positions or Roster rows were found.");
      const replaced = []; if (positions.length) { state.positions = positions; state.assignments = {}; replaced.push(`${positions.length} positions`); } if (roster.length) { state.roster = roster; state.assignments = {}; replaced.push(`${roster.length} players`); }
      selectedPlayerId = null; els.rosterSearch.value = ""; commit(`Imported ${replaced.join(" and ")}.`);
    } catch (error) { console.error(error); notify(error.message || "Spreadsheet import failed.", true); }
  }

  els.tabs.forEach((tab) => tab.addEventListener("click", () => { state.selectedView = tab.dataset.view; commit(); }));
  els.rosterSearch.addEventListener("input", renderRoster);
  els.rosterList.addEventListener("click", (event) => { const target = event.target.closest("[data-player-id]"); if (target) selectPlayer(target.dataset.playerId); });
  $("#cancelSelectionButton").addEventListener("click", () => { selectedPlayerId = null; render(); });
  els.rosterList.addEventListener("dragstart", (event) => { const target = event.target.closest("[data-player-id]"); if (!target || !event.dataTransfer) return; event.dataTransfer.setData("text/plain", target.dataset.playerId); event.dataTransfer.effectAllowed = "copy"; target.classList.add("selected"); });
  els.rosterList.addEventListener("dragend", renderRoster);
  els.groups.addEventListener("dragstart", (event) => {
    const target = event.target.closest("[data-assigned-player-id]");
    if (!target || !event.dataTransfer) return;
    event.dataTransfer.setData("text/plain", target.dataset.assignedPlayerId);
    event.dataTransfer.effectAllowed = "copy";
    target.classList.add("over");
  });
  els.groups.addEventListener("dragend", () => document.querySelectorAll(".slot.over").forEach((slot) => slot.classList.remove("over")));
  els.groups.addEventListener("dragover", (event) => { const target = event.target.closest("[data-depth-index]"); if (!target) return; event.preventDefault(); document.querySelectorAll(".slot.over").forEach((slot) => slot.classList.remove("over")); target.classList.add("over"); if (event.dataTransfer) event.dataTransfer.dropEffect = "copy"; });
  els.groups.addEventListener("dragleave", (event) => event.target.closest("[data-depth-index]")?.classList.remove("over"));
  els.groups.addEventListener("drop", (event) => { const target = event.target.closest("[data-depth-index]"); if (!target || !event.dataTransfer) return; event.preventDefault(); target.classList.remove("over"); assign(target.dataset.positionId, Number(target.dataset.depthIndex), event.dataTransfer.getData("text/plain")); });
  els.groups.addEventListener("click", (event) => {
    const move = event.target.closest("[data-move-position]"); if (move) { movePosition(move.dataset.movePosition, Number(move.dataset.moveDirection)); return; }
    const reuse = event.target.closest("[data-reuse-player-id]"); if (reuse) { selectPlayerForReuse(reuse.dataset.reusePlayerId); return; }
    const targetSlot = event.target.closest("[data-depth-index]");
    if (targetSlot) {
      if (selectedPlayerId) { assign(targetSlot.dataset.positionId, Number(targetSlot.dataset.depthIndex), selectedPlayerId); return; }
      const position = state.positions.find((item) => item.id === targetSlot.dataset.positionId);
      const assignedId = position ? slots(position)[Number(targetSlot.dataset.depthIndex)] : null;
      if (assignedId) selectPlayerForReuse(assignedId);
      return;
    }
    const clear = event.target.closest("[data-clear-index]"); if (clear) { clearSlot(clear.dataset.positionId, Number(clear.dataset.clearIndex)); return; }
    const edit = event.target.closest("[data-edit]"); if (edit) { openEdit(edit.dataset.edit); return; }
    const del = event.target.closest("[data-delete]"); if (del) { const position = state.positions.find((p) => p.id === del.dataset.delete); if (position && confirm(`Delete ${position.name} and its assignments?`)) { state.positions = state.positions.filter((p) => p.id !== position.id); delete state.assignments[position.id]; commit(`${position.name} deleted.`); } }
  });
  $("#addPlayerButton").addEventListener("click", () => { els.playerForm.reset(); openDialog(els.playerDialog); els.playerName.focus(); });
  $("#addPositionButton").addEventListener("click", openAddPosition);
  els.playerForm.addEventListener("submit", (event) => { event.preventDefault(); const name = els.playerName.value.trim(); if (!name) return; state.roster.push({ id: makeId("player", name), jersey: els.playerJersey.value.trim(), name, notes: els.playerNotes.value.trim() }); closeDialog(els.playerDialog); commit(`${name} added to the roster.`); });
  els.positionForm.addEventListener("submit", (event) => {
    event.preventDefault(); const name = els.positionName.value.trim(), side = sideValue(els.positionSide.value), depth = depthValue(els.positionDepth.value); if (!name || !side || !depth) return;
    const current = state.positions.find((p) => p.id === els.positionId.value);
    if (current) { current.name = name; current.side = side; current.depth = depth; current.notes = els.positionNotes.value.trim(); state.assignments[current.id] = Array.from({ length: depth }, (_, i) => state.assignments[current.id]?.[i] || null); closeDialog(els.positionDialog); commit(`${name} updated.`); }
    else { const position = { id: makeId("position", name), name, side, depth, notes: els.positionNotes.value.trim() }; state.positions.push(position); state.assignments[position.id] = Array(depth).fill(null); closeDialog(els.positionDialog); commit(`${name} added to ${side}.`); }
  });
  document.querySelectorAll("[data-close]").forEach((button) => button.addEventListener("click", () => closeDialog(document.getElementById(button.dataset.close))));
  [els.playerDialog, els.positionDialog].forEach((dialog) => dialog.addEventListener("click", (event) => { if (event.target === dialog) closeDialog(dialog); }));
  els.toolsButton.addEventListener("click", () => menu()); document.addEventListener("click", (event) => { if (!event.target.closest(".menu-wrap")) menu(false); });
  $("#clearButton").addEventListener("click", () => { menu(false); const any = Object.values(state.assignments).some((list) => Array.isArray(list) && list.some(Boolean)); if (!any) return notify("There are no assignments to clear."); if (confirm("Clear every player assignment? Your roster and positions will stay in place.")) { state.assignments = {}; selectedPlayerId = null; commit("All assignments cleared."); } });
  $("#printButton").addEventListener("click", () => { menu(false); window.print(); });
  $("#backupExportButton").addEventListener("click", () => { menu(false); exportBackup(); }); $("#backupImportButton").addEventListener("click", () => { menu(false); els.backupInput.click(); });
  $("#templateButton").addEventListener("click", () => { menu(false); template(); }); $("#sheetImportButton").addEventListener("click", () => { menu(false); els.spreadsheetInput.click(); });
  els.backupInput.addEventListener("change", async () => { const file = els.backupInput.files[0]; if (file) await restoreBackup(file); els.backupInput.value = ""; });
  els.spreadsheetInput.addEventListener("change", async () => { const file = els.spreadsheetInput.files[0]; if (file) await importSheet(file); els.spreadsheetInput.value = ""; });
  window.addEventListener("storage", (event) => { if (event.key !== KEY || !event.newValue) return; try { const incoming = sanitize(JSON.parse(event.newValue)); if (incoming) { state = incoming; selectedPlayerId = null; render(); notify("Depth chart refreshed from another tab."); } } catch {} });
  globalThis.DepthChartApp = { storageKey: KEY, getState: () => structuredClone(state), assign, clearSlot, movePosition, parsePositions, parseRoster, sanitize };
  save(); render();
})();
