import express from 'express';
import { 
  getAllEndUsers, 
  getEndUserById 
} from '../controllers/deviceController';

const router = express.Router();

// Get all end users
router.get('/', getAllEndUsers);

// Get single end user by ID
router.get('/:id', getEndUserById);

export default router;