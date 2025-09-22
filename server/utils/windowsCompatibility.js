const os = require('os');
const path = require('path');
const fs = require('fs');
const { execSync, spawn } = require('child_process');

/**
 * Windows Compatibility Utilities
 * Provides cross-platform compatibility for file operations, commands, and paths
 */

const isWindows = os.platform() === 'win32';
const isMacOS = os.platform() === 'darwin';
const isLinux = os.platform() === 'linux';

/**
 * Get the appropriate command for the current platform
 * @param {string} unixCommand - Command to run on Unix-like systems
 * @param {string} windowsCommand - Command to run on Windows
 * @returns {string} Platform-appropriate command
 */
const getPlatformCommand = (unixCommand, windowsCommand) => {
  return isWindows ? windowsCommand : unixCommand;
};

/**
 * Execute a command with proper platform handling
 * @param {string} command - Command to execute
 * @param {Object} options - Execution options
 * @returns {Buffer} Command output
 */
const execCommand = (command, options = {}) => {
  const defaultOptions = {
    stdio: 'inherit',
    shell: isWindows,
    ...options
  };
  
  try {
    return execSync(command, defaultOptions);
  } catch (error) {
    console.error(`Command failed: ${command}`);
    console.error(`Error: ${error.message}`);
    throw error;
  }
};

/**
 * Spawn a process with proper platform handling
 * @param {string} command - Command to spawn
 * @param {Array} args - Command arguments
 * @param {Object} options - Spawn options
 * @returns {Object} Child process
 */
const spawnProcess = (command, args = [], options = {}) => {
  const defaultOptions = {
    stdio: 'inherit',
    shell: isWindows,
    ...options
  };
  
  return spawn(command, args, defaultOptions);
};

/**
 * Get the appropriate file permissions for the current platform
 * @param {string} filePath - Path to the file
 * @returns {string} File permissions
 */
const getFilePermissions = (filePath) => {
  if (isWindows) {
    // Windows doesn't use Unix-style permissions
    return '666'; // Read/write for owner and group
  }
  
  try {
    const stats = fs.statSync(filePath);
    return stats.mode.toString(8).slice(-3);
  } catch (error) {
    return '644'; // Default permissions
  }
};

/**
 * Set file permissions (Unix-like systems only)
 * @param {string} filePath - Path to the file
 * @param {string} permissions - Permissions to set
 */
const setFilePermissions = (filePath, permissions) => {
  if (!isWindows) {
    try {
      fs.chmodSync(filePath, permissions);
    } catch (error) {
      console.warn(`Could not set permissions for ${filePath}: ${error.message}`);
    }
  }
};

/**
 * Create a directory with proper permissions
 * @param {string} dirPath - Directory path
 * @param {Object} options - Directory creation options
 */
const createDirectory = (dirPath, options = {}) => {
  const defaultOptions = {
    recursive: true,
    mode: isWindows ? undefined : 0o755,
    ...options
  };
  
  try {
    fs.mkdirSync(dirPath, defaultOptions);
  } catch (error) {
    if (error.code !== 'EEXIST') {
      throw error;
    }
  }
};

/**
 * Copy a file with proper error handling
 * @param {string} src - Source file path
 * @param {string} dest - Destination file path
 * @param {Object} options - Copy options
 */
const copyFile = (src, dest, options = {}) => {
  try {
    fs.copyFileSync(src, dest, options);
  } catch (error) {
    console.error(`Failed to copy file from ${src} to ${dest}: ${error.message}`);
    throw error;
  }
};

/**
 * Check if a file exists
 * @param {string} filePath - File path to check
 * @returns {boolean} True if file exists
 */
const fileExists = (filePath) => {
  try {
    return fs.existsSync(filePath);
  } catch (error) {
    return false;
  }
};

/**
 * Get the appropriate path separator for the current platform
 * @returns {string} Path separator
 */
const getPathSeparator = () => {
  return path.sep;
};

/**
 * Normalize a path for the current platform
 * @param {string} filePath - Path to normalize
 * @returns {string} Normalized path
 */
const normalizePath = (filePath) => {
  return path.normalize(filePath);
};

/**
 * Join paths using the appropriate separator
 * @param {...string} paths - Paths to join
 * @returns {string} Joined path
 */
const joinPaths = (...paths) => {
  return path.join(...paths);
};

/**
 * Get the home directory for the current user
 * @returns {string} Home directory path
 */
const getHomeDirectory = () => {
  return os.homedir();
};

/**
 * Get the temporary directory for the current platform
 * @returns {string} Temporary directory path
 */
const getTempDirectory = () => {
  return os.tmpdir();
};

/**
 * Check if OpenSSL is available on the system
 * @returns {boolean} True if OpenSSL is available
 */
const isOpenSSLAvailable = () => {
  try {
    execCommand('openssl version', { stdio: 'pipe' });
    return true;
  } catch (error) {
    return false;
  }
};

/**
 * Get the OpenSSL command for the current platform
 * @returns {string} OpenSSL command
 */
const getOpenSSLCommand = () => {
  if (isWindows) {
    // Check if OpenSSL is in PATH or common locations
    const possiblePaths = [
      'openssl',
      'C:\\OpenSSL-Win64\\bin\\openssl.exe',
      'C:\\OpenSSL-Win32\\bin\\openssl.exe',
      'C:\\Program Files\\OpenSSL-Win64\\bin\\openssl.exe',
      'C:\\Program Files (x86)\\OpenSSL-Win32\\bin\\openssl.exe'
    ];
    
    for (const opensslPath of possiblePaths) {
      try {
        execCommand(`${opensslPath} version`, { stdio: 'pipe' });
        return opensslPath;
      } catch (error) {
        // Continue to next path
      }
    }
    
    throw new Error('OpenSSL not found. Please install OpenSSL for Windows.');
  }
  
  return 'openssl';
};

/**
 * Generate SSL certificates with Windows compatibility
 * @param {string} keyPath - Path for the private key
 * @param {string} certPath - Path for the certificate
 * @param {Object} options - Certificate options
 */
const generateSSLCertificates = (keyPath, certPath, options = {}) => {
  const defaultOptions = {
    keySize: 4096,
    days: 365,
    subject: '/C=US/ST=State/L=City/O=TherapEase/OU=IT/CN=localhost',
    ...options
  };
  
  try {
    const opensslCommand = getOpenSSLCommand();
    
    // Generate private key
    const keyCommand = `${opensslCommand} genrsa -out "${keyPath}" ${defaultOptions.keySize}`;
    execCommand(keyCommand);
    
    // Generate certificate
    const certCommand = `${opensslCommand} req -new -x509 -key "${keyPath}" -out "${certPath}" -days ${defaultOptions.days} -subj "${defaultOptions.subject}"`;
    execCommand(certCommand);
    
    // Set appropriate permissions
    if (!isWindows) {
      setFilePermissions(keyPath, '600'); // Read/write for owner only
      setFilePermissions(certPath, '644'); // Read for all, write for owner
    }
    
    console.log('✅ SSL certificates generated successfully');
    return true;
  } catch (error) {
    console.error('❌ Failed to generate SSL certificates:', error.message);
    if (isWindows) {
      console.log('💡 For Windows, you can:');
      console.log('   1. Install OpenSSL from https://slproweb.com/products/Win32OpenSSL.html');
      console.log('   2. Add OpenSSL to your PATH environment variable');
      console.log('   3. Or use Windows Subsystem for Linux (WSL)');
    } else {
      console.log('💡 Make sure OpenSSL is installed on your system');
    }
    return false;
  }
};

/**
 * Get environment variable with Windows compatibility
 * @param {string} name - Environment variable name
 * @param {string} defaultValue - Default value if not found
 * @returns {string} Environment variable value
 */
const getEnvVar = (name, defaultValue = '') => {
  return process.env[name] || defaultValue;
};

/**
 * Set environment variable with Windows compatibility
 * @param {string} name - Environment variable name
 * @param {string} value - Value to set
 */
const setEnvVar = (name, value) => {
  process.env[name] = value;
};

/**
 * Get the appropriate npm command for the current platform
 * @returns {string} NPM command
 */
const getNPMCommand = () => {
  return isWindows ? 'npm.cmd' : 'npm';
};

/**
 * Get the appropriate node command for the current platform
 * @returns {string} Node command
 */
const getNodeCommand = () => {
  return isWindows ? 'node.exe' : 'node';
};

/**
 * Check if a command is available
 * @param {string} command - Command to check
 * @returns {boolean} True if command is available
 */
const isCommandAvailable = (command) => {
  try {
    execCommand(command, { stdio: 'pipe' });
    return true;
  } catch (error) {
    return false;
  }
};

/**
 * Get platform-specific information
 * @returns {Object} Platform information
 */
const getPlatformInfo = () => {
  return {
    platform: os.platform(),
    arch: os.arch(),
    isWindows,
    isMacOS,
    isLinux,
    nodeVersion: process.version,
    npmVersion: process.env.npm_version || 'unknown'
  };
};

module.exports = {
  // Platform detection
  isWindows,
  isMacOS,
  isLinux,
  
  // Command execution
  execCommand,
  spawnProcess,
  getPlatformCommand,
  
  // File operations
  getFilePermissions,
  setFilePermissions,
  createDirectory,
  copyFile,
  fileExists,
  
  // Path operations
  getPathSeparator,
  normalizePath,
  joinPaths,
  getHomeDirectory,
  getTempDirectory,
  
  // SSL operations
  isOpenSSLAvailable,
  getOpenSSLCommand,
  generateSSLCertificates,
  
  // Environment
  getEnvVar,
  setEnvVar,
  
  // Node.js commands
  getNPMCommand,
  getNodeCommand,
  isCommandAvailable,
  
  // Platform info
  getPlatformInfo
};
