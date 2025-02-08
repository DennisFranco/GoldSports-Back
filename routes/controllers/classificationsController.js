const { getDB } = require("../../config/db");

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
        team: teamName,
        points: classification.points,
        matches_played: classification.matches_played,
        matches_won: classification.matches_won,
        tied_matches: classification.tied_matches,
        lost_matches: classification.lost_matches,
        favor_goals: classification.favor_goals,
        goals_against: classification.goals_against,
        goal_difference: classification.goal_difference,
      });
    });

    // Ordenar clasificaciones
    for (const tournamentId in formattedClassifications) {
      for (const groupId in formattedClassifications[tournamentId].groups) {
        formattedClassifications[tournamentId].groups[
          groupId
        ].classifications.sort((a, b) => {
          if (b.points !== a.points) return b.points - a.points;
          if (b.goal_difference !== a.goal_difference)
            return b.goal_difference - a.goal_difference;
          if (b.favor_goals !== a.favor_goals)
            return b.favor_goals - a.favor_goals;
          return a.goals_against - b.goals_against;
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

const createClassified = async (req, res) => {
  try {
    const db = getDB();
    const { id_tournament, teams } = req.body;

    // Validar que los datos requeridos estén presentes
    if (!id_tournament || !Array.isArray(teams) || teams.length === 0) {
      return res.status(400).send({
        code: 400,
        message: "Faltan datos requeridos: id_tournament o teams.",
      });
    }

    // Iterar sobre los equipos y actualizar el campo classified
    const bulkOperations = teams.map((team) => ({
      updateOne: {
        filter: {
          id_tournament,
          id_group: team.idGroup,
          id_team: team.idTeam,
        },
        update: { $set: { classified: 1 } },
      },
    }));

    const result = await db
      .collection("classifications")
      .bulkWrite(bulkOperations);

    res.status(200).send({
      code: 200,
      message: "Clasificaciones actualizadas con éxito.",
      matchedCount: result.matchedCount,
      modifiedCount: result.modifiedCount,
    });
  } catch (error) {
    console.error("Error actualizando clasificaciones:", error);
    res.status(500).send({
      code: 500,
      message: "Error interno del servidor.",
    });
  }
};

module.exports = {
  getAllClassifications,
  createClassified,
};
