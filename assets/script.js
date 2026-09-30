/* =====================================================
   0. KONFIGURASI & KEY LOCALSTORAGE
   ===================================================== */
const STORAGE_KEYS = {
  activeTab: "toolkit_activeTab",
  expenses: "toolkit_expenses",
  links: "toolkit_links",
  quizHighScore: "toolkit_quizHighScore",
};

/* =====================================================
   1. TAB NAVIGATION
   ===================================================== */
const TAB_ACTIVE = "bg-sky-600 text-white shadow".split(" ");
const TAB_INACTIVE = "text-slate-600 hover:bg-slate-100".split(" ");

const tabButtons = document.querySelectorAll(".tab-btn");
const tabPanels = document.querySelectorAll(".tab-panel");

function switchTab(name) {
  tabButtons.forEach((btn) => {
    const isActive = btn.dataset.tab === name;
    btn.classList.remove(...TAB_ACTIVE, ...TAB_INACTIVE);
    btn.classList.add(...(isActive ? TAB_ACTIVE : TAB_INACTIVE));
    btn.setAttribute("aria-selected", String(isActive));
  });

  tabPanels.forEach((panel) => {
    panel.classList.toggle("hidden", panel.id !== `panel-${name}`);
  });

  localStorage.setItem(STORAGE_KEYS.activeTab, name);
}

tabButtons.forEach((btn) => {
  btn.addEventListener("click", () => switchTab(btn.dataset.tab));
});

// Pulihkan tab terakhir (validasi dulu supaya tidak error kalau datanya aneh)
const validTabs = Array.from(tabButtons).map((b) => b.dataset.tab);
const savedTab = localStorage.getItem(STORAGE_KEYS.activeTab);
switchTab(validTabs.includes(savedTab) ? savedTab : "expense");

/* =====================================================
   2. EXPENSE TRACKER PRO
   ===================================================== */

// --- 2.1 Selektor DOM ---
const expForm = document.querySelector("#expense-form");
const expTitle = document.querySelector("#exp-title");
const expCategory = document.querySelector("#exp-category");
const expAmount = document.querySelector("#exp-amount");
const expType = document.querySelector("#exp-type");
const expDate = document.querySelector("#exp-date");
const expError = document.querySelector("#exp-error");
const expList = document.querySelector("#exp-list");
const expEmpty = document.querySelector("#exp-empty");
const sumIncome = document.querySelector("#sum-income");
const sumExpense = document.querySelector("#sum-expense");
const sumBalance = document.querySelector("#sum-balance");

const expSearch = document.querySelector("#exp-search");
const expFilterType = document.querySelector("#exp-filter-type");
const expFilterCategory = document.querySelector("#exp-filter-category");
const expSort = document.querySelector("#exp-sort");

// --- 2.2 State + localStorage ---
function loadTransactions() {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.expenses);
    const data = raw ? JSON.parse(raw) : [];
    return Array.isArray(data) ? data : [];
  } catch {
    return []; // data rusak -> mulai dari kosong
  }
}

function saveTransactions() {
  localStorage.setItem(STORAGE_KEYS.expenses, JSON.stringify(transactions));
}

let transactions = loadTransactions();

// --- 2.3 Helper ---
function formatRupiah(number) {
  return "Rp " + number.toLocaleString("id-ID");
}

function formatDate(isoDate) {
  return new Date(isoDate + "T00:00:00").toLocaleDateString("id-ID", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

// Tanggal hari ini (zona waktu lokal) format YYYY-MM-DD
function todayISO() {
  const d = new Date();
  d.setMinutes(d.getMinutes() - d.getTimezoneOffset());
  return d.toISOString().slice(0, 10);
}

// --- 2.4 Validasi: mengembalikan pesan error, atau "" jika valid ---
function validateTransaction({ title, amount, date }) {
  if (title.trim() === "") return "Judul wajib diisi.";
  if (date === "") return "Tanggal wajib diisi.";
  if (!Number.isFinite(amount) || amount <= 0) {
    return "Jumlah harus berupa angka yang lebih dari 0.";
  }
  return "";
}

function showError(el, message) {
  el.textContent = message;
  el.classList.toggle("hidden", message === "");
}

// --- 2.5 Ringkasan ---
function updateSummary() {
  let income = 0;
  let expense = 0;

  transactions.forEach((t) => {
    if (t.type === "Pemasukan") income += t.amount;
    else expense += t.amount;
  });

  sumIncome.textContent = formatRupiah(income);
  sumExpense.textContent = formatRupiah(expense);
  sumBalance.textContent = formatRupiah(income - expense);
}

// --- 2.6 Render daftar ---
// Untuk sementara: tampilkan semua, terbaru di atas (filter/sort di 3C)
function getVisibleTransactions() {
  const keyword = expSearch.value.trim().toLowerCase();
  const typeFilter = expFilterType.value;
  const categoryFilter = expFilterCategory.value;

  // 1. Filter: cari judul + tipe + kategori (semua syarat harus terpenuhi)
  const result = transactions.filter((t) => {
    const matchTitle = t.title.toLowerCase().includes(keyword);
    const matchType = typeFilter === "all" || t.type === typeFilter;
    const matchCategory =
      categoryFilter === "all" || t.category === categoryFilter;
    return matchTitle && matchType && matchCategory;
  });

  // 2. Sort (filter menghasilkan array baru, jadi aman di-sort langsung)
  switch (expSort.value) {
    case "oldest":
      result.sort((a, b) => a.date.localeCompare(b.date));
      break;
    case "amount-desc":
      result.sort((a, b) => b.amount - a.amount);
      break;
    case "amount-asc":
      result.sort((a, b) => a.amount - b.amount);
      break;
    default: // "newest"
      result.sort((a, b) => b.date.localeCompare(a.date));
  }

  return result;
}

function createTransactionItem(t) {
  const isIncome = t.type === "Pemasukan";

  const li = document.createElement("li");
  li.className =
    "flex items-center justify-between gap-3 rounded-xl border border-slate-200 bg-white px-4 py-3";

  // Kiri: judul + badge + tanggal
  const info = document.createElement("div");
  info.className = "min-w-0";

  const title = document.createElement("p");
  title.className = "font-semibold text-slate-900 truncate";
  title.textContent = t.title; // textContent = aman dari HTML injection

  const meta = document.createElement("div");
  meta.className = "mt-1 flex flex-wrap items-center gap-1.5 text-xs";

  const typeBadge = document.createElement("span");
  typeBadge.className =
    "rounded-full px-2 py-0.5 font-medium " +
    (isIncome
      ? "bg-emerald-100 text-emerald-700"
      : "bg-rose-100 text-rose-700");
  typeBadge.textContent = t.type;

  const catBadge = document.createElement("span");
  catBadge.className =
    "rounded-full bg-slate-100 px-2 py-0.5 font-medium text-slate-600";
  catBadge.textContent = t.category;

  const date = document.createElement("span");
  date.className = "text-slate-500";
  date.textContent = formatDate(t.date);

  meta.append(typeBadge, catBadge, date);
  info.append(title, meta);

  // Kanan: jumlah + tombol aksi
  const right = document.createElement("div");
  right.className = "flex shrink-0 items-center gap-2";

  const amount = document.createElement("span");
  amount.className =
    "font-display font-bold " +
    (isIncome ? "text-emerald-700" : "text-rose-700");
  amount.textContent = (isIncome ? "+" : "-") + formatRupiah(t.amount);

  const editBtn = document.createElement("button");
  editBtn.type = "button";
  editBtn.dataset.action = "edit";
  editBtn.dataset.id = t.id;
  editBtn.className = "p-1.5 rounded-lg text-slate-500 hover:bg-slate-100";
  editBtn.setAttribute("aria-label", "Ubah " + t.title);
  editBtn.innerHTML = '<i class="ti ti-pencil text-lg"></i>';

  const deleteBtn = document.createElement("button");
  deleteBtn.type = "button";
  deleteBtn.dataset.action = "delete";
  deleteBtn.dataset.id = t.id;
  deleteBtn.className = "p-1.5 rounded-lg text-rose-500 hover:bg-rose-50";
  deleteBtn.setAttribute("aria-label", "Hapus " + t.title);
  deleteBtn.innerHTML = '<i class="ti ti-trash text-lg"></i>';

  right.append(amount, editBtn, deleteBtn);
  li.append(info, right);
  return li;
}

function renderTransactions() {
  const items = getVisibleTransactions();

  expList.innerHTML = "";
  items.forEach((t) => expList.appendChild(createTransactionItem(t)));

  // Pesan kosong menyesuaikan penyebabnya
  const isEmpty = items.length === 0;
  expEmpty.classList.toggle("hidden", !isEmpty);
  if (isEmpty) {
    expEmpty.querySelector("span").textContent =
      transactions.length === 0
        ? "Belum ada transaksi. Tambahkan transaksi pertamamu."
        : "Tidak ada transaksi yang cocok dengan pencarian atau filter.";
  }

  updateSummary(); // ringkasan tetap dihitung dari SEMUA transaksi
}

// --- 2.7 Tambah transaksi ---
expForm.addEventListener("submit", (e) => {
  e.preventDefault(); // cegah halaman reload

  const data = {
    title: expTitle.value,
    category: expCategory.value,
    amount: Number(expAmount.value),
    type: expType.value,
    date: expDate.value,
  };

  const error = validateTransaction(data);
  showError(expError, error);
  if (error) return; // berhenti kalau tidak valid

  transactions.push({
    id: Date.now().toString(),
    title: data.title.trim(),
    category: data.category,
    amount: data.amount,
    type: data.type,
    date: data.date,
  });

  saveTransactions();
  renderTransactions();

  expForm.reset();
  expDate.value = todayISO();
  expTitle.focus();
});

// --- 2.8 Inisialisasi ---

// --- 2.9 Modal: buka & tutup ---
function openModal(name) {
  const modal = document.querySelector(`#modal-${name}`);
  modal.classList.remove("hidden");
  modal.classList.add("flex");
}

function closeModal(name) {
  const modal = document.querySelector(`#modal-${name}`);
  modal.classList.add("hidden");
  modal.classList.remove("flex");
}

// Satu handler untuk semua tombol tutup (X, Batal) dan klik backdrop
document.querySelectorAll("[data-close-modal]").forEach((btn) => {
  btn.addEventListener("click", () => closeModal(btn.dataset.closeModal));
});

document.querySelectorAll(".modal-backdrop").forEach((backdrop) => {
  backdrop.addEventListener("click", () => {
    const modal = backdrop.closest("[role='dialog']");
    closeModal(modal.id.replace("modal-", ""));
  });
});

// Tekan Esc untuk menutup modal yang terbuka
document.addEventListener("keydown", (e) => {
  if (e.key !== "Escape") return;
  document.querySelectorAll("[role='dialog']:not(.hidden)").forEach((modal) => {
    closeModal(modal.id.replace("modal-", ""));
  });
});

// --- 2.10 Klik tombol Ubah / Hapus di daftar (event delegation) ---
let editingId = null; // id transaksi yang sedang diubah
let deletingId = null; // id transaksi yang akan dihapus

const editForm = document.querySelector("#expense-edit-form");
const editTitle = document.querySelector("#edit-exp-title");
const editCategory = document.querySelector("#edit-exp-category");
const editType = document.querySelector("#edit-exp-type");
const editAmount = document.querySelector("#edit-exp-amount");
const editDate = document.querySelector("#edit-exp-date");
const editError = document.querySelector("#edit-exp-error");
const deleteTitle = document.querySelector("#delete-exp-title");
const deleteConfirm = document.querySelector("#exp-delete-confirm");

expList.addEventListener("click", (e) => {
  const btn = e.target.closest("button[data-action]");
  if (!btn) return;

  const t = transactions.find((item) => item.id === btn.dataset.id);
  if (!t) return;

  if (btn.dataset.action === "edit") {
    editingId = t.id;
    editTitle.value = t.title;
    editCategory.value = t.category;
    editType.value = t.type;
    editAmount.value = t.amount;
    editDate.value = t.date;
    showError(editError, "");
    openModal("expense-edit");
    editTitle.focus();
  }

  if (btn.dataset.action === "delete") {
    deletingId = t.id;
    deleteTitle.textContent = t.title;
    openModal("expense-delete");
  }
});

// --- 2.11 Simpan perubahan ---
editForm.addEventListener("submit", (e) => {
  e.preventDefault();

  const data = {
    title: editTitle.value,
    category: editCategory.value,
    amount: Number(editAmount.value),
    type: editType.value,
    date: editDate.value,
  };

  const error = validateTransaction(data); // dipakai ulang dari 3A
  showError(editError, error);
  if (error) return;

  const t = transactions.find((item) => item.id === editingId);
  if (!t) return;

  t.title = data.title.trim();
  t.category = data.category;
  t.amount = data.amount;
  t.type = data.type;
  t.date = data.date;

  saveTransactions();
  renderTransactions();
  closeModal("expense-edit");
  editingId = null;
});

// --- 2.12 Konfirmasi hapus ---
deleteConfirm.addEventListener("click", () => {
  transactions = transactions.filter((item) => item.id !== deletingId);

  saveTransactions();
  renderTransactions();
  closeModal("expense-delete");
  deletingId = null;
});

// --- 2.13 Cari, filter, sort: render ulang setiap ada perubahan ---
expSearch.addEventListener("input", renderTransactions);
expFilterType.addEventListener("change", renderTransactions);
expFilterCategory.addEventListener("change", renderTransactions);
expSort.addEventListener("change", renderTransactions);

expDate.value = todayISO();
renderTransactions();

/* =====================================================
   3. LINKVAULT
   ===================================================== */

// --- 3.1 Selektor DOM ---
const linkForm = document.querySelector("#link-form");
const linkTitle = document.querySelector("#link-title");
const linkCategory = document.querySelector("#link-category");
const linkUrl = document.querySelector("#link-url");
const linkNote = document.querySelector("#link-note");
const linkError = document.querySelector("#link-error");
const linkList = document.querySelector("#link-list");
const linkEmpty = document.querySelector("#link-empty");

const linkSearch = document.querySelector("#link-search");
const linkSort = document.querySelector("#link-sort");

const linkEditForm = document.querySelector("#link-edit-form");
const editLinkTitle = document.querySelector("#edit-link-title");
const editLinkUrl = document.querySelector("#edit-link-url");
const editLinkCategory = document.querySelector("#edit-link-category");
const editLinkNote = document.querySelector("#edit-link-note");
const editLinkError = document.querySelector("#edit-link-error");
const deleteLinkTitle = document.querySelector("#delete-link-title");
const linkDeleteConfirm = document.querySelector("#link-delete-confirm");

// --- 3.2 State + localStorage ---
function loadLinks() {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.links);
    const data = raw ? JSON.parse(raw) : [];
    return Array.isArray(data) ? data : [];
  } catch {
    return [];
  }
}

function saveLinks() {
  localStorage.setItem(STORAGE_KEYS.links, JSON.stringify(links));
}

let links = loadLinks();

// --- 3.3 Validasi ---
// Minimal diawali http:// atau https:// dan tidak ada spasi
function isValidUrl(url) {
  return /^https?:\/\/\S+$/i.test(url);
}

// Mengembalikan pesan error, atau "" jika valid
function validateLink({ title, url, category }) {
  if (title.trim() === "") return "Nama wajib diisi.";
  if (category.trim() === "") return "Kategori wajib diisi.";
  if (url.trim() === "") return "URL wajib diisi.";
  if (!isValidUrl(url.trim())) {
    return "URL harus diawali http:// atau https:// dan tanpa spasi.";
  }
  return "";
}

// --- 3.4 Render daftar ---
// Untuk sementara: tampilkan semua, terbaru di atas (cari/sort di 4C)
function getVisibleLinks() {
  const keyword = linkSearch.value.trim().toLowerCase();

  // 1. Cari di nama, URL, atau kategori (salah satu cocok sudah cukup)
  const result = links.filter((l) => {
    return (
      l.title.toLowerCase().includes(keyword) ||
      l.url.toLowerCase().includes(keyword) ||
      l.category.toLowerCase().includes(keyword)
    );
  });

  // 2. Sort
  switch (linkSort.value) {
    case "title-asc":
      result.sort((a, b) => a.title.localeCompare(b.title));
      break;
    case "title-desc":
      result.sort((a, b) => b.title.localeCompare(a.title));
      break;
    default: // "newest"
      result.sort((a, b) => b.createdAt - a.createdAt);
  }

  return result;
}

function createLinkItem(l) {
  const li = document.createElement("li");
  li.className =
    "flex items-start justify-between gap-3 rounded-xl border border-slate-200 bg-white px-4 py-3";

  // Kiri: judul (link), URL, badge, catatan
  const info = document.createElement("div");
  info.className = "min-w-0";

  const titleLink = document.createElement("a");
  titleLink.href = l.url;
  titleLink.target = "_blank";
  titleLink.rel = "noopener noreferrer";
  titleLink.className =
    "font-semibold text-slate-900 hover:text-lime-700 hover:underline";
  titleLink.textContent = l.title;

  const urlText = document.createElement("p");
  urlText.className = "text-xs text-slate-500 truncate";
  urlText.textContent = l.url;

  const badge = document.createElement("span");
  badge.className =
    "mt-1.5 inline-block rounded-full bg-lime-100 px-2 py-0.5 text-xs font-medium text-lime-800";
  badge.textContent = l.category;

  info.append(titleLink, urlText, badge);

  if (l.note) {
    const note = document.createElement("p");
    note.className = "mt-1.5 text-sm text-slate-600";
    note.textContent = l.note;
    info.append(note);
  }

  // Kanan: tombol aksi
  const actions = document.createElement("div");
  actions.className = "flex shrink-0 items-center gap-1";

  const editBtn = document.createElement("button");
  editBtn.type = "button";
  editBtn.dataset.action = "edit";
  editBtn.dataset.id = l.id;
  editBtn.className = "p-1.5 rounded-lg text-slate-500 hover:bg-slate-100";
  editBtn.setAttribute("aria-label", "Ubah " + l.title);
  editBtn.innerHTML = '<i class="ti ti-pencil text-lg"></i>';

  const deleteBtn = document.createElement("button");
  deleteBtn.type = "button";
  deleteBtn.dataset.action = "delete";
  deleteBtn.dataset.id = l.id;
  deleteBtn.className = "p-1.5 rounded-lg text-rose-500 hover:bg-rose-50";
  deleteBtn.setAttribute("aria-label", "Hapus " + l.title);
  deleteBtn.innerHTML = '<i class="ti ti-trash text-lg"></i>';

  actions.append(editBtn, deleteBtn);
  li.append(info, actions);
  return li;
}

function renderLinks() {
  const items = getVisibleLinks();

  linkList.innerHTML = "";
  items.forEach((l) => linkList.appendChild(createLinkItem(l)));

  const isEmpty = items.length === 0;
  linkEmpty.classList.toggle("hidden", !isEmpty);
  if (isEmpty) {
    linkEmpty.querySelector("span").textContent =
      links.length === 0
        ? "Belum ada tautan tersimpan."
        : "Tidak ada tautan yang cocok dengan pencarian.";
  }
}

// --- 3.5 Tambah tautan ---
linkForm.addEventListener("submit", (e) => {
  e.preventDefault();

  const data = {
    title: linkTitle.value,
    category: linkCategory.value,
    url: linkUrl.value,
    note: linkNote.value,
  };

  const error = validateLink(data);
  showError(linkError, error); // showError sudah dibuat di Expense
  if (error) return;

  links.push({
    id: Date.now().toString(),
    title: data.title.trim(),
    category: data.category.trim(),
    url: data.url.trim(),
    note: data.note.trim(),
    createdAt: Date.now(),
  });

  saveLinks();
  renderLinks();

  linkForm.reset();
  linkTitle.focus();
});

// --- 3.6 Inisialisasi ---
renderLinks();

// --- 3.7 Cari & sort ---
linkSearch.addEventListener("input", renderLinks);
linkSort.addEventListener("change", renderLinks);

// --- 3.8 Klik tombol Ubah / Hapus (event delegation) ---
let editingLinkId = null;
let deletingLinkId = null;

linkList.addEventListener("click", (e) => {
  const btn = e.target.closest("button[data-action]");
  if (!btn) return;

  const l = links.find((item) => item.id === btn.dataset.id);
  if (!l) return;

  if (btn.dataset.action === "edit") {
    editingLinkId = l.id;
    editLinkTitle.value = l.title;
    editLinkUrl.value = l.url;
    editLinkCategory.value = l.category;
    editLinkNote.value = l.note;
    showError(editLinkError, "");
    openModal("link-edit");
    editLinkTitle.focus();
  }

  if (btn.dataset.action === "delete") {
    deletingLinkId = l.id;
    deleteLinkTitle.textContent = l.title;
    openModal("link-delete");
  }
});

// --- 3.9 Simpan perubahan ---
linkEditForm.addEventListener("submit", (e) => {
  e.preventDefault();

  const data = {
    title: editLinkTitle.value,
    url: editLinkUrl.value,
    category: editLinkCategory.value,
    note: editLinkNote.value,
  };

  const error = validateLink(data); // dipakai ulang dari 3.3
  showError(editLinkError, error);
  if (error) return;

  const l = links.find((item) => item.id === editingLinkId);
  if (!l) return;

  l.title = data.title.trim();
  l.url = data.url.trim();
  l.category = data.category.trim();
  l.note = data.note.trim();

  saveLinks();
  renderLinks();
  closeModal("link-edit");
  editingLinkId = null;
});

// --- 3.10 Konfirmasi hapus ---
linkDeleteConfirm.addEventListener("click", () => {
  links = links.filter((item) => item.id !== deletingLinkId);

  saveLinks();
  renderLinks();
  closeModal("link-delete");
  deletingLinkId = null;
});

/* =====================================================
   4. QUIZMASTER
   ===================================================== */

// --- 4.1 Selektor DOM ---
const quizStart = document.querySelector("#quiz-start");
const quizPlay = document.querySelector("#quiz-play");
const quizResult = document.querySelector("#quiz-result");
const quizStartBtn = document.querySelector("#quiz-start-btn");
const quizHighScoreEl = document.querySelector("#quiz-highscore");
const quizProgress = document.querySelector("#quiz-progress");
const quizProgressBar = document.querySelector("#quiz-progress-bar");
const quizLiveScore = document.querySelector("#quiz-live-score");
const quizQuestion = document.querySelector("#quiz-question");
const quizOptions = document.querySelector("#quiz-options");
const quizFeedback = document.querySelector("#quiz-feedback");
const quizNext = document.querySelector("#quiz-next");
const quizFinalScore = document.querySelector("#quiz-final-score");
const quizResultMsg = document.querySelector("#quiz-result-msg");
const quizNewRecord = document.querySelector("#quiz-new-record");
const quizResultHighScore = document.querySelector("#quiz-result-highscore");
const quizRetry = document.querySelector("#quiz-retry");

// --- 4.2 Data soal (array of object) ---
// answer = indeks opsi yang benar (dimulai dari 0)
const questions = [
  {
    question: "Tag HTML5 yang tepat untuk menu navigasi adalah...",
    options: ["<menu>", "<nav>", "<navigation>", "<links>"],
    answer: 1,
  },
  {
    question: "Properti CSS untuk mengubah warna teks adalah...",
    options: ["font-color", "text-style", "color", "foreground"],
    answer: 2,
  },
  {
    question: "Method untuk memilih elemen pertama yang cocok dengan selector CSS adalah...",
    options: ["getElement()", "querySelector()", "selectAll()", "findElement()"],
    answer: 1,
  },
  {
    question: "Hasil dari typeof [] di JavaScript adalah...",
    options: ["array", "list", "object", "undefined"],
    answer: 2,
  },
  {
    question: "Method untuk mengubah objek menjadi string JSON adalah...",
    options: ["JSON.parse()", "JSON.stringify()", "JSON.toString()", "JSON.encode()"],
    answer: 1,
  },
];

// --- 4.3 State + high score ---
let currentIndex = 0; // nomor soal aktif
let score = 0;
let answered = false; // sudah menjawab soal ini?

function loadHighScore() {
  const raw = localStorage.getItem(STORAGE_KEYS.quizHighScore);
  const value = Number(raw);
  return raw !== null && Number.isFinite(value) ? value : null;
}

function saveHighScore(value) {
  localStorage.setItem(STORAGE_KEYS.quizHighScore, String(value));
}

let highScore = loadHighScore();

function highScoreText() {
  return highScore === null ? "—" : `${highScore} / ${questions.length}`;
}

// --- 4.4 Berpindah tampilan ---
function showView(view) {
  quizStart.classList.toggle("hidden", view !== "start");
  quizPlay.classList.toggle("hidden", view !== "play");
  quizResult.classList.toggle("hidden", view !== "result");
}

// --- 4.5 Render satu soal ---
function renderQuestion() {
  const q = questions[currentIndex];
  answered = false;

  quizProgress.textContent = `Soal ${currentIndex + 1} / ${questions.length}`;
  quizProgressBar.style.width = `${(currentIndex / questions.length) * 100}%`;
  quizLiveScore.textContent = score;
  quizQuestion.textContent = q.question;

  quizFeedback.classList.add("hidden");
  quizNext.classList.add("hidden");

  quizOptions.innerHTML = "";
  q.options.forEach((text, index) => {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.dataset.index = index;
    btn.className =
      "quiz-option w-full text-left rounded-lg border border-slate-300 px-4 py-2.5 text-sm hover:bg-slate-50 transition";
    btn.textContent = text;
    quizOptions.appendChild(btn);
  });
}

// --- 4.6 Penilaian jawaban ---
quizOptions.addEventListener("click", (e) => {
  const btn = e.target.closest(".quiz-option");
  if (!btn || answered) return; // abaikan klik kalau sudah menjawab

  answered = true;
  const chosen = Number(btn.dataset.index);
  const q = questions[currentIndex];
  const isCorrect = chosen === q.answer;

  if (isCorrect) score++;
  quizLiveScore.textContent = score;

  // Tandai semua opsi: benar = hijau, pilihan salah = merah
  quizOptions.querySelectorAll(".quiz-option").forEach((optBtn) => {
    const index = Number(optBtn.dataset.index);
    optBtn.disabled = true;
    optBtn.classList.remove("hover:bg-slate-50");
    if (index === q.answer) {
      optBtn.classList.add("border-emerald-500", "bg-emerald-50", "text-emerald-800");
    } else if (index === chosen) {
      optBtn.classList.add("border-rose-500", "bg-rose-50", "text-rose-800");
    }
  });

  // Feedback
  quizFeedback.className = "rounded-xl border px-4 py-3 text-sm mb-4";
  if (isCorrect) {
    quizFeedback.classList.add("border-emerald-200", "bg-emerald-50", "text-emerald-800");
    quizFeedback.textContent = "Benar! Jawabanmu tepat.";
  } else {
    quizFeedback.classList.add("border-rose-200", "bg-rose-50", "text-rose-800");
    quizFeedback.textContent = `Salah. Jawaban yang benar: ${q.options[q.answer]}`;
  }

  // Tombol berikutnya; di soal terakhir teksnya berubah
  quizNext.firstChild.textContent =
    currentIndex === questions.length - 1 ? "Lihat Hasil " : "Soal Berikutnya ";
  quizNext.classList.remove("hidden");
});

// --- 4.7 Lanjut / selesai ---
quizNext.addEventListener("click", () => {
  currentIndex++;
  if (currentIndex < questions.length) {
    renderQuestion();
  } else {
    finishQuiz();
  }
});

function finishQuiz() {
  const isNewRecord = highScore === null || score > highScore;
  if (isNewRecord) {
    highScore = score;
    saveHighScore(highScore);
  }

  quizFinalScore.textContent = `${score} / ${questions.length}`;
  quizResultHighScore.textContent = highScoreText();
  quizNewRecord.classList.toggle("hidden", !isNewRecord);

  const ratio = score / questions.length;
  if (ratio === 1) quizResultMsg.textContent = "Sempurna! Kamu menguasai materinya.";
  else if (ratio >= 0.6) quizResultMsg.textContent = "Bagus! Sedikit lagi menuju sempurna.";
  else quizResultMsg.textContent = "Jangan menyerah, coba lagi ya!";

  quizHighScoreEl.textContent = highScoreText();
  showView("result");
}

// --- 4.8 Mulai / ulangi ---
function startQuiz() {
  currentIndex = 0;
  score = 0;
  renderQuestion();
  showView("play");
}

quizStartBtn.addEventListener("click", startQuiz);
quizRetry.addEventListener("click", startQuiz);

// --- 4.9 Inisialisasi ---
quizHighScoreEl.textContent = highScoreText();
showView("start");