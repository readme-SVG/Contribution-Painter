import { DAYS_PER_WEEK } from "./core/calendar.js";
import { RANDOM_BRUSH, resolveLevel } from "./core/pattern.js";

export class GridEditor {
  constructor(
    element,
    monthsElement,
    { translate, locale, onStroke, onBrush },
  ) {
    this.element = element;
    this.monthsElement = monthsElement;
    this.translate = translate;
    this.locale = locale;
    this.onStroke = onStroke;
    this.onBrush = onBrush;
    this.pattern = null;
    this.cells = [];
    this.brush = 1;
    this.focusIndex = 0;
    this.stroke = null;
    this.controller = new AbortController();
    const options = { signal: this.controller.signal };
    element.addEventListener(
      "pointerdown",
      (event) => this.#pointerDown(event),
      options,
    );
    element.addEventListener(
      "pointermove",
      (event) => this.#pointerMove(event),
      options,
    );
    element.addEventListener("pointerup", () => this.finishStroke(), options);
    element.addEventListener(
      "pointercancel",
      () => this.finishStroke(),
      options,
    );
    element.addEventListener(
      "lostpointercapture",
      () => this.finishStroke(),
      options,
    );
    element.addEventListener(
      "keydown",
      (event) => this.#keyDown(event),
      options,
    );
    window.addEventListener("blur", () => this.finishStroke(), options);
  }

  render(pattern) {
    this.finishStroke();
    this.pattern = pattern;
    this.cells = [];
    this.element.replaceChildren();
    this.monthsElement.replaceChildren();
    const { calendar } = pattern;
    const columns = `repeat(${calendar.columns}, var(--cell-size))`;
    this.element.style.gridTemplateColumns = columns;
    this.monthsElement.style.gridTemplateColumns = columns;
    this.element.setAttribute(
      "aria-label",
      this.translate("graph_label", { year: calendar.year }),
    );
    this.element.setAttribute("aria-colcount", calendar.columns);
    this.focusIndex = calendar.activeIndices[0] ?? -1;

    calendar.months.forEach((month, index) => {
      const label = document.createElement("span");
      const next = calendar.months[index + 1]?.column ?? calendar.columns;
      label.style.gridColumn = `${month.column + 1} / ${next + 1}`;
      label.textContent = new Intl.DateTimeFormat(this.locale, {
        month: "short",
        timeZone: "UTC",
      }).format(Date.UTC(calendar.year, month.month, 1));
      this.monthsElement.append(label);
    });

    const fragment = document.createDocumentFragment();
    for (let row = 0; row < DAYS_PER_WEEK; row += 1) {
      const rowElement = document.createElement("div");
      rowElement.className = "graph-row";
      rowElement.setAttribute("role", "row");
      for (let column = 0; column < calendar.columns; column += 1) {
        const index = column * DAYS_PER_WEEK + row;
        const day = calendar.days[index];
        const cell = document.createElement("button");
        cell.type = "button";
        cell.className = "cell";
        cell.dataset.index = index;
        cell.dataset.level = pattern.levels[index];
        cell.setAttribute("role", "gridcell");
        cell.setAttribute("aria-colindex", column + 1);
        cell.setAttribute("aria-rowindex", row + 1);
        cell.tabIndex = -1;
        if (!day.editable) {
          cell.classList.add("out");
          cell.setAttribute("aria-disabled", "true");
        }
        this.cells[index] = cell;
        this.updateCell(index);
        rowElement.append(cell);
      }
      fragment.append(rowElement);
    }
    this.element.append(fragment);
    if (this.focusIndex >= 0) this.cells[this.focusIndex].tabIndex = 0;
  }

  updateCell(index) {
    const cell = this.cells[index];
    const day = this.pattern.calendar.days[index];
    const level = this.pattern.levels[index];
    cell.dataset.level = level;
    const label = this.translate(
      day.editable ? "cell_label" : "cell_readonly",
      { date: day.key, level },
    );
    cell.setAttribute("aria-label", label);
    cell.title = label;
  }

  refresh() {
    for (const day of this.pattern.calendar.days) this.updateCell(day.index);
    this.element.setAttribute(
      "aria-label",
      this.translate("graph_label", { year: this.pattern.calendar.year }),
    );
  }

  setBrush(brush) {
    this.brush = brush;
    this.onBrush(brush);
  }

  #paint(index) {
    if (
      this.pattern.set(
        index,
        resolveLevel(this.brush, Math.random, this.stroke?.minimum ?? 0),
      )
    ) {
      this.updateCell(index);
    }
  }

  #focus(index) {
    if (!this.pattern.calendar.days[index]?.editable) return;
    this.cells[this.focusIndex]?.setAttribute("tabindex", "-1");
    this.focusIndex = index;
    this.cells[index].tabIndex = 0;
    this.cells[index].focus({ preventScroll: true });
    this.cells[index].scrollIntoView({ block: "nearest", inline: "nearest" });
  }

  #cellAt(event) {
    const cell = document
      .elementFromPoint(event.clientX, event.clientY)
      ?.closest(".cell");
    return cell && this.element.contains(cell)
      ? Number(cell.dataset.index)
      : null;
  }

  #pointerDown(event) {
    if (
      event.button !== 0 ||
      this.element.closest("fieldset:disabled") ||
      this.stroke
    )
      return;
    const index = this.#cellAt(event);
    if (index === null || !this.pattern.calendar.days[index].editable) return;
    event.preventDefault();
    this.#focus(index);
    this.stroke = {
      pointerId: event.pointerId,
      previous: index,
      minimum: this.brush === RANDOM_BRUSH ? 1 : 0,
    };
    this.pattern.beginStroke();
    this.element.setPointerCapture(event.pointerId);
    this.#paint(index);
  }

  #pointerMove(event) {
    if (!this.stroke || event.pointerId !== this.stroke.pointerId) return;
    const index = this.#cellAt(event);
    if (index === null) return;
    const from = this.pattern.calendar.days[this.stroke.previous];
    const to = this.pattern.calendar.days[index];
    const steps = Math.max(
      Math.abs(to.column - from.column),
      Math.abs(to.row - from.row),
    );
    // Pointer events can skip cells during fast movement; interpolate the missing segment.
    for (let step = 1; step <= steps; step += 1) {
      const column = Math.round(
        from.column + ((to.column - from.column) * step) / steps,
      );
      const row = Math.round(from.row + ((to.row - from.row) * step) / steps);
      this.#paint(column * DAYS_PER_WEEK + row);
    }
    this.stroke.previous = index;
  }

  finishStroke() {
    if (!this.stroke) return;
    const { pointerId } = this.stroke;
    this.stroke = null;
    const changed = this.pattern.endStroke();
    if (this.element.hasPointerCapture(pointerId))
      this.element.releasePointerCapture(pointerId);
    if (changed) this.onStroke();
  }

  #keyDown(event) {
    if (event.altKey || this.element.closest("fieldset:disabled")) return;
    const day = this.pattern.calendar.days[Number(event.target.dataset.index)];
    if (!day) return;
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      this.pattern.transact(() => this.#paint(day.index));
      this.onStroke();
      return;
    }
    const moves = {
      ArrowLeft: [-1, 0],
      ArrowRight: [1, 0],
      ArrowUp: [0, -1],
      ArrowDown: [0, 1],
    };
    let column = day.column;
    let row = day.row;
    if (moves[event.key]) {
      column += moves[event.key][0];
      row += moves[event.key][1];
    } else if (event.key === "Home" || event.key === "End") {
      column = event.key === "Home" ? 0 : this.pattern.calendar.columns - 1;
      if (event.ctrlKey) row = event.key === "Home" ? 0 : DAYS_PER_WEEK - 1;
    } else return;
    event.preventDefault();
    column = Math.max(0, Math.min(this.pattern.calendar.columns - 1, column));
    row = Math.max(0, Math.min(DAYS_PER_WEEK - 1, row));
    this.#focus(column * DAYS_PER_WEEK + row);
  }
}
