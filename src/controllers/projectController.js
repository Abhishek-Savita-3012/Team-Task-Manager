const mongoose = require('mongoose');
const Project = require('../models/Project');
const Task = require('../models/Task');
const User = require('../models/User');

const isAdmin = (user) => user.role === 'Admin';

const accessibleProjectQuery = (user) => {
  if (isAdmin(user)) return {};
  return { members: user._id };
};

const ensureUsersExist = async (memberIds) => {
  const uniqueIds = [...new Set(memberIds.map(String))];
  const count = await User.countDocuments({ _id: { $in: uniqueIds } });
  return count === uniqueIds.length;
};

const listProjects = async (req, res, next) => {
  try {
    const projects = await Project.find(accessibleProjectQuery(req.user))
      .populate('owner', 'name email role')
      .populate('members', 'name email role')
      .sort({ updatedAt: -1 });

    res.json(projects);
  } catch (error) {
    next(error);
  }
};

const createProject = async (req, res, next) => {
  try {
    const { name, description = '', members = [] } = req.body;
    const memberIds = [...new Set([req.user._id.toString(), ...members.map(String)])];

    if (!(await ensureUsersExist(memberIds))) {
      res.status(400);
      throw new Error('One or more project members do not exist');
    }

    const project = await Project.create({
      name,
      description,
      owner: req.user._id,
      members: memberIds
    });

    const populated = await project.populate([
      { path: 'owner', select: 'name email role' },
      { path: 'members', select: 'name email role' }
    ]);

    res.status(201).json(populated);
  } catch (error) {
    if (error.code === 11000) {
      res.status(409);
      return next(new Error('You already have a project with this name'));
    }
    next(error);
  }
};

const getProject = async (req, res, next) => {
  try {
    const project = await Project.findById(req.params.id)
      .populate('owner', 'name email role')
      .populate('members', 'name email role');

    if (!project) {
      res.status(404);
      throw new Error('Project not found');
    }

    const canView = isAdmin(req.user) || project.members.some((member) => member._id.equals(req.user._id));
    if (!canView) {
      res.status(403);
      throw new Error('You are not a member of this project');
    }

    res.json(project);
  } catch (error) {
    next(error);
  }
};

const updateProject = async (req, res, next) => {
  try {
    const { name, description, members } = req.body;
    const project = await Project.findById(req.params.id);

    if (!project) {
      res.status(404);
      throw new Error('Project not found');
    }

    if (!isAdmin(req.user) && !project.owner.equals(req.user._id)) {
      res.status(403);
      throw new Error('Only admins or the project owner can update this project');
    }

    if (name !== undefined) project.name = name;
    if (description !== undefined) project.description = description;

    if (members !== undefined) {
      const memberIds = [...new Set([project.owner.toString(), ...members.map(String)])];
      if (!(await ensureUsersExist(memberIds))) {
        res.status(400);
        throw new Error('One or more project members do not exist');
      }
      project.members = memberIds.map((id) => new mongoose.Types.ObjectId(id));
    }

    await project.save();

    const populated = await project.populate([
      { path: 'owner', select: 'name email role' },
      { path: 'members', select: 'name email role' }
    ]);

    res.json(populated);
  } catch (error) {
    next(error);
  }
};

const deleteProject = async (req, res, next) => {
  try {
    const project = await Project.findById(req.params.id);

    if (!project) {
      res.status(404);
      throw new Error('Project not found');
    }

    if (!isAdmin(req.user) && !project.owner.equals(req.user._id)) {
      res.status(403);
      throw new Error('Only admins or the project owner can delete this project');
    }

    await Task.deleteMany({ project: project._id });
    await project.deleteOne();

    res.json({ message: 'Project and related tasks deleted' });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  listProjects,
  createProject,
  getProject,
  updateProject,
  deleteProject
};
