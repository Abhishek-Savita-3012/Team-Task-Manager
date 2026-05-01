const express = require('express');
const { body, param } = require('express-validator');
const {
  listProjects,
  createProject,
  getProject,
  updateProject,
  deleteProject
} = require('../controllers/projectController');
const { protect } = require('../middleware/authMiddleware');
const validate = require('../middleware/validate');

const router = express.Router();

const projectValidation = [
  body('name').trim().isLength({ min: 2, max: 120 }).withMessage('Project name must be 2-120 characters'),
  body('description').optional().trim().isLength({ max: 1000 }).withMessage('Description is too long'),
  body('members').optional().isArray().withMessage('Members must be an array'),
  body('members.*').optional().isMongoId().withMessage('Each member must be a valid user id')
];

router.use(protect);

router
  .route('/')
  .get(listProjects)
  .post(projectValidation, validate, createProject);

router
  .route('/:id')
  .get(param('id').isMongoId().withMessage('Valid project id is required'), validate, getProject)
  .put(
    [
      param('id').isMongoId().withMessage('Valid project id is required'),
      body('name').optional().trim().isLength({ min: 2, max: 120 }).withMessage('Project name must be 2-120 characters'),
      body('description').optional().trim().isLength({ max: 1000 }).withMessage('Description is too long'),
      body('members').optional().isArray().withMessage('Members must be an array'),
      body('members.*').optional().isMongoId().withMessage('Each member must be a valid user id')
    ],
    validate,
    updateProject
  )
  .delete(param('id').isMongoId().withMessage('Valid project id is required'), validate, deleteProject);

module.exports = router;
