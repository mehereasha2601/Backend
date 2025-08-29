/**
 * @fileoverview Profile API Routes - Express Router
 * @description Implements Profile API endpoints with comprehensive validation,
 * security measures, and error handling. Supports user identification via
 * phone number or userId with mandatory field validations.
 * @author Easha from OK AI team
 * @version 1.0.0
 * @since 2025-01-26
 */

const express = require('express');
const { createClient } = require('@supabase/supabase-js');
const Joi = require('joi');

const router = express.Router();

/**
 * Supabase client instance
 * @type {SupabaseClient}
 */
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_ANON_KEY
);

/**
 * Authentication middleware for Profile API
 * @param {express.Request} req - Express request object
 * @param {express.Response} res - Express response object
 * @param {express.NextFunction} next - Express next function
 */
function authenticateProfileAPI(req, res, next) {
  const authHeader = req.headers.authorization;
  
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({
      success: false,
      error: 'Missing or invalid authorization header. Use: Bearer <token>'
    });
  }
  
  const token = authHeader.substring(7); // Remove 'Bearer ' prefix
  
  // For now, we'll use the same internal token validation
  // In production, this would validate JWT tokens
  const INTERNAL_API_TOKEN = process.env.INTERNAL_API_TOKEN || 'your-secret-token-here';
  
  if (token !== INTERNAL_API_TOKEN) {
    return res.status(403).json({
      success: false,
      error: 'Invalid authentication token'
    });
  }
  
  next();
}

/**
 * Validation schema for Profile creation
 */
const profileSchema = Joi.object({
  // User identification (at least one required)
  phoneNumber: Joi.string()
    .pattern(/^[+]?[1-9]\d{6,14}$/)
    .messages({
      'string.pattern.base': 'Phone number must be in valid international format'
    }),
  
  userId: Joi.string()
    .uuid()
    .messages({
      'string.guid': 'userId must be a valid UUID format'
    }),
  
  // Profile information (all optional but with mandatory validation when provided)
  headline: Joi.string()
    .max(200)
    .trim()
    .messages({
      'string.max': 'Headline cannot exceed 200 characters (received {#value.length} characters)'
    }),
  
  summary: Joi.string()
    .max(3000) // Setting to 3000 as a reasonable default
    .trim()
    .messages({
      'string.max': 'Summary cannot exceed 3000 characters (received {#value.length} characters)'
    }),
  
  skills: Joi.array()
    .items(
      Joi.string()
        .max(100)
        .trim()
        .messages({
          'string.max': 'Each skill cannot exceed 100 characters'
        })
    )
    .max(50)
    .unique()
    .messages({
      'array.max': 'Skills array cannot exceed 50 items',
      'array.unique': 'Duplicate values not allowed in skills array'
    }),
  
  certifications: Joi.array()
    .items(
      Joi.string()
        .max(200)
        .trim()
        .messages({
          'string.max': 'Each certification cannot exceed 200 characters'
        })
    )
    .max(30)
    .unique()
    .messages({
      'array.max': 'Certifications array cannot exceed 30 items',
      'array.unique': 'Duplicate values not allowed in certifications array'
    }),
  
  languages: Joi.array()
    .items(
      Joi.string()
        .max(50)
        .trim()
        .messages({
          'string.max': 'Each language cannot exceed 50 characters'
        })
    )
    .max(20)
    .unique()
    .messages({
      'array.max': 'Languages array cannot exceed 20 items',
      'array.unique': 'Duplicate values not allowed in languages array'
    }),
  
  score: Joi.number()
    .min(0)
    .max(100)
    .custom((value, helpers) => {
      // Check if the number has more than 2 decimal places
      const decimalPlaces = (value.toString().split('.')[1] || '').length;
      if (decimalPlaces > 2) {
        return helpers.error('score.precision');
      }
      return value;
    })
    .messages({
      'number.min': 'Score must be between 0 and 100 (received {#value})',
      'number.max': 'Score must be between 0 and 100 (received {#value})',
      'score.precision': 'Score can have at most 2 decimal places'
    }),
  
  shareUrl: Joi.string()
    .uri()
    .max(500)
    .messages({
      'string.uri': 'shareUrl must be a valid URL format',
      'string.max': 'shareUrl cannot exceed 500 characters'
    })
})
.or('phoneNumber', 'userId')
.messages({
  'object.missing': 'Either userId or phoneNumber is required'
});

/**
 * Validates if user exists by phoneNumber or userId
 * @param {string} phoneNumber - User's phone number
 * @param {string} userId - User's UUID
 * @returns {Promise<{exists: boolean, userId: string|null}>}
 */
async function validateUserExists(phoneNumber, userId) {
  try {
    let query = supabase.from('Users').select('userId');
    
    if (userId) {
      query = query.eq('userId', userId);
    } else if (phoneNumber) {
      query = query.eq('phoneNumber', phoneNumber);
    }
    
    const { data, error } = await query.single();
    
    if (error && error.code !== 'PGRST116') { // PGRST116 = no rows found
      throw error;
    }
    
    return {
      exists: !!data,
      userId: data?.userId || null
    };
  } catch (error) {
    throw new Error(`User validation failed: ${error.message}`);
  }
}

/**
 * Checks if profile already exists for user
 * @param {string} userId - User's UUID
 * @returns {Promise<boolean>}
 */
async function checkProfileExists(userId) {
  try {
    const { data, error } = await supabase
      .from('Profiles')
      .select('userId')
      .eq('userId', userId)
      .single();
    
    if (error && error.code !== 'PGRST116') { // PGRST116 = no rows found
      throw error;
    }
    
    return !!data;
  } catch (error) {
    throw new Error(`Profile existence check failed: ${error.message}`);
  }
}

/**
 * POST /api/profiles - Create a new user profile
 * @route POST /api/profiles
 * @description Creates a new profile for an existing user with comprehensive validation
 * @access Protected (requires Bearer token)
 * @param {Object} req.body - Profile data
 * @param {string} [req.body.phoneNumber] - User's phone number (either this or userId required)
 * @param {string} [req.body.userId] - User's UUID (either this or phoneNumber required)
 * @param {string} [req.body.headline] - Profile headline (max 200 chars)
 * @param {string} [req.body.summary] - Profile summary (max 3000 chars)
 * @param {Array<string>} [req.body.skills] - Skills array (max 50 items, 100 chars each)
 * @param {Array<string>} [req.body.certifications] - Certifications array (max 30 items, 200 chars each)
 * @param {Array<string>} [req.body.languages] - Languages array (max 20 items, 50 chars each)
 * @param {number} [req.body.score] - Profile score (0-100, 2 decimal places)
 * @param {string} [req.body.shareUrl] - Share URL (valid URL, max 500 chars)
 * @returns {Object} 201 - Profile created successfully
 * @returns {Object} 400 - Validation error
 * @returns {Object} 401 - Authentication error
 * @returns {Object} 403 - Authorization error
 * @returns {Object} 404 - User not found
 * @returns {Object} 409 - Profile already exists
 * @returns {Object} 500 - Internal server error
 */
router.post('/profiles', authenticateProfileAPI, async (req, res) => {
  try {
    // Validate request body against schema
    const { error: validationError, value: validatedData } = profileSchema.validate(req.body, {
      abortEarly: false,
      stripUnknown: true
    });

    if (validationError) {
      const errors = validationError.details.map(detail => ({
        field: detail.path.join('.'),
        message: detail.message
      }));

      return res.status(400).json({
        success: false,
        message: 'Validation error',
        errors
      });
    }

    const { phoneNumber, userId, ...profileData } = validatedData;

    // Validate user exists and get userId if using phoneNumber
    let finalUserId;
    try {
      const userValidation = await validateUserExists(phoneNumber, userId);
      
      if (!userValidation.exists) {
        return res.status(404).json({
          success: false,
          message: 'User not found',
          error: {
            code: 'USER_NOT_FOUND',
            identifier: userId || phoneNumber
          }
        });
      }
      
      finalUserId = userValidation.userId;
    } catch (error) {
      console.error('User validation error:', error);
      return res.status(500).json({
        success: false,
        message: 'An error occurred while validating user',
        error: {
          code: 'INTERNAL_ERROR'
        }
      });
    }

    // Check if profile already exists
    try {
      const profileExists = await checkProfileExists(finalUserId);
      
      if (profileExists) {
        return res.status(409).json({
          success: false,
          message: 'Profile already exists for this user',
          error: {
            code: 'DUPLICATE_PROFILE',
            userId: finalUserId
          }
        });
      }
    } catch (error) {
      console.error('Profile existence check error:', error);
      return res.status(500).json({
        success: false,
        message: 'An error occurred while checking profile existence',
        error: {
          code: 'INTERNAL_ERROR'
        }
      });
    }

    // Prepare profile data for insertion
    const profileInsertData = {
      userId: finalUserId,
      headline: profileData.headline || null,
      summary: profileData.summary || null,
      skills: profileData.skills || null,
      certifications: profileData.certifications || null,
      languages: profileData.languages || null,
      score: profileData.score || null,
      shareUrl: profileData.shareUrl || null
    };

    // Insert profile into database
    const { data: createdProfile, error: insertError } = await supabase
      .from('Profiles')
      .insert([profileInsertData])
      .select('*')
      .single();

    if (insertError) {
      console.error('Profile insertion error:', insertError);
      
      // Handle specific database errors
      if (insertError.code === '23505') { // Unique constraint violation
        return res.status(409).json({
          success: false,
          message: 'Profile already exists for this user',
          error: {
            code: 'DUPLICATE_PROFILE',
            userId: finalUserId
          }
        });
      }
      
      return res.status(500).json({
        success: false,
        message: 'An error occurred while creating the profile',
        error: {
          code: 'INTERNAL_ERROR'
        }
      });
    }

    // Return success response with created profile data
    const responseData = {
      userId: createdProfile.userId,
      headline: createdProfile.headline,
      summary: createdProfile.summary,
      skills: createdProfile.skills,
      certifications: createdProfile.certifications,
      languages: createdProfile.languages,
      score: createdProfile.score,
      shareUrl: createdProfile.shareUrl
    };

    res.status(201).json({
      success: true,
      message: 'Profile created successfully',
      data: responseData
    });

    // Log successful creation for monitoring
    console.log(`✅ Profile created for user: ${finalUserId}`);

  } catch (error) {
    console.error('Profile API error:', error);
    res.status(500).json({
      success: false,
      message: 'An error occurred while creating the profile',
      error: {
        code: 'INTERNAL_ERROR'
      }
    });
  }
});

/**
 * Validation schema for Profile fetch request
 */
const fetchProfileSchema = Joi.object({
  phoneNumber: Joi.string()
    .pattern(/^[+]?[1-9]\d{6,14}$/)
    .messages({
      'string.pattern.base': 'Invalid phone number format'
    }),
  
  userId: Joi.string()
    .uuid()
    .messages({
      'string.guid': 'Invalid UUID format'
    })
})
.xor('phoneNumber', 'userId')
.messages({
  'object.missing': 'Must provide either phoneNumber or userId (not both)',
  'object.xor': 'Must provide either phoneNumber or userId (not both)'
});

/**
 * GET /api/profiles - Fetch user profile
 * @route GET /api/profiles
 * @description Retrieves profile details for a user identified by phoneNumber or userId
 * @access Protected (requires Bearer token)
 * @param {string} [req.query.phoneNumber] - User's phone number (either this or userId required)
 * @param {string} [req.query.userId] - User's UUID (either this or phoneNumber required)
 * @returns {Object} 200 - Profile found successfully
 * @returns {Object} 400 - Missing or invalid parameters
 * @returns {Object} 401 - Authentication error
 * @returns {Object} 403 - Authorization error
 * @returns {Object} 404 - Profile or user not found
 * @returns {Object} 500 - Internal server error
 */
router.get('/profiles', authenticateProfileAPI, async (req, res) => {
  try {
    // Validate query parameters
    const { error: validationError, value: validatedData } = fetchProfileSchema.validate(req.query, {
      abortEarly: false,
      stripUnknown: true
    });

    if (validationError) {
      const errors = validationError.details.map(detail => ({
        field: detail.path.join('.'),
        message: detail.message
      }));

      return res.status(400).json({
        success: false,
        message: 'Invalid parameters',
        errors
      });
    }

    const { phoneNumber, userId } = validatedData;

    let profileData;
    let finalUserId;

    if (userId) {
      // Direct lookup by userId
      try {
        const { data: profile, error: profileError } = await supabase
          .from('Profiles')
          .select('*')
          .eq('userId', userId)
          .single();

        if (profileError && profileError.code !== 'PGRST116') { // PGRST116 = no rows found
          throw profileError;
        }

        if (!profile) {
          // Check if user exists but has no profile
          const { data: user, error: userError } = await supabase
            .from('Users')
            .select('userId')
            .eq('userId', userId)
            .single();

          if (userError && userError.code !== 'PGRST116') {
            throw userError;
          }

          if (!user) {
            return res.status(404).json({
              success: false,
              message: 'User not found',
              error: {
                code: 'USER_NOT_FOUND',
                identifier: userId
              }
            });
          } else {
            return res.status(404).json({
              success: false,
              message: 'Profile not found',
              error: {
                code: 'PROFILE_NOT_FOUND',
                identifier: userId
              }
            });
          }
        }

        profileData = profile;
        finalUserId = userId;

      } catch (error) {
        console.error('Profile fetch by userId error:', error);
        return res.status(500).json({
          success: false,
          message: 'An error occurred while fetching the profile',
          error: {
            code: 'INTERNAL_ERROR'
          }
        });
      }

    } else if (phoneNumber) {
      // Lookup by phoneNumber - need to join with Users table
      try {
        const { data: profileWithUser, error: joinError } = await supabase
          .from('Profiles')
          .select(`
            userId, headline, summary, skills, certifications, languages, score, shareUrl,
            Users!inner(phoneNumber)
          `)
          .eq('Users.phoneNumber', phoneNumber)
          .single();

        if (joinError && joinError.code !== 'PGRST116') { // PGRST116 = no rows found
          throw joinError;
        }

        if (!profileWithUser) {
          // Check if user exists but has no profile
          const { data: user, error: userError } = await supabase
            .from('Users')
            .select('userId')
            .eq('phoneNumber', phoneNumber)
            .single();

          if (userError && userError.code !== 'PGRST116') {
            throw userError;
          }

          if (!user) {
            return res.status(404).json({
              success: false,
              message: 'User not found',
              error: {
                code: 'USER_NOT_FOUND',
                identifier: phoneNumber
              }
            });
          } else {
            return res.status(404).json({
              success: false,
              message: 'Profile not found',
              error: {
                code: 'PROFILE_NOT_FOUND',
                identifier: phoneNumber
              }
            });
          }
        }

        // Extract profile data (exclude the Users relation data)
        const { Users, ...profile } = profileWithUser;
        profileData = profile;
        finalUserId = profile.userId;

      } catch (error) {
        console.error('Profile fetch by phoneNumber error:', error);
        return res.status(500).json({
          success: false,
          message: 'An error occurred while fetching the profile',
          error: {
            code: 'INTERNAL_ERROR'
          }
        });
      }
    }

    // Return successful response with profile data
    const responseData = {
      userId: profileData.userId,
      headline: profileData.headline,
      summary: profileData.summary,
      skills: profileData.skills,
      certifications: profileData.certifications,
      languages: profileData.languages,
      score: profileData.score,
      shareUrl: profileData.shareUrl
    };

    res.status(200).json({
      success: true,
      message: 'Profile found',
      data: responseData
    });

    // Log successful fetch for monitoring
    console.log(`✅ Profile fetched for user: ${finalUserId}`);

  } catch (error) {
    console.error('Profile fetch API error:', error);
    res.status(500).json({
      success: false,
      message: 'An error occurred while fetching the profile',
      error: {
        code: 'INTERNAL_ERROR'
      }
    });
  }
});

module.exports = router; 