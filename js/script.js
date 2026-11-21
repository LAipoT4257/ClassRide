
import { supabase } from "./supabase.js";

// Get HTML elements
const authSection = document.getElementById("auth-section");
const accountSection = document.getElementById("account-section");

const registerForm = document.getElementById("register-form");
const loginForm = document.getElementById("login-form");
const logoutButton = document.getElementById("logout-button");

const registerMessage = document.getElementById("register-message");
const loginMessage = document.getElementById("login-message");

const accountName = document.getElementById("account-name");
const accountEmail = document.getElementById("account-email");


// Display messages
function showMessage(element, message, type) {
    element.textContent = message;
    element.className = "message " + type;
}


// Display the current account
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
        accountName.textContent = "Profile information unavailable.";
        console.error("Profile error:", error.message);
        return;
    }

    accountName.textContent = "Name: " + data.full_name;
}


// Check if a user is already logged in
async function checkSession() {

    const { data, error } = await supabase.auth.getSession();

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


// Register a new account
registerForm.addEventListener("submit", async function(event) {

    event.preventDefault();

    const fullName = document
        .getElementById("register-name").value.trim();

    const email = document
        .getElementById("register-email").value.trim();

    const password = document
        .getElementById("register-password").value;

    showMessage(registerMessage, "Creating your account...", "");

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

    if (data.session) {
        registerForm.reset();
        await displayAccount(data.user);
    } else {
        showMessage(
            registerMessage,
            "Account created! Please check your email to confirm your account before logging in.",
            "success"
        );

        registerForm.reset();
    }

});


// Log in an existing account
loginForm.addEventListener("submit", async function(event) {

    event.preventDefault();

    const email = document
        .getElementById("login-email").value.trim();

    const password = document
        .getElementById("login-password").value;

    showMessage(loginMessage, "Logging in...", "");

    const { data, error } = await supabase.auth.signInWithPassword({

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


// Log out the current account
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

    showMessage(loginMessage, "You have logged out successfully.", "success");

});


// Listen for authentication changes
supabase.auth.onAuthStateChange(async function(event, session) {

    if (session) {
        await displayAccount(session.user);
    } else {
        authSection.hidden = false;
        accountSection.hidden = true;
    }

});


// Start the application
checkSession();
