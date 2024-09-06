const { ObjectId } = require("mongodb");
const { getDB } = require("../../config/db");

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
    const db = getDB();
    const { date } = req.query;
    const queryDate = date ? new Date(date) : new Date();
    const startDate = new Date(queryDate);
    startDate.setDate(queryDate.getDate() - 7);
    const endDate = new Date(queryDate);
    endDate.setDate(queryDate.getDate() + 7);

    const matches = await db
      .collection("matches")
      .find({
        date: { $gte: startDate, $lte: endDate },
      })
      .toArray();

    const fields = await db.collection("fields").find({}).toArray();
    const tournaments = await db.collection("tournaments").find({}).toArray();
    const teams = await db.collection("teams").find({}).toArray();

    const formattedMatches = {};

    const today = getColombianDate(new Date());
    const todayString = today.toISOString().split("T")[0];
    const yesterday = new Date(today);
    yesterday.setDate(today.getDate() - 1);
    const yesterdayString = yesterday.toISOString().split("T")[0];
    const tomorrow = new Date(today);
    tomorrow.setDate(today.getDate() + 1);
    const tomorrowString = tomorrow.toISOString().split("T")[0];

    // Generar llaves para cada día en el rango
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
          tournaments.find((t) => t._id.equals(match.id_tournament))?.name ||
          "Torneo desconocido";
        const place =
          fields.find((f) => f._id.equals(match.place))?.name ||
          "Lugar desconocido";
        const localTeam =
          teams.find((t) => t._id.equals(match.local_team))?.name ||
          "Equipo local desconocido";
        const visitingTeam =
          teams.find((t) => t._id.equals(match.visiting_team))?.name ||
          "Equipo visitante desconocido";

        let tournamentMatches = formattedMatches[formattedDate].find(
          (t) => t.tournament === tournament
        );
        if (!tournamentMatches) {
          tournamentMatches = { tournament: tournament, matches: [] };
          formattedMatches[formattedDate].push(tournamentMatches);
        }

        tournamentMatches.matches.push({
          _id: match._id,
          id_tournament: match.id_tournament,
          round: match.round || "Ronda desconocida",
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
      message: "Partidos obtenidos correctamente",
      data: formattedMatches,
    });
  } catch (err) {
    res.status(500).send("Error en el servidor");
  }
};

// Obtener un partido por _id
const getMatchByID = async (req, res) => {
  try {
    const db = getDB();
    const match = await db
      .collection("matches")
      .findOne({ _id: new ObjectId(req.params.id) });

    if (match) {
      res.status(200).send({
        code: 200,
        message: "Partido obtenido correctamente",
        data: match,
      });
    } else {
      res.status(404).send("Partido no encontrado");
    }
  } catch (err) {
    res.status(500).send("Error en el servidor");
  }
};

// Crear un nuevo partido
const createMatch = async (req, res) => {
  try {
    const db = getDB();
    const {
      local_team,
      visiting_team,
      id_tournament,
      date,
      hour_start,
      place,
    } = req.body;

    // Verificar si ya existe un partido entre los mismos equipos en el mismo torneo
    const existingMatchBetweenTeams = await db.collection("matches").findOne({
      $or: [
        { local_team, visiting_team, id_tournament },
        { local_team: visiting_team, visiting_team: local_team, id_tournament },
      ],
    });

    if (existingMatchBetweenTeams) {
      return res.status(400).send({
        code: 400,
        message: "Ya existe un partido entre estos equipos en el mismo torneo",
      });
    }

    // Verificar si ya existe un partido en la misma fecha, hora y cancha
    const existingMatchSameDateTimePlace = await db
      .collection("matches")
      .findOne({
        date,
        hour_start,
        place,
      });

    if (existingMatchSameDateTimePlace) {
      return res.status(400).send({
        code: 400,
        message: "Ya existe un partido en la misma fecha, hora y lugar",
      });
    }

    // Crear nuevo partido
    const newMatch = {
      local_team:  new ObjectId(local_team),
      visiting_team:  new ObjectId(visiting_team),
      id_tournament:  new ObjectId(id_tournament),
      date,
      hour_start,
      place:  new ObjectId(place),
      status: "66dab91fa45789574acff523", // Estado inicial: programado
      local_result: 0,
      visiting_result: 0,
      observations: "",
    };

    await db.collection("matches").insertOne(newMatch);

    res.status(200).send({
      code: 200,
      message: "Partido creado correctamente",
      data: newMatch,
    });
  } catch (err) {
    res.status(500).send("Error en el servidor");
  }
};

// Actualizar un partido por _id
const updateMatch = async (req, res) => {
  try {
    const db = getDB();
    const { id } = req.params;
    const updatedMatch = req.body;

    const result = await db
      .collection("matches")
      .updateOne({ _id: new ObjectId(id) }, { $set: updatedMatch });

    if (result.matchedCount === 0) {
      return res.status(404).send("Partido no encontrado");
    }

    res.status(200).send({
      code: 200,
      message: "Partido actualizado correctamente",
    });
  } catch (err) {
    res.status(500).send("Error en el servidor");
  }
};

// Eliminar un partido por _id
const deleteMatch = async (req, res) => {
  try {
    const db = getDB();
    const { id } = req.params;

    const result = await db
      .collection("matches")
      .deleteOne({ _id: new ObjectId(id) });

    if (result.deletedCount === 0) {
      return res.status(404).send("Partido no encontrado");
    }

    res.status(200).send({
      code: 200,
      message: "Partido eliminado correctamente",
    });
  } catch (err) {
    res.status(500).send("Error en el servidor");
  }
};

const getMatchData = async (req, res) => {
  try {
    const db = getDB();

    // Obtener los datos de las colecciones necesarias
    const [match, teams, players, events, matchPlayersNumbers] =
      await Promise.all([
        db.collection("matches").findOne({ _id:  new ObjectId(req.params.id) }),
        db.collection("teams").find().toArray(),
        db.collection("players").find().toArray(),
        db
          .collection("events")
          .find({ id_match:  new ObjectId(req.params.id) })
          .toArray(),
        db
          .collection("match_players_number")
          .find({ id_match:  new ObjectId(req.params.id) })
          .toArray(),
      ]);

    if (!match) {
      return res.status(404).send("Partido no encontrado");
    }

    const homeTeam = teams.find((t) =>
      t._id.equals(ObjectId(match.local_team))
    );
    const awayTeam = teams.find((t) =>
      t._id.equals(ObjectId(match.visiting_team))
    );

    if (!homeTeam || !awayTeam) {
      return res.status(404).send("Equipos no encontrados");
    }

    // Filtrar los jugadores de los equipos para el torneo correspondiente
    const homePlayers = players.filter(
      (p) =>
        p.id_team === homeTeam._id &&
        p.tournaments.includes(match.id_tournament)
    );
    const awayPlayers = players.filter(
      (p) =>
        p.id_team === awayTeam._id &&
        p.tournaments.includes(match.id_tournament)
    );

    // Obtener los eventos relacionados con el partido
    const matchEvents = events.map((e) => {
      const player = players.find((p) => p._id.equals(ObjectId(e.id_player)));
      return {
        id: e._id,
        player: player ? player.name : "Jugador desconocido",
        minute: `${e.minute}'`,
        team: homePlayers.find((p) => p._id.equals(ObjectId(e.id_player)))
          ? "home"
          : "away",
        type: e.id_event_type,
      };
    });

    // Crear un mapa de números de jugadores para el partido
    const matchPlayersNumbersMap = matchPlayersNumbers.reduce((acc, mpn) => {
      acc[mpn.id_player] = mpn.number;
      return acc;
    }, {});

    // Formatear los datos de los jugadores
    const formatPlayer = (player) => ({
      id: player._id,
      name: player.name,
      position: player.position,
      number: matchPlayersNumbersMap[player._id] || player.number,
      status: player.status,
    });

    // Formatear la fecha del partido
    const matchDate = new Date(match.date);
    const formattedDate = matchDate.toLocaleDateString("es-CO");

    // Crear la estructura final de los datos del partido
    const matchData = {
      homeTeam: {
        id: homeTeam._id,
        manager: homeTeam.manager_name,
        name: homeTeam.name,
        logo: homeTeam.logo,
        formation: "4-3-3", // Ejemplo de formación
        players: homePlayers.map(formatPlayer),
      },
      awayTeam: {
        id: awayTeam._id,
        manager: awayTeam.manager_name,
        name: awayTeam.name,
        logo: awayTeam.logo,
        formation: "4-3-3", // Ejemplo de formación
        players: awayPlayers.map(formatPlayer),
      },
      hour: match.hour_start,
      score: `${match.local_result} - ${match.visiting_result}`,
      date: formattedDate,
      status: match.status,
      events: matchEvents,
      observations: match.observations,
    };

    res.status(200).send({
      code: 200,
      message: "Datos del partido obtenidos exitosamente",
      data: matchData,
    });
  } catch (err) {
    console.error("Error en getMatchData:", err);
    res.status(500).send("Error del servidor");
  }
};

const updateMatchStatus = async (req, res) => {
  try {
    const { matchId, winnerTeamId } = req.body;

    const db = getDB();

    // Buscar el partido en la colección de partidos
    const match = await db
      .collection("matches")
      .findOne({ _id:  new ObjectId(matchId) });
    if (!match) {
      return res.status(404).send("Partido no encontrado");
    }

    const { local_team, visiting_team, id_tournament } = match;
    const loserTeamId = local_team.equals(ObjectId(winnerTeamId))
      ? visiting_team
      : local_team;

    // Obtener los equipos
    const winnerTeam = await db
      .collection("teams")
      .findOne({ _id:  new ObjectId(winnerTeamId) });
    const loserTeam = await db
      .collection("teams")
      .findOne({ _id:  new ObjectId(loserTeamId) });

    if (!winnerTeam || !loserTeam) {
      return res.status(404).send("Equipos no encontrados");
    }

    // Actualizar el estado del partido y observaciones
    match.status = 5;
    match.observations = `${winnerTeam.name} gana por walkover contra ${loserTeam.name}`;

    // Actualizar el resultado
    if (winnerTeamId === local_team.toString()) {
      match.local_result = 3;
      match.visiting_result = 0;
    } else {
      match.local_result = 0;
      match.visiting_result = 3;
    }

    // Actualizar la clasificación
    const winnerClass = await db.collection("classifications").findOne({
      id_team:  new ObjectId(winnerTeamId),
      id_tournament: id_tournament,
    });
    const loserClass = await db.collection("classifications").findOne({
      id_team:  new ObjectId(loserTeamId),
      id_tournament: id_tournament,
    });

    if (winnerClass) {
      await db.collection("classifications").updateOne(
        { _id: winnerClass._id },
        {
          $inc: {
            points: 3,
            matches_played: 1,
            matches_won: 1,
            favor_goals: 3,
            goal_difference: 3,
          },
        }
      );
    }

    if (loserClass) {
      await db.collection("classifications").updateOne(
        { _id: loserClass._id },
        {
          $inc: {
            matches_played: 1,
            lost_matches: 1,
            goals_against: 3,
            goal_difference: -3,
          },
        }
      );
    }

    // Guardar los cambios en el partido
    await db.collection("matches").updateOne(
      { _id:  new ObjectId(matchId) },
      {
        $set: {
          status: match.status,
          observations: match.observations,
          local_result: match.local_result,
          visiting_result: match.visiting_result,
        },
      }
    );

    res.status(200).send({
      code: 200,
      message: "Partido y clasificaciones actualizados exitosamente",
      data: { match, classifications: [winnerClass, loserClass] },
    });
  } catch (err) {
    console.error("Error en updateMatchStatus:", err);
    res.status(500).send("Error del servidor");
  }
};

const cancelMatchDueToIncident = async (req, res) => {
  try {
    const { matchId, observation } = req.body;
    const db = getDB();

    // Buscar el partido por su ID en la colección de partidos
    const match = await db
      .collection("matches")
      .findOne({ _id:  new ObjectId(matchId) });
    if (!match) {
      return res.status(404).send("Partido no encontrado");
    }

    const { local_team, visiting_team, id_tournament } = match;

    // Buscar los equipos
    const localTeam = await db
      .collection("teams")
      .findOne({ _id:  new ObjectId(local_team) });
    const visitingTeam = await db
      .collection("teams")
      .findOne({ _id:  new ObjectId(visiting_team) });

    if (!localTeam || !visitingTeam) {
      return res.status(404).send("Equipos no encontrados");
    }

    // Actualizar el estado del partido y las observaciones
    const newObservation =
      observation ||
      `Partido anulado por peleas o problemas entre ${localTeam.name} y ${visitingTeam.name}`;

    const updateMatch = await db.collection("matches").updateOne(
      { _id:  new ObjectId(matchId) },
      {
        $set: {
          status: 5,
          observations: newObservation,
        },
      }
    );

    // Actualizar las clasificaciones
    const localClassification = await db.collection("classifications").findOne({
      id_team:  new ObjectId(local_team),
      id_tournament:  new ObjectId(id_tournament),
    });
    const visitingClassification = await db
      .collection("classifications")
      .findOne({
        id_team:  new ObjectId(visiting_team),
        id_tournament:  new ObjectId(id_tournament),
      });

    if (localClassification) {
      await db.collection("classifications").updateOne(
        { _id: localClassification._id },
        {
          $inc: {
            matches_played: 1,
            lost_matches: 1,
            goals_against: 3,
            goal_difference: -3,
          },
        }
      );
    }

    if (visitingClassification) {
      await db.collection("classifications").updateOne(
        { _id: visitingClassification._id },
        {
          $inc: {
            matches_played: 1,
            lost_matches: 1,
            goals_against: 3,
            goal_difference: -3,
          },
        }
      );
    }

    res.status(200).send({
      code: 200,
      message: "Partido y clasificaciones actualizados correctamente",
      data: { matchId, local_team, visiting_team },
    });
  } catch (err) {
    console.error("Error en cancelMatchDueToIncident:", err);
    res.status(500).send("Error del servidor");
  }
};

const createTournamentMatches = async (req, res) => {
  try {
    const db = getDB();

    const { id_tournament } = req.body;

    // Buscar el torneo
    const tournament = await db
      .collection("tournaments")
      .findOne({ _id:  new ObjectId(id_tournament) });
    if (!tournament) {
      return res.status(404).send({
        code: 404,
        message: "Torneo no encontrado",
      });
    }

    // Buscar los grupos del torneo
    const tournamentGroups = await db
      .collection("groups")
      .find({ id_tournament:  new ObjectId(id_tournament) })
      .toArray();

    const newMatches = [];

    for (const group of tournamentGroups) {
      // Buscar equipos en el grupo
      const groupTeamsIds = await db
        .collection("teams_groups")
        .find({ id_group: group._id })
        .toArray();
      const groupTeams = await db
        .collection("teams")
        .find({ _id: { $in: groupTeamsIds.map((tg) => tg.id_team) } })
        .toArray();

      const n = groupTeams.length;
      const isOdd = n % 2 !== 0;

      // Si el número de equipos es impar, agregar un "equipo fantasma" que representa la jornada de descanso
      if (isOdd) {
        groupTeams.push(null);
      }

      let currentRound = 1;

      for (let i = 0; i < groupTeams.length - 1; i++) {
        const roundMatches = [];
        for (let j = 0; j < groupTeams.length / 2; j++) {
          const home = groupTeams[j];
          const away = groupTeams[groupTeams.length - 1 - j];

          if (!home || !away) {
            // Si uno de los equipos es "null", indica un descanso
            const activeTeam = home || away;
            if (activeTeam) {
              roundMatches.push({
                id_tournament:  new ObjectId(id_tournament),
                id_group:  new ObjectId(group._id),
                round: currentRound,
                date: null, // Fecha no asignada aún
                hour_start: null, // Hora no asignada aún
                place: null, // Lugar no asignado aún
                local_team: activeTeam._id,
                visiting_team: null, // Indica un descanso
                local_result: 0,
                visiting_result: 0,
                status: "66dab91fa45789574acff525",
                observations: "Descanso",
              });
            }
          } else {
            roundMatches.push({
              id_tournament:  new ObjectId(id_tournament),
              id_group:  new ObjectId(group._id),
              round: currentRound,
              date: null, // Fecha no asignada aún
              hour_start: null, // Hora no asignada aún
              place: null, // Lugar no asignado aún
              local_team: home._id,
              visiting_team: away._id,
              local_result: 0,
              visiting_result: 0,
              status: "66dab91fa45789574acff523",
              observations: "",
            });
          }
        }

        newMatches.push(...roundMatches);

        const rotatingTeams = groupTeams.slice(1);
        rotatingTeams.push(rotatingTeams.shift());
        groupTeams.splice(1, rotatingTeams.length, ...rotatingTeams);

        currentRound++;
      }
    }

    // Guardar los nuevos partidos en la base de datos
    await db.collection("matches").insertMany(newMatches);

    res.status(200).send({
      code: 200,
      message: "Partidos creados exitosamente",
      data: newMatches,
    });
  } catch (err) {
    console.error("Error en createTournamentMatches:", err);
    res.status(500).send("Error del servidor");
  }
};

const generateKnockoutMatches = async (req, res) => {
  try {
    const db = getDB();
    const { id_tournament } = req.body;

    // Filtrar clasificaciones por torneo
    const tournamentClassifications = await db
      .collection("classifications")
      .find({ id_tournament:  new ObjectId(id_tournament) })
      .toArray();

    if (tournamentClassifications.length === 0) {
      return res.status(404).send({
        code: 404,
        message: "No se encontraron clasificaciones para este torneo",
      });
    }

    // Agrupar clasificaciones por grupo
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
    const newMatches = knockoutMatches.map((match) => ({
      id_tournament:  new ObjectId(id_tournament),
      round: match.round,
      date: null, // Se pueden asignar fechas más tarde
      hour_start: null, // Se pueden asignar horas más tarde
      place: null, // Se pueden asignar lugares más tarde
      local_team: match.local_team ? ObjectId(match.local_team) : null,
      visiting_team: match.visiting_team ? ObjectId(match.visiting_team) : null,
      local_result: 0,
      visiting_result: 0,
      status: 1, // Estado inicial
      observations: "",
    }));

    await db.collection("matches").insertMany(newMatches);

    res.status(200).send({
      code: 200,
      message: "Partidos de eliminación directa generados con éxito",
      data: knockoutMatches,
    });
  } catch (err) {
    console.error("Error en generateKnockoutMatches:", err);
    res.status(500).send("Error del servidor");
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
