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

module.exports = {
  getAllTournaments,
  getAllClassifications,
};
