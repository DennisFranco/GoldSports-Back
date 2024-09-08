const fs = require("fs");
const path = require("path");
const { connectDB, getDB } = require("./config/db");
require("dotenv").config();

async function loadJsonAndInsert() {
  await connectDB();
  const db = getDB();

  console.log(db);
  // Leer el archivo JSON
  const jsonData = fs.readFileSync(
    path.join(__dirname, "./db/types_docs.json"),
    "utf8"
  );
  const data = JSON.parse(jsonData);

  console.log(data);

  // Insertar datos en la colección
  const collection = db.collection("types_docs"); // Nombre de la colección
  await collection.insertMany(data);

  console.log("Datos insertados correctamente");
}

loadJsonAndInsert();
