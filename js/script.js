
import { supabase } from "./supabase.js";

// ==========================================
// 1. GET HTML ELEMENTS
// ==========================================

const authSection = document.getElementById("auth-section");
const accountSection = document.getElementById("account-section");

const registerForm = document.getElementById("register-form");
const loginForm = document.getElementById("login-form");
const logoutButton = document.getElementById("logout-button");

const registerMessage = document.getElementById("register-message");
const loginMessage = document.getElementById("login-message");

const accountName = document.getElementById("account-name");
const accountEmail = document.getElementById("account-email");

const tripForm = document.getElementById("trip-form");
const tripMessage = document.getElementById("trip-message");
const tripList = document.getElementById("trip-list");
const refreshButton = document.getElementById("refresh-trips");

const departureDateInput = document.getElementById("departure-date");

// Create a message element for booking feedback.
const bookingMessage = document.createElement("p");
bookingMessage.className = "message";
tripList.parentElement.insertBefore(bookingMessage, tripList);


// ==========================================
// 2. HELPER FUNCTIONS
// ==========================================

function showMessage(element, message, type) {
    element.textContent = message;
    element.className = "message " + type;
}

function getLocalDate() {
    const now = new Date();
    const offset = now.getTimezoneOffset();

    return new Date(now.getTime() - offset * 60000)
        .toISOString()
        .split("T")[0];
}

// Prevent selecting a date in the past.
departureDateInput.min = getLocalDate();


// ==========================================
// 3. DISPLAY ACCOUNT
// ==========================================

async function displayAccount(user) {

    authSection.hidden = true;
    accountSection.hidden = false;

    accountEmail.textContent = "Email: " + user.email;

    const { data, error } = await supabase
        .from("profiles")
        .select("full_name")
        .eq("id", user.id)
        .single();

    if (error) {
        accountName.textContent =
            "Profile information unavailable.";

        console.error("Profile error:", error.message);
    } else {
        accountName.textContent =
            "Name: " + data.full_name;
    }

    await loadTrips();
}


// ==========================================
// 4. LOAD CURRENT SESSION
// ==========================================

async function checkSession() {

    const { data, error } =
        await supabase.auth.getSession();

    if (error) {
        console.error("Session error:", error.message);
        return;
    }

    if (data.session) {
        await displayAccount(data.session.user);
    } else {
        authSection.hidden = false;
        accountSection.hidden = true;
    }
}


// ==========================================
// 5. REGISTER ACCOUNT
// ==========================================

registerForm.addEventListener("submit", async function(event) {

    event.preventDefault();

    const fullName = document
        .getElementById("register-name").value.trim();

    const email = document
        .getElementById("register-email").value.trim();

    const password = document
        .getElementById("register-password").value;

    showMessage(
        registerMessage,
        "Creating your account...",
        ""
    );

    const { data, error } = await supabase.auth.signUp({

        email: email,
        password: password,

        options: {
            data: {
                full_name: fullName
            }
        }

    });

    if (error) {
        showMessage(registerMessage, error.message, "error");
        return;
    }

    registerForm.reset();

    if (data.session) {
        await displayAccount(data.user);
    } else {
        showMessage(
            registerMessage,
            "Account created! Check your email to confirm your account before logging in.",
            "success"
        );
    }

});


// ==========================================
// 6. LOGIN
// ==========================================

loginForm.addEventListener("submit", async function(event) {

    event.preventDefault();

    const email = document
        .getElementById("login-email").value.trim();

    const password = document
        .getElementById("login-password").value;

    showMessage(loginMessage, "Logging in...", "");

    const { data, error } =
        await supabase.auth.signInWithPassword({

            email: email,
            password: password

        });

    if (error) {
        showMessage(loginMessage, error.message, "error");
        return;
    }

    loginForm.reset();

    await displayAccount(data.user);

});


// ==========================================
// 7. LOGOUT
// ==========================================

logoutButton.addEventListener("click", async function() {

    const { error } = await supabase.auth.signOut();

    if (error) {
        alert("Logout failed: " + error.message);
        return;
    }

    accountSection.hidden = true;
    authSection.hidden = false;

    loginForm.reset();
    registerForm.reset();

    showMessage(
        loginMessage,
        "You have logged out successfully.",
        "success"
    );

});


// ==========================================
// 8. CREATE A TRIP
// ==========================================

tripForm.addEventListener("submit", async function(event) {

    event.preventDefault();

    const { data: userData, error: userError } =
        await supabase.auth.getUser();

    if (userError || !userData.user) {
        showMessage(
            tripMessage,
            "Please log in before creating a trip.",
            "error"
        );
        return;
    }

    const startingLocation = document
        .getElementById("starting-location").value.trim();

    const destination = document
        .getElementById("destination").value.trim();

    const departureDate = departureDateInput.value;

    const departureTime = document
        .getElementById("departure-time").value;

    const totalSeats = Number(
        document.getElementById("total-seats").value
    );

    if (!startingLocation || !destination ||
        !departureDate || !departureTime) {

        showMessage(
            tripMessage,
            "Please complete all trip information.",
            "error"
        );
        return;
    }

    if (startingLocation.toLowerCase() === destination.toLowerCase()) {
        showMessage(
            tripMessage,
            "Starting location and destination must be different.",
            "error"
        );
        return;
    }

    if (departureDate < getLocalDate()) {
        showMessage(
            tripMessage,
            "Please choose today or a future date.",
            "error"
        );
        return;
    }

    if (!Number.isInteger(totalSeats) ||
        totalSeats < 1 || totalSeats > 20) {

        showMessage(
            tripMessage,
            "Enter a seat quantity between 1 and 20.",
            "error"
        );
        return;
    }

    showMessage(tripMessage, "Publishing your trip...", "");

    const { error } = await supabase
        .from("trips")
        .insert({
            driver_id: userData.user.id,
            starting_location: startingLocation,
            destination: destination,
            departure_date: departureDate,
            departure_time: departureTime,
            total_seats: totalSeats
        });

    if (error) {
        console.error("Create trip error:", error);

        showMessage(
            tripMessage,
            "Could not publish trip: " + error.message,
            "error"
        );
        return;
    }

    tripForm.reset();
    departureDateInput.min = getLocalDate();

    showMessage(
        tripMessage,
        "Your trip was published successfully!",
        "success"
    );

    await loadTrips();

});


// ==========================================
// 9. LOAD AVAILABLE TRIPS
// ==========================================

async function loadTrips() {

    tripList.textContent = "Loading trips...";

    showMessage(bookingMessage, "", "");

    // Get the currently logged-in student.
    const { data: userData, error: userError } =
        await supabase.auth.getUser();

    if (userError || !userData.user) {
        tripList.textContent =
            "Please log in to view available trips.";
        return;
    }

    const currentUserId = userData.user.id;

    // Get trips from the database.
    const { data, error } = await supabase
        .rpc("get_available_trips");

    if (error) {
        console.error("Load trips error:", error);

        tripList.textContent =
            "Unable to load trips: " + error.message;

        return;
    }

    tripList.replaceChildren();

    if (!data || data.length === 0) {

        const emptyMessage = document.createElement("p");

        emptyMessage.className = "trip-empty";

        emptyMessage.textContent =
            "No trips have been published yet. Be the first to create one!";

        tripList.appendChild(emptyMessage);
        return;
    }

    // Get this student's active bookings.
    const { data: bookings, error: bookingError } =
        await supabase
            .from("bookings")
            .select("trip_id, status, created_at")
            .eq("rider_id", currentUserId)
            .in("status", ["pending", "confirmed"])
            .order("created_at", { ascending: false });

    if (bookingError) {
        console.error("Booking lookup error:", bookingError);

        tripList.textContent =
            "Unable to check your bookings: " +
            bookingError.message;

        return;
    }

    // Store active bookings for quick lookup.
    const bookingMap = new Map();

    bookings.forEach(function(booking) {

        const tripId = String(booking.trip_id);

        if (!bookingMap.has(tripId)) {
            bookingMap.set(tripId, booking.status);
        }

    });

    // Display each trip.
    data.forEach(function(trip) {

        const card = document.createElement("article");
        card.className = "trip-card";

        const title = document.createElement("h3");

        title.textContent =
            trip.starting_location + " → " +
            trip.destination;

        const driver = document.createElement("p");
        driver.textContent =
            "Driver: " + trip.driver_name;

        const date = document.createElement("p");
        date.textContent =
            "Date: " + trip.departure_date;

        const time = document.createElement("p");

        time.textContent =
            "Departure: " +
            String(trip.departure_time).slice(0, 5);

        const seats = document.createElement("span");

        seats.className = "trip-seats";

        seats.textContent =
            trip.available_seats + " of " +
            trip.total_seats + " seats available";

        // Create the booking button.
        const actionButton = document.createElement("button");

        actionButton.type = "button";
        actionButton.className = "primary-button";

        const tripId = String(trip.id);

        const isDriver =
            trip.driver_id === currentUserId;

        const bookingStatus = bookingMap.get(tripId);

        const availableSeats =
            Number(trip.available_seats);

        if (isDriver) {

            actionButton.textContent = "Your Trip";
            actionButton.disabled = true;

            actionButton.className = "secondary-button";

        } else if (bookingStatus) {

            actionButton.textContent = "Leave Trip";

            actionButton.dataset.action = "leave";
            actionButton.dataset.tripId = tripId;

            actionButton.className = "secondary-button";

        } else if (availableSeats <= 0) {

            actionButton.textContent = "Trip Full";
            actionButton.disabled = true;

            actionButton.className = "secondary-button";

        } else {

            actionButton.textContent = "Join Trip";

            actionButton.dataset.action = "join";
            actionButton.dataset.tripId = tripId;

            actionButton.className = "primary-button";

        }

        card.appendChild(title);
        card.appendChild(driver);
        card.appendChild(date);
        card.appendChild(time);
        card.appendChild(seats);
        card.appendChild(actionButton);

        tripList.appendChild(card);

    });

}


// ==========================================
// 10. JOIN AND LEAVE TRIPS
// ==========================================

tripList.addEventListener("click", async function(event) {

    const button = event.target.closest("button[data-action]");

    if (!button) {
        return;
    }

    const action = button.dataset.action;
    const tripId = button.dataset.tripId;

    if (!action || !tripId) {
        return;
    }

    button.disabled = true;

    button.textContent =
        action === "join" ? "Joining..." : "Leaving...";

    const functionName =
        action === "join" ? "join_trip" : "leave_trip";

    // Call the appropriate Supabase function.
    const { data, error } = await supabase.rpc(
        functionName,
        {
            p_trip_id: tripId
        }
    );

    if (error) {

        console.error(
            "Booking action error:",
            error
        );

        showMessage(
            bookingMessage,
            error.message,
            "error"
        );

    } else {

        showMessage(
            bookingMessage,
            data || "Booking updated successfully!",
            "success"
        );

    }

    // Refresh trip information and seat availability.
    await loadTrips();

});


// ==========================================
// 11. REFRESH TRIPS
// ==========================================

refreshButton.addEventListener("click", loadTrips);


// ==========================================
// 12. AUTHENTICATION STATE CHANGES
// ==========================================

supabase.auth.onAuthStateChange(function(event, session) {

    if (event === "SIGNED_IN" && session) {

        setTimeout(function() {
            displayAccount(session.user);
        }, 0);

    }

    if (event === "SIGNED_OUT") {

        authSection.hidden = false;
        accountSection.hidden = true;

        tripList.replaceChildren();

        showMessage(bookingMessage, "", "");

    }

});


// ==========================================
// 13. START APPLICATION
// ==========================================

checkSession();
