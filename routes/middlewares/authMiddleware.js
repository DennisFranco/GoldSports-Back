const jwt = require("jsonwebtoken");

const verifyToken = (req, res, next) => {
  const bearerHeader = req.headers["authorization"];

  if (!bearerHeader) {
    return res.status(403).json({ message: "Acceso denegado, token requerido" });
  }

  const bearerToken = bearerHeader.split(" ")[1];

  jwt.verify(bearerToken, process.env.SECRET_KEY, (err, decoded) => {
    if (err) {
      return res.status(403).json({ message: "Token inválido o expirado" });
    }

    req.user = decoded.user;
    next();
  });
};

module.exports = verifyToken;
