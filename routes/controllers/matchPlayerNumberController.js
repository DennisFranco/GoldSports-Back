const fs = require("fs");
const path = require("path");

const matchPlayersNumberPath = path.join(
  __dirname,
  "../../db/match_players_number.json"
);

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

// Obtener todos los números de jugadores en partido
const getAllMatchPlayersNumbers = async (req, res) => {
  const matchPlayersNumbers = await getJSONData(matchPlayersNumberPath);

  try {
    if (matchPlayersNumbers) {
      res.status(200).send({
        code: 200,
        message: "Match players numbers successfully obtained",
        data: matchPlayersNumbers,
      });
    } else {
      return res
        .status(500)
        .send("Error reading match players numbers from file");
    }
  } catch (err) {
    res.status(500).send("Server error");
  }
};

// Obtener un número de jugador en partido por ID
const getMatchPlayerNumberByID = async (req, res) => {
  const matchPlayersNumbers = await getJSONData(matchPlayersNumberPath);

  try {
    if (matchPlayersNumbers) {
      const matchPlayerNumber = matchPlayersNumbers.find(
        (mpn) => mpn.id === parseInt(req.params.id)
      );
      if (matchPlayerNumber) {
        res.status(200).send({
          code: 200,
          message: "Match player number successfully obtained",
          data: matchPlayerNumber,
        });
      } else {
        res.status(404).send("Match player number not found");
      }
    } else {
      return res
        .status(500)
        .send("Error reading match players numbers from file");
    }
  } catch (err) {
    res.status(500).send("Server error");
  }
};

// Crear nuevos números de jugadores en partido
const createMatchPlayerNumbers = async (req, res) => {
  try {
    const matchPlayersNumbers = await getJSONData(matchPlayersNumberPath);
    const newEntries = Object.entries(req.body).map(
      ([id_player, number], index) => ({
        id: matchPlayersNumbers.length + index + 1,
        id_match: parseInt(req.params.idMatch),
        id_player: parseInt(id_player),
        number: number,
      })
    );
    matchPlayersNumbers.push(...newEntries);
    await writeJSONData(matchPlayersNumberPath, matchPlayersNumbers);
    res.status(200).send({
      code: 200,
      message: "Match player numbers successfully created",
      data: newEntries,
    });
  } catch (err) {
    res.status(500).send("Server error");
  }
};

module.exports = {
  getAllMatchPlayersNumbers,
  getMatchPlayerNumberByID,
  createMatchPlayerNumbers
};
