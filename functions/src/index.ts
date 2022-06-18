import * as functions from "firebase-functions";
import * as admin from 'firebase-admin';
import * as express from 'express';
import * as firebase from "firebase/app";
import { getAuth, createUserWithEmailAndPassword } from "firebase/auth";
import firebaseConfig from '../../config'

const app = express();

admin.initializeApp();

firebase.initializeApp(firebaseConfig);

const auth = getAuth();

const db = admin.firestore();

app.get('/screams', (req, res) => {
  db
    .collection('screams')
    .orderBy('createdAt', 'desc')
    .get()
    .then(data => {
      let screams: admin.firestore.DocumentData[] = [];
      data.forEach(doc => {
        screams.push({
          screamId: doc.id,
          body: doc.data().body,
          userHandle: doc.data().userHandle,
          createdAt: doc.data().createdAt
        });
      })
      return res.json(screams);
    })
    .catch(err => console.log(err))
})

app.post('/scream', (req, res) => {

  const newScream = {
    body: req.body.body,
    userHandle: req.body.userHandle,
    createdAt: new Date().toISOString()
  }
  db
    .collection('screams').add(newScream).then((doc) => {
      res.json({ message: `document ${doc.id} created successfully` });
    })
    .catch(err => {
      res.status(500).json({ error: 'something went wrong' })
      console.error(err);
    })
});

// Sign up route

app.post('/signup', (req, res) => {
  const newUser = {
    email: req.body.email,
    password: req.body.password,
    confirmPassword: req.body.confirmPassword,
    handle: req.body.handle,
  };

  // TODO validate data
  let token: string, userId: string;

  db.doc(`/users/${newUser.handle}`).get()
    .then(doc => {
      if (doc.exists) {
        res.status(400).json({ handle: 'This handle is already taken' });
        return Promise.reject();
      } else {
        return createUserWithEmailAndPassword(auth, newUser.email, newUser.password);
      }
    })
    .then(data => {
      userId = data.user.uid;
      return data?.user.getIdToken();
    })
    .then(idToken => {
      token = idToken;
      const userCredentials = {
        handle: newUser.handle,
        email: newUser.email,
        createdAt: new Date().toISOString(),
        userId
      }
      return db.doc(`/users/${newUser.handle}`).set(userCredentials)
    })
    .then(() => {
      return res.status(201).json({ token });
    })
    .catch(err => {
      console.error(err);
      if (err.code === 'auth/email-already-in-use') {
        return res.status(400).json({ email: 'email already in use' });
      } else {
        return res.status(500).json({ error: err.code });
      }

    })

})

//  createUserWithEmailAndPassword(auth, newUser.email, newUser.password)
//   .then(data => {
//     return res.status(201).json({ message: `user ${data.user.uid} signed up successfully`})
//   })
//   .catch(err => {
//     console.error(err);
//     return res.status(500).json({ error: err.code });
//   })


export const api = functions.region('southamerica-east1').https.onRequest(app);