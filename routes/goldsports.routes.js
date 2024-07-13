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
const matchSheetController = require("./controllers/matchSheetController.js");
const refereesController = require("./controllers/refereesController.js");
const matchPlayerNumberController = require("./controllers/matchPlayerNumberController.js");

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
  .get("/fields", fieldsController.getAllFields)
  .get("/fields/:id", fieldsController.getFieldByID)
  .post("/fields", fieldsController.createField)
  .put("/fields/:id", fieldsController.updateField)
  .delete("/fields/:id", fieldsController.deleteField)
  .get("/players", playersController.getAllPlayers)
  .get("/players/:id", playersController.getPlayerByID)
  .post("/players", playersController.createPlayer)
  .put("/players/:id", playersController.updatePlayer)
  .delete("/players/:id", playersController.deletePlayer)
  .get("/teams", teamsController.getAllTeams)
  .get("/teams/:id", teamsController.getTeamByID)
  .get("/teams/tournament/:id_tournament", teamsController.getTeamsByTournament)
  .post("/teams", teamsController.createTeam)
  .put("/teams/:id", teamsController.updateTeam)
  .delete("/teams/:id", teamsController.deleteTeam)
  .get("/matches", matchesController.getAllMatches)
  .get("/matches/:id", matchesController.getMatchByID)
  .get("/matchData/:id", matchesController.getMatchData)
  .post("/matches", matchesController.createMatch)
  .put("/matches/:id", matchesController.updateMatch)
  .delete("/matches/:id", matchesController.deleteMatch)
  .get("/tournaments", tournamentController.getAllTournaments)
  .get("/tournaments/:id", tournamentController.getTournamentByID)
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
  .post("/groups", groupsController.createGroup)
  .put("/groups/:id", groupsController.updateGroup)
  .delete("/groups/:id", groupsController.deleteGroup)
  .get("/events", eventsController.getAllEvents)
  .get("/events/:id", eventsController.getEventByID)
  .post("/events", eventsController.createEvent)
  .put("/events/:id", eventsController.updateEvent)
  .delete("/events/:id", eventsController.deleteEvent)
  .get("/matchSheet", matchSheetController.getAllMatchSheets)
  .get("/matchSheet/:id", matchSheetController.getAllMatchSheets)
  .post("/matchSheet", matchSheetController.createMatchSheet)
  .put("/matchSheet/:id", matchSheetController.updateMatchSheet)
  .delete("/matchSheet/:id", matchSheetController.deleteMatchSheet)
  .get("/referees", refereesController.getAllReferees)
  .get("/referees/:id", refereesController.getRefereeByID)
  .post("/referees", refereesController.createReferee)
  .put("/referees/:id", refereesController.updateReferee)
  .delete("/referees/:id", refereesController.deleteReferee)
  .post("/matchPlayersNumbers/:id", matchPlayerNumberController.createMatchPlayerNumbers)
  .get("/classifications", classificationsController.getAllClassifications);
  
module.exports = router;
