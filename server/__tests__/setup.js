require('dotenv').config({ path: require('path').join(__dirname, '../.env') });

// Ensure JWT_SECRET is set for tests
if (!process.env.JWT_SECRET) {
  process.env.JWT_SECRET = 'test-secret-for-jest';
}
