// Import Firebase SDKs
import { initializeApp } from "https://www.gstatic.com/firebasejs/9.17.1/firebase-app.js";
import { getFirestore, collection, addDoc, getDocs, query, orderBy, where, Timestamp } from "https://www.gstatic.com/firebasejs/9.17.1/firebase-firestore.js";
import { getStorage, ref, uploadBytes, getDownloadURL } from "https://www.gstatic.com/firebasejs/9.17.1/firebase-storage.js";
import { getAuth, createUserWithEmailAndPassword, signInWithEmailAndPassword, signOut, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/9.17.1/firebase-auth.js";

// Firebase configuration (keep your existing config)
const firebaseConfig = {
    apiKey: "AIzaSyAzFCZ6Q8WsNZ1wPIONfbkkUbUwsnkVEa0",
    authDomain: "campusevents-8f065.firebaseapp.com",
    projectId: "campusevents-8f065",
    storageBucket: "campusevents-8f065.appspot.com",
    messagingSenderId: "807397536203",
    appId: "1:807397536203:web:ff90bca540e7d6b971864e",
    measurementId: "G-SZ6P7DLDRL"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const storage = getStorage(app);
const auth = getAuth(app);

// DOM Elements
const loginModal = document.getElementById('loginModal');
const signupModal = document.getElementById('signupModal');
const loginBtn = document.getElementById('loginBtn');
const showSignupLink = document.getElementById('showSignup');
const loginForm = document.getElementById('loginForm');
const signupForm = document.getElementById('signupForm');
const eventForm = document.getElementById('eventForm');
const eventsContainer = document.getElementById('eventsContainer');
const closeButtons = document.querySelectorAll('.close');

// Toast Notification Function
function showToast(message, type = 'success') {
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.textContent = message;
    document.body.appendChild(toast);
    setTimeout(() => toast.remove(), 3000);
}

// Auth State Observer
onAuthStateChanged(auth, (user) => {
    if (user) {
        if (loginBtn) loginBtn.textContent = 'Logout';
        if (document.getElementById('addEventForm')) {
            document.getElementById('addEventForm').style.display = 'block';
        }
        showToast('Logged in successfully!');
    } else {
        if (loginBtn) loginBtn.textContent = 'Organizer Login';
        if (document.getElementById('addEventForm')) {
            document.getElementById('addEventForm').style.display = 'none';
        }
    }
});

// Event Listeners
if (loginBtn) {
    loginBtn.addEventListener('click', () => {
        if (auth.currentUser) {
            signOut(auth).then(() => {
                showToast('Logged out successfully');
            }).catch((error) => {
                showToast(error.message, 'error');
            });
        } else {
            loginModal.style.display = 'block';
        }
    });
}

if (showSignupLink) {
    showSignupLink.addEventListener('click', (e) => {
        e.preventDefault();
        loginModal.style.display = 'none';
        signupModal.style.display = 'block';
    });
}

// Close modals
closeButtons.forEach(button => {
    button.addEventListener('click', () => {
        loginModal.style.display = 'none';
        signupModal.style.display = 'none';
    });
});

window.addEventListener('click', (e) => {
    if (e.target === loginModal) loginModal.style.display = 'none';
    if (e.target === signupModal) signupModal.style.display = 'none';
});

// Login Form Handler
if (loginForm) {
    loginForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const email = document.getElementById('loginEmail').value;
        const password = document.getElementById('loginPassword').value;

        try {
            loginForm.classList.add('loading');
            await signInWithEmailAndPassword(auth, email, password);
            loginModal.style.display = 'none';
            loginForm.reset();
        } catch (error) {
            showToast(error.message, 'error');
        } finally {
            loginForm.classList.remove('loading');
        }
    });
}

// Signup Form Handler
if (signupForm) {
    signupForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const email = document.getElementById('signupEmail').value;
        const password = document.getElementById('signupPassword').value;
        const name = document.getElementById('signupName').value;

        try {
            signupForm.classList.add('loading');
            const userCredential = await createUserWithEmailAndPassword(auth, email, password);
            await addDoc(collection(db, "organizers"), {
                uid: userCredential.user.uid,
                name: name,
                email: email,
                createdAt: Timestamp.now()
            });
            signupModal.style.display = 'none';
            signupForm.reset();
            showToast('Account created successfully!');
        } catch (error) {
            showToast(error.message, 'error');
        } finally {
            signupForm.classList.remove('loading');
        }
    });
}

// Event Form Handler
if (eventForm) {
    eventForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        if (!auth.currentUser) {
            showToast('Please login to post events', 'error');
            return;
        }

        try {
            eventForm.classList.add('loading');
            const imageFile = document.getElementById('eventImage').files[0];
            let imageUrl = '/api/placeholder/400/200';

            if (imageFile) {
                const storageRef = ref(storage, `event-images/${Date.now()}_${imageFile.name}`);
                const snapshot = await uploadBytes(storageRef, imageFile);
                imageUrl = await getDownloadURL(snapshot.ref);
            }

            const eventData = {
                name: document.getElementById('eventName').value,
                venue: document.getElementById('eventVenue').value,
                date: document.getElementById('eventDate').value,
                time: document.getElementById('eventTime').value,
                description: document.getElementById('eventDescription').value,
                imageUrl: imageUrl,
                organizerId: auth.currentUser.uid,
                createdAt: Timestamp.now()
            };

            await addDoc(collection(db, "events"), eventData);
            eventForm.reset();
            showToast('Event posted successfully!');
            
            // Refresh events if on events page
            if (eventsContainer) {
                fetchEvents();
            }
        } catch (error) {
            showToast(error.message, 'error');
        } finally {
            eventForm.classList.remove('loading');
        }
    });
}

// Fetch and Display Events
async function fetchEvents() {
    if (!eventsContainer) return;

    try {
        eventsContainer.classList.add('loading');
        const querySnapshot = await getDocs(
            query(collection(db, "events"), 
            orderBy("date", "asc"))
        );

        // Keep default events
        const defaultEvents = document.querySelectorAll('.default-event');
        defaultEvents.forEach(event => event.style.display = 'block');

        // Add dynamic events
        querySnapshot.forEach((doc) => {
            const eventData = doc.data();
            const eventCard = createEventCard(eventData);
            eventsContainer.appendChild(eventCard);
        });
    } catch (error) {
        showToast('Error loading events', 'error');
        console.error("Error fetching events: ", error);
    } finally {
        eventsContainer.classList.remove('loading');
    }
}

// Create Event Card
function createEventCard(eventData) {
    const card = document.createElement('div');
    card.className = 'event-card';
    card.innerHTML = `
        <img src="${eventData.imageUrl || '/api/placeholder/400/200'}" alt="${eventData.name}" class="event-image">
        <div class="event-details">
            <h3 class="event-title">${eventData.name}</h3>
            <div class="event-info">
                <i class="fas fa-map-marker-alt"></i>
                <span>${eventData.venue}</span>
            </div>
            <div class="event-info">
                <i class="fas fa-calendar"></i>
                <span>${eventData.date}</span>
            </div>
            <div class="event-info">
                <i class="fas fa-clock"></i>
                <span>${eventData.time}</span>
            </div>
            <p class="event-description">${eventData.description}</p>
        </div>
    `;
    return card;
}

// Initialize events on page load
if (eventsContainer) {
    fetchEvents();
}
