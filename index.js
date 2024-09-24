const express = require("express");
const { urlencoded, json } = require("express");
const router = require("./routes/goldsports.routes");
const cors = require("cors");
require("dotenv").config();
const { connectDB } = require("./config/db");
const http = require("http");

const app = express();

connectDB();

app.use(urlencoded({ limit: "50mb", extended: true }));
app.use(json({ limit: "50mb" }));

app.use(
  cors({
    origin: "*", // Permite todas las conexiones. Ajusta según sea necesario.
    methods: ["GET", "POST", "PUT", "DELETE"],
    allowedHeaders: ["Content-Type", "Authorization"],
  })
);

// Ruta raíz
app.get("/", (req, res) => {
  res.send("Bienvenido a Gold Sports API!");
});

app.use("/v1/goldSports", router);

const PORT = process.env.PORT || 4000;
const HOST = process.env.IP || "0.0.0.0";

// Crear el servidor HTTP usando el módulo http
const server = http.createServer(app);

// Iniciar el servidor y escuchar en el puerto especificado
server.listen(PORT, HOST);
server.on("listening", () =>
  console.info(`Notes App running at http://${HOST}:${PORT}`)
);