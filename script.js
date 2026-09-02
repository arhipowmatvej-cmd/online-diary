/* =========================================================
   DAILY — SUPABASE APPLICATION
========================================================= */

(() => {
    "use strict";

    /* =====================================================
       SUPABASE
    ===================================================== */

    if (!window.supabase) {
        console.error("Supabase JS не загружен.");
        return;
    }

    if (!window.DAILY_CONFIG) {
        console.error("supabase-config.js не найден.");
        return;
    }

    const { createClient } = window.supabase;

    const supabase = createClient(
        window.DAILY_CONFIG.supabaseUrl,
        window.DAILY_CONFIG.supabaseKey,
        {
            auth: {
                persistSession: true,
                autoRefreshToken: true,
                detectSessionInUrl: true
            }
        }
    );


    /* =====================================================
       STATE
    ===================================================== */

    const state = {
        user: null,
        profile: null,

        lists: [],
        tasks: [],
        allTasks: [],

        selectedDate: new Date(),
        calendarMonth: new Date(),

        activeView: "today",

        editingTaskId: null,

        selectedListId: null,

        selectedColor: "#6C63FF",

        authMode: "login",

        noteSaveTimer: null,

        updatingTasks: new Set()
    };


    /* =====================================================
       DOM
    ===================================================== */

    const $ = (selector) => document.querySelector(selector);

    const loadingScreen = $("#loadingScreen");
    const authScreen = $("#authScreen");
    const appShell = $("#appShell");

    const authForm = $("#authForm");
    const authTitle = $("#authTitle");
    const authSubtitle = $("#authSubtitle");
    const authSubmit = $("#authSubmit");
    const authSwitchText = $("#authSwitchText");
    const authSwitchButton = $("#authSwitchButton");
    const displayNameGroup = $("#displayNameGroup");
    const displayNameInput = $("#displayName");
    const authEmail = $("#authEmail");
    const authPassword = $("#authPassword");
    const passwordToggle = $("#passwordToggle");
    const authMessage = $("#authMessage");

    const profileName = $("#profileName");
    const profileEmail = $("#profileEmail");
    const profileAvatar = $("#profileAvatar");

    const welcomeName = $("#welcomeName");
    const dateLabel = $("#dateLabel");

    const taskList = $("#taskList");
    const taskCountBadge = $("#taskCountBadge");

    const progressPercent = $("#progressPercent");
    const progressValue = $("#progressValue");
    const progressText = $("#progressText");

    const listsContainer = $("#listsContainer");
    const taskCategory = $("#taskCategory");

    const calendarTitle = $("#calendarTitle");
    const calendarDays = $("#calendarDays");

    const noteInput = $("#noteInput");
    const noteStatus = $("#noteStatus");

    const weekCompletedCount = $("#weekCompletedCount");
    const miniChart = $("#miniChart");

    const favoritesPanel = $("#favoritesPanel");
    const favoritesList = $("#favoritesList");

    const allTasksPanel = $("#allTasksPanel");
    const allTasksList = $("#allTasksList");

    const taskModal = $("#taskModal");
    const taskForm = $("#taskForm");
    const taskModalTitle = $("#taskModalTitle");
    const taskModalSubtitle = $("#taskModalSubtitle");
    const editingTaskId = $("#editingTaskId");
    const taskName = $("#taskName");
    const taskTime = $("#taskTime");

    const listModal = $("#listModal");
    const listForm = $("#listForm");
    const listName = $("#listName");

    const searchModal = $("#searchModal");
    const searchInput = $("#searchInput");
    const searchResults = $("#searchResults");

    const settingsModal = $("#settingsModal");
    const settingsEmail = $("#settingsEmail");
    const settingsName = $("#settingsName");
    const settingsAvatar = $("#settingsAvatar");

    const notificationPopover = $("#notificationPopover");

    const sidebar = $(".sidebar");
    const sidebarOverlay = $("#sidebarOverlay");


    /* =====================================================
       HELPERS
    ===================================================== */

    function pad(value) {
        return String(value).padStart(2, "0");
    }


    function dateToISO(date) {
        return [
            date.getFullYear(),
            pad(date.getMonth() + 1),
            pad(date.getDate())
        ].join("-");
    }


    function isoToDate(value) {
        if (!value) {
            return new Date();
        }

        const [year, month, day] =
            value.split("-").map(Number);

        return new Date(
            year,
            month - 1,
            day
        );
    }


    function formatRussianDate(date) {
        return new Intl.DateTimeFormat(
            "ru-RU",
            {
                weekday: "long",
                day: "numeric",
                month: "long"
            }
        ).format(date);
    }


    function formatDateShort(dateString) {
        const date = isoToDate(dateString);

        return new Intl.DateTimeFormat(
            "ru-RU",
            {
                day: "numeric",
                month: "short"
            }
        ).format(date);
    }


    function getInitials(name) {
        if (!name) {
            return "D";
        }

        const clean = name.trim();

        if (!clean) {
            return "D";
        }

        const parts = clean.split(/\s+/);

        if (parts.length >= 2) {
            return (
                parts[0][0] +
                parts[1][0]
            ).toUpperCase();
        }

        return clean
            .substring(0, 2)
            .toUpperCase();
    }


    function getGreeting() {
        const hour = new Date().getHours();

        if (hour < 5) {
            return "Доброй ночи";
        }

        if (hour < 12) {
            return "Доброе утро";
        }

        if (hour < 18) {
            return "Добрый день";
        }

        return "Добрый вечер";
    }


    function startOfWeek(date) {
        const result = new Date(date);

        const day = result.getDay();

        const diff =
            day === 0
                ? -6
                : 1 - day;

        result.setDate(
            result.getDate() + diff
        );

        result.setHours(
            0,
            0,
            0,
            0
        );

        return result;
    }


    function endOfWeek(date) {
        const result =
            startOfWeek(date);

        result.setDate(
            result.getDate() + 6
        );

        return result;
    }


    function escapeHTML(value) {
        return String(value ?? "")
            .replaceAll("&", "&amp;")
            .replaceAll("<", "&lt;")
            .replaceAll(">", "&gt;")
            .replaceAll('"', "&quot;")
            .replaceAll("'", "&#039;");
    }


    function showToast(
        message,
        type = "success"
    ) {
        const container =
            $("#toastContainer");

        if (!container) {
            return;
        }

        const toast =
            document.createElement("div");

        toast.className =
            `toast ${type}`;

        toast.textContent =
            message;

        container.appendChild(toast);

        setTimeout(() => {
            toast.remove();
        }, 3600);
    }


    function showAuthMessage(
        message,
        type = "error"
    ) {
        authMessage.textContent =
            message;

        authMessage.className =
            `auth-message ${type}`;
    }


    function clearAuthMessage() {
        authMessage.textContent = "";

        authMessage.className =
            "auth-message";
    }


    function setLoading(
        button,
        loading
    ) {
        if (!button) {
            return;
        }

        if (loading) {

            button.disabled = true;

            button.dataset.originalText =
                button.textContent;

            button.textContent =
                "Загрузка...";

        } else {

            button.disabled = false;

            button.textContent =
                button.dataset.originalText ||
                "Войти";
        }
    }


    function openModal(element) {
        if (!element) {
            return;
        }

        element.classList.remove(
            "hidden"
        );
    }


    function closeModal(element) {
        if (!element) {
            return;
        }

        element.classList.add(
            "hidden"
        );
    }


    function closeAllModals() {

        [
            taskModal,
            listModal,
            searchModal,
            settingsModal
        ].forEach(closeModal);

        if (notificationPopover) {
            notificationPopover.classList.add(
                "hidden"
            );
        }
    }


    function closeMobileSidebar() {

        if (sidebar) {
            sidebar.classList.remove(
                "mobile-open"
            );
        }

        if (sidebarOverlay) {
            sidebarOverlay.classList.remove(
                "active"
            );
        }
    }


    /* =====================================================
       AUTH UI
    ===================================================== */

    function setAuthMode(mode) {

        state.authMode = mode;

        clearAuthMessage();

        if (mode === "register") {

            authTitle.textContent =
                "Создай аккаунт";

            authSubtitle.textContent =
                "Сохрани свой день и задачи в Daily.";

            authSubmit.textContent =
                "Создать аккаунт";

            authSwitchText.textContent =
                "Уже есть аккаунт?";

            authSwitchButton.textContent =
                "Войти";

            displayNameGroup.classList.remove(
                "hidden"
            );

            displayNameInput.required =
                true;

        } else {

            authTitle.textContent =
                "С возвращением";

            authSubtitle.textContent =
                "Войди в свой аккаунт, чтобы продолжить.";

            authSubmit.textContent =
                "Войти";

            authSwitchText.textContent =
                "Нет аккаунта?";

            authSwitchButton.textContent =
                "Создать аккаунт";

            displayNameGroup.classList.add(
                "hidden"
            );

            displayNameInput.required =
                false;
        }
    }


    async function handleAuthSubmit(event) {

        event.preventDefault();

        clearAuthMessage();

        const email =
            authEmail.value.trim();

        const password =
            authPassword.value;

        const displayName =
            displayNameInput.value.trim();

        if (!email || !password) {

            showAuthMessage(
                "Заполни email и пароль."
            );

            return;
        }

        if (password.length < 6) {

            showAuthMessage(
                "Пароль должен содержать минимум 6 символов."
            );

            return;
        }

        setLoading(
            authSubmit,
            true
        );

        try {

            if (
                state.authMode ===
                "login"
            ) {

                const { error } =
                    await supabase.auth.signInWithPassword({
                        email,
                        password
                    });

                if (error) {
                    throw error;
                }

                showAuthMessage(
                    "Вход выполнен.",
                    "success"
                );

            } else {

                const {
                    data,
                    error
                } =
                    await supabase.auth.signUp({
                        email,
                        password,
                        options: {
                            data: {
                                display_name:
                                    displayName ||
                                    "Мой профиль"
                            }
                        }
                    });

                if (error) {
                    throw error;
                }

                if (
                    data.user &&
                    !data.session
                ) {

                    showAuthMessage(
                        "Аккаунт создан. Проверь почту и подтверди email.",
                        "success"
                    );

                } else {

                    showAuthMessage(
                        "Аккаунт создан.",
                        "success"
                    );
                }
            }

        } catch (error) {

            console.error(error);

            showAuthMessage(
                getFriendlyAuthError(error)
            );

        } finally {

            setLoading(
                authSubmit,
                false
            );
        }
    }


    function getFriendlyAuthError(error) {

        const message =
            String(
                error?.message || ""
            ).toLowerCase();

        if (
            message.includes(
                "invalid login credentials"
            )
        ) {
            return "Неверный email или пароль.";
        }

        if (
            message.includes(
                "email not confirmed"
            )
        ) {
            return "Сначала подтверди email через письмо.";
        }

        if (
            message.includes(
                "user already registered"
            )
        ) {
            return "Этот email уже зарегистрирован.";
        }

        if (
            message.includes(
                "password"
            )
        ) {
            return "Проверь пароль. Минимум 6 символов.";
        }

        if (
            message.includes(
                "rate limit"
            )
        ) {
            return "Слишком много попыток. Попробуй немного позже.";
        }

        return (
            error?.message ||
            "Не удалось выполнить операцию."
        );
    }


    /* =====================================================
       AUTH STATE
    ===================================================== */

    async function handleSession(
        session
    ) {

        if (!session?.user) {

            state.user = null;
            state.profile = null;
            state.tasks = [];
            state.allTasks = [];
            state.lists = [];

            appShell.classList.add(
                "hidden"
            );

            authScreen.classList.remove(
                "hidden"
            );

            loadingScreen.classList.add(
                "hidden"
            );

            return;
        }

        state.user =
            session.user;

        authScreen.classList.add(
            "hidden"
        );

        await loadUserData();

        appShell.classList.remove(
            "hidden"
        );

        loadingScreen.classList.add(
            "hidden"
        );

        renderUser();

        await refreshApplication();
    }


    /* =====================================================
       USER DATA
    ===================================================== */

    async function loadProfile() {

        const {
            data,
            error
        } =
            await supabase
                .from("profiles")
                .select("*")
                .eq(
                    "id",
                    state.user.id
                )
                .maybeSingle();

        if (error) {

            console.error(
                "Ошибка профиля:",
                error
            );

            return null;
        }

        return data;
    }


    async function ensureProfile() {

        let profile =
            await loadProfile();

        if (!profile) {

            const fallbackName =
                state.user.user_metadata?.display_name ||
                state.user.email?.split("@")[0] ||
                "Мой профиль";

            const {
                data,
                error
            } =
                await supabase
                    .from("profiles")
                    .upsert(
                        {
                            id: state.user.id,
                            display_name:
                                fallbackName
                        },
                        {
                            onConflict: "id"
                        }
                    )
                    .select()
                    .single();

            if (error) {

                console.error(
                    "Ошибка создания профиля:",
                    error
                );

            } else {

                profile = data;
            }
        }

        return profile;
    }


    async function loadUserData() {

        state.profile =
            await ensureProfile();

        const {
            data: lists,
            error: listsError
        } =
            await supabase
                .from("lists")
                .select("*")
                .eq(
                    "user_id",
                    state.user.id
                )
                .order(
                    "created_at",
                    {
                        ascending: true
                    }
                );

        if (listsError) {

            console.error(
                "Ошибка списков:",
                listsError
            );

            showToast(
                "Не удалось загрузить списки.",
                "error"
            );

        } else {

            state.lists =
                lists || [];
        }

        if (!state.lists.length) {
            await createDefaultLists();
        }
    }


    async function createDefaultLists() {

        const defaults = [
            {
                name: "Личное",
                slug: "personal",
                color: "#6C63FF"
            },
            {
                name: "Работа",
                slug: "work",
                color: "#4F9CF9"
            },
            {
                name: "Учёба",
                slug: "study",
                color: "#36B37E"
            }
        ];

        const rows =
            defaults.map(item => ({
                user_id:
                    state.user.id,
                ...item
            }));

        const {
            data,
            error
        } =
            await supabase
                .from("lists")
                .insert(rows)
                .select();

        if (error) {

            console.error(
                "Ошибка создания списков:",
                error
            );

            return;
        }

        state.lists =
            data || [];
    }


    function renderUser() {

        const name =
            state.profile?.display_name ||
            state.user.email?.split("@")[0] ||
            "Мой профиль";

        const email =
            state.user.email ||
            "Аккаунт";

        const initials =
            getInitials(name);

        if (profileName) {
            profileName.textContent =
                name;
        }

        if (profileEmail) {
            profileEmail.textContent =
                email;
        }

        if (profileAvatar) {
            profileAvatar.textContent =
                initials;
        }

        if (welcomeName) {
            welcomeName.textContent =
                name;
        }

        if (settingsName) {
            settingsName.textContent =
                name;
        }

        if (settingsEmail) {
            settingsEmail.textContent =
                email;
        }

        if (settingsAvatar) {
            settingsAvatar.textContent =
                initials;
        }

        document.title =
            `Daily — ${name}`;
    }


    /* =====================================================
       APPLICATION REFRESH
    ===================================================== */

    async function refreshApplication() {

        renderLists();

        renderTaskCategory();

        await loadTasksForSelectedDate();

        await loadNote();

        await renderCalendar();

        await loadWeekStats();

        updateDateHeader();

        updateView();
    }


    /* =====================================================
       TASKS
    ===================================================== */

    async function loadTasksForSelectedDate() {

        if (!state.user) {
            return;
        }

        const date =
            dateToISO(
                state.selectedDate
            );

        const {
            data,
            error
        } =
            await supabase
                .from("tasks")
                .select("*")
                .eq(
                    "user_id",
                    state.user.id
                )
                .eq(
                    "task_date",
                    date
                )
                .order(
                    "task_time",
                    {
                        ascending: true,
                        nullsFirst: false
                    }
                )
                .order(
                    "created_at",
                    {
                        ascending: true
                    }
                );

        if (error) {

            console.error(
                "Ошибка загрузки задач:",
                error
            );

            showToast(
                "Не удалось загрузить задачи.",
                "error"
            );

            return;
        }

        state.tasks =
            data || [];

        renderTasks();

        updateProgress();

        await renderCalendar();
    }


    async function loadAllTasks() {

        if (!state.user) {
            return [];
        }

        const {
            data,
            error
        } =
            await supabase
                .from("tasks")
                .select("*")
                .eq(
                    "user_id",
                    state.user.id
                )
                .order(
                    "task_date",
                    {
                        ascending: false
                    }
                )
                .order(
                    "task_time",
                    {
                        ascending: true,
                        nullsFirst: false
                    }
                );

        if (error) {

            console.error(
                "Ошибка загрузки всех задач:",
                error
            );

            return [];
        }

        state.allTasks =
            data || [];

        return state.allTasks;
    }


    function renderTasks() {

        if (!taskList) {
            return;
        }

        taskList.innerHTML = "";

        if (taskCountBadge) {
            taskCountBadge.textContent =
                state.tasks.length;
        }

        if (!state.tasks.length) {

            taskList.innerHTML = `
                <div class="empty-state">
                    <div class="empty-icon">✓</div>
                    <strong>Пока нет задач</strong>
                    <span>Добавьте первую задачу на этот день</span>
                </div>
            `;

            return;
        }

        state.tasks.forEach(task => {

            taskList.appendChild(
                createTaskElement(task)
            );
        });
    }


    function createTaskElement(task) {

        const element =
            document.createElement("div");

        element.className =
            `task ${
                task.completed
                    ? "completed"
                    : ""
            }`;

        element.dataset.taskId =
            task.id;

        const list =
            state.lists.find(
                item =>
                    item.id ===
                    task.list_id
            );

        const time =
            task.task_time
                ? task.task_time.slice(0, 5)
                : "";

        element.innerHTML = `
            <input
                type="checkbox"
                class="task-checkbox"
                data-task-id="${escapeHTML(task.id)}"
                ${task.completed ? "checked" : ""}
                aria-label="Отметить задачу выполненной"
            >

            <span
                class="custom-checkbox"
                data-checkbox-for="${escapeHTML(task.id)}"
                role="checkbox"
                aria-checked="${task.completed ? "true" : "false"}"
            >
                ${task.completed ? "✓" : ""}
            </span>

            <span
                class="task-text"
                title="${escapeHTML(task.title)}"
            >
                ${escapeHTML(task.title)}
            </span>

            ${
                time
                    ? `<span class="task-time">${escapeHTML(time)}</span>`
                    : ""
            }

            <div class="task-actions">

                <button
                    type="button"
                    class="task-action task-favorite ${
                        task.favorite
                            ? "active"
                            : ""
                    }"
                    data-action="favorite"
                    title="Избранное"
                >
                    ${
                        task.favorite
                            ? "★"
                            : "☆"
                    }
                </button>

                <button
                    type="button"
                    class="task-action"
                    data-action="edit"
                    title="Редактировать"
                >
                    ✎
                </button>

                <button
                    type="button"
                    class="task-action delete"
                    data-action="delete"
                    title="Удалить"
                >
                    ×
                </button>

            </div>
        `;


        const checkbox =
            element.querySelector(
                ".task-checkbox"
            );


        checkbox.addEventListener(
            "change",
            async (event) => {

                event.stopPropagation();

                if (
                    state.updatingTasks.has(
                        task.id
                    )
                ) {
                    return;
                }

                await toggleTask(
                    task.id,
                    checkbox.checked
                );
            }
        );


        const customCheckbox =
            element.querySelector(
                ".custom-checkbox"
            );


        customCheckbox.addEventListener(
            "click",
            async event => {

                event.preventDefault();
                event.stopPropagation();

                if (
                    state.updatingTasks.has(
                        task.id
                    )
                ) {
                    return;
                }

                const newValue =
                    !task.completed;

                await toggleTask(
                    task.id,
                    newValue
                );
            }
        );


        element.addEventListener(
            "click",
            event => {

                const action =
                    event.target.closest(
                        "[data-action]"
                    );

                if (!action) {
                    return;
                }

                event.preventDefault();
                event.stopPropagation();

                const actionType =
                    action.dataset.action;

                if (
                    actionType ===
                    "favorite"
                ) {
                    toggleFavorite(task);
                }

                if (
                    actionType ===
                    "edit"
                ) {
                    openEditTask(task);
                }

                if (
                    actionType ===
                    "delete"
                ) {
                    deleteTask(task.id);
                }
            }
        );


        return element;
    }


    /* =====================================================
       TOGGLE TASK — FIXED
    ===================================================== */

    async function toggleTask(
        id,
        completed
    ) {

        if (!state.user) {
            return;
        }

        if (
            state.updatingTasks.has(id)
        ) {
            return;
        }

        const task =
            state.tasks.find(
                item =>
                    item.id === id
            );

        const previousValue =
            task
                ? Boolean(task.completed)
                : !completed;


        state.updatingTasks.add(id);


        /*
           Сразу обновляем интерфейс,
           чтобы пользователь видел реакцию.
        */

        if (task) {
            task.completed =
                completed;
        }

        renderTasks();
        updateProgress();


        try {

            const {
                data,
                error
            } =
                await supabase
                    .from("tasks")
                    .update({
                        completed:
                            Boolean(completed)
                    })
                    .eq(
                        "id",
                        id
                    )
                    .eq(
                        "user_id",
                        state.user.id
                    )
                    .select("id,completed");


            if (error) {
                throw error;
            }


            /*
               Очень важно:
               .select() позволяет убедиться,
               что строка реально обновилась.
            */

            if (
                !data ||
                data.length === 0
            ) {

                throw new Error(
                    "Supabase не обновил задачу. Проверь RLS policy для UPDATE таблицы tasks."
                );
            }


            const updatedTask =
                data[0];


            if (task) {

                task.completed =
                    Boolean(
                        updatedTask.completed
                    );
            }


            renderTasks();

            updateProgress();

            await loadWeekStats();

            await renderCalendar();


            if (
                state.activeView ===
                "favorites"
            ) {
                await renderFavorites();
            }


        } catch (error) {

            console.error(
                "Ошибка изменения completed:",
                error
            );


            /*
               Возвращаем старое состояние,
               если база отклонила изменение.
            */

            if (task) {
                task.completed =
                    previousValue;
            }

            renderTasks();

            updateProgress();


            let message =
                "Не удалось обновить задачу.";

            const errorText =
                String(
                    error?.message || ""
                );


            if (
                errorText.includes(
                    "RLS"
                ) ||
                errorText.includes(
                    "row-level security"
                ) ||
                errorText.includes(
                    "не обновил задачу"
                )
            ) {
                message =
                    "База данных не разрешила изменить задачу. Нужно проверить RLS для tasks.";
            }


            showToast(
                message,
                "error"
            );

        } finally {

            state.updatingTasks.delete(id);
        }
    }


    /* =====================================================
       FAVORITE
    ===================================================== */

    async function toggleFavorite(task) {

        if (!state.user) {
            return;
        }

        const nextValue =
            !Boolean(task.favorite);

        const {
            data,
            error
        } =
            await supabase
                .from("tasks")
                .update({
                    favorite:
                        nextValue
                })
                .eq(
                    "id",
                    task.id
                )
                .eq(
                    "user_id",
                    state.user.id
                )
                .select("id,favorite");


        if (
            error ||
            !data ||
            !data.length
        ) {

            console.error(
                "Ошибка избранного:",
                error
            );

            showToast(
                "Не удалось изменить избранное.",
                "error"
            );

            return;
        }


        task.favorite =
            Boolean(
                data[0].favorite
            );


        renderTasks();


        if (
            state.activeView ===
            "favorites"
        ) {
            await renderFavorites();
        }
    }


    /* =====================================================
       DELETE TASK
    ===================================================== */

    async function deleteTask(id) {

        const task =
            state.tasks.find(
                item =>
                    item.id === id
            );

        if (!task) {
            return;
        }

        const confirmed =
            window.confirm(
                `Удалить задачу «${task.title}»?`
            );

        if (!confirmed) {
            return;
        }


        const {
            data,
            error
        } =
            await supabase
                .from("tasks")
                .delete()
                .eq(
                    "id",
                    id
                )
                .eq(
                    "user_id",
                    state.user.id
                )
                .select("id");


        if (error) {

            console.error(
                "Ошибка удаления:",
                error
            );

            showToast(
                "Не удалось удалить задачу.",
                "error"
            );

            return;
        }


        if (
            !data ||
            !data.length
        ) {

            showToast(
                "Задача не была удалена. Проверь права доступа.",
                "error"
            );

            return;
        }


        state.tasks =
            state.tasks.filter(
                item =>
                    item.id !== id
            );


        renderTasks();

        updateProgress();

        await loadWeekStats();

        await renderCalendar();


        showToast(
            "Задача удалена."
        );
    }


    /* =====================================================
       TASK MODAL
    ===================================================== */

    function renderTaskCategory() {

        taskCategory.innerHTML = "";

        state.lists.forEach(list => {

            const option =
                document.createElement(
                    "option"
                );

            option.value =
                list.id;

            option.textContent =
                list.name;

            taskCategory.appendChild(
                option
            );
        });


        if (
            state.selectedListId &&
            state.lists.some(
                item =>
                    item.id ===
                    state.selectedListId
            )
        ) {

            taskCategory.value =
                state.selectedListId;
        }
    }


    function openNewTask() {

        state.editingTaskId =
            null;

        editingTaskId.value =
            "";

        taskModalTitle.textContent =
            "Новая задача";

        taskModalSubtitle.textContent =
            "Добавьте задачу в свой план.";

        taskName.value =
            "";

        taskTime.value =
            "12:00";

        renderTaskCategory();


        if (state.selectedListId) {

            taskCategory.value =
                state.selectedListId;
        }


        openModal(taskModal);


        setTimeout(() => {

            taskName.focus();

        }, 50);
    }


    function openEditTask(task) {

        state.editingTaskId =
            task.id;

        editingTaskId.value =
            task.id;

        taskModalTitle.textContent =
            "Редактировать задачу";

        taskModalSubtitle.textContent =
            "Измените параметры задачи.";

        taskName.value =
            task.title || "";

        taskTime.value =
            task.task_time
                ? task.task_time.slice(0, 5)
                : "12:00";


        renderTaskCategory();


        if (task.list_id) {

            taskCategory.value =
                task.list_id;
        }


        openModal(taskModal);


        setTimeout(() => {

            taskName.focus();

        }, 50);
    }


    async function handleTaskSubmit(
        event
    ) {

        event.preventDefault();

        const title =
            taskName.value.trim();

        const time =
            taskTime.value || null;

        const listId =
            taskCategory.value || null;


        if (!title) {

            showToast(
                "Введите название задачи.",
                "error"
            );

            return;
        }


        if (state.editingTaskId) {

            const {
                data,
                error
            } =
                await supabase
                    .from("tasks")
                    .update({
                        title,
                        task_time:
                            time,
                        list_id:
                            listId
                    })
                    .eq(
                        "id",
                        state.editingTaskId
                    )
                    .eq(
                        "user_id",
                        state.user.id
                    )
                    .select();


            if (
                error ||
                !data ||
                !data.length
            ) {

                console.error(
                    "Ошибка изменения задачи:",
                    error
                );

                showToast(
                    "Не удалось изменить задачу.",
                    "error"
                );

                return;
            }


            showToast(
                "Задача обновлена."
            );

        } else {

            const {
                data,
                error
            } =
                await supabase
                    .from("tasks")
                    .insert({
                        user_id:
                            state.user.id,
                        title,
                        task_date:
                            dateToISO(
                                state.selectedDate
                            ),
                        task_time:
                            time,
                        list_id:
                            listId,
                        completed:
                            false,
                        favorite:
                            false
                    })
                    .select();


            if (
                error ||
                !data ||
                !data.length
            ) {

                console.error(
                    "Ошибка создания задачи:",
                    error
                );

                showToast(
                    "Не удалось создать задачу.",
                    "error"
                );

                return;
            }


            showToast(
                "Задача добавлена."
            );
        }


        closeModal(taskModal);

        taskForm.reset();

        state.editingTaskId =
            null;

        await loadTasksForSelectedDate();

        await loadWeekStats();
    }


    /* =====================================================
       LISTS
    ===================================================== */

    function renderLists() {

        listsContainer.innerHTML = "";

        state.lists.forEach(list => {

            const item =
                document.createElement(
                    "button"
                );

            item.type =
                "button";

            item.className =
                `list-item ${
                    state.selectedListId ===
                    list.id
                        ? "active"
                        : ""
                }`;

            item.innerHTML = `
                <span
                    class="list-dot"
                    style="background:${escapeHTML(list.color)}"
                ></span>

                <span>
                    ${escapeHTML(list.name)}
                </span>
            `;


            item.addEventListener(
                "click",
                async () => {

                    state.selectedListId =
                        state.selectedListId ===
                        list.id
                            ? null
                            : list.id;

                    state.activeView =
                        "today";

                    renderLists();

                    await loadTasksForSelectedDate();

                    updateView();

                    closeMobileSidebar();
                }
            );


            listsContainer.appendChild(
                item
            );
        });
    }


    function openNewList() {

        listForm.reset();

        state.selectedColor =
            "#6C63FF";


        document
            .querySelectorAll(
                ".color-option"
            )
            .forEach(button => {

                button.classList.toggle(
                    "selected",
                    button.dataset.color ===
                    state.selectedColor
                );
            });


        openModal(listModal);


        setTimeout(() => {

            listName.focus();

        }, 50);
    }


    async function handleListSubmit(
        event
    ) {

        event.preventDefault();

        const name =
            listName.value.trim();

        if (!name) {
            return;
        }


        const {
            data,
            error
        } =
            await supabase
                .from("lists")
                .insert({
                    user_id:
                        state.user.id,
                    name,
                    slug:
                        name
                            .toLowerCase()
                            .replace(
                                /[^a-zа-яё0-9]+/gi,
                                "-"
                            )
                            .replace(
                                /^-|-$/g,
                                ""
                            ),
                    color:
                        state.selectedColor
                })
                .select()
                .single();


        if (error) {

            console.error(error);

            if (
                error.code ===
                "23505"
            ) {

                showToast(
                    "Такой список уже существует.",
                    "error"
                );

            } else {

                showToast(
                    "Не удалось создать список.",
                    "error"
                );
            }

            return;
        }


        state.lists.push(data);

        renderLists();

        renderTaskCategory();

        closeModal(listModal);

        showToast(
            "Список создан."
        );
    }


    /* =====================================================
       NOTES
    ===================================================== */

    async function loadNote() {

        if (!state.user) {
            return;
        }

        const date =
            dateToISO(
                state.selectedDate
            );


        const {
            data,
            error
        } =
            await supabase
                .from("notes")
                .select("*")
                .eq(
                    "user_id",
                    state.user.id
                )
                .eq(
                    "note_date",
                    date
                )
                .maybeSingle();


        if (error) {

            console.error(
                "Ошибка загрузки заметки:",
                error
            );

            noteInput.value = "";

            return;
        }


        noteInput.value =
            data?.content || "";

        noteStatus.textContent =
            data
                ? "Сохранено"
                : "Нет заметки на этот день";
    }


    async function saveNote() {

        if (!state.user) {
            return;
        }

        const content =
            noteInput.value;

        const date =
            dateToISO(
                state.selectedDate
            );


        if (!content.trim()) {

            const {
                error
            } =
                await supabase
                    .from("notes")
                    .delete()
                    .eq(
                        "user_id",
                        state.user.id
                    )
                    .eq(
                        "note_date",
                        date
                    );


            if (error) {
                console.error(error);
            }


            noteStatus.textContent =
                "Заметка очищена";

            return;
        }


        const {
            error
        } =
            await supabase
                .from("notes")
                .upsert(
                    {
                        user_id:
                            state.user.id,
                        note_date:
                            date,
                        content
                    },
                    {
                        onConflict:
                            "user_id,note_date"
                    }
                );


        if (error) {

            console.error(error);

            noteStatus.textContent =
                "Ошибка сохранения";

            showToast(
                "Не удалось сохранить заметку.",
                "error"
            );

            return;
        }


        noteStatus.textContent =
            "Сохранено только что";
    }


    /* =====================================================
       PROGRESS
    ===================================================== */

    function updateProgress() {

        const total =
            state.tasks.length;

        const completed =
            state.tasks.filter(
                task =>
                    Boolean(task.completed)
            ).length;


        const percent =
            total === 0
                ? 0
                : Math.round(
                    completed /
                    total *
                    100
                );


        if (progressPercent) {

            progressPercent.textContent =
                `${percent}%`;
        }


        if (progressValue) {

            progressValue.style.width =
                `${percent}%`;
        }


        if (progressText) {

            progressText.textContent =
                `${completed} из ${total} задач выполнено`;
        }
    }


    /* =====================================================
       CALENDAR
    ===================================================== */

    async function loadMonthTasks() {

        if (!state.user) {
            return [];
        }

        const year =
            state.calendarMonth
                .getFullYear();

        const month =
            state.calendarMonth
                .getMonth();


        const firstDay =
            new Date(
                year,
                month,
                1
            );

        const lastDay =
            new Date(
                year,
                month + 1,
                0
            );


        const from =
            dateToISO(
                firstDay
            );

        const to =
            dateToISO(
                lastDay
            );


        const {
            data,
            error
        } =
            await supabase
                .from("tasks")
                .select(
                    "id,task_date,completed"
                )
                .eq(
                    "user_id",
                    state.user.id
                )
                .gte(
                    "task_date",
                    from
                )
                .lte(
                    "task_date",
                    to
                );


        if (error) {

            console.error(
                "Ошибка календаря:",
                error
            );

            return [];
        }


        return data || [];
    }


    async function renderCalendar() {

        if (!state.user) {
            return;
        }

        if (
            !calendarDays ||
            !calendarTitle
        ) {
            return;
        }


        const monthTasks =
            await loadMonthTasks();


        const taskDates =
            new Set(
                monthTasks.map(
                    task =>
                        task.task_date
                )
            );


        const year =
            state.calendarMonth
                .getFullYear();

        const month =
            state.calendarMonth
                .getMonth();


        calendarTitle.textContent =
            new Intl.DateTimeFormat(
                "ru-RU",
                {
                    month: "long",
                    year: "numeric"
                }
            )
                .format(
                    state.calendarMonth
                )
                .replace(
                    /^./,
                    char =>
                        char.toUpperCase()
                );


        calendarDays.innerHTML =
            "";


        const firstDay =
            new Date(
                year,
                month,
                1
            );


        let weekday =
            firstDay.getDay();


        weekday =
            weekday === 0
                ? 7
                : weekday;


        const daysInMonth =
            new Date(
                year,
                month + 1,
                0
            ).getDate();


        const previousMonthDays =
            new Date(
                year,
                month,
                0
            ).getDate();


        const totalCells =
            Math.ceil(
                (
                    weekday -
                    1 +
                    daysInMonth
                ) / 7
            ) * 7;


        const todayISO =
            dateToISO(
                new Date()
            );

        const selectedISO =
            dateToISO(
                state.selectedDate
            );


        for (
            let index = 0;
            index < totalCells;
            index++
        ) {

            let dayNumber;
            let cellDate;
            let otherMonth = false;


            if (
                index <
                weekday - 1
            ) {

                dayNumber =
                    previousMonthDays -
                    (
                        weekday -
                        2 -
                        index
                    );

                cellDate =
                    new Date(
                        year,
                        month - 1,
                        dayNumber
                    );

                otherMonth = true;

            } else if (
                index >=
                weekday -
                1 +
                daysInMonth
            ) {

                dayNumber =
                    index -
                    (
                        weekday -
                        1 +
                        daysInMonth
                    ) +
                    1;

                cellDate =
                    new Date(
                        year,
                        month + 1,
                        dayNumber
                    );

                otherMonth = true;

            } else {

                dayNumber =
                    index -
                    (
                        weekday -
                        1
                    ) +
                    1;

                cellDate =
                    new Date(
                        year,
                        month,
                        dayNumber
                    );
            }


            const iso =
                dateToISO(
                    cellDate
                );


            const day =
                document.createElement(
                    "button"
                );

            day.type =
                "button";

            day.className =
                "calendar-day";


            if (otherMonth) {
                day.classList.add(
                    "other-month"
                );
            }


            if (iso === todayISO) {
                day.classList.add(
                    "today"
                );
            }


            if (iso === selectedISO) {
                day.classList.add(
                    "selected"
                );
            }


            day.textContent =
                dayNumber;


            if (taskDates.has(iso)) {

                const dot =
                    document.createElement(
                        "span"
                    );

                dot.className =
                    "calendar-task-dot";

                day.appendChild(dot);
            }


            day.addEventListener(
                "click",
                async () => {

                    state.selectedDate =
                        cellDate;

                    state.calendarMonth =
                        new Date(
                            cellDate
                                .getFullYear(),
                            cellDate
                                .getMonth(),
                            1
                        );

                    state.selectedListId =
                        null;

                    state.activeView =
                        "today";

                    renderLists();

                    await loadTasksForSelectedDate();

                    await loadNote();

                    updateDateHeader();

                    updateView();
                }
            );


            calendarDays.appendChild(
                day
            );
        }
    }


    /* =====================================================
       DATE HEADER
    ===================================================== */

    function updateDateHeader() {

        const isToday =
            dateToISO(
                state.selectedDate
            ) ===
            dateToISO(
                new Date()
            );


        const formatted =
            new Intl.DateTimeFormat(
                "ru-RU",
                {
                    weekday: "long",
                    day: "numeric",
                    month: "long"
                }
            )
                .format(
                    state.selectedDate
                );


        if (dateLabel) {

            dateLabel.textContent =
                formatted.toUpperCase();
        }


        const tasksSubtitle =
            $("#tasksSubtitle");

        if (tasksSubtitle) {

            tasksSubtitle.textContent =
                isToday
                    ? "Что нужно сделать сегодня"
                    : `Задачи на ${formatDateShort(
                        dateToISO(
                            state.selectedDate
                        )
                    )}`;
        }


        const breadcrumbSub =
            $("#breadcrumbSub");

        if (breadcrumbSub) {

            breadcrumbSub.textContent =
                isToday
                    ? "Мой день"
                    : formatted;
        }
    }


    /* =====================================================
       WEEK STATISTICS
    ===================================================== */

    async function loadWeekStats() {

        if (!state.user) {
            return;
        }

        const start =
            startOfWeek(
                state.selectedDate
            );

        const end =
            endOfWeek(
                state.selectedDate
            );


        const {
            data,
            error
        } =
            await supabase
                .from("tasks")
                .select(
                    "id,task_date,completed"
                )
                .eq(
                    "user_id",
                    state.user.id
                )
                .gte(
                    "task_date",
                    dateToISO(start)
                )
                .lte(
                    "task_date",
                    dateToISO(end)
                );


        if (error) {

            console.error(
                "Ошибка статистики:",
                error
            );

            return;
        }


        const tasks =
            data || [];


        const completed =
            tasks.filter(
                task =>
                    Boolean(
                        task.completed
                    )
            ).length;


        if (weekCompletedCount) {

            weekCompletedCount.innerHTML =
                `${completed}<span>задач</span>`;
        }


        if (!miniChart) {
            return;
        }


        const dailyCounts =
            [];


        for (
            let i = 0;
            i < 7;
            i++
        ) {

            const date =
                new Date(start);

            date.setDate(
                start.getDate() +
                i
            );


            const iso =
                dateToISO(date);


            const count =
                tasks.filter(
                    task =>
                        task.task_date ===
                            iso &&
                        Boolean(
                            task.completed
                        )
                ).length;


            dailyCounts.push(
                count
            );
        }


        const max =
            Math.max(
                ...dailyCounts,
                1
            );


        miniChart.innerHTML =
            "";


        dailyCounts.forEach(
            (
                count,
                index
            ) => {

                const bar =
                    document.createElement(
                        "div"
                    );

                bar.className =
                    "chart-bar";


                const height =
                    Math.max(
                        8,
                        Math.round(
                            count /
                            max *
                            100
                        )
                    );


                bar.style.height =
                    `${height}%`;


                const barDate =
                    new Date(start);

                barDate.setDate(
                    start.getDate() +
                    index
                );


                if (
                    dateToISO(
                        state.selectedDate
                    ) ===
                    dateToISO(
                        barDate
                    )
                ) {

                    bar.classList.add(
                        "active"
                    );
                }


                miniChart.appendChild(
                    bar
                );
            }
        );
    }


    /* =====================================================
       FAVORITES
    ===================================================== */

    async function renderFavorites() {

        if (!favoritesList) {
            return;
        }

        favoritesList.innerHTML =
            "";


        const {
            data,
            error
        } =
            await supabase
                .from("tasks")
                .select("*")
                .eq(
                    "user_id",
                    state.user.id
                )
                .eq(
                    "favorite",
                    true
                )
                .order(
                    "task_date",
                    {
                        ascending: false
                    }
                )
                .order(
                    "task_time",
                    {
                        ascending: true,
                        nullsFirst: false
                    }
                );


        if (error) {

            console.error(error);

            favoritesList.innerHTML = `
                <div class="empty-state">
                    <strong>Не удалось загрузить избранное</strong>
                </div>
            `;

            return;
        }


        if (!data?.length) {

            favoritesList.innerHTML = `
                <div class="empty-state">
                    <div class="empty-icon">☆</div>
                    <strong>Избранных задач пока нет</strong>
                    <span>
                        Нажмите ☆ у задачи, чтобы добавить её сюда.
                    </span>
                </div>
            `;

            return;
        }


        data.forEach(task => {

            favoritesList.appendChild(
                createFavoriteTaskElement(
                    task
                )
            );
        });
    }


    function createFavoriteTaskElement(
        task
    ) {

        const item =
            document.createElement(
                "div"
            );

        item.className =
            `task ${
                task.completed
                    ? "completed"
                    : ""
            }`;


        item.dataset.taskId =
            task.id;


        const time =
            task.task_time
                ? task.task_time.slice(0, 5)
                : "";


        item.innerHTML = `
            <input
                type="checkbox"
                class="task-checkbox"
                ${task.completed ? "checked" : ""}
                aria-label="Отметить задачу выполненной"
            >

            <span
                class="custom-checkbox"
                role="checkbox"
                aria-checked="${task.completed ? "true" : "false"}"
            >
                ${task.completed ? "✓" : ""}
            </span>

            <span class="task-text">
                ${escapeHTML(task.title)}
            </span>

            <span class="task-time">
                ${escapeHTML(
                    formatDateShort(
                        task.task_date
                    )
                )}
                ${
                    time
                        ? " · " +
                          escapeHTML(time)
                        : ""
                }
            </span>

            <div class="task-actions">

                <button
                    type="button"
                    class="task-action task-favorite active"
                    title="Убрать из избранного"
                >
                    ★
                </button>

            </div>
        `;


        const checkbox =
            item.querySelector(
                ".task-checkbox"
            );


        const customCheckbox =
            item.querySelector(
                ".custom-checkbox"
            );


        async function updateFavoriteTask(
            completed
        ) {

            if (
                state.updatingTasks.has(
                    task.id
                )
            ) {
                return;
            }


            state.updatingTasks.add(
                task.id
            );


            const previous =
                Boolean(
                    task.completed
                );


            task.completed =
                completed;


            item.classList.toggle(
                "completed",
                completed
            );


            customCheckbox.textContent =
                completed
                    ? "✓"
                    : "";


            customCheckbox.setAttribute(
                "aria-checked",
                completed
                    ? "true"
                    : "false"
            );


            try {

                const {
                    data,
                    error
                } =
                    await supabase
                        .from("tasks")
                        .update({
                            completed:
                                Boolean(
                                    completed
                                )
                        })
                        .eq(
                            "id",
                            task.id
                        )
                        .eq(
                            "user_id",
                            state.user.id
                        )
                        .select(
                            "id,completed"
                        );


                if (error) {
                    throw error;
                }


                if (
                    !data ||
                    !data.length
                ) {
                    throw new Error(
                        "Задача не была обновлена."
                    );
                }


                task.completed =
                    Boolean(
                        data[0].completed
                    );


                checkbox.checked =
                    task.completed;


                await loadWeekStats();

                await renderCalendar();


            } catch (error) {

                console.error(
                    "Ошибка изменения избранной задачи:",
                    error
                );


                task.completed =
                    previous;

                checkbox.checked =
                    previous;

                item.classList.toggle(
                    "completed",
                    previous
                );

                customCheckbox.textContent =
                    previous
                        ? "✓"
                        : "";


                showToast(
                    "Не удалось обновить задачу.",
                    "error"
                );

            } finally {

                state.updatingTasks.delete(
                    task.id
                );
            }
        }


        checkbox.addEventListener(
            "change",
            async event => {

                event.stopPropagation();

                await updateFavoriteTask(
                    checkbox.checked
                );
            }
        );


        customCheckbox.addEventListener(
            "click",
            async event => {

                event.preventDefault();
                event.stopPropagation();

                await updateFavoriteTask(
                    !task.completed
                );
            }
        );


        item.querySelector(
            ".task-favorite"
        ).addEventListener(
            "click",
            async event => {

                event.preventDefault();
                event.stopPropagation();


                const {
                    error
                } =
                    await supabase
                        .from("tasks")
                        .update({
                            favorite:
                                false
                        })
                        .eq(
                            "id",
                            task.id
                        )
                        .eq(
                            "user_id",
                            state.user.id
                        )
                        .select("id");


                if (error) {

                    console.error(
                        error
                    );

                    showToast(
                        "Не удалось изменить избранное.",
                        "error"
                    );

                    return;
                }


                await renderFavorites();


                if (
                    dateToISO(
                        state.selectedDate
                    ) ===
                    task.task_date
                ) {

                    await loadTasksForSelectedDate();
                }
            }
        );


        return item;
    }


    /* =====================================================
       ALL TASKS
    ===================================================== */

    async function renderAllTasks() {

        if (!allTasksList) {
            return;
        }

        allTasksList.innerHTML = `
            <div class="empty-state">
                <span>Загрузка...</span>
            </div>
        `;


        const tasks =
            await loadAllTasks();


        const selectedDate =
            dateToISO(
                state.selectedDate
            );


        const filtered =
            state.selectedListId
                ? tasks.filter(
                    task =>
                        task.task_date ===
                            selectedDate &&
                        task.list_id ===
                            state.selectedListId
                )
                : tasks.filter(
                    task =>
                        task.task_date ===
                        selectedDate
                );


        if (!filtered.length) {

            allTasksList.innerHTML = `
                <div class="empty-state">
                    <div class="empty-icon">✓</div>
                    <strong>На этот день задач нет</strong>
                    <span>Создайте новую задачу.</span>
                </div>
            `;

            return;
        }


        filtered.forEach(task => {

            allTasksList.appendChild(
                createTaskElement(task)
            );
        });
    }


    /* =====================================================
       SEARCH
    ===================================================== */

    async function performSearch(
        query
    ) {

        const clean =
            query.trim();


        if (!clean) {

            searchResults.innerHTML = `
                <div class="search-empty">
                    Начните вводить запрос
                </div>
            `;

            return;
        }


        searchResults.innerHTML = `
            <div class="search-empty">
                Поиск...
            </div>
        `;


        const {
            data,
            error
        } =
            await supabase
                .from("tasks")
                .select(
                    "id,title,task_date,task_time,completed"
                )
                .eq(
                    "user_id",
                    state.user.id
                )
                .ilike(
                    "title",
                    `%${clean}%`
                )
                .order(
                    "task_date",
                    {
                        ascending: false
                    }
                )
                .limit(30);


        if (error) {

            console.error(error);

            searchResults.innerHTML = `
                <div class="search-empty">
                    Не удалось выполнить поиск.
                </div>
            `;

            return;
        }


        if (!data?.length) {

            searchResults.innerHTML = `
                <div class="search-empty">
                    Ничего не найдено.
                </div>
            `;

            return;
        }


        searchResults.innerHTML =
            "";


        data.forEach(task => {

            const result =
                document.createElement(
                    "div"
                );

            result.className =
                "search-result";


            result.innerHTML = `
                <div class="search-result-icon">
                    ${
                        task.completed
                            ? "✓"
                            : "○"
                    }
                </div>

                <div class="search-result-content">

                    <div class="search-result-title">
                        ${escapeHTML(task.title)}
                    </div>

                    <div class="search-result-date">
                        ${escapeHTML(
                            formatDateShort(
                                task.task_date
                            )
                        )}
                        ${
                            task.task_time
                                ? " · " +
                                  escapeHTML(
                                      task.task_time
                                          .slice(0, 5)
                                  )
                                : ""
                        }
                    </div>

                </div>
            `;


            result.addEventListener(
                "click",
                async () => {

                    state.selectedDate =
                        isoToDate(
                            task.task_date
                        );

                    state.calendarMonth =
                        new Date(
                            state.selectedDate
                                .getFullYear(),
                            state.selectedDate
                                .getMonth(),
                            1
                        );

                    state.activeView =
                        "today";

                    closeModal(
                        searchModal
                    );

                    await loadTasksForSelectedDate();

                    await loadNote();

                    updateDateHeader();

                    updateView();
                }
            );


            searchResults.appendChild(
                result
            );
        });
    }


    /* =====================================================
       VIEW
    ===================================================== */

    function updateView() {

        document
            .querySelectorAll(
                ".nav-item[data-view]"
            )
            .forEach(item => {

                item.classList.toggle(
                    "active",
                    item.dataset.view ===
                    state.activeView
                );
            });


        const showFavorites =
            state.activeView ===
            "favorites";

        const showTasks =
            state.activeView ===
            "tasks";

        const showCalendar =
            state.activeView ===
            "calendar";

        const showSettings =
            state.activeView ===
            "settings";


        if (favoritesPanel) {

            favoritesPanel.classList.toggle(
                "hidden",
                !showFavorites
            );
        }


        if (allTasksPanel) {

            allTasksPanel.classList.toggle(
                "hidden",
                !showTasks
            );
        }


        const dashboardGrid =
            $(".dashboard-grid");

        const welcome =
            $(".welcome");


        if (
            showFavorites ||
            showTasks
        ) {

            dashboardGrid?.classList.add(
                "hidden"
            );

        } else {

            dashboardGrid?.classList.remove(
                "hidden"
            );
        }


        if (
            showFavorites ||
            showTasks
        ) {

            welcome?.classList.add(
                "hidden"
            );

        } else {

            welcome?.classList.remove(
                "hidden"
            );
        }


        if (showCalendar) {

            dashboardGrid?.classList.remove(
                "hidden"
            );

            welcome?.classList.remove(
                "hidden"
            );


            setTimeout(() => {

                $(".calendar-card")
                    ?.scrollIntoView({
                        behavior: "smooth",
                        block: "center"
                    });

            }, 50);
        }


        if (showSettings) {

            openModal(
                settingsModal
            );

            state.activeView =
                "today";
        }


        if (showFavorites) {
            renderFavorites();
        }


        if (showTasks) {
            renderAllTasks();
        }


        const mainTitle =
            $("#breadcrumbMain");


        if (showFavorites) {

            mainTitle.textContent =
                "Избранное";

            $("#breadcrumbSub").textContent =
                "Важные задачи";

        } else if (showTasks) {

            mainTitle.textContent =
                "Задачи";

            $("#breadcrumbSub").textContent =
                "Все задачи";

        } else if (showCalendar) {

            mainTitle.textContent =
                "Календарь";

            $("#breadcrumbSub").textContent =
                "Ваш месяц";

        } else {

            mainTitle.textContent =
                "Сегодня";

            updateDateHeader();
        }
    }


    /* =====================================================
       NAVIGATION
    ===================================================== */

    async function handleNavigation(
        view
    ) {

        state.activeView =
            view;

        closeMobileSidebar();


        if (view === "today") {

            state.selectedListId =
                null;

            const today =
                new Date();

            state.selectedDate =
                today;

            state.calendarMonth =
                new Date(
                    today.getFullYear(),
                    today.getMonth(),
                    1
                );


            renderLists();

            await loadTasksForSelectedDate();

            await loadNote();
        }


        updateView();
    }


    /* =====================================================
       LOGOUT
    ===================================================== */

    async function logout() {

        const confirmed =
            window.confirm(
                "Выйти из аккаунта?"
            );

        if (!confirmed) {
            return;
        }


        const {
            error
        } =
            await supabase.auth.signOut();


        if (error) {

            console.error(error);

            showToast(
                "Не удалось выйти.",
                "error"
            );

            return;
        }


        closeAllModals();

        showToast(
            "Вы вышли из аккаунта."
        );
    }


    /* =====================================================
       EVENT LISTENERS
    ===================================================== */

    authForm.addEventListener(
        "submit",
        handleAuthSubmit
    );


    authSwitchButton.addEventListener(
        "click",
        () => {

            setAuthMode(
                state.authMode ===
                    "login"
                    ? "register"
                    : "login"
            );
        }
    );


    passwordToggle.addEventListener(
        "click",
        () => {

            const isPassword =
                authPassword.type ===
                "password";


            authPassword.type =
                isPassword
                    ? "text"
                    : "password";


            passwordToggle.textContent =
                isPassword
                    ? "◌"
                    : "◉";
        }
    );


    $("#newTaskButton")
        ?.addEventListener(
            "click",
            openNewTask
        );


    $("#addTaskButton")
        ?.addEventListener(
            "click",
            openNewTask
        );


    $("#allTasksAddButton")
        ?.addEventListener(
            "click",
            openNewTask
        );


    $("#closeTaskModal")
        ?.addEventListener(
            "click",
            () =>
                closeModal(
                    taskModal
                )
        );


    $("#cancelTask")
        ?.addEventListener(
            "click",
            () =>
                closeModal(
                    taskModal
                )
        );


    taskForm.addEventListener(
        "submit",
        handleTaskSubmit
    );


    $("#addListButton")
        ?.addEventListener(
            "click",
            openNewList
        );


    $("#closeListModal")
        ?.addEventListener(
            "click",
            () =>
                closeModal(
                    listModal
                )
        );


    $("#cancelList")
        ?.addEventListener(
            "click",
            () =>
                closeModal(
                    listModal
                )
        );


    listForm.addEventListener(
        "submit",
        handleListSubmit
    );


    document
        .querySelectorAll(
            ".color-option"
        )
        .forEach(button => {

            button.addEventListener(
                "click",
                () => {

                    state.selectedColor =
                        button.dataset.color;


                    document
                        .querySelectorAll(
                            ".color-option"
                        )
                        .forEach(item => {

                            item.classList.toggle(
                                "selected",
                                item === button
                            );
                        });
                }
            );
        });


    $("#saveNoteButton")
        ?.addEventListener(
            "click",
            async () => {

                await saveNote();

                showToast(
                    "Заметка сохранена."
                );
            }
        );


    noteInput.addEventListener(
        "input",
        () => {

            noteStatus.textContent =
                "Есть несохранённые изменения";


            clearTimeout(
                state.noteSaveTimer
            );


            state.noteSaveTimer =
                setTimeout(
                    saveNote,
                    1000
                );
        }
    );


    $("#previousMonth")
        ?.addEventListener(
            "click",
            async () => {

                state.calendarMonth =
                    new Date(
                        state.calendarMonth
                            .getFullYear(),
                        state.calendarMonth
                            .getMonth() - 1,
                        1
                    );

                await renderCalendar();
            }
        );


    $("#nextMonth")
        ?.addEventListener(
            "click",
            async () => {

                state.calendarMonth =
                    new Date(
                        state.calendarMonth
                            .getFullYear(),
                        state.calendarMonth
                            .getMonth() + 1,
                        1
                    );

                await renderCalendar();
            }
        );


    $("#todayMonth")
        ?.addEventListener(
            "click",
            async () => {

                const today =
                    new Date();

                state.selectedDate =
                    today;

                state.calendarMonth =
                    new Date(
                        today.getFullYear(),
                        today.getMonth(),
                        1
                    );

                state.activeView =
                    "today";


                await loadTasksForSelectedDate();

                await loadNote();

                updateDateHeader();

                updateView();
            }
        );


    $("#searchButton")
        ?.addEventListener(
            "click",
            () => {

                openModal(
                    searchModal
                );

                searchInput.value =
                    "";

                searchResults.innerHTML = `
                    <div class="search-empty">
                        Начните вводить запрос
                    </div>
                `;


                setTimeout(
                    () =>
                        searchInput.focus(),
                    50
                );
            }
        );


    $("#closeSearchModal")
        ?.addEventListener(
            "click",
            () =>
                closeModal(
                    searchModal
                )
        );


    searchInput.addEventListener(
        "input",
        () => {

            clearTimeout(
                searchInput._timer
            );


            searchInput._timer =
                setTimeout(
                    () =>
                        performSearch(
                            searchInput.value
                        ),
                    250
                );
        }
    );


    $("#notificationButton")
        ?.addEventListener(
            "click",
            event => {

                event.stopPropagation();


                notificationPopover.classList.toggle(
                    "hidden"
                );
            }
        );


    document.addEventListener(
        "click",
        event => {

            if (
                notificationPopover &&
                !notificationPopover.contains(
                    event.target
                ) &&
                event.target !==
                    $("#notificationButton")
            ) {

                notificationPopover.classList.add(
                    "hidden"
                );
            }
        }
    );


    $("#profileButton")
        ?.addEventListener(
            "click",
            () => {

                const name =
                    state.profile?.display_name ||
                    state.user?.email?.split("@")[0] ||
                    "Мой профиль";


                settingsName.textContent =
                    name;

                settingsEmail.textContent =
                    state.user?.email || "";

                settingsAvatar.textContent =
                    getInitials(name);


                openModal(
                    settingsModal
                );
            }
        );


    $("#closeSettingsModal")
        ?.addEventListener(
            "click",
            () => {

                closeModal(
                    settingsModal
                );

                state.activeView =
                    "today";

                updateView();
            }
        );


    $("#logoutButton")
        ?.addEventListener(
            "click",
            logout
        );


    document
        .querySelectorAll(
            ".nav-item[data-view]"
        )
        .forEach(item => {

            item.addEventListener(
                "click",
                async () => {

                    await handleNavigation(
                        item.dataset.view
                    );
                }
            );
        });


    $("#mobileMenuButton")
        ?.addEventListener(
            "click",
            () => {

                sidebar.classList.add(
                    "mobile-open"
                );

                sidebarOverlay.classList.add(
                    "active"
                );
            }
        );


    $("#mobileSidebarClose")
        ?.addEventListener(
            "click",
            closeMobileSidebar
        );


    sidebarOverlay?.addEventListener(
        "click",
        closeMobileSidebar
    );


    document.addEventListener(
        "keydown",
        event => {

            if (
                event.key ===
                "Escape"
            ) {

                closeAllModals();

                closeMobileSidebar();
            }
        }
    );


    [
        taskModal,
        listModal,
        searchModal,
        settingsModal
    ]
        .filter(Boolean)
        .forEach(modal => {

            modal.addEventListener(
                "click",
                event => {

                    if (
                        event.target ===
                        modal
                    ) {

                        closeModal(
                            modal
                        );
                    }
                }
            );
        });


    /* =====================================================
       SUPABASE AUTH LISTENER
    ===================================================== */

    supabase.auth.onAuthStateChange(
        async (_event, session) => {

            await handleSession(
                session
            );
        }
    );


    /* =====================================================
       INIT
    ===================================================== */

    async function init() {

        setAuthMode(
            "login"
        );


        try {

            const {
                data,
                error
            } =
                await supabase.auth.getSession();


            if (error) {
                throw error;
            }


            await handleSession(
                data.session
            );

        } catch (error) {

            console.error(
                error
            );


            loadingScreen.classList.add(
                "hidden"
            );

            authScreen.classList.remove(
                "hidden"
            );


            showAuthMessage(
                "Не удалось подключиться к Daily. Проверь настройки Supabase."
            );
        }
    }


    init();

})();
