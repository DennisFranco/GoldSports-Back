const { getDB } = require("../../config/db");

const getAllTournaments = async (req, res) => {
  try {
    const db = getDB();

    // Obtener torneos y categorías simultáneamente con la condición aplicada a torneos
    const [tournaments, categories] = await Promise.all([
      db.collection("tournaments").find().toArray(),
      db.collection("categories").find().toArray(),
    ]);

    // Mapear los torneos con su respectiva categoría
    const tournamentsWithCategory = tournaments.map((tournament) => {
      const category = categories.find(
        (cat) => cat.id === tournament.id_category
      );
      return {
        ...tournament,
        category: category || null, // Si no se encuentra la categoría, asignar null
      };
    });

    res.status(200).send({
      code: 200,
      message: "Torneos obtenidos con éxito",
      data: tournamentsWithCategory,
    });
  } catch (err) {
    res.status(500).send({
      code: 500,
      message: "Error del servidor",
      error: err.message,
    });
  }
};

// Obtener todas las clasificaciones
const getAllClassifications = async (req, res) => {
  try {
    const db = getDB();

    // Obtener los datos desde las colecciones de MongoDB
    const [classifications, tournaments, groups, teams, categories] =
      await Promise.all([
        db.collection("classifications").find().toArray(),
        db.collection("tournaments").find().toArray(),
        db.collection("groups").find().toArray(),
        db.collection("teams").find().toArray(),
        db.collection("categories").find().toArray(),
      ]);

    const formattedClassifications = {};

    classifications.forEach((classification) => {
      const tournament = tournaments.find(
        (t) => t.id === classification.id_tournament
      );
      const group = groups.find((g) => g.id === classification.id_group);
      const team = teams.find((t) => t.id === classification.id_team);
      const category = tournament
        ? categories.find((c) => c.id === tournament.id_category)
        : null;

      const tournamentId = tournament ? tournament.id : "Torneo Desconocido";
      const tournamentName = tournament
        ? `${tournament.name} (${tournament.year}, ${
            category ? category.name : "Categoría Desconocida"
          })`
        : "Torneo Desconocido";
      const groupId = group ? group.id : "Grupo Desconocido";
      const groupName = group ? group.name : "Grupo Desconocido";
      const teamName = team ? team.name : "Equipo Desconocido";

      if (!formattedClassifications[tournamentId]) {
        formattedClassifications[tournamentId] = {
          name: tournamentName,
          groups: {},
        };
      }

      if (!formattedClassifications[tournamentId].groups[groupId]) {
        formattedClassifications[tournamentId].groups[groupId] = {
          name: groupName,
          classifications: [],
        };
      }

      formattedClassifications[tournamentId].groups[
        groupId
      ].classifications.push({
        equipo: teamName,
        puntos: classification.points,
        partidos_jugados: classification.matches_played,
        partidos_ganados: classification.matches_won,
        partidos_empatados: classification.tied_matches,
        partidos_perdidos: classification.lost_matches,
        goles_a_favor: classification.favor_goals,
        goles_en_contra: classification.goals_against,
        diferencia_de_goles: classification.goal_difference,
      });
    });

    // Ordenar clasificaciones
    for (const tournamentId in formattedClassifications) {
      for (const groupId in formattedClassifications[tournamentId].groups) {
        formattedClassifications[tournamentId].groups[
          groupId
        ].classifications.sort((a, b) => {
          if (b.puntos !== a.puntos) return b.puntos - a.puntos;
          if (b.diferencia_de_goles !== a.diferencia_de_goles)
            return b.diferencia_de_goles - a.diferencia_de_goles;
          if (b.goles_a_favor !== a.goles_a_favor)
            return b.goles_a_favor - a.goles_a_favor;
          return a.goles_en_contra - b.goles_en_contra;
        });
      }
    }

    res.status(200).send({
      code: 200,
      message: "Clasificaciones obtenidas exitosamente",
      data: formattedClassifications,
    });
  } catch (err) {
    res.status(500).send("Error del servidor");
  }
};

// Obtener clasificación del torneo
const getTournamentClassification = async (req, res) => {
  try {
    const db = getDB();
    const [classifications, teams, groups] = await Promise.all([
      db.collection("classifications").find().toArray(),
      db.collection("teams").find().toArray(),
      db.collection("groups").find().toArray(),
    ]);

    const tournamentClassifications = classifications.filter(
      (classification) =>
        classification.id_tournament === parseInt(req.params.id)
    );
    const formattedClassifications = {};

    tournamentClassifications.forEach((classification) => {
      const group =
        groups.find((g) => g.id === classification.id_group)?.name ||
        "Unknown Group";
      const team =
        teams.find((t) => t.id === classification.id_team)?.name ||
        "Unknown Team";

      if (!formattedClassifications[group]) {
        formattedClassifications[group] = [];
      }

      formattedClassifications[group].push({
        id_team: classification.id_team,
        id_group: classification.id_group,
        team,
        points: classification.points,
        matches_played: classification.matches_played,
        matches_won: classification.matches_won,
        tied_matches: classification.tied_matches,
        lost_matches: classification.lost_matches,
        favor_goals: classification.favor_goals,
        goals_against: classification.goals_against,
        goal_difference: classification.goal_difference,
      });

      formattedClassifications[group].sort((a, b) => {
        if (b.points !== a.points) return b.points - a.points;
        if (b.goal_difference !== a.goal_difference)
          return b.goal_difference - a.goal_difference;
        if (b.favor_goals !== a.favor_goals)
          return b.favor_goals - a.favor_goals;
        return a.goals_against - b.goals_against;
      });
    });

    res.status(200).send({
      code: 200,
      message: "Clasificación del torneo obtenida con éxito",
      data: formattedClassifications,
    });
  } catch (err) {
    res.status(500).send("Error del servidor");
  }
};

const getTournamentTopScorers = async (req, res) => {
  try {
    const db = getDB();
    const { id_tournament } = req.params;
    // Obtener los eventos de goles en el torneo
    const goalEvents = await db
      .collection("events")
      .aggregate([
        {
          $match: {
            id_tournament: parseInt(id_tournament),
            id_event_type: 1, // Solo eventos de goles
          },
        },
        {
          $group: {
            _id: "$id_player",
            goals: { $sum: 1 }, // Contar goles por jugador
          },
        },
        { $sort: { goals: -1 } }, // Ordenar de mayor a menor goles
      ])
      .toArray();

    if (goalEvents.length === 0) {
      return res
        .status(404)
        .json({ message: "No hay goleadores en este torneo" });
    }

    // Obtener los nombres de los jugadores y sus equipos
    const playerIds = goalEvents.map((event) => event._id);
    const players = await db
      .collection("players")
      .find({ id: { $in: playerIds } })
      .toArray();

    // Obtener los IDs de los equipos
    const teamIds = [...new Set(players.map((player) => player.id_team))];
    const teams = await db
      .collection("teams")
      .find({ id: { $in: teamIds } })
      .toArray();

    // Mapear resultados con nombres de jugadores y equipos
    const topScorers = goalEvents.map((event) => {
      const player = players.find((p) => p.id === event._id);
      const team = teams.find((t) => t.id === (player ? player.id_team : null));

      return {
        id_player: event._id,
        name: player ? player.name : "Jugador Desconocido",
        goals: event.goals,
        id_team: player ? player.id_team : null,
        team_name: team ? team.name : "Equipo Desconocido",
      };
    });

    res.status(200).send({
      code: 200,
      message: "Información del torneo obtenida con éxito",
      data: topScorers,
    });
  } catch (error) {
    console.error("Error al obtener goleadores:", error);
    res.status(500).json({ message: "Error en el servidor" });
  }
};

const getTournamentPenalties = async (req, res) => {
  try {
    const db = getDB();
    const tournamentId = parseInt(req.params.tournamentId);

    // Obtener las sanciones del torneo
    const penalties = await db
      .collection("penalties")
      .find({ id_tournament: tournamentId })
      .toArray();

    if (penalties.length === 0) {
      return res
        .status(404)
        .json({ message: "No hay sanciones registradas para este torneo." });
    }

    // Obtener IDs de jugadores y partidos involucrados
    const playerIds = penalties.map((p) => p.id_player);
    const matchIds = penalties.map((p) => p.id_match);

    // Consultar jugadores sancionados
    const players = await db
      .collection("players")
      .find({ id: { $in: playerIds } })
      .toArray();

    // Consultar partidos donde se aplicaron las sanciones
    const matches = await db
      .collection("matches")
      .find({ id: { $in: matchIds } })
      .toArray();

    // Obtener IDs de equipos para los jugadores sancionados
    const teamIds = players.map((p) => p.id_team);
    const teams = await db
      .collection("teams")
      .find({ id: { $in: teamIds } })
      .toArray();

    // Mapear información completa de sanciones
    const penaltiesData = penalties.map((penalty) => {
      const player = players.find((p) => p.id === penalty.id_player) || {};
      const match = matches.find((m) => m.id === penalty.id_match) || {};
      const team = teams.find((t) => t.id === player.id_team) || {};

      return {
        id: penalty.id,
        player_name: player.name || "Desconocido",
        team_name: team.name || "Desconocido",
        match_type: match.type || "Desconocido",
        match_date: match.date || "Desconocido",
        description: penalty.description,
        sanction_duration: penalty.sanction_duration,
        status: penalty.status,
      };
    });

    res.status(200).send({
      code: 200,
      message: "Información del torneo obtenida con éxito",
      data: penaltiesData,
    });
  } catch (error) {
    console.error("Error al obtener goleadores:", error);
    res.status(500).json({ message: "Error en el servidor" });
  }
};

module.exports = {
  getAllTournaments,
  getAllClassifications,
  getTournamentClassification,
  getTournamentTopScorers,
  getTournamentPenalties,
};
