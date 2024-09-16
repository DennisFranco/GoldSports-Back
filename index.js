const express = require("express");
const { urlencoded, json } = require("express");
const router = require("./routes/goldsports.routes");
const cors = require("cors");
require("dotenv").config();
const { connectDB } = require("./config/db");
const http = require("http"); // Importar el módulo http

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
app.use("/v1/goldSports", router);

const PORT = 4000;

// Crear el servidor HTTP usando el módulo http
const server = http.createServer(app);

// Iniciar el servidor y escuchar en el puerto especificado

server.listen(PORT, process.env.IP);
server.on("listening", () =>
  console.info(
    `Notes App running at http://${process.env.IP}:${process.env.PORT}`
  )
);
