
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
const myTripList = document.getElementById("my-trip-list");
const refreshButton = document.getElementById("refresh-trips");

// Navigation elements
const navButtons = document.querySelectorAll(".nav-button");
const appViews = document.querySelectorAll(".app-view");

// Trip form inputs
const startingLocationInput =
    document.getElementById("starting-location");

const destinationInput =
    document.getElementById("destination");

const departureDateInput =
    document.getElementById("departure-date");

const departureTimeInput =
    document.getElementById("departure-time");

const totalSeatsInput =
    document.getElementById("total-seats");

// Track whether the user is editing an existing trip.
let editingTripId = null;

// Prevent duplicate loading requests.
let isLoadingTrips = false;

// Booking feedback message
const bookingMessage = document.createElement("p");
bookingMessage.className = "message";

tripList.parentElement.insertBefore(bookingMessage, tripList);

// Get the form submit button.
const tripSubmitButton =
    tripForm.querySelector('button[type="submit"]');

// Create a Cancel Editing button.
const cancelEditButton = document.createElement("button");

cancelEditButton.type = "button";
cancelEditButton.textContent = "Cancel Editing";
cancelEditButton.className = "secondary-button";
cancelEditButton.hidden = true;

tripSubmitButton.insertAdjacentElement(
    "afterend",
    cancelEditButton
);


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

// Reset the trip form after editing or cancelling edit mode.
function resetTripFormMode() {

    editingTripId = null;

    tripForm.reset();

    departureDateInput.min = getLocalDate();

    tripSubmitButton.textContent = "Publish Trip";

    tripSubmitButton.disabled = false;
    cancelEditButton.hidden = true;

    showMessage(tripMessage, "", "");
}

// Prevent selecting a date in the past.
departureDateInput.min = getLocalDate();


// ==========================================
// 3. APP NAVIGATION
// ==========================================

function showView(viewId) {

    appViews.forEach(function(view) {
        view.hidden = view.id !== viewId;
    });

    navButtons.forEach(function(button) {

        button.classList.toggle(
            "active",
            button.dataset.view === viewId
        );

    });

}

// Navigation button clicks
navButtons.forEach(function(button) {

    button.addEventListener("click", function() {

        showView(button.dataset.view);

    });

});


// ==========================================
// 4. DISPLAY ACCOUNT
// ==========================================

async function displayAccount(user) {

    authSection.hidden = true;
    accountSection.hidden = false;

    showView("available-view");

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
// 5. LOAD CURRENT SESSION
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
// 6. REGISTER ACCOUNT
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
// 7. LOGIN
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
// 8. LOGOUT
// ==========================================

logoutButton.addEventListener("click", async function() {

    const { error } = await supabase.auth.signOut();

    if (error) {

        alert("Logout failed: " + error.message);
        return;

    }

    resetTripFormMode();

    accountSection.hidden = true;
    authSection.hidden = false;

    loginForm.reset();
    registerForm.reset();

    tripList.replaceChildren();
    myTripList.replaceChildren();

    showMessage(bookingMessage, "", "");

    showMessage(
        loginMessage,
        "You have logged out successfully.",
        "success"
    );

});


// ==========================================
// 9. CREATE AND EDIT A TRIP
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

    const startingLocation =
        startingLocationInput.value.trim();

    const destination =
        destinationInput.value.trim();

    const departureDate =
        departureDateInput.value;

    const departureTime =
        departureTimeInput.value;

    const totalSeats =
        Number(totalSeatsInput.value);

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

    tripSubmitButton.disabled = true;

    // EDIT EXISTING TRIP
    if (editingTripId !== null) {

        showMessage(
            tripMessage,
            "Saving your trip changes...",
            ""
        );

        const { data, error } = await supabase.rpc(
            "update_trip",
            {
                p_trip_id: editingTripId,
                p_starting_location: startingLocation,
                p_destination: destination,
                p_departure_date: departureDate,
                p_departure_time: departureTime,
                p_total_seats: totalSeats
            }
        );

        tripSubmitButton.disabled = false;

        if (error) {

            console.error("Edit trip error:", error);

            showMessage(
                tripMessage,
                error.message,
                "error"
            );

            return;
        }

        resetTripFormMode();

        showMessage(
            tripMessage,
            data || "Trip updated successfully!",
            "success"
        );

        await loadTrips();

        showView("my-trips-view");

        return;
    }

    // CREATE NEW TRIP
    showMessage(
        tripMessage,
        "Publishing your trip...",
        ""
    );

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

    tripSubmitButton.disabled = false;

    if (error) {

        console.error("Create trip error:", error);

        showMessage(
            tripMessage,
            "Could not publish trip: " + error.message,
            "error"
        );

        return;
    }

    resetTripFormMode();

    showMessage(
        tripMessage,
        "Your trip was published successfully!",
        "success"
    );

    await loadTrips();

    showView("my-trips-view");

});


// ==========================================
// 10. CREATE TRIP CARD
// ==========================================

function createTripCard(trip, currentUserId, bookingMap) {

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

    const tripId = String(trip.id);

    const isDriver =
        trip.driver_id === currentUserId;

    const bookingStatus =
        bookingMap.get(tripId);

    const availableSeats =
        Number(trip.available_seats);

    card.appendChild(title);
    card.appendChild(driver);
    card.appendChild(date);
    card.appendChild(time);
    card.appendChild(seats);

    // DRIVER CONTROLS
    if (isDriver) {

        const driverLabel = document.createElement("p");

        driverLabel.className = "trip-driver-label";
        driverLabel.textContent = "Your Trip";

        const editButton = document.createElement("button");

        editButton.type = "button";
        editButton.textContent = "Edit Trip";
        editButton.className = "primary-button";

        editButton.dataset.action = "edit";
        editButton.dataset.tripId = tripId;

        const cancelButton = document.createElement("button");

        cancelButton.type = "button";
        cancelButton.textContent = "Cancel Trip";
        cancelButton.className = "secondary-button";

        cancelButton.dataset.action = "cancel";
        cancelButton.dataset.tripId = tripId;

        card.appendChild(driverLabel);
        card.appendChild(editButton);
        card.appendChild(cancelButton);

        return card;
    }

    // RIDER CONTROLS
    const actionButton = document.createElement("button");

    actionButton.type = "button";

    if (bookingStatus) {

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

    card.appendChild(actionButton);

    return card;
}


// ==========================================
// 11. LOAD AVAILABLE TRIPS AND MY TRIPS
// ==========================================

async function loadTrips() {

    if (isLoadingTrips) {
        return;
    }

    isLoadingTrips = true;

    tripList.textContent = "Loading trips...";
    myTripList.textContent = "Loading your trips...";

    showMessage(bookingMessage, "", "");

    try {

        const { data: userData, error: userError } =
            await supabase.auth.getUser();

        if (userError || !userData.user) {

            tripList.textContent =
                "Please log in to view available trips.";

            myTripList.textContent =
                "Please log in to view your trips.";

            return;
        }

        const currentUserId = userData.user.id;

        // Get active trips from the database.
        const { data, error } = await supabase
            .rpc("get_available_trips");

        if (error) {

            console.error("Load trips error:", error);

            tripList.textContent =
                "Unable to load trips: " + error.message;

            myTripList.textContent =
                "Unable to load your trips.";

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

            myTripList.textContent =
                "Unable to load your trips.";

            return;
        }

        // Store the student's active bookings.
        const bookingMap = new Map();

        (bookings || []).forEach(function(booking) {

            const tripId = String(booking.trip_id);

            if (!bookingMap.has(tripId)) {

                bookingMap.set(tripId, booking.status);

            }

        });

        const activeTrips = data || [];

        // Separate trips created by the user from trips created by others.
        const availableTrips = activeTrips.filter(function(trip) {

            return trip.driver_id !== currentUserId;

        });

        // My Trips includes trips created and trips joined by the user.
        const myTrips = activeTrips.filter(function(trip) {

            return (
                trip.driver_id === currentUserId ||
                bookingMap.has(String(trip.id))
            );

        });

        // Clear the lists.
        tripList.replaceChildren();
        myTripList.replaceChildren();

        // AVAILABLE TRIPS
        if (availableTrips.length === 0) {

            const emptyMessage = document.createElement("p");

            emptyMessage.className = "trip-empty";

            emptyMessage.textContent =
                "No available trips from other students right now.";

            tripList.appendChild(emptyMessage);

        } else {

            availableTrips.forEach(function(trip) {

                const card = createTripCard(
                    trip,
                    currentUserId,
                    bookingMap
                );

                tripList.appendChild(card);

            });

        }

        // MY TRIPS
        if (myTrips.length === 0) {

            const emptyMessage = document.createElement("p");

            emptyMessage.className = "trip-empty";

            emptyMessage.textContent =
                "You haven't created or joined any trips yet.";

            myTripList.appendChild(emptyMessage);

        } else {

            myTrips.forEach(function(trip) {

                const card = createTripCard(
                    trip,
                    currentUserId,
                    bookingMap
                );

                myTripList.appendChild(card);

            });

        }

    } finally {

        isLoadingTrips = false;

    }

}


// ==========================================
// 12. TRIP AND BOOKING BUTTON ACTIONS
// ==========================================

async function handleTripListClick(event) {

    const button = event.target.closest("button[data-action]");

    if (!button) {
        return;
    }

    const action = button.dataset.action;
    const tripId = button.dataset.tripId;

    if (!action || !tripId) {
        return;
    }

    // EDIT TRIP
    if (action === "edit") {

        const { data: trips, error } = await supabase
            .rpc("get_available_trips");

        if (error) {

            showMessage(
                bookingMessage,
                "Unable to retrieve trip information: " + error.message,
                "error"
            );

            return;
        }

        const selectedTrip = trips.find(function(trip) {
            return String(trip.id) === tripId;
        });

        if (!selectedTrip) {

            showMessage(
                bookingMessage,
                "This trip could not be found. Refresh and try again.",
                "error"
            );

            return;
        }

        editingTripId = tripId;

        startingLocationInput.value =
            selectedTrip.starting_location;

        destinationInput.value =
            selectedTrip.destination;

        departureDateInput.value =
            selectedTrip.departure_date;

        departureTimeInput.value =
            String(selectedTrip.departure_time).slice(0, 5);

        totalSeatsInput.value =
            selectedTrip.total_seats;

        tripSubmitButton.textContent = "Save Changes";

        cancelEditButton.hidden = false;

        showMessage(
            tripMessage,
            "Editing your trip. Update the information and save.",
            "success"
        );

        // Automatically open the Create Trip section.
        showView("create-view");

        tripForm.scrollIntoView({
            behavior: "smooth",
            block: "center"
        });

        return;
    }

    // CANCEL TRIP
    if (action === "cancel") {

        const confirmed = confirm(
            "Are you sure you want to cancel this trip? All active rider bookings will also be cancelled."
        );

        if (!confirmed) {
            return;
        }

        button.disabled = true;
        button.textContent = "Cancelling...";

        const { data, error } = await supabase.rpc(
            "cancel_trip",
            {
                p_trip_id: tripId
            }
        );

        if (error) {

            console.error("Cancel trip error:", error);

            showMessage(
                bookingMessage,
                error.message,
                "error"
            );

        } else {

            showMessage(
                bookingMessage,
                data || "Trip cancelled successfully!",
                "success"
            );

        }

        await loadTrips();

        return;
    }

    // JOIN OR LEAVE TRIP
    button.disabled = true;

    button.textContent =
        action === "join" ? "Joining..." : "Leaving...";

    const functionName =
        action === "join" ? "join_trip" : "leave_trip";

    const { data, error } = await supabase.rpc(
        functionName,
        {
            p_trip_id: tripId
        }
    );

    if (error) {

        console.error("Booking action error:", error);

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

    await loadTrips();

}

// Both trip lists use the same button handler.
tripList.addEventListener("click", handleTripListClick);
myTripList.addEventListener("click", handleTripListClick);


// ==========================================
// 13. CANCEL EDITING
// ==========================================

cancelEditButton.addEventListener("click", function() {

    resetTripFormMode();

});


// ==========================================
// 14. REFRESH TRIPS
// ==========================================

refreshButton.addEventListener("click", loadTrips);


// ==========================================
// 15. AUTHENTICATION STATE CHANGES
// ==========================================

supabase.auth.onAuthStateChange(function(event, session) {

    if (event === "SIGNED_IN" && session) {

        setTimeout(function() {
            displayAccount(session.user);
        }, 0);

    }

    if (event === "SIGNED_OUT") {

        resetTripFormMode();

        authSection.hidden = false;
        accountSection.hidden = true;

        tripList.replaceChildren();
        myTripList.replaceChildren();

        showMessage(bookingMessage, "", "");

    }

});


// ==========================================
// 16. START APPLICATION
// ==========================================

checkSession();
