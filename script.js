/* =========================================================
   DAILY — SUPABASE APPLICATION
   Stable + improved application logic
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

    const supabaseClient = createClient(
        window.DAILY_CONFIG.supabaseUrl,
        window.DAILY_CONFIG.supabaseKey
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

        selectedDate: formatDate(new Date()),
        calendarDate: new Date(),

        activeView: "today",
        selectedListId: null,

        editingTaskId: null,
        editingListId: null,

        authMode: "login",

        taskLoading: false,
        calendarLoading: false,

        noteTimer: null,
        noteLoadedForDate: null,

        updatingTasks: new Set(),

        searchResults: []
    };

    /* =====================================================
       DOM HELPERS
    ===================================================== */

    const $ = (selector) => document.querySelector(selector);
    const $$ = (selector) => document.querySelectorAll(selector);

    function setText(selector, value) {
        const element = $(selector);

        if (element) {
            element.textContent = value ?? "";
        }
    }

    function show(element) {
        if (element) {
            element.classList.remove("hidden");
            element.style.display = "";
        }
    }

    function hide(element) {
        if (element) {
            element.classList.add("hidden");
            element.style.display = "none";
        }
    }

    function escapeHTML(value) {
        return String(value ?? "")
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/"/g, "&quot;")
            .replace(/'/g, "&#039;");
    }

    /* =====================================================
       DATE HELPERS
    ===================================================== */

    function formatDate(date) {
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, "0");
        const day = String(date.getDate()).padStart(2, "0");

        return `${year}-${month}-${day}`;
    }

    function parseDate(dateString) {
        const [year, month, day] = dateString.split("-").map(Number);

        return new Date(year, month - 1, day);
    }

    function isToday(dateString) {
        return dateString === formatDate(new Date());
    }

    function formatReadableDate(dateString) {
        const date = parseDate(dateString);

        return date.toLocaleDateString("ru-RU", {
            weekday: "long",
            day: "numeric",
            month: "long"
        });
    }

    function formatShortDate(dateString) {
        const date = parseDate(dateString);

        return date.toLocaleDateString("ru-RU", {
            day: "numeric",
            month: "short"
        });
    }

    function getGreeting() {
        const hour = new Date().getHours();

        if (hour < 5) return "Доброй ночи";
        if (hour < 12) return "Доброе утро";
        if (hour < 18) return "Добрый день";

        return "Добрый вечер";
    }

    function getMonthName(date) {
        return date.toLocaleDateString("ru-RU", {
            month: "long",
            year: "numeric"
        });
    }

    /* =====================================================
       TOAST
    ===================================================== */

    function toast(message, type = "default") {
        const container = $("#toastContainer");

        if (!container) {
            console.log(message);
            return;
        }

        const item = document.createElement("div");

        item.className = `toast toast-${type}`;

        item.innerHTML = `
            <div class="toast-icon">
                ${type === "success" ? "✓" : type === "error" ? "!" : "•"}
            </div>

            <div class="toast-message">
                ${escapeHTML(message)}
            </div>
        `;

        container.appendChild(item);

        requestAnimationFrame(() => {
            item.classList.add("show");
        });

        setTimeout(() => {
            item.classList.remove("show");

            setTimeout(() => {
                item.remove();
            }, 250);
        }, 3200);
    }

    /* =====================================================
       AUTH
    ===================================================== */

    async function login(email, password) {
        const { error } = await supabaseClient.auth.signInWithPassword({
            email,
            password
        });

        if (error) {
            throw new Error(getAuthError(error));
        }
    }

    async function register(email, password, displayName) {
        const { data, error } = await supabaseClient.auth.signUp({
            email,
            password,
            options: {
                data: {
                    display_name: displayName
                }
            }
        });

        if (error) {
            throw new Error(getAuthError(error));
        }

        if (data.user) {
            await ensureProfile(data.user, displayName);
        }
    }

    function getAuthError(error) {
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
            return "Пароль должен соответствовать требованиям Supabase.";
        }

        return error?.message || "Не удалось выполнить действие.";
    }

    async function logout() {
        await supabaseClient.auth.signOut();
    }

    /* =====================================================
       PROFILE
    ===================================================== */

    async function ensureProfile(user, displayName = "") {
        if (!user) return null;

        const { data, error } = await supabaseClient
            .from("profiles")
            .select("*")
            .eq("id", user.id)
            .maybeSingle();

        if (error) {
            console.warn("Не удалось получить профиль:", error);
        }

        if (data) {
            return data;
        }

        const name =
            displayName ||
            user.user_metadata?.display_name ||
            user.email?.split("@")[0] ||
            "Пользователь";

        const { data: created, error: createError } = await supabaseClient
            .from("profiles")
            .insert({
                id: user.id,
                display_name: name
            })
            .select()
            .single();

        if (createError) {
            console.warn("Не удалось создать профиль:", createError);
            return {
                id: user.id,
                display_name: name
            };
        }

        return created;
    }

    async function loadProfile() {
        if (!state.user) return;

        state.profile = await ensureProfile(state.user);

        renderUser();
    }

    function renderUser() {
        const name =
            state.profile?.display_name ||
            state.user?.user_metadata?.display_name ||
            state.user?.email?.split("@")[0] ||
            "Пользователь";

        setText("#welcomeName", name);
        setText("#profileName", name);

        const avatarLetters = name
            .trim()
            .split(/\s+/)
            .slice(0, 2)
            .map(word => word[0])
            .join("")
            .toUpperCase();

        $$(".avatar, .profile-avatar").forEach(element => {
            if (
                element.children.length === 0 ||
                element.dataset.generatedAvatar === "true"
            ) {
                element.textContent = avatarLetters;
                element.dataset.generatedAvatar = "true";
            }
        });
    }

    /* =====================================================
       LISTS
    ===================================================== */

    async function loadLists() {
        if (!state.user) return;

        const { data, error } = await supabaseClient
            .from("lists")
            .select("*")
            .eq("user_id", state.user.id)
            .order("created_at", {
                ascending: true
            });

        if (error) {
            console.warn("Ошибка загрузки списков:", error);
            return;
        }

        state.lists = data || [];

        renderLists();
    }

    async function createDefaultLists() {
        if (!state.user) return;

        if (state.lists.length > 0) {
            return;
        }

        const defaults = [
            {
                user_id: state.user.id,
                name: "Личное",
                color: "#7c6cff"
            },
            {
                user_id: state.user.id,
                name: "Работа",
                color: "#4b9cff"
            },
            {
                user_id: state.user.id,
                name: "Учёба",
                color: "#37b978"
            }
        ];

        const { data, error } = await supabaseClient
            .from("lists")
            .insert(defaults)
            .select();

        if (!error) {
            state.lists = data || [];
            renderLists();
        }
    }

    function renderLists() {
        const container = $("#listsContainer");

        if (!container) return;

        container.innerHTML = "";

        state.lists.forEach(list => {
            const item = document.createElement("button");

            item.className =
                "nav-item custom-list-item" +
                (state.selectedListId === list.id ? " active" : "");

            item.dataset.listId = list.id;

            item.innerHTML = `
                <span
                    class="list-dot"
                    style="--list-color:${escapeHTML(list.color || "#7c6cff")}"
                ></span>

                <span class="nav-label">
                    ${escapeHTML(list.name)}
                </span>
            `;

            item.addEventListener("click", () => {
                state.selectedListId = list.id;
                state.activeView = "today";

                updateView();
                closeSidebarMobile();
            });

            container.appendChild(item);
        });
    }

    /* =====================================================
       TASKS
    ===================================================== */

    async function loadTasksForSelectedDate() {
        if (!state.user) return;

        state.taskLoading = true;
        renderTaskLoading();

        try {
            let query = supabaseClient
                .from("tasks")
                .select("*")
                .eq("user_id", state.user.id)
                .eq("task_date", state.selectedDate)
                .order("completed", {
                    ascending: true
                })
                .order("created_at", {
                    ascending: true
                });

            if (state.selectedListId) {
                query = query.eq("list_id", state.selectedListId);
            }

            const { data, error } = await query;

            if (error) {
                throw error;
            }

            state.tasks = data || [];

        } catch (error) {
            console.error("Ошибка загрузки задач:", error);

            state.tasks = [];

            showTaskError(
                "Не удалось загрузить задачи. Попробуй обновить страницу."
            );
        } finally {
            /*
             * КРИТИЧЕСКОЕ ИСПРАВЛЕНИЕ:
             * loading ВСЕГДА выключается,
             * даже если Supabase вернул ошибку.
             */
            state.taskLoading = false;

            renderTasks();
            updateProgress();
            updateTaskBadge();
        }
    }

    async function loadAllTasks() {
        if (!state.user) return;

        try {
            const { data, error } = await supabaseClient
                .from("tasks")
                .select("*")
                .eq("user_id", state.user.id)
                .order("task_date", {
                    ascending: true
                })
                .order("created_at", {
                    ascending: true
                });

            if (error) {
                throw error;
            }

            state.allTasks = data || [];

        } catch (error) {
            console.error("Ошибка загрузки всех задач:", error);
            state.allTasks = [];
        }
    }

    function renderTaskLoading() {
        const container = $("#taskList");

        if (!container) return;

        container.innerHTML = `
            <div class="task-loading">
                <div class="loading-spinner"></div>
                <span>Загружаем задачи...</span>
            </div>
        `;
    }

    function showTaskError(message) {
        const container = $("#taskList");

        if (!container) return;

        container.innerHTML = `
            <div class="empty-state task-error-state">
                <div class="empty-state-icon">!</div>
                <strong>Что-то пошло не так</strong>
                <span>${escapeHTML(message)}</span>

                <button class="secondary-button" id="retryTasksButton">
                    Повторить
                </button>
            </div>
        `;

        $("#retryTasksButton")?.addEventListener(
            "click",
            loadTasksForSelectedDate
        );
    }

    function renderTasks() {
        const container = $("#taskList");

        if (!container) return;

        if (state.taskLoading) {
            renderTaskLoading();
            return;
        }

        if (!state.tasks.length) {
            container.innerHTML = `
                <div class="empty-state">
                    <div class="empty-state-icon">✓</div>

                    <strong>
                        ${state.selectedListId
                            ? "В этом списке пока пусто"
                            : "На этот день задач нет"}
                    </strong>

                    <span>
                        ${isToday(state.selectedDate)
                            ? "Добавь первую задачу и начни свой день."
                            : "Для этой даты пока ничего не запланировано."}
                    </span>

                    <button class="secondary-button empty-add-task">
                        + Добавить задачу
                    </button>
                </div>
            `;

            container
                .querySelector(".empty-add-task")
                ?.addEventListener("click", () => openTaskModal());

            return;
        }

        container.innerHTML = "";

        state.tasks.forEach(task => {
            container.appendChild(createTaskElement(task));
        });
    }

    function createTaskElement(task) {
        const item = document.createElement("div");

        item.className =
            "task-item" +
            (task.completed ? " completed" : "");

        item.dataset.taskId = task.id;

        const list = state.lists.find(
            currentList => currentList.id === task.list_id
        );

        const priority =
            task.priority ||
            "normal";

        const priorityLabel = {
            low: "Низкий",
            normal: "Обычный",
            high: "Высокий"
        }[priority] || "Обычный";

        item.innerHTML = `
            <button
                class="task-checkbox ${task.completed ? "checked" : ""}"
                type="button"
                aria-label="Изменить статус задачи"
            >
                ${task.completed ? "✓" : ""}
            </button>

            <div class="task-content">
                <div class="task-title">
                    ${escapeHTML(task.title || "Без названия")}
                </div>

                ${
                    task.description
                        ? `
                            <div class="task-description">
                                ${escapeHTML(task.description)}
                            </div>
                        `
                        : ""
                }

                <div class="task-meta">
                    ${
                        list
                            ? `
                                <span
                                    class="task-list-tag"
                                    style="--task-color:${escapeHTML(list.color || "#7c6cff")}"
                                >
                                    ${escapeHTML(list.name)}
                                </span>
                            `
                            : ""
                    }

                    <span class="task-priority priority-${priority}">
                        ${priorityLabel}
                    </span>

                    ${
                        task.due_time
                            ? `<span>${escapeHTML(task.due_time)}</span>`
                            : ""
                    }
                </div>
            </div>

            <button
                class="task-favorite ${task.favorite ? "active" : ""}"
                type="button"
                aria-label="Избранное"
            >
                ${task.favorite ? "★" : "☆"}
            </button>

            <button
                class="task-more"
                type="button"
                aria-label="Меню задачи"
            >
                ⋯
            </button>
        `;

        item.querySelector(".task-checkbox")
            ?.addEventListener("click", event => {
                event.stopPropagation();
                toggleTask(task);
            });

        item.querySelector(".task-favorite")
            ?.addEventListener("click", event => {
                event.stopPropagation();
                toggleFavorite(task);
            });

        item.querySelector(".task-more")
            ?.addEventListener("click", event => {
                event.stopPropagation();
                openTaskActions(task, item);
            });

        item.querySelector(".task-content")
            ?.addEventListener("dblclick", () => {
                openTaskModal(task);
            });

        return item;
    }

    async function toggleTask(task) {
        if (state.updatingTasks.has(task.id)) {
            return;
        }

        const previousValue = !!task.completed;
        const nextValue = !previousValue;

        state.updatingTasks.add(task.id);

        task.completed = nextValue;

        renderTasks();
        updateProgress();

        try {
            const { error } = await supabaseClient
                .from("tasks")
                .update({
                    completed: nextValue
                })
                .eq("id", task.id)
                .eq("user_id", state.user.id);

            if (error) {
                throw error;
            }

            toast(
                nextValue
                    ? "Задача выполнена"
                    : "Задача снова активна",
                "success"
            );

            await loadAllTasks();

        } catch (error) {
            task.completed = previousValue;

            renderTasks();
            updateProgress();

            console.error(error);

            toast(
                "Не удалось изменить задачу",
                "error"
            );
        } finally {
            state.updatingTasks.delete(task.id);
        }
    }

    async function toggleFavorite(task) {
        const previousValue = !!task.favorite;

        task.favorite = !previousValue;

        renderTasks();

        try {
            const { error } = await supabaseClient
                .from("tasks")
                .update({
                    favorite: task.favorite
                })
                .eq("id", task.id)
                .eq("user_id", state.user.id);

            if (error) {
                throw error;
            }

        } catch (error) {
            task.favorite = previousValue;

            renderTasks();

            toast(
                "Не удалось изменить избранное",
                "error"
            );
        }
    }

    function openTaskActions(task, sourceElement) {
        const existing = document.querySelector(".task-actions-popup");

        existing?.remove();

        const popup = document.createElement("div");

        popup.className = "task-actions-popup";

        popup.innerHTML = `
            <button data-action="edit">
                <span>✎</span>
                Изменить
            </button>

            <button data-action="favorite">
                <span>${task.favorite ? "★" : "☆"}</span>
                ${task.favorite ? "Убрать из избранного" : "В избранное"}
            </button>

            <button data-action="delete" class="danger-action">
                <span>×</span>
                Удалить
            </button>
        `;

        document.body.appendChild(popup);

        const rect = sourceElement
            .querySelector(".task-more")
            ?.getBoundingClientRect();

        if (rect) {
            popup.style.top = `${rect.bottom + 6}px`;
            popup.style.left = `${Math.max(
                12,
                rect.right - 180
            )}px`;
        }

        popup.querySelector('[data-action="edit"]')
            ?.addEventListener("click", () => {
                popup.remove();
                openTaskModal(task);
            });

        popup.querySelector('[data-action="favorite"]')
            ?.addEventListener("click", () => {
                popup.remove();
                toggleFavorite(task);
            });

        popup.querySelector('[data-action="delete"]')
            ?.addEventListener("click", async () => {
                popup.remove();

                if (
                    confirm(
                        `Удалить задачу «${task.title}»?`
                    )
                ) {
                    await deleteTask(task);
                }
            });

        setTimeout(() => {
            document.addEventListener(
                "click",
                function closePopup(event) {
                    if (!popup.contains(event.target)) {
                        popup.remove();

                        document.removeEventListener(
                            "click",
                            closePopup
                        );
                    }
                },
                {
                    once: true
                }
            );
        }, 0);
    }

    async function deleteTask(task) {
        try {
            const { error } = await supabaseClient
                .from("tasks")
                .delete()
                .eq("id", task.id)
                .eq("user_id", state.user.id);

            if (error) {
                throw error;
            }

            state.tasks = state.tasks.filter(
                item => item.id !== task.id
            );

            state.allTasks = state.allTasks.filter(
                item => item.id !== task.id
            );

            renderTasks();
            updateProgress();
            updateTaskBadge();

            toast("Задача удалена", "success");

        } catch (error) {
            console.error(error);

            toast(
                "Не удалось удалить задачу",
                "error"
            );
        }
    }

    /* =====================================================
       TASK MODAL
    ===================================================== */

    function openTaskModal(task = null) {
        const modal = $("#taskModal");

        if (!modal) return;

        state.editingTaskId = task?.id || null;

        const titleInput = $("#taskTitle");
        const descriptionInput = $("#taskDescription");
        const dateInput = $("#taskDate");
        const timeInput = $("#taskTime");
        const priorityInput = $("#taskPriority");
        const listInput = $("#taskListSelect");

        if (titleInput) {
            titleInput.value = task?.title || "";
        }

        if (descriptionInput) {
            descriptionInput.value =
                task?.description || "";
        }

        if (dateInput) {
            dateInput.value =
                task?.task_date ||
                state.selectedDate;
        }

        if (timeInput) {
            timeInput.value =
                task?.due_time || "";
        }

        if (priorityInput) {
            priorityInput.value =
                task?.priority || "normal";
        }

        if (listInput) {
            renderTaskListOptions(task?.list_id);
        }

        setText(
            "#taskModalTitle",
            task ? "Редактировать задачу" : "Новая задача"
        );

        setText(
            "#taskSubmitButton",
            task ? "Сохранить" : "Добавить"
        );

        show(modal);

        setTimeout(() => {
            titleInput?.focus();
        }, 100);
    }

    function closeTaskModal() {
        const modal = $("#taskModal");

        if (!modal) return;

        hide(modal);

        state.editingTaskId = null;
    }

    function renderTaskListOptions(selectedId = null) {
        const select = $("#taskListSelect");

        if (!select) return;

        select.innerHTML = `
            <option value="">Без списка</option>

            ${state.lists
                .map(
                    list => `
                        <option
                            value="${escapeHTML(list.id)}"
                            ${selectedId === list.id ? "selected" : ""}
                        >
                            ${escapeHTML(list.name)}
                        </option>
                    `
                )
                .join("")}
        `;
    }

    async function saveTask() {
        if (!state.user) return;

        const title = $("#taskTitle")?.value.trim();

        if (!title) {
            toast("Введите название задачи", "error");
            $("#taskTitle")?.focus();
            return;
        }

        const payload = {
            user_id: state.user.id,
            title,
            description:
                $("#taskDescription")?.value.trim() || null,
            task_date:
                $("#taskDate")?.value ||
                state.selectedDate,
            due_time:
                $("#taskTime")?.value || null,
            priority:
                $("#taskPriority")?.value ||
                "normal",
            list_id:
                $("#taskListSelect")?.value || null
        };

        const submitButton = $("#taskSubmitButton");

        if (submitButton) {
            submitButton.disabled = true;
            submitButton.dataset.originalText =
                submitButton.textContent;

            submitButton.textContent =
                "Сохраняем...";
        }

        try {
            if (state.editingTaskId) {
                const { error } = await supabaseClient
                    .from("tasks")
                    .update(payload)
                    .eq("id", state.editingTaskId)
                    .eq("user_id", state.user.id);

                if (error) {
                    throw error;
                }

                toast(
                    "Задача обновлена",
                    "success"
                );

            } else {
                const { error } = await supabaseClient
                    .from("tasks")
                    .insert({
                        ...payload,
                        completed: false,
                        favorite: false
                    });

                if (error) {
                    throw error;
                }

                toast(
                    "Задача добавлена",
                    "success"
                );
            }

            closeTaskModal();

            state.selectedDate = payload.task_date;

            await Promise.all([
                loadTasksForSelectedDate(),
                loadAllTasks()
            ]);

            renderCalendar();

        } catch (error) {
            console.error(error);

            toast(
                "Не удалось сохранить задачу",
                "error"
            );

        } finally {
            if (submitButton) {
                submitButton.disabled = false;

                submitButton.textContent =
                    submitButton.dataset.originalText ||
                    "Сохранить";
            }
        }
    }

    /* =====================================================
       NOTES
    ===================================================== */

    function getLocalNoteKey(date) {
        return `daily_note_${state.user?.id || "guest"}_${date}`;
    }

    async function loadNote() {
        const input = $("#noteInput");
        const status = $("#noteStatus");

        if (!input || !state.user) return;

        state.noteLoadedForDate =
            state.selectedDate;

        if (status) {
            status.textContent = "Загрузка...";
            status.dataset.state = "loading";
        }

        try {
            const { data, error } = await supabaseClient
                .from("notes")
                .select("*")
                .eq("user_id", state.user.id)
                .eq("note_date", state.selectedDate)
                .maybeSingle();

            if (error) {
                /*
                 * Если таблица notes временно недоступна,
                 * всё равно показываем локальную копию.
                 */
                console.warn(
                    "Удалённая заметка недоступна:",
                    error
                );

                const localValue =
                    localStorage.getItem(
                        getLocalNoteKey(state.selectedDate)
                    );

                input.value = localValue || "";

                setNoteStatus(
                    localValue
                        ? "Локальная копия"
                        : "Новая заметка",
                    localValue
                        ? "local"
                        : "empty"
                );

                return;
            }

            input.value =
                data?.content ||
                localStorage.getItem(
                    getLocalNoteKey(state.selectedDate)
                ) ||
                "";

            setNoteStatus(
                data
                    ? "Сохранено"
                    : "Новая заметка",
                data
                    ? "saved"
                    : "empty"
            );

        } catch (error) {
            console.error(error);

            const localValue =
                localStorage.getItem(
                    getLocalNoteKey(state.selectedDate)
                );

            input.value = localValue || "";

            setNoteStatus(
                localValue
                    ? "Локальная копия"
                    : "Не сохранено",
                "local"
            );
        }
    }

    function setNoteStatus(text, stateName) {
        const status = $("#noteStatus");

        if (!status) return;

        status.textContent = text;
        status.dataset.state = stateName;
    }

    function scheduleNoteSave() {
        const input = $("#noteInput");

        if (!input || !state.user) return;

        clearTimeout(state.noteTimer);

        setNoteStatus(
            "Изменения не сохранены",
            "dirty"
        );

        state.noteTimer = setTimeout(
            saveNote,
            900
        );
    }

    async function saveNote() {
        const input = $("#noteInput");

        if (!input || !state.user) return;

        const content = input.value;

        /*
         * Локальное сохранение выполняем СРАЗУ.
         * Поэтому заметка не пропадёт даже при проблеме сети.
         */
        localStorage.setItem(
            getLocalNoteKey(state.selectedDate),
            content
        );

        setNoteStatus(
            "Сохраняем...",
            "saving"
        );

        try {
            /*
             * Upsert позволяет:
             * - создать новую заметку;
             * - обновить существующую.
             */
            const { error } = await supabaseClient
                .from("notes")
                .upsert(
                    {
                        user_id: state.user.id,
                        note_date: state.selectedDate,
                        content
                    },
                    {
                        onConflict:
                            "user_id,note_date"
                    }
                );

            if (error) {
                throw error;
            }

            setNoteStatus(
                "Сохранено",
                "saved"
            );

        } catch (error) {
            console.error(
                "Ошибка сохранения заметки:",
                error
            );

            /*
             * Даже при ошибке Supabase
             * текст уже находится в localStorage.
             */
            setNoteStatus(
                "Сохранено на устройстве",
                "local"
            );
        }
    }

    /* =====================================================
       PROGRESS
    ===================================================== */

    function updateProgress() {
        const total = state.tasks.length;

        const completed = state.tasks.filter(
            task => task.completed
        ).length;

        const percent =
            total > 0
                ? Math.round((completed / total) * 100)
                : 0;

        setText(
            "#progressPercent",
            `${percent}%`
        );

        const progress = $("#progressValue");

        if (progress) {
            progress.style.width = `${percent}%`;
        }

        setText(
            "#progressText",
            total
                ? `${completed} из ${total} задач выполнено`
                : "День только начинается"
        );
    }

    function updateTaskBadge() {
        const badge = $("#taskCountBadge");

        if (!badge) return;

        const count = state.tasks.filter(
            task => !task.completed
        ).length;

        badge.textContent = count > 99
            ? "99+"
            : String(count);

        badge.classList.toggle(
            "hidden",
            count === 0
        );
    }

    /* =====================================================
       CALENDAR
    ===================================================== */

    async function renderCalendar() {
        const container = $("#calendarDays");

        if (!container) return;

        state.calendarLoading = true;

        const year = state.calendarDate.getFullYear();
        const month = state.calendarDate.getMonth();

        setText(
            "#calendarTitle",
            getMonthName(state.calendarDate)
        );

        const firstDay = new Date(
            year,
            month,
            1
        );

        const lastDay = new Date(
            year,
            month + 1,
            0
        );

        /*
         * Понедельник = 0
         */
        const firstWeekday =
            (firstDay.getDay() + 6) % 7;

        const daysInMonth =
            lastDay.getDate();

        const previousMonthLastDay =
            new Date(
                year,
                month,
                0
            ).getDate();

        let html = "";

        for (
            let i = firstWeekday - 1;
            i >= 0;
            i--
        ) {
            const day =
                previousMonthLastDay - i;

            html += `
                <button
                    class="calendar-day muted"
                    type="button"
                    disabled
                >
                    <span>${day}</span>
                </button>
            `;
        }

        for (
            let day = 1;
            day <= daysInMonth;
            day++
        ) {
            const date = formatDate(
                new Date(year, month, day)
            );

            const selected =
                date === state.selectedDate;

            const today =
                date === formatDate(new Date());

            const hasTasks =
                state.allTasks.some(
                    task =>
                        task.task_date === date
                );

            const completedTasks =
                state.allTasks.filter(
                    task =>
                        task.task_date === date &&
                        task.completed
                ).length;

            html += `
                <button
                    class="
                        calendar-day
                        ${selected ? "selected" : ""}
                        ${today ? "today" : ""}
                        ${hasTasks ? "has-tasks" : ""}
                    "
                    type="button"
                    data-date="${date}"
                >
                    <span class="calendar-number">
                        ${day}
                    </span>

                    ${
                        hasTasks
                            ? `
                                <span class="calendar-indicator">
                                    <i></i>
                                    ${
                                        completedTasks > 0
                                            ? `<b>${completedTasks}</b>`
                                            : ""
                                    }
                                </span>
                            `
                            : ""
                    }
                </button>
            `;
        }

        const totalCells =
            firstWeekday + daysInMonth;

        const remaining =
            Math.ceil(totalCells / 7) * 7 -
            totalCells;

        for (
            let day = 1;
            day <= remaining;
            day++
        ) {
            html += `
                <button
                    class="calendar-day muted"
                    type="button"
                    disabled
                >
                    <span>${day}</span>
                </button>
            `;
        }

        container.innerHTML = html;

        container
            .querySelectorAll(
                ".calendar-day[data-date]"
            )
            .forEach(button => {
                button.addEventListener(
                    "click",
                    () => {
                        selectCalendarDate(
                            button.dataset.date
                        );
                    }
                );
            });

        state.calendarLoading = false;
    }

    async function selectCalendarDate(date) {
        state.selectedDate = date;

        await loadTasksForSelectedDate();

        renderCalendar();

        if (state.activeView === "calendar") {
            renderCalendarSelectedDay();
        }

        updateDateHeader();

        if (isToday(date)) {
            toast(
                "Открыт сегодняшний день",
                "success"
            );
        }
    }

    function renderCalendarSelectedDay() {
        const existing =
            document.querySelector(
                ".calendar-selected-summary"
            );

        existing?.remove();

        const calendarPanel =
            $("#calendarPanel") ||
            $("#calendarDays")?.closest(".card");

        if (!calendarPanel) return;

        const wrapper =
            document.createElement("div");

        wrapper.className =
            "calendar-selected-summary";

        const completed =
            state.tasks.filter(
                task => task.completed
            ).length;

        wrapper.innerHTML = `
            <div>
                <span class="calendar-summary-label">
                    Выбранный день
                </span>

                <strong>
                    ${escapeHTML(
                        formatReadableDate(
                            state.selectedDate
                        )
                    )}
                </strong>
            </div>

            <div class="calendar-summary-count">
                <strong>${state.tasks.length}</strong>
                <span>задач</span>
            </div>

            <button
                class="secondary-button"
                id="calendarOpenDayButton"
            >
                Открыть день
            </button>
        `;

        calendarPanel.appendChild(wrapper);

        $("#calendarOpenDayButton")
            ?.addEventListener(
                "click",
                () => {
                    state.activeView = "today";
                    updateView();
                }
            );
    }

    /* =====================================================
       STATS
    ===================================================== */

    function renderStats() {
        const today = parseDate(
            state.selectedDate
        );

        const start = new Date(today);

        const dayOfWeek =
            (start.getDay() + 6) % 7;

        start.setDate(
            start.getDate() - dayOfWeek
        );

        let completedCount = 0;

        for (let i = 0; i < 7; i++) {
            const date = new Date(start);

            date.setDate(
                start.getDate() + i
            );

            const key = formatDate(date);

            completedCount +=
                state.allTasks.filter(
                    task =>
                        task.task_date === key &&
                        task.completed
                ).length;
        }

        setText(
            "#weekCompletedCount",
            completedCount
        );

        const chart = $("#miniChart");

        if (!chart) return;

        const values = [];

        for (let i = 0; i < 7; i++) {
            const date = new Date(start);

            date.setDate(
                start.getDate() + i
            );

            const key = formatDate(date);

            values.push(
                state.allTasks.filter(
                    task =>
                        task.task_date === key &&
                        task.completed
                ).length
            );
        }

        const max =
            Math.max(...values, 1);

        chart.innerHTML = values
            .map(value => `
                <div
                    class="chart-bar"
                    style="height:${Math.max(
                        8,
                        (value / max) * 100
                    )}%"
                    title="${value} выполнено"
                ></div>
            `)
            .join("");
    }

    /* =====================================================
       FAVORITES
    ===================================================== */

    function renderFavorites() {
        const panel = $("#favoritesPanel");
        const container = $("#favoritesList");

        if (!panel || !container) return;

        const favorites =
            state.allTasks.filter(
                task => task.favorite
            );

        container.innerHTML = "";

        if (!favorites.length) {
            container.innerHTML = `
                <div class="empty-state">
                    <div class="empty-state-icon">☆</div>
                    <strong>Избранных задач пока нет</strong>
                    <span>
                        Добавляй важные задачи в избранное,
                        чтобы быстро находить их здесь.
                    </span>
                </div>
            `;

            return;
        }

        favorites.forEach(task => {
            const item =
                createFavoriteElement(task);

            container.appendChild(item);
        });
    }

    function createFavoriteElement(task) {
        const item =
            document.createElement("div");

        item.className =
            "favorite-task-item";

        item.innerHTML = `
            <div class="favorite-task-date">
                ${escapeHTML(
                    isToday(task.task_date)
                        ? "Сегодня"
                        : formatShortDate(
                            task.task_date
                        )
                )}
            </div>

            <div class="favorite-task-main">
                <strong>
                    ${escapeHTML(task.title)}
                </strong>

                ${
                    task.description
                        ? `
                            <span>
                                ${escapeHTML(
                                    task.description
                                )}
                            </span>
                        `
                        : ""
                }
            </div>

            <button
                class="favorite-task-open"
                type="button"
            >
                Открыть
            </button>
        `;

        item.querySelector(
            ".favorite-task-open"
        )?.addEventListener(
            "click",
            () => {
                state.selectedDate =
                    task.task_date;

                state.activeView = "today";

                updateView();
            }
        );

        return item;
    }

    /* =====================================================
       ALL TASKS
    ===================================================== */

    function renderAllTasks() {
        const container = $("#allTasksList");

        if (!container) return;

        const tasks =
            state.allTasks.filter(
                task =>
                    task.task_date ===
                    state.selectedDate
            );

        container.innerHTML = "";

        if (!tasks.length) {
            container.innerHTML = `
                <div class="empty-state">
                    <div class="empty-state-icon">✓</div>
                    <strong>Задач нет</strong>
                    <span>
                        На выбранную дату ничего не запланировано.
                    </span>
                </div>
            `;

            return;
        }

        tasks.forEach(task => {
            container.appendChild(
                createTaskElement(task)
            );
        });
    }

    /* =====================================================
       SEARCH
    ===================================================== */

    function openSearch() {
        const modal = $("#searchModal");

        if (!modal) return;

        show(modal);

        const input =
            $("#searchInput");

        if (input) {
            input.value = "";
            input.focus();
        }

        renderSearchResults([]);
    }

    function closeSearch() {
        hide($("#searchModal"));
    }

    function searchTasks(query) {
        const value =
            query.trim().toLowerCase();

        if (!value) {
            renderSearchResults([]);
            return;
        }

        const results =
            state.allTasks.filter(task => {
                const title =
                    String(
                        task.title || ""
                    ).toLowerCase();

                const description =
                    String(
                        task.description || ""
                    ).toLowerCase();

                return (
                    title.includes(value) ||
                    description.includes(value)
                );
            });

        state.searchResults = results;

        renderSearchResults(results);
    }

    function renderSearchResults(results) {
        const container =
            $("#searchResults");

        if (!container) return;

        if (!results.length) {
            container.innerHTML = `
                <div class="search-empty">
                    Начни вводить название задачи
                </div>
            `;

            return;
        }

        container.innerHTML =
            results
                .slice(0, 20)
                .map(
                    task => `
                        <button
                            class="search-result"
                            type="button"
                            data-task-id="${escapeHTML(
                                task.id
                            )}"
                        >
                            <span
                                class="
                                    search-result-check
                                    ${
                                        task.completed
                                            ? "done"
                                            : ""
                                    }
                                "
                            >
                                ${
                                    task.completed
                                        ? "✓"
                                        : ""
                                }
                            </span>

                            <span class="search-result-main">
                                <strong>
                                    ${escapeHTML(
                                        task.title
                                    )}
                                </strong>

                                <small>
                                    ${escapeHTML(
                                        isToday(
                                            task.task_date
                                        )
                                            ? "Сегодня"
                                            : formatShortDate(
                                                task.task_date
                                            )
                                    )}
                                </small>
                            </span>
                        </button>
                    `
                )
                .join("");

        container
            .querySelectorAll(
                ".search-result"
            )
            .forEach(button => {
                button.addEventListener(
                    "click",
                    () => {
                        const task =
                            state.allTasks.find(
                                item =>
                                    String(
                                        item.id
                                    ) ===
                                    String(
                                        button.dataset.taskId
                                    )
                            );

                        if (!task) return;

                        state.selectedDate =
                            task.task_date;

                        state.activeView =
                            "today";

                        closeSearch();
                        updateView();
                    }
                );
            });
    }

    /* =====================================================
       VIEW MANAGEMENT
    ===================================================== */

    async function updateView() {
        updateNavigation();

        /*
         * TODAY
         */
        if (state.activeView === "today") {
            show($("#dashboard"));

            hide($("#favoritesPanel"));
            hide($("#allTasksPanel"));

            renderTodayView();

            await loadTasksForSelectedDate();

            await loadNote();

            renderStats();

            return;
        }

        /*
         * TASKS
         */
        if (state.activeView === "tasks") {
            hide($("#dashboard"));
            hide($("#favoritesPanel"));
            show($("#allTasksPanel"));

            await loadAllTasks();

            renderAllTasks();

            return;
        }

        /*
         * CALENDAR
         */
        if (state.activeView === "calendar") {
            show($("#dashboard"));
            hide($("#favoritesPanel"));
            hide($("#allTasksPanel"));

            /*
             * Календарь — отдельный режим.
             * На нём мы НЕ просто показываем Today.
             */
            renderCalendar();

            await loadAllTasks();

            renderCalendar();

            renderCalendarSelectedDay();

            return;
        }

        /*
         * FAVORITES
         */
        if (state.activeView === "favorites") {
            hide($("#dashboard"));
            hide($("#allTasksPanel"));
            show($("#favoritesPanel"));

            await loadAllTasks();

            renderFavorites();

            return;
        }

        /*
         * SETTINGS
         */
        if (state.activeView === "settings") {
            hide($("#dashboard"));
            hide($("#favoritesPanel"));
            hide($("#allTasksPanel"));

            openSettings();

            return;
        }
    }

    function renderTodayView() {
        updateDateHeader();

        setText(
            "#welcomeGreeting",
            getGreeting()
        );

        /*
         * На странице Today календарь показывается
         * как небольшой календарный блок,
         * а не как сама страница.
         */
        renderMiniTodayCalendar();
    }

    function updateDateHeader() {
        const date =
            parseDate(state.selectedDate);

        setText(
            "#dateLabel",
            date.toLocaleDateString(
                "ru-RU",
                {
                    weekday: "long",
                    day: "numeric",
                    month: "long"
                }
            )
        );

        if (state.activeView === "today") {
            setText(
                "#breadcrumbMain",
                isToday(state.selectedDate)
                    ? "Сегодня"
                    : "День"
            );

            setText(
                "#breadcrumbSub",
                isToday(state.selectedDate)
                    ? "Твой план на сегодня"
                    : formatReadableDate(
                        state.selectedDate
                    )
            );
        }

        setText(
            "#tasksSubtitle",
            isToday(state.selectedDate)
                ? "План на сегодня"
                : `План на ${formatShortDate(
                    state.selectedDate
                )}`
        );
    }

    function renderMiniTodayCalendar() {
        /*
         * Ничего не ломаем, если мини-календарь
         * не предусмотрен текущим index.html.
         */
    }

    function updateNavigation() {
        $$(".nav-item[data-view]")
            .forEach(item => {
                item.classList.toggle(
                    "active",
                    item.dataset.view ===
                    state.activeView
                );
            });

        renderLists();
    }

    /* =====================================================
       SETTINGS
    ===================================================== */

    function openSettings() {
        const modal =
            $("#settingsModal");

        if (modal) {
            show(modal);
        }
    }

    /* =====================================================
       CALENDAR NAVIGATION
    ===================================================== */

    function previousMonth() {
        state.calendarDate.setMonth(
            state.calendarDate.getMonth() - 1
        );

        renderCalendar();
    }

    function nextMonth() {
        state.calendarDate.setMonth(
            state.calendarDate.getMonth() + 1
        );

        renderCalendar();
    }

    function goToday() {
        state.selectedDate =
            formatDate(new Date());

        state.calendarDate =
            new Date();

        state.activeView =
            "today";

        updateView();
    }

    /* =====================================================
       MOBILE
    ===================================================== */

    function openSidebarMobile() {
        $("#sidebar")?.classList.add("mobile-open");
        $("#sidebarOverlay")?.classList.add("show");
        document.body.classList.add("sidebar-open");
    }

    function closeSidebarMobile() {
        $("#sidebar")?.classList.remove("mobile-open");
        $("#sidebarOverlay")?.classList.remove("show");
        document.body.classList.remove("sidebar-open");
    }

    /* =====================================================
       MODALS
    ===================================================== */

    function closeAllModals() {
        [
            "#taskModal",
            "#listModal",
            "#searchModal",
            "#settingsModal",
            "#notificationPopover"
        ].forEach(selector => {
            const element = $(selector);

            if (element) {
                hide(element);
            }
        });

        document
            .querySelectorAll(
                ".task-actions-popup"
            )
            .forEach(element => element.remove());

        state.editingTaskId = null;
        state.editingListId = null;
    }

    /* =====================================================
       APPLICATION REFRESH
    ===================================================== */

    async function refreshApplication() {
        if (!state.user) return;

        await loadProfile();
        await loadLists();
        await createDefaultLists();

        await loadAllTasks();

        await updateView();

        renderStats();
        updateTaskBadge();
    }

    /* =====================================================
       EVENTS
    ===================================================== */

    function bindEvents() {
        /*
         * AUTH FORM
         */
        $("#authForm")?.addEventListener(
            "submit",
            async event => {
                event.preventDefault();

                const email =
                    $("#authEmail")?.value.trim();

                const password =
                    $("#authPassword")?.value;

                const displayName =
                    $("#displayName")?.value.trim();

                const message =
                    $("#authMessage");

                if (!email || !password) {
                    if (message) {
                        message.textContent =
                            "Заполни email и пароль.";
                    }

                    return;
                }

                try {
                    const button =
                        $("#authSubmitButton");

                    if (button) {
                        button.disabled = true;
                        button.dataset.originalText =
                            button.textContent;

                        button.textContent =
                            state.authMode === "login"
                                ? "Входим..."
                                : "Создаём аккаунт...";
                    }

                    if (
                        state.authMode === "login"
                    ) {
                        await login(
                            email,
                            password
                        );
                    } else {
                        await register(
                            email,
                            password,
                            displayName
                        );
                    }

                } catch (error) {
                    if (message) {
                        message.textContent =
                            error.message;
                    }

                    console.error(error);

                } finally {
                    const button =
                        $("#authSubmitButton");

                    if (button) {
                        button.disabled = false;

                        button.textContent =
                            button.dataset.originalText ||
                            "Войти";
                    }
                }
            }
        );

        /*
         * AUTH MODE
         */
        $("#authModeSwitch")?.addEventListener(
            "click",
            () => {
                state.authMode =
                    state.authMode === "login"
                        ? "register"
                        : "login";

                updateAuthUI();
            }
        );

        /*
         * PASSWORD
         */
        $("#togglePassword")?.addEventListener(
            "click",
            () => {
                const input =
                    $("#authPassword");

                if (!input) return;

                input.type =
                    input.type === "password"
                        ? "text"
                        : "password";
            }
        );

        /*
         * NAV
         */
        $$(".nav-item[data-view]")
            .forEach(item => {
                item.addEventListener(
                    "click",
                    () => {
                        const view =
                            item.dataset.view;

                        if (!view) return;

                        state.activeView =
                            view;

                        closeSidebarMobile();

                        updateView();
                    }
                );
            });

        /*
         * NEW TASK
         */
        $("#newTaskButton")?.addEventListener(
            "click",
            () => openTaskModal()
        );

        $("#addTaskButton")?.addEventListener(
            "click",
            () => openTaskModal()
        );

        /*
         * TASK MODAL
         */
        $("#taskForm")?.addEventListener(
            "submit",
            event => {
                event.preventDefault();
                saveTask();
            }
        );

        $("#closeTaskModal")?.addEventListener(
            "click",
            closeTaskModal
        );

        $("#cancelTaskButton")?.addEventListener(
            "click",
            closeTaskModal
        );

        /*
         * CALENDAR
         */
        $("#prevMonthButton")?.addEventListener(
            "click",
            previousMonth
        );

        $("#nextMonthButton")?.addEventListener(
            "click",
            nextMonth
        );

        $("#calendarTodayButton")?.addEventListener(
            "click",
            goToday
        );

        /*
         * NOTES
         */
        $("#noteInput")?.addEventListener(
            "input",
            scheduleNoteSave
        );

        $("#saveNoteButton")?.addEventListener(
            "click",
            saveNote
        );

        /*
         * SEARCH
         */
        $("#searchButton")?.addEventListener(
            "click",
            openSearch
        );

        $("#searchInput")?.addEventListener(
            "input",
            event => {
                searchTasks(
                    event.target.value
                );
            }
        );

        $("#closeSearchModal")?.addEventListener(
            "click",
            closeSearch
        );

        /*
         * LOGOUT
         */
        $("#logoutButton")?.addEventListener(
            "click",
            logout
        );

        /*
         * MOBILE
         */
        $("#mobileMenuButton")?.addEventListener(
            "click",
            openSidebarMobile
        );

        $("#closeSidebarButton")?.addEventListener(
            "click",
            closeSidebarMobile
        );

        $("#sidebarOverlay")?.addEventListener(
            "click",
            closeSidebarMobile
        );

        /*
         * CLOSE BUTTONS
         */
        $$("[data-close-modal]")
            .forEach(button => {
                button.addEventListener(
                    "click",
                    () => {
                        const target =
                            button.dataset.closeModal;

                        if (target) {
                            hide($(target));
                        }
                    }
                );
            });

        /*
         * ESC
         */
        document.addEventListener(
            "keydown",
            event => {
                if (event.key === "Escape") {
                    closeAllModals();
                    closeSidebarMobile();
                }

                if (
                    event.key.toLowerCase() === "n" &&
                    !isTypingTarget(event.target)
                ) {
                    event.preventDefault();
                    openTaskModal();
                }

                if (
                    event.key === "/" &&
                    !isTypingTarget(event.target)
                ) {
                    event.preventDefault();
                    openSearch();
                }
            }
        );

        /*
         * CLICK OUTSIDE MODALS
         */
        $$(".modal-overlay").forEach(
            overlay => {
                overlay.addEventListener(
                    "click",
                    event => {
                        if (
                            event.target ===
                            overlay
                        ) {
                            hide(overlay);
                        }
                    }
                );
            }
        );
    }

    function isTypingTarget(element) {
        if (!element) return false;

        const tag =
            element.tagName?.toLowerCase();

        return (
            tag === "input" ||
            tag === "textarea" ||
            tag === "select" ||
            element.isContentEditable
        );
    }

    function updateAuthUI() {
        const isRegister =
            state.authMode === "register";

        setText(
            "#authTitle",
            isRegister
                ? "Создай свой Daily"
                : "С возвращением"
        );

        setText(
            "#authSubmitButton",
            isRegister
                ? "Создать аккаунт"
                : "Войти"
        );

        setText(
            "#authModeSwitch",
            isRegister
                ? "У меня уже есть аккаунт"
                : "Создать аккаунт"
        );

        const displayName =
            $("#displayNameField");

        if (displayName) {
            displayName.style.display =
                isRegister
                    ? ""
                    : "none";
        }
    }

    /* =====================================================
       APP SHELL
    ===================================================== */

    function showApplication() {
        hide($("#loadingScreen"));
        hide($("#authScreen"));
        show($("#appShell"));
    }

    function showAuth() {
        hide($("#loadingScreen"));
        hide($("#appShell"));
        show($("#authScreen"));

        updateAuthUI();
    }

    /* =====================================================
       AUTH STATE
    ===================================================== */

    supabaseClient.auth.onAuthStateChange(
        async (_event, session) => {
            state.user =
                session?.user || null;

            if (state.user) {
                showApplication();

                await refreshApplication();

            } else {
                showAuth();
            }
        }
    );

    /* =====================================================
       INIT
    ===================================================== */

    async function init() {
        bindEvents();

        updateAuthUI();

        const {
            data,
            error
        } =
            await supabaseClient.auth.getSession();

        if (error) {
            console.error(
                "Ошибка получения сессии:",
                error
            );

            showAuth();

            return;
        }

        state.user =
            data.session?.user || null;

        if (!state.user) {
            showAuth();
            return;
        }

        showApplication();

        await refreshApplication();
    }

    /* =====================================================
       START
    ===================================================== */

    document.addEventListener(
        "DOMContentLoaded",
        init
    );

})();
