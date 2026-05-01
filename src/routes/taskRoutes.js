const express = require('express');
const { body, param, query } = require('express-validator');
const { listTasks, createTask, updateTask, deleteTask } = require('../controllers/taskController');
const { protect } = require('../middleware/authMiddleware');
const validate = require('../middleware/validate');

const router = express.Router();

const statusValidation = () => body('status').optional().isIn(['Todo', 'In Progress', 'Done']).withMessage('Invalid status');
const priorityValidation = () => body('priority').optional().isIn(['Low', 'Medium', 'High']).withMessage('Invalid priority');

router.use(protect);

router
  .route('/')
  .get(
    [
      query('project').optional().isMongoId().withMessage('Project filter must be a valid id'),
      query('assignedTo').optional().isMongoId().withMessage('Assignee filter must be a valid user id'),
      query('status').optional().isIn(['Todo', 'In Progress', 'Done']).withMessage('Invalid status filter')
    ],
    validate,
    listTasks
  )
  .post(
    [
      body('title').trim().isLength({ min: 2, max: 160 }).withMessage('Task title must be 2-160 characters'),
      body('description').optional().trim().isLength({ max: 1200 }).withMessage('Description is too long'),
      statusValidation(),
      priorityValidation(),
      body('dueDate').isISO8601().withMessage('A valid due date is required'),
      body('project').isMongoId().withMessage('A valid project id is required'),
      body('assignedTo').isMongoId().withMessage('A valid assignee id is required')
    ],
    validate,
    createTask
  );

router
  .route('/:id')
  .put(
    [
      param('id').isMongoId().withMessage('Valid task id is required'),
      body('title').optional().trim().isLength({ min: 2, max: 160 }).withMessage('Task title must be 2-160 characters'),
      body('description').optional().trim().isLength({ max: 1200 }).withMessage('Description is too long'),
      statusValidation(),
      priorityValidation(),
      body('dueDate').optional().isISO8601().withMessage('Due date must be valid'),
      body('assignedTo').optional().isMongoId().withMessage('Assignee must be a valid user id')
    ],
    validate,
    updateTask
  )
  .delete(param('id').isMongoId().withMessage('Valid task id is required'), validate, deleteTask);

module.exports = router;
