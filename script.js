```javascript
document.addEventListener("DOMContentLoaded", () => {

    /* =========================================
       ДАННЫЕ
    ========================================= */

    let tasks = JSON.parse(localStorage.getItem("dailyTasks")) || [
        {
            text: "Проверить электронную почту",
            time: "09:00",
            completed: true
        },
        {
            text: "Подготовить план проекта",
            time: "10:30",
            completed: true
        },
        {
            text: "Работа над ежедневником",
            time: "14:00",
            completed: false
        },
        {
            text: "Прогулка и отдых",
            time: "18:30",
            completed: false
        }
    ];

    let note = localStorage.getItem("dailyNote") || "";


    /* =========================================
       ЭЛЕМЕНТЫ
    ========================================= */

    const taskList = document.querySelector(".task-list");
    const addTaskButton = document.querySelector(".add-task");
    const newTaskButton = document.querySelector(".new-task-button");

    const noteTextarea = document.querySelector(".note-card textarea");
    const saveNoteButton = document.querySelector(".note-footer button");

    const progressValue = document.querySelector(".progress-value");
    const progressPercent = document.querySelector(".progress-info strong");
    const progressText = document.querySelector(".progress-card small");

    const statNumber = document.querySelector(".stat-number");


    /* =========================================
       СОХРАНЕНИЕ
    ========================================= */

    function saveTasks() {
        localStorage.setItem("dailyTasks", JSON.stringify(tasks));
    }

    function saveNote() {
        localStorage.setItem("dailyNote", note);
    }


    /* =========================================
       ОТРИСОВКА ЗАДАЧ
    ========================================= */

    function renderTasks() {

        taskList.innerHTML = "";

        tasks.forEach((task, index) => {

            const label = document.createElement("label");

            label.className = "task";

            if (task.completed) {
                label.classList.add("completed");
            }

            label.innerHTML = `
                <input type="checkbox" ${task.completed ? "checked" : ""}>

                <span class="custom-checkbox">
                    ${task.completed ? "✓" : ""}
                </span>

                <span class="task-text">
                    ${escapeHTML(task.text)}
                </span>

                <span class="task-time">
                    ${escapeHTML(task.time)}
                </span>
            `;

            const checkbox = label.querySelector("input");

            checkbox.addEventListener("change", () => {

                tasks[index].completed = checkbox.checked;

                saveTasks();
                renderTasks();
                updateProgress();

            });

            taskList.appendChild(label);
        });

        updateProgress();
    }


    /* =========================================
       ЗАЩИТА ОТ HTML
    ========================================= */

    function escapeHTML(text) {

        const div = document.createElement("div");

        div.textContent = text;

        return div.innerHTML;
    }


    /* =========================================
       ПРОГРЕСС
    ========================================= */

    function updateProgress() {

        const total = tasks.length;

        const completed = tasks.filter(
            task => task.completed
        ).length;

        const percent = total === 0
            ? 0
            : Math.round((completed / total) * 100);

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

        if (statNumber) {
            statNumber.firstChild.textContent = completed;
        }
    }


    /* =========================================
       ДОБАВЛЕНИЕ ЗАДАЧИ
    ========================================= */

    function createTask() {

        const text = prompt("Введите задачу:");

        if (!text || !text.trim()) {
            return;
        }

        const time = prompt(
            "Введите время задачи:",
            "12:00"
        );

        tasks.push({
            text: text.trim(),
            time: time && time.trim()
                ? time.trim()
                : "",
            completed: false
        });

        saveTasks();
        renderTasks();
    }


    if (addTaskButton) {
        addTaskButton.addEventListener(
            "click",
            createTask
        );
    }


    if (newTaskButton) {
        newTaskButton.addEventListener(
            "click",
            createTask
        );
    }


    /* =========================================
       ЗАМЕТКИ
    ========================================= */

    if (noteTextarea) {

        noteTextarea.value = note;

        noteTextarea.addEventListener(
            "input",
            () => {
                note = noteTextarea.value;
            }
        );
    }


    if (saveNoteButton) {

        saveNoteButton.addEventListener(
            "click",
            () => {

                saveNote();

                saveNoteButton.textContent =
                    "Сохранено ✓";

                setTimeout(() => {

                    saveNoteButton.textContent =
                        "Сохранить";

                }, 1500);
            }
        );
    }


    /* =========================================
       КАЛЕНДАРЬ
    ========================================= */

    const calendarDays =
        document.querySelectorAll(".days span");

    calendarDays.forEach(day => {

        day.addEventListener("click", () => {

            if (
                day.classList.contains(
                    "other-month"
                )
            ) {
                return;
            }

            calendarDays.forEach(item => {
                item.classList.remove("selected");
            });

            day.classList.add("selected");
        });
    });


    /* =========================================
       НАВИГАЦИЯ
    ========================================= */

    const navigationItems =
        document.querySelectorAll(
            ".navigation .nav-item"
        );

    navigationItems.forEach(item => {

        item.addEventListener("click", event => {

            event.preventDefault();

            navigationItems.forEach(nav => {
                nav.classList.remove("active");
            });

            item.classList.add("active");
        });
    });


    /* =========================================
       КНОПКА + В МОИХ СПИСКАХ
    ========================================= */

    const addListButton =
        document.querySelector(".add-list");

    if (addListButton) {

        addListButton.addEventListener(
            "click",
            () => {

                const name = prompt(
                    "Название нового списка:"
                );

                if (!name || !name.trim()) {
                    return;
                }

                const listContainer =
                    document.querySelector(
                        ".sidebar-section"
                    );

                const newList =
                    document.createElement("div");

                newList.className = "list-item";

                newList.innerHTML = `
                    <span class="list-dot"></span>
                    ${escapeHTML(name.trim())}
                `;

                listContainer.appendChild(newList);
            }
        );
    }


    /* =========================================
       АНИМАЦИЯ ПРИ ЗАПУСКЕ
    ========================================= */

    const cards =
        document.querySelectorAll(".card");

    cards.forEach((card, index) => {

        card.style.opacity = "0";
        card.style.transform = "translateY(10px)";

        setTimeout(() => {

            card.style.transition =
                "opacity 0.45s ease, transform 0.45s ease";

            card.style.opacity = "1";
            card.style.transform = "translateY(0)";

        }, 80 * index);
    });


    /* =========================================
       ЗАПУСК
    ========================================= */

    if (noteTextarea) {
        noteTextarea.value = note;
    }

    renderTasks();

});
```
