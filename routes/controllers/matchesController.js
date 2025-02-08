const { getDB } = require("../../config/db");
const ExcelJS = require("exceljs");
const path = require("path");

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

    const filter = req.user.role === 1 ? {} : { delegates: req.user.id };

    const matches = await db.collection("matches").find(filter).toArray();
    const fields = await db.collection("fields").find().toArray();
    const tournaments = await db.collection("tournaments").find().toArray();
    const teams = await db.collection("teams").find().toArray();

    const formattedMatches = {};

    const today = getColombianDate(new Date());
    const todayString = today.toISOString().split("T")[0];
    const yesterday = new Date(today);
    yesterday.setDate(today.getDate() - 1);
    const yesterdayString = yesterday.toISOString().split("T")[0];
    const tomorrow = new Date(today);
    tomorrow.setDate(today.getDate() + 1);
    const tomorrowString = tomorrow.toISOString().split("T")[0];

    // Generar claves para cada día en el rango
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
      if (!match.date) {
        return; // Omitir este partido si no tiene fecha
      }

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
          "Torneo Desconocido";
        const place =
          fields.find((f) => f.id === match.place)?.name || "Lugar Desconocido";
        const localTeam =
          teams.find((t) => t.id === match.local_team)?.name ||
          "Equipo Desconocido";
        const visitingTeam =
          teams.find((t) => t.id === match.visiting_team)?.name ||
          "Equipo Desconocido";

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
          round: match.round || "Ronda Desconocida",
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
      message: "Partidos obtenidos con éxito",
      data: formattedMatches,
    });
  } catch (err) {
    res.status(500).send("Error en el servidor");
  }
};

// Obtener un partido por ID
const getMatchByID = async (req, res) => {
  try {
    const db = getDB();
    const match = await db
      .collection("matches")
      .findOne({ id: parseInt(req.params.id) });

    if (match) {
      res.status(200).send({
        code: 200,
        message: "Partido obtenido con éxito",
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

    const hourStart = new Date(`${date}T${hour_start}:00Z`).getTime();
    const twoHoursInMillis = 2 * 60 * 60 * 1000;

    const existingMatchWithinTwoHours = await db.collection("matches").findOne({
      date,
      place,
      hour_start: {
        $gte: new Date(hourStart - twoHoursInMillis),
        $lte: new Date(hourStart + twoHoursInMillis),
      },
    });

    if (existingMatchWithinTwoHours) {
      return res.status(400).send({
        code: 400,
        message:
          "No se puede crear un partido en el mismo lugar y fecha dentro de las 2 horas siguientes a otro partido",
      });
    }

    // Obtener el último ID y generar uno nuevo
    const lastID = await db
      .collection("matches")
      .findOne({}, { sort: { id: -1 } });
    const newId = lastID ? lastID.id + 1 : 1;

    const newMatch = {
      id: newId,
      type: "Eliminatorias",
      ...req.body,
    };
    await db.collection("matches").insertOne(newMatch);

    res.status(200).send({
      code: 200,
      message: "Partido creado con éxito",
      data: newMatch,
    });
  } catch (err) {
    res.status(500).send("Error en el servidor");
  }
};

// Actualizar un partido por ID
const updateMatch = async (req, res) => {
  try {
    const db = getDB();
    const matchId = parseInt(req.params.id);

    // Excluir el campo _id de los datos que se actualizan
    const updatedMatchClass = { ...req.body };

    // Remover el campo _id de ambas clases
    delete updatedMatchClass._id;

    const updatedMatch = await db
      .collection("matches")
      .findOneAndUpdate(
        { id: matchId },
        { $set: updatedMatchClass },
        { returnOriginal: false }
      );

    // Log para verificar si se encontró el partido
    if (!updatedMatch) {
      return res.status(404).send("Partido no encontrado");
    }

    res.status(200).send({
      code: 200,
      message: "Partido actualizado exitosamente",
      data: updatedMatch,
    });
  } catch (err) {
    // Log del error
    res.status(500).send("Error en el servidor");
  }
};

// Eliminar un partido por ID
const deleteMatch = async (req, res) => {
  try {
    const db = getDB();
    const deletedMatch = await db
      .collection("matches")
      .findOneAndDelete({ id: parseInt(req.params.id) });

    if (deletedMatch) {
      res.status(200).send({
        code: 200,
        message: "Partido eliminado con éxito",
        data: deletedMatch,
      });
    } else {
      res.status(404).send("Partido no encontrado");
    }
  } catch (err) {
    res.status(500).send("Error en el servidor");
  }
};

const updateMatchStatus = async (req, res) => {
  try {
    const { matchId, winnerTeamId } = req.body;

    const db = getDB();
    const [match, classifications] = await Promise.all([
      db.collection("matches").findOne({ id: parseInt(matchId) }),
      db.collection("classifications").find().toArray(),
    ]);

    if (!match) {
      return res.status(404).send("Partido no encontrado");
    }

    const { local_team, visiting_team, id_tournament } = match;
    const loserTeamId =
      local_team === parseInt(winnerTeamId) ? visiting_team : local_team;

    const winnerTeam = await db
      .collection("teams")
      .findOne({ id: parseInt(winnerTeamId) });
    const loserTeam = await db
      .collection("teams")
      .findOne({ id: parseInt(loserTeamId) });

    if (!winnerTeam || !loserTeam) {
      return res.status(404).send("Equipos no encontrados");
    }

    match.status = 5;
    match.observations = `${winnerTeam.name} gana por walkover contra ${loserTeam.name}`;

    if (winnerTeamId === local_team) {
      match.local_result = 3;
      match.visiting_result = 0;
    } else {
      match.local_result = 0;
      match.visiting_result = 3;
    }

    await db
      .collection("matches")
      .updateOne({ id: parseInt(matchId) }, { $set: { ...match } });

    const winnerClass = classifications.find(
      (c) =>
        c.id_team === parseInt(winnerTeamId) &&
        c.id_tournament === id_tournament
    );
    const loserClass = classifications.find(
      (c) =>
        c.id_team === parseInt(loserTeamId) && c.id_tournament === id_tournament
    );

    if (winnerClass) {
      winnerClass.points += 3;
      winnerClass.matches_played += 1;
      winnerClass.matches_won += 1;
      winnerClass.favor_goals += 3;
      winnerClass.goal_difference += 3;
    }

    if (loserClass) {
      loserClass.matches_played += 1;
      loserClass.lost_matches += 1;
      loserClass.goals_against += 3;
      loserClass.goal_difference -= 3;
    }

    // Excluir el campo _id de los datos que se actualizan
    const updatedWinnerClass = { ...winnerClass };
    const updatedLoserClass = { ...loserClass };

    // Remover el campo _id de ambas clases
    delete updatedWinnerClass._id;
    delete updatedLoserClass._id;

    // Actualizar las clasificaciones en la base de datos
    await Promise.all([
      db
        .collection("classifications")
        .updateOne(
          { id_team: parseInt(winnerTeamId), id_tournament },
          { $set: updatedWinnerClass }
        ),
      db
        .collection("classifications")
        .updateOne(
          { id_team: parseInt(loserTeamId), id_tournament },
          { $set: updatedLoserClass }
        ),
    ]);

    res.status(200).send({
      code: 200,
      message: "Partido y clasificaciones actualizadas con éxito",
      data: { match, classifications },
    });
  } catch (err) {
    res.status(500).send("Error en el servidor");
  }
};

const cancelMatchDueToIncident = async (req, res) => {
  try {
    const db = getDB();
    const { matchId, observation } = req.body;

    const match = await db
      .collection("matches")
      .findOne({ id: parseInt(matchId) });
    if (!match) {
      return res.status(404).send("Partido no encontrado");
    }

    const { local_team, visiting_team, id_tournament } = match;

    const localTeam = await db.collection("teams").findOne({ id: local_team });
    const visitingTeam = await db
      .collection("teams")
      .findOne({ id: visiting_team });

    // Actualizar el estado del partido y las observaciones
    match.status = 5;
    match.observations =
      observation ||
      `Partido anulado por incidentes entre ${localTeam.name} y ${visitingTeam.name}`;

    // Actualizar el partido en la base de datos
    await db
      .collection("matches")
      .updateOne({ id: parseInt(matchId) }, { $set: { ...match } });

    // Actualizar las clasificaciones de ambos equipos
    await db.collection("classifications").updateMany(
      { id_team: { $in: [local_team, visiting_team] }, id_tournament },
      {
        $inc: {
          matches_played: 1,
          lost_matches: 1,
          goals_against: 3,
          goal_difference: -3,
        },
      }
    );

    res.status(200).send({
      code: 200,
      message: "Partido y clasificaciones actualizadas con éxito",
      data: match,
    });
  } catch (err) {
    res.status(500).send("Error en el servidor");
  }
};

const createTournamentMatches = async (req, res) => {
  try {
    const db = getDB();
    const { id_tournament } = req.body;

    // Buscar el torneo
    const tournament = await db
      .collection("tournaments")
      .findOne({ id: id_tournament });
    if (!tournament) {
      return res
        .status(404)
        .send({ code: 404, message: "Torneo no encontrado" });
    }

    // Obtener los grupos del torneo
    const tournamentGroups = await db
      .collection("groups")
      .find({ id_tournament })
      .toArray();

    // Obtener los equipos por grupo
    const teamsGroups = await db
      .collection("teams_groups")
      .find({ id_group: { $in: tournamentGroups.map((g) => g.id) } })
      .toArray();

    // Obtener los grupos del torneo
    const tournamentMatches = await db
      .collection("matches")
      .find({ id_tournament })
      .toArray();

    // Obtener todos los equipos
    const teams = await db.collection("teams").find().toArray();

    // Inicializar array para los nuevos partidos
    const newMatches = [];

    // Obtener el último ID y generar uno nuevo
    const lastID = await db
      .collection("matches")
      .findOne({}, { sort: { id: -1 } });
    let newId = lastID ? lastID.id + 1 : 1;

    for (const group of tournamentGroups) {
      // Equipos pertenecientes al grupo actual
      const groupTeams = teamsGroups
        .filter((tg) => tg.id_group === group.id)
        .map((tg) => teams.find((t) => t.id === tg.id_team));

      // Verificar si hay al menos dos equipos para generar partidos
      if (groupTeams.length < 2) {
        return res.status(400).send({
          code: 400,
          message: `No hay suficientes equipos en el grupo ${group.name} para generar partidos. Se necesitan al menos 2 equipos.`,
        });
      }

      const n = groupTeams.length;
      const isOdd = n % 2 !== 0;
      if (isOdd) groupTeams.push(null); // Si el número de equipos es impar, se añade un equipo ficticio (null)

      let currentRound = 1;

      // Generar las rondas
      for (let i = 0; i < groupTeams.length - 1; i++) {
        const roundMatches = [];
        for (let j = 0; j < groupTeams.length / 2; j++) {
          const home = groupTeams[j];
          const away = groupTeams[groupTeams.length - 1 - j];

          // Validar que no se repita el partido entre los mismos equipos en este torneo
          const existingMatchBetweenTeams = tournamentMatches.find(
            (match) =>
              (match.local_team === home?.id &&
                match.visiting_team === away?.id) ||
              (match.local_team === away?.id &&
                match.visiting_team === home?.id)
          );

          if (existingMatchBetweenTeams) {
            console.log(
              `Ya existe un partido entre ${home?.name} y ${away?.name}, se omite la creación del partido.`
            );
            continue; // No agregar este partido
          }

          if (!home || !away) {
            const activeTeam = home || away;
            if (activeTeam) {
              roundMatches.push({
                id: newId++,
                id_tournament,
                id_group: group.id,
                round: currentRound,
                type: "Eliminatorias",
                local_team: activeTeam.id,
                visiting_team: null,
                status: 5,
                date: "",
                hour_start: "",
                place: 0,
                team_refereeing: 0,
                delegates: "",
                local_result: 0,
                visiting_result: 0,
                referee: "",
                id_planner: 0,
                observations: "Descanso",
              });
            }
          } else {
            roundMatches.push({
              id: newId++,
              id_tournament,
              id_group: group.id,
              round: currentRound,
              type: "Eliminatorias",
              local_team: home.id,
              visiting_team: away.id,
              status: 1,
              date: "",
              hour_start: "",
              place: 0,
              team_refereeing: 0,
              delegates: "",
              local_result: 0,
              visiting_result: 0,
              referee: "",
              id_planner: 0,
              observations: "",
            });
          }
        }

        // Añadir partidos si pasaron las validaciones
        newMatches.push(...roundMatches);

        // Rotar equipos para la siguiente ronda
        const rotatingTeams = groupTeams.slice(1);
        rotatingTeams.push(rotatingTeams.shift());
        groupTeams.splice(1, rotatingTeams.length, ...rotatingTeams);

        currentRound++;
      }
    }

    // Verificar si se crearon partidos
    if (newMatches.length === 0) {
      return res.status(400).send({
        code: 400,
        message: "Ya se han generado todos los partidos del torneo.",
      });
    }

    // Insertar los nuevos partidos generados
    await db.collection("matches").insertMany(newMatches);

    res.status(200).send({
      code: 200,
      message: "Partidos creados con éxito",
      data: newMatches,
    });
  } catch (err) {
    console.error("Error en el servidor:", err);
    res.status(500).send("Error en el servidor");
  }
};

// const generateKnockoutMatches = async (req, res) => {
//   try {
//     const db = getDB();
//     const { id_tournament } = req.body;

//     // Obtener partidos de eliminatoria por torneo
//     const matches = await db
//       .collection("matches")
//       .find({ id_tournament })
//       .toArray();

//     // Deduce the current phase based on existing matches
//     let phase = "";

//     // Verificar si existen partidos de Octavos de Final
//     const octavosMatches = matches.filter(
//       (match) => match.type === "Octavos de Final"
//     );
//     if (octavosMatches.length === 0) {
//       phase = "Octavos de Final";
//     } else {
//       // Verificar si los partidos de Octavos de Final ya han terminado
//       const unfinishedOctavos = octavosMatches.filter(
//         (match) => match.status === 1
//       );
//       if (unfinishedOctavos.length > 0) {
//         return res.status(400).send({
//           code: 400,
//           message:
//             "No se pueden generar Cuartos de Final, aún hay partidos de Octavos de Final sin jugar.",
//           unfinishedMatches: unfinishedOctavos,
//         });
//       }

//       // Verificar si existen partidos de Cuartos de Final
//       const cuartosMatches = matches.filter(
//         (match) => match.type === "Cuartos de Final"
//       );
//       if (cuartosMatches.length === 0) {
//         phase = "Cuartos de Final";
//       } else {
//         // Verificar si los partidos de Cuartos de Final ya han terminado
//         const unfinishedCuartos = cuartosMatches.filter(
//           (match) => match.status === 1
//         );
//         if (unfinishedCuartos.length > 0) {
//           return res.status(400).send({
//             code: 400,
//             message:
//               "No se pueden generar Semifinales, aún hay partidos de Cuartos de Final sin jugar.",
//             unfinishedMatches: unfinishedCuartos,
//           });
//         }

//         // Verificar si existen partidos de Semifinales
//         const semifinalMatches = matches.filter(
//           (match) => match.type === "Semifinal"
//         );
//         if (semifinalMatches.length === 0) {
//           phase = "Semifinal";
//         } else {
//           // Verificar si los partidos de Semifinal ya han terminado
//           const unfinishedSemifinal = semifinalMatches.filter(
//             (match) => match.status === 1
//           );
//           if (unfinishedSemifinal.length > 0) {
//             return res.status(400).send({
//               code: 400,
//               message:
//                 "No se puede generar la Final, aún hay partidos de Semifinales sin jugar.",
//               unfinishedMatches: unfinishedSemifinal,
//             });
//           }

//           // Si todos los partidos anteriores están completados, generamos la Final
//           phase = "Final";
//         }
//       }
//     }

//     // Obtener el último ID y generar uno nuevo
//     const lastID = await db
//       .collection("matches")
//       .findOne({}, { sort: { id: -1 } });
//     let newId = lastID ? lastID.id + 1 : 1;

//     let knockoutMatches = [];
//     if (phase === "Octavos de Final") {
//       // Generar los partidos de Octavos de Final (igual que antes)
//       const classifications = await db
//         .collection("classifications")
//         .find({ id_tournament })
//         .toArray();

//       // Filtrar clasificaciones por torneo
//       const tournamentClassifications = classifications.filter(
//         (classification) => classification.id_tournament === id_tournament
//       );

//       // Agrupar por grupo
//       const classificationsByGroup = tournamentClassifications.reduce(
//         (acc, classification) => {
//           if (!acc[classification.id_group]) {
//             acc[classification.id_group] = [];
//           }
//           acc[classification.id_group].push(classification);
//           return acc;
//         },
//         {}
//       );

//       // Ordenar cada grupo por puntos
//       Object.values(classificationsByGroup).forEach((group) => {
//         group.sort((a, b) => {
//           if (b.points !== a.points) return b.points - a.points;
//           if (b.goal_difference !== a.goal_difference)
//             return b.goal_difference - a.goal_difference;
//           if (b.favor_goals !== a.favor_goals)
//             return b.favor_goals - a.favor_goals;
//           return a.goals_against - b.goals_against;
//         });
//       });

//       // Obtener los mejores equipos para Octavos
//       const bestFirsts = [];
//       const bestSeconds = [];
//       const bestThirds = [];
//       const bestFourth = [];
//       const bestFifths = [];
//       let bestSixth = null;

//       Object.values(classificationsByGroup).forEach((group) => {
//         bestFirsts.push(group[0]);
//         bestSeconds.push(group[1]);
//         bestThirds.push(group[2]);
//         bestFourth.push(group[3]);
//         bestFifths.push(group[4]);
//         if (group[5] && (!bestSixth || group[5].points > bestSixth.points)) {
//           bestSixth = group[5];
//         }
//       });

//       // Ordenar los mejores primeros
//       bestFirsts.sort((a, b) => {
//         if (b.points !== a.points) return b.points - a.points;
//         if (b.goal_difference !== a.goal_difference)
//           return b.goal_difference - a.goal_difference;
//         if (b.favor_goals !== a.favor_goals)
//           return b.favor_goals - a.favor_goals;
//         return a.goals_against - b.goals_against;
//       });

//       // Crear partidos de Octavos de Final
//       knockoutMatches = [
//         {
//           round: "Partido 1",
//           type: "Octavos de Final",
//           local_team: bestFirsts[0].id_team,
//           visiting_team: bestSixth?.id_team || null,
//         },
//         {
//           round: "Partido 2",
//           type: "Octavos de Final",
//           local_team: bestFirsts[1].id_team,
//           visiting_team: bestFifths[0].id_team,
//         },
//         {
//           round: "Partido 3",
//           type: "Octavos de Final",
//           local_team: bestFirsts[2].id_team,
//           visiting_team: bestFifths[1].id_team,
//         },
//         {
//           round: "Partido 4",
//           type: "Octavos de Final",
//           local_team: bestSeconds[0].id_team,
//           visiting_team: bestFifths[2].id_team,
//         },
//         {
//           round: "Partido 5",
//           type: "Octavos de Final",
//           local_team: bestSeconds[1].id_team,
//           visiting_team: bestFourth[0].id_team,
//         },
//         {
//           round: "Partido 6",
//           type: "Octavos de Final",
//           local_team: bestSeconds[2].id_team,
//           visiting_team: bestFourth[1].id_team,
//         },
//         {
//           round: "Partido 7",
//           type: "Octavos de Final",
//           local_team: bestThirds[0].id_team,
//           visiting_team: bestFourth[2].id_team,
//         },
//         {
//           round: "Partido 8",
//           type: "Octavos de Final",
//           local_team: bestThirds[1].id_team,
//           visiting_team: bestThirds[2].id_team,
//         },
//       ];
//     } else if (phase === "Cuartos de Final") {
//       // Crear partidos de Cuartos de Final utilizando los ganadores de Octavos
//       const winners = octavosMatches.map((match) =>
//         match.local_result > match.visiting_result
//           ? match.local_team
//           : match.visiting_team
//       );

//       knockoutMatches = [
//         {
//           round: "Partido A",
//           type: "Cuartos de Final",
//           local_team: winners[0], // Ganador del Partido 1
//           visiting_team: winners[7], // Ganador del Partido 8
//         },
//         {
//           round: "Partido B",
//           type: "Cuartos de Final",
//           local_team: winners[1], // Ganador del Partido 2
//           visiting_team: winners[6], // Ganador del Partido 7
//         },
//         {
//           round: "Partido C",
//           type: "Cuartos de Final",
//           local_team: winners[2], // Ganador del Partido 3
//           visiting_team: winners[5], // Ganador del Partido 6
//         },
//         {
//           round: "Partido D",
//           type: "Cuartos de Final",
//           local_team: winners[3], // Ganador del Partido 4
//           visiting_team: winners[4], // Ganador del Partido 5
//         },
//       ];
//     } else if (phase === "Semifinal") {
//       // Crear partidos de Semifinal utilizando los ganadores de Cuartos de Final
//       const winners = cuartosMatches.map((match) =>
//         match.local_result > match.visiting_result
//           ? match.local_team
//           : match.visiting_team
//       );

//       knockoutMatches = [
//         {
//           round: "Semifinal 1",
//           type: "Semifinal",
//           local_team: winners[0], // Ganador del Partido A
//           visiting_team: winners[3], // Ganador del Partido D
//         },
//         {
//           round: "Semifinal 2",
//           type: "Semifinal",
//           local_team: winners[1], // Ganador del Partido B
//           visiting_team: winners[2], // Ganador del Partido C
//         },
//       ];
//     } else if (phase === "Final") {
//       // Crear partido de la Final utilizando los ganadores de las Semifinales
//       const winners = semifinalMatches.map((match) =>
//         match.local_result > match.visiting_result
//           ? match.local_team
//           : match.visiting_team
//       );

//       knockoutMatches = [
//         {
//           round: "Final",
//           type: "Final",
//           local_team: winners[0], // Ganador de Semifinal 1
//           visiting_team: winners[1], // Ganador de Semifinal 2
//         },
//       ];
//     }

//     // Crear partidos
//     const newMatches = knockoutMatches.map((match, index) => ({
//       id: newId + 1 + index,
//       id_tournament,
//       ...match,
//       status: 1,
//       date: "",
//       hour_start: "",
//       place: 0,
//       team_refereeing: 0,
//       delegates: "",
//       local_result: 0,
//       visiting_result: 0,
//       referee: "",
//       id_planner: 0,
//       observations: "",
//     }));

//     // Insertar los nuevos partidos generados
//     await db.collection("matches").insertMany(newMatches);

//     res.status(200).send({
//       code: 200,
//       message: `Partidos de ${phase} generados con éxito`,
//       data: newMatches,
//     });
//   } catch (err) {
//     console.error("Error en el servidor:", err);
//     res.status(500).send("Error en el servidor");
//   }
// };

// const generateKnockoutMatches = async (req, res) => {
//   try {
//     const db = getDB();
//     const { id_tournament } = req.body;

//     // Obtener información del torneo para verificar el nivel de clasificación
//     const tournament = await db
//       .collection("tournaments")
//       .findOne({ id: id_tournament });

//     if (!tournament) {
//       return res.status(404).send({
//         code: 404,
//         message: "Torneo no encontrado",
//       });
//     }

//     const { classification } = tournament;

//     // Determinar la fase inicial según el nivel de clasificación
//     const phaseMapping = {
//       1: "Final",
//       2: "Semifinal",
//       3: "Cuartos de Final",
//       4: "Octavos de Final",
//       5: "Dieciseisavos de Final",
//     };

//     const phase = phaseMapping[classification];

//     if (!phase) {
//       return res.status(400).send({
//         code: 400,
//         message: "Nivel de clasificación no válido para el torneo.",
//       });
//     }

//     // Obtener el último ID y generar uno nuevo
//     const lastID = await db
//       .collection("matches")
//       .findOne({}, { sort: { id: -1 } });
//     let newId = lastID ? lastID.id + 1 : 1;

//     let knockoutMatches = [];

//     if (phase === "Octavos de Final") {
//       // Generar los partidos de Octavos de Final (igual que antes)
//       const classifications = await db
//         .collection("classifications")
//         .find({ id_tournament })
//         .toArray();

//       // Filtrar clasificaciones por torneo
//       const tournamentClassifications = classifications.filter(
//         (classification) => classification.id_tournament === id_tournament
//       );

//       // Agrupar por grupo
//       const classificationsByGroup = tournamentClassifications.reduce(
//         (acc, classification) => {
//           if (!acc[classification.id_group]) {
//             acc[classification.id_group] = [];
//           }
//           acc[classification.id_group].push(classification);
//           return acc;
//         },
//         {}
//       );

//       // Ordenar cada grupo por puntos
//       Object.values(classificationsByGroup).forEach((group) => {
//         group.sort((a, b) => {
//           if (b.points !== a.points) return b.points - a.points;
//           if (b.goal_difference !== a.goal_difference)
//             return b.goal_difference - a.goal_difference;
//           if (b.favor_goals !== a.favor_goals)
//             return b.favor_goals - a.favor_goals;
//           return a.goals_against - b.goals_against;
//         });
//       });

//       // Obtener los mejores equipos para Octavos
//       const bestFirsts = [];
//       const bestSeconds = [];
//       const bestThirds = [];
//       const bestFourth = [];
//       const bestFifths = [];
//       let bestSixth = null;

//       Object.values(classificationsByGroup).forEach((group) => {
//         bestFirsts.push(group[0]);
//         bestSeconds.push(group[1]);
//         bestThirds.push(group[2]);
//         bestFourth.push(group[3]);
//         bestFifths.push(group[4]);
//         if (group[5] && (!bestSixth || group[5].points > bestSixth.points)) {
//           bestSixth = group[5];
//         }
//       });

//       // Ordenar los mejores primeros
//       bestFirsts.sort((a, b) => {
//         if (b.points !== a.points) return b.points - a.points;
//         if (b.goal_difference !== a.goal_difference)
//           return b.goal_difference - a.goal_difference;
//         if (b.favor_goals !== a.favor_goals)
//           return b.favor_goals - a.favor_goals;
//         return a.goals_against - b.goals_against;
//       });

//       // Crear partidos de Octavos de Final
//       knockoutMatches = [
//         {
//           round: "Partido 1",
//           type: "Octavos de Final",
//           local_team: bestFirsts[0].id_team,
//           visiting_team: bestSixth?.id_team || null,
//         },
//         {
//           round: "Partido 2",
//           type: "Octavos de Final",
//           local_team: bestFirsts[1].id_team,
//           visiting_team: bestFifths[0].id_team,
//         },
//         {
//           round: "Partido 3",
//           type: "Octavos de Final",
//           local_team: bestFirsts[2].id_team,
//           visiting_team: bestFifths[1].id_team,
//         },
//         {
//           round: "Partido 4",
//           type: "Octavos de Final",
//           local_team: bestSeconds[0].id_team,
//           visiting_team: bestFifths[2].id_team,
//         },
//         {
//           round: "Partido 5",
//           type: "Octavos de Final",
//           local_team: bestSeconds[1].id_team,
//           visiting_team: bestFourth[0].id_team,
//         },
//         {
//           round: "Partido 6",
//           type: "Octavos de Final",
//           local_team: bestSeconds[2].id_team,
//           visiting_team: bestFourth[1].id_team,
//         },
//         {
//           round: "Partido 7",
//           type: "Octavos de Final",
//           local_team: bestThirds[0].id_team,
//           visiting_team: bestFourth[2].id_team,
//         },
//         {
//           round: "Partido 8",
//           type: "Octavos de Final",
//           local_team: bestThirds[1].id_team,
//           visiting_team: bestThirds[2].id_team,
//         },
//       ];
//     } else if (phase === "Cuartos de Final") {
//       // Crear partidos de Cuartos de Final utilizando los ganadores de Octavos
//       const winners = octavosMatches.map((match) =>
//         match.local_result > match.visiting_result
//           ? match.local_team
//           : match.visiting_team
//       );

//       knockoutMatches = [
//         {
//           round: "Partido A",
//           type: "Cuartos de Final",
//           local_team: winners[0], // Ganador del Partido 1
//           visiting_team: winners[7], // Ganador del Partido 8
//         },
//         {
//           round: "Partido B",
//           type: "Cuartos de Final",
//           local_team: winners[1], // Ganador del Partido 2
//           visiting_team: winners[6], // Ganador del Partido 7
//         },
//         {
//           round: "Partido C",
//           type: "Cuartos de Final",
//           local_team: winners[2], // Ganador del Partido 3
//           visiting_team: winners[5], // Ganador del Partido 6
//         },
//         {
//           round: "Partido D",
//           type: "Cuartos de Final",
//           local_team: winners[3], // Ganador del Partido 4
//           visiting_team: winners[4], // Ganador del Partido 5
//         },
//       ];
//     } else if (phase === "Semifinal") {
//       // Crear partidos de Semifinal utilizando los ganadores de Cuartos de Final
//       const winners = cuartosMatches.map((match) =>
//         match.local_result > match.visiting_result
//           ? match.local_team
//           : match.visiting_team
//       );

//       knockoutMatches = [
//         {
//           round: "Semifinal 1",
//           type: "Semifinal",
//           local_team: winners[0], // Ganador del Partido A
//           visiting_team: winners[3], // Ganador del Partido D
//         },
//         {
//           round: "Semifinal 2",
//           type: "Semifinal",
//           local_team: winners[1], // Ganador del Partido B
//           visiting_team: winners[2], // Ganador del Partido C
//         },
//       ];
//     } else if (phase === "Final") {
//       // Crear partido de la Final utilizando los ganadores de las Semifinales
//       const winners = semifinalMatches.map((match) =>
//         match.local_result > match.visiting_result
//           ? match.local_team
//           : match.visiting_team
//       );

//       knockoutMatches = [
//         {
//           round: "Final",
//           type: "Final",
//           local_team: winners[0], // Ganador de Semifinal 1
//           visiting_team: winners[1], // Ganador de Semifinal 2
//         },
//       ];
//     }

//     // Crear partidos
//     const newMatches = knockoutMatches.map((match, index) => ({
//       id: newId + 1 + index,
//       id_tournament,
//       ...match,
//       status: 1,
//       date: "",
//       hour_start: "",
//       place: 0,
//       team_refereeing: 0,
//       delegates: "",
//       local_result: 0,
//       visiting_result: 0,
//       referee: "",
//       id_planner: 0,
//       observations: "",
//     }));

//     // Insertar los nuevos partidos generados
//     await db.collection("matches").insertMany(newMatches);

//     res.status(200).send({
//       code: 200,
//       message: `Partidos de ${phase} generados con éxito`,
//       data: newMatches,
//     });
//   } catch (err) {
//     console.error("Error en el servidor:", err);
//     res.status(500).send("Error en el servidor");
//   }
// };

const generateKnockoutMatches = async (req, res) => {
  try {
    const db = getDB();
    const { id_tournament } = req.body;

    // Obtener información del torneo para verificar el nivel de clasificación
    const tournament = await db
      .collection("tournaments")
      .findOne({ id: id_tournament });

    if (!tournament) {
      return res.status(404).send({
        code: 404,
        message: "Torneo no encontrado",
      });
    }

    const { classification } = tournament;

    // Determinar la fase inicial según el nivel de clasificación
    const phaseMapping = {
      1: "Final",
      2: "Semifinal",
      3: "Cuartos de Final",
      4: "Octavos de Final",
      5: "Dieciseisavos de Final",
    };

    const phase = phaseMapping[classification];

    if (!phase) {
      return res.status(400).send({
        code: 400,
        message: "Nivel de clasificación no válido para el torneo.",
      });
    }

    // Obtener equipos clasificados
    const classifiedTeams = await db
      .collection("classifications")
      .find({ id_tournament, classified: 1 })
      .toArray();

    if (classifiedTeams.length === 0) {
      return res.status(400).send({
        code: 400,
        message: "No hay equipos clasificados para generar los partidos.",
      });
    }

    // Barajar equipos aleatoriamente
    const shuffledTeams = classifiedTeams.sort(() => Math.random() - 0.5);

    // Dividir en pares para los partidos
    const knockoutMatches = [];
    for (let i = 0; i < shuffledTeams.length; i += 2) {
      if (shuffledTeams[i + 1]) {
        knockoutMatches.push({
          round: `Partido ${Math.ceil((i + 1) / 2)}`,
          type: phase,
          local_team: shuffledTeams[i].id_team,
          visiting_team: shuffledTeams[i + 1].id_team,
        });
      }
    }

    // Obtener el último ID y generar uno nuevo
    const lastID = await db
      .collection("matches")
      .findOne({}, { sort: { id: -1 } });
    let newId = lastID ? lastID.id + 1 : 1;

    // Crear partidos con detalles adicionales
    const newMatches = knockoutMatches.map((match, index) => ({
      id: newId + index,
      id_tournament,
      ...match,
      status: 1,
      date: "",
      hour_start: "",
      place: 0,
      team_refereeing: 0,
      delegates: "",
      local_result: 0,
      visiting_result: 0,
      referee: "",
      id_planner: 0,
      observations: "",
    }));

    // Insertar los nuevos partidos generados
    await db.collection("matches").insertMany(newMatches);

    res.status(200).send({
      code: 200,
      message: `Partidos de ${phase} generados con éxito`,
      data: newMatches,
    });
  } catch (err) {
    console.error("Error en el servidor:", err);
    res.status(500).send("Error en el servidor");
  }
};

const getMatchData = async (req, res) => {
  try {
    console.log("Inicio del servicio getMatchData");
    console.log("ID del partido recibido:", req.params.id);

    const db = getDB();
    const matchId = parseInt(req.params.id);

    if (isNaN(matchId)) {
      console.warn("El ID del partido no es válido.");
      return res.status(400).send("ID del partido inválido");
    }

    console.log("Consultando datos en la base de datos...");

    const [match, teams, players, events, matchPlayersNumbers, penalties] =
      await Promise.all([
        db.collection("matches").findOne({ id: matchId }),
        db.collection("teams").find().toArray(),
        db.collection("players").find().toArray(),
        db.collection("events").find().toArray(),
        db.collection("match_players_numbers").find().toArray(),
        db.collection("penalties").find().toArray(),
      ]);

    console.log("Datos del partido:", match);

    if (!match) {
      console.warn("Partido no encontrado.");
      return res.status(404).send("Partido no encontrado");
    }

    const homeTeam = teams.find((t) => t.id === match.local_team);
    const awayTeam = teams.find((t) => t.id === match.visiting_team);

    if (!homeTeam || !awayTeam) {
      console.warn("Equipos no encontrados.");
      return res.status(404).send("Equipos no encontrados");
    }

    console.log("Equipos encontrados:", homeTeam.name, awayTeam.name);

    const homePlayers = players.filter((p) => {
      const penalty = penalties.find(
        (pen) =>
          pen.id_player === p.id &&
          pen.status === "Vigente" &&
          pen.id_tournament === match.id_tournament
      );
    
      // Excluir si tiene una sanción vigente y no es el partido donde fue sancionado
      if (penalty && penalty.id_match !== match.id) {
        console.log(`Jugador ${p.name} (ID: ${p.id}) tiene sanción vigente. Excluido.`);
        return false;
      }
    
      return p.id_team === homeTeam.id && p.tournaments.includes(match.id_tournament);
    });
    
    const awayPlayers = players.filter((p) => {
      const penalty = penalties.find(
        (pen) =>
          pen.id_player === p.id &&
          pen.status === "Vigente" &&
          pen.id_tournament === match.id_tournament
      );
    
      // Excluir si tiene una sanción vigente y no es el partido donde fue sancionado
      if (penalty && penalty.id_match !== match.id) {
        console.log(`Jugador ${p.name} (ID: ${p.id}) tiene sanción vigente. Excluido.`);
        return false;
      }
    
      return p.id_team === awayTeam.id && p.tournaments.includes(match.id_tournament);
    });
    

    console.log("Jugadores locales:", homePlayers.length);
    console.log("Jugadores visitantes:", awayPlayers.length);

    const checkPenaltyStatus = async (players) => {
      console.log("Verificando sanciones...");
      const updatedPlayers = [];

      const tournamentMatches = await db
        .collection("matches")
        .find({ id_tournament: match.id_tournament, status: 7 }) // Solo partidos finalizados
        .toArray();

      for (const player of players) {
        if (player.status === 3) {
          console.log(`Jugador sancionado: ${player.name} (ID: ${player.id})`);

          const playerPenalties = penalties.filter(
            (penalty) =>
              penalty.id_player === player.id &&
              penalty.status === "Vigente" &&
              penalty.id_tournament === match.id_tournament
          );

          if (playerPenalties.length > 0) {
            console.log(`Penalización activa para el jugador ${player.name}`);
            const lastPenalty = playerPenalties[0];

            // Verificar si este es el partido donde fue sancionado
            if (lastPenalty.id_match === match.id) {
              console.log(`Este es el partido donde se sancionó al jugador ${player.name}. Permitido participar.`);
              continue; // Permitir que este jugador participe en el partido actual
            }

            const { sanction_duration } = lastPenalty;
            const subsequentMatches = tournamentMatches
              .filter((m) => m.date > match.date)
              .sort((a, b) => new Date(a.date) - new Date(b.date))
              .slice(0, sanction_duration);

            const didNotPlayInAny = subsequentMatches.every(
              (subMatch) =>
                !events.some(
                  (e) => e.id_player === player.id && e.id_match === subMatch.id
                )
            );

            if (didNotPlayInAny) {
              console.log(`Sanción cumplida para el jugador ${player.name}. Actualizando estado...`);
              player.status = 4;
              updatedPlayers.push(player);

              await db.collection("players").updateOne(
                { id: player.id },
                { $set: { status: 4 } }
              );

              await db.collection("penalties").updateOne(
                { id: lastPenalty.id },
                { $set: { status: "Cumplido" } }
              );
            }
          }
        }
      }

      return updatedPlayers;
    };

    const updatedHomePlayers = await checkPenaltyStatus(homePlayers);
    const updatedAwayPlayers = await checkPenaltyStatus(awayPlayers);

    const matchEvents = events
      .filter((e) => e.id_match === match.id)
      .map((e) => {
        const player = players.find((p) => p.id === e.id_player);
        return {
          id: e.id,
          id_player: e.id_player,
          player: player ? player.name : "Jugador Desconocido",
          team: homePlayers.find((p) => p.id === e.id_player)
            ? "Home"
            : "Away",
          type: e.id_event_type,
        };
      });

    console.log("Eventos del partido:", matchEvents);

    const matchPlayersNumbersMap = matchPlayersNumbers.reduce((acc, mpn) => {
      if (mpn.id_match === match.id) {
        acc[mpn.id_player] = mpn.number;
      }
      return acc;
    }, {});

    const formatPlayer = (player) => {
      const playerEvents = matchEvents.filter((e) => e.id_player === player.id);
      const goals = playerEvents.filter((e) => e.type === 1).length;
      const yellowCards = playerEvents.filter((e) => e.type === 2).length;
      const redCards = playerEvents.filter((e) => e.type === 3).length;

      return {
        id: player.id,
        name: player.name,
        position: player.position,
        number: matchPlayersNumbersMap[player.id] || player.number,
        status: player.status,
        stats: {
          goals,
          yellowCards,
          redCards,
        },
      };
    };

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
        formation: "4-3-3",
        players: homePlayers.map(formatPlayer),
      },
      awayTeam: {
        id: awayTeam.id,
        manager: awayTeam.manager_name,
        name: awayTeam.name,
        logo: awayTeam.logo,
        formation: "4-3-3",
        players: awayPlayers.map(formatPlayer),
      },
      hour: match.hour_start,
      score: `${match.local_result} - ${match.visiting_result}`,
      date: formatDate(matchDate),
      status: match.status,
      events: matchEvents,
      observations: match.observations,
      updatedHomePlayers,
      updatedAwayPlayers,
    };

    console.log("Datos del partido formateados correctamente:", matchData);

    res.status(200).send({
      code: 200,
      message: "Datos del partido obtenidos con éxito",
      data: matchData,
    });
  } catch (err) {
    console.error("Error en el servidor:", err);
    res.status(500).send({
      code: 500,
      message: "Error interno en el servidor",
      error: err.message,
    });
  }
};

const generateXLS = async (req, res) => {
  try {
    const db = getDB();
    const { id } = req.params;

    // Obtener información del partido
    const match = await db.collection("matches").findOne({ id: parseInt(id) });
    if (!match) {
      return res.status(404).send("Partido no encontrada");
    }

    // Obtener información del planillador
    const user = await db.collection("users").findOne({ id: match.id_planner });
    if (!user) {
      return res.status(404).send("Category not found");
    }

    // Obtener información del equipo local
    const localTeam = await db
      .collection("teams")
      .findOne({ id: parseInt(match.local_team) });
    if (!localTeam) {
      return res.status(404).send("local team not found");
    }

    // Obtener información del equipo visitante
    const visitingTeam = await db
      .collection("teams")
      .findOne({ id: parseInt(match.visiting_team) });
    if (!visitingTeam) {
      return res.status(404).send("visiting team not found");
    }

    // Obtener información del torneo
    const tournament = await db
      .collection("tournaments")
      .findOne({ id: match.id_tournament });
    if (!tournament) {
      return res.status(404).send("Tournament not found");
    }

    // Obtener información de la categoría del torneo
    const category = await db
      .collection("categories")
      .findOne({ id: tournament.id_category });
    if (!category) {
      return res.status(404).send("Category not found");
    }

    // Obtener información de la cancha
    const place = await db.collection("fields").findOne({ id: match.place });
    if (!place) {
      return res.status(404).send("Place not found");
    }

    // Obtener información de los jugadores y eventos del partido
    const matchPlayersNumbers = await db
      .collection("match_players_numbers")
      .find({ id_match: parseInt(id) })
      .toArray();

    const playerIds = matchPlayersNumbers.map((mpn) => mpn.id_player);
    const players = await db
      .collection("players")
      .find({ id: { $in: playerIds } })
      .toArray();

    const events = await db
      .collection("events")
      .find({ id_match: parseInt(id) })
      .toArray();

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
    worksheet.getCell("D2").value = `CATEGORIA ${category.name.toUpperCase()}`;
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
    const [year, month, day] = match.date.split("-");

    worksheet.getCell("F4").value = day;
    worksheet.getCell("F4").font = bodyFont;
    worksheet.getCell("F4").alignment = centerAlignment;
    worksheet.getCell("F4").border = {
      top: { style: "thin" },
      left: { style: "thin" },
      bottom: { style: "thin" },
      right: { style: "thin" },
    };

    worksheet.getCell("G4").value = month;
    worksheet.getCell("G4").font = bodyFont;
    worksheet.getCell("G4").alignment = centerAlignment;
    worksheet.getCell("G4").border = {
      top: { style: "thin" },
      left: { style: "thin" },
      bottom: { style: "thin" },
      right: { style: "thin" },
    };

    worksheet.mergeCells("H4:I4");
    worksheet.getCell("H4").value = year;
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
    worksheet.getCell("F5").value = match.hour_start;
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
    worksheet.getCell("L4").value = place.name.toUpperCase();
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
    worksheet.getCell("L5").value = "";
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

    worksheet.getCell("D9").value = match.local_result;
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

    worksheet.getCell("F9").value = match.visiting_result;
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
    worksheet.getCell("B12").value = localTeam.name;
    worksheet.getCell("B12").font = bodyFont;
    worksheet.getCell("B12").alignment = centerAlignment;
    worksheet.getCell("B12:C12").border = {
      top: { style: "thin" },
      left: { style: "thin" },
      bottom: { style: "thin" },
      right: { style: "thin" },
    };

    worksheet.mergeCells("D12:E12");
    worksheet.getCell("D12").value = "";
    worksheet.getCell("D12").font = bodyFont;
    worksheet.getCell("D12").alignment = centerAlignment;
    worksheet.getCell("D12:E12").border = {
      top: { style: "thin" },
      left: { style: "thin" },
      bottom: { style: "thin" },
      right: { style: "thin" },
    };

    worksheet.getCell("F12").value = match.local_result;
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
    worksheet.getCell("J12").value = visitingTeam.name;
    worksheet.getCell("J12").font = bodyFont;
    worksheet.getCell("J12").alignment = centerAlignment;
    worksheet.getCell("J12:K12").border = {
      top: { style: "thin" },
      left: { style: "thin" },
      bottom: { style: "thin" },
      right: { style: "thin" },
    };

    worksheet.mergeCells("L12:M12");
    worksheet.getCell("L12").value = "";
    worksheet.getCell("L12").font = bodyFont;
    worksheet.getCell("L12").alignment = centerAlignment;
    worksheet.getCell("L12:M12").border = {
      top: { style: "thin" },
      left: { style: "thin" },
      bottom: { style: "thin" },
      right: { style: "thin" },
    };

    worksheet.getCell("N12").value = match.visiting_result;
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

    const localTeamPlayers = matchPlayersNumbers
      .filter(
        (mpn) =>
          players.find((p) => p.id === mpn.id_player).id_team ===
          match.local_team
      )
      .map((mpn) => ({
        number: mpn.number,
        ...players.find((p) => p.id === mpn.id_player),
      }));

    const visitingTeamPlayers = matchPlayersNumbers
      .filter(
        (mpn) =>
          players.find((p) => p.id === mpn.id_player).id_team ===
          match.visiting_team
      )
      .map((mpn) => ({
        number: mpn.number,
        ...players.find((p) => p.id === mpn.id_player),
      }));

    // Empezar a agregar los jugadores desde la fila 14
    localTeamPlayers.forEach((player, index) => {
      const playerEvents = events.filter((e) => e.id_player === player.id);

      const goals = playerEvents.filter((e) => e.id_event_type === 1).length;
      const yellowCards = playerEvents.filter(
        (e) => e.id_event_type === 2
      ).length;
      const redCards = playerEvents.filter((e) => e.id_event_type === 3).length;

      // Agregar una fila con los datos del jugador, comenzando desde la columna B
      const row = worksheet.addRow([
        "",
        index + 1,
        player.name,
        player.number,
        goals > 0 ? goals : "",
        redCards > 0 ? "R" : yellowCards > 0 ? "A" : "",
      ]);

      // Establecer alineación para las celdas recién agregadas (comenzando en la columna B)
      row.getCell(2).alignment = centerAlignment; // Columna B (número)
      row.getCell(3).alignment = centerAlignment; // Columna C (nombre)
      row.getCell(4).alignment = centerAlignment; // Columna D
      row.getCell(5).alignment = centerAlignment; // Columna E
      row.getCell(6).alignment = centerAlignment; // Columna F

      // Aplicar bordes solo a las celdas desde la columna B en adelante
      row.eachCell({ includeEmpty: true }, (cell, colNumber) => {
        if (colNumber >= 2) {
          // Aplicar bordes desde la columna B en adelante
          cell.border = {
            top: { style: "thin" },
            left: { style: "thin" },
            bottom: { style: "thin" },
            right: { style: "thin" },
          };
        }
      });
    });

    // Agregar jugadores del equipo contrario desde la columna J (fila 14)
    visitingTeamPlayers.forEach((player, index) => {
      const playerEvents = events.filter((e) => e.id_player === player.id);

      const goals = playerEvents.filter((e) => e.id_event_type === 1).length;
      const yellowCards = playerEvents.filter(
        (e) => e.id_event_type === 2
      ).length;
      const redCards = playerEvents.filter((e) => e.id_event_type === 3).length;

      const row = worksheet.getRow(14 + index); // Obtener la fila correspondiente (empezando en la 14)

      // Colocamos los jugadores en las columnas desde J en adelante (columna 10)
      row.getCell(10).value = index + 1; // Columna J
      row.getCell(11).value = player.name; // Columna K
      row.getCell(12).value = player.number; // Columna L
      row.getCell(13).value = goals > 0 ? goals : ""; // Columna M
      row.getCell(14).value = redCards > 0 ? "R" : yellowCards > 0 ? "A" : ""; // Columna N

      // Aplicar alineación y bordes en las celdas desde la columna J
      row.eachCell({ includeEmpty: true }, (cell, colNumber) => {
        if (colNumber >= 10) {
          // Aplicar bordes desde la columna J en adelante
          cell.alignment = centerAlignment;
          cell.border = {
            top: { style: "thin" },
            left: { style: "thin" },
            bottom: { style: "thin" },
            right: { style: "thin" },
          };
        }
      });
    });

    worksheet.mergeCells("B40:F40");
    worksheet.getCell("B40").value = `ARBITRO: ${match.referee}`;
    worksheet.getCell("B40").font = bodyFont;
    worksheet.getCell("B40").alignment = centerAlignment;
    worksheet.getCell("B40:F40").border = {
      top: { style: "thin" },
      left: { style: "thin" },
      bottom: { style: "thin" },
      right: { style: "thin" },
    };

    worksheet.mergeCells("J40:N40");
    worksheet.getCell("J40").value = `PLANILLADOR: ${user.name}`;
    worksheet.getCell("J40").font = bodyFont;
    worksheet.getCell("J40").alignment = centerAlignment;
    worksheet.getCell("J40:N40").border = {
      top: { style: "thin" },
      left: { style: "thin" },
      bottom: { style: "thin" },
      right: { style: "thin" },
    };

    worksheet.mergeCells("B42:N42");
    worksheet.getCell("B42").value = `OBSERVACIONES:  ${match.observations}`;
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

    // // Generar el archivo Excel y enviarlo como respuesta
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
    res.status(500).send("Error en el servidor");
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
