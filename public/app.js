const prizeBody = document.getElementById("prize-body");
const startBtn = document.getElementById("start-btn");
const fullscreenBtn = document.getElementById("fullscreen-btn");
const statusEl = document.getElementById("status");

fullscreenBtn.addEventListener("click", () => {
  if (!document.fullscreenElement) {
    document.documentElement.requestFullscreen().catch(() => {});
    fullscreenBtn.textContent = "Keluar Layar Penuh";
  } else {
    document.exitFullscreen();
  }
});

document.addEventListener("fullscreenchange", () => {
  fullscreenBtn.textContent = document.fullscreenElement
    ? "Keluar Layar Penuh"
    : "Layar Penuh";
});

const PAUSE_BETWEEN_DRAWS_MS = 200;

let session = []; // [{ prize, winner }]
let phase = "idle"; // idle -> ready (list shown) -> drawing -> idle

function renderRows(activeIndex) {
  prizeBody.innerHTML = "";
  session.forEach((item, i) => {
    const tr = document.createElement("tr");
    tr.dataset.index = i;
    if (item.winner) tr.classList.add("won");
    if (i === activeIndex && !item.winner) tr.classList.add("active");

    const prizeTd = document.createElement("td");
    prizeTd.className = "prize-name";
    prizeTd.textContent = item.prize;

    const winnerTd = document.createElement("td");
    winnerTd.className = "winner-name";
    winnerTd.textContent = item.winner || "?????";

    tr.appendChild(prizeTd);
    tr.appendChild(winnerTd);
    prizeBody.appendChild(tr);
  });
}

function setStatus(msg) {
  statusEl.textContent = msg;
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

startBtn.addEventListener("click", async () => {
  if (phase === "idle") {
    await loadPrizeList();
  } else if (phase === "ready") {
    await runDraws();
  }
});

async function loadPrizeList() {
  startBtn.disabled = true;
  setStatus("Mengambil daftar doorprize dari sheet PUTAR...");

  try {
    const res = await fetch("/api/session/start");
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || "Gagal memulai sesi");

    session = data.prizes.map((p) => ({ prize: p, winner: null }));
    renderRows(-1);

    phase = "ready";
    startBtn.textContent = "Mulai Undian";
    setStatus(`${session.length} doorprize siap diundi. Klik "Mulai Undian" lagi untuk mulai.`);
  } catch (err) {
    setStatus(`Error: ${err.message}`);
  } finally {
    startBtn.disabled = false;
  }
}

async function runDraws() {
  startBtn.disabled = true;

  try {
    for (let i = 0; i < session.length; i++) {
      renderRows(i);
      setStatus(`Mengundi (${i + 1}/${session.length}): ${session[i].prize} ...`);

      const row = prizeBody.querySelector(`tr[data-index="${i}"]`);
      const winnerTd = row.querySelector(".winner-name");
      winnerTd.classList.add("spinning");

      const drawRes = await fetch("/api/draw", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ doorprize: session[i].prize }),
      });
      const drawData = await drawRes.json();
      if (!drawRes.ok) throw new Error(drawData.error || "Gagal mengundi");

      await animateReveal(winnerTd, drawData.decoys, drawData.winner);

      session[i].winner = drawData.winner;
      renderRows(i + 1);

      if (i < session.length - 1) {
        await sleep(PAUSE_BETWEEN_DRAWS_MS);
      }
    }

    setStatus("Sesi selesai! Semua doorprize sudah diundi.");
    phase = "idle";
  } catch (err) {
    setStatus(`Error: ${err.message}`);
  } finally {
    startBtn.disabled = false;
  }
}

function animateReveal(cell, decoys, finalName) {
  return new Promise((resolve) => {
    const pool = decoys && decoys.length ? decoys : [finalName];
    const totalTicks = 15;
    let delay = 50;
    let i = 0;

    function tick() {
      if (i >= totalTicks) {
        cell.textContent = finalName;
        cell.classList.remove("spinning");
        resolve();
        return;
      }
      cell.textContent = pool[i % pool.length];
      i += 1;
      delay += 12; // slow down like a spinning reel settling, totals ~2s
      setTimeout(tick, delay);
    }
    tick();
  });
}

renderRows(-1);
