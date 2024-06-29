const fs = require("fs");
const path = require("path");

const playersPath = path.join(__dirname, "../../db/players.json");

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

// Obtener todos los jugadores
const getAllPlayers = async (req, res) => {
  const players = await getJSONData(playersPath);

  try {
    if (players) {
      res.status(200).send({
        code: 200,
        message: "Players successfully obtained",
        data: players,
      });
    } else {
      return res.status(500).send("Error reading players from file");
    }
  } catch (err) {
    res.status(500).send("Server error");
  }
};

// Obtener un jugador por ID
const getPlayerByID = async (req, res) => {
  const players = await getJSONData(playersPath);

  try {
    if (players) {
      const player = players.find((p) => p.id === parseInt(req.params.id));
      if (player) {
        res.status(200).send({
          code: 200,
          message: "Player successfully obtained",
          data: player,
        });
      } else {
        res.status(404).send("Player not found");
      }
    } else {
      return res.status(500).send("Error reading players from file");
    }
  } catch (err) {
    res.status(500).send("Server error");
  }
};

// Crear un nuevo jugador
const createPlayer = async (req, res) => {
  try {
    const players = await getJSONData(playersPath);
    const newPlayer = {
      id: players.length + 1,
      ...req.body,
    };
    players.push(newPlayer);
    await writeJSONData(playersPath, players);
    res.status(201).send({
      code: 201,
      message: "Player successfully created",
      data: newPlayer,
    });
  } catch (err) {
    res.status(500).send("Server error");
  }
};

// Actualizar un jugador por ID
const updatePlayer = async (req, res) => {
  try {
    const players = await getJSONData(playersPath);
    const playerIndex = players.findIndex(
      (p) => p.id === parseInt(req.params.id)
    );
    if (playerIndex !== -1) {
      players[playerIndex] = { id: parseInt(req.params.id), ...req.body };
      await writeJSONData(playersPath, players);
      res.status(200).send({
        code: 200,
        message: "Player successfully updated",
        data: players[playerIndex],
      });
    } else {
      res.status(404).send("Player not found");
    }
  } catch (err) {
    res.status(500).send("Server error");
  }
};

// Eliminar un jugador por ID
const deletePlayer = async (req, res) => {
  try {
    const players = await getJSONData(playersPath);
    const playerIndex = players.findIndex(
      (p) => p.id === parseInt(req.params.id)
    );
    if (playerIndex !== -1) {
      const deletedPlayer = players.splice(playerIndex, 1);
      await writeJSONData(playersPath, players);
      res.status(200).send({
        code: 200,
        message: "Player successfully deleted",
        data: deletedPlayer,
      });
    } else {
      res.status(404).send("Player not found");
    }
  } catch (err) {
    res.status(500).send("Server error");
  }
};

module.exports = {
  getAllPlayers,
  getPlayerByID,
  createPlayer,
  updatePlayer,
  deletePlayer,
};
