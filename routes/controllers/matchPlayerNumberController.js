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
        id_match_sheet: parseInt(req.params.id),
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

// Actualizar números de jugadores en partido
const updateMatchPlayerNumbers = async (req, res) => {
  try {
    const matchPlayersNumbers = await getJSONData(matchPlayersNumberPath);
    Object.entries(req.body).forEach(([id_player, number]) => {
      const index = matchPlayersNumbers.findIndex(
        (mpn) =>
          mpn.id_player === parseInt(id_player) &&
          mpn.id_match_sheet === parseInt(req.params.id_match_sheet)
      );
      if (index !== -1) {
        matchPlayersNumbers[index].number = number;
      } else {
        const newEntry = {
          id: matchPlayersNumbers.length + 1,
          id_match_sheet: parseInt(req.params.id_match_sheet),
          id_player: parseInt(id_player),
          number: number,
        };
        matchPlayersNumbers.push(newEntry);
      }
    });
    await writeJSONData(matchPlayersNumberPath, matchPlayersNumbers);
    res.status(200).send({
      code: 200,
      message: "Match player numbers successfully updated",
      data: matchPlayersNumbers.filter(
        (mpn) => mpn.id_match_sheet === parseInt(req.params.id_match_sheet)
      ),
    });
  } catch (err) {
    res.status(500).send("Server error");
  }
};

// Eliminar un número de jugador en partido por ID
const deleteMatchPlayerNumber = async (req, res) => {
  try {
    const matchPlayersNumbers = await getJSONData(matchPlayersNumberPath);
    const matchPlayerNumberIndex = matchPlayersNumbers.findIndex(
      (mpn) => mpn.id === parseInt(req.params.id)
    );
    if (matchPlayerNumberIndex !== -1) {
      const deletedMatchPlayerNumber = matchPlayersNumbers.splice(
        matchPlayerNumberIndex,
        1
      );
      await writeJSONData(matchPlayersNumberPath, matchPlayersNumbers);
      res.status(200).send({
        code: 200,
        message: "Match player number successfully deleted",
        data: deletedMatchPlayerNumber,
      });
    } else {
      res.status(404).send("Match player number not found");
    }
  } catch (err) {
    res.status(500).send("Server error");
  }
};

module.exports = {
  getAllMatchPlayersNumbers,
  getMatchPlayerNumberByID,
  createMatchPlayerNumbers,
  updateMatchPlayerNumbers,
  deleteMatchPlayerNumber,
};
