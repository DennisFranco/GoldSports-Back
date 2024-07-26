const fs = require("fs");
const path = require("path");

const matchesPath = path.join(__dirname, "../../db/matches.json");
const fieldsPath = path.join(__dirname, "../../db/fields.json");
const tournamentsPath = path.join(__dirname, "../../db/tournaments.json");
const teamsPath = path.join(__dirname, "../../db/teams.json");
const playersPath = path.join(__dirname, "../../db/players.json");
const eventsPath = path.join(__dirname, "../../db/events.json");
const matchPlayersNumberPath = path.join(
  __dirname,
  "../../db/match_players_number.json"
);
const teamsGroupsPath = path.join(__dirname, "../../db/teams_groups.json");

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
          id: match.id,
          id_tournament: match.id_tournament,
          round: match.round || "Unknown Round",
          team1: localTeam,
          team2: visitingTeam,
          time:
            match.status === 5
              ? `${match.local_result}-${match.visiting_result}`
              : match.hour_start,
          place,
          status: match.status,
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

const getMatchData = async (req, res) => {
  try {
    const [matches, teams, players, events, matchPlayersNumbers] =
      await Promise.all([
        getJSONData(matchesPath),
        getJSONData(teamsPath),
        getJSONData(playersPath),
        getJSONData(eventsPath),
        getJSONData(matchPlayersNumberPath),
      ]);

    const match = matches.find((m) => m.id === parseInt(req.params.id));
    if (!match) {
      return res.status(404).send("Match not found");
    }

    const homeTeam = teams.find((t) => t.id === match.local_team);
    const awayTeam = teams.find((t) => t.id === match.visiting_team);

    if (!homeTeam || !awayTeam) {
      return res.status(404).send("Teams not found");
    }

    const homePlayers = players.filter(
      (p) =>
        p.id_team === homeTeam.id && p.tournaments.includes(match.id_tournament)
    );
    const awayPlayers = players.filter(
      (p) =>
        p.id_team === awayTeam.id && p.tournaments.includes(match.id_tournament)
    );

    const matchEvents = events
      .filter((e) => e.id_match === match.id)
      .map((e) => {
        const player = players.find((p) => p.id === e.id_player);
        return {
          id: e.id,
          player: player ? player.name : "Unknown Player",
          minute: `${e.minute}'`,
          team: homePlayers.find((p) => p.id === e.id_player) ? "home" : "away",
          type: e.id_event_type,
        };
      });

    const matchPlayersNumbersMap = matchPlayersNumbers.reduce((acc, mpn) => {
      if (mpn.id_match === match.id) {
        acc[mpn.id_player] = mpn.number;
      }
      return acc;
    }, {});

    const formatPlayer = (player) => ({
      id: player.id,
      name: player.name,
      position: player.position,
      number: matchPlayersNumbersMap[player.id] || player.number,
      status: player.status,
    });

    let dateMatch = new Date(match.date);
    const matchDate = getColombianDate(
      dateMatch.setDate(dateMatch.getDate() + 1)
    );

    const matchData = {
      homeTeam: {
        id: homeTeam.id,
        manager: homeTeam.manager_name,
        name: homeTeam.name,
        logo: homeTeam.logo,
        formation: "4-3-3", // Example formation, update as needed
        players: homePlayers.map(formatPlayer),
      },
      awayTeam: {
        id: awayTeam.id,
        manager: awayTeam.manager_name,
        name: awayTeam.name,
        logo: awayTeam.logo,
        formation: "4-3-3", // Example formation, update as needed
        players: awayPlayers.map(formatPlayer),
      },
      hour: match.hour_start,
      score: `${match.local_result} - ${match.visiting_result}`,
      date: formatDate(matchDate),
      status: match.status,
      events: matchEvents,
    };

    res.status(200).send({
      code: 200,
      message: "Match data successfully obtained",
      data: matchData,
    });
  } catch (err) {
    console.error("Error in getMatchData:", err);
    res.status(500).send("Server error");
  }
};

const createMatch = async (req, res) => {
  try {
    const matches = await getJSONData(matchesPath);
    const {
      local_team,
      visiting_team,
      id_tournament,
      date,
      hour_start,
      place,
    } = req.body;

    // Verificar si ya existe un partido entre los mismos equipos en el mismo torneo
    const existingMatchBetweenTeams = matches.find(
      (match) =>
        ((match.local_team === local_team &&
          match.visiting_team === visiting_team) ||
          (match.local_team === visiting_team &&
            match.visiting_team === local_team)) &&
        match.id_tournament === id_tournament
    );

    if (existingMatchBetweenTeams) {
      return res.status(400).send({
        code: 400,
        message:
          "A match between these teams in the same tournament already exists",
      });
    }

    // Verificar si ya existe un partido en la misma fecha, hora y cancha
    const existingMatchSameDateTimePlace = matches.find(
      (match) =>
        match.date === date &&
        match.hour_start === hour_start &&
        match.place === place
    );

    if (existingMatchSameDateTimePlace) {
      return res.status(400).send({
        code: 400,
        message: "A match at the same date, time, and place already exists",
      });
    }

    // Verificar si ya existe un partido en la misma fecha y cancha con una diferencia de menos de 2 horas
    const hourStart = new Date(`${date}T${hour_start}:00Z`).getTime();
    const twoHoursInMillis = 2 * 60 * 60 * 1000;

    const existingMatchWithinTwoHours = matches.find((match) => {
      if (match.date === date && match.place === place) {
        const matchStartTime = new Date(
          `${match.date}T${match.hour_start}:00Z`
        ).getTime();
        return Math.abs(matchStartTime - hourStart) < twoHoursInMillis;
      }
      return false;
    });

    if (existingMatchWithinTwoHours) {
      return res.status(400).send({
        code: 400,
        message:
          "A match at the same place and date cannot be created within 2 hours of another match",
      });
    }

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
    console.error("Error in createMatch:", err);
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
  getMatchData,
};
//(e.g.,  1 Programado, 4 En Curso, 5 Finalizado, 2 Cancelado, 3 Aplazado, 6 Walkover)
