const express = require("express");
const { open } = require("sqlite");
const sqlite3 = require("sqlite3");
const path = require("path");
const jwt = require("jsonwebtoken");
const bcrypt = require("bcrypt");

const dbPath = path.join(__dirname, "covid19IndiaPortal.db");

const app = express();

app.use(express.json());

let db = null;

const initializeDbAndServer = async () => {
  try {
    db = await open({
      filename: dbPath,
      driver: sqlite3.Database,
    });
    app.listen(3000, () => {
      console.log("Server running at 3000");
    });
  } catch (e) {
    console.log(`db error ${e.message}`);
    process.exit(1);
  }
};

initializeDbAndServer();

const authenticate = (request, response, next) => {
  let jwtToken;
  const authHeader = request.headers["authorization"];
  if (authHeader !== undefined) {
    jwtToken = authHeader.split(" ")[1];
  }
  if (authHeader == undefined) {
    response.status(400);
    response.send("Invalid JWT Token");
  } else {
    jwt.verify(jwtToken, "Secret_key", (error, payload) => {
      if (error) {
        response.status(400);
        response.send("Invalid JWT Token");
      } else {
        request.username = payload.username;
        next();
      }
    });
  }
};

app.post("/login", async (request, response) => {
  const { username, password } = request.body;
  const userQuery = `
  SELECT * FROM user
  WHERE
  username='${username}'
  `;
  const dbUser = await db.get(userQuery);

  if (dbUser == undefined) {
    response.status(401);
    response.send("Invalid user");
  }
  if (dbUser !== undefined) {
    const isPassMatched = await bcrypt.compare(password, dbUser.password);
    if (isPassMatched == true) {
      const payload = {
        username: username,
      };
      const jwtToken = jwt.sign(payload, "Secret_key");
      response.send({ jwtToken });
    } else {
      response.status(401);
      response.send("Invalid password");
    }
  }
});

const dbToResponse = (eachOne) => {
  return {
    stateId: eachOne.state_id,
    stateName: eachOne.state_name,
    population: eachOne.population,
  };
};

app.get("/states/", authenticate, async (request, response) => {
  const { username } = request;
  const getAllStates = `
  SELECT * FROM state`;

  const getStates = await db.all(getAllStates);
  response.send(getStates.map((each) => dbToResponse(each)));
});
