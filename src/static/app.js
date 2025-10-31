document.addEventListener("DOMContentLoaded", () => {
  const activitiesList = document.getElementById("activities-list");
  const activitySelect = document.getElementById("activity");
  const signupForm = document.getElementById("signup-form");
  const messageDiv = document.getElementById("message");

  // small helper to avoid HTML injection in participant names
  function escapeHtml(str) {
    return String(str)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");
  }

  // Function to fetch activities from API
  async function fetchActivities() {
    try {
      const response = await fetch("/activities");
      const activities = await response.json();

      // Clear loading message
      activitiesList.innerHTML = "";

      // Reset the activity select so options don't duplicate
      activitySelect.innerHTML = '<option value="">-- Select an activity --</option>';

      // Populate activities list
      Object.entries(activities).forEach(([name, details]) => {
        const activityCard = document.createElement("div");
        activityCard.className = "activity-card";

        const spotsLeft = details.max_participants - details.participants.length;

        // Build participants list HTML with a remove button per participant
        const participantsHtml = details.participants.length
          ? details.participants
              .map(
                (p) =>
                  `<li class="participant-item"><span class="participant-name">${escapeHtml(
                    p
                  )}</span><button class="remove-btn" data-activity="${escapeHtml(
                    name
                  )}" data-email="${escapeHtml(p)}" aria-label="Remove ${escapeHtml(p)}">🗑️</button></li>`
              )
              .join("")
          : '<li class="no-participants">No participants yet</li>';

        activityCard.innerHTML = `
          <h4>${escapeHtml(name)}</h4>
          <p class="activity-desc">${escapeHtml(details.description)}</p>
          <p><strong>Schedule:</strong> ${escapeHtml(details.schedule)}</p>
          <p><strong>Availability:</strong> ${spotsLeft} spots left</p>

          <div class="participants-section">
            <p><strong>Participants</strong></p>
            <ul class="participants-list">
              ${participantsHtml}
            </ul>
          </div>
        `;

        activitiesList.appendChild(activityCard);

        // Add option to select dropdown
        const option = document.createElement("option");
        option.value = name;
        option.textContent = name;
        activitySelect.appendChild(option);
      });

      // Attach listeners to remove buttons (if any)
      document.querySelectorAll(".remove-btn").forEach((btn) => {
        btn.addEventListener("click", async (e) => {
          const activity = btn.getAttribute("data-activity");
          const email = btn.getAttribute("data-email");

          if (!activity || !email) return;

          const confirmed = confirm(`Remove ${email} from ${activity}?`);
          if (!confirmed) return;

          try {
            btn.disabled = true;
            const resp = await fetch(
              `/activities/${encodeURIComponent(activity)}/participants?email=${encodeURIComponent(
                email
              )}`,
              { method: "DELETE" }
            );

            const json = await resp.json();
            if (resp.ok) {
              messageDiv.textContent = json.message || "Participant removed";
              messageDiv.className = "message success";
              messageDiv.classList.remove("hidden");

              // Refresh activities to reflect removal
              fetchActivities();
            } else {
              messageDiv.textContent = json.detail || "Failed to remove participant";
              messageDiv.className = "message error";
              messageDiv.classList.remove("hidden");
            }
          } catch (err) {
            console.error("Error removing participant:", err);
            messageDiv.textContent = "Failed to remove participant. Try again.";
            messageDiv.className = "message error";
            messageDiv.classList.remove("hidden");
          } finally {
            btn.disabled = false;
            setTimeout(() => messageDiv.classList.add("hidden"), 4000);
          }
        });
      });
    } catch (error) {
      activitiesList.innerHTML = "<p>Failed to load activities. Please try again later.</p>";
      console.error("Error fetching activities:", error);
    }
  }

  // Handle form submission
  signupForm.addEventListener("submit", async (event) => {
    event.preventDefault();

    const email = document.getElementById("email").value;
    const activity = document.getElementById("activity").value;

    try {
      const response = await fetch(
        `/activities/${encodeURIComponent(activity)}/signup?email=${encodeURIComponent(email)}`,
        {
          method: "POST",
        }
      );

      const result = await response.json();

      if (response.ok) {
        messageDiv.textContent = result.message;
        messageDiv.className = "message success";
        signupForm.reset();

        // Refresh activities so the UI reflects the new participant immediately
        fetchActivities();
      } else {
        messageDiv.textContent = result.detail || "An error occurred";
        messageDiv.className = "message error";
      }

      messageDiv.classList.remove("hidden");

      // Hide message after 5 seconds
      setTimeout(() => {
        messageDiv.classList.add("hidden");
      }, 5000);
    } catch (error) {
      messageDiv.textContent = "Failed to sign up. Please try again.";
      messageDiv.className = "error";
      messageDiv.classList.remove("hidden");
      console.error("Error signing up:", error);
    }
  });

  // Initialize app
  fetchActivities();
});
