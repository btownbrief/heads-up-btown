export const esc = (v) =>
  String(v ?? "").replace(
    /[&<>"']/g,
    (c) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[
        c
      ],
  );
const paths = {
  chevron: '<path d="m9 5 7 7-7 7"/>',
  minus: '<path d="M5 12h14"/>',
  info: '<circle cx="12" cy="12" r="9"/><path d="M12 11v6m0-10v.01"/>',
  lock: '<rect x="5" y="10" width="14" height="11" rx="3"/><path d="M8 10V7a4 4 0 0 1 8 0v3"/>',
  star: '<path d="m12 3 2.8 5.8 6.4.9-4.6 4.5 1.1 6.4-5.7-3-5.7 3 1.1-6.4-4.6-4.5 6.4-.9Z"/>',

  cards:
    '<rect x="5" y="4" width="14" height="17" rx="3"/><path d="m5 17-2-1V4a2 2 0 0 1 2-2h10M10 10h4m-2-2v4"/>',
  plus: '<path d="M12 5v14M5 12h14"/>',
  check: '<path d="m5 12 4 4L19 6"/>',
  arrow: '<path d="M4 12h16m-6-6 6 6-6 6"/>',
  back: '<path d="M20 12H4m6-6-6 6 6 6"/>',
  search: '<circle cx="10" cy="10" r="6"/><path d="m15 15 5 5"/>',
  users:
    '<circle cx="9" cy="8" r="3"/><path d="M3 20v-2a6 6 0 0 1 12 0v2M16 5a3 3 0 0 1 0 6m3 9v-2a6 6 0 0 0-2-4"/>',
  settings:
    '<path d="M4 7h16M4 17h16"/><circle cx="8" cy="7" r="3" fill="var(--paper)"/><circle cx="16" cy="17" r="3" fill="var(--paper)"/>',
  fresh: '<path d="M20 8a8 8 0 1 0 0 8M20 3v5h-5"/><path d="m8 12 3 3 6-7"/>',
  heart:
    '<path d="M20 5c-3-3-6 0-8 2-2-2-5-5-8-2-5 5 4 11 8 15 4-4 13-10 8-15Z"/>',
  close: '<path d="m6 6 12 12M18 6 6 18"/>',
  pause: '<path d="M8 5v14M16 5v14"/>',
  play: '<path d="m8 4 12 8-12 8Z"/>',
  clock: '<circle cx="12" cy="12" r="9"/><path d="M12 6v6l4 2"/>',
  screen:
    '<rect x="3" y="4" width="18" height="13" rx="2"/><path d="M8 21h8M12 17v4"/>',
  volume:
    '<path d="m3 9 4 0 5-5v16l-5-5H3ZM16 8a5 5 0 0 1 0 8m3-11a9 9 0 0 1 0 14"/>',
  trophy:
    '<path d="M8 3h8v7a4 4 0 0 1-8 0ZM8 5H4v3a4 4 0 0 0 4 4m8-7h4v3a4 4 0 0 1-4 4M12 14v6M8 21h8"/>',
  download: '<path d="M12 3v12m-5-5 5 5 5-5M4 16v5h16v-5"/>',
  share: '<path d="M12 16V3m-5 5 5-5 5 5M6 12H4v9h16v-9h-2"/>',
  edit: '<path d="m14 4 6 6-10 10H4v-6ZM12 6l6 6"/>',
  flag: '<path d="M5 22V3m0 1c6-4 8 4 15 0v10c-7 4-9-4-15 0"/>',
  phone:
    '<rect x="6" y="2" width="12" height="20" rx="3"/><path d="M10 18h4"/>',
  expand: '<path d="M3 9V3h6m6 0h6v6M3 15v6h6m6 0h6v-6"/>',
};
export const ic = (n) =>
  `<svg class="icon" viewBox="0 0 24 24" aria-hidden="true">${paths[n] || paths.cards}</svg>`;
export function toast(message) {
  const t = document.querySelector("#toast");
  t.textContent = message;
  t.classList.add("show");
  clearTimeout(toast.timer);
  toast.timer = setTimeout(() => t.classList.remove("show"), 3600);
}
export function modal(title, body, actions = "") {
  const d = document.querySelector("#modal");
  d.innerHTML = `<button class="icon-button modal-close" aria-label="Close dialog" data-action="close-modal">${ic("close")}</button><h2 id="modal-title">${esc(title)}</h2><div class="modal-body">${body}</div>${actions ? `<div class="modal-actions">${actions}</div>` : ""}`;
  if (!d.open) d.showModal();
}
export function closeModal() {
  document.querySelector("#modal").close();
}
export const button = (label, action, style = "") =>
  `<button class="button ${style}" data-action="${action}">${label}</button>`;
export const option = (value, label, selected) =>
  `<option value="${esc(value)}" ${String(value) === String(selected) ? "selected" : ""}>${esc(label)}</option>`;
