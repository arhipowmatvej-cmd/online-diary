/* =========================================================
   DAILY v100
   SUPABASE APPLICATION
========================================================= */

(() => {
    "use strict";


    /* =====================================================
       SUPABASE
    ====================================================== */

    if (!window.supabase) {
        console.error("Supabase JS не загружен.");
        return;
    }

    if (!window.DAILY_CONFIG) {
        console.error("supabase-config.js не найден.");
        return;
    }

    const supabaseClient = window.supabase.createClient(
        window.DAILY_CONFIG.supabaseUrl,
        window.DAILY_CONFIG.supabaseKey
    );


    /* =====================================================
       STATE
    ====================================================== */

    const state = {

        user: null,
        profile: null,

        lists: [],
        tasks: [],

        selectedDate: getTodayString(),

        calendarDate: new Date(),

        activeView: "today",

        activeTaskFilter: "all",

        selectedListId: null,

        editingTaskId: null,

        noteTimer: null,

        updatingTaskIds: new Set(),

        authMode: "login",

        autosaveNotes: true,

        initialized: false

    };


    /* =====================================================
       DOM
    ====================================================== */

    const $ = (id) => document.getElementById(id);

    const loadingScreen = $("loadingScreen");
    const authScreen = $("authScreen");
    const appShell = $("appShell");

    const authForm = $("authForm");
    const authTitle = $("authTitle");
    const authSubtitle = $("authSubtitle");
    const authSubmitButton = $("authSubmitButton");
    const authModeSwitch = $("authModeSwitch");
    const authMessage = $("authMessage");
    const displayNameField = $("displayNameField");

    const taskModal = $("taskModal");
    const taskForm = $("taskForm");

    const listModal = $("listModal");
    const listForm = $("listForm");

    const searchModal = $("searchModal");
    const searchInput = $("searchInput");

    const settingsModal = $("settingsModal");

    const sidebar = $("sidebar");
    const sidebarOverlay = $("sidebarOverlay");


    /* =====================================================
       DATE HELPERS
    ====================================================== */

    function pad(value) {
        return String(value).padStart(2, "0");
    }


    function getTodayString() {

        const date = new Date();

        return [
            date.getFullYear(),
            pad(date.getMonth() + 1),
            pad(date.getDate())
        ].join("-");
    }


    function dateToString(date) {

        return [
            date.getFullYear(),
            pad(date.getMonth() + 1),
            pad(date.getDate())
        ].join("-");
    }


    function stringToDate(value) {

        const parts = String(value).split("-").map(Number);

        return new Date(
            parts[0],
            parts[1] - 1,
            parts[2]
        );
    }


    function formatLongDate(value) {

        const date = stringToDate(value);

        return new Intl.DateTimeFormat("ru-RU", {
            day: "numeric",
            month: "long",
            year: "numeric"
        }).format(date);
    }


    function formatShortDate(value) {

        const date = stringToDate(value);

        return new Intl.DateTimeFormat("ru-RU", {
            day: "numeric",
            month: "short"
        }).format(date);
    }


    function getWeekdayShort(date) {

        return new Intl.DateTimeFormat("ru-RU", {
            weekday: "short"
        })
            .format(date)
            .replace(".", "")
            .slice(0, 2)
            .toUpperCase();
    }


    function getMonthName(date) {

        return new Intl.DateTimeFormat("ru-RU", {
            month: "long",
            year: "numeric"
        }).format(date);
    }


    function isToday(value) {
        return value === getTodayString();
    }


    function isOverdue(task) {

        if (!task || task.completed || !task.due_date) {
            return false;
        }

        const today = getTodayString();

        if (task.due_date < today) {
            return true;
        }

        if (
            task.due_date === today &&
            task.due_time
        ) {

            const now = new Date();

            const current =
                `${pad(now.getHours())}:${pad(now.getMinutes())}`;

            return task.due_time < current;
        }

        return false;
    }


    function getGreeting() {

        const hour = new Date().getHours();

        if (hour < 5) return "Доброй ночи";
        if (hour < 12) return "Доброе утро";
        if (hour < 18) return "Добрый день";

        return "Добрый вечер";
    }


    /* =====================================================
       ESCAPE
    ====================================================== */

    function escapeHtml(value) {

        return String(value ?? "")
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/"/g, "&quot;")
            .replace(/'/g, "&#039;");
    }


    /* =====================================================
       TOAST
    ====================================================== */

    function showToast(message, type = "success") {

        const container = $("toastContainer");

        if (!container) return;

        const toast = document.createElement("div");

        toast.className = `toast ${type}`;

        toast.textContent = message;

        container.appendChild(toast);

        setTimeout(() => {

            toast.style.opacity = "0";
            toast.style.transform = "translateY(8px)";

            setTimeout(() => toast.remove(), 200);

        }, 3000);
    }


    /* =====================================================
       AUTH UI
    ====================================================== */

    function showAuth() {

        loadingScreen.classList.add("hidden");

        appShell.classList.add("hidden");

        authScreen.classList.remove("hidden");
    }


    function showApp() {

        loadingScreen.classList.add("hidden");

        authScreen.classList.add("hidden");

        appShell.classList.remove("hidden");
    }


    function updateAuthMode() {

        authMessage.textContent = "";

        if (state.authMode === "login") {

            authTitle.textContent = "С возвращением";

            authSubtitle.textContent =
                "Войди, чтобы продолжить свой день.";

            authSubmitButton.textContent = "Войти";

            authModeSwitch.innerHTML =
                'Нет аккаунта? <strong>Создать</strong>';

            displayNameField.classList.add("hidden");

            $("authPassword").autocomplete = "current-password";

        } else {

            authTitle.textContent = "Создай свой Daily";

            authSubtitle.textContent =
                "Один аккаунт — и весь твой день всегда с тобой.";

            authSubmitButton.textContent = "Создать аккаунт";

            authModeSwitch.innerHTML =
                'Уже есть аккаунт? <strong>Войти</strong>';

            displayNameField.classList.remove("hidden");

            $("authPassword").autocomplete = "new-password";
        }
    }


    function friendlyAuthError(error) {

        const message = String(error?.message || "").toLowerCase();

        if (message.includes("invalid login")) {
            return "Неверный email или пароль.";
        }

        if (message.includes("email not confirmed")) {
            return "Подтверди email и попробуй снова.";
        }

        if (message.includes("already registered")) {
            return "Этот email уже зарегистрирован.";
        }

        if (message.includes("password")) {
            return "Пароль должен содержать минимум 6 символов.";
        }

        if (message.includes("rate limit")) {
            return "Слишком много попыток. Попробуй чуть позже.";
        }

        return "Не удалось выполнить операцию. Попробуй ещё раз.";
    }


    /* =====================================================
       PROFILE
    ====================================================== */

    async function loadProfile() {

        if (!state.user) return;

        const {
            data,
            error
        } = await supabaseClient
            .from("profiles")
            .select("*")
            .eq("id", state.user.id)
            .maybeSingle();

        if (error) {
            console.warn("Profile load:", error);
            return;
        }

        state.profile = data || null;

        renderProfile();
    }


    async function createProfileIfNeeded(displayName) {

        if (!state.user) return;

        const {
            data,
            error
        } = await supabaseClient
            .from("profiles")
            .select("*")
            .eq("id", state.user.id)
            .maybeSingle();

        if (error) {
            console.warn("Profile lookup:", error);
            return;
        }

        if (data) {

            state.profile = data;

            return;
        }

        const name =
            displayName ||
            state.user.user_metadata?.display_name ||
            state.user.email?.split("@")[0] ||
            "Daily User";

        const result =
            await supabaseClient
                .from("profiles")
                .insert({
                    id: state.user.id,
                    display_name: name
                })
                .select()
                .single();

        if (!result.error) {
            state.profile = result.data;
        }
    }


    function renderProfile() {

        const name =
            state.profile?.display_name ||
            state.user?.user_metadata?.display_name ||
            state.user?.email?.split("@")[0] ||
            "Daily User";

        $("profileName").textContent = name;

        $("profileEmail").textContent =
            state.user?.email || "";

        $("profileAvatar").textContent =
            name.charAt(0).toUpperCase();

        $("welcomeName").textContent = name.split(" ")[0];

        $("welcomeGreeting").textContent =
            getGreeting();
    }


    /* =====================================================
       LISTS
    ====================================================== */

    async function loadLists() {

        if (!state.user) return;

        const {
            data,
            error
        } = await supabaseClient
            .from("lists")
            .select("*")
            .eq("user_id", state.user.id)
            .order("created_at", {
                ascending: true
            });

        if (error) {

            console.error("Lists:", error);

            state.lists = [];

            renderLists();

            return;
        }

        state.lists = data || [];

        if (!state.lists.length) {

            await createDefaultLists();

        }

        renderLists();
        renderTaskListSelect();
    }


    async function createDefaultLists() {

        const defaults = [
            {
                name: "Личное"
            },
            {
                name: "Работа"
            },
            {
                name: "Учёба"
            }
        ];

        for (const item of defaults) {

            const {
                error
            } = await supabaseClient
                .from("lists")
                .insert({
                    user_id: state.user.id,
                    name: item.name
                });

            if (error) {
                console.warn("Default list:", error);
            }
        }

        const {
            data
        } = await supabaseClient
            .from("lists")
            .select("*")
            .eq("user_id", state.user.id)
            .order("created_at", {
                ascending: true
            });

        state.lists = data || [];
    }


    function renderLists() {

        const container = $("listsContainer");

        container.innerHTML = "";

        state.lists.forEach((list, index) => {

            const button =
                document.createElement("button");

            button.type = "button";

            button.className =
                "custom-list-item";

            button.dataset.listId = list.id;

            button.innerHTML = `
                <span
                    class="list-dot"
                    style="background:${getListColor(index)}"
                ></span>

                <span>
                    ${escapeHtml(list.name)}
                </span>
            `;

            button.addEventListener("click", () => {

                state.selectedListId =
                    state.selectedListId === list.id
                        ? null
                        : list.id;

                state.activeView = "today";

                updateNavigation();

                refreshVisibleData();
            });

            container.appendChild(button);

        });
    }


    function getListColor(index) {

        const colors = [
            "#7e9fdb",
            "#7ab58c",
            "#d8a15d",
            "#a18bc6",
            "#d27878",
            "#71a7a7"
        ];

        return colors[index % colors.length];
    }


    function renderTaskListSelect() {

        const select = $("taskListSelect");

        if (!select) return;

        select.innerHTML =
            `<option value="">Без списка</option>`;

        state.lists.forEach(list => {

            const option =
                document.createElement("option");

            option.value = list.id;

            option.textContent = list.name;

            select.appendChild(option);
        });
    }


    /* =====================================================
       TASKS
    ====================================================== */

    async function loadTasks() {

        if (!state.user) return;

        try {

            const {
                data,
                error
            } = await supabaseClient
                .from("tasks")
                .select("*")
                .eq("user_id", state.user.id)
                .order("due_date", {
                    ascending: true
                })
                .order("due_time", {
                    ascending: true,
                    nullsFirst: false
                })
                .order("created_at", {
                    ascending: false
                });

            if (error) {
                throw error;
            }

            state.tasks = data || [];

        } catch (error) {

            console.error("Tasks load:", error);

            state.tasks = [];

            showToast(
                "Не удалось загрузить задачи.",
                "error"
            );
        }

        refreshVisibleData();
    }


    function getTasksForDate(date) {

        return state.tasks.filter(task => {

            if (task.due_date !== date) {
                return false;
            }

            if (
                state.selectedListId &&
                task.list_id !== state.selectedListId
            ) {
                return false;
            }

            return true;
        });
    }


    function sortTasks(tasks) {

        const priorityWeight = {
            high: 0,
            medium: 1,
            low: 2
        };

        return [...tasks].sort((a, b) => {

            if (a.completed !== b.completed) {
                return a.completed ? 1 : -1;
            }

            const overdueA = isOverdue(a);
            const overdueB = isOverdue(b);

            if (overdueA !== overdueB) {
                return overdueA ? -1 : 1;
            }

            const priorityA =
                priorityWeight[a.priority] ?? 1;

            const priorityB =
                priorityWeight[b.priority] ?? 1;

            if (priorityA !== priorityB) {
                return priorityA - priorityB;
            }

            const timeA = a.due_time || "99:99";
            const timeB = b.due_time || "99:99";

            if (timeA !== timeB) {
                return timeA.localeCompare(timeB);
            }

            return String(a.created_at || "")
                .localeCompare(String(b.created_at || ""));
        });
    }


    function getListName(listId) {

        const list = state.lists.find(
            item => item.id === listId
        );

        return list?.name || "";
    }


    function priorityLabel(priority) {

        if (priority === "high") return "Высокий";
        if (priority === "low") return "Низкий";

        return "Средний";
    }


    function renderTaskHTML(task, compact = false) {

        const overdue = isOverdue(task);

        const priority =
            task.priority || "medium";

        const time =
            task.due_time
                ? task.due_time.slice(0, 5)
                : "";

        const listName =
            getListName(task.list_id);

        return `
            <article
                class="${compact ? "selected-day-task" : "task-item"} ${task.completed ? "completed" : ""}"
                data-task-id="${task.id}"
            >

                <button
                    class="task-check"
                    data-action="complete"
                    data-task-id="${task.id}"
                    type="button"
                    aria-label="Отметить выполненной"
                ></button>

                <div class="${compact ? "selected-day-task-content" : "task-content"}">

                    <div class="${compact ? "selected-day-task-title" : "task-title"}">
                        ${escapeHtml(task.title)}
                    </div>

                    <div class="${compact ? "selected-day-task-meta" : "task-meta"}">

                        ${
                            time
                                ? `<span class="${overdue ? "task-overdue" : "task-time"}">${escapeHtml(time)}</span>`
                                : ""
                        }

                        ${
                            overdue
                                ? `<span class="task-overdue">Просрочено</span>`
                                : ""
                        }

                        ${
                            !compact
                                ? `
                                <span class="task-priority priority-${priority}">
                                    ${priorityLabel(priority)}
                                </span>
                                `
                                : ""
                        }

                        ${
                            !compact && listName
                                ? `
                                <span
                                    class="task-list-tag"
                                    style="--task-color:${getListColor(
                                        state.lists.findIndex(
                                            item => item.id === task.list_id
                                        )
                                    )}"
                                >
                                    ${escapeHtml(listName)}
                                </span>
                                `
                                : ""
                        }

                    </div>

                </div>

                ${
                    !compact
                        ? `
                        <div class="task-actions">

                            <button
                                class="task-action favorite ${task.is_favorite ? "active" : ""}"
                                data-action="favorite"
                                data-task-id="${task.id}"
                                type="button"
                                title="Избранное"
                            >
                                ${task.is_favorite ? "★" : "☆"}
                            </button>

                            <button
                                class="task-action"
                                data-action="edit"
                                data-task-id="${task.id}"
                                type="button"
                                title="Редактировать"
                            >
                                ✎
                            </button>

                            <button
                                class="task-action delete"
                                data-action="delete"
                                data-task-id="${task.id}"
                                type="button"
                                title="Удалить"
                            >
                                ×
                            </button>

                        </div>
                        `
                        : ""
                }

            </article>
        `;
    }


    function renderTodayTasks() {

        const container = $("taskList");

        if (!container) return;

        let tasks =
            getTasksForDate(state.selectedDate);

        tasks = sortTasks(tasks);

        if (!tasks.length) {

            container.innerHTML = `
                <div class="empty-state">

                    <div class="empty-icon">
                        ✓
                    </div>

                    <strong>
                        День свободен
                    </strong>

                    <p>
                        Отличный момент, чтобы добавить
                        первую задачу или просто насладиться
                        свободным временем.
                    </p>

                    <button
                        class="primary-button"
                        data-empty-action="add"
                        type="button"
                    >
                        + Добавить задачу
                    </button>

                </div>
            `;

        } else {

            container.innerHTML =
                tasks
                    .map(task => renderTaskHTML(task))
                    .join("");
        }

        const completed =
            tasks.filter(task => task.completed).length;

        $("tasksSubtitle").textContent =
            `${tasks.length} ${
                pluralize(tasks.length, "задача", "задачи", "задач")
            } · ${completed} выполнено`;
    }


    function pluralize(number, one, few, many) {

        const n = Math.abs(number) % 100;
        const n1 = n % 10;

        if (n > 10 && n < 20) return many;

        if (n1 > 1 && n1 < 5) return few;

        if (n1 === 1) return one;

        return many;
    }


    /* =====================================================
       ALL TASKS PAGE
    ====================================================== */

    function getFilteredAllTasks() {

        let tasks = [...state.tasks];

        switch (state.activeTaskFilter) {

            case "today":
                tasks = tasks.filter(
                    task => task.due_date === getTodayString()
                );
                break;

            case "open":
                tasks = tasks.filter(
                    task => !task.completed
                );
                break;

            case "completed":
                tasks = tasks.filter(
                    task => task.completed
                );
                break;

            case "overdue":
                tasks = tasks.filter(
                    task => isOverdue(task)
                );
                break;

            default:
                break;
        }

        return sortTasks(tasks);
    }


    function renderAllTasks() {

        const container = $("allTasksList");

        if (!container) return;

        const tasks = getFilteredAllTasks();

        if (!tasks.length) {

            container.innerHTML = `
                <div class="card">
                    <div class="empty-state">

                        <div class="empty-icon">
                            ✓
                        </div>

                        <strong>
                            Здесь пока пусто
                        </strong>

                        <p>
                            В этом фильтре нет задач.
                        </p>

                        <button
                            class="primary-button"
                            data-empty-action="add"
                            type="button"
                        >
                            + Создать задачу
                        </button>

                    </div>
                </div>
            `;

            return;
        }

        container.innerHTML =
            tasks.map(task => {

                const date =
                    task.due_date
                        ? stringToDate(task.due_date)
                        : null;

                return `
                    <article
                        class="all-task-row"
                        data-task-id="${task.id}"
                    >

                        <button
                            class="task-check"
                            data-action="complete"
                            data-task-id="${task.id}"
                            type="button"
                        ></button>

                        <div class="all-task-date">

                            <strong>
                                ${date ? date.getDate() : "—"}
                            </strong>

                            <span>
                                ${date ? getWeekdayShort(date) : ""}
                            </span>

                        </div>

                        <div class="all-task-main">

                            <div
                                class="all-task-title ${
                                    task.completed ? "task-overdue" : ""
                                }"
                                style="${
                                    task.completed
                                        ? "color:#aaa;text-decoration:line-through"
                                        : ""
                                }"
                            >
                                ${escapeHtml(task.title)}
                            </div>

                            ${
                                task.description
                                    ? `
                                    <div class="all-task-description">
                                        ${escapeHtml(task.description)}
                                    </div>
                                    `
                                    : ""
                            }

                        </div>

                        <div class="all-task-right">

                            ${
                                task.due_time
                                    ? `
                                    <span class="all-task-date-label">
                                        ${escapeHtml(
                                            task.due_time.slice(0, 5)
                                        )}
                                    </span>
                                    `
                                    : ""
                            }

                            <span class="task-priority priority-${
                                task.priority || "medium"
                            }">
                                ${priorityLabel(task.priority || "medium")}
                            </span>

                            <button
                                class="task-action favorite ${
                                    task.is_favorite ? "active" : ""
                                }"
                                data-action="favorite"
                                data-task-id="${task.id}"
                                type="button"
                            >
                                ${task.is_favorite ? "★" : "☆"}
                            </button>

                            <button
                                class="task-action"
                                data-action="edit"
                                data-task-id="${task.id}"
                                type="button"
                            >
                                ✎
                            </button>

                        </div>

                    </article>
                `;

            }).join("");
    }


    /* =====================================================
       TASK ACTIONS
    ====================================================== */

    async function toggleTask(taskId) {

        const task =
            state.tasks.find(item => item.id === taskId);

        if (!task) return;

        if (state.updatingTaskIds.has(taskId)) {
            return;
        }

        state.updatingTaskIds.add(taskId);

        const oldValue = task.completed;

        task.completed = !oldValue;

        refreshVisibleData();

        const {
            error
        } = await supabaseClient
            .from("tasks")
            .update({
                completed: task.completed
            })
            .eq("id", taskId)
            .eq("user_id", state.user.id);

        state.updatingTaskIds.delete(taskId);

        if (error) {

            task.completed = oldValue;

            refreshVisibleData();

            console.error(error);

            showToast(
                "Не удалось изменить задачу.",
                "error"
            );

            return;
        }

        showToast(
            task.completed
                ? "Задача выполнена ✓"
                : "Задача снова активна"
        );

        renderProgress();
        renderWeeklyStats();
    }


    async function toggleFavorite(taskId) {

        const task =
            state.tasks.find(item => item.id === taskId);

        if (!task) return;

        const newValue = !Boolean(task.is_favorite);

        task.is_favorite = newValue;

        refreshVisibleData();

        const {
            error
        } = await supabaseClient
            .from("tasks")
            .update({
                is_favorite: newValue
            })
            .eq("id", taskId)
            .eq("user_id", state.user.id);

        if (error) {

            task.is_favorite = !newValue;

            refreshVisibleData();

            showToast(
                "Не удалось изменить избранное.",
                "error"
            );

            return;
        }

        showToast(
            newValue
                ? "Добавлено в избранное"
                : "Убрано из избранного"
        );
    }


    async function deleteTask(taskId) {

        const task =
            state.tasks.find(item => item.id === taskId);

        if (!task) return;

        const confirmed =
            window.confirm(
                `Удалить задачу «${task.title}»?`
            );

        if (!confirmed) return;

        const {
            error
        } = await supabaseClient
            .from("tasks")
            .delete()
            .eq("id", taskId)
            .eq("user_id", state.user.id);

        if (error) {

            console.error(error);

            showToast(
                "Не удалось удалить задачу.",
                "error"
            );

            return;
        }

        state.tasks =
            state.tasks.filter(
                item => item.id !== taskId
            );

        refreshVisibleData();

        showToast("Задача удалена");
    }


    /* =====================================================
       TASK MODAL
    ====================================================== */

    function openTaskModal(task = null, date = null) {

        state.editingTaskId =
            task?.id || null;

        $("taskModalTitle").textContent =
            task
                ? "Редактировать задачу"
                : "Новая задача";

        $("taskSubmitButton").textContent =
            task
                ? "Сохранить изменения"
                : "Создать задачу";

        $("taskTitle").value =
            task?.title || "";

        $("taskDescription").value =
            task?.description || "";

        $("taskDate").value =
            task?.due_date ||
            date ||
            state.selectedDate ||
            getTodayString();

        $("taskTime").value =
            task?.due_time
                ? task.due_time.slice(0, 5)
                : "";

        $("taskPriority").value =
            task?.priority || "medium";

        renderTaskListSelect();

        $("taskListSelect").value =
            task?.list_id || "";

        taskModal.classList.remove("hidden");

        setTimeout(() => {
            $("taskTitle").focus();
        }, 50);
    }


    function closeTaskModal() {

        taskModal.classList.add("hidden");

        state.editingTaskId = null;

        taskForm.reset();

        $("taskDate").value =
            state.selectedDate ||
            getTodayString();

        $("taskPriority").value = "medium";
    }


    async function submitTask(event) {

        event.preventDefault();

        if (!state.user) return;

        const title =
            $("taskTitle").value.trim();

        if (!title) return;

        const payload = {
            title,
            description:
                $("taskDescription").value.trim() || null,
            due_date:
                $("taskDate").value,
            due_time:
                $("taskTime").value || null,
            priority:
                $("taskPriority").value || "medium",
            list_id:
                $("taskListSelect").value || null
        };


        if (state.editingTaskId) {

            const {
                data,
                error
            } = await supabaseClient
                .from("tasks")
                .update(payload)
                .eq("id", state.editingTaskId)
                .eq("user_id", state.user.id)
                .select()
                .single();

            if (error) {

                console.error(error);

                showToast(
                    "Не удалось сохранить задачу.",
                    "error"
                );

                return;
            }

            const index =
                state.tasks.findIndex(
                    item => item.id === state.editingTaskId
                );

            if (index !== -1) {
                state.tasks[index] = data;
            }

            showToast("Задача обновлена");

        } else {

            const {
                data,
                error
            } = await supabaseClient
                .from("tasks")
                .insert({
                    ...payload,
                    user_id: state.user.id,
                    completed: false,
                    is_favorite: false
                })
                .select()
                .single();

            if (error) {

                console.error(error);

                showToast(
                    "Не удалось создать задачу.",
                    "error"
                );

                return;
            }

            state.tasks.push(data);

            showToast("Задача создана ✓");
        }

        state.selectedDate =
            payload.due_date || state.selectedDate;

        closeTaskModal();

        refreshVisibleData();
    }


    /* =====================================================
       CALENDAR
    ====================================================== */

    function renderCalendar() {

        const title = $("calendarTitle");

        const grid = $("calendarFullDays");

        if (!title || !grid) return;

        title.textContent =
            capitalize(
                getMonthName(state.calendarDate)
            );

        const year =
            state.calendarDate.getFullYear();

        const month =
            state.calendarDate.getMonth();

        const firstDay =
            new Date(year, month, 1);

        let start =
            firstDay.getDay();

        start =
            start === 0 ? 6 : start - 1;

        const daysInMonth =
            new Date(year, month + 1, 0).getDate();

        const prevDays =
            new Date(year, month, 0).getDate();

        const cells = [];

        for (let i = start - 1; i >= 0; i--) {

            const date =
                new Date(year, month - 1, prevDays - i);

            cells.push({
                date,
                outside: true
            });
        }

        for (let day = 1; day <= daysInMonth; day++) {

            cells.push({
                date: new Date(year, month, day),
                outside: false
            });
        }

        while (cells.length % 7 !== 0) {

            const last =
                cells[cells.length - 1].date;

            const next =
                new Date(
                    last.getFullYear(),
                    last.getMonth(),
                    last.getDate() + 1
                );

            cells.push({
                date: next,
                outside: true
            });
        }

        grid.innerHTML =
            cells.map(renderCalendarDay).join("");

        renderSelectedDayPanel();
    }


    function renderCalendarDay(item) {

        const dateString =
            dateToString(item.date);

        const tasks =
            state.tasks.filter(
                task => task.due_date === dateString
            );

        const selected =
            dateString === state.selectedDate;

        const today =
            isToday(dateString);

        const visible =
            tasks.slice(0, 3);

        return `
            <div
                class="calendar-day
                    ${item.outside ? "outside" : ""}
                    ${selected ? "selected" : ""}
                    ${today ? "today" : ""}"
                data-calendar-date="${dateString}"
            >

                <div class="calendar-day-number">
                    ${item.date.getDate()}
                </div>

                ${
                    visible
                        .map(task => `
                            <div
                                class="calendar-task ${
                                    task.completed ? "completed" : ""
                                }"
                            >
                                <span class="calendar-task-dot"></span>

                                <span>
                                    ${escapeHtml(task.title)}
                                </span>
                            </div>
                        `)
                        .join("")
                }

                ${
                    tasks.length > 3
                        ? `
                            <div class="calendar-more">
                                +${tasks.length - 3} ещё
                            </div>
                        `
                        : ""
                }

            </div>
        `;
    }


    function renderSelectedDayPanel() {

        const title =
            $("selectedDateTitle");

        const subtitle =
            $("selectedDateSubtitle");

        const container =
            $("selectedDayTasks");

        const tasks =
            sortTasks(
                state.tasks.filter(
                    task =>
                        task.due_date === state.selectedDate
                )
            );

        title.textContent =
            isToday(state.selectedDate)
                ? "Сегодня"
                : capitalize(
                    new Intl.DateTimeFormat("ru-RU", {
                        day: "numeric",
                        month: "long"
                    }).format(
                        stringToDate(state.selectedDate)
                    )
                );

        subtitle.textContent =
            `${tasks.length} ${
                pluralize(
                    tasks.length,
                    "задача",
                    "задачи",
                    "задач"
                )
            }`;

        if (!tasks.length) {

            container.innerHTML = `
                <div class="empty-state">
                    <div class="empty-icon">
                        +
                    </div>

                    <strong>
                        День свободен
                    </strong>

                    <p>
                        Добавь сюда задачу и
                        увидишь её прямо в календаре.
                    </p>
                </div>
            `;

            return;
        }

        container.innerHTML =
            tasks
                .map(task => renderTaskHTML(task, true))
                .join("");
    }


    function changeMonth(offset) {

        state.calendarDate =
            new Date(
                state.calendarDate.getFullYear(),
                state.calendarDate.getMonth() + offset,
                1
            );

        renderCalendar();
    }


    function goCalendarToday() {

        state.calendarDate = new Date();

        state.selectedDate =
            getTodayString();

        renderCalendar();
    }


    function selectCalendarDate(date) {

        state.selectedDate = date;

        const selected =
            stringToDate(date);

        state.calendarDate =
            new Date(
                selected.getFullYear(),
                selected.getMonth(),
                1
            );

        renderCalendar();

        updateBreadcrumb();
    }


    function capitalize(value) {

        if (!value) return value;

        return value.charAt(0).toUpperCase() +
            value.slice(1);
    }


    /* =====================================================
       NOTES
    ====================================================== */

    function noteStorageKey(date) {

        return `daily_note_${state.user?.id || "guest"}_${date}`;
    }


    function loadLocalNote(date) {

        try {
            return localStorage.getItem(
                noteStorageKey(date)
            ) || "";
        } catch {
            return "";
        }
    }


    function saveLocalNote(date, content) {

        try {

            localStorage.setItem(
                noteStorageKey(date),
                content
            );

        } catch (error) {
            console.warn("Local note:", error);
        }
    }


    async function loadNote() {

        const input =
            $("noteInput");

        const status =
            $("noteStatus");

        if (!input || !state.user) return;

        if (state.noteTimer) {
            clearTimeout(state.noteTimer);
        }

        status.textContent = "Загрузка...";
        status.className = "save-status";

        const local =
            loadLocalNote(state.selectedDate);

        input.value = local;

        const {
            data,
            error
        } = await supabaseClient
            .from("notes")
            .select("*")
            .eq("user_id", state.user.id)
            .eq("date", state.selectedDate)
            .maybeSingle();

        if (!error && data) {

            input.value =
                data.content || "";

            saveLocalNote(
                state.selectedDate,
                input.value
            );

            status.textContent = "Сохранено";
            status.className =
                "save-status saved";

            return;
        }

        if (error) {

            console.warn("Note load:", error);

            status.textContent =
                local
                    ? "Локальная копия"
                    : "Новая заметка";

            return;
        }

        status.textContent =
            local
                ? "Локальная копия"
                : "Автосохранение";
    }


    async function saveNote(showMessage = false) {

        if (!state.user) return;

        const input =
            $("noteInput");

        const status =
            $("noteStatus");

        if (!input) return;

        const content =
            input.value;

        saveLocalNote(
            state.selectedDate,
            content
        );

        status.textContent =
            "Сохраняем...";

        status.className =
            "save-status";


        const {
            error
        } = await supabaseClient
            .from("notes")
            .upsert(
                {
                    user_id: state.user.id,
                    date: state.selectedDate,
                    content
                },
                {
                    onConflict: "user_id,date"
                }
            );

        if (error) {

            console.error("Note save:", error);

            status.textContent =
                "Сохранено локально";

            status.className =
                "save-status error";

            if (showMessage) {
                showToast(
                    "Сервер недоступен — заметка сохранена локально.",
                    "error"
                );
            }

            return;
        }

        status.textContent =
            "Сохранено";

        status.className =
            "save-status saved";

        if (showMessage) {
            showToast("Заметка сохранена");
        }
    }


    function scheduleNoteSave() {

        if (!state.autosaveNotes) {
            return;
        }

        if (state.noteTimer) {
            clearTimeout(state.noteTimer);
        }

        const status =
            $("noteStatus");

        status.textContent =
            "Автосохранение...";

        status.className =
            "save-status";

        state.noteTimer =
            setTimeout(() => {

                saveNote(false);

            }, 900);
    }


    /* =====================================================
       PROGRESS
    ====================================================== */

    function renderProgress() {

        const tasks =
            getTasksForDate(state.selectedDate);

        const completed =
            tasks.filter(
                task => task.completed
            ).length;

        const percent =
            tasks.length
                ? Math.round(
                    completed / tasks.length * 100
                )
                : 0;

        $("progressPercent").textContent =
            `${percent}%`;

        const ring =
            $("progressRing");

        const circumference = 264;

        ring.style.strokeDashoffset =
            circumference -
            circumference * percent / 100;
    }


    /* =====================================================
       WEEKLY STATS
    ====================================================== */

    function renderWeeklyStats() {

        const today =
            stringToDate(getTodayString());

        const monday =
            new Date(today);

        const day =
            monday.getDay();

        const diff =
            day === 0 ? -6 : 1 - day;

        monday.setDate(
            monday.getDate() + diff
        );

        let totalCompleted = 0;

        const values = [];

        for (let i = 0; i < 7; i++) {

            const date =
                new Date(monday);

            date.setDate(
                monday.getDate() + i
            );

            const key =
                dateToString(date);

            const tasks =
                state.tasks.filter(
                    task => task.due_date === key
                );

            const completed =
                tasks.filter(
                    task => task.completed
                ).length;

            totalCompleted += completed;

            values.push({
                date,
                completed
            });
        }

        $("weekCompletedCount").textContent =
            totalCompleted;

        const max =
            Math.max(
                1,
                ...values.map(item => item.completed)
            );

        $("miniChart").innerHTML =
            values.map(item => {

                const height =
                    Math.max(
                        5,
                        item.completed / max * 82
                    );

                return `
                    <div
                        class="chart-day ${
                            dateToString(item.date) === getTodayString()
                                ? "today"
                                : ""
                        }"
                    >

                        <div class="chart-bar-wrap">

                            <div
                                class="chart-bar"
                                style="height:${height}px"
                            ></div>

                        </div>

                        <span class="chart-label">
                            ${getWeekdayShort(item.date)}
                        </span>

                    </div>
                `;

            }).join("");
    }


    /* =====================================================
       FAVORITES
    ====================================================== */

    function renderFavorites() {

        const container =
            $("favoritesList");

        if (!container) return;

        const tasks =
            sortTasks(
                state.tasks.filter(
                    task => task.is_favorite
                )
            );

        if (!tasks.length) {

            container.innerHTML = `
                <div class="card">
                    <div class="empty-state">

                        <div class="empty-icon">
                            ☆
                        </div>

                        <strong>
                            Избранное пока пустое
                        </strong>

                        <p>
                            Нажимай на звёздочку у важных
                            задач, чтобы собрать их здесь.
                        </p>

                    </div>
                </div>
            `;

            return;
        }

        container.innerHTML =
            tasks.map(task => {

                return renderTaskHTML(task);

            }).join("");
    }


    /* =====================================================
       SEARCH
    ====================================================== */

    function openSearch() {

        searchModal.classList.remove("hidden");

        searchInput.value = "";

        renderSearchResults("");

        setTimeout(() => {
            searchInput.focus();
        }, 50);
    }


    function closeSearch() {

        searchModal.classList.add("hidden");
    }


    function renderSearchResults(query) {

        const container =
            $("searchResults");

        const normalized =
            query.trim().toLowerCase();

        if (!normalized) {

            container.innerHTML = `
                <div class="empty-state">
                    <div class="empty-icon">⌕</div>

                    <strong>
                        Найди что-нибудь
                    </strong>

                    <p>
                        Введи название или описание задачи.
                    </p>
                </div>
            `;

            return;
        }

        const results =
            state.tasks.filter(task => {

                const haystack =
                    [
                        task.title,
                        task.description
                    ]
                        .filter(Boolean)
                        .join(" ")
                        .toLowerCase();

                return haystack.includes(normalized);
            });

        if (!results.length) {

            container.innerHTML = `
                <div class="empty-state">
                    <div class="empty-icon">⌕</div>

                    <strong>
                        Ничего не нашли
                    </strong>

                    <p>
                        Попробуй другой запрос.
                    </p>
                </div>
            `;

            return;
        }

        container.innerHTML =
            results.slice(0, 20).map(task => {

                return `
                    <div
                        class="search-result"
                        data-search-task="${task.id}"
                    >

                        <div class="search-result-icon">
                            ${task.completed ? "✓" : "○"}
                        </div>

                        <div class="search-result-main">

                            <strong>
                                ${escapeHtml(task.title)}
                            </strong>

                            <span>
                                ${
                                    task.due_date
                                        ? formatLongDate(task.due_date)
                                        : "Без даты"
                                }
                            </span>

                        </div>

                    </div>
                `;

            }).join("");
    }


    /* =====================================================
       VIEW NAVIGATION
    ====================================================== */

    function setView(view) {

        state.activeView = view;

        updateNavigation();

        updateBreadcrumb();

        refreshVisibleData();

        closeMobileSidebar();
    }


    function updateNavigation() {

        document
            .querySelectorAll(".nav-item[data-view]")
            .forEach(button => {

                button.classList.toggle(
                    "active",
                    button.dataset.view === state.activeView
                );
            });
    }


    function updateBreadcrumb() {

        const main =
            $("breadcrumbMain");

        const sub =
            $("breadcrumbSub");

        const names = {
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
                capitalize(
                    getMonthName(state.calendarDate)
                )
            ],
            favorites: [
                "Избранное",
                "Сохранённые задачи"
            ],
            settings: [
                "Настройки",
                "Preferences"
            ]
        };

        const pair =
            names[state.activeView] ||
            names.today;

        main.textContent = pair[0];
        sub.textContent = pair[1];
    }


    function refreshVisibleData() {

        renderProfile();

        renderTodayTasks();

        renderProgress();

        renderWeeklyStats();

        renderCalendar();

        renderAllTasks();

        renderFavorites();

        if (state.activeView === "today") {
            loadNote();
        }
    }


    /* =====================================================
       MOBILE
    ====================================================== */

    function openMobileSidebar() {

        sidebar.classList.add("open");

        sidebarOverlay.classList.remove("hidden");
    }


    function closeMobileSidebar() {

        sidebar.classList.remove("open");

        sidebarOverlay.classList.add("hidden");
    }


    /* =====================================================
       SETTINGS
    ====================================================== */

    function openSettings() {

        settingsModal.classList.remove("hidden");

        updateThemeButton();
        updateAutosaveButton();
    }


    function updateThemeButton() {

        $("themeToggle").classList.toggle(
            "active",
            document.body.classList.contains("dark")
        );
    }


    function updateAutosaveButton() {

        $("autosaveToggle").classList.toggle(
            "active",
            state.autosaveNotes
        );
    }


    function toggleTheme() {

        document.body.classList.toggle("dark");

        localStorage.setItem(
            "daily_theme",
            document.body.classList.contains("dark")
                ? "dark"
                : "light"
        );

        updateThemeButton();
    }


    function loadTheme() {

        const theme =
            localStorage.getItem("daily_theme");

        if (theme === "dark") {
            document.body.classList.add("dark");
        }
    }


    /* =====================================================
       NOTIFICATIONS
    ====================================================== */

    function renderNotifications() {

        const container =
            $("notificationContent");

        const overdue =
            state.tasks.filter(
                task => isOverdue(task)
            );

        const today =
            state.tasks.filter(
                task =>
                    task.due_date === getTodayString() &&
                    !task.completed
            );

        const items = [];

        if (overdue.length) {

            items.push(`
                <div class="notification-item">
                    <strong>
                        ${overdue.length} просроченных ${
                            pluralize(
                                overdue.length,
                                "задача",
                                "задачи",
                                "задач"
                            )
                        }
                    </strong>

                    <span>
                        Возможно, стоит перенести их.
                    </span>
                </div>
            `);
        }

        if (today.length) {

            items.push(`
                <div class="notification-item">
                    <strong>
                        Сегодня осталось ${today.length}
                    </strong>

                    <span>
                        Продолжай в том же духе.
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
                        На данный момент ничего срочного нет.
                    </span>
                </div>
            `);
        }

        container.innerHTML =
            items.join("");

        $("notificationDot")
            .classList.toggle(
                "hidden",
                overdue.length === 0
            );
    }


    function toggleNotifications() {

        const popover =
            $("notificationPopover");

        const willOpen =
            popover.classList.contains("hidden");

        if (willOpen) {
            renderNotifications();
        }

        popover.classList.toggle(
            "hidden"
        );
    }


    /* =====================================================
       EVENT DELEGATION
    ====================================================== */

    document.addEventListener("click", async event => {

        const actionButton =
            event.target.closest(
                "[data-action]"
            );

        if (actionButton) {

            const action =
                actionButton.dataset.action;

            const taskId =
                actionButton.dataset.taskId;

            if (action === "complete") {
                await toggleTask(taskId);
            }

            if (action === "favorite") {
                await toggleFavorite(taskId);
            }

            if (action === "edit") {

                const task =
                    state.tasks.find(
                        item => item.id === taskId
                    );

                if (task) {
                    openTaskModal(task);
                }
            }

            if (action === "delete") {
                await deleteTask(taskId);
            }

            return;
        }


        const emptyAction =
            event.target.closest(
                "[data-empty-action]"
            );

        if (emptyAction) {

            if (
                emptyAction.dataset.emptyAction === "add"
            ) {
                openTaskModal();
            }

            return;
        }


        const calendarDay =
            event.target.closest(
                "[data-calendar-date]"
            );

        if (calendarDay) {

            selectCalendarDate(
                calendarDay.dataset.calendarDate
            );

            return;
        }


        const searchTask =
            event.target.closest(
                "[data-search-task]"
            );

        if (searchTask) {

            const task =
                state.tasks.find(
                    item =>
                        item.id === searchTask.dataset.searchTask
                );

            closeSearch();

            if (task) {

                state.selectedDate =
                    task.due_date || getTodayString();

                setView("today");

                setTimeout(() => {

                    const row =
                        document.querySelector(
                            `[data-task-id="${task.id}"]`
                        );

                    row?.scrollIntoView({
                        behavior: "smooth",
                        block: "center"
                    });

                }, 100);
            }
        }
    });


    /* =====================================================
       AUTH EVENTS
    ====================================================== */

    authModeSwitch.addEventListener(
        "click",
        () => {

            state.authMode =
                state.authMode === "login"
                    ? "register"
                    : "login";

            updateAuthMode();
        }
    );


    $("togglePassword").addEventListener(
        "click",
        () => {

            const input =
                $("authPassword");

            input.type =
                input.type === "password"
                    ? "text"
                    : "password";
        }
    );


    authForm.addEventListener(
        "submit",
        async event => {

            event.preventDefault();

            authMessage.textContent = "";

            const email =
                $("authEmail").value.trim();

            const password =
                $("authPassword").value;

            const displayName =
                $("displayName").value.trim();


            authSubmitButton.disabled = true;

            authSubmitButton.textContent =
                "Подождите...";


            try {

                if (state.authMode === "login") {

                    const {
                        error
                    } =
                        await supabaseClient.auth.signInWithPassword({
                            email,
                            password
                        });

                    if (error) throw error;

                } else {

                    const {
                        data,
                        error
                    } =
                        await supabaseClient.auth.signUp({
                            email,
                            password,
                            options: {
                                data: {
                                    display_name:
                                        displayName || "Daily User"
                                }
                            }
                        });

                    if (error) throw error;

                    if (data.user) {

                        state.user = data.user;

                        await createProfileIfNeeded(
                            displayName
                        );

                        if (!data.session) {

                            authMessage.textContent =
                                "Аккаунт создан. Проверь email для подтверждения.";
                        }
                    }
                }

            } catch (error) {

                console.error(error);

                authMessage.textContent =
                    friendlyAuthError(error);

            } finally {

                authSubmitButton.disabled = false;

                authSubmitButton.textContent =
                    state.authMode === "login"
                        ? "Войти"
                        : "Создать аккаунт";
            }
        }
    );


    /* =====================================================
       TASK EVENTS
    ====================================================== */

    taskForm.addEventListener(
        "submit",
        submitTask
    );

    $("cancelTaskButton").addEventListener(
        "click",
        closeTaskModal
    );

    $("closeTaskModal").addEventListener(
        "click",
        closeTaskModal
    );


    $("newTaskButton").addEventListener(
        "click",
        () => openTaskModal()
    );

    $("topNewTaskButton").addEventListener(
        "click",
        () => openTaskModal()
    );

    $("addTaskButton").addEventListener(
        "click",
        () => openTaskModal()
    );

    $("allTasksNewButton").addEventListener(
        "click",
        () => openTaskModal()
    );

    $("focusTaskButton").addEventListener(
        "click",
        () => {

            const tasks =
                sortTasks(
                    getTasksForDate(
                        state.selectedDate
                    )
                ).filter(
                    task => !task.completed
                );

            if (!tasks.length) {

                openTaskModal();

                return;
            }

            const task = tasks[0];

            const row =
                document.querySelector(
                    `[data-task-id="${task.id}"]`
                );

            row?.scrollIntoView({
                behavior: "smooth",
                block: "center"
            });
        }
    );


    /* =====================================================
       CALENDAR EVENTS
    ====================================================== */

    $("prevMonthButton").addEventListener(
        "click",
        () => changeMonth(-1)
    );

    $("nextMonthButton").addEventListener(
        "click",
        () => changeMonth(1)
    );

    $("calendarTodayButton").addEventListener(
        "click",
        goCalendarToday
    );

    $("calendarAddTaskButton").addEventListener(
        "click",
        () => openTaskModal(
            null,
            state.selectedDate
        )
    );


    /* =====================================================
       LIST EVENTS
    ====================================================== */

    $("addListButton").addEventListener(
        "click",
        () => {

            listModal.classList.remove("hidden");

            $("listName").focus();
        }
    );

    $("closeListModal").addEventListener(
        "click",
        () => listModal.classList.add("hidden")
    );

    $("cancelListButton").addEventListener(
        "click",
        () => listModal.classList.add("hidden")
    );


    listForm.addEventListener(
        "submit",
        async event => {

            event.preventDefault();

            const name =
                $("listName").value.trim();

            if (!name || !state.user) return;

            const {
                data,
                error
            } = await supabaseClient
                .from("lists")
                .insert({
                    user_id: state.user.id,
                    name
                })
                .select()
                .single();

            if (error) {

                console.error(error);

                showToast(
                    "Не удалось создать список.",
                    "error"
                );

                return;
            }

            state.lists.push(data);

            renderLists();
            renderTaskListSelect();

            $("listName").value = "";

            listModal.classList.add("hidden");

            showToast("Список создан");
        }
    );


    /* =====================================================
       NOTE EVENTS
    ====================================================== */

    $("noteInput").addEventListener(
        "input",
        scheduleNoteSave
    );

    $("saveNoteButton").addEventListener(
        "click",
        () => saveNote(true)
    );


    /* =====================================================
       FILTERS
    ====================================================== */

    document
        .querySelectorAll("[data-task-filter]")
        .forEach(button => {

            button.addEventListener(
                "click",
                () => {

                    document
                        .querySelectorAll(
                            "[data-task-filter]"
                        )
                        .forEach(item => {
                            item.classList.remove("active");
                        });

                    button.classList.add("active");

                    state.activeTaskFilter =
                        button.dataset.taskFilter;

                    renderAllTasks();
                }
            );
        });


    /* =====================================================
       NAVIGATION
    ====================================================== */

    document
        .querySelectorAll(".nav-item[data-view]")
        .forEach(button => {

            button.addEventListener(
                "click",
                () => {

                    const view =
                        button.dataset.view;

                    if (view === "settings") {

                        openSettings();

                        return;
                    }

                    setView(view);
                }
            );
        });


    /* =====================================================
       SEARCH
    ====================================================== */

    $("searchButton").addEventListener(
        "click",
        openSearch
    );

    searchInput.addEventListener(
        "input",
        () => renderSearchResults(
            searchInput.value
        )
    );


    $("closeSearchModal")?.addEventListener(
        "click",
        closeSearch
    );


    /* =====================================================
       NOTIFICATIONS
    ====================================================== */

    $("notificationButton").addEventListener(
        "click",
        toggleNotifications
    );

    $("closeNotifications").addEventListener(
        "click",
        () => {
            $("notificationPopover")
                .classList.add("hidden");
        }
    );


    /* =====================================================
       SETTINGS
    ====================================================== */

    $("closeSettingsModal").addEventListener(
        "click",
        () => settingsModal.classList.add("hidden")
    );

    $("themeToggle").addEventListener(
        "click",
        toggleTheme
    );

    $("autosaveToggle").addEventListener(
        "click",
        () => {

            state.autosaveNotes =
                !state.autosaveNotes;

            updateAutosaveButton();

            localStorage.setItem(
                "daily_autosave_notes",
                state.autosaveNotes
                    ? "1"
                    : "0"
            );
        }
    );


    /* =====================================================
       MOBILE
    ====================================================== */

    $("mobileMenuButton").addEventListener(
        "click",
        openMobileSidebar
    );

    $("mobileCloseSidebar").addEventListener(
        "click",
        closeMobileSidebar
    );

    sidebarOverlay.addEventListener(
        "click",
        closeMobileSidebar
    );


    /* =====================================================
       GLOBAL KEYBOARD
    ====================================================== */

    document.addEventListener(
        "keydown",
        event => {

            if (
                event.key === "Escape"
            ) {

                taskModal.classList.add("hidden");
                listModal.classList.add("hidden");
                settingsModal.classList.add("hidden");
                closeSearch();

                $("notificationPopover")
                    .classList.add("hidden");

                return;
            }


            const tag =
                document.activeElement?.tagName;

            if (
                tag === "INPUT" ||
                tag === "TEXTAREA" ||
                tag === "SELECT"
            ) {
                return;
            }


            if (
                event.key.toLowerCase() === "n"
            ) {

                event.preventDefault();

                openTaskModal();
            }


            if (
                event.key === "/"
            ) {

                event.preventDefault();

                openSearch();
            }
        }
    );


    /* =====================================================
       CLOSE MODALS ON BACKDROP
    ====================================================== */

    [
        taskModal,
        listModal,
        searchModal,
        settingsModal
    ].forEach(backdrop => {

        backdrop.addEventListener(
            "click",
            event => {

                if (
                    event.target !== backdrop
                ) {
                    return;
                }

                backdrop.classList.add("hidden");
            }
        );
    });


    /* =====================================================
       AUTH STATE
    ====================================================== */

    supabaseClient.auth.onAuthStateChange(
        async (event, session) => {

            if (session?.user) {

                state.user = session.user;

                await initializeApplication();

            } else {

                state.user = null;

                showAuth();
            }
        }
    );


    /* =====================================================
       APPLICATION INITIALIZATION
    ====================================================== */

    async function initializeApplication() {

        if (state.initialized) {

            showApp();

            return;
        }

        state.initialized = true;

        showApp();

        await createProfileIfNeeded();

        await loadProfile();

        await loadLists();

        await loadTasks();

        loadTheme();

        const autosave =
            localStorage.getItem(
                "daily_autosave_notes"
            );

        if (autosave !== null) {

            state.autosaveNotes =
                autosave === "1";
        }

        updateAutosaveButton();

        state.selectedDate =
            getTodayString();

        state.calendarDate =
            new Date();

        updateNavigation();

        updateBreadcrumb();

        refreshVisibleData();

        renderNotifications();
    }


    /* =====================================================
       LOGOUT
    ====================================================== */

    $("logoutButton").addEventListener(
        "click",
        async () => {

            await supabaseClient.auth.signOut();

            state.user = null;
            state.profile = null;
            state.tasks = [];
            state.lists = [];
            state.initialized = false;

            showAuth();
        }
    );


    /* =====================================================
       INITIAL SESSION CHECK
    ====================================================== */

    async function boot() {

        loadTheme();

        updateAuthMode();

        const {
            data
        } = await supabaseClient.auth.getSession();

        if (data?.session?.user) {

            state.user =
                data.session.user;

            await initializeApplication();

        } else {

            showAuth();
        }
    }


    boot();

})();
