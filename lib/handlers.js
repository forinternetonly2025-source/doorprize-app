const {
  getPutarPrizes,
  getDataParticipants,
  deleteDataRow,
  appendWinner,
} = require("../sheets");
const { shuffle } = require("./shuffle");

const PRIZES_PER_SESSION = parseInt(process.env.PRIZES_PER_SESSION || "10", 10);

// Start a new session: pull doorprizes for this round from PUTAR
async function sessionStart(req, res) {
  try {
    const allPrizes = await getPutarPrizes();
    if (allPrizes.length === 0) {
      return res.status(400).json({ error: "Sheet PUTAR kosong" });
    }
    const chosen =
      allPrizes.length > PRIZES_PER_SESSION
        ? shuffle(allPrizes).slice(0, PRIZES_PER_SESSION)
        : allPrizes;
    res.status(200).json({ prizes: chosen });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
}

// Draw one winner for a given doorprize name
async function draw(req, res) {
  try {
    const { doorprize } = req.body || {};
    if (!doorprize) {
      return res.status(400).json({ error: "doorprize wajib diisi" });
    }

    const participants = await getDataParticipants();
    if (participants.length === 0) {
      return res.status(400).json({ error: "Peserta di sheet DATA sudah habis" });
    }

    const winnerIndex = Math.floor(Math.random() * participants.length);
    const winner = participants[winnerIndex];

    const decoyPool = participants
      .filter((_, i) => i !== winnerIndex)
      .map((p) => p.name);
    const decoys = shuffle(decoyPool).slice(0, 20);

    await deleteDataRow(winner.row);
    await appendWinner(doorprize, winner.name);

    res.status(200).json({
      winner: winner.name,
      decoys,
      remaining: participants.length - 1,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
}

async function participantsCount(req, res) {
  try {
    const participants = await getDataParticipants();
    res.status(200).json({ count: participants.length });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
}

module.exports = { sessionStart, draw, participantsCount };
