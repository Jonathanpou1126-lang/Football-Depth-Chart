(() => {
  "use strict";
  const KEY = "football-depth-chart-11u-v1";
  const SIDES = ["Offense", "Defense", "Special Teams"];
  const VIEWS = ["All", ...SIDES];
  const SPECIAL_UNITS = ["Punt", "Punt Return", "Kickoff", "Kick Return", "Extra Point"];
  const SPECIAL_UNIT_VIEWS = ["All Units", ...SPECIAL_UNITS];
  const positionDefaults = {
    Offense: ["1 Back", "2 Back", "3 Back", "4 Back", "X (RTE)", "Y (LTE)", "LT", "LG", "C", "RG", "RT"],
    Defense: ["LC", "RC", "FS", "SAM", "MIKE", "WILL", "LDE", "LDT", "N", "RDT", "RDE"],
  };
  const specialTeamDefaults = {
    Punt: ["PUNTER", "LS", "PP", "L1", "L2", "L3", "L4", "R1", "R2", "R3", "R4"],
    "Punt Return": ["RETURNER", "L1", "L2", "L3", "L4", "L5", "R1", "R2", "R3", "R4", "R5"],
    Kickoff: ["KO", "L1", "L2", "L3", "L4", "L5", "R1", "R2", "R3", "R4", "R5"],
    "Kick Return": ["KR-L", "KR-R", "M", "L1", "L2", "L3", "L4", "R1", "R2", "R3", "R4"],
    "Extra Point": ["PAT", "HOLDER", "LS", "LT", "LG", "C", "RG", "RT", "LW", "RW", "PP"],
  };
  const fieldDefaults = {
    Offense: {
      "1 Back": [40, 66], "2 Back": [60, 66], "3 Back": [40, 82], "4 Back": [60, 82],
      "X (RTE)": [10, 39], "Y (LTE)": [90, 39], LT: [20, 48], LG: [35, 48], C: [50, 48], RG: [65, 48], RT: [80, 48],
    },
    Defense: {
      LC: [10, 22], RC: [90, 22], FS: [50, 10], SAM: [30, 36], MIKE: [50, 36], WILL: [70, 36],
      LDE: [22, 55], LDT: [36, 55], N: [50, 55], RDT: [64, 55], RDE: [78, 55],
    },
  };
  const specialFieldDefaults = {
    Punt: { PUNTER: [50, 84], LS: [50, 50], PP: [50, 68], L1: [10, 42], L2: [26, 50], L3: [36, 50], L4: [44, 50], R1: [90, 42], R2: [74, 50], R3: [64, 50], R4: [56, 50] },
    "Punt Return": { RETURNER: [50, 84], L1: [10, 34], L2: [22, 48], L3: [34, 48], L4: [42, 58], L5: [46, 68], R1: [90, 34], R2: [78, 48], R3: [66, 48], R4: [58, 58], R5: [54, 68] },
    Kickoff: { KO: [50, 82], L1: [12, 45], L2: [28, 45], L3: [40, 45], L4: [46, 58], L5: [48, 68], R1: [88, 45], R2: [72, 45], R3: [60, 45], R4: [54, 58], R5: [52, 68] },
    "Kick Return": { "KR-L": [38, 84], "KR-R": [62, 84], M: [50, 68], L1: [12, 38], L2: [26, 48], L3: [38, 57], L4: [44, 68], R1: [88, 38], R2: [74, 48], R3: [62, 57], R4: [56, 68] },
    "Extra Point": { PAT: [50, 84], HOLDER: [50, 70], LS: [50, 50], LT: [26, 50], LG: [38, 50], C: [50, 42], RG: [62, 50], RT: [74, 50], LW: [12, 42], RW: [88, 42], PP: [50, 60] },
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
    positionUnit: $("#positionUnit"), positionUnitLabel: $("#positionUnitLabel"), positionDepth: $("#positionDepth"), positionNotes: $("#positionNotes"), dialogTitle: $("#positionDialogTitle"),
    savePosition: $("#savePositionButton"), spreadsheetInput: $("#spreadsheetInput"), backupInput: $("#backupInput"),
    toast: $("#toast"), layoutButtons: [...document.querySelectorAll("[data-layout]")], specialUnitTabs: $("#specialUnitTabs"),
    specialUnitButtons: [...document.querySelectorAll("[data-special-unit]")],
  };
  let selectedPlayerId = null;
  let selectedFieldPositionId = null;
  let fieldDrag = null;
  let suppressFieldClick = false;
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
  function specialUnitValue(value, positionName = "") {
    const clean = String(value ?? "").trim().toLowerCase();
    const exact = SPECIAL_UNITS.find((unit) => unit.toLowerCase() === clean);
    if (exact) return exact;
    const name = String(positionName).trim().toUpperCase();
    if (name === "KO") return "Kickoff";
    if (name === "PAT") return "Extra Point";
    if (name.includes("RETURN")) return name.includes("PUNT") ? "Punt Return" : "Kick Return";
    return "Punt";
  }
  function depthValue(value, blankIsThree = false) {
    if (blankIsThree && String(value ?? "").trim() === "") return 3;
    const depth = Number.parseInt(String(value), 10);
    return Number.isInteger(depth) && depth >= 1 && depth <= 6 ? depth : null;
  }
  function starterPositions() {
    const positions = ["Offense", "Defense"].flatMap((side) => positionDefaults[side].map((name, index) => ({
      id: `${slug(side)}-${slug(name)}-${index + 1}`, name, side, unit: "", depth: 3, notes: "",
    })));
    SPECIAL_UNITS.forEach((unit) => specialTeamDefaults[unit].forEach((name, index) => positions.push({
      id: `special-${slug(unit)}-${slug(name)}-${index + 1}`, name, side: "Special Teams", unit, depth: 3, notes: "",
    })));
    return positions;
  }
  function defaultState() {
    return { version: 4, roster: [], positions: [], assignments: {}, selectedView: "All", selectedSpecialUnit: "Punt", layoutMode: "list", fieldLayout: {} };
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
      return { id, name, side, unit: side === "Special Teams" ? specialUnitValue(p.unit, name) : "", depth, notes: String(p.notes ?? "").trim() };
    }).filter(Boolean);
    if (Number(candidate.version || 1) < 3) {
      SPECIAL_UNITS.forEach((unit) => specialTeamDefaults[unit].forEach((name, index) => {
        if (positions.some((position) => position.side === "Special Teams" && position.unit === unit && position.name === name)) return;
        let id = `special-${slug(unit)}-${slug(name)}-${index + 1}`;
        while (positionIds.has(id)) id = makeId("position", `${unit}-${name}`);
        positionIds.add(id); positions.push({ id, name, side: "Special Teams", unit, depth: 3, notes: "" });
      }));
    }
    const assignments = {};
    positions.forEach((position) => {
      const source = Array.isArray(candidate.assignments?.[position.id]) ? candidate.assignments[position.id] : [];
      const seen = new Set();
      assignments[position.id] = Array.from({ length: position.depth }, (_, i) => {
        const id = source[i]; if (!playerIds.has(id) || seen.has(id)) return null; seen.add(id); return id;
      });
    });
    const fieldLayout = {};
    positions.forEach((position) => {
      const point = candidate.fieldLayout?.[position.id];
      const x = Number(point?.x), y = Number(point?.y);
      if (Number.isFinite(x) && Number.isFinite(y)) fieldLayout[position.id] = { x: Math.min(95, Math.max(5, x)), y: Math.min(92, Math.max(8, y)) };
    });
    return {
      version: 4, roster, positions, assignments,
      selectedView: VIEWS.includes(candidate.selectedView) ? candidate.selectedView : "All",
      selectedSpecialUnit: SPECIAL_UNIT_VIEWS.includes(candidate.selectedSpecialUnit) ? candidate.selectedSpecialUnit : "Punt",
      layoutMode: candidate.layoutMode === "field" ? "field" : "list",
      fieldLayout,
    };
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
    els.layoutButtons.forEach((button) => { const active = button.dataset.layout === state.layoutMode; button.classList.toggle("active", active); button.setAttribute("aria-pressed", active); });
    const special = state.selectedView === "Special Teams";
    els.specialUnitTabs.hidden = !special;
    els.specialUnitButtons.forEach((button) => { const active = button.dataset.specialUnit === state.selectedSpecialUnit; button.classList.toggle("active", active); button.setAttribute("aria-selected", active); });
    els.chartTitle.textContent = state.selectedView === "All" ? "All Positions" : special && state.selectedSpecialUnit !== "All Units" ? `Special Teams · ${state.selectedSpecialUnit}` : state.selectedView;
  }
  function positionInCurrentView(position) {
    if (state.selectedView === "All") return true;
    if (position.side !== state.selectedView) return false;
    return position.side !== "Special Teams" || state.selectedSpecialUnit === "All Units" || position.unit === state.selectedSpecialUnit;
  }
  function assignedPlayerIdsForView() {
    const positions = state.positions.filter(positionInCurrentView);
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
    const poolName = state.selectedView === "Special Teams" && state.selectedSpecialUnit !== "All Units" ? state.selectedSpecialUnit : state.selectedView;
    els.rosterHelp.textContent = state.selectedView === "All"
      ? "Assigned players leave this list. Tap or drag a filled slot to reuse that player elsewhere."
      : `Assigned ${poolName} players leave this list. They remain available for the other units.`;
    els.rosterEmpty.textContent = query
      ? "No available players match that search."
      : !state.roster.length
        ? "No players yet. Tap ＋ to add one or import a roster."
        : `Every player is assigned in the ${state.selectedView === "All" ? "visible chart" : poolName + " pool"}.`;
    els.rosterEmpty.hidden = roster.length > 0;
    els.rosterList.innerHTML = roster.map((p) => `<button type="button" draggable="true" class="player${p.id === selectedPlayerId ? " selected" : ""}" data-player-id="${esc(p.id)}" aria-pressed="${p.id === selectedPlayerId}" title="${esc(p.notes || `Select ${p.name}`)}"><span class="jersey${p.jersey ? "" : " blank"}">${esc(p.jersey || "—")}</span><span class="player-name">${esc(p.name)}</span><span class="grip" aria-hidden="true">⋮⋮</span></button>`).join("");
  }
  function renderSelection() {
    const chosen = player(selectedPlayerId);
    if (!chosen) { selectedPlayerId = null; els.selection.hidden = true; return; }
    els.selectedName.textContent = `${chosen.jersey ? `#${chosen.jersey} ` : ""}${chosen.name}`; els.selection.hidden = false;
  }
  function visibleGroups() {
    const groups = [];
    if (state.selectedView === "All" || state.selectedView === "Offense") groups.push({ label: "Offense", side: "Offense", unit: "", positions: state.positions.filter((p) => p.side === "Offense") });
    if (state.selectedView === "All" || state.selectedView === "Defense") groups.push({ label: "Defense", side: "Defense", unit: "", positions: state.positions.filter((p) => p.side === "Defense") });
    if (state.selectedView === "All" || state.selectedView === "Special Teams") {
      const units = state.selectedView === "Special Teams" && state.selectedSpecialUnit !== "All Units" ? [state.selectedSpecialUnit] : SPECIAL_UNITS;
      units.forEach((unit) => groups.push({ label: unit, side: "Special Teams", unit, positions: state.positions.filter((p) => p.side === "Special Teams" && p.unit === unit) }));
    }
    return groups.filter((group) => group.positions.length);
  }
  function emptyPositionsMarkup() {
    if (state.positions.length) return '<p class="no-positions">No positions in this view yet. Use ＋ Add Position to create one.</p>';
    return `<section class="setup-empty"><small>NEW TEAM</small><h3>Build your depth chart</h3><p>Your roster and positions start empty on this device. Add them manually, import a spreadsheet, or load editable standard football positions.</p><div><button type="button" class="btn primary" data-load-standard-positions>Load Standard Positions</button><button type="button" class="btn secondary" data-import-setup>Import Spreadsheet</button></div></section>`;
  }
  function renderPositions() {
    if (state.layoutMode === "field") { renderFieldView(); return; }
    els.groups.innerHTML = visibleGroups().map((group) => {
      const positions = group.positions;
      return `<section class="group" data-side="${esc(group.side)}" data-unit="${esc(group.unit)}" aria-label="${esc(group.label)} positions"><div class="group-head"><h3>${esc(group.label)} · ${positions.length}</h3><i class="group-line"></i></div><div class="position-grid">${positions.map((position, index) => card(position, index, positions.length)).join("")}</div></section>`;
    }).join("") || emptyPositionsMarkup();
  }
  function fallbackFieldPoint(index, count) {
    const columns = Math.min(5, Math.max(1, count));
    const rows = Math.ceil(count / columns);
    const column = index % columns, row = Math.floor(index / columns);
    return { x: columns === 1 ? 50 : 14 + (72 * column / (columns - 1)), y: rows === 1 ? 50 : 23 + (56 * row / (rows - 1)) };
  }
  function fieldPoint(position, sideIndex, sideCount) {
    const saved = state.fieldLayout[position.id];
    if (saved) return saved;
    const known = position.side === "Special Teams" ? specialFieldDefaults[position.unit]?.[position.name] : fieldDefaults[position.side]?.[position.name];
    return known ? { x: known[0], y: known[1] } : fallbackFieldPoint(sideIndex, sideCount);
  }
  function fieldMarker(position, sideIndex, sideCount) {
    const point = fieldPoint(position, sideIndex, sideCount);
    const starter = player(slots(position)[0]);
    const selected = selectedFieldPositionId === position.id;
    return `<div class="field-marker${selected ? " selected" : ""}" data-side="${esc(position.side)}" data-field-position-select="${esc(position.id)}" style="--field-x:${point.x};--field-y:${point.y}" role="button" tabindex="0" aria-label="${esc(position.name)}${starter ? `, first team ${esc(starter.name)}` : ", open"}. Select to view depth slots."><button type="button" class="field-drag-handle" data-field-drag="${esc(position.id)}" aria-label="Move ${esc(position.name)} on field" title="Drag to move ${esc(position.name)}">✥</button><strong>${esc(position.name)}</strong><span>${starter ? `${starter.jersey ? `#${esc(starter.jersey)} ` : ""}${esc(starter.name)}` : "Open starter"}</span></div>`;
  }
  function printFieldPosition(position) {
    const rows = slots(position).map((playerId, index) => {
      const assigned = player(playerId);
      return `<li><b>${ordinal(index + 1)}</b><span>${assigned ? `${assigned.jersey ? `#${esc(assigned.jersey)} ` : ""}${esc(assigned.name)}` : "Open"}</span></li>`;
    }).join("");
    return `<article class="print-position"><h4>${esc(position.name)}</h4><ol>${rows}</ol></article>`;
  }
  function renderFieldView() {
    const groups = visibleGroups();
    const visiblePositions = groups.flatMap((group) => group.positions);
    if (!visiblePositions.some((position) => position.id === selectedFieldPositionId)) selectedFieldPositionId = visiblePositions[0]?.id || null;
    els.groups.innerHTML = groups.map((group) => {
      const { side, unit, label, positions } = group;
      const selected = positions.find((position) => position.id === selectedFieldPositionId);
      const selectedIndex = selected ? positions.findIndex((position) => position.id === selected.id) : -1;
      return `<section class="field-group" data-side="${esc(side)}" data-unit="${esc(unit)}" aria-label="${esc(label)} field"><div class="group-head"><h3>${esc(label)} · FIELD VIEW</h3><i class="group-line"></i><button type="button" class="reset-field" data-reset-field="${esc(side)}" data-reset-unit="${esc(unit)}">Reset layout</button></div><p class="field-help">Drag the ✥ handle to place each position. Tap a position to view and edit its depth slots.</p><div class="field-scroll"><div class="football-field" data-field-side="${esc(side)}" data-field-unit="${esc(unit)}"><div class="end-zone end-zone-top">${esc(label)}</div><div class="end-zone end-zone-bottom">11U</div><div class="field-midline"><span>50</span></div>${positions.map((position, index) => fieldMarker(position, index, positions.length)).join("")}</div></div><section class="field-print-depth"><h4>${esc(label)} Depth Chart</h4><div>${positions.map(printFieldPosition).join("")}</div></section>${selected ? `<div class="field-detail"><div class="field-detail-head"><small>SELECTED POSITION</small><span>Assign players here or choose another marker above.</span></div><div class="field-detail-card">${card(selected, selectedIndex, positions.length)}</div></div>` : ""}</section>`;
    }).join("") || emptyPositionsMarkup();
  }
  function card(position, sideIndex, sideCount) {
    const rows = slots(position).map((playerId, index) => {
      const assigned = player(playerId);
      const content = assigned ? `<span class="slot-player"><span class="slot-num">${assigned.jersey ? `#${esc(assigned.jersey)}` : "—"}</span><span class="slot-name">${esc(assigned.name)}</span></span>` : '<span class="open">Open slot</span>';
      const reuse = assigned ? `<button type="button" class="reuse-slot" data-reuse-player-id="${esc(assigned.id)}" aria-label="Use ${esc(assigned.name)} again" title="Use ${esc(assigned.name)} at another position">↗</button>` : "";
      return `<div class="slot-row${assigned ? " with-reuse" : ""}"><button type="button" class="slot${assigned ? " filled" : ""}${selectedPlayerId ? " ready" : ""}" data-position-id="${esc(position.id)}" data-depth-index="${index}" ${assigned ? `data-assigned-player-id="${esc(assigned.id)}" draggable="true" title="Select ${esc(assigned.name)} to reuse at another position"` : ""} aria-label="${ordinal(index + 1)} depth for ${esc(position.name)}${assigned ? `, currently ${esc(assigned.name)}; tap to reuse` : ", open"}"><span class="depth">${ordinal(index + 1)}</span>${content}</button>${reuse}<button type="button" class="clear-slot" data-position-id="${esc(position.id)}" data-clear-index="${index}" aria-label="Clear ${ordinal(index + 1)} depth for ${esc(position.name)}" ${assigned ? "" : "disabled"}>×</button></div>`;
    }).join("");
    const category = position.side === "Special Teams" ? `${position.side} · ${position.unit}` : position.side;
    return `<article class="position" data-side="${esc(position.side)}" data-unit="${esc(position.unit)}" data-position-card-id="${esc(position.id)}"><header class="position-head"><div class="position-title"><h3 title="${esc(position.name)}">${esc(position.name)}</h3><span>${esc(category)} · ${position.depth} deep</span></div><div class="position-actions"><button class="move-position" data-move-position="${esc(position.id)}" data-move-direction="-1" aria-label="Move ${esc(position.name)} earlier" title="Move earlier" ${sideIndex === 0 ? "disabled" : ""}>←</button><button class="move-position" data-move-position="${esc(position.id)}" data-move-direction="1" aria-label="Move ${esc(position.name)} later" title="Move later" ${sideIndex === sideCount - 1 ? "disabled" : ""}>→</button><button class="edit" data-edit="${esc(position.id)}" aria-label="Edit ${esc(position.name)}" title="Edit position">✎</button><button class="delete" data-delete="${esc(position.id)}" aria-label="Delete ${esc(position.name)}" title="Delete position">×</button></div></header>${position.notes ? `<p class="position-note">${esc(position.notes)}</p>` : ""}<div class="depth-list">${rows}</div></article>`;
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
    const sidePositions = state.positions.filter((item) => item.side === position.side && item.unit === position.unit);
    const currentIndex = sidePositions.findIndex((item) => item.id === positionId);
    const target = sidePositions[currentIndex + direction];
    if (!target) return;
    const sourceIndex = state.positions.findIndex((item) => item.id === position.id);
    const targetIndex = state.positions.findIndex((item) => item.id === target.id);
    [state.positions[sourceIndex], state.positions[targetIndex]] = [state.positions[targetIndex], state.positions[sourceIndex]];
    commit(`${position.name} moved ${direction < 0 ? "earlier" : "later"} in ${position.unit || position.side}.`);
  }
  function setFieldPoint(positionId, point) {
    state.fieldLayout[positionId] = {
      x: Math.round(Math.min(95, Math.max(5, point.x)) * 10) / 10,
      y: Math.round(Math.min(92, Math.max(8, point.y)) * 10) / 10,
    };
  }
  function startFieldDrag(event) {
    const handle = event.target.closest("[data-field-drag]");
    if (!handle || event.button > 0) return;
    const marker = handle.closest(".field-marker"), field = handle.closest(".football-field");
    const position = state.positions.find((item) => item.id === handle.dataset.fieldDrag);
    if (!marker || !field || !position) return;
    const sidePositions = state.positions.filter((item) => item.side === position.side && item.unit === position.unit);
    const point = fieldPoint(position, sidePositions.findIndex((item) => item.id === position.id), sidePositions.length);
    fieldDrag = { pointerId: event.pointerId, position, marker, field, startX: event.clientX, startY: event.clientY, point, moved: false };
    handle.setPointerCapture?.(event.pointerId); marker.classList.add("moving"); event.preventDefault();
  }
  function moveFieldDrag(event) {
    if (!fieldDrag || event.pointerId !== fieldDrag.pointerId) return;
    const rect = fieldDrag.field.getBoundingClientRect();
    const dx = event.clientX - fieldDrag.startX, dy = event.clientY - fieldDrag.startY;
    if (Math.abs(dx) + Math.abs(dy) > 4) fieldDrag.moved = true;
    const point = { x: fieldDrag.point.x + dx / rect.width * 100, y: fieldDrag.point.y + dy / rect.height * 100 };
    const x = Math.min(95, Math.max(5, point.x)), y = Math.min(92, Math.max(8, point.y));
    fieldDrag.marker.style.setProperty("--field-x", x); fieldDrag.marker.style.setProperty("--field-y", y);
    fieldDrag.latest = { x, y }; event.preventDefault();
  }
  function endFieldDrag(event) {
    if (!fieldDrag || event.pointerId !== fieldDrag.pointerId) return;
    const completed = fieldDrag; fieldDrag = null; completed.marker.classList.remove("moving");
    if (!completed.moved || !completed.latest) return;
    setFieldPoint(completed.position.id, completed.latest); selectedFieldPositionId = completed.position.id; suppressFieldClick = true;
    commit(`${completed.position.name} moved on the field.`); setTimeout(() => { suppressFieldClick = false; }, 0);
  }
  function moveFieldByKey(event) {
    const handle = event.target.closest("[data-field-drag]");
    if (!handle || !["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown"].includes(event.key)) return;
    const position = state.positions.find((item) => item.id === handle.dataset.fieldDrag); if (!position) return;
    const sidePositions = state.positions.filter((item) => item.side === position.side && item.unit === position.unit);
    const point = fieldPoint(position, sidePositions.findIndex((item) => item.id === position.id), sidePositions.length);
    const step = event.shiftKey ? 5 : 1;
    if (event.key === "ArrowLeft") point.x -= step; if (event.key === "ArrowRight") point.x += step;
    if (event.key === "ArrowUp") point.y -= step; if (event.key === "ArrowDown") point.y += step;
    event.preventDefault(); setFieldPoint(position.id, point); selectedFieldPositionId = position.id; commit(`${position.name} moved on the field.`);
  }
  function resetField(side, unit = "") {
    state.positions.filter((position) => position.side === side && position.unit === unit).forEach((position) => { delete state.fieldLayout[position.id]; });
    commit(`${unit || side} field layout reset.`);
  }
  function loadStandardPositions() {
    if (state.positions.length && !confirm("Replace every current position and assignment with the standard football position templates? Your roster will remain.")) return;
    state.positions = starterPositions(); state.assignments = {}; state.fieldLayout = {}; selectedPlayerId = null; selectedFieldPositionId = null;
    commit("Standard positions loaded. Edit any label to match your system.");
  }
  function startNewTeam() {
    const hasData = state.roster.length || state.positions.length || Object.values(state.assignments).some((list) => Array.isArray(list) && list.some(Boolean));
    if (!hasData) return notify("This device already has a blank team.");
    if (!confirm("Start a new blank team on this device? This removes the roster, positions, assignments, and field layouts. Export a JSON backup first if you may need this chart again.")) return;
    state = defaultState(); selectedPlayerId = null; selectedFieldPositionId = null; els.rosterSearch.value = ""; commit("New blank team ready.");
  }
  function openDialog(dialog) { dialog.showModal ? dialog.showModal() : dialog.setAttribute("open", ""); }
  function closeDialog(dialog) { dialog.close ? dialog.close() : dialog.removeAttribute("open"); }
  function menu(open = els.toolsMenu.hidden) { els.toolsMenu.hidden = !open; els.toolsButton.setAttribute("aria-expanded", open); }
  function updatePositionUnitVisibility() { els.positionUnitLabel.hidden = els.positionSide.value !== "Special Teams"; }
  function openAddPosition() {
    els.positionForm.reset(); els.positionId.value = ""; els.positionDepth.value = "3"; els.positionSide.value = state.selectedView === "All" ? "Offense" : state.selectedView;
    els.positionUnit.value = state.selectedSpecialUnit === "All Units" ? "Punt" : state.selectedSpecialUnit; updatePositionUnitVisibility();
    els.dialogTitle.textContent = "Add Position"; els.savePosition.textContent = "Add Position"; openDialog(els.positionDialog); els.positionName.focus();
  }
  function openEdit(id) {
    const p = state.positions.find((item) => item.id === id); if (!p) return;
    els.positionId.value = p.id; els.positionName.value = p.name; els.positionSide.value = p.side; els.positionUnit.value = p.unit || "Punt"; els.positionDepth.value = p.depth; els.positionNotes.value = p.notes; updatePositionUnitVisibility();
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
    try { const restored = sanitize(JSON.parse(await file.text())); if (!restored) throw new Error("This file is not a valid depth chart backup."); state = restored; selectedPlayerId = null; selectedFieldPositionId = null; els.rosterSearch.value = ""; commit("Backup restored successfully."); }
    catch (error) { notify(error.message || "Backup could not be restored.", true); }
  }
  function hasXlsx() { if (globalThis.XLSX) return true; notify("The spreadsheet tool did not load. Refresh and try again.", true); return false; }
  function template() {
    if (!hasXlsx()) return;
    const wb = XLSX.utils.book_new();
    const ps = XLSX.utils.json_to_sheet([{ Position: "QB", Side: "Offense", Unit: "", Depth: 3, Notes: "Example position — edit or replace" }, { Position: "MLB", Side: "Defense", Unit: "", Depth: 3, Notes: "Example position — edit or replace" }, { Position: "KICKER", Side: "Special Teams", Unit: "Kickoff", Depth: 2, Notes: "Example position — edit or replace" }]);
    const rs = XLSX.utils.json_to_sheet([{ "Jersey Number": 12, "Player Name": "Example Player", Notes: "This row is ignored during import" }]);
    const instructions = [["11U Football Depth Chart Import Template"], [""], ["Positions: use Position, Side, Unit, Depth, Notes."], ["Valid Side values: Offense, Defense, Special Teams."], ["For Special Teams, valid Unit values: Punt, Punt Return, Kickoff, Kick Return, Extra Point."], ["Blank or unrecognized Special Teams Unit values default to Punt."], ["Depth is 1 through 6; blank defaults to 3."], ["Valid imported positions replace current positions; names keep their entered spelling."], [""], ["Roster: use Jersey Number, Player Name, Notes."], ["Jersey Number may be blank; Player Name is required."], ["Valid imported players replace the current roster."], ["Blank rows and rows named Example Player are ignored."], ["Assignments clear when roster or positions are replaced."], ["CSV may contain either the Positions or Roster headers."]];
    const ins = XLSX.utils.aoa_to_sheet(instructions); ps["!cols"] = [{ wch: 22 }, { wch: 18 }, { wch: 18 }, { wch: 10 }, { wch: 38 }]; rs["!cols"] = [{ wch: 16 }, { wch: 28 }, { wch: 38 }]; ins["!cols"] = [{ wch: 110 }];
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
    return (rows || []).map((source) => { const row = rowKeys(source), name = String(row.position ?? "").trim(), side = sideValue(row.side), depth = depthValue(row.depth, true); if (!name || name.toLowerCase() === "example player" || !side || !depth) return null; return { id: makeId("position", name), name, side, unit: side === "Special Teams" ? specialUnitValue(row.unit, name) : "", depth, notes: String(row.notes ?? "").trim() }; }).filter(Boolean);
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
      const replaced = []; if (positions.length) { state.positions = positions; state.assignments = {}; state.fieldLayout = {}; selectedFieldPositionId = null; replaced.push(`${positions.length} positions`); } if (roster.length) { state.roster = roster; state.assignments = {}; replaced.push(`${roster.length} players`); }
      selectedPlayerId = null; els.rosterSearch.value = ""; commit(`Imported ${replaced.join(" and ")}.`);
    } catch (error) { console.error(error); notify(error.message || "Spreadsheet import failed.", true); }
  }

  els.tabs.forEach((tab) => tab.addEventListener("click", () => { state.selectedView = tab.dataset.view; selectedFieldPositionId = null; commit(); }));
  els.specialUnitButtons.forEach((button) => button.addEventListener("click", () => { state.selectedSpecialUnit = button.dataset.specialUnit; selectedPlayerId = null; selectedFieldPositionId = null; commit(); }));
  els.layoutButtons.forEach((button) => button.addEventListener("click", () => { state.layoutMode = button.dataset.layout; selectedFieldPositionId = null; commit(state.layoutMode === "field" ? "Field view opened. Drag positions into place." : "List view opened."); }));
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
  els.groups.addEventListener("pointerdown", startFieldDrag);
  els.groups.addEventListener("pointermove", moveFieldDrag);
  els.groups.addEventListener("pointerup", endFieldDrag);
  els.groups.addEventListener("pointercancel", endFieldDrag);
  els.groups.addEventListener("keydown", (event) => {
    moveFieldByKey(event);
    const marker = event.target.closest("[data-field-position-select]");
    if (marker && !event.target.closest("[data-field-drag]") && (event.key === "Enter" || event.key === " ")) { event.preventDefault(); selectedFieldPositionId = marker.dataset.fieldPositionSelect; renderPositions(); }
  });
  els.groups.addEventListener("click", (event) => {
    const loadStandard = event.target.closest("[data-load-standard-positions]"); if (loadStandard) { loadStandardPositions(); return; }
    const setupImport = event.target.closest("[data-import-setup]"); if (setupImport) { els.spreadsheetInput.click(); return; }
    const reset = event.target.closest("[data-reset-field]"); if (reset) { resetField(reset.dataset.resetField, reset.dataset.resetUnit || ""); return; }
    const fieldPosition = event.target.closest("[data-field-position-select]");
    if (fieldPosition) { if (!suppressFieldClick) { selectedFieldPositionId = fieldPosition.dataset.fieldPositionSelect; renderPositions(); } return; }
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
    const del = event.target.closest("[data-delete]"); if (del) { const position = state.positions.find((p) => p.id === del.dataset.delete); if (position && confirm(`Delete ${position.name} and its assignments?`)) { state.positions = state.positions.filter((p) => p.id !== position.id); delete state.assignments[position.id]; delete state.fieldLayout[position.id]; if (selectedFieldPositionId === position.id) selectedFieldPositionId = null; commit(`${position.name} deleted.`); } }
  });
  $("#addPlayerButton").addEventListener("click", () => { els.playerForm.reset(); openDialog(els.playerDialog); els.playerName.focus(); });
  $("#addPositionButton").addEventListener("click", openAddPosition);
  els.positionSide.addEventListener("change", updatePositionUnitVisibility);
  els.playerForm.addEventListener("submit", (event) => { event.preventDefault(); const name = els.playerName.value.trim(); if (!name) return; state.roster.push({ id: makeId("player", name), jersey: els.playerJersey.value.trim(), name, notes: els.playerNotes.value.trim() }); closeDialog(els.playerDialog); commit(`${name} added to the roster.`); });
  els.positionForm.addEventListener("submit", (event) => {
    event.preventDefault(); const name = els.positionName.value.trim(), side = sideValue(els.positionSide.value), unit = side === "Special Teams" ? specialUnitValue(els.positionUnit.value, name) : "", depth = depthValue(els.positionDepth.value); if (!name || !side || !depth) return;
    const current = state.positions.find((p) => p.id === els.positionId.value);
    if (current) { current.name = name; current.side = side; current.unit = unit; current.depth = depth; current.notes = els.positionNotes.value.trim(); state.assignments[current.id] = Array.from({ length: depth }, (_, i) => state.assignments[current.id]?.[i] || null); closeDialog(els.positionDialog); commit(`${name} updated.`); }
    else { const position = { id: makeId("position", name), name, side, unit, depth, notes: els.positionNotes.value.trim() }; state.positions.push(position); state.assignments[position.id] = Array(depth).fill(null); closeDialog(els.positionDialog); commit(`${name} added to ${unit || side}.`); }
  });
  document.querySelectorAll("[data-close]").forEach((button) => button.addEventListener("click", () => closeDialog(document.getElementById(button.dataset.close))));
  [els.playerDialog, els.positionDialog].forEach((dialog) => dialog.addEventListener("click", (event) => { if (event.target === dialog) closeDialog(dialog); }));
  els.toolsButton.addEventListener("click", () => menu()); document.addEventListener("click", (event) => { if (!event.target.closest(".menu-wrap")) menu(false); });
  $("#clearButton").addEventListener("click", () => { menu(false); const any = Object.values(state.assignments).some((list) => Array.isArray(list) && list.some(Boolean)); if (!any) return notify("There are no assignments to clear."); if (confirm("Clear every player assignment? Your roster and positions will stay in place.")) { state.assignments = {}; selectedPlayerId = null; commit("All assignments cleared."); } });
  $("#loadPositionsButton").addEventListener("click", () => { menu(false); loadStandardPositions(); });
  $("#newTeamButton").addEventListener("click", () => { menu(false); startNewTeam(); });
  function printChart() { menu(false); window.print(); }
  $("#printButton").addEventListener("click", printChart); $("#quickPrintButton").addEventListener("click", printChart);
  $("#backupExportButton").addEventListener("click", () => { menu(false); exportBackup(); }); $("#backupImportButton").addEventListener("click", () => { menu(false); els.backupInput.click(); });
  $("#templateButton").addEventListener("click", () => { menu(false); template(); }); $("#sheetImportButton").addEventListener("click", () => { menu(false); els.spreadsheetInput.click(); });
  els.backupInput.addEventListener("change", async () => { const file = els.backupInput.files[0]; if (file) await restoreBackup(file); els.backupInput.value = ""; });
  els.spreadsheetInput.addEventListener("change", async () => { const file = els.spreadsheetInput.files[0]; if (file) await importSheet(file); els.spreadsheetInput.value = ""; });
  window.addEventListener("storage", (event) => { if (event.key !== KEY || !event.newValue) return; try { const incoming = sanitize(JSON.parse(event.newValue)); if (incoming) { state = incoming; selectedPlayerId = null; selectedFieldPositionId = null; render(); notify("Depth chart refreshed from another tab."); } } catch {} });
  globalThis.DepthChartApp = { storageKey: KEY, getState: () => structuredClone(state), assign, clearSlot, movePosition, setFieldPoint, resetField, parsePositions, parseRoster, sanitize };
  save(); render();
})();
