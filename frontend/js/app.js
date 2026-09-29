const state = { packages: [], selected: null };

const grid = document.getElementById("packageGrid");
const modal = document.getElementById("paymentModal");
const phone = document.getElementById("phone");
const paymentState = document.getElementById("paymentState");
const dashboardContent = document.getElementById("dashboardContent");

function money(n){ return `KES ${Number(n).toLocaleString()}`; }

async function loadPackages(){
  const res = await fetch("/api/packages");
  const data = await res.json();
  state.packages = data.packages;
  renderPackages("all");
}

function renderPackages(filter){
  grid.innerHTML = "";
  state.packages.filter(p => filter === "all" || p.category === filter).forEach(pkg => {
    const card = document.createElement("article");
    card.className = "package";
    card.innerHTML = `
      ${pkg.badge ? `<span class="badge">${pkg.badge}</span>` : ""}
      <div class="category">${pkg.category}</div>
      <h3>${pkg.name}</h3>
      <p>${pkg.description}</p>
      <div class="pkg-price">${money(pkg.priceKes)} <small>/ package</small></div>
      <button class="btn primary full">Buy now</button>
    `;
    card.querySelector("button").onclick = () => openPayment(pkg);
    grid.appendChild(card);
  });
}

function openPayment(pkg){
  state.selected = pkg;
  document.getElementById("modalPackage").textContent = pkg.name;
  document.getElementById("modalPrice").textContent = money(pkg.priceKes);
  document.getElementById("modalDuration").textContent = `${durationText(pkg.durationMinutes)} • Promise Enterprise`;
  phone.value = "";
  paymentState.innerHTML = "";
  document.getElementById("payBtn").disabled = false;
  modal.classList.add("open");
  phone.focus();
}
function durationText(minutes){
  if(minutes % 43200 === 0) return `${minutes/43200} month`;
  if(minutes % 1440 === 0) return `${minutes/1440} day${minutes/1440>1?"s":""}`;
  return `${minutes/60} hour${minutes/60>1?"s":""}`;
}
function closePayment(){ modal.classList.remove("open"); }
document.getElementById("closeModal").onclick = closePayment;
modal.onclick = e => { if(e.target === modal) closePayment(); };

document.querySelectorAll(".filter").forEach(btn => btn.onclick = () => {
  document.querySelectorAll(".filter").forEach(x => x.classList.remove("active"));
  btn.classList.add("active");
  renderPackages(btn.dataset.filter);
});

document.getElementById("payBtn").onclick = async () => {
  const selected = state.selected;
  if(!selected) return;
  document.getElementById("payBtn").disabled = true;
  paymentState.innerHTML = `<div class="payment-state">Checking number and starting M-PESA prompt…</div>`;
  try{
    const res = await fetch("/api/payment/stkpush", {
      method:"POST",
      headers:{"Content-Type":"application/json"},
      body:JSON.stringify({packageId:selected.id, phoneNumber:phone.value})
    });
    const data = await res.json();
    if(!res.ok) throw new Error(data.error || "Payment could not be started.");
    if(data.demo && data.subscription){
      paymentState.innerHTML = `<div class="success">✓ Payment successful. Your demo Wi-Fi access is ready.</div>`;
      renderDashboard(selected, data.subscription, data.paymentId);
      showToast("Payment successful — access activated.");
    } else {
      paymentState.innerHTML = `<div class="success">✓ STK Push sent. Check your phone and enter your M-PESA PIN.</div>`;
      pollPayment(data.paymentId, selected);
    }
  }catch(err){
    paymentState.innerHTML = `<div class="error">${escapeHtml(err.message)}</div>`;
    document.getElementById("payBtn").disabled = false;
  }
};

async function pollPayment(paymentId, pkg){
  let attempts = 0;
  const timer = setInterval(async () => {
    attempts++;
    try{
      const res = await fetch(`/api/payment/status/${paymentId}`);
      const data = await res.json();
      if(data.subscription){
        clearInterval(timer);
        paymentState.innerHTML = `<div class="success">✓ Payment confirmed. Wi-Fi access activated.</div>`;
        renderDashboard(pkg, data.subscription, paymentId);
      } else if(data.payment?.status === "failed" || attempts > 20){
        clearInterval(timer);
        paymentState.innerHTML = `<div class="error">Payment was not confirmed. You can try again.</div>`;
        document.getElementById("payBtn").disabled = false;
      }
    }catch(e){}
  }, 3000);
}

function renderDashboard(pkg, sub, paymentId){
  dashboardContent.innerHTML = `
    <div class="dash-grid">
      <div class="dash-card"><small>Package</small><strong>${escapeHtml(pkg.name)}</strong></div>
      <div class="dash-card"><small>Status</small><strong>ACTIVE</strong></div>
      <div class="dash-card"><small>Payment</small><strong>#${paymentId}</strong></div>
      <div class="dash-card"><small>Expires</small><strong>${new Date(sub.expiresAt).toLocaleString()}</strong></div>
    </div>
    <div class="access-box">
      <div class="eyebrow">YOUR WI-FI ACCESS</div>
      <div class="access-row"><span>Username</span><strong>${escapeHtml(sub.username)}</strong></div>
      <div class="access-row"><span>Password</span><strong id="wifiPass">${escapeHtml(sub.password)}</strong></div>
      <div class="access-row"><span>Activated</span><strong>${new Date(sub.activatedAt).toLocaleString()}</strong></div>
      <button class="btn primary" style="margin-top:15px" onclick="copyPassword()">Copy password</button>
    </div>
  `;
  document.getElementById("dashboard").scrollIntoView({behavior:"smooth"});
}
window.copyPassword = async () => {
  const el = document.getElementById("wifiPass");
  if(!el) return;
  await navigator.clipboard.writeText(el.textContent);
  showToast("Password copied.");
};

function escapeHtml(s){ return String(s).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c])); }
function showToast(msg){
  const t=document.getElementById("toast"); t.textContent=msg; t.classList.add("show");
  setTimeout(()=>t.classList.remove("show"),2800);
}
window.showToast = showToast;

document.getElementById("themeBtn").onclick = () => {
  document.body.classList.toggle("light");
  document.getElementById("themeBtn").textContent = document.body.classList.contains("light") ? "☀" : "☾";
};

loadPackages().catch(() => {
  grid.innerHTML = `<div class="error">Could not load packages. Make sure the backend is running.</div>`;
});
