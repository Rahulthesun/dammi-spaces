// scripts/generateToken.js
import dotenv from 'dotenv';
dotenv.config();

import { generateWidgetToken } from '../utils/tokenUtils.js';


const businessId = 'abc123';
const token = generateWidgetToken(businessId);

console.log(`Generated token for ${businessId}:`);
console.log(token);
