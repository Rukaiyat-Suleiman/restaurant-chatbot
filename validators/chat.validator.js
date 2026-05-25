import Joi from "joi";

export const chatMessageSchema = Joi.object({
  message: Joi.string()
    .trim()
    .min(1)
    .max(500)
    .required()
    .messages({
      "string.empty": "Message cannot be empty.",
      "string.min": "Message cannot be empty.",
      "string.max": "Message is too long (maximum 500 characters).",
      "any.required": "Message is required.",
    }),
});
