import express from 'express';
import { createServer as createViteServer } from 'vite';
import path from 'path';
import { google } from 'googleapis';
import admin from 'firebase-admin';
import { getFirestore } from 'firebase-admin/firestore';
import { fileURLToPath } from 'url';
import fs from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load Firebase Config
const firebaseConfigPath = path.join(__dirname, 'firebase-applet-config.json');
let firebaseConfig: any = {};
try {
  if (fs.existsSync(firebaseConfigPath)) {
    firebaseConfig = JSON.parse(fs.readFileSync(firebaseConfigPath, 'utf8'));
    console.log('Firebase config loaded successfully');
  } else {
    console.error('Firebase config file not found at:', firebaseConfigPath);
  }
} catch (error) {
  console.error('Error loading Firebase config:', error);
}

// Initialize Firebase Admin
if (!admin.apps.length) {
  const projectId = firebaseConfig.projectId;
  console.log('Initializing Firebase Admin with project ID:', projectId);
  admin.initializeApp({
    projectId: projectId,
  });
}

const databaseId = firebaseConfig.firestoreDatabaseId || '(default)';
console.log('Connecting to Firestore database:', databaseId);
const db = getFirestore(databaseId);

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // Test Firestore connection on startup
  try {
    console.log('Testing Firestore connection...');
    await db.collection('projects').limit(1).get();
    console.log('Firestore connection successful');
  } catch (error) {
    console.error('Firestore connection test failed:', error);
  }

  // API Routes
  app.get('/api/debug/status', (req, res) => {
    res.json({
      projectId: firebaseConfig.projectId,
      databaseId,
      env: {
        GOOGLE_CLOUD_PROJECT: process.env.GOOGLE_CLOUD_PROJECT,
        FIREBASE_PROJECT_ID: process.env.FIREBASE_PROJECT_ID,
      },
      firebaseConfigExists: fs.existsSync(firebaseConfigPath),
    });
  });

  app.post('/api/import-budget', async (req, res) => {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const idToken = authHeader.split('Bearer ')[1];
    try {
      const decodedToken = await admin.auth().verifyIdToken(idToken);
      const userDoc = await db.collection('users').doc(decodedToken.uid).get();
      const userData = userDoc.data();

      if (!userData || userData.role !== 'admin') {
        return res.status(403).json({ error: 'Forbidden' });
      }

      const budgetDataPath = path.join(__dirname, 'budget_data.json');
      if (!fs.existsSync(budgetDataPath)) {
        return res.status(404).json({ error: 'Budget data file not found' });
      }

      const budgetData = JSON.parse(fs.readFileSync(budgetDataPath, 'utf8'));
      const batch = db.batch();
      const importDate = new Date().toISOString();

      budgetData.forEach((item: any, index: number) => {
        const importRef = db.collection('budget_imports').doc();
        batch.set(importRef, {
          ...item,
          importDate,
          id: importRef.id
        });
      });

      await batch.commit();
      res.json({ message: `Successfully imported ${budgetData.length} budget records` });
    } catch (error) {
      console.error('Import error:', error);
      res.status(500).json({ error: 'Internal Server Error' });
    }
  });

  app.post('/api/sync', async (req, res) => {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const idToken = authHeader.split('Bearer ')[1];
    try {
      const decodedToken = await admin.auth().verifyIdToken(idToken);
      const userDoc = await db.collection('users').doc(decodedToken.uid).get();
      const userData = userDoc.data();

      if (!userData || userData.role !== 'admin') {
        return res.status(403).json({ error: 'Forbidden' });
      }

      // Google Sheets Sync Logic
      const sheetId = process.env.GOOGLE_SHEETS_ID;
      const serviceAccountKey = process.env.GOOGLE_SERVICE_ACCOUNT_KEY;

      if (!sheetId || !serviceAccountKey) {
        return res.status(500).json({ error: 'Google Sheets configuration missing' });
      }

      const auth = new google.auth.GoogleAuth({
        credentials: JSON.parse(serviceAccountKey),
        scopes: ['https://www.googleapis.com/auth/spreadsheets.readonly'],
      });

      const sheets = google.sheets({ version: 'v4', auth });
      const response = await sheets.spreadsheets.values.get({
        spreadsheetId: sheetId,
        range: 'Sheet1!A2:I', // Adjust range as needed
      });

      const rows = response.data.values;
      if (!rows || rows.length === 0) {
        return res.json({ message: 'No data found in Google Sheets' });
      }

      const batch = db.batch();
      rows.forEach((row) => {
        const [id, name, type, budget, status, progress, lat, lng, updatedAt] = row;
        const projectRef = db.collection('projects').doc(id);
        batch.set(projectRef, {
          id,
          name,
          type,
          budget: parseFloat(budget) || 0,
          status,
          progress: parseInt(progress) || 0,
          lat: parseFloat(lat) || 0,
          lng: parseFloat(lng) || 0,
          updatedAt: updatedAt || new Date().toISOString(),
        });
      });

      await batch.commit();
      res.json({ message: `Successfully synced ${rows.length} projects` });
    } catch (error) {
      console.error('Sync error:', error);
      res.status(500).json({ error: 'Internal Server Error' });
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
