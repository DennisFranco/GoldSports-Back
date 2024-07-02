const express = require("express");
const router = express.Router();
const jwt = require("jsonwebtoken");
const usersController = require("./controllers/usersController.js");
const fieldsController = require("./controllers/fieldsController.js");
const playersController = require("./controllers/playersController.js");
const teamsController = require("./controllers/teamsController.js");
const matchesController = require("./controllers/matchesController.js");
const classificationsController = require("./controllers/classificationsController.js");

function verificarToken(req, res, next) {
  console.log("req", req.headers);
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
  .get("/users", verificarToken, usersController.getAllUsers)
  .get("/roles", verificarToken, usersController.getAllRoles)
  .get("/fields", verificarToken, fieldsController.getAllFields)
  .get("/fields/:id", verificarToken, fieldsController.getFieldByID)
  .post("/fields", verificarToken, fieldsController.createField)
  .put("/fields/:id", verificarToken, fieldsController.updateField)
  .delete("/fields/:id", verificarToken, fieldsController.deleteField)
  .get("/players", verificarToken, playersController.getAllPlayers)
  .get("/players/:id", verificarToken, playersController.getPlayerByID)
  .post("/players", verificarToken, playersController.createPlayer)
  .put("/players/:id", verificarToken, playersController.updatePlayer)
  .delete("/players/:id", verificarToken, playersController.deletePlayer)
  .get("/teams", teamsController.getAllTeams)
  .get("/teams/:id", verificarToken, teamsController.getTeamByID)
  .post("/teams", verificarToken, teamsController.createTeam)
  .put("/teams/:id", verificarToken, teamsController.updateTeam)
  .delete("/teams/:id", verificarToken, teamsController.deleteTeam)
  .get("/matches", matchesController.getAllMatches)
  .get("/matches/:id", verificarToken, matchesController.getMatchByID)
  .post("/matches", verificarToken, matchesController.createMatch)
  .put("/matches/:id", verificarToken, matchesController.updateMatch)
  .delete("/matches/:id", verificarToken, matchesController.deleteMatch)
  .get("/classifications", classificationsController.getAllClassifications);

module.exports = router;
