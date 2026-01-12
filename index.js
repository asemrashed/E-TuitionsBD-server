const express = require("express");
const cors = require("cors");
require("dotenv").config();
const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");
const admin = require("firebase-admin");
const jwt = require("jsonwebtoken");
const stripe = require('stripe')(`${process.env.STRIPE_SECRET_KEY}`);

const app = express();
const port = process.env.PORT || 5000;

// Middleware
app.use(cors());

const allowedOrigins = [
  "http://localhost:5173",
  "https://e-tuitionsbd.web.app"
];
app.use(cors({
  origin: function (origin, callback) {
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error("CORS not allowed"));
    }
  },
  credentials: true
}));

app.use(express.json());

const FBdecoded = Buffer.from(process.env.FB_SERVICE_KEY, "base64").toString("utf8");
const serviceAccount = JSON.parse(FBdecoded);

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
    next();
  } catch (error) {
    return res.status(401).send({ message: "unauthorized accesss" });
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
    // Update Tuition
app.patch("/tuitions/:id", async (req, res) => {
    try {
        const id = req.params.id;
        const item = req.body;
        const filter = { _id: new ObjectId(id) };
        const updatedDoc = {
            $set: {
                ...item
            }
        }
        const result = await tuitionsCollection.updateOne(filter, updatedDoc);
        res.send(result);
    } catch (error) {
    }
})

// Update Application
app.patch("/applications/:id", async (req, res) => {
    try {
        const id = req.params.id;
        const item = req.body;
        const filter = { _id: new ObjectId(id) };
         const updatedDoc = {
            $set: {
                ...item
            }
        }
        const result = await applicationsCollection.updateOne(filter, updatedDoc);
        res.send(result);
    } catch (error) {
    }
})

const database = client.db("e-tuitionsbd");
const usersCollection = database.collection("users");
const tutorsCollection = database.collection("tutors");
const tuitionsCollection = database.collection("tuitions");
const applicationsCollection = database.collection("applications");
const paymentsCollection = database.collection("payments");

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
app.get("/users", verifyToken, async (req, res) => {
  try {
    const { email } = req.query;
    const query = {};
    if (email) {
      query.email = email;
    }
    if(query.email){
      const result = await usersCollection.findOne(query);
      res.send(result);
    }else{
      const result = await usersCollection.find().toArray();
      res.send(result);
    }
  } catch (err) {
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
  }
});
app.get("/users/:id", async (req, res) => {
  try {
    const query = { _id: new ObjectId(req.params.id) };
    const result = await usersCollection.findOne(query);
    res.send(result);
  } catch (err) {
    res.status(500).send({ message: "Internal server error" });
  }
});
app.patch("/users/:id", async (req, res) => {
  try {
    const query = { _id: new ObjectId(req.params.id) };
    const { status } = req.body;
    const result = await usersCollection.updateOne(query, { $set: { status } });
    res.send(result);
  } catch (err) {
  }
});
app.delete("/users/:id", async (req, res) => {
  try {
    const query = { _id: new ObjectId(req.params.id) };
    const result = await usersCollection.deleteOne(query);
    res.send(result);
  } catch (err) {
  }
});
// check role
app.get("/users/:email/role", async (req, res) => {
  try {
    const { email } = req.params;
    const query = { email };
    const user = await usersCollection.findOne(query);
    res.send(user?.role);
  } catch (err) {
  }
});

// TUITIONS
app.post("/tuitions", async (req, res) => {
    try {
        const item = req.body;
        const result = await tuitionsCollection.insertOne(item);
        res.send(result);
    } catch (err) {
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
    }
});
app.get("/latest-tuitions", async (req, res) => {
    try {
        const limit = parseInt(req.query.limit);
        const query = { status: "approved" };
        const result = await tuitionsCollection.find(query).sort({ createdAt: -1 }).limit(limit).toArray();
        res.send(result);
    } catch (err) {
    }
});
app.get("/tuitions/:id", async (req, res) => {
    try {
        const id = req.params.id;
        const query = { _id: new ObjectId(id) };
        const result = await tuitionsCollection.findOne(query);
        res.send(result);
    } catch (err) {
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
    }
});
app.delete("/tuitions/:id", async (req, res) => {
    try {
        const query = { _id: new ObjectId(req.params.id) };
        const result = await tuitionsCollection.deleteOne(query);
        res.send(result);
    } catch (err) {
    }
});

// Tutors API
app.get('/tutors', async (req, res) => {
  try {
    const { email, limit } = req.query;
    if (email) {
      const result = await tutorsCollection.findOne({ email });
      return res.send(result); 
    }

    let cursor = tutorsCollection.find().sort({ createdAt: -1 });

    if (limit) {
      cursor = cursor.limit(Number(limit));
    }

    const result = await cursor.toArray();
    res.send(result);

  } catch (err) {
    console.error(err);
    res.status(500).send({ error: 'Server error' });
  }
});
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
  }
});
app.get("/tutors/:id", async (req, res) => {
    try {
        const query = { _id: new ObjectId(req.params.id) };
        const result = await tutorsCollection.findOne(query);
        res.send(result);
    } catch (err) {
    }
});
app.patch("/tutors/:id", async (req, res) => {
  try {
    const query = { _id: req.params.id};
    const updatedData = req.body;
    const result = await tutorsCollection.updateOne(query, { $set: updatedData });
    res.send(result);
  } catch (err) {
  }
});
app.delete("/tutors/:id", async (req, res) => {
  try {
    const query = { _id: req.params.id};
    const result = await tutorsCollection.deleteOne(query);
    res.send(result);
  } catch (err) {
  }
});

// Tuition Application
app.post("/applications", async (req, res) => {
    try {
        const newApplication = req.body;
        const result = await applicationsCollection.insertOne(newApplication);
        res.send(result);
    } catch (err) {
    }
});
app.get("/applications", async (req, res) => {
    const email = req.query.email;
    const query = {};
    if(email){
        query.tutorEmail = email;
        query.applicationStatus = "accepted";
    }
    try {
        const result = await applicationsCollection.find(query).sort({ createdAt: -1 }).toArray();
        res.send(result);
    } catch (err) {
    }
});
app.delete("/applications/:id", async (req, res) => {
    try {
        const query = { _id: new ObjectId(req.params.id) };
        const result = await applicationsCollection.deleteOne(query);
        res.send(result);
    } catch (err) {
    }
});

// Payment 
app.post("/payment-checkout-session", async (req, res) => {
  try {
    const paymentInfo = req.body;
    const session = await stripe.checkout.sessions.create({
      line_items: [
        {
          price_data: {
            currency: "bdt",
            product_data: {
              name: 'Pay your tutor to accept the application',
            },
            unit_amount: parseInt(paymentInfo.salary) * 100,
          },
          quantity: 1,
        },
      ],
      customer_email: paymentInfo.studentEmail,
      mode: "payment",
      metadata: {
        applicationId: paymentInfo.applicationId,
        tutoringTime: paymentInfo.tutoringTime,
        tutorEmail: paymentInfo.tutorEmail,
      },
      success_url: `${process.env.SITE_DOMAIN}/dashboard/payment-success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${process.env.SITE_DOMAIN}/dashboard/payment-cancelled`,
    });
    return res.send({ url: session.url });
  } catch (err) {
    return res.status(500).send({ success: false });
  }
});
app.get("/payments", async (req, res) => {
    const {email, role} = req.query;
    const query = {};
    if(email){
        if(role === 'tutor') {
            query.tutorEmail = email;
        } else {
            query.studentEmail = email;
        }
    }
    
    try {
        const result = await paymentsCollection.find(query).sort({ createdAt: -1 }).toArray();
        res.send(result);
    } catch (err) {
        res.status(500).send({ message: "Error fetching payments" });
    }
});

// Admin Stats
app.get("/admin-stats", async (req, res) => {
    try {
        const totalStudents = await usersCollection.countDocuments({ role: 'student' });
        const totalTutors = await usersCollection.countDocuments({ role: 'tutor' });
        const totalTuitions = await tuitionsCollection.countDocuments();
        
        const payments = await paymentsCollection.find().toArray();
        const totalRevenue = payments.reduce((sum, item) => sum + (item.amount || 0), 0); // amount is in cents usually? 
        
        const revenueHistory = await paymentsCollection.aggregate([
          {
            $group: {
              _id: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt" } },
              revenue: { $sum: "$amount" }
            }
          },
          { $sort: { _id: 1 } }
        ]).toArray();

        res.send({
            totalStudents,
            totalTutors,
            totalTuitions,
            totalRevenue, 
            revenueHistory
        });
    } catch (err) {
        res.status(500).send({ message: "Error fetching stats" });
    }
});
app.patch("/payment-success", async (req, res) => {
    try {
        const { sessionId } = req.query;
        const session = await stripe.checkout.sessions.retrieve(sessionId);
        const metadata = session.metadata;
        const paymentStatus = session.payment_status;
        const transactionId = session.payment_intent;
        if(paymentStatus === "paid"){
            const paymentInfo = {
                applicationId: metadata.applicationId,
                studentEmail: session.customer_email,
                tutorEmail: session.metadata.tutorEmail,
                amount: session.amount_total,
                currency: session.currency,
                tutoringTime: session.metadata.tutoringTime,
                paymentStatus: paymentStatus,
                transectionId: transactionId,
                createdAt: new Date(),
            }
            const payment = await paymentsCollection.insertOne(paymentInfo);
            const result = await applicationsCollection.updateOne({ _id: new ObjectId(metadata.applicationId) }, { $set: { applicationStatus: "accepted" } });
            res.send(result);
        }
        else{
            res.send({ success: false });
        }
    } catch (err) {
        res.status(500).send({ success: false });
    }
});

app.listen(port, () => {
    console.log(`Server is running on port ${port}`);
})
  })