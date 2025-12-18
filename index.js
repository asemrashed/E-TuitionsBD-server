const express = require("express");
const cors = require("cors");
require("dotenv").config();
const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");
const admin = require("firebase-admin");
const jwt = require("jsonwebtoken");

const app = express();
const port = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json());

const serviceAccount = require("./e-tuitionsbd-firebase-adminsdk.json");

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
});

const verifyToken = async (req, res, next) => {
  const token = req.headers?.authorization?.split(" ")[1];
  if (!token) {
    return res.status(401).send({ message: "unauthorized access" });
  }
  try {
    const decodedToken = await admin.auth().verifyIdToken(token);
    req.decodedEmail = decodedToken.email;
    console.log('eamil', decodedToken.email);
    next();
  } catch (error) {
    return res.status(401).send({ message: "unauthorized access" });
  }
};

const verifyJWTToken = (req, res, next) => {
  const header = req.headers.authorization;
  if (!header) {
    return res.status(401).send({ message: "Unauthorized access, no header" });
  }
  const token = header.split(" ")[1];
  if (!token) {
    return res.status(401).send({ messagae: "Unauthorized access, no entry" });
  }

  jwt.verify(token, process.env.JWT_SECRET, function (err, decoded) {
    if (err) {
      return res.status(401).send({ messagae: "Unauthorized access" });
    }
    req.decoded_email = decoded.email;
    next();
  });
};

const uri = process.env.DB_URI;

const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  },
});

client
  .connect()
  .then(() => {
    app.listen(port, () => {
      console.log("E-TuitionsBD server running on port:", port);
    });
  })
  .catch(err => console.log(err));

const database = client.db("e-tuitionsbd");
const usersCollection = database.collection("users");
const tutorsCollection = database.collection("tutors");
const tuitionsCollection = database.collection("tuitions");

app.post("/getToken", async (req, res) => {
  const email = req.decodedEmail
  const token = jwt.sign({email}, process.env.JWT_SECRET, {
    expiresIn: "7d"
  });
  res.send({ token: token });
});

app.get("/", (req, res) => {
  res.send("E-TuitionsBD Server is running");
});

// USERS
app.post("/users", async (req, res) => {
  const newUser = req.body;
  const query = { email: newUser.email };
  const existingUser = await usersCollection.findOne(query);
  if (existingUser) {
    return res.send({ message: "User already exists" });
  }
  const result = await usersCollection.insertOne(newUser);
  res.send(result);
});

// ... users endpoints ...
app.get("/users", verifyToken, async (req, res) => {
  try {
    const { email } = req.query;
    const query = {};
    if (email) {
      query.email = email;
    }
    const result = await usersCollection.find(query).toArray();
    res.send(result);
  } catch (err) {
    console.log(err);
    res.status(500).send({ message: "Internal server error" });
  }
});
app.get("/users/me", async (req, res) => {
    const query = { email: req.query.email };
    const result = await usersCollection.findOne(query);
    res.send(result);
});
app.patch("/users/me", async (req, res) => {
  try {
    const {email} = req.query
    const data = req.body;
    const query = { email: email };
    const result = await usersCollection.updateOne(query, { $set: data });
    res.send(result);
  } catch (err) {
    console.log(err);
  }
});
app.patch("/users/:id", async (req, res) => {
  try {
    const query = { _id: new ObjectId(req.params.id) };
    const { status } = req.body;
    const result = await usersCollection.updateOne(query, { $set: { status } });
    res.send(result);
  } catch (err) {
    console.log(err);
  }
});
app.delete("/users/:id", async (req, res) => {
  try {
    const query = { _id: new ObjectId(req.params.id) };
    const result = await usersCollection.deleteOne(query);
    res.send(result);
  } catch (err) {
    console.log(err);
  }
});

// TUITIONS
app.post("/tuitions", async (req, res) => {
    try {
        const item = req.body;
        const result = await tuitionsCollection.insertOne(item);
        res.send(result);
    } catch (err) {
        console.log(err);
    }
});

app.get("/tuitions", async (req, res) => {
    try {
        let query = {};
        if (req.query.email) {
            query = { tutorEmail: req.query.email };
        }
        const result = await tuitionsCollection.find(query).sort({ createdAt: -1 }).toArray();
        res.send(result);
    } catch (err) {
        console.log(err);
    }
});
app.get("/latest-tuitions", async (req, res) => {
    try {
        const limit = parseInt(req.query.limit);
        const query = { status: "approved" };
        const result = await tuitionsCollection.find(query).sort({ createdAt: -1 }).limit(limit).toArray();
        res.send(result);
    } catch (err) {
        console.log(err);
    }
});
// tuitions status update
app.patch("/tuitions/:id", async (req, res) => {
    try {
        const query = { _id: new ObjectId(req.params.id) };
        const { status } = req.body;
        const result = await tuitionsCollection.updateOne(query, { $set: { status } });
        res.send(result);
    } catch (err) {
        console.log(err);
    }
});
app.delete("/tuitions/:id", async (req, res) => {
    try {
        const query = { _id: new ObjectId(req.params.id) };
        const result = await tuitionsCollection.deleteOne(query);
        res.send(result);
    } catch (err) {
        console.log(err);
    }
});

// Tutors API
app.get('/tutors', async (req, res) => {
  const query={};
  const limit = parseInt(req.query.limit);
  if(limit){
    query.limit= limit;
  }
    try {
        const result = await tutorsCollection.find().limit(limit).sort({ createdAt: -1 }).toArray();
        res.send(result);
    } catch (err) {
        console.log(err);
    }
})
app.post("/tutors", async (req, res) => {
  const {email} = req.body ;
  if(email){
    const query = {email: email};
    const existingTutor = await tutorsCollection.findOne(query);
    if(existingTutor){
      return res.status(400).send({message: "Tutor already exists"});
    } 
  }
    try {
        const newTutor = req.body;
        const result = await tutorsCollection.insertOne(newTutor);
        res.send(result);
    } catch (err) {
        console.log(err);
    }
});