document.addEventListener("DOMContentLoaded", function () {

    // =====================================================
    // DAILY — COMPLETE APPLICATION
    // =====================================================

    const STORAGE_TASKS = "dailyTasks";
    const STORAGE_NOTES = "dailyNotes";
    const STORAGE_SETTINGS = "dailySettings";


    // =====================================================
    // STATE
    // =====================================================

    let tasks = [];
    let notes = {};
    let settings = {
        userName: "Матвей",
        showCompleted: true
    };

    let selectedDate = getTodayString();

    let calendarDate = new Date();

    let currentPage = "today";

    let currentTaskId = null;

    let currentTaskFilter = "all";

    let selectedList = "all";


    // =====================================================
    // DEFAULT TASKS
    // =====================================================

    const defaultTasks = [
        {
            id: Date.now() - 4000,
            title: "Проверить электронную почту",
            date: getTodayString(),
            time: "09:00",
            category: "work",
            description: "",
            completed: true,
            favorite: false
        },

        {
            id: Date.now() - 3000,
            title: "Подготовить план проекта",
            date: getTodayString(),
            time: "10:30",
            category: "work",
            description: "",
            completed: true,
            favorite: true
        },

        {
            id: Date.now() - 2000,
            title: "Работа над ежедневником",
            date: getTodayString(),
            time: "14:00",
            category: "personal",
            description: "",
            completed: false,
            favorite: true
        },

        {
            id: Date.now() - 1000,
            title: "Прогулка и отдых",
            date: getTodayString(),
            time: "18:30",
            category: "personal",
            description: "",
            completed: false,
            favorite: false
        }
    ];


    // =====================================================
    // ELEMENTS
    // =====================================================

    const modal =
        document.getElementById("taskModal");

    const form =
        document.getElementById("taskForm");

    const taskNameInput =
        document.getElementById("taskName");

    const taskDateInput =
        document.getElementById("taskDate");

    const taskTimeInput =
        document.getElementById("taskTime");

    const taskCategoryInput =
        document.getElementById("taskCategory");

    const taskDescriptionInput =
        document.getElementById("taskDescription");

    const modalTitle =
        document.getElementById("modalTitle");

    const submitTaskButton =
        document.getElementById("submitTaskButton");

    const closeTaskModal =
        document.getElementById("closeTaskModal");

    const cancelTask =
        document.getElementById("cancelTask");


    const todayTaskList =
        document.getElementById("todayTaskList");

    const allTasksList =
        document.getElementById("allTasksList");

    const favoriteTasksList =
        document.getElementById("favoriteTasksList");


    const progressValue =
        document.getElementById("progressValue");

    const progressPercent =
        document.getElementById("progressPercent");

    const progressText =
        document.getElementById("progressText");

    const navCount =
        document.querySelector(".nav-count");


    const calendarDays =
        document.getElementById("calendarDays");

    const calendarTitle =
        document.getElementById("calendarTitle");


    const largeCalendarDays =
        document.getElementById("largeCalendarDays");

    const largeCalendarTitle =
        document.getElementById("largeCalendarTitle");


    const noteTextarea =
        document.getElementById("noteTextarea");

    const noteStatus =
        document.getElementById("noteStatus");


    const statNumber =
        document.getElementById("statNumber");

    const miniChart =
        document.getElementById("miniChart");


    // =====================================================
    // DATE FUNCTIONS
    // =====================================================

    function getTodayString() {

        const now = new Date();

        return formatDateInput(now);
    }


    function formatDateInput(date) {

        const year = date.getFullYear();

        const month =
            String(date.getMonth() + 1)
                .padStart(2, "0");

        const day =
            String(date.getDate())
                .padStart(2, "0");

        return `${year}-${month}-${day}`;
    }


    function parseDate(dateString) {

        const parts = dateString.split("-");

        return new Date(
            Number(parts[0]),
            Number(parts[1]) - 1,
            Number(parts[2])
        );
    }


    function formatLongDate(dateString) {

        const date = parseDate(dateString);

        return date.toLocaleDateString(
            "ru-RU",
            {
                day: "numeric",
                month: "long",
                year: "numeric"
            }
        );
    }


    function formatShortDate(dateString) {

        const date = parseDate(dateString);

        return date.toLocaleDateString(
            "ru-RU",
            {
                day: "2-digit",
                month: "2-digit",
                year: "numeric"
            }
        );
    }


    function formatDayTitle(dateString) {

        const date = parseDate(dateString);

        return date.toLocaleDateString(
            "ru-RU",
            {
                weekday: "long",
                day: "numeric",
                month: "long"
            }
        );
    }


    function monthName(date) {

        return date.toLocaleDateString(
            "ru-RU",
            {
                month: "long",
                year: "numeric"
            }
        );
    }


    function upperMonthName(date) {

        return monthName(date)
            .replace(" г.", "")
            .toUpperCase();
    }


    // =====================================================
    // LOCAL STORAGE
    // =====================================================

    function loadData() {

        const savedTasks =
            localStorage.getItem(STORAGE_TASKS);

        const savedNotes =
            localStorage.getItem(STORAGE_NOTES);

        const savedSettings =
            localStorage.getItem(STORAGE_SETTINGS);


        if (savedTasks) {

            try {

                tasks = JSON.parse(savedTasks);

                if (!Array.isArray(tasks)) {
                    tasks = [];
                }

            } catch (error) {

                console.error(
                    "Ошибка загрузки задач:",
                    error
                );

                tasks = [];
            }

        } else {

            tasks = [...defaultTasks];

            saveTasks();
        }


        if (savedNotes) {

            try {

                notes = JSON.parse(savedNotes);

                if (
                    !notes ||
                    typeof notes !== "object"
                ) {
                    notes = {};
                }

            } catch (error) {

                notes = {};
            }
        }


        if (savedSettings) {

            try {

                settings = {
                    ...settings,
                    ...JSON.parse(savedSettings)
                };

            } catch (error) {
                console.error(
                    "Ошибка загрузки настроек:",
                    error
                );
            }
        }
    }


    function saveTasks() {

        localStorage.setItem(
            STORAGE_TASKS,
            JSON.stringify(tasks)
        );
    }


    function saveNotes() {

        localStorage.setItem(
            STORAGE_NOTES,
            JSON.stringify(notes)
        );
    }


    function saveSettingsData() {

        localStorage.setItem(
            STORAGE_SETTINGS,
            JSON.stringify(settings)
        );
    }


    // =====================================================
    // CATEGORY
    // =====================================================

    function categoryName(category) {

        if (category === "work") {
            return "Работа";
        }

        if (category === "study") {
            return "Учёба";
        }

        return "Личное";
    }


    function categoryClass(category) {

        return "category-" + category;
    }


    // =====================================================
    // TODAY TASKS
    // =====================================================

    function getTasksForDate(date) {

        return tasks
            .filter(function (task) {

                return task.date === date;
            })
            .sort(function (a, b) {

                if (
                    a.completed !==
                    b.completed
                ) {

                    return a.completed ? 1 : -1;
                }

                return String(a.time || "")
                    .localeCompare(
                        String(b.time || "")
                    );
            });
    }


    // =====================================================
    // TASK ROW
    // =====================================================

    function createTaskRow(task) {

        const row =
            document.createElement("div");

        row.className =
            "all-task-row";


        const check =
            document.createElement("label");

        check.className = "task";

        check.style.padding = "0";

        check.style.width = "auto";


        check.innerHTML = `
            <input
                type="checkbox"
                ${task.completed ? "checked" : ""}
            >

            <span class="custom-checkbox">
                ${task.completed ? "✓" : ""}
            </span>
        `;


        check
            .querySelector("input")
            .addEventListener(
                "change",
                function () {

                    toggleTask(task.id);
                }
            );


        const main =
            document.createElement("div");

        main.className =
            "all-task-main";


        const title =
            document.createElement("div");

        title.className =
            "all-task-title";

        title.textContent =
            task.title;


        if (task.completed) {

            title.style.textDecoration =
                "line-through";

            title.style.color =
                "var(--text-light)";
        }


        const meta =
            document.createElement("div");

        meta.className =
            "all-task-meta";


        const date =
            document.createElement("span");

        date.textContent =
            formatShortDate(task.date);


        const time =
            document.createElement("span");

        time.textContent =
            task.time || "Без времени";


        const category =
            document.createElement("span");

        category.className =
            "category-badge " +
            categoryClass(task.category);

        category.textContent =
            categoryName(task.category);


        meta.appendChild(date);
        meta.appendChild(time);
        meta.appendChild(category);


        main.appendChild(title);
        main.appendChild(meta);


        const actions =
            document.createElement("div");

        actions.className =
            "task-actions";


        const favorite =
            document.createElement("button");

        favorite.type = "button";

        favorite.className =
            "task-action favorite-button";

        if (task.favorite) {
            favorite.classList.add("is-favorite");
        }

        favorite.textContent =
            task.favorite ? "★" : "☆";

        favorite.title =
            "Добавить в избранное";


        favorite.addEventListener(
            "click",
            function () {

                toggleFavorite(task.id);
            }
        );


        const edit =
            document.createElement("button");

        edit.type = "button";

        edit.className =
            "task-action";

        edit.textContent = "✎";

        edit.title = "Редактировать";


        edit.addEventListener(
            "click",
            function () {

                openEditTask(task.id);
            }
        );


        const remove =
            document.createElement("button");

        remove.type = "button";

        remove.className =
            "task-action delete";

        remove.textContent = "×";

        remove.title = "Удалить";


        remove.addEventListener(
            "click",
            function () {

                deleteTask(task.id);
            }
        );


        actions.appendChild(favorite);
        actions.appendChild(edit);
        actions.appendChild(remove);


        row.appendChild(check);
        row.appendChild(main);
        row.appendChild(actions);


        return row;
    }


    // =====================================================
    // RENDER TODAY
    // =====================================================

    function renderTodayTasks() {

        if (!todayTaskList) {
            return;
        }


        todayTaskList.innerHTML = "";


        let dateTasks =
            getTasksForDate(selectedDate);


        if (!settings.showCompleted) {

            dateTasks =
                dateTasks.filter(
                    task => !task.completed
                );
        }


        if (dateTasks.length === 0) {

            todayTaskList.innerHTML = `
                <div class="empty-tasks">

                    <div class="empty-tasks-icon">
                        ✓
                    </div>

                    <strong>
                        Отлично!
                    </strong>

                    <span>
                        На этот день задач нет
                    </span>

                </div>
            `;

            updateProgress();

            return;
        }


        dateTasks.forEach(function (task) {

            const row =
                document.createElement("label");

            row.className = "task";

            if (task.completed) {
                row.classList.add("completed");
            }


            row.innerHTML = `
                <input
                    type="checkbox"
                    ${task.completed ? "checked" : ""}
                >

                <span class="custom-checkbox">
                    ${task.completed ? "✓" : ""}
                </span>

                <span class="task-text"></span>

                <span class="task-time">
                    ${task.time || ""}
                </span>
            `;


            row
                .querySelector(".task-text")
                .textContent =
                task.title;


            row
                .querySelector("input")
                .addEventListener(
                    "change",
                    function () {

                        toggleTask(task.id);
                    }
                );


            row.addEventListener(
                "dblclick",
                function () {

                    openEditTask(task.id);
                }
            );


            todayTaskList.appendChild(row);
        });


        updateProgress();
    }


    // =====================================================
    // PROGRESS
    // =====================================================

    function updateProgress() {

        const dateTasks =
            getTasksForDate(selectedDate);


        const total =
            dateTasks.length;


        const completed =
            dateTasks.filter(
                task => task.completed
            ).length;


        const percent =
            total === 0
                ? 0
                : Math.round(
                    completed / total * 100
                );


        if (progressValue) {

            progressValue.style.width =
                percent + "%";
        }


        if (progressPercent) {

            progressPercent.textContent =
                percent + "%";
        }


        if (progressText) {

            progressText.textContent =
                `${completed} из ${total} задач выполнено`;
        }


        if (navCount) {

            const activeCount =
                tasks.filter(
                    task => !task.completed
                ).length;

            navCount.textContent =
                activeCount;
        }
    }


    // =====================================================
    // TOGGLE TASK
    // =====================================================

    function toggleTask(id) {

        const task =
            tasks.find(
                item => Number(item.id) === Number(id)
            );


        if (!task) {
            return;
        }


        task.completed =
            !task.completed;


        saveTasks();

        renderAll();
    }


    // =====================================================
    // FAVORITE
    // =====================================================

    function toggleFavorite(id) {

        const task =
            tasks.find(
                item => Number(item.id) === Number(id)
            );


        if (!task) {
            return;
        }


        task.favorite =
            !task.favorite;


        saveTasks();

        renderAll();
    }


    // =====================================================
    // DELETE TASK
    // =====================================================

    function deleteTask(id) {

        const task =
            tasks.find(
                item => Number(item.id) === Number(id)
            );


        if (!task) {
            return;
        }


        const confirmed =
            confirm(
                `Удалить задачу «${task.title}»?`
            );


        if (!confirmed) {
            return;
        }


        tasks =
            tasks.filter(
                item =>
                    Number(item.id) !== Number(id)
            );


        saveTasks();

        renderAll();
    }


    // =====================================================
    // OPEN NEW TASK
    // =====================================================

    function openNewTask() {

        currentTaskId = null;


        if (modalTitle) {
            modalTitle.textContent =
                "Новая задача";
        }


        if (submitTaskButton) {
            submitTaskButton.textContent =
                "Создать задачу";
        }


        if (form) {
            form.reset();
        }


        if (taskDateInput) {
            taskDateInput.value =
                selectedDate;
        }


        if (taskTimeInput) {
            taskTimeInput.value =
                "12:00";
        }


        if (taskCategoryInput) {
            taskCategoryInput.value =
                "personal";
        }


        if (modal) {
            modal.classList.add("show");
        }


        setTimeout(function () {

            if (taskNameInput) {
                taskNameInput.focus();
            }

        }, 100);
    }


    // =====================================================
    // EDIT TASK
    // =====================================================

    function openEditTask(id) {

        const task =
            tasks.find(
                item =>
                    Number(item.id) === Number(id)
            );


        if (!task) {
            return;
        }


        currentTaskId =
            task.id;


        if (modalTitle) {

            modalTitle.textContent =
                "Редактировать задачу";
        }


        if (submitTaskButton) {

            submitTaskButton.textContent =
                "Сохранить изменения";
        }


        taskNameInput.value =
            task.title || "";


        taskDateInput.value =
            task.date || selectedDate;


        taskTimeInput.value =
            task.time || "12:00";


        taskCategoryInput.value =
            task.category || "personal";


        taskDescriptionInput.value =
            task.description || "";


        if (modal) {
            modal.classList.add("show");
        }


        setTimeout(function () {

            taskNameInput.focus();

        }, 100);
    }


    // =====================================================
    // CLOSE TASK MODAL
    // =====================================================

    function closeTaskWindow() {

        if (modal) {
            modal.classList.remove("show");
        }


        currentTaskId = null;


        if (form) {
            form.reset();
        }


        if (taskDateInput) {
            taskDateInput.value =
                selectedDate;
        }


        if (taskTimeInput) {
            taskTimeInput.value =
                "12:00";
        }
    }


    // =====================================================
    // FORM SUBMIT
    // =====================================================

    if (form) {

        form.addEventListener(
            "submit",
            function (event) {

                event.preventDefault();


                const title =
                    taskNameInput.value.trim();


                if (!title) {

                    taskNameInput.focus();

                    return;
                }


                const date =
                    taskDateInput.value ||
                    selectedDate;


                const time =
                    taskTimeInput.value;


                const category =
                    taskCategoryInput.value;


                const description =
                    taskDescriptionInput.value.trim();


                // EDIT

                if (currentTaskId !== null) {

                    const task =
                        tasks.find(
                            item =>
                                Number(item.id) ===
                                Number(currentTaskId)
                        );


                    if (task) {

                        task.title =
                            title;

                        task.date =
                            date;

                        task.time =
                            time;

                        task.category =
                            category;

                        task.description =
                            description;
                    }

                }

                // NEW

                else {

                    tasks.push({

                        id: Date.now(),

                        title: title,

                        date: date,

                        time: time,

                        category: category,

                        description: description,

                        completed: false,

                        favorite: false
                    });
                }


                saveTasks();


                selectedDate =
                    date;


                closeTaskWindow();

                renderAll();
            }
        );
    }


    // =====================================================
    // BUTTONS — OPEN TASK
    // =====================================================

    document
        .querySelectorAll(".new-task-button, .add-task")
        .forEach(function (button) {

            button.addEventListener(
                "click",
                function (event) {

                    event.preventDefault();

                    openNewTask();
                }
            );
        });


    // =====================================================
    // CLOSE MODAL
    // =====================================================

    if (closeTaskModal) {

        closeTaskModal.addEventListener(
            "click",
            closeTaskWindow
        );
    }


    if (cancelTask) {

        cancelTask.addEventListener(
            "click",
            closeTaskWindow
        );
    }


    if (modal) {

        modal.addEventListener(
            "click",
            function (event) {

                if (
                    event.target === modal
                ) {

                    closeTaskWindow();
                }
            }
        );
    }


    // =====================================================
    // CALENDAR
    // =====================================================

    function renderSmallCalendar() {

        if (!calendarDays) {
            return;
        }


        calendarDays.innerHTML = "";


        const year =
            calendarDate.getFullYear();

        const month =
            calendarDate.getMonth();


        if (calendarTitle) {

            calendarTitle.textContent =
                upperMonthName(calendarDate);
        }


        const firstDay =
            new Date(
                year,
                month,
                1
            );


        let startDay =
            firstDay.getDay();


        startDay =
            startDay === 0
                ? 6
                : startDay - 1;


        const daysInMonth =
            new Date(
                year,
                month + 1,
                0
            ).getDate();


        const daysInPreviousMonth =
            new Date(
                year,
                month,
                0
            ).getDate();


        const totalCells = 42;


        for (
            let index = 0;
            index < totalCells;
            index++
        ) {

            let dayNumber;

            let date;

            let otherMonth = false;


            if (index < startDay) {

                dayNumber =
                    daysInPreviousMonth -
                    startDay +
                    index +
                    1;


                date =
                    new Date(
                        year,
                        month - 1,
                        dayNumber
                    );


                otherMonth = true;

            } else if (
                index >=
                startDay + daysInMonth
            ) {

                dayNumber =
                    index -
                    startDay -
                    daysInMonth +
                    1;


                date =
                    new Date(
                        year,
                        month + 1,
                        dayNumber
                    );


                otherMonth = true;

            } else {

                dayNumber =
                    index -
                    startDay +
                    1;


                date =
                    new Date(
                        year,
                        month,
                        dayNumber
                    );
            }


            const dateString =
                formatDateInput(date);


            const day =
                document.createElement("span");


            day.textContent =
                dayNumber;


            if (otherMonth) {
                day.classList.add(
                    "other-month"
                );
            }


            if (
                dateString ===
                getTodayString()
            ) {

                day.classList.add("today");
            }


            if (
                dateString ===
                selectedDate
            ) {

                day.classList.add("selected");
            }


            const hasTasks =
                tasks.some(
                    task =>
                        task.date ===
                        dateString
                );


            if (hasTasks) {

                day.classList.add(
                    "has-tasks"
                );
            }


            day.addEventListener(
                "click",
                function () {

                    selectedDate =
                        dateString;


                    calendarDate =
                        new Date(
                            date.getFullYear(),
                            date.getMonth(),
                            1
                        );


                    renderAll();
                }
            );


            calendarDays.appendChild(day);
        }
    }


    // =====================================================
    // CALENDAR MONTH
    // =====================================================

    function changeMonth(direction) {

        calendarDate.setMonth(
            calendarDate.getMonth() +
            direction
        );


        renderSmallCalendar();
        renderLargeCalendar();
    }


    document
        .getElementById("previousMonth")
        ?.addEventListener(
            "click",
            function () {

                changeMonth(-1);
            }
        );


    document
        .getElementById("nextMonth")
        ?.addEventListener(
            "click",
            function () {

                changeMonth(1);
            }
        );


    // =====================================================
    // LARGE CALENDAR
    // =====================================================

    function renderLargeCalendar() {

        if (!largeCalendarDays) {
            return;
        }


        largeCalendarDays.innerHTML =
            "";


        if (largeCalendarTitle) {

            largeCalendarTitle.textContent =
                upperMonthName(calendarDate);
        }


        const year =
            calendarDate.getFullYear();

        const month =
            calendarDate.getMonth();


        const firstDay =
            new Date(
                year,
                month,
                1
            );


        let startDay =
            firstDay.getDay();


        startDay =
            startDay === 0
                ? 6
                : startDay - 1;


        const daysInMonth =
            new Date(
                year,
                month + 1,
                0
            ).getDate();


        const daysInPreviousMonth =
            new Date(
                year,
                month,
                0
            ).getDate();


        for (
            let index = 0;
            index < 42;
            index++
        ) {

            let date;

            let dayNumber;

            let otherMonth =
                false;


            if (index < startDay) {

                dayNumber =
                    daysInPreviousMonth -
                    startDay +
                    index +
                    1;


                date =
                    new Date(
                        year,
                        month - 1,
                        dayNumber
                    );


                otherMonth = true;

            } else if (
                index >=
                startDay + daysInMonth
            ) {

                dayNumber =
                    index -
                    startDay -
                    daysInMonth +
                    1;


                date =
                    new Date(
                        year,
                        month + 1,
                        dayNumber
                    );


                otherMonth = true;

            } else {

                dayNumber =
                    index -
                    startDay +
                    1;


                date =
                    new Date(
                        year,
                        month,
                        dayNumber
                    );
            }


            const dateString =
                formatDateInput(date);


            const cell =
                document.createElement("div");


            cell.className =
                "large-calendar-day";


            if (otherMonth) {

                cell.classList.add(
                    "other-month"
                );
            }


            if (
                dateString ===
                getTodayString()
            ) {

                cell.classList.add(
                    "today"
                );
            }


            if (
                dateString ===
                selectedDate
            ) {

                cell.classList.add(
                    "selected"
                );
            }


            const number =
                document.createElement("div");


            number.className =
                "large-day-number";


            number.textContent =
                dayNumber;


            cell.appendChild(number);


            const dayTasks =
                tasks.filter(
                    task =>
                        task.date ===
                        dateString
                );


            if (dayTasks.length > 0) {

                const taskContainer =
                    document.createElement("div");


                taskContainer.className =
                    "large-day-tasks";


                dayTasks
                    .slice(0, 3)
                    .forEach(function (task) {

                        const taskDot =
                            document.createElement(
                                "div"
                            );


                        taskDot.className =
                            "calendar-task-dot";


                        taskDot.textContent =
                            task.title;


                        taskContainer
                            .appendChild(
                                taskDot
                            );
                    });


                cell.appendChild(
                    taskContainer
                );
            }


            cell.addEventListener(
                "click",
                function () {

                    selectedDate =
                        dateString;


                    calendarDate =
                        new Date(
                            date.getFullYear(),
                            date.getMonth(),
                            1
                        );


                    renderAll();

                    switchPage("today");
                }
            );


            largeCalendarDays.appendChild(
                cell
            );
        }
    }


    document
        .getElementById("largePreviousMonth")
        ?.addEventListener(
            "click",
            function () {

                changeMonth(-1);
            }
        );


    document
        .getElementById("largeNextMonth")
        ?.addEventListener(
            "click",
            function () {

                changeMonth(1);
            }
        );


    // =====================================================
    // ALL TASKS
    // =====================================================

    function renderAllTasks() {

        if (!allTasksList) {
            return;
        }


        allTasksList.innerHTML = "";


        let filtered =
            [...tasks];


        if (
            currentTaskFilter ===
            "active"
        ) {

            filtered =
                filtered.filter(
                    task => !task.completed
                );
        }


        if (
            currentTaskFilter ===
            "completed"
        ) {

            filtered =
                filtered.filter(
                    task => task.completed
                );
        }


        if (
            selectedList !==
            "all"
        ) {

            filtered =
                filtered.filter(
                    task =>
                        task.category ===
                        selectedList
                );
        }


        if (!settings.showCompleted) {

            filtered =
                filtered.filter(
                    task =>
                        !task.completed
                );
        }


        filtered.sort(function (a, b) {

            if (
                a.completed !==
                b.completed
            ) {

                return a.completed ? 1 : -1;
            }


            return (
                a.date + a.time
            ).localeCompare(
                b.date + b.time
            );
        });


        if (filtered.length === 0) {

            allTasksList.innerHTML = `
                <div class="empty-tasks">

                    <div class="empty-tasks-icon">
                        ✓
                    </div>

                    <strong>
                        Ничего не найдено
                    </strong>

                    <span>
                        Здесь пока нет задач
                    </span>

                </div>
            `;

            return;
        }


        filtered.forEach(function (task) {

            allTasksList.appendChild(
                createTaskRow(task)
            );
        });
    }


    // =====================================================
    // FAVORITES
    // =====================================================

    function renderFavorites() {

        if (!favoriteTasksList) {
            return;
        }


        favoriteTasksList.innerHTML =
            "";


        const favorites =
            tasks.filter(
                task => task.favorite
            );


        if (favorites.length === 0) {

            favoriteTasksList.innerHTML = `
                <div class="empty-tasks">

                    <div class="empty-tasks-icon">
                        ☆
                    </div>

                    <strong>
                        Избранное пусто
                    </strong>

                    <span>
                        Нажмите ☆ возле задачи,
                        чтобы добавить её сюда
                    </span>

                </div>
            `;

            return;
        }


        favorites.forEach(function (task) {

            favoriteTasksList.appendChild(
                createTaskRow(task)
            );
        });
    }


    // =====================================================
    // NOTE
    // =====================================================

    function loadCurrentNote() {

        if (!noteTextarea) {
            return;
        }


        noteTextarea.value =
            notes[selectedDate] || "";


        if (noteStatus) {

            noteStatus.textContent =
                "Заметка для " +
                formatLongDate(selectedDate);
        }
    }


    function saveCurrentNote() {

        if (!noteTextarea) {
            return;
        }


        notes[selectedDate] =
            noteTextarea.value;


        saveNotes();


        if (noteStatus) {

            noteStatus.textContent =
                "Сохранено только что";
        }
    }


    document
        .getElementById("saveNote")
        ?.addEventListener(
            "click",
            saveCurrentNote
        );


    if (noteTextarea) {

        let noteTimer;


        noteTextarea.addEventListener(
            "input",
            function () {

                if (noteStatus) {

                    noteStatus.textContent =
                        "Сохранение...";
                }


                clearTimeout(noteTimer);


                noteTimer =
                    setTimeout(
                        saveCurrentNote,
                        600
                    );
            }
        );
    }


    // =====================================================
    // STATISTICS
    // =====================================================

    function getWeekDates() {

        const date =
            parseDate(selectedDate);


        const day =
            date.getDay();


        const mondayOffset =
            day === 0
                ? -6
                : 1 - day;


        const monday =
            new Date(date);


        monday.setDate(
            date.getDate() +
            mondayOffset
        );


        const result = [];


        for (
            let i = 0;
            i < 7;
            i++
        ) {

            const current =
                new Date(monday);


            current.setDate(
                monday.getDate() +
                i
            );


            result.push(
                formatDateInput(current)
            );
        }


        return result;
    }


    function updateStatistics() {

        if (!statNumber) {
            return;
        }


        const week =
            getWeekDates();


        const completed =
            tasks.filter(
                task =>
                    week.includes(task.date) &&
                    task.completed
            ).length;


        statNumber.innerHTML = `
            ${completed}
            <span>задач</span>
        `;


        renderChart(week);
    }


    function renderChart(week) {

        if (!miniChart) {
            return;
        }


        miniChart.innerHTML = "";


        const counts =
            week.map(
                date =>
                    tasks.filter(
                        task =>
                            task.date === date &&
                            task.completed
                    ).length
            );


        const max =
            Math.max(
                ...counts,
                1
            );


        counts.forEach(
            function (count, index) {

                const bar =
                    document.createElement(
                        "div"
                    );


                bar.className =
                    "chart-bar";


                if (
                    week[index] ===
                    selectedDate
                ) {

                    bar.classList.add(
                        "active"
                    );
                }


                const height =
                    Math.max(
                        8,
                        Math.round(
                            count / max * 100
                        )
                    );


                bar.style.height =
                    height + "%";


                miniChart.appendChild(
                    bar
                );
            }
        );
    }


    // =====================================================
    // NAVIGATION
    // =====================================================

    function switchPage(page) {

        currentPage =
            page;


        document
            .querySelectorAll(".page")
            .forEach(
                function (element) {

                    element.classList.remove(
                        "active-page"
                    );
                }
            );


        const pageElement =
            document.getElementById(
                "page" +
                page.charAt(0).toUpperCase() +
                page.slice(1)
            );


        if (pageElement) {

            pageElement.classList.add(
                "active-page"
            );
        }


        document
            .querySelectorAll(
                ".navigation .nav-item"
            )
            .forEach(
                function (item) {

                    item.classList.remove(
                        "active"
                    );


                    if (
                        item.dataset.page ===
                        page
                    ) {

                        item.classList.add(
                            "active"
                        );
                    }
                }
            );


        updateBreadcrumb();
    }


    document
        .querySelectorAll(
            ".navigation .nav-item[data-page]"
        )
        .forEach(
            function (item) {

                item.addEventListener(
                    "click",
                    function () {

                        switchPage(
                            item.dataset.page
                        );
                    }
                );
            }
        );


    function updateBreadcrumb() {

        const title =
            document.getElementById(
                "breadcrumbTitle"
            );


        const date =
            document.getElementById(
                "breadcrumbDate"
            );


        if (!title || !date) {
            return;
        }


        if (currentPage === "today") {

            title.textContent =
                "Сегодня";

            date.textContent =
                formatDayTitle(
                    selectedDate
                );

        } else if (
            currentPage === "tasks"
        ) {

            title.textContent =
                "Задачи";

            date.textContent =
                "Все задачи";

        } else if (
            currentPage === "calendar"
        ) {

            title.textContent =
                "Календарь";

            date.textContent =
                monthName(calendarDate);

        } else {

            title.textContent =
                "Избранное";

            date.textContent =
                "Важные задачи";
        }
    }


    // =====================================================
    // FILTERS
    // =====================================================

    document
        .querySelectorAll(".filter-button")
        .forEach(
            function (button) {

                button.addEventListener(
                    "click",
                    function () {

                        document
                            .querySelectorAll(
                                ".filter-button"
                            )
                            .forEach(
                                function (item) {

                                    item.classList.remove(
                                        "active"
                                    );
                                }
                            );


                        button.classList.add(
                            "active"
                        );


                        currentTaskFilter =
                            button.dataset.filter;


                        renderAllTasks();
                    }
                );
            }
        );


    // =====================================================
    // LISTS
    // =====================================================

    document
        .querySelectorAll(".list-item")
        .forEach(
            function (item) {

                item.addEventListener(
                    "click",
                    function () {

                        document
                            .querySelectorAll(
                                ".list-item"
                            )
                            .forEach(
                                function (element) {

                                    element.classList.remove(
                                        "selected"
                                    );
                                }
                            );


                        item.classList.add(
                            "selected"
                        );


                        selectedList =
                            item.dataset.list;


                        switchPage("tasks");

                        renderAllTasks();
                    }
                );
            }
        );


    // =====================================================
    // ADD LIST
    // =====================================================

    const addListButton =
        document.querySelector(".add-list");


    if (addListButton) {

        addListButton.addEventListener(
            "click",
            function () {

                const name =
                    prompt(
                        "Введите название нового списка:"
                    );


                if (
                    !name ||
                    !name.trim()
                ) {
                    return;
                }


                const list =
                    document.createElement(
                        "button"
                    );


                list.type = "button";

                list.className =
                    "list-item";


                list.dataset.list =
                    "custom-" +
                    Date.now();


                const dot =
                    document.createElement(
                        "span"
                    );


                dot.className =
                    "list-dot personal";


                list.appendChild(dot);


                list.appendChild(
                    document.createTextNode(
                        name.trim()
                    )
                );


                const section =
                    document.querySelector(
                        ".sidebar-section"
                    );


                section.appendChild(list);


                list.addEventListener(
                    "click",
                    function () {

                        document
                            .querySelectorAll(
                                ".list-item"
                            )
                            .forEach(
                                item =>
                                    item.classList.remove(
                                        "selected"
                                    )
                            );


                        list.classList.add(
                            "selected"
                        );


                        selectedList =
                            list.dataset.list;


                        switchPage("tasks");


                        renderAllTasks();
                    }
                );
            }
        );
    }


    // =====================================================
    // SEARCH
    // =====================================================

    const searchModal =
        document.getElementById(
            "searchModal"
        );


    const searchInput =
        document.getElementById(
            "searchInput"
        );


    const searchResults =
        document.getElementById(
            "searchResults"
        );


    function openSearch() {

        if (!searchModal) {
            return;
        }


        searchModal.classList.add(
            "show"
        );


        setTimeout(
            function () {

                searchInput.focus();

            },
            100
        );


        renderSearchResults("");
    }


    function closeSearch() {

        if (searchModal) {

            searchModal.classList.remove(
                "show"
            );
        }
    }


    document
        .querySelector(".search-button")
        ?.addEventListener(
            "click",
            openSearch
        );


    document
        .getElementById("closeSearchModal")
        ?.addEventListener(
            "click",
            closeSearch
        );


    if (searchModal) {

        searchModal.addEventListener(
            "click",
            function (event) {

                if (
                    event.target ===
                    searchModal
                ) {

                    closeSearch();
                }
            }
        );
    }


    function renderSearchResults(query) {

        if (!searchResults) {
            return;
        }


        const value =
            query.trim().toLowerCase();


        const found =
            tasks.filter(
                task =>
                    task.title
                        .toLowerCase()
                        .includes(value) ||
                    (task.description || "")
                        .toLowerCase()
                        .includes(value)
            );


        searchResults.innerHTML =
            "";


        if (found.length === 0) {

            searchResults.innerHTML = `
                <div class="search-empty">
                    Ничего не найдено
                </div>
            `;

            return;
        }


        found.forEach(
            function (task) {

                const result =
                    document.createElement(
                        "div"
                    );


                result.className =
                    "search-result";


                result.innerHTML = `
                    <strong></strong>
                    <span></span>
                `;


                result
                    .querySelector("strong")
                    .textContent =
                    task.title;


                result
                    .querySelector("span")
                    .textContent =
                    `${formatLongDate(task.date)} · ${task.time || "Без времени"}`;


                result.addEventListener(
                    "click",
                    function () {

                        selectedDate =
                            task.date;


                        calendarDate =
                            new Date(
                                parseDate(
                                    task.date
                                ).getFullYear(),
                                parseDate(
                                    task.date
                                ).getMonth(),
                                1
                            );


                        closeSearch();

                        switchPage("today");

                        renderAll();
                    }
                );


                searchResults.appendChild(
                    result
                );
            }
        );
    }


    if (searchInput) {

        searchInput.addEventListener(
            "input",
            function () {

                renderSearchResults(
                    searchInput.value
                );
            }
        );
    }


    // =====================================================
    // NOTIFICATIONS
    // =====================================================

    const notificationPanel =
        document.getElementById(
            "notificationPanel"
        );


    const notificationContent =
        document.getElementById(
            "notificationContent"
        );


    function renderNotifications() {

        if (!notificationContent) {
            return;
        }


        notificationContent.innerHTML =
            "";


        const todayTasks =
            getTasksForDate(
                getTodayString()
            );


        const completed =
            todayTasks.filter(
                task => task.completed
            ).length;


        const active =
            todayTasks.filter(
                task => !task.completed
            ).length;


        const messages = [];


        if (todayTasks.length === 0) {

            messages.push({
                title: "Сегодня свободный день",
                text: "У вас пока нет задач на сегодня."
            });

        } else {

            messages.push({
                title: "Сегодня",
                text:
                    `${completed} выполнено, ${active} осталось.`
            });


            if (active > 0) {

                const next =
                    todayTasks.find(
                        task =>
                            !task.completed
                    );


                if (next) {

                    messages.push({
                        title: "Следующая задача",
                        text:
                            `${next.time || ""} — ${next.title}`
                    });
                }
            }
        }


        messages.forEach(
            function (message) {

                const item =
                    document.createElement(
                        "div"
                    );


                item.className =
                    "notification-item";


                item.innerHTML = `
                    <strong></strong>
                    <span></span>
                `;


                item
                    .querySelector("strong")
                    .textContent =
                    message.title;


                item
                    .querySelector("span")
                    .textContent =
                    message.text;


                notificationContent.appendChild(
                    item
                );
            }
        );
    }


    document
        .querySelector(".notification-button")
        ?.addEventListener(
            "click",
            function () {

                renderNotifications();

                notificationPanel.classList.toggle(
                    "show"
                );
            }
        );


    document
        .getElementById("closeNotifications")
        ?.addEventListener(
            "click",
            function () {

                notificationPanel.classList.remove(
                    "show"
                );
            }
        );


    // =====================================================
    // SETTINGS
    // =====================================================

    const settingsModal =
        document.getElementById(
            "settingsModal"
        );


    const userNameInput =
        document.getElementById(
            "userNameInput"
        );


    const showCompletedToggle =
        document.getElementById(
            "showCompletedToggle"
        );


    document
        .querySelector(".settings-button")
        ?.addEventListener(
            "click",
            function () {

                userNameInput.value =
                    settings.userName;


                showCompletedToggle.checked =
                    settings.showCompleted;


                settingsModal.classList.add(
                    "show"
                );
            }
        );


    document
        .getElementById("closeSettings")
        ?.addEventListener(
            "click",
            function () {

                settingsModal.classList.remove(
                    "show"
                );
            }
        );


    document
        .getElementById("saveSettings")
        ?.addEventListener(
            "click",
            function () {

                settings.userName =
                    userNameInput.value.trim() ||
                    "Матвей";


                settings.showCompleted =
                    showCompletedToggle.checked;


                saveSettingsData();


                settingsModal.classList.remove(
                    "show"
                );


                renderAll();
            }
        );


    document
        .getElementById("resetData")
        ?.addEventListener(
            "click",
            function () {

                const confirmed =
                    confirm(
                        "Сбросить все задачи и заметки? Это действие нельзя отменить."
                    );


                if (!confirmed) {
                    return;
                }


                localStorage.removeItem(
                    STORAGE_TASKS
                );

                localStorage.removeItem(
                    STORAGE_NOTES
                );


                tasks =
                    [...defaultTasks];


                notes = {};


                saveTasks();

                saveNotes();

                selectedDate =
                    getTodayString();


                calendarDate =
                    new Date();


                settingsModal.classList.remove(
                    "show"
                );


                renderAll();
            }
        );


    // =====================================================
    // MORE BUTTON
    // =====================================================

    document
        .querySelector(".more-button")
        ?.addEventListener(
            "click",
            function () {

                switchPage("tasks");
            }
        );


    // =====================================================
    // ESCAPE
    // =====================================================

    document.addEventListener(
        "keydown",
        function (event) {

            if (
                event.key !==
                "Escape"
            ) {
                return;
            }


            closeTaskWindow();

            closeSearch();


            if (settingsModal) {

                settingsModal.classList.remove(
                    "show"
                );
            }


            if (notificationPanel) {

                notificationPanel.classList.remove(
                    "show"
                );
            }
        }
    );


    // =====================================================
    // RENDER HEADER
    // =====================================================

    function renderHeader() {

        const label =
            document.getElementById(
                "todayDateLabel"
            );


        const welcome =
            document.getElementById(
                "welcomeTitle"
            );


        const subtitle =
            document.getElementById(
                "welcomeSubtitle"
            );


        const tasksSubtitle =
            document.getElementById(
                "tasksSubtitle"
            );


        if (label) {

            label.textContent =
                formatDayTitle(
                    selectedDate
                ).toUpperCase();
        }


        if (welcome) {

            welcome.textContent =
                "Добрый день, " +
                settings.userName +
                " 👋";
        }


        if (subtitle) {

            if (
                selectedDate ===
                getTodayString()
            ) {

                subtitle.textContent =
                    "Давай сделаем сегодняшний день продуктивным.";

            } else {

                subtitle.textContent =
                    "Ваш план на " +
                    formatLongDate(
                        selectedDate
                    ) +
                    ".";
            }
        }


        if (tasksSubtitle) {

            tasksSubtitle.textContent =
                "Что нужно сделать " +
                formatLongDate(
                    selectedDate
                );
        }
    }


    // =====================================================
    // RENDER EVERYTHING
    // =====================================================

    function renderAll() {

        renderHeader();

        renderTodayTasks();

        renderSmallCalendar();

        renderLargeCalendar();

        renderAllTasks();

        renderFavorites();

        loadCurrentNote();

        updateStatistics();

        updateBreadcrumb();

        renderNotifications();
    }


    // =====================================================
    // INITIALIZATION
    // =====================================================

    loadData();

    selectedDate =
        getTodayString();

    calendarDate =
        new Date();

    renderAll();


    console.log(
        "Daily успешно запущен."
    );

});
