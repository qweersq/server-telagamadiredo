const bcrypt = require('bcrypt');

class PasswordHelper {
  static async comparePasswords(plainPassword, hashedPassword) {
    try {
      return await bcrypt.compare(plainPassword, hashedPassword);
    } catch (error) {
      throw new Error(error.message);
    }
  }
}

module.exports = PasswordHelper;