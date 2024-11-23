const express = require("express");
const fs = require("fs");
const router = require("./routes/goldsports.routes");
const helmet = require("helmet");
var compression = require("compression");
const cors = require("cors");
require("dotenv").config();
const { connectDB } = require("./config/db");
const https = require("https");

// Opciones para el servidor https, para usar los certificados para SSL/TLS
const httpsServerOptions = {
  key: fs.readFileSync(process.env.KEY_PATH),
  cert: fs.readFileSync(process.env.CERT_PATH),
};

connectDB();

const app = express();
app.use(
  cors({
    origin: "*",
    methods: ["GET", "POST", "PUT", "DELETE"],
    allowedHeaders: ["Content-Type", "Authorization"],
  })
);

app.use(express.json());

// Ruta raíz
app.get("/", (req, res) => {
  res.send("Bienvenido a Gold Sports API!");
});

app.use("/v1/goldSports", router);

// Servidor HTTPS
const serverHttps = https.createServer(httpsServerOptions, app);
serverHttps.listen(process.env.HTTPS_PORT, process.env.IP);

serverHttps.on("listening", () =>
  console.info(
    `Notes App running at http://${process.env.IP}:${process.env.HTTPS_PORT}`
  )
);