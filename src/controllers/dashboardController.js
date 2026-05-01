const Project = require('../models/Project');
const Task = require('../models/Task');

const dashboard = async (req, res, next) => {
  try {
    const projectFilter = req.user.role === 'Admin' ? {} : { members: req.user._id };
    const projects = await Project.find(projectFilter).select('_id name');
    const projectIds = projects.map((project) => project._id);
    const taskFilter = req.user.role === 'Admin' ? {} : { project: { $in: projectIds } };
    const now = new Date();

    const [totalTasks, todo, inProgress, done, overdue, myTasks] = await Promise.all([
      Task.countDocuments(taskFilter),
      Task.countDocuments({ ...taskFilter, status: 'Todo' }),
      Task.countDocuments({ ...taskFilter, status: 'In Progress' }),
      Task.countDocuments({ ...taskFilter, status: 'Done' }),
      Task.countDocuments({ ...taskFilter, status: { $ne: 'Done' }, dueDate: { $lt: now } }),
      Task.countDocuments({ ...taskFilter, assignedTo: req.user._id })
    ]);

    const upcoming = await Task.find({
      ...taskFilter,
      status: { $ne: 'Done' },
      dueDate: { $gte: now }
    })
      .populate('project', 'name')
      .populate('assignedTo', 'name email role')
      .sort({ dueDate: 1 })
      .limit(6);

    res.json({
      projects: projects.length,
      totalTasks,
      myTasks,
      status: { todo, inProgress, done },
      overdue,
      upcoming
    });
  } catch (error) {
    next(error);
  }
};

module.exports = { dashboard };
