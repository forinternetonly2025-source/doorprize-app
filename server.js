require("dotenv").config();
const express = require("express");
const path = require("path");
const handlers = require("./lib/handlers");

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());
app.use(express.static(path.join(__dirname, "public")));

app.get("/api/session/start", handlers.sessionStart);
app.post("/api/draw", handlers.draw);
app.get("/api/participants/count", handlers.participantsCount);

app.listen(PORT, () => {
  console.log(`Doorprize app berjalan di http://localhost:${PORT}`);
});
