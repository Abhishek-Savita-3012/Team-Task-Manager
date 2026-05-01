const state = {
  token: localStorage.getItem('ttm_token'),
  user: JSON.parse(localStorage.getItem('ttm_user') || 'null'),
  users: [],
  projects: [],
  tasks: [],
  authMode: 'login'
};

const els = {
  authView: document.querySelector('#authView'),
  dashboardView: document.querySelector('#dashboardView'),
  loginTab: document.querySelector('#loginTab'),
  signupTab: document.querySelector('#signupTab'),
  authForm: document.querySelector('#authForm'),
  authSubmit: document.querySelector('#authSubmit'),
  authMessage: document.querySelector('#authMessage'),
  welcomeTitle: document.querySelector('#welcomeTitle'),
  rolePill: document.querySelector('#rolePill'),
  logoutBtn: document.querySelector('#logoutBtn'),
  projectForm: document.querySelector('#projectForm'),
  taskForm: document.querySelector('#taskForm'),
  projectMembers: document.querySelector('#projectMembers'),
  taskProject: document.querySelector('#taskProject'),
  taskAssignee: document.querySelector('#taskAssignee'),
  projectList: document.querySelector('#projectList'),
  taskList: document.querySelector('#taskList'),
  statusFilter: document.querySelector('#statusFilter'),
  globalMessage: document.querySelector('#globalMessage'),
  projectCount: document.querySelector('#projectCount'),
  taskCount: document.querySelector('#taskCount'),
  myTaskCount: document.querySelector('#myTaskCount'),
  overdueCount: document.querySelector('#overdueCount'),
  todoCount: document.querySelector('#todoCount'),
  progressCount: document.querySelector('#progressCount'),
  doneCount: document.querySelector('#doneCount')
};

const api = async (path, options = {}) => {
  const response = await fetch(`/api${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(state.token ? { Authorization: `Bearer ${state.token}` } : {}),
      ...(options.headers || {})
    }
  });

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(data.message || 'Something went wrong');
  }

  return data;
};

const setMessage = (element, message, ok = false) => {
  element.textContent = message;
  element.style.color = ok ? 'var(--good)' : 'var(--danger)';
};

const setAuthMode = (mode) => {
  state.authMode = mode;
  const signup = mode === 'signup';
  document.querySelectorAll('.signup-only').forEach((element) => {
    element.classList.toggle('hidden', !signup);
  });
  els.loginTab.classList.toggle('active', !signup);
  els.signupTab.classList.toggle('active', signup);
  els.authSubmit.textContent = signup ? 'Create account' : 'Login';
  els.authMessage.textContent = '';
};

const saveSession = ({ user, token }) => {
  state.user = user;
  state.token = token;
  localStorage.setItem('ttm_user', JSON.stringify(user));
  localStorage.setItem('ttm_token', token);
};

const clearSession = () => {
  state.user = null;
  state.token = null;
  localStorage.removeItem('ttm_user');
  localStorage.removeItem('ttm_token');
};

const showApp = async () => {
  if (!state.token || !state.user) {
    els.authView.classList.remove('hidden');
    els.dashboardView.classList.add('hidden');
    return;
  }

  els.authView.classList.add('hidden');
  els.dashboardView.classList.remove('hidden');
  els.welcomeTitle.textContent = `Hello, ${state.user.name}`;
  els.rolePill.textContent = state.user.role;
  document.querySelectorAll('.admin-only').forEach((element) => {
    element.classList.toggle('hidden', state.user.role !== 'Admin');
  });

  await refreshAll();
};

const refreshAll = async () => {
  try {
    setMessage(els.globalMessage, '');
    const [projects, tasks, dashboard] = await Promise.all([
      api('/projects'),
      api(`/tasks${els.statusFilter.value ? `?status=${encodeURIComponent(els.statusFilter.value)}` : ''}`),
      api('/dashboard')
    ]);

    state.projects = projects;
    state.tasks = tasks;

    if (state.user.role === 'Admin') {
      state.users = await api('/auth/users');
    } else {
      state.users = uniqueUsersFromProjects(projects);
    }

    renderDashboard(dashboard);
    renderProjectOptions();
    renderUserOptions();
    renderProjects();
    renderTasks();
  } catch (error) {
    setMessage(els.globalMessage, error.message);
    if (error.message.includes('token')) {
      clearSession();
      showApp();
    }
  }
};

const uniqueUsersFromProjects = (projects) => {
  const usersById = new Map();
  projects.forEach((project) => {
    project.members.forEach((member) => usersById.set(member._id, member));
  });
  return [...usersById.values()];
};

const renderDashboard = (dashboard) => {
  els.projectCount.textContent = dashboard.projects;
  els.taskCount.textContent = dashboard.totalTasks;
  els.myTaskCount.textContent = dashboard.myTasks;
  els.overdueCount.textContent = dashboard.overdue;
  els.todoCount.textContent = dashboard.status.todo;
  els.progressCount.textContent = dashboard.status.inProgress;
  els.doneCount.textContent = dashboard.status.done;
};

const renderProjectOptions = () => {
  els.taskProject.innerHTML = state.projects
    .map((project) => `<option value="${project._id}">${escapeHtml(project.name)}</option>`)
    .join('');
};

const renderUserOptions = () => {
  const selectedProject = state.projects.find((project) => project._id === els.taskProject.value) || state.projects[0];
  const assignees = selectedProject?.members?.length ? selectedProject.members : state.users;

  els.taskAssignee.innerHTML = assignees
    .map((user) => `<option value="${user._id}">${escapeHtml(user.name)} (${escapeHtml(user.role)})</option>`)
    .join('');

  els.projectMembers.innerHTML = state.users
    .map((user) => `<option value="${user._id}">${escapeHtml(user.name)} (${escapeHtml(user.role)})</option>`)
    .join('');
};

const renderProjects = () => {
  if (!state.projects.length) {
    els.projectList.innerHTML = '<p class="message">No projects yet.</p>';
    return;
  }

  els.projectList.innerHTML = state.projects
    .map((project) => {
      const memberNames = project.members.map((member) => member.name).join(', ');
      return `
        <article class="item">
          <h3>${escapeHtml(project.name)}</h3>
          <p>${escapeHtml(project.description || 'No description')}</p>
          <div class="meta-row">
            <span class="chip">Owner: ${escapeHtml(project.owner.name)}</span>
            <span class="chip">${project.members.length} members</span>
          </div>
          <p>${escapeHtml(memberNames)}</p>
        </article>
      `;
    })
    .join('');
};

const renderTasks = () => {
  if (!state.tasks.length) {
    els.taskList.innerHTML = '<p class="message">No tasks found.</p>';
    return;
  }

  els.taskList.innerHTML = state.tasks
    .map((task) => {
      const overdue = new Date(task.dueDate) < new Date() && task.status !== 'Done';
      return `
        <article class="item">
          <div>
            <h3>${escapeHtml(task.title)}</h3>
            <p>${escapeHtml(task.description || 'No description')}</p>
          </div>
          <div class="meta-row">
            <span class="chip ${task.status === 'Done' ? 'done' : ''}">${escapeHtml(task.status)}</span>
            <span class="chip ${task.priority.toLowerCase()}">${escapeHtml(task.priority)}</span>
            <span class="chip">${escapeHtml(task.project?.name || 'Project')}</span>
            <span class="chip">Assigned: ${escapeHtml(task.assignedTo?.name || 'Unassigned')}</span>
            <span class="chip ${overdue ? 'high' : ''}">Due: ${formatDate(task.dueDate)}</span>
          </div>
          <div class="task-actions">
            <select data-task-status="${task._id}" aria-label="Update task status">
              <option ${task.status === 'Todo' ? 'selected' : ''}>Todo</option>
              <option ${task.status === 'In Progress' ? 'selected' : ''}>In Progress</option>
              <option ${task.status === 'Done' ? 'selected' : ''}>Done</option>
            </select>
            <button class="ghost-btn" data-delete-task="${task._id}" type="button">Delete</button>
          </div>
        </article>
      `;
    })
    .join('');
};

const formatDate = (value) => {
  return new Intl.DateTimeFormat(undefined, { year: 'numeric', month: 'short', day: 'numeric' }).format(new Date(value));
};

const escapeHtml = (value) => {
  return String(value || '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
};

els.loginTab.addEventListener('click', () => setAuthMode('login'));
els.signupTab.addEventListener('click', () => setAuthMode('signup'));

els.authForm.addEventListener('submit', async (event) => {
  event.preventDefault();
  const formData = new FormData(event.target);
  const payload = Object.fromEntries(formData.entries());

  if (state.authMode === 'login') {
    delete payload.name;
    delete payload.role;
  }

  try {
    const session = await api(`/auth/${state.authMode}`, {
      method: 'POST',
      body: JSON.stringify(payload)
    });
    saveSession(session);
    event.target.reset();
    await showApp();
  } catch (error) {
    setMessage(els.authMessage, error.message);
  }
});

els.logoutBtn.addEventListener('click', () => {
  clearSession();
  showApp();
});

els.projectForm.addEventListener('submit', async (event) => {
  event.preventDefault();
  const formData = new FormData(event.target);
  const members = [...els.projectMembers.selectedOptions].map((option) => option.value);

  try {
    await api('/projects', {
      method: 'POST',
      body: JSON.stringify({
        name: formData.get('name'),
        description: formData.get('description'),
        members
      })
    });
    event.target.reset();
    setMessage(els.globalMessage, 'Project created', true);
    await refreshAll();
  } catch (error) {
    setMessage(els.globalMessage, error.message);
  }
});

els.taskForm.addEventListener('submit', async (event) => {
  event.preventDefault();
  const formData = new FormData(event.target);

  try {
    await api('/tasks', {
      method: 'POST',
      body: JSON.stringify(Object.fromEntries(formData.entries()))
    });
    event.target.reset();
    setMessage(els.globalMessage, 'Task created', true);
    await refreshAll();
  } catch (error) {
    setMessage(els.globalMessage, error.message);
  }
});

els.taskProject.addEventListener('change', renderUserOptions);
els.statusFilter.addEventListener('change', refreshAll);

els.taskList.addEventListener('change', async (event) => {
  const taskId = event.target.dataset.taskStatus;
  if (!taskId) return;

  try {
    await api(`/tasks/${taskId}`, {
      method: 'PUT',
      body: JSON.stringify({ status: event.target.value })
    });
    await refreshAll();
  } catch (error) {
    setMessage(els.globalMessage, error.message);
  }
});

els.taskList.addEventListener('click', async (event) => {
  const taskId = event.target.dataset.deleteTask;
  if (!taskId) return;

  try {
    await api(`/tasks/${taskId}`, { method: 'DELETE' });
    await refreshAll();
  } catch (error) {
    setMessage(els.globalMessage, error.message);
  }
});

setAuthMode('login');
showApp();
