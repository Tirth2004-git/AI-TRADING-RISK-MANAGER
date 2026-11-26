import mongoose from 'mongoose';
import ApiError from '../utils/ApiError.js';

export default function validateObjectId(paramName = 'id') {
  return (req, _res, next) => {
    const value = req.params[paramName];
    if (!mongoose.isValidObjectId(value)) {
      return next(new ApiError(400, `Invalid ${paramName}: ${value}`));
    }
    return next();
  };
}
