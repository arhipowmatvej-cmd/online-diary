document.addEventListener("DOMContentLoaded", () => {
    // ==========================================
    // ELEMENTS
    // ==========================================

    const taskModal = document.getElementById("taskModal");
    const taskForm = document.getElementById("taskForm");
    const taskName = document.getElementById("taskName");
    const taskTime = document.getElementById("taskTime");
    const taskCategory = document.getElementById("taskCategory");

    const closeTaskModal = document.getElementById("closeTaskModal");
    const cancelTask = document.getElementById("cancelTask");

    const newTaskButton = document.querySelector(".new-task-button");
    const addTaskButton = document.querySelector(".add-task");

    const taskList = document.querySelector(".task-list");
    const progressValue = document.querySelector(".progress-value");
    const progressPercent = document.querySelector(".progress-info strong");
    const progressText = document.querySelector(".progress-card small");

    const navCount = document.querySelector(".nav-count");

    const noteTextarea = document.querySelector(".note-card textarea");
    const noteSaveButton = document.querySelector(".note-footer button");
    const noteStatus = document.querySelector(".note-footer span");

    const statNumber = document.querySelector(".stat-number");

    // ==========================================
    // DEFAULT TASKS
    // ==========================================

    const defaultTasks = [
        {
            id: 1,
            title: "Проверить электронную почту",
            time: "09:00",
            category: "work",
            completed: true
        },
        {
            id: 2,
            title: "Подготовить план проекта",
            time: "10:30",
            category: "work",
            completed: true
        },
        {
            id: 3,
            title: "Работа над ежедневником",
            time: "14:00",
            category: "personal",
            completed: false
        },
        {
            id: 4,
            title: "Прогулка и отдых",
            time: "18:30",
            category: "personal",
            completed: false
        }
    ];

    // ==========================================
    // LOCAL STORAGE
    // ==========================================

    function getTasks() {
        const saved = localStorage.getItem("dailyTasks");

        if (!saved) {
            localStorage.setItem("dailyTasks", JSON.stringify(defaultTasks));
            return [...defaultTasks];
        }

        try {
            return JSON.parse(saved);
        } catch (error) {
            console.error("Ошибка загрузки задач:", error);
            return [...defaultTasks];
        }
    }

    function saveTasks(tasks) {
        localStorage.setItem("dailyTasks", JSON.stringify(tasks));
    }

    let tasks = getTasks();

    // ==========================================
    // ESCAPE HTML
    // ==========================================

    function escapeHTML(text) {
        const div = document.createElement("div");
        div.textContent = text;
        return div.innerHTML;
    }

    // ==========================================
    // RENDER TASKS
    // ==========================================

    function renderTasks() {
        if (!taskList) return;

        taskList.innerHTML = "";

        if (tasks.length === 0) {
            taskList.innerHTML = `
                <div class="empty-tasks">
                    <div class="empty-tasks-icon">✓</div>
                    <strong>Задач пока нет</strong>
                    <span>Добавьте первую задачу на сегодня</span>
                </div>
            `;

            updateProgress();
            return;
        }

        // Сначала незавершённые, затем выполненные
        const sortedTasks = [...tasks].sort((a, b) => {
            if (a.completed !== b.completed) {
                return a.completed ? 1 : -1;
            }

            return (a.time || "").localeCompare(b.time || "");
        });

        sortedTasks.forEach(task => {
            const row = document.createElement("label");

            row.className = `task ${task.completed ? "completed" : ""}`;

            row.innerHTML = `
                <input
                    type="checkbox"
                    ${task.completed ? "checked" : ""}
                    data-task-id="${task.id}"
                >

                <span class="custom-checkbox">
                    ${task.completed ? "✓" : ""}
                </span>

                <span class="task-text">
                    ${escapeHTML(task.title)}
                </span>

                <span class="task-time">
                    ${task.time || ""}
                </span>
            `;

            taskList.appendChild(row);
        });

        updateProgress();
    }

    // ==========================================
    // UPDATE PROGRESS
    // ==========================================

    function updateProgress() {
        const total = tasks.length;
        const completed = tasks.filter(task => task.completed).length;

        let percent = 0;

        if (total > 0) {
            percent = Math.round((completed / total) * 100);
        }

        if (progressValue) {
            progressValue.style.width = `${percent}%`;
        }

        if (progressPercent) {
            progressPercent.textContent = `${percent}%`;
        }

        if (progressText) {
            progressText.textContent =
                `${completed} из ${total} задач выполнено`;
        }

        if (navCount) {
            navCount.textContent = total;
        }

        updateStatistics();
    }

    // ==========================================
    // STATISTICS
    // ==========================================

    function updateStatistics() {
        if (!statNumber) return;

        const completedTotal = tasks.filter(task => task.completed).length;

        statNumber.innerHTML = `
            ${completedTotal}
            <span>задач</span>
        `;
    }

    // ==========================================
    // OPEN MODAL
    // ==========================================

    function openTaskModal() {
        if (!taskModal) return;

        taskModal.classList.add("show");
        document.body.classList.add("modal-open");

        setTimeout(() => {
            if (taskName) {
                taskName.focus();
            }
        }, 100);
    }

    // ==========================================
    // CLOSE MODAL
    // ==========================================

    function closeModal() {
        if (!taskModal) return;

        taskModal.classList.remove("show");
        document.body.classList.remove("modal-open");

        if (taskForm) {
            taskForm.reset();
        }

        if (taskTime) {
            taskTime.value = "12:00";
        }
    }

    // ==========================================
    // OPEN MODAL BUTTONS
    // ==========================================

    if (newTaskButton) {
        newTaskButton.addEventListener("click", openTaskModal);
    }

    if (addTaskButton) {
        addTaskButton.addEventListener("click", openTaskModal);
    }

    // ==========================================
    // CLOSE MODAL BUTTONS
    // ==========================================

    if (closeTaskModal) {
        closeTaskModal.addEventListener("click", closeModal);
    }

    if (cancelTask) {
        cancelTask.addEventListener("click", closeModal);
    }

    // ==========================================
    // CLICK OUTSIDE MODAL
    // ==========================================

    if (taskModal) {
        taskModal.addEventListener("click", event => {
            if (event.target === taskModal) {
                closeModal();
            }
        });
    }

    // ==========================================
    // ESCAPE KEY
    // ==========================================

    document.addEventListener("keydown", event => {
        if (event.key === "Escape") {
            closeModal();
        }
    });

    // ==========================================
    // CREATE NEW TASK
    // ==========================================

    if (taskForm) {
        taskForm.addEventListener("submit", event => {
            event.preventDefault();

            const title = taskName.value.trim();
            const time = taskTime.value;
            const category = taskCategory.value;

            if (!title) {
                taskName.focus();
                return;
            }

            const newTask = {
                id: Date.now(),
                title: title,
                time: time || "",
                category: category,
                completed: false
            };

            tasks.push(newTask);

            saveTasks(tasks);
            renderTasks();
            closeModal();

            // Небольшая анимация новой задачи
            setTimeout(() => {
                const taskElements = document.querySelectorAll(".task");

                if (taskElements.length > 0) {
                    const firstTask = taskElements[0];

                    firstTask.style.animation = "none";

                    requestAnimationFrame(() => {
                        firstTask.style.animation = "taskAppear 0.35s ease";
                    });
                }
            }, 50);
        });
    }

    // ==========================================
    // COMPLETE / UNCOMPLETE TASK
    // ==========================================

    if (taskList) {
        taskList.addEventListener("change", event => {
            const checkbox = event.target;

            if (!checkbox.matches('input[type="checkbox"]')) {
                return;
            }

            const id = Number(checkbox.dataset.taskId);

            const task = tasks.find(item => item.id === id);

            if (!task) return;

            task.completed = checkbox.checked;

            saveTasks(tasks);
            renderTasks();
        });
    }

    // ==========================================
    // QUICK NOTE
    // ==========================================

    function loadNote() {
        if (!noteTextarea) return;

        const savedNote = localStorage.getItem("dailyNote");

        if (savedNote !== null) {
            noteTextarea.value = savedNote;
        }
    }

    function saveNote() {
        if (!noteTextarea) return;

        localStorage.setItem("dailyNote", noteTextarea.value);

        if (noteStatus) {
            noteStatus.textContent = "Сохранено только что";

            setTimeout(() => {
                noteStatus.textContent = "Последнее изменение: только что";
            }, 2000);
        }
    }

    if (noteSaveButton) {
        noteSaveButton.addEventListener("click", saveNote);
    }

    // Автоматически сохраняем заметку
    if (noteTextarea) {
        noteTextarea.addEventListener("input", () => {
            localStorage.setItem("dailyNote", noteTextarea.value);

            if (noteStatus) {
                noteStatus.textContent = "Сохранение...";
            }

            clearTimeout(window.noteSaveTimer);

            window.noteSaveTimer = setTimeout(() => {
                if (noteStatus) {
                    noteStatus.textContent = "Сохранено только что";
                }
            }, 700);
        });
    }

    // ==========================================
    // CALENDAR
    // ==========================================

    const calendarDays = document.querySelectorAll(".days span");

    calendarDays.forEach(day => {
        day.addEventListener("click", () => {
            calendarDays.forEach(item => {
                item.classList.remove("selected");
            });

            day.classList.add("selected");
        });
    });

    // ==========================================
    // NAVIGATION
    // ==========================================

    const navItems = document.querySelectorAll(".navigation .nav-item");

    navItems.forEach(item => {
        item.addEventListener("click", event => {
            event.preventDefault();

            navItems.forEach(nav => {
                nav.classList.remove("active");
            });

            item.classList.add("active");
        });
    });

    // ==========================================
    // MY LISTS
    // ==========================================

    const listItems = document.querySelectorAll(".list-item");

    listItems.forEach(item => {
        item.addEventListener("click", () => {
            listItems.forEach(list => {
                list.classList.remove("selected");
            });

            item.classList.add("selected");
        });
    });

    // ==========================================
    // ADD NEW LIST
    // ==========================================

    const addListButton = document.querySelector(".add-list");

    if (addListButton) {
        addListButton.addEventListener("click", () => {
            const name = prompt("Введите название нового списка:");

            if (!name || !name.trim()) {
                return;
            }

            const sidebarSection = document.querySelector(".sidebar-section");

            if (!sidebarSection) return;

            const newList = document.createElement("div");

            newList.className = "list-item";

            newList.innerHTML = `
                <span class="list-dot personal"></span>
                ${escapeHTML(name.trim())}
            `;

            sidebarSection.appendChild(newList);

            newList.addEventListener("click", () => {
                document.querySelectorAll(".list-item").forEach(item => {
                    item.classList.remove("selected");
                });

                newList.classList.add("selected");
            });
        });
    }

    // ==========================================
    // CALENDAR ARROWS
    // ==========================================

    const calendarButtons = document.querySelectorAll(".calendar-arrows button");

    calendarButtons.forEach(button => {
        button.addEventListener("click", () => {
            button.style.transform = "scale(0.9)";

            setTimeout(() => {
                button.style.transform = "";
            }, 120);
        });
    });

    // ==========================================
    // CARD ANIMATION
    // ==========================================

    const cards = document.querySelectorAll(".card");

    cards.forEach((card, index) => {
        card.style.animationDelay = `${index * 0.08}s`;
    });

    // ==========================================
    // INITIALIZATION
    // ==========================================

    renderTasks();
    loadNote();

    console.log("Daily успешно запущен.");
});
