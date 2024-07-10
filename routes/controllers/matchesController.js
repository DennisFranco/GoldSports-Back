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

const getColombianDate = (date) => {
  return new Date(
    new Date(date).toLocaleDateString("en-US", { timeZone: "America/Bogota" })
  );
};

const formatDate = (date) => {
  const day = date
    .toLocaleDateString("en-US", {
      weekday: "short",
      timeZone: "America/Bogota",
    })
    .toUpperCase();
  const month = date
    .toLocaleDateString("en-US", {
      month: "short",
      timeZone: "America/Bogota",
    })
    .toUpperCase();
  const dayOfMonth = date.toLocaleDateString("en-US", {
    day: "2-digit",
    timeZone: "America/Bogota",
  });
  return `${day} ${dayOfMonth} ${month}.`;
};

// Obtener todos los partidos
const getAllMatches = async (req, res) => {
  try {
    const { date } = req.query;
    const queryDate = date ? new Date(date) : new Date();
    const startDate = new Date(queryDate);
    startDate.setDate(queryDate.getDate() - 7);
    const endDate = new Date(queryDate);
    endDate.setDate(queryDate.getDate() + 7);

    const matches = await getJSONData(matchesPath);
    const fields = await getJSONData(fieldsPath);
    const tournaments = await getJSONData(tournamentsPath);
    const teams = await getJSONData(teamsPath);

    const formattedMatches = {};

    const today = getColombianDate(new Date());
    const todayString = today.toISOString().split("T")[0];
    const yesterday = new Date(today);
    yesterday.setDate(today.getDate() - 1);
    const yesterdayString = yesterday.toISOString().split("T")[0];
    const tomorrow = new Date(today);
    tomorrow.setDate(today.getDate() + 1);
    const tomorrowString = tomorrow.toISOString().split("T")[0];

    // Generate keys for each day in the range
    for (
      let d = new Date(startDate);
      d <= endDate;
      d.setDate(d.getDate() + 1)
    ) {
      const matchDateString = getColombianDate(d).toISOString().split("T")[0];
      let formattedDate;

      if (matchDateString === todayString) {
        formattedDate = "HOY";
      } else if (matchDateString === yesterdayString) {
        formattedDate = "AYER";
      } else if (matchDateString === tomorrowString) {
        formattedDate = "MAÑANA";
      } else {
        formattedDate = formatDate(new Date(d));
      }

      if (!formattedMatches[formattedDate]) {
        formattedMatches[formattedDate] = [];
      }
    }

    matches.forEach((match) => {
      let dateMatch = new Date(match.date);
      const matchDate = getColombianDate(
        dateMatch.setDate(dateMatch.getDate() + 1)
      );
      const matchDateString = matchDate.toISOString().split("T")[0];

      if (matchDate >= startDate && matchDate <= endDate) {
        let formattedDate;

        if (matchDateString === todayString) {
          formattedDate = "HOY";
        } else if (matchDateString === yesterdayString) {
          formattedDate = "AYER";
        } else if (matchDateString === tomorrowString) {
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
          teams.find((t) => t.id === match.visiting_team)?.name ||
          "Unknown Team";

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
      }
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
    res.status(200).send({
      code: 200,
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
//(e.g., Programado, En Curso, Finalizado, Cancelado, Aplazado, Walkover)
