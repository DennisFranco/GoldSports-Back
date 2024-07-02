const fs = require("fs");
const path = require("path");

const classificationsPath = path.join(
  __dirname,
  "../../db/classifications.json"
);
const tournamentsPath = path.join(__dirname, "../../db/tournaments.json");
const groupsPath = path.join(__dirname, "../../db/groups.json");
const teamsPath = path.join(__dirname, "../../db/teams.json");

const getJSONData = (filePath) => {
  return new Promise((resolve, reject) => {
    fs.readFile(filePath, "utf8", (err, data) => {
      if (err) {
        reject(err);
      } else {
        resolve(JSON.parse(data));
      }
    });
  });
};

const writeJSONData = (filePath, data) => {
  return new Promise((resolve, reject) => {
    fs.writeFile(filePath, JSON.stringify(data, null, 2), "utf8", (err) => {
      if (err) {
        reject(err);
      } else {
        resolve(true);
      }
    });
  });
};

// Obtener todas las clasificaciones
const getAllClassifications = async (req, res) => {
  try {
    const classifications = await getJSONData(classificationsPath);
    const tournaments = await getJSONData(tournamentsPath);
    const groups = await getJSONData(groupsPath);
    const teams = await getJSONData(teamsPath);

    const formattedClassifications = {};

    classifications.forEach((classification) => {
      const tournament =
        tournaments.find((t) => t.id === classification.id_tournament)?.name ||
        "Unknown Tournament";
      const group =
        groups.find((g) => g.id === classification.id_group)?.name ||
        "Unknown Group";
      const team =
        teams.find((t) => t.id === classification.id_team)?.name ||
        "Unknown Team";

      if (!formattedClassifications[tournament]) {
        formattedClassifications[tournament] = {};
      }

      if (!formattedClassifications[tournament][group]) {
        formattedClassifications[tournament][group] = [];
      }

      formattedClassifications[tournament][group].push({
        team,
        puntos: classification.puntos,
        partidos_jugados: classification.partidos_jugados,
        partidos_ganados: classification.partidos_ganados,
        partidos_empatados: classification.partidos_empatados,
        partidos_perdidos: classification.partidos_perdidos,
        goles_favor: classification.goles_favor,
        goles_contra: classification.goles_contra,
        diferencia_goles: classification.diferencia_goles,
      });
    });

    res.status(200).send({
      code: 200,
      message: "Classifications successfully obtained",
      data: formattedClassifications,
    });
  } catch (err) {
    res.status(500).send("Server error");
  }
};

module.exports = {
  getAllClassifications,
};
