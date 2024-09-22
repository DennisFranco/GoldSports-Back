const express = require("express");
const fs = require("fs");
const router = require("./routes/goldsports.routes");
const helmet = require("helmet"); var compression = require("compression");
const cors = require("cors");
require("dotenv").config();
const { connectDB } = require("./config/db");
const http = require("http");
const https = require("https");
// Opciones para el servidor https, para usar los certificados para SSL/TLS
const httpsServerOptions = { key: fs.readFileSync(process.env.KEY_PATH), cert: fs.readFileSync(process.env.CERT_PATH), };
connectDB();

const app = express();
app.use(helmet({ contentSecurityPolicy: false })); // Ayuda a proteger aplicaciones Express
app.use(compression());
app.use(cors());
// Ruta raíz
app.get("/", (req, res) => { res.send("Bienvenido a Gold Sports API!");});

app.use("/v1/goldSports", router);
const PORT = process.env.PORT || 4000; 
const HOST = process.env.IP || "0.0.0.0";
// Crear el servidor HTTP usando el módulo http
const server = http.createServer(app);
// Servidor HTTPS
const serverHttps = https.createServer(httpsServerOptions, app); serverHttps.listen(process.env.HTTPS_PORT, process.env.IP);
// Redireccionamiento de http a https, debe ser el primer app.use
app.use((req, res, next) => { if (req.secure) next(); else res.redirect(`https://${req.headers.host}${req.url}`); });