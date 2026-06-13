/**
 * Generates a random 15-character string to be used as an ID
 * 
 * The string is generated from a pool of alphanumeric characters and symbols.
 * The generated string is always 15 characters long.
 * 
 * @returns {Promise<string>} the generated ID
 */


export const generateId = async () : Promise<string> => {
  
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*()_+-=[]{}|;:,.<>?/~-≤≥';
    let result = '';
    for (let i = 0; i < 15; i++) {
      const randomIndex = Math.floor(Math.random() * chars.length);
      result += chars[randomIndex];
    }
    return result;  
}