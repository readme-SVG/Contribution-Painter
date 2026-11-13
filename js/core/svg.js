const NS = "http://www.w3.org/2000/svg";
const COLORS = ["#21262d", "#0d4429", "#016c31", "#26a641", "#39d353"];

export function createSvg(pattern) {
  const { calendar } = pattern;
  const svg = document.createElementNS(NS, "svg");
  const width = calendar.columns * 16 + 8;
  const height = 7 * 16 + 8;
  for (const [key, value] of Object.entries({
    xmlns: NS,
    viewBox: `0 0 ${width} ${height}`,
    width,
    height,
    role: "img",
    "aria-label": `Contribution pattern for ${calendar.year}`,
  }))
    svg.setAttribute(key, String(value));
  const title = document.createElementNS(NS, "title");
  title.textContent = `Contribution pattern for ${calendar.year}`;
  svg.append(title);
  for (const day of calendar.days) {
    if (
      day.timestamp < Date.UTC(calendar.year, 0, 1) ||
      day.timestamp > Date.UTC(calendar.year, 11, 31)
    )
      continue;
    const rect = document.createElementNS(NS, "rect");
    for (const [key, value] of Object.entries({
      x: day.column * 16 + 4,
      y: day.row * 16 + 4,
      width: 12,
      height: 12,
      rx: 2,
      fill: COLORS[pattern.levels[day.index]],
    }))
      rect.setAttribute(key, String(value));
    const label = document.createElementNS(NS, "title");
    label.textContent = `${day.key}: ${pattern.levels[day.index]}`;
    rect.append(label);
    svg.append(rect);
  }
  return svg;
}
