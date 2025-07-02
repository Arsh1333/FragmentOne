import { useState, useEffect } from "react";
import { db, auth } from "./firebase";
import {
  collection,
  addDoc,
  serverTimestamp,
  where,
  getDocs,
  query,
  Timestamp,
} from "firebase/firestore";
import { onAuthStateChanged } from "firebase/auth";
import { deleteDoc, doc } from "firebase/firestore";

import "./App.css";

function App() {
  const [fragment, setFragment] = useState("");
  const [submit, setSubmit] = useState(false);
  const [receivedFragment, setReceivedFragment] = useState(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!fragment.trim()) return;

    try {
      await addDoc(collection(db, "fragments"), {
        text: fragment,
        userId: auth.currentUser.uid,
        createdAt: serverTimestamp(),
      });

      const todayMidnight = new Date();
      todayMidnight.setHours(0, 0, 0, 0);
      const todayTimestamp = Timestamp.fromDate(todayMidnight);

      const q = query(
        collection(db, "fragments"),
        where("createdAt", ">=", todayTimestamp)
      );
      const snapshot = await getDocs(q);

      const otherFragments = snapshot.docs.filter(
        (doc) => doc.data().userId !== auth.currentUser.uid
      );

      let received = "";
      if (otherFragments.length > 0) {
        const randomDoc =
          otherFragments[Math.floor(Math.random() * otherFragments.length)];
        received = randomDoc.data().text;
      } else {
        received =
          "You're the first soul here today. 🌿 Check again later — another heart will speak soon.";
      }

      setReceivedFragment(received);
      localStorage.setItem(
        "receivedFragment",
        JSON.stringify({
          text: received,
          date: new Date().toDateString(),
        })
      );

      setSubmit(true);
      setFragment("");
    } catch (error) {
      console.log("Error while creating your fragment ", error);
    }
  };

  useEffect(() => {
    const saved = localStorage.getItem("receivedFragment");

    const tryToGetNewFragment = async (user) => {
      const todayMidnight = new Date();
      todayMidnight.setHours(0, 0, 0, 0);
      const todayTimestamp = Timestamp.fromDate(todayMidnight);

      const q = query(
        collection(db, "fragments"),
        where("createdAt", ">=", todayTimestamp)
      );

      const snapshot = await getDocs(q);

      const otherFragments = snapshot.docs.filter(
        (doc) => doc.data().userId !== user.uid
      );

      let text;
      if (otherFragments.length > 0) {
        const randomDoc =
          otherFragments[Math.floor(Math.random() * otherFragments.length)];
        text = randomDoc.data().text;
      } else {
        text =
          "You're the first soul here today. 🌿 Check again later — another heart will speak soon.";
      }

      setReceivedFragment(text);
      localStorage.setItem(
        "receivedFragment",
        JSON.stringify({
          text,
          date: new Date().toDateString(),
        })
      );
    };

    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (!user) return;

      const todayMidnight = new Date();
      todayMidnight.setHours(0, 0, 0, 0);
      const todayTimestamp = Timestamp.fromDate(todayMidnight);

      const q = query(
        collection(db, "fragments"),
        where("userId", "==", user.uid),
        where("createdAt", ">=", todayTimestamp)
      );

      const snapshot = await getDocs(q);

      if (!snapshot.empty) {
        setSubmit(true);

        const fallbackText =
          "You're the first soul here today. 🌿 Check again later — another heart will speak soon.";

        let shouldFetch = true;

        if (saved) {
          const { text, date } = JSON.parse(saved);
          if (date === new Date().toDateString()) {
            setReceivedFragment(text);
            if (text !== fallbackText) {
              shouldFetch = false;
            }
          } else {
            localStorage.removeItem("receivedFragment");
          }
        }

        if (shouldFetch) {
          await tryToGetNewFragment(user);
        }
      }
    });

    return () => unsubscribe();
  }, []);

  useEffect(() => {
    const cleanOldFragments = async () => {
      const lastCleanupDate = localStorage.getItem("lastCleanupDate");
      const today = new Date().toDateString();

      if (lastCleanupDate === today) return; // Already cleaned today

      const todayMidnight = new Date();
      todayMidnight.setHours(0, 0, 0, 0);
      const todayTimestamp = Timestamp.fromDate(todayMidnight);

      const q = query(
        collection(db, "fragments"),
        where("createdAt", "<", todayTimestamp)
      );

      try {
        const snapshot = await getDocs(q);
        const deletePromises = snapshot.docs.map((docSnap) =>
          deleteDoc(doc(db, "fragments", docSnap.id))
        );
        await Promise.all(deletePromises);
        console.log("Old fragments deleted.");

        localStorage.setItem("lastCleanupDate", today);
      } catch (err) {
        console.log("Error deleting old fragments", err);
      }
    };

    cleanOldFragments();
  }, []);

  return (
    <>
      <h1>Fragment One </h1>
      {submit ? (
        <>
          <p>Thank you 🌿 You’ve sent your fragment for today.</p>
          {receivedFragment && (
            <div className="received-fragment">
              <h3 className="soul">From another soul:</h3>
              <p>“{receivedFragment}”</p>
            </div>
          )}
        </>
      ) : (
        <form onSubmit={handleSubmit}>
          <label>Leave Your Fragment Here... 🌿</label>
          <input
            type="text"
            value={fragment}
            onChange={(e) => setFragment(e.target.value)}
            id="fragment"
          />
          <button className="btn" type="submit">
            Submit
          </button>
        </form>
      )}
    </>
  );
}

export default App;
