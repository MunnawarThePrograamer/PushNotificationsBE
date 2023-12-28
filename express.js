const express = require('express');
const bodyParser = require('body-parser');
const { Expo } = require('expo-server-sdk');
const { initializeApp } = require('firebase/app');
const { getFirestore, collection, addDoc, getDocs, query, where } = require('firebase/firestore');
const cors = require('cors');


const app = express();
const port = 3000;
app.use(cors());
const firebaseConfig = {
  apiKey: "AIzaSyB2dIaZU3XDaVezWV7ULFb85eiyUmyRB2o",
  authDomain: "pushnotificationbe.firebaseapp.com",
  projectId: "pushnotificationbe",
  storageBucket: "pushnotificationbe.appspot.com",
  messagingSenderId: "520139186719",
  appId: "1:520139186719:web:1b3e62f15f8bc507bf2b2a"
};
const firebaseApp = initializeApp(firebaseConfig);
const db = getFirestore(firebaseApp);

const expo = new Expo();

// Use middleware to parse JSON and urlencoded request bodies
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// Endpoint to store data in Firestore
app.post('/storeData', async (req, res) => {
  try {
    const { id, pushToken } = req.body;

    // Add the data to Firestore
    const docRef = await addDoc(collection(db, 'yourCollectionName'), {
      id,
      pushToken,
    });

    console.log('Document written with ID: ', docRef.id);

    res.status(201).json({ success: true, message: 'Data stored successfully' });
  } catch (error) {
    console.error('Error storing data: ', error);
    res.status(500).json({ success: false, error: 'Internal Server Error' });
  }
});

// Endpoint to get push token based on ID
app.get('/getPushToken/:id', async (req, res) => {
  try {
    const id = req.params.id;

    // Query Firestore to get push token based on ID
    const q = query(collection(db, 'yourCollectionName'), where('id', '==', id));
    const querySnapshot = await getDocs(q);

    if (querySnapshot.empty) {
      res.status(404).json({ success: false, error: 'ID not found' });
    } else {
      const data = querySnapshot.docs[0].data();
      res.status(200).json({ success: true, pushToken: data.pushToken });
    }
  } catch (error) {
    console.error('Error getting push token: ', error);
    res.status(500).json({ success: false, error: 'Internal Server Error' });
  }
});

// Endpoint to trigger the push notification process
app.post('/send-push-notifications', async (req, res) => {
  try {
    const somePushTokens = req.body.somePushTokens;
    const message = req.body.notificationMessage;
console.log(somePushTokens)
    let messages = [];

    for (let pushToken of somePushTokens) {
      if (!Expo.isExpoPushToken(pushToken)) {
        console.error(`Push token ${pushToken} is not a valid Expo push token`);
        continue;
      }

      messages.push({
        to: pushToken,
        sound: 'default',
        body: 'This is a test notification',
        data: {message},
      });
    }

    let chunks = expo.chunkPushNotifications(messages);
    let tickets = [];

    for (let chunk of chunks) {
      try {
        let ticketChunk = await expo.sendPushNotificationsAsync(chunk);
        console.log(ticketChunk);
        tickets.push(...ticketChunk);
      } catch (error) {
        console.error(error);
      }
    }

    res.json({ success: true, message: 'Push notifications sent successfully.' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: 'Internal server error.' });
  }
});

// Endpoint to retrieve push notification receipts
app.get('/get-receipts', async (req, res) => {
  try {
    let receiptIds = tickets.filter((ticket) => ticket.id).map((ticket) => ticket.id);
    let receiptIdChunks = expo.chunkPushNotificationReceiptIds(receiptIds);

    for (let chunk of receiptIdChunks) {
      try {
        let receipts = await expo.getPushNotificationReceiptsAsync(chunk);
        console.log(receipts);

        for (let receiptId in receipts) {
          let { status, message, details } = receipts[receiptId];
          if (status === 'ok') {
            continue;
          } else if (status === 'error') {
            console.error(`There was an error sending a notification: ${message}`);
            if (details && details.error) {
              console.error(`The error code is ${details.error}`);
            }
          }
        }
      } catch (error) {
        console.error(error);
      }
    }

    res.json({ success: true, message: 'Receipts retrieved successfully.' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: 'Internal server error.' });
  }
});

app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});
