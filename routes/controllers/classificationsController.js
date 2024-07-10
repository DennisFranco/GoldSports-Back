const fs = require("fs");
const path = require("path");

const classificationsPath = path.join(
  __dirname,
  "../../db/classifications.json"
);
const tournamentsPath = path.join(__dirname, "../../db/tournaments.json");
const groupsPath = path.join(__dirname, "../../db/groups.json");
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

// Obtener todas las clasificaciones
const getAllClassifications = async (req, res) => {
  try {
    const classifications = await getJSONData(classificationsPath);
    const tournaments = await getJSONData(tournamentsPath);
    const groups = await getJSONData(groupsPath);
    const teams = await getJSONData(teamsPath);

    const formattedClassifications = {};

    classifications.forEach((classification) => {
      const tournament =
        tournaments.find((t) => t.id === classification.id_tournament)?.name ||
        "Unknown Tournament";
      const group =
        groups.find((g) => g.id === classification.id_group)?.name ||
        "Unknown Group";
      const team =
        teams.find((t) => t.id === classification.id_team)?.name ||
        "Unknown Team";

      if (!formattedClassifications[tournament]) {
        formattedClassifications[tournament] = {};
      }

      if (!formattedClassifications[tournament][group]) {
        formattedClassifications[tournament][group] = [];
      }

      formattedClassifications[tournament][group].push({
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
    });

    // Ordenar clasificaciones
    for (const tournament in formattedClassifications) {
      for (const group in formattedClassifications[tournament]) {
        formattedClassifications[tournament][group].sort((a, b) => {
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
      message: "Classifications successfully obtained",
      data: formattedClassifications,
    });
  } catch (err) {
    res.status(500).send("Server error");
  }
};

module.exports = {
  getAllClassifications,
};
