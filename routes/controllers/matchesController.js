const fs = require("fs");
const path = require("path");
const ExcelJS = require("exceljs");

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
const classificationsPath = path.join(
  __dirname,
  "../../db/classifications.json"
);
const teamsGroupsPath = path.join(__dirname, "../../db/teams_groups.json");
const placesPath = path.join(__dirname, "../../db/fields.json");
const groupsPath = path.join(__dirname, "../../db/groups.json");

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
      observations: match.observations,
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

const updateMatchStatus = async (req, res) => {
  try {
    const { matchId, winnerTeamId } = req.body;

    const [matches, classifications, teams] = await Promise.all([
      getJSONData(matchesPath),
      getJSONData(classificationsPath),
      getJSONData(teamsPath),
    ]);

    const matchIndex = matches.findIndex((m) => m.id === parseInt(matchId));
    if (matchIndex === -1) {
      return res.status(404).send("Match not found");
    }

    const match = matches[matchIndex];
    const { local_team, visiting_team, id_tournament } = match;
    const loserTeamId =
      local_team === parseInt(winnerTeamId) ? visiting_team : local_team;

    // Update match status and observations
    const winnerTeam = teams.find((t) => t.id === parseInt(winnerTeamId));
    const loserTeam = teams.find((t) => t.id === parseInt(loserTeamId));

    match.status = 5;
    match.observations = `${winnerTeam.name} gana por walkover contra ${loserTeam.name}`;

    // Update scores
    if (winnerTeamId === local_team) {
      match.local_result = 3;
      match.visiting_result = 0;
    } else {
      match.local_result = 0;
      match.visiting_result = 3;
    }

    // Update classifications
    const winnerClassIndex = classifications.findIndex(
      (c) =>
        c.id_team === parseInt(winnerTeamId) &&
        c.id_tournament === id_tournament
    );
    const loserClassIndex = classifications.findIndex(
      (c) =>
        c.id_team === parseInt(loserTeamId) && c.id_tournament === id_tournament
    );

    if (winnerClassIndex !== -1) {
      const winnerClass = classifications[winnerClassIndex];
      winnerClass.points += 3;
      winnerClass.matches_played += 1;
      winnerClass.matches_won += 1;
      winnerClass.favor_goals += 3;
      winnerClass.goal_difference += 3;
    }

    if (loserClassIndex !== -1) {
      const loserClass = classifications[loserClassIndex];
      loserClass.matches_played += 1;
      loserClass.lost_matches += 1;
      loserClass.goals_against += 3;
      loserClass.goal_difference -= 3;
    }

    await Promise.all([
      writeJSONData(matchesPath, matches),
      writeJSONData(classificationsPath, classifications),
    ]);

    res.status(200).send({
      code: 200,
      message: "Match and classifications successfully updated",
      data: { match, classifications },
    });
  } catch (err) {
    console.error("Error in updateMatchStatus:", err);
    res.status(500).send("Server error");
  }
};

const cancelMatchDueToIncident = async (req, res) => {
  try {
    const { matchId, observation } = req.body;

    const [matches, classifications, teams] = await Promise.all([
      getJSONData(matchesPath),
      getJSONData(classificationsPath),
      getJSONData(teamsPath),
    ]);

    const matchIndex = matches.findIndex((m) => m.id === parseInt(matchId));
    if (matchIndex === -1) {
      return res.status(404).send("Match not found");
    }

    const match = matches[matchIndex];
    const { local_team, visiting_team, id_tournament } = match;

    // Update match status and observations
    const localTeam = teams.find((t) => t.id === local_team);
    const visitingTeam = teams.find((t) => t.id === visiting_team);

    match.status = 5;
    match.observations =
      observation ||
      `Partido anulado por peleas o problemas entre ${localTeam.name} y ${visitingTeam.name}`;

    // Update classifications
    const localClassIndex = classifications.findIndex(
      (c) => c.id_team === local_team && c.id_tournament === id_tournament
    );
    const visitingClassIndex = classifications.findIndex(
      (c) => c.id_team === visiting_team && c.id_tournament === id_tournament
    );

    if (localClassIndex !== -1) {
      const localClass = classifications[localClassIndex];
      localClass.matches_played += 1;
      localClass.lost_matches += 1;
      localClass.goals_against += 3;
      localClass.goal_difference -= 3;
    }

    if (visitingClassIndex !== -1) {
      const visitingClass = classifications[visitingClassIndex];
      visitingClass.matches_played += 1;
      visitingClass.lost_matches += 1;
      visitingClass.goals_against += 3;
      visitingClass.goal_difference -= 3;
    }

    await Promise.all([
      writeJSONData(matchesPath, matches),
      writeJSONData(classificationsPath, classifications),
    ]);

    res.status(200).send({
      code: 200,
      message: "Match and classifications successfully updated",
      data: { match, classifications },
    });
  } catch (err) {
    console.error("Error in cancelMatchDueToIncident:", err);
    res.status(500).send("Server error");
  }
};

const createTournamentMatches = async (req, res) => {
  try {
    const [tournaments, groups, teamsGroups, matches, teams, places] =
      await Promise.all([
        getJSONData(tournamentsPath),
        getJSONData(groupsPath),
        getJSONData(teamsGroupsPath),
        getJSONData(matchesPath),
        getJSONData(teamsPath),
        getJSONData(placesPath),
      ]);

    const { id_tournament } = req.body;

    const tournament = tournaments.find((t) => t.id === id_tournament);
    if (!tournament) {
      return res.status(404).send({
        code: 404,
        message: "Tournament not found",
      });
    }

    const tournamentGroups = groups.filter(
      (g) => g.id_tournament === id_tournament
    );
    const newMatches = [];
    let currentRound = 1;
    let currentDate = new Date();
    const hours = ["08:00", "10:00", "12:00", "14:00", "16:00", "18:00"]; // Specific times

    for (const group of tournamentGroups) {
      const groupTeams = teamsGroups
        .filter((tg) => tg.id_group === group.id)
        .map((tg) => teams.find((t) => t.id === tg.id_team));

      const n = groupTeams.length;
      const isOdd = n % 2 !== 0;
      const place = places[0]; // Use first place for now, adjust logic as needed
      let hourIndex = 0;

      // Si el número de equipos es impar, agregamos un "equipo fantasma" que representa la jornada de descanso
      if (isOdd) {
        groupTeams.push(null); // El equipo "null" indica un descanso
      }

      for (let i = 0; i < groupTeams.length - 1; i++) {
        for (let j = 0; j < groupTeams.length / 2; j++) {
          const home = groupTeams[j];
          const away = groupTeams[groupTeams.length - 1 - j];

          if (!home || !away) {
            // Si uno de los equipos es "null", indica un descanso
            const activeTeam = home || away;
            if (activeTeam) {
              newMatches.push({
                id: matches.length + newMatches.length + 1,
                id_tournament: id_tournament,
                round: currentRound,
                date: currentDate.toISOString().split("T")[0],
                hour_start: hours[hourIndex],
                place: place.id,
                local_team: activeTeam.id,
                visiting_team: null, // Indica un descanso
                local_result: 0,
                visiting_result: 0,
                status: 5,
                observations: "Descanso",
              });
            }
          } else {
            newMatches.push({
              id: matches.length + newMatches.length + 1,
              id_tournament: id_tournament,
              round: currentRound,
              date: currentDate.toISOString().split("T")[0],
              hour_start: hours[hourIndex],
              place: place.id,
              local_team: home.id,
              visiting_team: away.id,
              local_result: 0,
              visiting_result: 0,
              status: 1,
              observations: "",
            });
          }

          hourIndex++;
          if (hourIndex >= hours.length) {
            hourIndex = 0;
            currentDate = new Date(
              currentDate.getTime() + 2 * 24 * 60 * 60 * 1000
            ); // Move to the next available day
          }
        }

        // Rotate teams for next round (except the first team)
        const fixedTeam = groupTeams[0];
        const rotatingTeams = groupTeams.slice(1);
        rotatingTeams.push(rotatingTeams.shift());
        groupTeams.splice(1, rotatingTeams.length, ...rotatingTeams);

        currentRound++;
      }
    }

    // Save the new matches to the database
    matches.push(...newMatches);
    await writeJSONData(matchesPath, matches);

    res.status(200).send({
      code: 200,
      message: "Matches successfully created",
      data: newMatches,
    });
  } catch (err) {
    console.error("Error in createTournamentMatches:", err);
    res.status(500).send("Server error");
  }
};

const generateKnockoutMatches = async (req, res) => {
  try {
    const [classifications, teams, matches] = await Promise.all([
      getJSONData(classificationsPath),
      getJSONData(teamsPath),
      getJSONData(matchesPath),
    ]);

    const { id_tournament } = req.body;

    // Filtrar clasificaciones por torneo
    const tournamentClassifications = classifications.filter(
      (classification) => classification.id_tournament === id_tournament
    );

    // Agrupar por grupo
    const classificationsByGroup = tournamentClassifications.reduce(
      (acc, classification) => {
        if (!acc[classification.id_group]) {
          acc[classification.id_group] = [];
        }
        acc[classification.id_group].push(classification);
        return acc;
      },
      {}
    );

    // Ordenar cada grupo por puntos
    Object.keys(classificationsByGroup).forEach((groupId) => {
      classificationsByGroup[groupId].sort((a, b) => {
        if (b.points !== a.points) return b.points - a.points;
        if (b.goal_difference !== a.goal_difference)
          return b.goal_difference - a.goal_difference;
        if (b.favor_goals !== a.favor_goals)
          return b.favor_goals - a.favor_goals;
        return a.goals_against - b.goals_against;
      });
    });

    // Obtener los 5 mejores de cada grupo y el mejor sexto lugar
    const bestFirsts = [];
    const bestSeconds = [];
    const bestThirds = [];
    const bestFourth = [];
    const bestFifths = [];
    let bestSixth = null;

    Object.values(classificationsByGroup).forEach((group) => {
      bestFirsts.push(group[0]);
      bestSeconds.push(group[1]);
      bestThirds.push(group[2]);
      bestFourth.push(group[3]);
      bestFifths.push(group[4]);
      if (group[5]) {
        if (!bestSixth || group[5].points > bestSixth.points) {
          bestSixth = group[5];
        }
      }
    });

    // Ordenar los mejores primeros
    bestFirsts.sort((a, b) => {
      if (b.points !== a.points) return b.points - a.points;
      if (b.goal_difference !== a.goal_difference)
        return b.goal_difference - a.goal_difference;
      if (b.favor_goals !== a.favor_goals) return b.favor_goals - a.favor_goals;
      return a.goals_against - b.goals_against;
    });

    // Generar los partidos de octavos de final
    const knockoutMatches = [];

    // Octavos de final
    knockoutMatches.push({
      round: "Octavos de Final",
      match: "Partido 1",
      local_team: bestFirsts[0].id_team,
      visiting_team: bestSixth ? bestSixth.id_team : null,
    });

    knockoutMatches.push({
      round: "Octavos de Final",
      match: "Partido 2",
      local_team: bestFirsts[1].id_team,
      visiting_team: bestFifths[0].id_team,
    });

    knockoutMatches.push({
      round: "Octavos de Final",
      match: "Partido 3",
      local_team: bestFirsts[2].id_team,
      visiting_team: bestFifths[1].id_team,
    });

    knockoutMatches.push({
      round: "Octavos de Final",
      match: "Partido 4",
      local_team: bestSeconds[0].id_team,
      visiting_team: bestFifths[2].id_team,
    });

    knockoutMatches.push({
      round: "Octavos de Final",
      match: "Partido 5",
      local_team: bestSeconds[1].id_team,
      visiting_team: bestFourth[0].id_team,
    });

    knockoutMatches.push({
      round: "Octavos de Final",
      match: "Partido 6",
      local_team: bestSeconds[2].id_team,
      visiting_team: bestFourth[1].id_team,
    });

    knockoutMatches.push({
      round: "Octavos de Final",
      match: "Partido 7",
      local_team: bestThirds[0].id_team,
      visiting_team: bestFourth[2].id_team,
    });

    knockoutMatches.push({
      round: "Octavos de Final",
      match: "Partido 8",
      local_team: bestThirds[1].id_team,
      visiting_team: bestThirds[2].id_team,
    });

    // Cuartos de final
    knockoutMatches.push({
      round: "Cuartos de Final",
      match: "Partido A",
      local_team: "Ganador del Partido 1",
      visiting_team: "Ganador del Partido 8",
    });

    knockoutMatches.push({
      round: "Cuartos de Final",
      match: "Partido B",
      local_team: "Ganador del Partido 2",
      visiting_team: "Ganador del Partido 7",
    });

    knockoutMatches.push({
      round: "Cuartos de Final",
      match: "Partido C",
      local_team: "Ganador del Partido 3",
      visiting_team: "Ganador del Partido 6",
    });

    knockoutMatches.push({
      round: "Cuartos de Final",
      match: "Partido D",
      local_team: "Segundo del Grupo 4",
      visiting_team: "Ganador del Partido 5",
    });

    // Semifinales
    knockoutMatches.push({
      round: "Semifinal",
      match: "Partido E",
      local_team: "Ganador del Partido A",
      visiting_team: "Ganador del Partido D",
    });

    knockoutMatches.push({
      round: "Semifinal",
      match: "Partido F",
      local_team: "Ganador del Partido B",
      visiting_team: "Ganador del Partido C",
    });

    // Final
    knockoutMatches.push({
      round: "Final",
      match: "Partido Final",
      local_team: "Ganador del Partido E",
      visiting_team: "Ganador del Partido F",
    });

    // Añadir los partidos generados a la base de datos
    knockoutMatches.forEach((match, index) => {
      const newMatch = {
        id: matches.length + 1 + index,
        id_tournament,
        round: match.round,
        date: null, // Se pueden asignar fechas más tarde
        hour_start: null, // Se pueden asignar horas más tarde
        place: null, // Se pueden asignar lugares más tarde
        local_team: match.local_team,
        visiting_team: match.visiting_team,
        local_result: 0,
        visiting_result: 0,
        status: 1, // Estado inicial
        observations: "",
      };
      matches.push(newMatch);
    });

    await writeJSONData(matchesPath, matches);

    res.status(200).send({
      code: 200,
      message: "Knockout matches successfully generated",
      data: knockoutMatches,
    });
  } catch (err) {
    console.error("Error in generateKnockoutMatches:", err);
    res.status(500).send("Server error");
  }
};

const generateXLS = async (req, res) => {
  try {
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet("MARCADOR FINAL");

    // Agregar una imagen al workbook
    const imageId = workbook.addImage({
      filename: path.join(__dirname, "./assets/logo.png"),
      extension: "png",
    });

    // Insertar la imagen en la hoja de trabajo
    worksheet.addImage(imageId, {
      tl: { col: 1, row: 0 }, // Coordenadas (columna, fila) para la esquina superior izquierda
      ext: { width: 300, height: 150 }, // Ancho y alto de la imagen en píxeles
    });

    // Establecer estilos generales
    const headerFont = { bold: true, size: 11 };
    const bodyFont = { bold: false, size: 11 };
    const centerAlignment = { vertical: "middle", horizontal: "center" };
    const leftAlignment = { vertical: "middle", horizontal: "left" };
    worksheet.getColumn(3).width = 40;
    worksheet.getColumn(1).width = 1;
    worksheet.getColumn(2).width = 5;
    worksheet.getColumn(11).width = 40;
    worksheet.getColumn(10).width = 5;

    // Combinar celdas para crear el encabezado de la CATEGORIA O TORNEO
    worksheet.mergeCells("D2:N2");
    worksheet.getCell("D2").value = "CATEGORIA LIBRE METRO";
    worksheet.getCell("D2").font = { ...headerFont, color: "blue" };
    worksheet.getCell("D2").alignment = centerAlignment;

    // Combinar celdas para crear el encabezado de la FECHA
    worksheet.mergeCells("D4:E4");
    worksheet.getCell("D4").value = "FECHA:";
    worksheet.getCell("D4").font = bodyFont;
    worksheet.getCell("D4").alignment = centerAlignment;
    worksheet.getCell("D4:E4").border = {
      top: { style: "thin" },
      left: { style: "thin" },
      bottom: { style: "thin" },
      right: { style: "thin" },
    };

    worksheet.getCell("F4").value = "19";
    worksheet.getCell("F4").font = bodyFont;
    worksheet.getCell("F4").alignment = centerAlignment;
    worksheet.getCell("F4").border = {
      top: { style: "thin" },
      left: { style: "thin" },
      bottom: { style: "thin" },
      right: { style: "thin" },
    };

    worksheet.getCell("G4").value = "3";
    worksheet.getCell("G4").font = bodyFont;
    worksheet.getCell("G4").alignment = centerAlignment;
    worksheet.getCell("G4").border = {
      top: { style: "thin" },
      left: { style: "thin" },
      bottom: { style: "thin" },
      right: { style: "thin" },
    };

    worksheet.mergeCells("H4:I4");
    worksheet.getCell("H4").value = "2024";
    worksheet.getCell("H4").font = bodyFont;
    worksheet.getCell("H4").alignment = centerAlignment;
    worksheet.getCell("H4:I4").border = {
      top: { style: "thin" },
      left: { style: "thin" },
      bottom: { style: "thin" },
      right: { style: "thin" },
    };

    worksheet.mergeCells("D5:E5");
    worksheet.getCell("D5").value = "HORA:";
    worksheet.getCell("D5").font = bodyFont;
    worksheet.getCell("D5").alignment = centerAlignment;
    worksheet.getCell("D5:E5").border = {
      top: { style: "thin" },
      left: { style: "thin" },
      bottom: { style: "thin" },
      right: { style: "thin" },
    };

    worksheet.mergeCells("F5:I5");
    worksheet.getCell("F5").value = "8:00:00 PM";
    worksheet.getCell("F5").font = bodyFont;
    worksheet.getCell("F5").alignment = centerAlignment;
    worksheet.getCell("F5:I5").border = {
      top: { style: "thin" },
      left: { style: "thin" },
      bottom: { style: "thin" },
      right: { style: "thin" },
    };

    // Combinar celdas para crear el encabezado de la LUGAR
    worksheet.getCell("K4").value = "LUGAR:";
    worksheet.getCell("K4").font = bodyFont;
    worksheet.getCell("K4").alignment = centerAlignment;
    worksheet.getCell("K4").border = {
      top: { style: "thin" },
      left: { style: "thin" },
      bottom: { style: "thin" },
      right: { style: "thin" },
    };

    worksheet.mergeCells("L4:N4");
    worksheet.getCell("L4").value = "ULPIANO";
    worksheet.getCell("L4").font = bodyFont;
    worksheet.getCell("L4").alignment = centerAlignment;
    worksheet.getCell("L4:N4").border = {
      top: { style: "thin" },
      left: { style: "thin" },
      bottom: { style: "thin" },
      right: { style: "thin" },
    };

    worksheet.getCell("K5").value = "ARBITRAJE POR EQUIPO";
    worksheet.getCell("K5").font = bodyFont;
    worksheet.getCell("K5").alignment = centerAlignment;
    worksheet.getCell("K5").border = {
      top: { style: "thin" },
      left: { style: "thin" },
      bottom: { style: "thin" },
      right: { style: "thin" },
    };

    worksheet.mergeCells("L5:N5");
    worksheet.getCell("L5").value = "75000";
    worksheet.getCell("L5").font = { ...bodyFont, color: "red" };
    worksheet.getCell("L5").alignment = centerAlignment;
    worksheet.getCell("L5:N5").border = {
      top: { style: "thin" },
      left: { style: "thin" },
      bottom: { style: "thin" },
      right: { style: "thin" },
    };

    // Combinar celdas para crear el encabezado de la tabla
    worksheet.mergeCells("B9:C9");
    worksheet.getCell("B9").value = "MARCADOR FINAL";
    worksheet.getCell("B9").font = headerFont;
    worksheet.getCell("B9").alignment = centerAlignment;
    worksheet.getCell("B9:C9").border = {
      top: { style: "thin" },
      left: { style: "thin" },
      bottom: { style: "thin" },
      right: { style: "thin" },
    };

    worksheet.getCell("D9").value = "3";
    worksheet.getCell("D9").font = headerFont;
    worksheet.getCell("D9").alignment = centerAlignment;
    worksheet.getCell("D9").border = {
      top: { style: "thin" },
      left: { style: "thin" },
      bottom: { style: "thin" },
      right: { style: "thin" },
    };

    worksheet.getCell("E9").value = "VS";
    worksheet.getCell("E9").font = headerFont;
    worksheet.getCell("E9").alignment = centerAlignment;
    worksheet.getCell("E9").border = {
      top: { style: "thin" },
      left: { style: "thin" },
      bottom: { style: "thin" },
      right: { style: "thin" },
    };

    worksheet.getCell("F9").value = "4";
    worksheet.getCell("F9").font = headerFont;
    worksheet.getCell("F9").alignment = centerAlignment;
    worksheet.getCell("F9").border = {
      top: { style: "thin" },
      left: { style: "thin" },
      bottom: { style: "thin" },
      right: { style: "thin" },
    };

    worksheet.mergeCells("B11:C11");
    worksheet.getCell("B11").value = "EQUIPO";
    worksheet.getCell("B11").font = headerFont;
    worksheet.getCell("B11").alignment = centerAlignment;
    worksheet.getCell("B11:C11").border = {
      top: { style: "thin" },
      left: { style: "thin" },
      bottom: { style: "thin" },
      right: { style: "thin" },
    };

    worksheet.mergeCells("D11:E11");
    worksheet.getCell("D11").value = "SALDO";
    worksheet.getCell("D11").font = headerFont;
    worksheet.getCell("D11").alignment = centerAlignment;
    worksheet.getCell("D11:E11").border = {
      top: { style: "thin" },
      left: { style: "thin" },
      bottom: { style: "thin" },
      right: { style: "thin" },
    };

    worksheet.getCell("F11").value = "Total Goles";
    worksheet.getCell("F11").font = { ...headerFont, size: 9 };
    worksheet.getCell("F11").alignment = centerAlignment;
    worksheet.getCell("F11").border = {
      top: { style: "thin" },
      left: { style: "thin" },
      bottom: { style: "thin" },
      right: { style: "thin" },
    };

    worksheet.mergeCells("B12:C12");
    worksheet.getCell("B12").value = "METALICAS CALIDAD";
    worksheet.getCell("B12").font = bodyFont;
    worksheet.getCell("B12").alignment = centerAlignment;
    worksheet.getCell("B12:C12").border = {
      top: { style: "thin" },
      left: { style: "thin" },
      bottom: { style: "thin" },
      right: { style: "thin" },
    };

    worksheet.mergeCells("D12:E12");
    worksheet.getCell("D12").value = "33000";
    worksheet.getCell("D12").font = bodyFont;
    worksheet.getCell("D12").alignment = centerAlignment;
    worksheet.getCell("D12:E12").border = {
      top: { style: "thin" },
      left: { style: "thin" },
      bottom: { style: "thin" },
      right: { style: "thin" },
    };

    worksheet.getCell("F12").value = "";
    worksheet.getCell("F12").font = bodyFont;
    worksheet.getCell("F12").alignment = centerAlignment;
    worksheet.getCell("F12").border = {
      top: { style: "thin" },
      left: { style: "thin" },
      bottom: { style: "thin" },
      right: { style: "thin" },
    };

    worksheet.getCell("B13").value = "No.";
    worksheet.getCell("B13").font = headerFont;
    worksheet.getCell("B13").alignment = centerAlignment;
    worksheet.getCell("B13").border = {
      top: { style: "thin" },
      left: { style: "thin" },
      bottom: { style: "thin" },
      right: { style: "thin" },
    };

    worksheet.getCell("C13").value = "NOMBRES Y APELLIDOS";
    worksheet.getCell("C13").font = headerFont;
    worksheet.getCell("C13").alignment = centerAlignment;
    worksheet.getCell("C13").border = {
      top: { style: "thin" },
      left: { style: "thin" },
      bottom: { style: "thin" },
      right: { style: "thin" },
    };

    worksheet.getCell("D13").value = "No.";
    worksheet.getCell("D13").font = headerFont;
    worksheet.getCell("D13").alignment = centerAlignment;
    worksheet.getCell("D13").border = {
      top: { style: "thin" },
      left: { style: "thin" },
      bottom: { style: "thin" },
      right: { style: "thin" },
    };

    worksheet.getCell("E13").value = "GOL";
    worksheet.getCell("E13").font = headerFont;
    worksheet.getCell("E13").alignment = centerAlignment;
    worksheet.getCell("E13").border = {
      top: { style: "thin" },
      left: { style: "thin" },
      bottom: { style: "thin" },
      right: { style: "thin" },
    };

    worksheet.getCell("F13").value = "T";
    worksheet.getCell("F13").font = headerFont;
    worksheet.getCell("F13").alignment = centerAlignment;
    worksheet.getCell("F13").border = {
      top: { style: "thin" },
      left: { style: "thin" },
      bottom: { style: "thin" },
      right: { style: "thin" },
    };

    // Combinar celdas para crear el encabezado de la tabla
    worksheet.mergeCells("J9:N9");
    worksheet.getCell("J9").value = "DELEGADOS:";
    worksheet.getCell("J9").font = headerFont;
    worksheet.getCell("J9").alignment = centerAlignment;
    worksheet.getCell("J9:N9").border = {
      top: { style: "thin" },
      left: { style: "thin" },
      bottom: { style: "thin" },
      right: { style: "thin" },
    };

    worksheet.mergeCells("J11:K11");
    worksheet.getCell("J11").value = "EQUIPO";
    worksheet.getCell("J11").font = headerFont;
    worksheet.getCell("J11").alignment = centerAlignment;
    worksheet.getCell("J11:K11").border = {
      top: { style: "thin" },
      left: { style: "thin" },
      bottom: { style: "thin" },
      right: { style: "thin" },
    };

    worksheet.mergeCells("L11:M11");
    worksheet.getCell("L11").value = "SALDO";
    worksheet.getCell("L11").font = headerFont;
    worksheet.getCell("L11").alignment = centerAlignment;
    worksheet.getCell("L11:M11").border = {
      top: { style: "thin" },
      left: { style: "thin" },
      bottom: { style: "thin" },
      right: { style: "thin" },
    };

    worksheet.getCell("N11").value = "Total Goles";
    worksheet.getCell("N11").font = { ...headerFont, size: 9 };
    worksheet.getCell("N11").alignment = centerAlignment;
    worksheet.getCell("N11").border = {
      top: { style: "thin" },
      left: { style: "thin" },
      bottom: { style: "thin" },
      right: { style: "thin" },
    };

    worksheet.mergeCells("J12:K12");
    worksheet.getCell("J12").value = "METALICAS CALIDAD";
    worksheet.getCell("J12").font = bodyFont;
    worksheet.getCell("J12").alignment = centerAlignment;
    worksheet.getCell("J12:K12").border = {
      top: { style: "thin" },
      left: { style: "thin" },
      bottom: { style: "thin" },
      right: { style: "thin" },
    };

    worksheet.mergeCells("L12:M12");
    worksheet.getCell("L12").value = "33000";
    worksheet.getCell("L12").font = bodyFont;
    worksheet.getCell("L12").alignment = centerAlignment;
    worksheet.getCell("L12:M12").border = {
      top: { style: "thin" },
      left: { style: "thin" },
      bottom: { style: "thin" },
      right: { style: "thin" },
    };

    worksheet.getCell("N12").value = "";
    worksheet.getCell("N12").font = bodyFont;
    worksheet.getCell("N12").alignment = centerAlignment;
    worksheet.getCell("N12").border = {
      top: { style: "thin" },
      left: { style: "thin" },
      bottom: { style: "thin" },
      right: { style: "thin" },
    };

    worksheet.getCell("J13").value = "No.";
    worksheet.getCell("J13").font = headerFont;
    worksheet.getCell("J13").alignment = centerAlignment;
    worksheet.getCell("J13").border = {
      top: { style: "thin" },
      left: { style: "thin" },
      bottom: { style: "thin" },
      right: { style: "thin" },
    };

    worksheet.getCell("K13").value = "NOMBRES Y APELLIDOS";
    worksheet.getCell("K13").font = headerFont;
    worksheet.getCell("K13").alignment = centerAlignment;
    worksheet.getCell("K13").border = {
      top: { style: "thin" },
      left: { style: "thin" },
      bottom: { style: "thin" },
      right: { style: "thin" },
    };

    worksheet.getCell("L13").value = "No.";
    worksheet.getCell("L13").font = headerFont;
    worksheet.getCell("L13").alignment = centerAlignment;
    worksheet.getCell("L13").border = {
      top: { style: "thin" },
      left: { style: "thin" },
      bottom: { style: "thin" },
      right: { style: "thin" },
    };

    worksheet.getCell("M13").value = "GOL";
    worksheet.getCell("M13").font = headerFont;
    worksheet.getCell("M13").alignment = centerAlignment;
    worksheet.getCell("M13").border = {
      top: { style: "thin" },
      left: { style: "thin" },
      bottom: { style: "thin" },
      right: { style: "thin" },
    };

    worksheet.getCell("N13").value = "T";
    worksheet.getCell("N13").font = headerFont;
    worksheet.getCell("N13").alignment = centerAlignment;
    worksheet.getCell("N13").border = {
      top: { style: "thin" },
      left: { style: "thin" },
      bottom: { style: "thin" },
      right: { style: "thin" },
    };

    worksheet.mergeCells("B40:F40");
    worksheet.getCell("B40").value = "ARBITRO: ";
    worksheet.getCell("B40").font = bodyFont;
    worksheet.getCell("B40").alignment = centerAlignment;
    worksheet.getCell("B40:F40").border = {
      top: { style: "thin" },
      left: { style: "thin" },
      bottom: { style: "thin" },
      right: { style: "thin" },
    };

    // Datos de ejemplo
    // const players = [
    //   { number: 1, name: "ALEJAN VILLA" },
    //   { number: 2, name: "ARLEX FLORES" },
    //   { number: 3, name: "BAYRON URBANO" },
    //   { number: 4, name: "CARLOS RAMOS" },
    //   { number: 15, name: "JOSE OSPINA" },
    //   { number: 17, name: "KERYS OSPINA" },
    //   { number: 19, name: "MANUEL FLOREZ" },
    // ];

    // // Empezar a agregar los jugadores desde la fila 14
    // players.forEach((player, index) => {
    //   const row = worksheet.addRow({
    //     number: player.number,
    //     name: player.name,
    //     num2: "",
    //     gol: "",
    //     t: "",
    //   });

    //   // Establecer alineación para las celdas recién agregadas
    //   row.getCell("B").alignment = centerAlignment;
    //   row.getCell("C").alignment = centerAlignment;
    //   row.getCell("D").alignment = centerAlignment;
    //   row.getCell("E").alignment = centerAlignment;
    //   row.getCell("F").alignment = centerAlignment;

    //   // Aplicar bordes a las celdas recién agregadas
    //   row.eachCell({ includeEmpty: true }, (cell) => {
    //     cell.border = {
    //       top: { style: "thin" },
    //       left: { style: "thin" },
    //       bottom: { style: "thin" },
    //       right: { style: "thin" },
    //     };
    //   });
    // });

    worksheet.mergeCells("J40:N40");
    worksheet.getCell("J40").value = "PLANILLADOR: ";
    worksheet.getCell("J40").font = bodyFont;
    worksheet.getCell("J40").alignment = centerAlignment;
    worksheet.getCell("J40:N40").border = {
      top: { style: "thin" },
      left: { style: "thin" },
      bottom: { style: "thin" },
      right: { style: "thin" },
    };

    worksheet.mergeCells("B42:N42");
    worksheet.getCell("B42").value = "OBSERVACIONES:  ";
    worksheet.getCell("B42").font = bodyFont;
    worksheet.getCell("B42").alignment = leftAlignment;
    worksheet.getCell("B42:N42").border = {
      bottom: { style: "thin" },
    };

    worksheet.mergeCells("B43:N43");
    worksheet.getCell("B43").value = "";
    worksheet.getCell("B43").font = bodyFont;
    worksheet.getCell("B43").alignment = leftAlignment;
    worksheet.getCell("B43:N43").border = {
      bottom: { style: "thin" },
    };

    worksheet.mergeCells("B44:N44");
    worksheet.getCell("B44").value = "";
    worksheet.getCell("B44").font = bodyFont;
    worksheet.getCell("B44").alignment = leftAlignment;
    worksheet.getCell("B44:N44").border = {
      bottom: { style: "thin" },
    };

    // Generar el archivo Excel y enviarlo como respuesta
    res.setHeader(
      "Content-Type",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
    );
    res.setHeader(
      "Content-Disposition",
      "attachment; filename=MARCADOR_FINAL.xlsx"
    );

    await workbook.xlsx.write(res);
    res.end();
  } catch (err) {
    console.error("Error in generateKnockoutMatches:", err);
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
  updateMatchStatus,
  cancelMatchDueToIncident,
  createTournamentMatches,
  generateKnockoutMatches,
  generateXLS,
};
//(e.g.,  1 Programado, 4 En Curso, 5 Finalizado, 2 Cancelado, 3 Aplazado, 6 Walkover)
