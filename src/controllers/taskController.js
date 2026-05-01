const Project = require('../models/Project');
const Task = require('../models/Task');

const isAdmin = (user) => user.role === 'Admin';

const canAccessProject = (project, user) => {
  return isAdmin(user) || project.members.some((memberId) => memberId.equals(user._id));
};

const canManageTask = (task, project, user) => {
  return (
    isAdmin(user) ||
    project.owner.equals(user._id) ||
    task.createdBy.equals(user._id) ||
    task.assignedTo.equals(user._id)
  );
};

const findAccessibleProject = async (projectId, user) => {
  const project = await Project.findById(projectId);

  if (!project) {
    const error = new Error('Project not found');
    error.statusCode = 404;
    throw error;
  }

  if (!canAccessProject(project, user)) {
    const error = new Error('You are not a member of this project');
    error.statusCode = 403;
    throw error;
  }

  return project;
};

const listTasks = async (req, res, next) => {
  try {
    const filter = {};

    if (req.query.project) {
      await findAccessibleProject(req.query.project, req.user);
      filter.project = req.query.project;
    } else if (!isAdmin(req.user)) {
      const projects = await Project.find({ members: req.user._id }).select('_id');
      filter.project = { $in: projects.map((project) => project._id) };
    }

    if (req.query.status) filter.status = req.query.status;
    if (req.query.assignedTo) filter.assignedTo = req.query.assignedTo;

    const tasks = await Task.find(filter)
      .populate('project', 'name')
      .populate('assignedTo', 'name email role')
      .populate('createdBy', 'name email role')
      .sort({ dueDate: 1, createdAt: -1 });

    res.json(tasks);
  } catch (error) {
    next(error);
  }
};

const createTask = async (req, res, next) => {
  try {
    const { title, description = '', status, priority, dueDate, project, assignedTo } = req.body;
    const foundProject = await findAccessibleProject(project, req.user);

    if (!foundProject.members.some((memberId) => memberId.equals(assignedTo))) {
      res.status(400);
      throw new Error('Assigned user must be a member of the project');
    }

    const task = await Task.create({
      title,
      description,
      status,
      priority,
      dueDate,
      project,
      assignedTo,
      createdBy: req.user._id
    });

    const populated = await task.populate([
      { path: 'project', select: 'name' },
      { path: 'assignedTo', select: 'name email role' },
      { path: 'createdBy', select: 'name email role' }
    ]);

    res.status(201).json(populated);
  } catch (error) {
    next(error);
  }
};

const updateTask = async (req, res, next) => {
  try {
    const task = await Task.findById(req.params.id);

    if (!task) {
      res.status(404);
      throw new Error('Task not found');
    }

    const project = await findAccessibleProject(task.project, req.user);

    if (!canManageTask(task, project, req.user)) {
      res.status(403);
      throw new Error('You cannot update this task');
    }

    const allowedFields = ['title', 'description', 'status', 'priority', 'dueDate'];
    allowedFields.forEach((field) => {
      if (req.body[field] !== undefined) task[field] = req.body[field];
    });

    if (req.body.assignedTo !== undefined) {
      if (!project.members.some((memberId) => memberId.equals(req.body.assignedTo))) {
        res.status(400);
        throw new Error('Assigned user must be a member of the project');
      }
      task.assignedTo = req.body.assignedTo;
    }

    await task.save();

    const populated = await task.populate([
      { path: 'project', select: 'name' },
      { path: 'assignedTo', select: 'name email role' },
      { path: 'createdBy', select: 'name email role' }
    ]);

    res.json(populated);
  } catch (error) {
    next(error);
  }
};

const deleteTask = async (req, res, next) => {
  try {
    const task = await Task.findById(req.params.id);

    if (!task) {
      res.status(404);
      throw new Error('Task not found');
    }

    const project = await findAccessibleProject(task.project, req.user);

    if (!isAdmin(req.user) && !project.owner.equals(req.user._id) && !task.createdBy.equals(req.user._id)) {
      res.status(403);
      throw new Error('Only admins, project owners, or task creators can delete this task');
    }

    await task.deleteOne();
    res.json({ message: 'Task deleted' });
  } catch (error) {
    next(error);
  }
};

module.exports = { listTasks, createTask, updateTask, deleteTask };
