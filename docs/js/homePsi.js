document.addEventListener("DOMContentLoaded", () => {
    const buttons = document.querySelectorAll(".menu-btn");
    const contents = document.querySelectorAll(".content");

    buttons.forEach(btn => {
        btn.addEventListener("click", () => {
            buttons.forEach(b => b.classList.remove("active"));
            btn.classList.add("active");

            const target = btn.getAttribute("data-target");
            contents.forEach(c => {
                if (c.id === target) {
                    c.classList.remove("hidden");
                } else {
                    c.classList.add("hidden");
                }
            });
        });
    });

    const noteBtns = document.querySelectorAll(".note-btn");
    const popup = document.getElementById("notesPopup");
    const closePopup = document.getElementById("closePopup");
    const saveNote = document.getElementById("saveNote");
    const notesArea = document.getElementById("notesArea");

    noteBtns.forEach(btn => {
        btn.addEventListener("click", () => {
            popup.classList.remove("hidden");
            notesArea.value = "";

            popup.dataset.targetCard = btn.closest(".patient-card").dataset.id;
        });
    });

    if (saveNote) {
        saveNote.addEventListener("click", () => {
            const note = notesArea.value.trim();
            if (note) {
                const targetId = popup.dataset.targetCard;
                const card = document.querySelector(`.patient-card[data-id="${targetId}"]`);
                const noteEl = card.querySelector(".patient-notes");
                noteEl.textContent = note;
            }
            popup.classList.add("hidden");
        });
    }

    if (closePopup) {
        closePopup.addEventListener("click", () => {
            popup.classList.add("hidden");
        });
    }


});
