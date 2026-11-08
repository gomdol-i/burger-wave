/* =========================================================
   버거웨이브 웹 대문 동작 (2차 수정 · 2026-11-01)
   - 실제 주문·결제·DB는 없음. 장바구니는 화면 시연용.
   - 시간 테스트: 주소 끝에 ?time=18:05 처럼 붙이면 그 시각으로 화면을 확인할 수 있다.
   ========================================================= */
'use strict';

// [01] 이 부분은 상품 데이터를 기획 문서 기준(버거 3종 + 세트 3종)으로 바꾼 부분이다. 가격·설명을 이곳 한 군데에서만 관리해 화면과 장바구니 금액이 어긋나지 않게 했다. ('새우' 설명 삭제)
const PRODUCTS = [
  { id: 'original', type: 'burger', name: '오리지널 웨이브 버거', price: 7900, image: 'img/original-wave.jpg', kicker: 'THE CLASSIC', tag: '처음이라면', tagClass: '',
    desc: '소고기 패티 · 체더치즈 · 양상추 · 토마토 · 피클 · 하우스소스' },
  { id: 'spicy', type: 'burger', name: '스파이시 서프 버거', price: 8900, image: 'img/spicy-surf.jpg', kicker: 'A LITTLE KICK', tag: '매콤하게', tagClass: 'red',
    desc: '소고기 패티 · 체더치즈 · 할라피뇨 · 양상추 · 구운 양파 · 칠리소스' },
  { id: 'double', type: 'burger', name: '더블 치즈 빅웨이브 버거', price: 10900, image: 'img/double-cheese.jpg', kicker: 'BIG WAVE', tag: '든든하게', tagClass: 'dark',
    desc: '소고기 패티 2장 · 체더치즈 2장 · 구운 양파 · 피클 · 하우스소스' },
  { id: 'original-set', type: 'set', name: '오리지널 웨이브 세트', price: 10900, image: 'img/original-wave.jpg', kicker: 'SET MENU', tag: 'SET', tagClass: 'dark',
    desc: '오리지널 웨이브 버거 + 프렌치프라이(기본) + 음료 1개' },
  { id: 'spicy-set', type: 'set', name: '스파이시 서프 세트', price: 11900, image: 'img/spicy-surf.jpg', kicker: 'SET MENU', tag: 'SET', tagClass: 'dark',
    desc: '스파이시 서프 버거 + 프렌치프라이(기본) + 음료 1개' },
  { id: 'double-set', type: 'set', name: '더블 치즈 빅웨이브 세트', price: 13900, image: 'img/double-cheese.jpg', kicker: 'SET MENU', tag: 'SET', tagClass: 'dark',
    desc: '더블 치즈 빅웨이브 버거 + 프렌치프라이(기본) + 음료 1개' }
];
const DRINKS = ['콜라', '제로콜라', '사이다'];

// [02] 이 부분은 금액 표시를 '₩8,900' 형식에서 '7,900원' 한국식 표기로 바꾼 부분이다.
const won = n => new Intl.NumberFormat('ko-KR').format(n) + '원';
const $ = s => document.querySelector(s);
const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)');

// [03] 이 부분은 상품 데이터로 메뉴 카드를 그리는 부분이다. 세트 카드에는 음료(콜라·제로콜라·사이다) 선택 상자를 넣었다.
function renderProducts() {
  $('#product-list').innerHTML = PRODUCTS.map(p => `
    <article class="product" data-type="${p.type}">
      <div class="product-img">
        <img src="${p.image}" alt="${p.name}" loading="lazy">
        <span class="tag ${p.tagClass}">${p.tag}</span>
        <button class="add-btn" type="button" data-add="${p.id}" aria-label="${p.name} 장바구니에 담기">+</button>
      </div>
      <div class="product-info">
        <small>${p.kicker}</small>
        <h3>${p.name}</h3>
        <p>${p.desc}</p>
        <div class="product-foot">
          <b class="price">${won(p.price)}</b>
          ${p.type === 'set'
            ? `<label class="drink">음료 <select data-drink="${p.id}">${DRINKS.map(d => `<option>${d}</option>`).join('')}</select></label>`
            : ''}
          <button class="add-text" type="button" data-add="${p.id}">담기</button>
        </div>
      </div>
    </article>`).join('');
  document.querySelectorAll('[data-add]').forEach(b => b.addEventListener('click', () => addItem(b.dataset.add)));
}

// [04] 이 부분은 메뉴 탭을 '전체 / 버거 단품 / 세트메뉴'로 거르는 부분이다. 선택된 탭은 aria-selected로 화면낭독기에도 알려준다.
function setupTabs() {
  document.querySelectorAll('.tabs button').forEach(tab => tab.addEventListener('click', () => {
    document.querySelectorAll('.tabs button').forEach(t => { t.classList.remove('active'); t.setAttribute('aria-selected', 'false'); });
    tab.classList.add('active'); tab.setAttribute('aria-selected', 'true');
    document.querySelectorAll('.product').forEach(card => {
      card.hidden = tab.dataset.filter !== 'all' && card.dataset.type !== tab.dataset.filter;
    });
  }));
}

// [05] 이 부분은 장바구니 담기·수량 변경·삭제 기능이다. 세트는 고른 음료별로 따로 담기도록 '상품id|음료'를 열쇠(key)로 썼다.
const cart = new Map();
let prevCount = 0;
function addItem(id) {
  const p = PRODUCTS.find(x => x.id === id);
  if (!p) return;
  const drinkSel = document.querySelector(`[data-drink="${id}"]`);
  const drink = p.type === 'set' && drinkSel ? drinkSel.value : '';
  const key = drink ? `${id}|${drink}` : id;
  const item = cart.get(key) || { name: p.name + (drink ? ` (${drink})` : ''), price: p.price, image: p.image, quantity: 0 };
  item.quantity += 1;
  cart.set(key, item);
  renderCart();
  showToast(`${item.name}을(를) 장바구니에 담았어요.`);
}
function changeQuantity(key, step) {
  const item = cart.get(key);
  if (!item) return;
  item.quantity += step;
  if (item.quantity < 1) cart.delete(key);
  renderCart();
}

// [06] 이 부분은 장바구니 화면(상품명·수량·상품별 금액·합계)을 다시 그리는 부분이다. 개수가 늘어났을 때만 폭죽(burst)을 실행하도록 이전 개수(prevCount)와 비교한다.
function renderCart() {
  const items = [...cart.entries()];
  const count = items.reduce((s, [, x]) => s + x.quantity, 0);
  const total = items.reduce((s, [, x]) => s + x.price * x.quantity, 0);
  $('#cart-count').textContent = count;
  $('#drawer-count').textContent = `(${count})`;
  $('#subtotal').textContent = won(total);
  $('#total').textContent = won(total);
  $('#cart-open').setAttribute('aria-label', `장바구니 열기, 담긴 상품 ${count}개`);
  if (count > prevCount) burst();
  prevCount = count;

  const host = $('#cart-items');
  if (!count) {
    host.innerHTML = '<div class="empty"><span aria-hidden="true">◌</span><p>아직 담긴 메뉴가 없어요.</p><button type="button" id="browse">메뉴 둘러보기</button></div>';
    $('#browse').onclick = () => { closeCart(); $('#menu').scrollIntoView(); };
    return;
  }
  host.innerHTML = items.map(([key, x]) => `
    <article class="cart-row">
      <img src="${x.image}" alt="">
      <div>
        <h3>${x.name}</h3><p>${won(x.price)}</p>
        <div class="qty">
          <button type="button" data-step="-1" data-key="${key}" aria-label="${x.name} 수량 줄이기">−</button>
          <span>${x.quantity}</span>
          <button type="button" data-step="1" data-key="${key}" aria-label="${x.name} 수량 늘리기">+</button>
        </div>
      </div>
      <div class="row-price">${won(x.price * x.quantity)}<button class="remove" type="button" data-remove="${key}">삭제</button></div>
    </article>`).join('');
  host.querySelectorAll('[data-step]').forEach(b => b.onclick = () => changeQuantity(b.dataset.key, Number(b.dataset.step)));
  host.querySelectorAll('[data-remove]').forEach(b => b.onclick = () => { cart.delete(b.dataset.remove); renderCart(); });
}

// [07] 이 부분은 장바구니 폭죽 애니메이션을 만드는 부분이다. 금색·토마토색·크림색·초록색 입자 14개를 원형으로 흩뿌리고 0.95초 뒤 지운다. '동작 줄이기' 사용자에게는 배지 강조만 한다.
function burst() {
  const badge = $('#cart-count');
  badge.classList.remove('pop'); void badge.offsetWidth; badge.classList.add('pop');
  if (reduceMotion.matches) return;
  const layer = $('#burst-layer');
  const colors = ['#d6a640', '#a33a27', '#f5ecda', '#7fcf83', '#e8ab3c'];
  for (let i = 0; i < 14; i++) {
    const angle = (i / 14) * Math.PI * 2 + Math.random() * 0.4;
    const dist = 28 + Math.random() * 26;
    const s = document.createElement('i');
    s.className = 'spark' + (i % 2 ? ' line' : '');
    s.style.setProperty('--dx', `${Math.cos(angle) * dist}px`);
    s.style.setProperty('--dy', `${Math.sin(angle) * dist}px`);
    s.style.setProperty('--r', `${(angle * 180) / Math.PI + 90}deg`);
    s.style.setProperty('--c', colors[i % colors.length]);
    s.style.setProperty('--t', `${0.6 + Math.random() * 0.3}s`);
    layer.appendChild(s);
    setTimeout(() => s.remove(), 950);
  }
}

// [08] 이 부분은 장바구니 서랍을 열고 닫는 부분이다. 열면 닫기 버튼으로, 닫으면 장바구니 버튼으로 키보드 초점을 돌려준다. (Esc 키로도 닫힘)
const drawer = $('#drawer'), backdrop = $('#backdrop');
function openCart() {
  drawer.classList.add('open'); backdrop.classList.add('open');
  drawer.setAttribute('aria-hidden', 'false'); document.body.style.overflow = 'hidden';
  $('.drawer-close').focus();
}
function closeCart() {
  if (!drawer.classList.contains('open')) return;
  drawer.classList.remove('open'); backdrop.classList.remove('open');
  drawer.setAttribute('aria-hidden', 'true'); document.body.style.overflow = '';
  $('#cart-open').focus();
}

// [09] 이 부분은 알림 메시지(toast), 모바일 메뉴, 관리자 안내창, '주문 준비 중' 버튼 동작이다.
let toastTimer;
function showToast(text) {
  const toast = $('#toast');
  toast.textContent = text; toast.classList.add('show');
  clearTimeout(toastTimer); toastTimer = setTimeout(() => toast.classList.remove('show'), 1900);
}
function setupUi() {
  $('#cart-open').addEventListener('click', openCart);
  $('.drawer-close').addEventListener('click', closeCart);
  backdrop.addEventListener('click', closeCart);
  document.addEventListener('keydown', e => { if (e.key === 'Escape') closeCart(); });

  const toggle = $('.mobile-toggle'), nav = $('#main-nav');
  toggle.addEventListener('click', () => {
    const open = nav.classList.toggle('open');
    toggle.setAttribute('aria-expanded', String(open));
    toggle.setAttribute('aria-label', open ? '메뉴 닫기' : '메뉴 열기');
  });
  nav.querySelectorAll('a').forEach(a => a.addEventListener('click', () => { nav.classList.remove('open'); toggle.setAttribute('aria-expanded', 'false'); }));

  const dialog = $('#admin-dialog');
  $('#admin-link').addEventListener('click', () => dialog.showModal());
  $('.dialog-x').addEventListener('click', () => dialog.close());
  $('.dialog-ok').addEventListener('click', () => dialog.close());
  // [18] 이 부분은 '결제하기' 버튼을 누르면 기존 안내 알림 대신 결제수단 선택창(openPayment, [19])을 열도록 바꾼 부분이다.
  $('#checkout').addEventListener('click', () => openPayment());
}

// [10] 이 부분은 데모 영업시간(OPEN_HOUR=11, CLOSE_HOUR=22)을 지우고, 기기 시간대와 상관없이 한국시간(Asia/Seoul)으로 '오늘 몇 초째인지'를 구하는 부분이다. 주소에 ?time=HH:MM을 붙이면 그 시각부터 흐르는 테스트 모드가 된다.
const HOUR = 3600;
const SLOT1 = { open: 11 * HOUR, close: 13 * HOUR };
const SLOT2 = { open: 17 * HOUR, close: 20 * HOUR };
const EVENT = { start: 18 * HOUR, end: 18 * HOUR + 20 * 60 };
const TEST_BASE = (() => {
  const t = new URLSearchParams(location.search).get('time');
  if (!t || !/^\d{1,2}:\d{2}(:\d{2})?$/.test(t)) return null;
  const [h, m, s = 0] = t.split(':').map(Number);
  return h < 24 && m < 60 && s < 60 ? h * HOUR + m * 60 + s : null;
})();
const LOADED_AT = Date.now();
const kstFormatter = new Intl.DateTimeFormat('en-GB', { timeZone: 'Asia/Seoul', hour: '2-digit', minute: '2-digit', second: '2-digit', hourCycle: 'h23' });
function kstSeconds() {
  if (TEST_BASE !== null) return (TEST_BASE + Math.floor((Date.now() - LOADED_AT) / 1000)) % 86400;
  const v = {};
  kstFormatter.formatToParts(new Date()).forEach(p => { v[p.type] = Number(p.value); });
  return ((v.hour % 24) * HOUR) + v.minute * 60 + v.second;
}

// [11] 이 부분은 기획 문서의 5가지 영업 상태 규칙을 그대로 옮긴 부분이다. (11시 전 / 1타임 / 13~17시 / 2타임 / 20시 이후 → 다음 날 11시)
function businessState(s) {
  if (s < SLOT1.open)  return { mode: 'ready', slot: 1, label: '1타임 오픈까지', remain: SLOT1.open - s };
  if (s < SLOT1.close) return { mode: 'open',  slot: 1, label: '1타임 주문 가능 · 마감까지', remain: SLOT1.close - s };
  if (s < SLOT2.open)  return { mode: 'ready', slot: 2, label: '2타임 오픈까지', remain: SLOT2.open - s };
  if (s < SLOT2.close) return { mode: 'open',  slot: 2, label: '2타임 주문 가능 · 마감까지', remain: SLOT2.close - s };
  return { mode: 'ready', slot: 1, label: '내일 1타임 오픈까지', remain: 86400 - s + SLOT1.open };
}

// [12] 이 부분은 로또 이벤트(18:00~18:20) 상태를 계산하는 부분이다. 시작 전에는 남은 시간, 진행 중에는 종료까지 남은 시간, 끝난 뒤에는 내일 안내를 보여준다.
function eventState(s) {
  if (s < EVENT.start) return { state: 'wait', text: `오늘 18:00 시작 · ${hms(EVENT.start - s)} 남음` };
  if (s < EVENT.end)   return { state: 'live', text: `지금 이벤트 진행 중 · 종료까지 ${hms(EVENT.end - s).slice(3)}` };
  return { state: 'done', text: '오늘 이벤트 종료 · 내일 18:00에 다시 만나요' };
}
const pad = n => String(n).padStart(2, '0');
function hms(sec) { return `${pad(Math.floor(sec / HOUR))}:${pad(Math.floor((sec % HOUR) / 60))}:${pad(sec % 60)}`; }

// [13] 이 부분은 카운트다운 숫자를 한 글자씩 나눠, 바뀐 글자만 위에서 내려오듯 움직이게(tick) 하는 부분이다.
function renderDigits(el, text) {
  if (el.children.length !== text.length) {
    el.innerHTML = [...text].map(c => `<span${c === ':' ? ' class="colon"' : ''}>${c}</span>`).join('');
    return;
  }
  [...text].forEach((c, i) => {
    const span = el.children[i];
    if (span.textContent !== c) {
      span.textContent = c;
      span.classList.remove('tick'); void span.offsetWidth; span.classList.add('tick');
    }
  });
}

// [14] 이 부분은 매초 화면을 갱신하는 부분이다. 좌측 상단 타임, 영업 띠, 현재 타임 강조, 이벤트 상태를 같은 데이터로 함께 바꾼다. 화면낭독기용 설명은 1분에 한 번만 바꿔 시끄럽지 않게 했다.
let lastMinute = -1;
function updateClock() {
  const s = kstSeconds();
  const b = businessState(s), e = eventState(s), live = e.state === 'live';
  const lightClass = live ? 'is-event' : b.mode === 'open' ? 'is-open' : 'is-ready';
  ['#top-light', '#strip-light'].forEach(sel => { $(sel).className = 'status-light ' + lightClass; });

  $('#top-label').textContent = b.label;
  renderDigits($('#top-digits'), hms(b.remain));
  $('#top-event').hidden = !live;
  document.body.classList.toggle('event-live', live);

  $('#strip-label').textContent = b.label;
  $('#strip-digits').textContent = hms(b.remain);
  document.querySelectorAll('.slots li').forEach(li => li.classList.toggle('active', Number(li.dataset.slot) === b.slot));

  const ev = $('#event-status');
  ev.textContent = e.text; ev.dataset.state = e.state;

  const minute = Math.floor(s / 60);
  if (minute !== lastMinute) {
    lastMinute = minute;
    const r = b.remain;
    $('.live-clock').setAttribute('aria-label', `${b.label} ${Math.floor(r / HOUR)}시간 ${Math.floor((r % HOUR) / 60)}분 남음${live ? ', 로또 이벤트 진행 중' : ''}`);
  }
}
function startClock() {
  updateClock();
  const tick = () => { updateClock(); setTimeout(tick, 1000 - (Date.now() % 1000)); };
  setTimeout(tick, 1000 - (Date.now() % 1000));
}

// [15] 이 부분은 대문 배경 영상(move/hero-영상.mp4)을 다루는 부분이다. 파일을 못 불러오면 사진으로 바꾸고, 자동재생이 막히면 '재생' 버튼을 보여주며, '동작 줄이기' 사용자에게는 영상을 멈추고 사진을 보여준다.
function setupVideo() {
  const hero = $('#hero'), video = $('#hero-video'), btn = $('#video-toggle');
  const source = video.querySelector('source');
  const useFallback = () => { hero.classList.add('no-video'); try { video.pause(); } catch (err) { /* 무시 */ } };
  const setBtn = paused => { btn.textContent = paused ? '재생' : '일시정지'; btn.setAttribute('aria-pressed', String(paused)); };

  source.addEventListener('error', useFallback);
  video.addEventListener('error', useFallback);
  if (reduceMotion.matches) { useFallback(); return; }

  const p = video.play();
  if (p && typeof p.catch === 'function') p.catch(() => setBtn(true));   // 자동재생이 막혀도 포스터(사진)는 보인다
  btn.addEventListener('click', () => {
    if (video.paused) { video.play().then(() => setBtn(false)).catch(() => setBtn(true)); }
    else { video.pause(); setBtn(true); }
  });
  reduceMotion.addEventListener?.('change', ev => { if (ev.matches) useFallback(); });
}

// [16] 이 부분은 페이지가 열리면 모든 기능을 순서대로 시작하는 부분이다.
renderProducts();
setupTabs();
setupUi();
renderCart();
startClock();
setupVideo();

// [17] 이 부분은 'TOP' 버튼 동작을 추가한 부분이다. 화면을 600px 넘게 내리면 버튼이 나타나고, 누르면 맨 위로 부드럽게(smooth) 올라간다. '동작 줄이기' 사용자에게는 애니메이션 없이 바로 이동하고, 이동 후 키보드 초점을 로고로 옮긴다.
(function setupToTop() {
  const btn = $('#to-top');
  if (!btn) return;
  const toggle = () => {
    const show = window.scrollY > 600;
    if (show) { btn.hidden = false; requestAnimationFrame(() => btn.classList.add('show')); }
    else { btn.classList.remove('show'); btn.hidden = true; }
  };
  window.addEventListener('scroll', toggle, { passive: true });
  toggle();
  btn.addEventListener('click', () => {
    window.scrollTo({ top: 0, behavior: reduceMotion.matches ? 'auto' : 'smooth' });
    const logo = $('.site-header .brand');
    if (logo) logo.focus({ preventScroll: true });
  });
})();

// [19] 이 부분은 결제수단 선택창과 결제 완료 알림창의 동작을 추가한 부분이다.
//  - 장바구니가 비어 있으면 창을 열지 않고 알림(toast)만 보여준다.
//  - 결제 금액은 기존 장바구니 데이터(cart)에서 다시 계산해, 서랍의 합계와 항상 같다.
//  - [계좌이체]/[카드결제]를 누르면 선택창을 닫고 '결제가 되었습니다.' 창을 연다. 장바구니 비우기는 [20] 참고.
//  - 창이 열리면 첫 결제 버튼 / [확인] 버튼으로, 닫히면 '결제하기' 버튼으로 키보드 초점을 옮긴다.
//  - 창 안에서 누른 Esc는 창만 닫고, 뒤의 장바구니 서랍까지 닫히지 않게 막는다.
const payDialog = $('#pay-dialog'), paidDialog = $('#paid-dialog');
let payTotal = 0;
function openPayment() {
  const items = [...cart.values()];
  const count = items.reduce((s, x) => s + x.quantity, 0);
  if (!count) { showToast('장바구니가 비어 있어요.'); return; }
  if (payDialog.open) return;
  payTotal = items.reduce((s, x) => s + x.price * x.quantity, 0);
  $('#pay-amount').textContent = won(payTotal);
  $('#pay-items').textContent = items.length > 1
    ? `${items[0].name} 외 ${items.length - 1}건 · 총 ${count}개`
    : `${items[0].name} · ${count}개`;
  payDialog.returnValue = '';
  payDialog.showModal();
  payDialog.querySelector('.pay-method').focus();
}
function completePayment(method) {
  payDialog.close('paid');
  $('#paid-method').textContent = method;
  $('#paid-amount').textContent = won(payTotal);
  // [20] 이 부분은 결제가 끝나면 장바구니를 비우도록 추가한 부분이다. 금액은 위에서 payTotal에 먼저 저장했으므로 알림창에는 결제한 금액이 그대로 보이고, 장바구니 개수·합계는 0으로 바뀐다. (개수가 줄어드는 경우라 폭죽은 터지지 않는다)
  cart.clear();
  renderCart();
  paidDialog.showModal();
  $('#paid-ok').focus();
}
payDialog.querySelectorAll('.pay-method').forEach(b => b.addEventListener('click', () => completePayment(b.dataset.method)));
payDialog.querySelector('[data-pay-close]').addEventListener('click', () => payDialog.close());
$('#paid-ok').addEventListener('click', () => paidDialog.close());
[payDialog, paidDialog].forEach(d => d.addEventListener('keydown', e => { if (e.key === 'Escape') e.stopPropagation(); }));
payDialog.addEventListener('close', () => { if (payDialog.returnValue !== 'paid') $('#checkout').focus(); });
// [21] 이 부분은 결제 완료 창의 [확인]을 누르면 빈 장바구니 서랍도 함께 닫도록 바꾼 부분이다. 서랍이 닫히면 키보드 초점은 상단 '장바구니' 버튼으로 돌아간다.
paidDialog.addEventListener('close', () => closeCart());

// [22] 이 부분은 '1인 창업 상담 신청' 동작을 추가한 부분이다.
//  - form의 기본 제출(submit)을 막고 화면에서 먼저 확인한다. 확인을 통과하면 [24]의 submitConsult()가 이메일·서버로 보낸다.
//  - 성함·연락처·동의가 비거나 잘못되면 신청하지 않고, 칸 바로 아래에 고칠 방법을 보여준 뒤 첫 번째 잘못된 칸으로 초점을 옮긴다.
//  - 연락처는 휴대전화(010 등)·일반전화 숫자 9~11자리를 받고, 칸을 벗어나면 010-1234-5678 형식으로 다듬는다.
//  - 모두 맞으면 '상담 신청이 완료되었습니다.' 창에 성함·연락처를 보여주고, [확인]을 누르면 신청서를 처음 상태(점포 없음 선택)로 되돌린다.
const consultForm = $('#consult-form'), consultDialog = $('#consult-dialog');
const cName = $('#c-name'), cPhone = $('#c-phone'), cAgree = $('#c-agree');
const digitsOnly = v => v.replace(/\D/g, '');
function formatPhone(v) {
  const d = digitsOnly(v);
  if (d.startsWith('02')) return d.length > 9 ? `${d.slice(0, 2)}-${d.slice(2, 6)}-${d.slice(6, 10)}` : d.length > 5 ? `${d.slice(0, 2)}-${d.slice(2, 5)}-${d.slice(5)}` : d;
  if (d.length === 11) return `${d.slice(0, 3)}-${d.slice(3, 7)}-${d.slice(7)}`;
  if (d.length === 10) return `${d.slice(0, 3)}-${d.slice(3, 6)}-${d.slice(6)}`;
  return v.trim();
}
function setFieldError(input, message) {
  const err = $('#' + input.getAttribute('aria-describedby'));
  err.textContent = message; err.hidden = !message;
  input.setAttribute('aria-invalid', message ? 'true' : 'false');
  return !message;
}
function validateConsult() {
  const checks = [
    [cName, cName.value.trim() ? '' : '성함을 입력해 주세요.'],
    [cPhone, /^\d{9,11}$/.test(digitsOnly(cPhone.value)) ? '' : '연락처를 010-1234-5678 형식으로 입력해 주세요.'],
    [cAgree, cAgree.checked ? '' : '개인정보 수집·이용에 동의해야 신청할 수 있습니다.']
  ];
  const invalid = checks.filter(([input, msg]) => !setFieldError(input, msg));
  if (invalid.length) invalid[0][0].focus();
  return !invalid.length;
}
cPhone.addEventListener('blur', () => { if (cPhone.value) cPhone.value = formatPhone(cPhone.value); });
[cName, cPhone].forEach(i => i.addEventListener('input', () => { if (i.getAttribute('aria-invalid') === 'true') setFieldError(i, ''); }));
cAgree.addEventListener('change', () => { if (cAgree.checked) setFieldError(cAgree, ''); });
consultForm.addEventListener('submit', e => {
  e.preventDefault();
  cPhone.value = formatPhone(cPhone.value);
  if (!validateConsult()) return;
  submitConsult();   // [24] 참고: 이메일·서버로 보내고, 성공하면 완료 창을 연다.
});
$('#consult-ok').addEventListener('click', () => consultDialog.close());
consultDialog.addEventListener('close', () => {
  consultForm.reset();
  [cName, cPhone, cAgree].forEach(i => setFieldError(i, ''));
  cName.focus();
});

// [23] 이 부분은 찾아오시는길의 '주소 복사' 버튼 동작이다. 주소를 클립보드에 복사하고 알림(toast)으로 결과를 알려준다. 복사를 막는 브라우저에서는 직접 복사하라고 안내한다.
$('#copy-address').addEventListener('click', () => {
  const address = $('#store-address').textContent.trim();
  const done = () => showToast('주소를 복사했어요.');
  const fail = () => showToast('주소를 복사하지 못했어요. 주소 글자를 길게 눌러 직접 복사해 주세요.');
  if (navigator.clipboard && window.isSecureContext) navigator.clipboard.writeText(address).then(done, fail);
  else fail();
});

// [24] 이 부분은 상담 신청서를 보내는 부분이다. (사장님 결정: 이메일은 mailto로 jang765656@gmail.com 발송 / 서버·DB는 코드만 준비)
//  - 이메일: 손님의 메일 앱(Outlook, Gmail 등)을 열고 받는 사람·제목·본문을 미리 채운다. 손님이 메일 앱에서 [보내기]를 눌러야 실제로 발송된다.
//    ※ mailto는 웹페이지가 직접 메일을 보내는 기술이 아니다. 기기에 연결된 메일 앱이 없으면 아무 일도 일어나지 않을 수 있어서, 완료 창에 [신청 내용 복사]를 함께 둔다.
//  - 서버·DB: apiUrl을 비워 두었다. server 폴더의 코드(Node.js + MySQL)를 실행하고 주소를 넣으면 같은 내용(JSON)이 함께 저장된다.
//  - 신청하기를 누르면 확인을 통과한 즉시 신청서를 비운다. 신청 내용은 완료 창의 [신청 내용 복사]를 위해 잠시 기억해 둔다.
const CONSULT_CONFIG = {
  email: 'jang765656@gmail.com',
  apiUrl: '',   // 예: 'https://api.burgerwave.kr/api/consult' — 서버·DB가 준비되면 입력 (로컬 시험: 'http://localhost:3000/api/consult')
  storePhone: '054-3678-9898'
};
let lastConsultText = '';
function consultPayload() {
  const f = new FormData(consultForm);
  return {
    name: f.get('name').trim(),
    phone: f.get('phone').trim(),
    region: (f.get('region') || '').trim(),
    capital: f.get('capital') || '',
    timing: f.get('timing') || '',
    store: f.get('store') || '',
    memo: (f.get('memo') || '').trim(),
    agreed: true,
    requestedAt: new Date().toISOString()
  };
}
function consultText(d) {
  return [
    '[버거웨이브 1인 창업 상담 신청서]',
    '',
    `신청자 성함: ${d.name}`,
    `연락처: ${d.phone}`,
    `희망 창업 지역: ${d.region || '미입력'}`,
    `예상 창업 자본금: ${d.capital || '미선택'}`,
    `희망 창업 시기: ${d.timing || '미선택'}`,
    `점포 보유 여부: ${d.store || '미선택'}`,
    `기타 문의 사항: ${d.memo || '없음'}`,
    '',
    '개인정보 수집·이용 동의: 동의함 (보유·이용 기간: 수집일로부터 6개월)',
    `신청 시각: ${new Date(d.requestedAt).toLocaleString('ko-KR', { timeZone: 'Asia/Seoul' })}`
  ].join('\r\n');
}
function saveToServer(d) {
  if (!CONSULT_CONFIG.apiUrl) return;   // 서버 주소가 없으면 건너뛴다
  fetch(CONSULT_CONFIG.apiUrl, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(d) })
    .catch(err => console.warn('[상담 신청] 서버 저장 실패 — 메일 발송은 그대로 진행됩니다.', err));
}
function submitConsult() {
  const d = consultPayload();
  lastConsultText = consultText(d);
  saveToServer(d);
  const subject = `[버거웨이브] 1인 창업 상담 신청 - ${d.name}`;
  window.location.href = `mailto:${CONSULT_CONFIG.email}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(lastConsultText)}`;
  $('#consult-done-name').textContent = `${d.name} 님`;
  $('#consult-done-phone').textContent = d.phone;
  consultForm.reset();                                         // 신청하기를 누르면 바로 신청서를 비운다
  [cName, cPhone, cAgree].forEach(i => setFieldError(i, ''));
  consultDialog.showModal();
  $('#consult-ok').focus();
}
$('#consult-copy').addEventListener('click', () => {
  const text = `받는 사람: ${CONSULT_CONFIG.email}\r\n\r\n${lastConsultText}`;
  const done = () => showToast('신청 내용을 복사했어요. 메일에 붙여 넣어 보내 주세요.');
  const fail = () => showToast(`복사하지 못했어요. ${CONSULT_CONFIG.storePhone}로 전화해 주세요.`);
  if (navigator.clipboard && window.isSecureContext) navigator.clipboard.writeText(text).then(done, fail);
  else fail();
});
