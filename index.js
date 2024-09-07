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

app.use(cors({
    origin: '*', // Permite todas las conexiones. Ajusta según sea necesario. 
    methods: 'GET,POST,PUT,DELETE',
    allowedHeaders: 'Content-Type,Authorization'
}));
app.use("/v1/goldSports", router);

const PORT = process.env.PORT || 4000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
