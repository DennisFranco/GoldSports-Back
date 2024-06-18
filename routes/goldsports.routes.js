const express = require("express");
const router = express.Router();
const jwt = require("jsonwebtoken");
const usersController = require("./controllers/usersController.js");

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
  .get("/roles", verificarToken, usersController.getAllRoles)

module.exports = router;
