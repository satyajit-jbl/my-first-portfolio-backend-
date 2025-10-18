import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import { MongoClient, ObjectId } from "mongodb";

dotenv.config();

const app = express();
app.use(express.json());

// ---- CORS config (dev vs prod) ----
const DEV_ORIGINS = ["http://localhost:5173", "http://localhost:5174"];
const PROD_ORIGINS = process.env.PROD_FRONTEND_ORIGINS // optional comma separated e.g. "https://satyajit-ghosh.netlify.app"
  ? process.env.PROD_FRONTEND_ORIGINS.split(",")
  : ["https://satyajit-ghosh.netlify.app"];

const allowedOrigins = process.env.NODE_ENV === "production" ? PROD_ORIGINS : DEV_ORIGINS;

app.use(cors({
  origin: allowedOrigins,
  methods: ["GET", "POST", "PUT", "DELETE"],
  credentials: true,
}));

// ---- MongoDB setup ----
const MONGODB_URI = process.env.MONGODB_URI;
const client = new MongoClient(MONGODB_URI);

const DB_NAME = "marathonDB";
let eventsCollection;

async function initDB() {
  try {
    await client.connect();
    const db = client.db(DB_NAME);
    eventsCollection = db.collection("events");
    console.log("✅ MongoDB connected");
  } catch (err) {
    console.error("❌ MongoDB connection error:", err);
    process.exit(1);
  }
}
initDB();

// ---- Admin middleware ----
function adminAuth(req, res, next) {
  const adminSecret = req.headers["x-admin-secret"];
  if (!adminSecret || adminSecret !== process.env.ADMIN_SECRET) {
    return res.status(403).json({ error: "❌ Unauthorized: Admin password required" });
  }
  next();
}

// ---- Helper: normalize date sort if date stored as string ----
function sortByDateAscending(arr) {
  return arr.sort((a, b) => new Date(a.date) - new Date(b.date));
}

/*
Event document structure (in MongoDB):
{
  _id,
  name, date, location, distance, organizer, registrationDeadline, registrationLink,
  isApproved: boolean,          // true only when admin approved
  pendingAction: null|'create'|'update'|'delete',  // pending action
  pendingData: object|null,     // for updates or create content
  createdAt, updatedAt
}
*/

// ----------------- PUBLIC / USER ROUTES -----------------

// Submit new event (will be pending approval)
// This stores event in pendingData with pendingAction 'create'
app.post("/api/events", async (req, res) => {
  try {
    const payload = req.body;
    const doc = {
      // Basic stored fields: keep them empty or same as pendingData — but for clarity we'll store minimal base
      name: payload.name || "",
      date: payload.date || "",
      location: payload.location || "",
      distance: payload.distance || "",
      organizer: payload.organizer || "",
      registrationDeadline: payload.registrationDeadline || "",
      registrationLink: payload.registrationLink || "",
      isApproved: false,
      pendingAction: "create",
      pendingData: {
        name: payload.name,
        date: payload.date,
        location: payload.location,
        distance: payload.distance,
        organizer: payload.organizer,
        registrationDeadline: payload.registrationDeadline,
        registrationLink: payload.registrationLink,
      },
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const result = await eventsCollection.insertOne(doc);
    res.json({ message: "⚡ Event submitted — pending admin approval", id: result.insertedId });
  } catch (err) {
    console.error("❌ Error submitting event:", err);
    res.status(500).json({ error: "Failed to submit event" });
  }
});

// Request update: store pending update in pendingData and set pendingAction 'update'
app.put("/api/events/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const updateData = req.body;
    await eventsCollection.updateOne(
      { _id: new ObjectId(id) },
      {
        $set: {
          pendingAction: "update",
          pendingData: updateData,
          updatedAt: new Date(),
        },
      }
    );
    res.json({ message: "⚡ Update submitted — pending admin approval" });
  } catch (err) {
    console.error("❌ Error submitting update:", err);
    res.status(500).json({ error: "Failed to submit update" });
  }
});

// Request delete: mark pendingAction 'delete' (do not delete until admin approves)
app.delete("/api/events/:id/request", async (req, res) => {
  try {
    const { id } = req.params;
    await eventsCollection.updateOne(
      { _id: new ObjectId(id) },
      {
        $set: {
          pendingAction: "delete",
          updatedAt: new Date(),
        },
      }
    );
    res.json({ message: "⚡ Deletion requested — pending admin approval" });
  } catch (err) {
    console.error("❌ Error requesting delete:", err);
    res.status(500).json({ error: "Failed to request deletion" });
  }
});

// Fetch only approved events (public listing) — returns merged document for items which were created and approved or updated & approved
app.get("/api/events", async (req, res) => {
  try {
    // approved events (isApproved true)
    const events = await eventsCollection.find({ isApproved: true }).toArray();
    const sorted = sortByDateAscending(events);
    res.json(sorted);
  } catch (err) {
    console.error("❌ Error fetching approved events:", err);
    res.status(500).json({ error: "Failed to fetch events" });
  }
});

// ----------------- ADMIN ROUTES -----------------

// Get pending items (create/update/delete)
app.get("/api/events/pending", adminAuth, async (req, res) => {
  try {
    const pendings = await eventsCollection
      .find({ pendingAction: { $in: ["create", "update", "delete"] } })
      .sort({ updatedAt: 1 })
      .toArray();
    res.json(pendings);
  } catch (err) {
    console.error("❌ Error fetching pending events:", err);
    res.status(500).json({ error: "Failed to fetch pending events" });
  }
});

// Approve a pending action (create/update/delete)
app.put("/api/events/:id/approve", adminAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const event = await eventsCollection.findOne({ _id: new ObjectId(id) });
    if (!event) return res.status(404).json({ error: "Not found" });

    const { pendingAction, pendingData } = event;

    if (pendingAction === "create") {
      // Apply pendingData to base fields and mark approved
      await eventsCollection.updateOne(
        { _id: new ObjectId(id) },
        {
          $set: {
            ...pendingData,
            isApproved: true,
            pendingAction: null,
            pendingData: null,
            updatedAt: new Date(),
          },
        }
      );
      return res.json({ message: "✅ New event approved and published" });
    } else if (pendingAction === "update") {
      // Merge pendingData into main fields and mark approved (do not change createdAt)
      await eventsCollection.updateOne(
        { _id: new ObjectId(id) },
        {
          $set: {
            ...pendingData,
            isApproved: true,
            pendingAction: null,
            pendingData: null,
            updatedAt: new Date(),
          },
        }
      );
      return res.json({ message: "✅ Update approved and saved" });
    } else if (pendingAction === "delete") {
      // Delete the document
      await eventsCollection.deleteOne({ _id: new ObjectId(id) });
      return res.json({ message: "🚫 Deletion approved — event removed" });
    } else {
      return res.status(400).json({ error: "No pending action found" });
    }
  } catch (err) {
    console.error("❌ Error approving pending action:", err);
    res.status(500).json({ error: "Failed to approve pending action" });
  }
});

// Reject a pending action (admin can reject and clear pendingAction; for deletes, keep original; for creates, remove doc)
app.delete("/api/events/:id/reject", adminAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const event = await eventsCollection.findOne({ _id: new ObjectId(id) });
    if (!event) return res.status(404).json({ error: "Not found" });

    const { pendingAction } = event;
    if (pendingAction === "create") {
      // If create was rejected: remove the doc
      await eventsCollection.deleteOne({ _id: new ObjectId(id) });
      return res.json({ message: "❌ Create request rejected — removed" });
    } else {
      // For update/delete: clear pendingAction & pendingData and do not change original fields
      await eventsCollection.updateOne(
        { _id: new ObjectId(id) },
        { $set: { pendingAction: null, pendingData: null, updatedAt: new Date() } }
      );
      return res.json({ message: "❌ Pending request rejected" });
    }
  } catch (err) {
    console.error("❌ Error rejecting pending action:", err);
    res.status(500).json({ error: "Failed to reject pending action" });
  }
});

// Simple root
app.get("/", (req, res) => res.send("🎯 Marathon API is running..."));

// Start
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`✅ Server running on port ${PORT}`));
