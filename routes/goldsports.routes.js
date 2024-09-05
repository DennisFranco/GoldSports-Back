const express = require("express");
const router = express.Router();
const jwt = require("jsonwebtoken");
const usersController = require("./controllers/usersController.js");
const fieldsController = require("./controllers/fieldsController.js");
const playersController = require("./controllers/playersController.js");
const teamsController = require("./controllers/teamsController.js");
const matchesController = require("./controllers/matchesController.js");
const classificationsController = require("./controllers/classificationsController.js");
const tournamentController = require("./controllers/tournamentController.js");
const categoriesController = require("./controllers/categoriesController.js");
const groupsController = require("./controllers/groupsController.js");
const eventsController = require("./controllers/eventsController.js");
const refereesController = require("./controllers/refereesController.js");
const matchPlayerNumberController = require("./controllers/matchPlayerNumberController.js");
const playerStatsController = require("./controllers/playerStatsController.js");
const penaltiesController = require("./controllers/penaltiesController.js");

function verificarToken(req, res, next) {
  const bearerHeader = req.headers["authorization"];
  if (typeof bearerHeader !== "undefined") {
    const bearerToken = bearerHeader.split(" ")[1];
    jwt.verify(bearerToken, process.env.SECRET_KEY, (err) => {
      if (err) {
        res.sendStatus(403);
      } else {
        next();
      }
    });
  } else {
    res.sendStatus(403);
  }
}

router
  .post("/login", usersController.loginUser)
  .get("/users", usersController.getAllUsers)
  .get("/roles", usersController.getAllRoles)
  .post("/users", usersController.createUser)
  .put("/users/:id", usersController.editUser)
  .get("/fields", fieldsController.getAllFields)
  .get("/fields/:id", fieldsController.getFieldByID)
  .post("/fields", fieldsController.createField)
  .put("/fields/:id", fieldsController.updateField)
  .delete("/fields/:id", fieldsController.deleteField)
  .get("/players", playersController.getAllPlayers)
  .get("/players/:id", playersController.getPlayerByID)
  .post("/players", playersController.createPlayer)
  .post("/players/addTournament", playersController.addTournamentToPlayer)
  .post(
    "/removeTournamentFromPlayer",
    playersController.removeTournamentFromPlayer
  )
  .put("/players/:id", playersController.updatePlayer)
  .delete("/players/:id", playersController.deletePlayer)
  .delete("/players/team/:id_team", playersController.deletePlayersByTeamID)
  .get("/teams", teamsController.getAllTeams)
  .get("/teamsWithoutGroup/:tournamentId", teamsController.getTeamsWithoutGroup)
  .get("/teams/:id", teamsController.getTeamByID)
  .get("/teams/tournament/:id_tournament", teamsController.getTeamsByTournament)
  .get(
    "/players/tournament/:tournamentId/team/:teamId",
    teamsController.getPlayersByTournamentAndTeam
  )
  .post("/teams", teamsController.createTeam)
  .put("/teams/:id", teamsController.updateTeam)
  .delete("/teams/:id", teamsController.deleteTeam)
  .get("/matches", matchesController.getAllMatches)
  .get("/matches/:id", matchesController.getMatchByID)
  .get("/download-excel", matchesController.generateXLS)
  .get("/matchData/:id", matchesController.getMatchData)
  .post("/matches", matchesController.createMatch)
  .post("/matches/generate", matchesController.createTournamentMatches)
  .post("/matches/generateKnockout", matchesController.generateKnockoutMatches)
  .put("/matches/:id", matchesController.updateMatch)
  .delete("/matches/:id", matchesController.deleteMatch)
  .post("/matches/walkover", matchesController.updateMatchStatus)
  .post("/matches/cancel", matchesController.cancelMatchDueToIncident)
  .get("/tournaments", tournamentController.getAllTournaments)
  .get("/tournaments/:id", tournamentController.getTournamentInfo)
  .get("/tournaments/:id/teams", tournamentController.getTournamentTeams)
  .get("/tournaments/:id/matches", tournamentController.getTournamentMatches)
  .get(
    "/tournaments/:id/classification",
    tournamentController.getTournamentClassification
  )
  .post("/tournaments", tournamentController.createTournament)
  .put(
    "/tournaments/:id",
    verificarToken,
    tournamentController.updateTournament
  )
  .delete(
    "/tournaments/:id",
    verificarToken,
    tournamentController.deleteTournament
  )
  .get("/categories", categoriesController.getAllCategories)
  .get("/categories/:id", categoriesController.getCategoryByID)
  .post("/categories", categoriesController.createCategory)
  .put("/categories/:id", categoriesController.updateCategory)
  .delete(
    "/categories/:id",
    verificarToken,
    categoriesController.deleteCategory
  )
  .get("/groups", groupsController.getAllGroups)
  .get("/groups/:id", groupsController.getGroupByID)
  .get("/groupsByTournament/:id", groupsController.getGroupsByTournamentID)
  .post("/groups", groupsController.createGroup)
  .post("/groups/teams", groupsController.createTeamGroup)
  .put("/groups/:id", groupsController.updateGroup)
  .delete("/groups/:id", groupsController.deleteGroup)
  .get("/events", eventsController.getAllEvents)
  .get("/events/:id", eventsController.getEventByID)
  .post("/events", eventsController.createEvent)
  .put("/events/:id", eventsController.updateEvent)
  .delete("/events/:id", eventsController.deleteEvent)
  .get("/referees", refereesController.getAllReferees)
  .get("/referees/:id", refereesController.getRefereeByID)
  .post("/referees", refereesController.createReferee)
  .put("/referees/:id", refereesController.updateReferee)
  .delete("/referees/:id", refereesController.deleteReferee)
  .post(
    "/matchPlayersNumbers/:idMatch",
    matchPlayerNumberController.createMatchPlayerNumbers
  )
  .get("/classifications", classificationsController.getAllClassifications)
  .get("/playerStats", playerStatsController.getAllPlayerStats)
  .get(
    "/playerStats/:playerId/tournament/:tournamentId",
    playerStatsController.getPlayerStatsByPlayerAndTournament
  )
  .post("/playerStats", playerStatsController.createPlayerStats)
  .put(
    "/playerStats/:playerId/tournament/:tournamentId",
    playerStatsController.updatePlayerStats
  )
  .delete(
    "/playerStats/:playerId/tournament/:tournamentId",
    playerStatsController.deletePlayerStats
  )
  .get("/penalties", penaltiesController.getAllPenalties)
  .get("/penalties/:id", penaltiesController.getPenaltyByID)
  .post("/penalties", penaltiesController.createPenalty)
  .put("/penalties/:id", penaltiesController.updatePenalty)
  .delete("/penalties/:id", penaltiesController.deletePenalty);

module.exports = router;
