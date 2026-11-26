import ApiError from '../utils/ApiError.js';

export default function validate(schema) {
  return (req, _res, next) => {
    const result = schema.safeParse(req.body);
    if (!result.success) {
      const issues = result.error.issues.map((issue) => ({
        path: issue.path.join('.'),
        message: issue.message,
      }));
      const firstMessage = issues[0]?.message || 'Validation failed';
      return next(new ApiError(400, firstMessage, issues));
    }
    req.body = result.data;
    return next();
  };
}
