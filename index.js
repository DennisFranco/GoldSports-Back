// const express = require("express");
// const fs = require("fs");
// const router = require("./routes/goldsports.routes");

// const cors = require("cors");
// require("dotenv").config();
// const { connectDB } = require("./config/db");
// const https = require("https");

// // Opciones para el servidor https, para usar los certificados para SSL/TLS
// const httpsServerOptions = {
//   key: fs.readFileSync(process.env.KEY_PATH),
//   cert: fs.readFileSync(process.env.CERT_PATH),
// };

// connectDB();

// const app = express();
// app.use(
//   cors({
//     origin: "*",
//     methods: ["GET", "POST", "PUT", "DELETE"],
//     allowedHeaders: ["Content-Type", "Authorization"],
//   })
// );

// app.use(express.json());

// // Ruta raíz
// app.get("/", (req, res) => {
//   res.send("Bienvenido a Gold Sports API!");
// });

// app.use("/v1/goldSports", router);

// // Servidor HTTPS
// const serverHttps = https.createServer(httpsServerOptions, app);
// serverHttps.listen(process.env.HTTPS_PORT, process.env.IP);

// serverHttps.on("listening", () =>
//   console.info(
//     `Notes App running at http://${process.env.IP}:${process.env.HTTPS_PORT}`
//   )
// );
const express = require("express");
const { urlencoded, json } = require("express");
const router = require("./routes/goldsports.routes");
const cors = require("cors");
require("dotenv").config();
const { connectDB } = require("./config/db");

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

const PORT = process.env.PORT || 4000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));