const DAILY = 15;
const TOTAL_DAYS = 243;
const STORAGE_KEY = 'daily15words-v1';

let words = [];
let state = loadState();
let currentDay = Math.min(Math.max(state.currentDay || 1, 1), TOTAL_DAYS);
let cardIndex = 0;
let flipped = false;
let libraryLimit = 60;

const $ = (id) => document.getElementById(id);
const els = {
  loading: $('loading'), studyArea: $('studyArea'), wordCard: $('wordCard'), cardWord: $('cardWord'),
  cardMeaning: $('cardMeaning'), cardWordSmall: $('cardWordSmall'), cardIndex: $('cardIndex'),
  cardStatus: $('cardStatus'), sourceNumber: $('sourceNumber'), todayDone: $('todayDone'),
  ringProgress: $('ringProgress'), dayNumber: $('dayNumber'), todayLabel: $('todayLabel'),
  dayComplete: $('dayComplete'), completeCopy: $('completeCopy'), reviewCount: $('reviewCount'),
  reviewEmpty: $('reviewEmpty'), reviewList: $('reviewList'), searchInput: $('searchInput'),
  wordGrid: $('wordGrid'), searchResult: $('searchResult'), loadMore: $('loadMore'),
  dayModal: $('dayModal'), dayGrid: $('dayGrid'), overallText: $('overallText'), overallBar: $('overallBar')
};

function loadState() {
  try { return JSON.parse(localStorage.getItem(STORAGE_KEY)) || { currentDay: 1, marks: {} }; }
  catch { return { currentDay: 1, marks: {} }; }
}
function saveState() {
  state.currentDay = currentDay;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}
function dayWords(day = currentDay) { return words.slice((day - 1) * DAILY, day * DAILY); }
function markOf(id) { return state.marks[String(id)] || ''; }
function completedInDay(day = currentDay) { return dayWords(day).filter(w => markOf(w.id)).length; }
function allMarked() { return Object.keys(state.marks).length; }
function setView(name) {
  document.querySelectorAll('.view').forEach(v => v.classList.toggle('active', v.id === `${name}View`));
  document.querySelectorAll('.nav-btn').forEach(b => b.classList.toggle('active', b.dataset.view === name));
  if (name === 'review') renderReview();
  if (name === 'library') renderLibrary(true);
  window.scrollTo({ top: 0, behavior: 'smooth' });
}
function updateHeader() {
  const count = completedInDay();
  const target = dayWords().length;
  els.todayDone.textContent = count;
  els.ringProgress.style.strokeDashoffset = 327 - (327 * count / target);
  els.dayNumber.textContent = currentDay;
  els.todayLabel.textContent = `DAY ${String(currentDay).padStart(2, '0')} · ${currentDay === 1 ? 'START HERE' : 'KEEP GOING'}`;
  $('prevDay').disabled = currentDay === 1;
  $('nextDay').disabled = currentDay === TOTAL_DAYS;
}
function renderCard() {
  const deck = dayWords();
  const item = deck[cardIndex];
  if (!item) return;
  flipped = false;
  els.wordCard.classList.remove('flipped');
  els.cardWord.textContent = item.word;
  els.cardMeaning.textContent = item.meaning;
  els.cardWordSmall.textContent = item.word;
  els.cardIndex.textContent = `${String(cardIndex + 1).padStart(2,'0')} / ${deck.length}`;
  els.sourceNumber.textContent = `#${String(item.id).padStart(4,'0')}`;
  const mark = markOf(item.id);
  els.cardStatus.textContent = mark === 'known' ? '已认识' : mark === 'again' ? '待复习' : '未标记';
  els.cardStatus.className = `status-dot ${mark}`;
}
function flipCard() { flipped = !flipped; els.wordCard.classList.toggle('flipped', flipped); }
function answer(mark) {
  const deck = dayWords();
  state.marks[String(deck[cardIndex].id)] = mark;
  saveState(); updateHeader();
  if (cardIndex < deck.length - 1) { cardIndex += 1; renderCard(); }
  else { finishDay(); }
}
function finishDay() {
  const deck = dayWords();
  const known = deck.filter(w => markOf(w.id) === 'known').length;
  const again = deck.length - known;
  els.studyArea.classList.add('hidden');
  els.dayComplete.classList.remove('hidden');
  els.completeCopy.textContent = `认识 ${known} 个，${again} 个已放进复习队列。`;
}
function openDay(day) {
  currentDay = Math.min(Math.max(day, 1), TOTAL_DAYS); cardIndex = 0; saveState();
  els.dayComplete.classList.add('hidden'); els.studyArea.classList.remove('hidden');
  updateHeader(); renderCard(); closeModal();
}
function renderReview() {
  const list = words.filter(w => markOf(w.id) === 'again');
  els.reviewCount.textContent = list.length;
  els.reviewEmpty.classList.toggle('hidden', list.length > 0);
  els.reviewList.innerHTML = list.map(w => `<article class="review-item"><strong>${escapeHtml(w.word)}</strong><p>${escapeHtml(w.meaning)}</p><button data-mastered="${w.id}" aria-label="标记 ${escapeHtml(w.word)} 为已掌握">✓</button></article>`).join('');
}
function escapeHtml(text) { const d = document.createElement('div'); d.textContent = text; return d.innerHTML; }
function renderLibrary(reset = false) {
  if (reset) libraryLimit = 60;
  const q = els.searchInput.value.trim().toLowerCase();
  const filtered = q ? words.filter(w => w.word.toLowerCase().includes(q) || w.meaning.toLowerCase().includes(q)) : words;
  els.searchResult.textContent = q ? `找到 ${filtered.length.toLocaleString()} 词` : `共 ${words.length.toLocaleString()} 词`;
  els.wordGrid.innerHTML = filtered.slice(0, libraryLimit).map(w => `<article class="word-row ${markOf(w.id)}"><span class="num">${String(w.id).padStart(4,'0')}</span><div><strong>${escapeHtml(w.word)}</strong><p>${escapeHtml(w.meaning)}</p></div></article>`).join('');
  els.loadMore.classList.toggle('hidden', libraryLimit >= filtered.length);
}
function renderDayMap() {
  els.dayGrid.innerHTML = '';
  for (let day = 1; day <= TOTAL_DAYS; day++) {
    const count = completedInDay(day); const total = dayWords(day).length;
    const btn = document.createElement('button'); btn.className = `day-cell ${day === currentDay ? 'current' : ''} ${count === total ? 'complete' : count ? 'started' : ''}`;
    btn.textContent = day; btn.title = `第 ${day} 天 · ${count}/${total}`; btn.addEventListener('click', () => openDay(day)); els.dayGrid.appendChild(btn);
  }
  const marked = allMarked(); els.overallText.textContent = `${marked.toLocaleString()} / 3,641`;
  els.overallBar.style.width = `${marked / words.length * 100}%`;
}
function openModal() { renderDayMap(); els.dayModal.hidden = false; document.body.style.overflow = 'hidden'; }
function closeModal() { els.dayModal.hidden = true; document.body.style.overflow = ''; }
function speakCurrent(event) {
  event.stopPropagation();
  const item = dayWords()[cardIndex]; if (!('speechSynthesis' in window)) return;
  speechSynthesis.cancel(); const utterance = new SpeechSynthesisUtterance(item.word); utterance.lang = 'en-US'; utterance.rate = .82; speechSynthesis.speak(utterance);
}

document.querySelectorAll('.nav-btn').forEach(b => b.addEventListener('click', () => setView(b.dataset.view)));
els.wordCard.addEventListener('click', flipCard);
els.wordCard.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); flipCard(); } });
$('speakBtn').addEventListener('click', speakCurrent);
$('againBtn').addEventListener('click', () => answer('again'));
$('knowBtn').addEventListener('click', () => answer('known'));
$('prevDay').addEventListener('click', () => openDay(currentDay - 1));
$('nextDay').addEventListener('click', () => openDay(currentDay + 1));
$('dayPicker').addEventListener('click', openModal);
$('reviewAgain').addEventListener('click', () => openDay(currentDay));
$('goNext').addEventListener('click', () => openDay(Math.min(currentDay + 1, TOTAL_DAYS)));
$('loadMore').addEventListener('click', () => { libraryLimit += 60; renderLibrary(); });
els.searchInput.addEventListener('input', () => renderLibrary(true));
els.reviewList.addEventListener('click', e => { const id = e.target.dataset.mastered; if (id) { state.marks[id] = 'known'; saveState(); renderReview(); updateHeader(); } });
document.querySelectorAll('[data-close-modal]').forEach(el => el.addEventListener('click', closeModal));
$('resetBtn').addEventListener('click', () => { if (confirm('确定清空全部学习记录吗？词表不会删除。')) { state = { currentDay: 1, marks: {} }; currentDay = 1; saveState(); openDay(1); } });
document.addEventListener('keydown', e => {
  if (!els.dayModal.hidden && e.key === 'Escape') return closeModal();
  if (!document.getElementById('learnView').classList.contains('active') || ['INPUT','TEXTAREA'].includes(document.activeElement.tagName)) return;
  if (e.key === ' ') { e.preventDefault(); flipCard(); }
  if (e.key === 'ArrowLeft') answer('again');
  if (e.key === 'ArrowRight') answer('known');
});

if (Array.isArray(window.WORDS) && window.WORDS.length === 3641) {
  words = window.WORDS;
  els.loading.classList.add('hidden');
  els.studyArea.classList.remove('hidden');
  updateHeader();
  renderCard();
} else {
  els.loading.textContent = '词库文件缺失，请确认 words-data.js 与 index.html 在同一目录。';
}
