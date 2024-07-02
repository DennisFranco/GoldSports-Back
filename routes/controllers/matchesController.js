const fs = require("fs");
const path = require("path");

const matchesPath = path.join(__dirname, "../../db/matches.json");
const fieldsPath = path.join(__dirname, "../../db/fields.json");
const tournamentsPath = path.join(__dirname, "../../db/tournaments.json");
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

// Helper function to get the date in Colombian timezone
const getColombianDate = (date) => {
  const utcDate = new Date(date);
  const offset = -5; // Colombian time zone offset
  const colombianDate = new Date(utcDate.getTime() + offset * 60 * 60 * 1000);
  return colombianDate;
};

// Obtener todos los partidos
const getAllMatches = async (req, res) => {
  try {
    const matches = await getJSONData(matchesPath);
    const fields = await getJSONData(fieldsPath);
    const tournaments = await getJSONData(tournamentsPath);
    const teams = await getJSONData(teamsPath);

    const formattedMatches = {};

    const today = getColombianDate(new Date());
    const yesterday = new Date(today);
    yesterday.setDate(today.getDate() - 1);
    const tomorrow = new Date(today);
    tomorrow.setDate(today.getDate() + 1);

    const formatDate = (date) => {
      const day = date
        .toLocaleDateString("es-ES", { weekday: "short" })
        .toUpperCase();
      const formattedDate = date
        .toLocaleDateString("es-ES", { day: "2-digit", month: "2-digit" })
        .replace("/", " ");
      return `${day} ${formattedDate}`;
    };

    matches.forEach((match) => {
      const matchDate = getColombianDate(match.date);
      let formattedDate;

      if (matchDate.toDateString() === today.toDateString()) {
        formattedDate = "HOY";
      } else if (matchDate.toDateString() === yesterday.toDateString()) {
        formattedDate = "AYER";
      } else if (matchDate.toDateString() === tomorrow.toDateString()) {
        formattedDate = "MAÑANA";
      } else {
        formattedDate = formatDate(matchDate);
      }

      const tournament =
        tournaments.find((t) => t.id === match.id_tournament)?.name ||
        "Unknown Tournament";
      const place =
        fields.find((f) => f.id === match.place)?.name || "Unknown Place";
      const localTeam =
        teams.find((t) => t.id === match.local_team)?.name || "Unknown Team";
      const visitingTeam =
        teams.find((t) => t.id === match.visiting_team)?.name || "Unknown Team";

      if (!formattedMatches[formattedDate]) {
        formattedMatches[formattedDate] = [];
      }

      let tournamentMatches = formattedMatches[formattedDate].find(
        (t) => t.tournament === tournament
      );
      if (!tournamentMatches) {
        tournamentMatches = { tournament: tournament, matches: [] };
        formattedMatches[formattedDate].push(tournamentMatches);
      }

      tournamentMatches.matches.push({
        round: match.round || "Unknown Round",
        team1: localTeam,
        team2: visitingTeam,
        time:
          match.status === "Finalizado"
            ? `${match.local_result}-${match.visiting_result}`
            : match.hour_start,
        place,
      });
    });

    res.status(200).send({
      code: 200,
      message: "Matches successfully obtained",
      data: formattedMatches,
    });
  } catch (err) {
    res.status(500).send("Server error");
  }
};

// Obtener un partido por ID
const getMatchByID = async (req, res) => {
  const matches = await getJSONData(matchesPath);

  try {
    if (matches) {
      const match = matches.find((m) => m.id === parseInt(req.params.id));
      if (match) {
        res.status(200).send({
          code: 200,
          message: "Match successfully obtained",
          data: match,
        });
      } else {
        res.status(404).send("Match not found");
      }
    } else {
      return res.status(500).send("Error reading matches from file");
    }
  } catch (err) {
    res.status(500).send("Server error");
  }
};

// Crear un nuevo partido
const createMatch = async (req, res) => {
  try {
    const matches = await getJSONData(matchesPath);
    const newMatch = {
      id: matches.length + 1,
      ...req.body,
    };
    matches.push(newMatch);
    await writeJSONData(matchesPath, matches);
    res.status(201).send({
      code: 201,
      message: "Match successfully created",
      data: newMatch,
    });
  } catch (err) {
    res.status(500).send("Server error");
  }
};

// Actualizar un partido por ID
const updateMatch = async (req, res) => {
  try {
    const matches = await getJSONData(matchesPath);
    const matchIndex = matches.findIndex(
      (m) => m.id === parseInt(req.params.id)
    );
    if (matchIndex !== -1) {
      matches[matchIndex] = { id: parseInt(req.params.id), ...req.body };
      await writeJSONData(matchesPath, matches);
      res.status(200).send({
        code: 200,
        message: "Match successfully updated",
        data: matches[matchIndex],
      });
    } else {
      res.status(404).send("Match not found");
    }
  } catch (err) {
    res.status(500).send("Server error");
  }
};

// Eliminar un partido por ID
const deleteMatch = async (req, res) => {
  try {
    const matches = await getJSONData(matchesPath);
    const matchIndex = matches.findIndex(
      (m) => m.id === parseInt(req.params.id)
    );
    if (matchIndex !== -1) {
      const deletedMatch = matches.splice(matchIndex, 1);
      await writeJSONData(matchesPath, matches);
      res.status(200).send({
        code: 200,
        message: "Match successfully deleted",
        data: deletedMatch,
      });
    } else {
      res.status(404).send("Match not found");
    }
  } catch (err) {
    res.status(500).send("Server error");
  }
};

module.exports = {
  getAllMatches,
  getMatchByID,
  createMatch,
  updateMatch,
  deleteMatch,
};
