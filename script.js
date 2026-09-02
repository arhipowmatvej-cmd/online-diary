```javascript
/* =========================================================
   MYDAY — INTERACTIVE TASKS
   ========================================================= */

document.addEventListener("DOMContentLoaded", () => {

    const addButtons = document.querySelectorAll(".primary-button, .add-task");
    const tasksList = document.querySelector(".tasks-list");
    const progressValue = document.querySelector(".progress-value");
    const progressText = document.querySelector(".progress-info strong");

    let taskCounter = 5;
    let completedTasks = 2;


    /* =====================================================
       ОБНОВЛЕНИЕ ПРОГРЕССА
       ===================================================== */

    function updateProgress() {

        const tasks = tasksList.querySelectorAll(".task");

        const total = tasks.length;

        completedTasks = tasksList.querySelectorAll(".task.completed").length;

        if (total === 0) {
            progressValue.style.width = "0%";
            progressText.textContent = "0 из 0";
            return;
        }

        const percentage = (completedTasks / total) * 100;

        progressValue.style.width = `${percentage}%`;

        progressText.textContent =
            `${completedTasks} из ${total}`;
    }


    /* =====================================================
       СОЗДАНИЕ ЗАДАЧИ
       ===================================================== */

    function createTask(title, time = "Без времени") {

        taskCounter++;

        const task = document.createElement("div");

        task.className = "task";

        task.innerHTML = `
            <div class="check"></div>

            <div class="task-content">

                <strong>${escapeHtml(title)}</strong>

                <span>${escapeHtml(time)}</span>

            </div>
        `;

        tasksList.appendChild(task);

        attachTaskEvents(task);

        updateProgress();
    }


    /* =====================================================
       ЗАЩИТА ОТ HTML ВВОДА
       ===================================================== */

    function escapeHtml(text) {

        const div = document.createElement("div");

        div.textContent = text;

        return div.innerHTML;
    }


    /* =====================================================
       ОБРАБОТКА ЗАДАЧИ
       ===================================================== */

    function attachTaskEvents(task) {

        const check = task.querySelector(".check");

        check.addEventListener("click", (event) => {

            event.stopPropagation();

            task.classList.toggle("completed");

            if (task.classList.contains("completed")) {

                check.textContent = "✓";

            } else {

                check.textContent = "";

            }

            updateProgress();
        });


        task.addEventListener("dblclick", () => {

            const currentTitle =
                task.querySelector("strong").textContent;

            const newTitle =
                prompt("Изменить задачу:", currentTitle);

            if (
                newTitle !== null &&
                newTitle.trim() !== ""
            ) {

                task.querySelector("strong").textContent =
                    newTitle.trim();
            }

        });

    }


    /* =====================================================
       ПОДКЛЮЧЕНИЕ СОБЫТИЙ К СУЩЕСТВУЮЩИМ ЗАДАЧАМ
       ===================================================== */

    document
        .querySelectorAll(".tasks-list .task")
        .forEach(task => {

            attachTaskEvents(task);

        });


    /* =====================================================
       КНОПКА ДОБАВЛЕНИЯ
       ===================================================== */

    addButtons.forEach(button => {

        button.addEventListener("click", () => {

            const title =
                prompt("Введите название новой задачи:");

            if (!title || title.trim() === "") {
                return;
            }


            const time =
                prompt(
                    "Введите время задачи:",
                    "12:00"
                );


            createTask(
                title.trim(),
                time && time.trim()
                    ? time.trim()
                    : "Без времени"
            );

        });

    });


    /* =====================================================
       АКТИВНАЯ НАВИГАЦИЯ
       ===================================================== */

    const navigationItems =
        document.querySelectorAll(".nav-item");

    navigationItems.forEach(item => {

        item.addEventListener("click", event => {

            event.preventDefault();

            navigationItems.forEach(nav => {

                nav.classList.remove("active");

            });

            item.classList.add("active");

        });

    });


    /* =====================================================
       КНОПКИ "..."
       ===================================================== */

    document
        .querySelectorAll(".more-button")
        .forEach(button => {

            button.addEventListener("click", () => {

                alert(
                    "Дополнительные функции появятся на следующем этапе."
                );

            });

        });


    /* =====================================================
       ПРОФИЛЬ
       ===================================================== */

    const profileButton =
        document.querySelector(".profile-more");

    if (profileButton) {

        profileButton.addEventListener("click", () => {

            alert(
                "Здесь будет меню аккаунта."
            );

        });

    }


    /* =====================================================
       ОБНОВЛЕНИЕ ПРОГРЕССА ПРИ ЗАПУСКЕ
       ===================================================== */

    updateProgress();

});
```
