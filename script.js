/* =========================================================
   DAILY 100
   SUPABASE APPLICATION
========================================================= */

(() => {

    "use strict";


    /* =====================================================
       CONFIG
    ===================================================== */

    if (!window.supabase) {

        console.error("Supabase JS не загружен.");

        return;

    }


    if (!window.DAILY_CONFIG) {

        console.error("supabase-config.js не найден.");

        return;

    }


    const client = window.supabase.createClient(
        window.DAILY_CONFIG.supabaseUrl,
        window.DAILY_CONFIG.supabaseKey
    );


    /* =====================================================
       DOM
    ===================================================== */

    const $ = (selector) =>
        document.querySelector(selector);


    const $$ = (selector) =>
        Array.from(document.querySelectorAll(selector));


    /* =====================================================
       STATE
    ===================================================== */

    const state = {

        user: null,
        profile: null,

        lists: [],
        tasks: [],

        activeView: "today",

        selectedDate: dateKey(new Date()),

        calendarMonth: new Date(
            new Date().getFullYear(),
            new Date().getMonth(),
            1
        ),

        selectedListId: null,

        editingTaskId: null,

        taskFilter: "all",

        taskSort: "date",

        noteTimer: null,

        noteDate: null,

        updatingTasks: new Set(),

        settings: {

            autosave: true,

            priorityFirst: true

        }

    };


    /* =====================================================
       HELPERS
    ===================================================== */

    function dateKey(date) {

        const year = date.getFullYear();

        const month = String(
            date.getMonth() + 1
        ).padStart(2, "0");

        const day = String(
            date.getDate()
        ).padStart(2, "0");

        return `${year}-${month}-${day}`;

    }


    function parseDate(value) {

        if (!value) {
            return null;
        }

        const parts = String(value)
            .slice(0, 10)
            .split("-")
            .map(Number);

        if (parts.length !== 3) {
            return null;
        }

        return new Date(
            parts[0],
            parts[1] - 1,
            parts[2]
        );

    }


    function formatDateLong(value) {

        const date = parseDate(value);

        if (!date) {
            return "Без даты";
        }

        return new Intl.DateTimeFormat(
            "ru-RU",
            {
                weekday: "long",
                day: "numeric",
                month: "long"
            }
        ).format(date);

    }


    function formatDateShort(value) {

        const date = parseDate(value);

        if (!date) {
            return "Без даты";
        }

        return new Intl.DateTimeFormat(
            "ru-RU",
            {
                day: "numeric",
                month: "short"
            }
        ).format(date);

    }


    function monthName(date) {

        return new Intl.DateTimeFormat(
            "ru-RU",
            {
                month: "long",
                year: "numeric"
            }
        ).format(date);

    }


    function escapeHtml(value) {

        return String(value ?? "")
            .replaceAll("&", "&amp;")
            .replaceAll("<", "&lt;")
            .replaceAll(">", "&gt;")
            .replaceAll('"', "&quot;")
            .replaceAll("'", "&#039;");

    }


    function getInitials(name) {

        const clean = String(name || "D")
            .trim()
            .split(/\s+/)
            .slice(0, 2);

        return clean
            .map(item => item[0])
            .join("")
            .toUpperCase() || "D";

    }


    function isToday(value) {

        return value === dateKey(new Date());

    }


    function isOverdue(task) {

        if (!task || task.completed) {
            return false;
        }

        if (!task.due_date) {
            return false;
        }

        return task.due_date < dateKey(new Date());

    }


    function priorityWeight(priority) {

        if (priority === "high") {
            return 3;
        }

        if (priority === "medium") {
            return 2;
        }

        return 1;

    }


    function priorityLabel(priority) {

        if (priority === "high") {
            return "Высокий";
        }

        if (priority === "medium") {
            return "Средний";
        }

        return "Низкий";

    }


    function taskList(task) {

        return state.lists.find(
            list => String(list.id) === String(task.list_id)
        );

    }


    function toast(message, type = "success") {

        const container = $("#toastContainer");

        if (!container) {
            return;
        }

        const element = document.createElement("div");

        element.className =
            `toast ${type}`;

        element.textContent = message;

        container.appendChild(element);

        setTimeout(() => {

            element.remove();

        }, 3200);

    }


    function friendlyError(error) {

        if (!error) {
            return "Неизвестная ошибка.";
        }

        const message =
            error.message ||
            error.error_description ||
            String(error);

        if (
            message.toLowerCase().includes("row-level security")
        ) {
            return "Supabase отклонил операцию. Проверь правила RLS.";
        }

        return message;

    }


    /* =====================================================
       AUTH UI
    ===================================================== */

    function setAuthMode(register) {

        const title = $("#authTitle");
        const subtitle = $("#authSubtitle");
        const submit = $("#authSubmitButton");
        const switchButton = $("#authModeButton");
        const displayName = $("#displayNameGroup");

        if (!title) {
            return;
        }

        displayName.classList.toggle(
            "hidden",
            !register
        );

        if (register) {

            title.textContent =
                "Создай свой Daily";

            subtitle.textContent =
                "Начни организовывать задачи и мысли.";

            submit.textContent =
                "Создать аккаунт";

            switchButton.textContent =
                "Уже есть аккаунт? Войти";

        } else {

            title.textContent =
                "Добро пожаловать";

            subtitle.textContent =
                "Организуй день красиво и без лишнего шума.";

            submit.textContent =
                "Войти";

            switchButton.textContent =
                "Нет аккаунта? Создать";

        }

        $("#authForm").dataset.register =
            register ? "true" : "false";

    }


    function showAuth() {

        $("#loadingScreen")?.classList.add("loaded");

        $("#authScreen")?.classList.remove("hidden");

        $("#appShell")?.classList.add("hidden");

    }


    function showApp() {

        $("#authScreen")?.classList.add("hidden");

        $("#appShell")?.classList.remove("hidden");

        $("#loadingScreen")?.classList.add("loaded");

    }


    /* =====================================================
       PROFILE
    ===================================================== */

    async function loadProfile() {

        if (!state.user) {
            return;
        }

        const { data, error } = await client
            .from("profiles")
            .select("*")
            .eq("id", state.user.id)
            .maybeSingle();

        if (error) {

            console.warn(
                "Не удалось загрузить profile:",
                error
            );

            state.profile = {
                id: state.user.id,
                display_name:
                    state.user.email?.split("@")[0] ||
                    "Пользователь"
            };

            return;

        }


        if (data) {

            state.profile = data;

            return;

        }


        const fallbackName =
            state.user.user_metadata?.display_name ||
            state.user.email?.split("@")[0] ||
            "Пользователь";


        const { data: created, error: createError } =
            await client
                .from("profiles")
                .insert({
                    id: state.user.id,
                    display_name: fallbackName
                })
                .select()
                .single();


        if (!createError) {

            state.profile = created;

        } else {

            state.profile = {
                id: state.user.id,
                display_name: fallbackName
            };

        }

    }


    function renderProfile() {

        const name =
            state.profile?.display_name ||
            state.user?.user_metadata?.display_name ||
            state.user?.email?.split("@")[0] ||
            "Пользователь";


        $("#welcomeName").textContent =
            name.split(" ")[0];


        $("#sidebarUserName").textContent =
            name;


        $("#sidebarUserEmail").textContent =
            state.user?.email || "—";


        $("#sidebarAvatar").textContent =
            getInitials(name);


        $("#dateLabel").textContent =
            new Intl.DateTimeFormat(
                "ru-RU",
                {
                    weekday: "long",
                    day: "numeric",
                    month: "long"
                }
            )
            .format(new Date())
            .toUpperCase();


        $("#settingsName").value =
            name;

    }


    /* =====================================================
       LISTS
    ===================================================== */

    async function loadLists() {

        const { data, error } = await client
            .from("lists")
            .select("*")
            .eq("user_id", state.user.id)
            .order("created_at", {
                ascending: true
            });


        if (error) {

            console.error(error);

            state.lists = [];

            return;

        }


        state.lists = data || [];

        renderLists();
        populateTaskListSelect();

    }


    function renderLists() {

        const container =
            $("#listsContainer");

        if (!container) {
            return;
        }

        container.innerHTML = "";


        state.lists.forEach(list => {

            const button =
                document.createElement("button");

            button.type = "button";

            button.className =
                "nav-item list-nav-item";


            button.innerHTML = `

                <span
                    class="nav-list-dot"
                    style="--list-color:${escapeHtml(
                        list.color || "#999"
                    )}"
                ></span>

                <span>
                    ${escapeHtml(list.name)}
                </span>

            `;


            button.addEventListener(
                "click",
                () => {

                    state.selectedListId =
                        list.id;

                    state.activeView =
                        "today";

                    updateView();

                    loadTasks();

                }
            );


            container.appendChild(button);

        });

    }


    function populateTaskListSelect() {

        const select =
            $("#taskListSelect");

        if (!select) {
            return;
        }

        select.innerHTML = "";


        if (!state.lists.length) {

            const option =
                document.createElement("option");

            option.value = "";

            option.textContent =
                "Без списка";

            select.appendChild(option);

            return;

        }


        state.lists.forEach(list => {

            const option =
                document.createElement("option");

            option.value = list.id;

            option.textContent =
                list.name;

            select.appendChild(option);

        });

    }


    async function createList(name) {

        const clean =
            String(name || "").trim();

        if (!clean) {
            return;
        }


        const { error } = await client
            .from("lists")
            .insert({
                user_id: state.user.id,
                name: clean
            });


        if (error) {

            toast(
                friendlyError(error),
                "error"
            );

            return;

        }


        closeModal("#listModal");

        $("#listName").value = "";

        await loadLists();

        toast("Список создан.");

    }


    /* =====================================================
       TASKS LOAD
    ===================================================== */

    async function loadTasks() {

        if (!state.user) {
            return;
        }


        setTaskLoadingState();


        const { data, error } = await client
            .from("tasks")
            .select("*")
            .eq("user_id", state.user.id)
            .order("due_date", {
                ascending: true,
                nullsFirst: false
            })
            .order("due_time", {
                ascending: true,
                nullsFirst: false
            });


        if (error) {

            console.error(
                "Ошибка загрузки задач:",
                error
            );

            state.tasks = [];

            renderTodayTasks();

            renderAllTasksError(
                friendlyError(error)
            );

            renderCalendar();

            updateProgress();

            return;

        }


        state.tasks = data || [];


        renderTodayTasks();

        renderAllTasks();

        renderFavorites();

        renderCalendar();

        updateProgress();

        renderStats();

        updateTaskBadge();

        loadNote(state.selectedDate);

    }


    function setTaskLoadingState() {

        const todayList =
            $("#taskList");

        const allList =
            $("#allTasksList");


        if (todayList) {

            todayList.innerHTML = `

                <div class="empty-state">

                    <div class="empty-state-icon">
                        …
                    </div>

                    <strong>
                        Загружаем задачи
                    </strong>

                    <span>
                        Секунду…
                    </span>

                </div>

            `;

        }


        if (allList) {

            allList.innerHTML = `

                <div class="empty-state">

                    <div class="empty-state-icon">
                        …
                    </div>

                    <strong>
                        Загружаем задачи
                    </strong>

                    <span>
                        Получаем твой список.
                    </span>

                </div>

            `;

        }

    }


    /* =====================================================
       TASK RENDER
    ===================================================== */

    function getTodayTasks() {

        let tasks =
            state.tasks.filter(
                task =>
                    String(task.due_date || "")
                        .slice(0, 10) ===
                    state.selectedDate
            );


        if (state.selectedListId) {

            tasks =
                tasks.filter(
                    task =>
                        String(task.list_id) ===
                        String(state.selectedListId)
                );

        }


        return sortTasks(tasks);

    }


    function sortTasks(tasks) {

        const list =
            [...tasks];


        if (state.settings.priorityFirst) {

            list.sort(
                (a, b) =>
                    priorityWeight(b.priority) -
                    priorityWeight(a.priority)
            );

        }


        list.sort((a, b) => {

            if (
                a.completed !==
                b.completed
            ) {

                return a.completed ? 1 : -1;

            }

            if (state.taskSort === "priority") {

                return (
                    priorityWeight(b.priority) -
                    priorityWeight(a.priority)
                );

            }


            if (state.taskSort === "title") {

                return String(a.title || "")
                    .localeCompare(
                        String(b.title || ""),
                        "ru"
                    );

            }


            if (state.taskSort === "created") {

                return String(b.created_at || "")
                    .localeCompare(
                        String(a.created_at || "")
                    );

            }


            const dateA =
                `${a.due_date || "9999"} ${a.due_time || "99"}`;

            const dateB =
                `${b.due_date || "9999"} ${b.due_time || "99"}`;

            return dateA.localeCompare(dateB);

        });


        return list;

    }


    function taskHtml(task) {

        const list =
            taskList(task);


        const overdue =
            isOverdue(task);


        const priority =
            task.priority ||
            "medium";


        const time =
            task.due_time
                ? task.due_time.slice(0, 5)
                : "";


        return `

            <article
                class="task-item ${
                    task.completed ? "completed" : ""
                }"
                data-task-id="${escapeHtml(task.id)}"
            >

                <button
                    class="task-check"
                    data-action="complete"
                    data-id="${escapeHtml(task.id)}"
                    type="button"
                    aria-label="Выполнить задачу"
                >
                    ✓
                </button>


                <div class="task-content">

                    <div class="task-title-row">

                        <div class="task-title">
                            ${escapeHtml(task.title)}
                        </div>

                    </div>


                    ${
                        task.description
                            ? `
                                <div class="task-description">
                                    ${escapeHtml(
                                        task.description
                                    )}
                                </div>
                            `
                            : ""
                    }


                    <div class="task-meta">

                        ${
                            time
                                ? `
                                    <span class="task-time">
                                        ${escapeHtml(time)}
                                    </span>
                                `
                                : ""
                        }


                        ${
                            list
                                ? `
                                    <span
                                        class="task-list-tag"
                                        style="--task-color:${
                                            escapeHtml(
                                                list.color ||
                                                "#999"
                                            )
                                        }"
                                    >
                                        ${escapeHtml(list.name)}
                                    </span>
                                `
                                : ""
                        }


                        <span
                            class="priority-pill ${priority}"
                        >
                            ${priorityLabel(priority)}
                        </span>


                        ${
                            overdue
                                ? `
                                    <span class="overdue-pill">
                                        Просрочено
                                    </span>
                                `
                                : ""
                        }

                    </div>

                </div>


                <div class="task-actions">

                    <button
                        class="task-action ${
                            task.is_favorite
                                ? "favorite-active"
                                : ""
                        }"
                        data-action="favorite"
                        data-id="${escapeHtml(task.id)}"
                        type="button"
                        title="Избранное"
                    >
                        ${
                            task.is_favorite
                                ? "★"
                                : "☆"
                        }
                    </button>


                    <button
                        class="task-action"
                        data-action="edit"
                        data-id="${escapeHtml(task.id)}"
                        type="button"
                        title="Изменить"
                    >
                        ✎
                    </button>


                    <button
                        class="task-action"
                        data-action="delete"
                        data-id="${escapeHtml(task.id)}"
                        type="button"
                        title="Удалить"
                    >
                        ×
                    </button>

                </div>

            </article>

        `;

    }


    function renderTodayTasks() {

        const container =
            $("#taskList");

        if (!container) {
            return;
        }


        const tasks =
            getTodayTasks();


        const completed =
            tasks.filter(
                task => task.completed
            ).length;


        $("#tasksSubtitle").textContent =
            tasks.length
                ? `${completed} из ${tasks.length} выполнено`
                : "На сегодня пока ничего нет";


        $("#progressText").textContent =
            `${completed} из ${tasks.length} выполнено`;


        if (!tasks.length) {

            container.innerHTML = `

                <div class="empty-state">

                    <div class="empty-state-icon">
                        ✓
                    </div>

                    <strong>
                        День свободен
                    </strong>

                    <span>
                        Добавь первую задачу и начни собирать свой день.
                    </span>

                </div>

            `;

            return;

        }


        container.innerHTML =
            tasks.map(taskHtml).join("");


        renderOverdueMoveButton();

    }


    /* =====================================================
       ALL TASKS
    ===================================================== */

    function getFilteredAllTasks() {

        let tasks =
            [...state.tasks];


        if (state.taskFilter === "active") {

            tasks =
                tasks.filter(
                    task => !task.completed
                );

        }


        if (state.taskFilter === "completed") {

            tasks =
                tasks.filter(
                    task => task.completed
                );

        }


        if (state.taskFilter === "overdue") {

            tasks =
                tasks.filter(
                    task => isOverdue(task)
                );

        }


        return sortTasks(tasks);

    }


    function renderAllTasksError(message) {

        const container =
            $("#allTasksList");

        if (!container) {
            return;
        }


        container.innerHTML = `

            <div class="empty-state">

                <div class="empty-state-icon">
                    !
                </div>

                <strong>
                    Не удалось загрузить задачи
                </strong>

                <span>
                    ${escapeHtml(message)}
                </span>

            </div>

        `;

    }


    function renderAllTasks() {

        const container =
            $("#allTasksList");

        if (!container) {
            return;
        }


        const tasks =
            getFilteredAllTasks();


        if (!tasks.length) {

            container.innerHTML = `

                <div class="empty-state">

                    <div class="empty-state-icon">
                        ✓
                    </div>

                    <strong>
                        Здесь пока пусто
                    </strong>

                    <span>
                        Попробуй изменить фильтр или создай новую задачу.
                    </span>

                </div>

            `;

            return;

        }


        const groups = new Map();


        tasks.forEach(task => {

            const key =
                task.due_date
                    ? String(task.due_date).slice(0, 10)
                    : "no-date";


            if (!groups.has(key)) {
                groups.set(key, []);
            }


            groups.get(key).push(task);

        });


        let html = "";


        groups.forEach((items, date) => {

            let heading =
                "Без даты";


            if (date !== "no-date") {

                if (date === dateKey(new Date())) {

                    heading = "Сегодня";

                } else {

                    heading =
                        formatDateLong(date);

                }

            }


            html += `

                <section class="task-day-group">

                    <div class="task-day-heading">

                        <strong>
                            ${escapeHtml(heading)}
                        </strong>

                        <span>
                            ${items.length}
                            ${items.length === 1 ? "задача" : "задач"}
                        </span>

                    </div>

                    ${items.map(taskHtml).join("")}

                </section>

            `;

        });


        container.innerHTML = html;

    }


    function renderFavorites() {

        const container =
            $("#favoritesList");

        if (!container) {
            return;
        }


        const tasks =
            state.tasks.filter(
                task => task.is_favorite
            );


        if (!tasks.length) {

            container.innerHTML = `

                <div class="empty-state">

                    <div class="empty-state-icon">
                        ☆
                    </div>

                    <strong>
                        Избранное пусто
                    </strong>

                    <span>
                        Нажми на ☆ у задачи, чтобы сохранить её здесь.
                    </span>

                </div>

            `;

            return;

        }


        container.innerHTML =
            tasks.map(task => `

                <section class="task-day-group">

                    ${taskHtml(task)}

                </section>

            `).join("");

    }


    function updateTaskBadge() {

        const count =
            state.tasks.filter(
                task => !task.completed
            ).length;


        $("#taskCountBadge").textContent =
            count > 99 ? "99+" : count;

    }


    /* =====================================================
       TASK ACTIONS
    ===================================================== */

    async function toggleTask(taskId) {

        const task =
            state.tasks.find(
                item =>
                    String(item.id) ===
                    String(taskId)
            );


        if (!task) {
            return;
        }


        if (state.updatingTasks.has(taskId)) {
            return;
        }


        state.updatingTasks.add(taskId);


        const previous =
            task.completed;


        task.completed =
            !previous;


        renderTodayTasks();
        renderAllTasks();
        renderFavorites();
        updateProgress();
        updateTaskBadge();


        const { error } =
            await client
                .from("tasks")
                .update({
                    completed: task.completed
                })
                .eq("id", task.id)
                .eq("user_id", state.user.id);


        state.updatingTasks.delete(taskId);


        if (error) {

            task.completed =
                previous;

            renderTodayTasks();
            renderAllTasks();
            renderFavorites();
            updateProgress();
            updateTaskBadge();


            toast(
                friendlyError(error),
                "error"
            );

            return;

        }


        toast(
            task.completed
                ? "Задача выполнена ✓"
                : "Задача возвращена в план"
        );


        renderStats();

    }


    async function toggleFavorite(taskId) {

        const task =
            state.tasks.find(
                item =>
                    String(item.id) ===
                    String(taskId)
            );


        if (!task) {
            return;
        }


        const next =
            !Boolean(task.is_favorite);


        const { error } =
            await client
                .from("tasks")
                .update({
                    is_favorite: next
                })
                .eq("id", task.id)
                .eq("user_id", state.user.id);


        if (error) {

            toast(
                friendlyError(error),
                "error"
            );

            return;

        }


        task.is_favorite = next;


        renderTodayTasks();
        renderAllTasks();
        renderFavorites();


        toast(
            next
                ? "Добавлено в избранное"
                : "Удалено из избранного"
        );

    }


    async function deleteTask(taskId) {

        const task =
            state.tasks.find(
                item =>
                    String(item.id) ===
                    String(taskId)
            );


        if (!task) {
            return;
        }


        if (
            !window.confirm(
                `Удалить задачу «${task.title}»?`
            )
        ) {
            return;
        }


        const { error } =
            await client
                .from("tasks")
                .delete()
                .eq("id", task.id)
                .eq("user_id", state.user.id);


        if (error) {

            toast(
                friendlyError(error),
                "error"
            );

            return;

        }


        state.tasks =
            state.tasks.filter(
                item =>
                    String(item.id) !==
                    String(task.id)
            );


        renderTodayTasks();
        renderAllTasks();
        renderFavorites();
        renderCalendar();
        updateProgress();
        updateTaskBadge();
        renderStats();


        toast("Задача удалена.");

    }


    /* =====================================================
       TASK MODAL
    ===================================================== */

    function openTaskModal(task = null) {

        state.editingTaskId =
            task?.id || null;


        $("#taskModalTitle").textContent =
            task
                ? "Изменить задачу"
                : "Новая задача";


        $("#taskSubmitButton").textContent =
            task
                ? "Сохранить изменения"
                : "Создать задачу";


        $("#taskTitle").value =
            task?.title || "";


        $("#taskDescription").value =
            task?.description || "";


        $("#taskDate").value =
            task?.due_date
                ? String(task.due_date).slice(0, 10)
                : state.selectedDate;


        $("#taskTime").value =
            task?.due_time
                ? String(task.due_time).slice(0, 5)
                : "";


        $("#taskPriority").value =
            task?.priority || "medium";


        if (task?.list_id) {

            $("#taskListSelect").value =
                task.list_id;

        } else if (state.lists[0]) {

            $("#taskListSelect").value =
                state.lists[0].id;

        }


        openModal("#taskModal");


        setTimeout(() => {

            $("#taskTitle")?.focus();

        }, 50);

    }


    async function saveTask(form) {

        const title =
            $("#taskTitle").value.trim();


        if (!title) {
            return;
        }


        const payload = {

            user_id: state.user.id,

            title,

            description:
                $("#taskDescription")
                    .value
                    .trim() || null,

            due_date:
                $("#taskDate").value || null,

            due_time:
                $("#taskTime").value || null,

            priority:
                $("#taskPriority").value || "medium",

            list_id:
                $("#taskListSelect").value || null

        };


        if (state.editingTaskId) {

            const { error } =
                await client
                    .from("tasks")
                    .update(payload)
                    .eq("id", state.editingTaskId)
                    .eq("user_id", state.user.id);


            if (error) {

                toast(
                    friendlyError(error),
                    "error"
                );

                return;

            }


            toast("Задача обновлена.");

        } else {

            const { error } =
                await client
                    .from("tasks")
                    .insert({
                        ...payload,
                        completed: false,
                        is_favorite: false
                    });


            if (error) {

                toast(
                    friendlyError(error),
                    "error"
                );

                return;

            }


            toast("Задача создана ✓");

        }


        closeModal("#taskModal");

        state.editingTaskId = null;

        await loadTasks();

    }


    /* =====================================================
       OVERDUE
    ===================================================== */

    function renderOverdueMoveButton() {

        const button =
            $("#moveOverdueButton");

        if (!button) {
            return;
        }


        const overdue =
            state.tasks.filter(
                task =>
                    isOverdue(task)
            );


        button.classList.toggle(
            "hidden",
            overdue.length === 0
        );


        if (overdue.length) {

            button.textContent =
                `Перенести ${overdue.length} ${
                    overdue.length === 1
                        ? "задачу"
                        : "задач"
                } на сегодня`;

        }

    }


    async function moveOverdueToToday() {

        const overdue =
            state.tasks.filter(
                task =>
                    isOverdue(task)
            );


        if (!overdue.length) {
            return;
        }


        const ids =
            overdue.map(task => task.id);


        const { error } =
            await client
                .from("tasks")
                .update({
                    due_date: dateKey(new Date())
                })
                .in("id", ids)
                .eq("user_id", state.user.id);


        if (error) {

            toast(
                friendlyError(error),
                "error"
            );

            return;

        }


        overdue.forEach(task => {

            task.due_date =
                dateKey(new Date());

        });


        renderTodayTasks();
        renderAllTasks();
        renderCalendar();
        updateProgress();


        toast(
            `Перенесено задач: ${overdue.length}`
        );

    }


    /* =====================================================
       NOTES
    ===================================================== */

    function noteCacheKey(date) {

        return `daily_note_${state.user.id}_${date}`;

    }


    function setNoteStatus(
        text,
        type = ""
    ) {

        const element =
            $("#noteStatus");

        if (!element) {
            return;
        }


        element.textContent =
            text;


        element.classList.remove(
            "saved",
            "error"
        );


        if (type) {
            element.classList.add(type);
        }

    }


    async function loadNote(date) {

        if (!state.user) {
            return;
        }


        state.noteDate = date;


        if (state.noteTimer) {

            clearTimeout(
                state.noteTimer
            );

            state.noteTimer = null;

        }


        const textarea =
            $("#noteInput");


        if (!textarea) {
            return;
        }


        textarea.value = "";


        const cached =
            localStorage.getItem(
                noteCacheKey(date)
            );


        if (cached !== null) {

            textarea.value =
                cached;

        }


        setNoteStatus(
            cached
                ? "Локально сохранено"
                : "Не сохранено"
        );


        const { data, error } =
            await client
                .from("notes")
                .select("content")
                .eq("user_id", state.user.id)
                .eq("date", date)
                .maybeSingle();


        if (!error && data) {

            textarea.value =
                data.content || "";


            localStorage.setItem(
                noteCacheKey(date),
                data.content || ""
            );


            setNoteStatus(
                data.content
                    ? "Сохранено"
                    : "Пусто",
                data.content
                    ? "saved"
                    : ""
            );

            return;

        }


        if (error) {

            console.warn(
                "Не удалось загрузить заметку:",
                error
            );


            if (cached !== null) {

                setNoteStatus(
                    "Локальная копия",
                    ""
                );

            } else {

                setNoteStatus(
                    "Ожидает сохранения",
                    "error"
                );

            }

        }

    }


    async function saveNote() {

        if (!state.user) {
            return;
        }


        const date =
            state.noteDate ||
            state.selectedDate;


        const content =
            $("#noteInput")
                .value;


        localStorage.setItem(
            noteCacheKey(date),
            content
        );


        setNoteStatus(
            "Сохраняем…"
        );


        const { error } =
            await client
                .from("notes")
                .upsert(
                    {
                        user_id: state.user.id,
                        date,
                        content
                    },
                    {
                        onConflict:
                            "user_id,date"
                    }
                );


        if (error) {

            console.error(
                "Ошибка сохранения заметки:",
                error
            );


            setNoteStatus(
                "Локально сохранено",
                "error"
            );


            toast(
                "Заметка сохранена локально. Supabase не принял запись.",
                "error"
            );

            return;

        }


        setNoteStatus(
            "Сохранено",
            "saved"
        );

    }


    function scheduleNoteSave() {

        if (!state.settings.autosave) {
            return;
        }


        if (state.noteTimer) {

            clearTimeout(
                state.noteTimer
            );

        }


        const content =
            $("#noteInput").value;


        localStorage.setItem(
            noteCacheKey(
                state.noteDate ||
                state.selectedDate
            ),
            content
        );


        setNoteStatus(
            "Автосохранение…"
        );


        state.noteTimer =
            setTimeout(
                saveNote,
                1000
            );

    }


    /* =====================================================
       PROGRESS
    ===================================================== */

    function updateProgress() {

        const tasks =
            getTodayTasks();


        const total =
            tasks.length;


        const completed =
            tasks.filter(
                task => task.completed
            ).length;


        const percent =
            total
                ? Math.round(
                    completed / total * 100
                )
                : 0;


        $("#progressPercent").textContent =
            `${percent}%`;


        const circle =
            $("#progressCircle");


        if (circle) {

            const circumference =
                2 * Math.PI * 43;


            circle.style.strokeDasharray =
                circumference;


            circle.style.strokeDashoffset =
                circumference -
                (
                    circumference *
                    percent /
                    100
                );

        }


        $("#progressText").textContent =
            `${completed} из ${total} выполнено`;

    }


    /* =====================================================
       CALENDAR
    ===================================================== */

    function getCalendarCells() {

        const year =
            state.calendarMonth.getFullYear();


        const month =
            state.calendarMonth.getMonth();


        const firstDay =
            new Date(
                year,
                month,
                1
            );


        let start =
            firstDay.getDay();


        if (start === 0) {
            start = 7;
        }


        start -= 1;


        const daysInMonth =
            new Date(
                year,
                month + 1,
                0
            ).getDate();


        const previousDays =
            new Date(
                year,
                month,
                0
            ).getDate();


        const cells = [];


        for (
            let i = start - 1;
            i >= 0;
            i--
        ) {

            cells.push({
                date: new Date(
                    year,
                    month - 1,
                    previousDays - i
                ),
                other: true
            });

        }


        for (
            let day = 1;
            day <= daysInMonth;
            day++
        ) {

            cells.push({
                date: new Date(
                    year,
                    month,
                    day
                ),
                other: false
            });

        }


        while (
            cells.length < 42
        ) {

            const index =
                cells.length -
                (
                    start +
                    daysInMonth
                ) +
                1;


            cells.push({
                date: new Date(
                    year,
                    month + 1,
                    index
                ),
                other: true
            });

        }


        return cells;

    }


    function tasksForDate(date) {

        const key =
            dateKey(date);


        return state.tasks.filter(
            task =>
                String(task.due_date || "")
                    .slice(0, 10) === key
        );

    }


    function renderCalendar() {

        renderMiniCalendar();

        renderFullCalendar();

        renderSelectedDateTasks();

    }


    function renderMiniCalendar() {

        const container =
            $("#calendarDays");


        if (!container) {
            return;
        }


        $("#calendarTitle").textContent =
            monthName(
                state.calendarMonth
            );


        container.innerHTML =
            getCalendarCells()
                .map(cell => {

                    const key =
                        dateKey(cell.date);


                    const tasks =
                        tasksForDate(
                            cell.date
                        );


                    const selected =
                        key ===
                        state.selectedDate;


                    const today =
                        key ===
                        dateKey(new Date());


                    return `

                        <button
                            type="button"
                            class="
                                calendar-day
                                ${cell.other ? "other-month" : ""}
                                ${selected ? "selected" : ""}
                                ${today ? "today" : ""}
                            "
                            data-calendar-date="${key}"
                        >

                            ${cell.date.getDate()}

                            ${
                                tasks.length
                                    ? `
                                        <span
                                            class="calendar-dot"
                                        ></span>
                                    `
                                    : ""
                            }

                        </button>

                    `;

                })
                .join("");

    }


    function renderFullCalendar() {

        const container =
            $("#fullCalendarDays");


        if (!container) {
            return;
        }


        $("#fullCalendarTitle").textContent =
            monthName(
                state.calendarMonth
            );


        const monthTasks =
            state.tasks.filter(
                task => {

                    if (!task.due_date) {
                        return false;
                    }


                    const date =
                        parseDate(task.due_date);


                    return (
                        date &&
                        date.getFullYear() ===
                            state.calendarMonth.getFullYear() &&
                        date.getMonth() ===
                            state.calendarMonth.getMonth()
                    );

                }
            );


        $("#calendarMonthTaskCount").textContent =
            `${monthTasks.length} ${
                monthTasks.length === 1
                    ? "задача"
                    : "задач"
            }`;


        container.innerHTML =
            getCalendarCells()
                .map(cell => {

                    const key =
                        dateKey(cell.date);


                    const tasks =
                        tasksForDate(
                            cell.date
                        );


                    const selected =
                        key ===
                        state.selectedDate;


                    const today =
                        key ===
                        dateKey(new Date());


                    const visible =
                        tasks.slice(0, 4);


                    return `

                        <button
                            type="button"
                            class="
                                full-calendar-cell
                                ${cell.other ? "other-month" : ""}
                                ${selected ? "selected" : ""}
                                ${today ? "today" : ""}
                            "
                            data-calendar-date="${key}"
                        >

                            <span class="full-day-number">
                                ${cell.date.getDate()}
                            </span>


                            <span class="full-calendar-tasks">

                                ${visible.map(task => `

                                    <span
                                        class="
                                            calendar-task-chip
                                            ${task.completed ? "completed" : ""}
                                            ${task.priority || "medium"}
                                        "
                                    >
                                        ${escapeHtml(task.title)}
                                    </span>

                                `).join("")}


                                ${
                                    tasks.length > 4
                                        ? `
                                            <span class="more-task-chip">
                                                +${tasks.length - 4}
                                                ещё
                                            </span>
                                        `
                                        : ""
                                }

                            </span>

                        </button>

                    `;

                })
                .join("");

    }


    function renderSelectedDateTasks() {

        const container =
            $("#selectedDateTasks");


        if (!container) {
            return;
        }


        $("#selectedDateTitle").textContent =
            isToday(state.selectedDate)
                ? "Сегодня"
                : formatDateLong(
                    state.selectedDate
                );


        const tasks =
            tasksForDate(
                parseDate(
                    state.selectedDate
                )
            );


        if (!tasks.length) {

            container.innerHTML = `

                <div class="empty-state">

                    <div class="empty-state-icon">
                        +
                    </div>

                    <strong>
                        В этот день нет задач
                    </strong>

                    <span>
                        Нажми «Добавить задачу», чтобы запланировать что-нибудь.
                    </span>

                </div>

            `;

            return;

        }


        container.innerHTML =
            sortTasks(tasks)
                .map(taskHtml)
                .join("");

    }


    function changeCalendarMonth(offset) {

        state.calendarMonth =
            new Date(
                state.calendarMonth.getFullYear(),
                state.calendarMonth.getMonth() + offset,
                1
            );


        renderCalendar();

    }


    function selectCalendarDate(value) {

        state.selectedDate =
            value;


        const date =
            parseDate(value);


        state.calendarMonth =
            new Date(
                date.getFullYear(),
                date.getMonth(),
                1
            );


        renderCalendar();

        loadNote(value);

    }


    /* =====================================================
       STATS
    ===================================================== */

    function renderStats() {

        const today =
            new Date();


        const monday =
            new Date(today);


        const day =
            monday.getDay();


        const diff =
            day === 0
                ? 6
                : day - 1;


        monday.setDate(
            monday.getDate() - diff
        );


        const values = [];


        for (
            let i = 0;
            i < 7;
            i++
        ) {

            const date =
                new Date(monday);


            date.setDate(
                monday.getDate() + i
            );


            const key =
                dateKey(date);


            const count =
                state.tasks.filter(
                    task =>
                        String(task.due_date || "")
                            .slice(0, 10) === key &&
                        task.completed
                ).length;


            values.push(count);

        }


        const total =
            values.reduce(
                (sum, value) =>
                    sum + value,
                0
            );


        $("#weekCompletedCount").textContent =
            total;


        const max =
            Math.max(
                1,
                ...values
            );


        $("#miniChart").innerHTML =
            values.map(
                value => `

                    <div
                        class="
                            chart-bar
                            ${value ? "active" : ""}
                        "
                        style="
                            height:${Math.max(
                                10,
                                value / max * 100
                            )}%;
                        "
                        title="${value} выполнено"
                    ></div>

                `
            ).join("");

    }


    /* =====================================================
       SEARCH
    ===================================================== */

    function openSearch() {

        openModal("#searchModal");

        $("#searchInput").value = "";

        renderSearchResults("");

        setTimeout(
            () =>
                $("#searchInput")?.focus(),
            50
        );

    }


    function renderSearchResults(query) {

        const container =
            $("#searchResults");


        if (!container) {
            return;
        }


        const clean =
            String(query || "")
                .trim()
                .toLowerCase();


        if (!clean) {

            container.innerHTML = `

                <div class="empty-state">

                    <div class="empty-state-icon">
                        ⌕
                    </div>

                    <strong>
                        Найди нужную задачу
                    </strong>

                    <span>
                        Введи название, описание или список.
                    </span>

                </div>

            `;

            return;

        }


        const results =
            state.tasks.filter(task => {

                const list =
                    taskList(task);


                const text =
                    [
                        task.title,
                        task.description,
                        list?.name
                    ]
                    .filter(Boolean)
                    .join(" ")
                    .toLowerCase();


                return text.includes(clean);

            })
            .slice(0, 30);


        if (!results.length) {

            container.innerHTML = `

                <div class="empty-state">

                    <div class="empty-state-icon">
                        ?
                    </div>

                    <strong>
                        Ничего не найдено
                    </strong>

                    <span>
                        Попробуй другой запрос.
                    </span>

                </div>

            `;

            return;

        }


        container.innerHTML =
            results.map(task => `

                <button
                    type="button"
                    class="search-result"
                    data-search-task-id="${escapeHtml(task.id)}"
                >

                    <span>
                        ${task.completed ? "✓" : "○"}
                    </span>

                    <span class="search-result-title">
                        ${escapeHtml(task.title)}
                    </span>

                    <span class="search-result-date">
                        ${formatDateShort(task.due_date)}
                    </span>

                </button>

            `).join("");

    }


    /* =====================================================
       VIEWS
    ===================================================== */

    function updateView() {

        const views = {

            today: "#todayView",

            tasks: "#tasksView",

            calendar: "#calendarView",

            favorites: "#favoritesView"

        };


        Object.entries(views)
            .forEach(
                ([key, selector]) => {

                    $(selector)?.classList.toggle(
                        "hidden-view",
                        state.activeView !== key
                    );

                }
            );


        $$(".nav-item[data-view]")
            .forEach(button => {

                button.classList.toggle(
                    "active",
                    button.dataset.view ===
                    state.activeView
                );

            });


        const labels = {

            today: [
                "Сегодня",
                "Обзор дня"
            ],

            tasks: [
                "Задачи",
                "Все задачи"
            ],

            calendar: [
                "Календарь",
                "Планирование"
            ],

            favorites: [
                "Избранное",
                "Сохранённое"
            ],

            settings: [
                "Настройки",
                "Daily"
            ]

        };


        const label =
            labels[state.activeView] ||
            labels.today;


        $("#breadcrumbMain").textContent =
            label[0];


        $("#breadcrumbSub").textContent =
            label[1];


        if (state.activeView === "tasks") {

            renderAllTasks();

        }


        if (state.activeView === "calendar") {

            renderCalendar();

        }


        if (state.activeView === "favorites") {

            renderFavorites();

        }


        closeMobileSidebar();

    }


    function navigate(view) {

        if (view === "settings") {

            openSettings();

            return;

        }


        state.activeView =
            view;


        updateView();

    }


    /* =====================================================
       SETTINGS
    ===================================================== */

    function loadSettings() {

        try {

            const raw =
                localStorage.getItem(
                    `daily_settings_${state.user.id}`
                );


            if (raw) {

                const parsed =
                    JSON.parse(raw);


                state.settings = {
                    ...state.settings,
                    ...parsed
                };

            }

        } catch {

            // ignore

        }


        $("#autosaveToggle").checked =
            state.settings.autosave;


        $("#priorityToggle").checked =
            state.settings.priorityFirst;

    }


    function saveSettings() {

        const name =
            $("#settingsName")
                .value
                .trim();


        state.settings.autosave =
            $("#autosaveToggle").checked;


        state.settings.priorityFirst =
            $("#priorityToggle").checked;


        localStorage.setItem(
            `daily_settings_${state.user.id}`,
            JSON.stringify(
                state.settings
            )
        );


        if (
            name &&
            name !== state.profile?.display_name
        ) {

            updateProfileName(name);

        }


        closeModal("#settingsModal");

        renderProfile();

        renderTodayTasks();
        renderAllTasks();


        toast("Настройки сохранены.");

    }


    async function updateProfileName(name) {

        const { error } =
            await client
                .from("profiles")
                .update({
                    display_name: name
                })
                .eq("id", state.user.id);


        if (!error) {

            state.profile.display_name =
                name;

        }

    }


    function openSettings() {

        $("#settingsName").value =
            state.profile?.display_name || "";


        $("#autosaveToggle").checked =
            state.settings.autosave;


        $("#priorityToggle").checked =
            state.settings.priorityFirst;


        openModal("#settingsModal");

    }


    /* =====================================================
       MODALS
    ===================================================== */

    function openModal(selector) {

        $(selector)?.classList.remove(
            "hidden"
        );

    }


    function closeModal(selector) {

        $(selector)?.classList.add(
            "hidden"
        );

    }


    /* =====================================================
       NOTIFICATIONS
    ===================================================== */

    function renderNotifications() {

        const container =
            $("#notificationContent");


        const overdue =
            state.tasks.filter(
                task => isOverdue(task)
            );


        const todayIncomplete =
            state.tasks.filter(
                task =>
                    isToday(
                        String(task.due_date || "")
                            .slice(0, 10)
                    ) &&
                    !task.completed
            );


        let items = [];


        if (overdue.length) {

            items.push(`

                <div class="notification-item">

                    <strong>
                        ${overdue.length}
                        просроченных задач
                    </strong>

                    <span>
                        Проверь их в разделе «Задачи».
                    </span>

                </div>

            `);

        }


        if (todayIncomplete.length) {

            items.push(`

                <div class="notification-item">

                    <strong>
                        Сегодня ещё есть планы
                    </strong>

                    <span>
                        Осталось ${todayIncomplete.length}
                        незавершённых задач.
                    </span>

                </div>

            `);

        }


        if (!items.length) {

            items.push(`

                <div class="notification-item">

                    <strong>
                        Всё спокойно
                    </strong>

                    <span>
                        Никаких срочных уведомлений.
                    </span>

                </div>

            `);

        }


        container.innerHTML =
            items.join("");


        $("#notificationDot")
            .classList.toggle(
                "hidden",
                overdue.length === 0
            );

    }


    function toggleNotifications() {

        const popover =
            $("#notificationPopover");


        const hidden =
            popover.classList.contains(
                "hidden"
            );


        if (hidden) {

            renderNotifications();

        }


        popover.classList.toggle(
            "hidden"
        );

    }


    /* =====================================================
       MOBILE
    ===================================================== */

    function openMobileSidebar() {

        $("#sidebar")
            ?.classList.add(
                "mobile-open"
            );


        $("#sidebarOverlay")
            ?.classList.remove(
                "hidden"
            );

    }


    function closeMobileSidebar() {

        $("#sidebar")
            ?.classList.remove(
                "mobile-open"
            );


        $("#sidebarOverlay")
            ?.classList.add(
                "hidden"
            );

    }


    /* =====================================================
       LOGOUT
    ===================================================== */

    async function logout() {

        await client.auth.signOut();

        state.user = null;

        state.profile = null;

        state.tasks = [];

        state.lists = [];

        showAuth();

    }


    /* =====================================================
       EVENTS
    ===================================================== */

    function setupEvents() {


        /* AUTH */

        $("#authModeButton")
            ?.addEventListener(
                "click",
                () => {

                    const register =
                        $("#authForm")
                            .dataset.register !==
                        "true";


                    setAuthMode(register);

                }
            );


        $("#togglePassword")
            ?.addEventListener(
                "click",
                () => {

                    const input =
                        $("#authPassword");


                    const visible =
                        input.type ===
                        "text";


                    input.type =
                        visible
                            ? "password"
                            : "text";


                    $("#togglePassword")
                        .textContent =
                        visible
                            ? "Показать"
                            : "Скрыть";

                }
            );


        $("#authForm")
            ?.addEventListener(
                "submit",
                handleAuth
            );


        /* NAV */

        $$(".nav-item[data-view]")
            .forEach(button => {

                button.addEventListener(
                    "click",
                    () =>
                        navigate(
                            button.dataset.view
                        )
                );

            });


        $("#createListButton")
            ?.addEventListener(
                "click",
                () =>
                    openModal("#listModal")
            );


        /* TASK CREATION */

        $("#newTaskButton")
            ?.addEventListener(
                "click",
                () =>
                    openTaskModal()
            );


        $("#addTaskButton")
            ?.addEventListener(
                "click",
                () =>
                    openTaskModal()
            );


        $("#tasksPageAddButton")
            ?.addEventListener(
                "click",
                () =>
                    openTaskModal()
            );


        $("#selectedDateAddButton")
            ?.addEventListener(
                "click",
                () =>
                    openTaskModal({
                        due_date:
                            state.selectedDate
                    })
            );


        $("#taskForm")
            ?.addEventListener(
                "submit",
                event => {

                    event.preventDefault();

                    saveTask(
                        event.currentTarget
                    );

                }
            );


        $("#cancelTaskButton")
            ?.addEventListener(
                "click",
                () =>
                    closeModal("#taskModal")
            );


        $("#closeTaskModal")
            ?.addEventListener(
                "click",
                () =>
                    closeModal("#taskModal")
            );


        /* LIST */

        $("#listForm")
            ?.addEventListener(
                "submit",
                event => {

                    event.preventDefault();

                    createList(
                        $("#listName").value
                    );

                }
            );


        $("#closeListModal")
            ?.addEventListener(
                "click",
                () =>
                    closeModal("#listModal")
            );


        $("#cancelListButton")
            ?.addEventListener(
                "click",
                () =>
                    closeModal("#listModal")
            );


        /* TASK ACTIONS */

        document.addEventListener(
            "click",
            event => {

                const button =
                    event.target.closest(
                        "[data-action]"
                    );


                if (!button) {
                    return;
                }


                const id =
                    button.dataset.id;


                const action =
                    button.dataset.action;


                if (action === "complete") {

                    toggleTask(id);

                }


                if (action === "favorite") {

                    toggleFavorite(id);

                }


                if (action === "edit") {

                    const task =
                        state.tasks.find(
                            item =>
                                String(item.id) ===
                                String(id)
                        );


                    if (task) {

                        openTaskModal(task);

                    }

                }


                if (action === "delete") {

                    deleteTask(id);

                }

            }
        );


        /* NOTES */

        $("#noteInput")
            ?.addEventListener(
                "input",
                scheduleNoteSave
            );


        $("#saveNoteButton")
            ?.addEventListener(
                "click",
                saveNote
            );


        /* CALENDAR */

        $("#prevMonthButton")
            ?.addEventListener(
                "click",
                () =>
                    changeCalendarMonth(-1)
            );


        $("#nextMonthButton")
            ?.addEventListener(
                "click",
                () =>
                    changeCalendarMonth(1)
            );


        $("#calendarTodayButton")
            ?.addEventListener(
                "click",
                () => {

                    const today =
                        new Date();


                    state.calendarMonth =
                        new Date(
                            today.getFullYear(),
                            today.getMonth(),
                            1
                        );


                    state.selectedDate =
                        dateKey(today);


                    renderCalendar();

                    loadNote(
                        state.selectedDate
                    );

                }
            );


        $("#openFullCalendarButton")
            ?.addEventListener(
                "click",
                () =>
                    navigate("calendar")
            );


        $("#fullCalendarPrevButton")
            ?.addEventListener(
                "click",
                () =>
                    changeCalendarMonth(-1)
            );


        $("#fullCalendarNextButton")
            ?.addEventListener(
                "click",
                () =>
                    changeCalendarMonth(1)
            );


        $("#fullCalendarTodayButton")
            ?.addEventListener(
                "click",
                () => {

                    const today =
                        new Date();


                    state.selectedDate =
                        dateKey(today);


                    state.calendarMonth =
                        new Date(
                            today.getFullYear(),
                            today.getMonth(),
                            1
                        );


                    renderCalendar();

                    loadNote(
                        state.selectedDate
                    );

                }
            );


        document.addEventListener(
            "click",
            event => {

                const button =
                    event.target.closest(
                        "[data-calendar-date]"
                    );


                if (!button) {
                    return;
                }


                selectCalendarDate(
                    button.dataset.calendarDate
                );

            }
        );


        /* OVERDUE */

        $("#moveOverdueButton")
            ?.addEventListener(
                "click",
                moveOverdueToToday
            );


        /* TASK FILTER */

        $$(".filter-button")
            .forEach(button => {

                button.addEventListener(
                    "click",
                    () => {

                        $$(".filter-button")
                            .forEach(
                                item =>
                                    item.classList.remove(
                                        "active"
                                    )
                            );


                        button.classList.add(
                            "active"
                        );


                        state.taskFilter =
                            button.dataset.taskFilter;


                        renderAllTasks();

                    }
                );

            });


        $("#taskSortSelect")
            ?.addEventListener(
                "change",
                event => {

                    state.taskSort =
                        event.target.value;


                    renderAllTasks();

                    renderTodayTasks();

                }
            );


        /* SEARCH */

        $("#searchButton")
            ?.addEventListener(
                "click",
                openSearch
            );


        $("#searchInput")
            ?.addEventListener(
                "input",
                event =>
                    renderSearchResults(
                        event.target.value
                    )
            );


        $("#closeSearchModal")
            ?.addEventListener(
                "click",
                () =>
                    closeModal("#searchModal")
            );


        document.addEventListener(
            "click",
            event => {

                const result =
                    event.target.closest(
                        "[data-search-task-id]"
                    );


                if (!result) {
                    return;
                }


                const task =
                    state.tasks.find(
                        item =>
                            String(item.id) ===
                            String(
                                result.dataset.searchTaskId
                            )
                    );


                if (task) {

                    closeModal("#searchModal");

                    openTaskModal(task);

                }

            }
        );


        /* NOTIFICATIONS */

        $("#notificationButton")
            ?.addEventListener(
                "click",
                toggleNotifications
            );


        $("#closeNotificationButton")
            ?.addEventListener(
                "click",
                () =>
                    $("#notificationPopover")
                        ?.classList.add(
                            "hidden"
                        )
            );


        /* SETTINGS */

        $("#closeSettingsModal")
            ?.addEventListener(
                "click",
                () =>
                    closeModal("#settingsModal")
            );


        $("#saveSettingsButton")
            ?.addEventListener(
                "click",
                saveSettings
            );


        /* LOGOUT */

        $("#logoutButton")
            ?.addEventListener(
                "click",
                logout
            );


        /* MOBILE */

        $("#mobileOpenSidebar")
            ?.addEventListener(
                "click",
                openMobileSidebar
            );


        $("#mobileCloseSidebar")
            ?.addEventListener(
                "click",
                closeMobileSidebar
            );


        $("#sidebarOverlay")
            ?.addEventListener(
                "click",
                closeMobileSidebar
            );


        /* MODAL BACKDROP */

        $$(".modal-backdrop")
            .forEach(backdrop => {

                backdrop.addEventListener(
                    "click",
                    event => {

                        if (
                            event.target ===
                            backdrop
                        ) {

                            backdrop.classList.add(
                                "hidden"
                            );

                        }

                    }
                );

            });


        /* KEYBOARD */

        document.addEventListener(
            "keydown",
            event => {

                if (
                    event.key === "Escape"
                ) {

                    $$(".modal-backdrop")
                        .forEach(
                            modal =>
                                modal.classList.add(
                                    "hidden"
                                )
                        );


                    $("#notificationPopover")
                        ?.classList.add(
                            "hidden"
                        );

                }


                if (
                    (
                        event.ctrlKey ||
                        event.metaKey
                    ) &&
                    event.key.toLowerCase() ===
                        "k"
                ) {

                    event.preventDefault();

                    openSearch();

                }


                if (
                    event.key.toLowerCase() ===
                        "n" &&
                    !isTyping()
                ) {

                    event.preventDefault();

                    openTaskModal();

                }

            }
        );

    }


    function isTyping() {

        const tag =
            document.activeElement?.tagName;


        return (
            tag === "INPUT" ||
            tag === "TEXTAREA" ||
            tag === "SELECT"
        );

    }


    /* =====================================================
       AUTH
    ===================================================== */

    async function handleAuth(event) {

        event.preventDefault();


        const register =
            event.currentTarget
                .dataset.register ===
            "true";


        const email =
            $("#authEmail")
                .value
                .trim();


        const password =
            $("#authPassword")
                .value;


        const displayName =
            $("#displayName")
                .value
                .trim();


        const message =
            $("#authMessage");


        message.textContent = "";


        const button =
            $("#authSubmitButton");


        button.disabled = true;

        button.textContent =
            "Подождите…";


        try {

            if (register) {

                if (
                    !displayName
                ) {

                    throw new Error(
                        "Введите имя."
                    );

                }


                const {
                    data,
                    error
                } =
                    await client.auth.signUp({
                        email,
                        password,
                        options: {
                            data: {
                                display_name:
                                    displayName
                            }
                        }
                    });


                if (error) {
                    throw error;
                }


                if (
                    data.session
                ) {

                    state.user =
                        data.user;

                    await bootApp();

                } else {

                    message.style.color =
                        "#39a96b";

                    message.textContent =
                        "Аккаунт создан. Проверь почту, если требуется подтверждение.";

                }

            } else {

                const {
                    data,
                    error
                } =
                    await client.auth.signInWithPassword({
                        email,
                        password
                    });


                if (error) {
                    throw error;
                }


                state.user =
                    data.user;


                await bootApp();

            }

        } catch (error) {

            message.style.color =
                "#e05d67";


            message.textContent =
                friendlyError(error);

        } finally {

            button.disabled =
                false;


            button.textContent =
                register
                    ? "Создать аккаунт"
                    : "Войти";

        }

    }


    /* =====================================================
       BOOT
    ===================================================== */

    async function bootApp() {

        if (!state.user) {
            return;
        }


        showApp();


        await loadProfile();

        renderProfile();

        loadSettings();

        await loadLists();

        setupInitialCalendar();


        await loadTasks();


        updateView();

    }


    function setupInitialCalendar() {

        const today =
            new Date();


        state.selectedDate =
            dateKey(today);


        state.calendarMonth =
            new Date(
                today.getFullYear(),
                today.getMonth(),
                1
            );

    }


    /* =====================================================
       INIT
    ===================================================== */

    async function init() {

        setupEvents();

        setAuthMode(false);


        const {
            data
        } =
            await client.auth.getSession();


        if (data.session?.user) {

            state.user =
                data.session.user;


            await bootApp();

        } else {

            showAuth();

        }


        client.auth.onAuthStateChange(
            async (
                event,
                session
            ) => {

                if (
                    event === "SIGNED_IN" &&
                    session?.user
                ) {

                    state.user =
                        session.user;


                    await bootApp();

                }


                if (
                    event === "SIGNED_OUT"
                ) {

                    showAuth();

                }

            }
        );

    }


    init();

})();
