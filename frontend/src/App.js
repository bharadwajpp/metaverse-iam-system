import React, { useState, useEffect } from 'react';
import { ethers } from 'ethers';
import './App.css';

// Contract ABIs (simplified for demo)
const PRIVACY_IAM_ABI = [
  "function registerUser(bytes32 profileHash)",
  "function updateUserProfile(bytes32 newProfileHash)",
  "function registerPlatform(string memory platformName)",
  "function grantAccess(address user, string memory platformName)",
  "function hasAccess(address user, string memory platformName) view returns (bool)",
  "function generateAccessToken(string memory platformName) view returns (bytes32)",
  "function getUserPlatforms(address user) view returns (string[])",
  "function users(address) view returns (bytes32 profileHash, address userAddress, uint256 timestamp, bool isActive)",
  "event UserRegistered(address indexed user, bytes32 profileHash)",
  "event PlatformRegistered(string indexed platformName, address indexed owner)",
  "event AccessGranted(address indexed user, string indexed platform)"
];

const METAVERSE_REGISTRY_ABI = [
  "function registerWorld(string memory worldName, string memory endpoint, bool requiresAuth)",
  "function canAccessWorld(address user, string memory worldName) view returns (bool)",
  "function worlds(string) view returns (string name, string endpoint, address owner, bool requiresAuth, uint256 createdAt)",
  "event WorldRegistered(string indexed worldName, address indexed owner)"
];

function App() {
  const [account, setAccount] = useState('');
  const [provider, setProvider] = useState(null);
  const [signer, setSigner] = useState(null);
  const [privacyIAMContract, setPrivacyIAMContract] = useState(null);
  const [metaverseRegistryContract, setMetaverseRegistryContract] = useState(null);
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState('');
  
  // User state
  const [isRegistered, setIsRegistered] = useState(false);
  const [userProfile, setUserProfile] = useState(null);
  const [userPlatforms, setUserPlatforms] = useState([]);
  
  // Form states
  const [profileData, setProfileData] = useState('');
  const [platformName, setPlatformName] = useState('');
  const [worldName, setWorldName] = useState('');
  const [worldEndpoint, setWorldEndpoint] = useState('');
  const [requiresAuth, setRequiresAuth] = useState(true);
  const [accessCheckUser, setAccessCheckUser] = useState('');
  const [accessCheckPlatform, setAccessCheckPlatform] = useState('');

  // Contract addresses
  const PRIVACY_IAM_ADDRESS = "0x5FbDB2315678afecb367f032d93F642f64180aa3";  
  const METAVERSE_REGISTRY_ADDRESS = "0xe7f1725E7734CE288F8367e1Bb143E90bb3F0512";  

  useEffect(() => {
    initializeEthers();

    // Detect account change
    if (window.ethereum) {
      window.ethereum.on('accountsChanged', () => {
        disconnectWallet();
      });
      window.ethereum.on('chainChanged', () => {
        disconnectWallet();
      });
    }
  }, []);

  useEffect(() => {
    if (account && privacyIAMContract) {
      checkUserRegistration();
    }
  }, [account, privacyIAMContract]);

  const initializeEthers = async () => {
    if (typeof window.ethereum !== 'undefined') {
      try {
        const provider = new ethers.BrowserProvider(window.ethereum);
        setProvider(provider);
        
        const signer = await provider.getSigner();
        setSigner(signer);
        
        const accounts = await provider.send("eth_requestAccounts", []);
        setAccount(accounts[0]);
        
        const privacyIAM = new ethers.Contract(PRIVACY_IAM_ADDRESS, PRIVACY_IAM_ABI, signer);
        const metaverseRegistry = new ethers.Contract(METAVERSE_REGISTRY_ADDRESS, METAVERSE_REGISTRY_ABI, signer);
        
        setPrivacyIAMContract(privacyIAM);
        setMetaverseRegistryContract(metaverseRegistry);
        
        setStatus('Connected to wallet successfully!');
      } catch (error) {
        setStatus('Error connecting to wallet: ' + error.message);
        console.error('Error:', error);
      }
    } else {
      setStatus('Please install MetaMask!');
    }
  };

  const disconnectWallet = () => {
    setAccount('');
    setSigner(null);
    setPrivacyIAMContract(null);
    setMetaverseRegistryContract(null);
    setIsRegistered(false);
    setUserProfile(null);
    setUserPlatforms([]);
    setStatus('Wallet disconnected.');
  };

  const checkUserRegistration = async () => {
    try {
      const user = await privacyIAMContract.users(account);
      if (user.isActive) {
        setIsRegistered(true);
        setUserProfile(user);
        const platforms = await privacyIAMContract.getUserPlatforms(account);
        setUserPlatforms(platforms);
      }
    } catch (error) {
      console.log('User not registered or error:', error.message);
    }
  };

  const registerUser = async () => {
    if (!profileData.trim()) {
      setStatus('Please enter profile data');
      return;
    }
    setLoading(true);
    try {
      const profileHash = ethers.keccak256(ethers.toUtf8Bytes(profileData));
      const tx = await privacyIAMContract.registerUser(profileHash);
      setStatus('Registering user... Please wait for confirmation');
      await tx.wait();
      setStatus('User registered successfully!');
      setIsRegistered(true);
      await checkUserRegistration();
    } catch (error) {
      setStatus('Error registering user: ' + error.message);
      console.error('Error:', error);
    }
    setLoading(false);
  };

  const updateUserProfile = async () => {
    if (!profileData.trim()) {
      setStatus('Please enter new profile data');
      return;
    }
    setLoading(true);
    try {
      const newProfileHash = ethers.keccak256(ethers.toUtf8Bytes(profileData));
      const tx = await privacyIAMContract.updateUserProfile(newProfileHash);
      setStatus('Updating profile... Please wait for confirmation');
      await tx.wait();
      setStatus('Profile updated successfully!');
      await checkUserRegistration();
    } catch (error) {
      setStatus('Error updating profile: ' + error.message);
      console.error('Error:', error);
    }
    setLoading(false);
  };

  const registerPlatform = async () => {
    if (!platformName.trim()) {
      setStatus('Please enter platform name');
      return;
    }
    setLoading(true);
    try {
      const tx = await privacyIAMContract.registerPlatform(platformName);
      setStatus('Registering platform... Please wait for confirmation');
      await tx.wait();
      setStatus('Platform registered successfully!');
      setPlatformName('');
    } catch (error) {
      setStatus('Error registering platform: ' + error.message);
      console.error('Error:', error);
    }
    setLoading(false);
  };

  const registerWorld = async () => {
    if (!worldName.trim() || !worldEndpoint.trim()) {
      setStatus('Please enter world name and endpoint');
      return;
    }
    setLoading(true);
    try {
      const tx = await metaverseRegistryContract.registerWorld(worldName, worldEndpoint, requiresAuth);
      setStatus('Registering world... Please wait for confirmation');
      await tx.wait();
      setStatus('Virtual world registered successfully!');
      setWorldName('');
      setWorldEndpoint('');
    } catch (error) {
      setStatus('Error registering world: ' + error.message);
      console.error('Error:', error);
    }
    setLoading(false);
  };

  const checkAccess = async () => {
    if (!accessCheckUser.trim() || !accessCheckPlatform.trim()) {
      setStatus('Please enter user address and platform name');
      return;
    }
    setLoading(true);
    try {
      const hasAccess = await privacyIAMContract.hasAccess(accessCheckUser, accessCheckPlatform);
      setStatus(`Access check result: ${hasAccess ? 'GRANTED' : 'DENIED'}`);
    } catch (error) {
      setStatus('Error checking access: ' + error.message);
      console.error('Error:', error);
    }
    setLoading(false);
  };

  const generateAccessToken = async () => {
    if (!accessCheckPlatform.trim()) {
      setStatus('Please enter platform name');
      return;
    }
    setLoading(true);
    try {
      const token = await privacyIAMContract.generateAccessToken(accessCheckPlatform);
      setStatus(`Access token generated: ${token}`);
    } catch (error) {
      setStatus('Error generating token: ' + error.message);
      console.error('Error:', error);
    }
    setLoading(false);
  };

  const connectWallet = async () => {
    if (typeof window.ethereum !== 'undefined') {
      try {
        await window.ethereum.request({ method: 'eth_requestAccounts' });
        await initializeEthers();
      } catch (error) {
        setStatus('Error connecting wallet: ' + error.message);
      }
    } else {
      setStatus('Please install MetaMask!');
    }
  };

  return (
    <div className="App">
      <header className="App-header">
        <h1>🔐 Privacy-Preserving IAM for Metaverse</h1>
        <div className="wallet-info">
          {account ? (
            <div>
              <p>Connected: {account.slice(0, 6)}...{account.slice(-4)}</p>
              <div className={`status ${isRegistered ? 'registered' : 'unregistered'}`}>
                {isRegistered ? '✅ Registered User' : '❌ Not Registered'}
              </div>
              <button onClick={disconnectWallet} className="disconnect-btn">
                Disconnect Wallet
              </button>
            </div>
          ) : (
            <button onClick={connectWallet} className="connect-btn">
              Connect Wallet
            </button>
          )}
        </div>
      </header>

      <main className="App-main">
        <div className="status-message">
          {status && <p>{status}</p>}
        </div>

        {account && (
          <>
            {/* User Registration Section */}
            <div className="section">
              <h2>👤 User Management</h2>
              <div className="form-group">
                <input
                  type="text"
                  placeholder="Enter profile data (will be hashed for privacy)"
                  value={profileData}
                  onChange={(e) => setProfileData(e.target.value)}
                  className="input-field"
                />
                {!isRegistered ? (
                  <button onClick={registerUser} disabled={loading} className="action-btn register-btn">
                    {loading ? 'Registering...' : 'Register User'}
                  </button>
                ) : (
                  <button onClick={updateUserProfile} disabled={loading} className="action-btn update-btn">
                    {loading ? 'Updating...' : 'Update Profile'}
                  </button>
                )}
              </div>

              {isRegistered && userPlatforms.length > 0 && (
                <div className="user-platforms">
                  <h3>Your Platforms:</h3>
                  <ul>
                    {userPlatforms.map((platform, index) => (
                      <li key={index}>{platform}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>

            {/* Platform Registration Section */}
            <div className="section">
              <h2>🏢 Platform Management</h2>
              <div className="form-group">
                <input
                  type="text"
                  placeholder="Platform name"
                  value={platformName}
                  onChange={(e) => setPlatformName(e.target.value)}
                  className="input-field"
                />
                <button onClick={registerPlatform} disabled={loading} className="action-btn platform-btn">
                  {loading ? 'Registering...' : 'Register Platform'}
                </button>
              </div>
            </div>

            {/* Virtual World Registration Section */}
            <div className="section">
              <h2>🌐 Virtual World Registry</h2>
              <div className="form-group">
                <input
                  type="text"
                  placeholder="World name"
                  value={worldName}
                  onChange={(e) => setWorldName(e.target.value)}
                  className="input-field"
                />
                <input
                  type="text"
                  placeholder="World endpoint URL"
                  value={worldEndpoint}
                  onChange={(e) => setWorldEndpoint(e.target.value)}
                  className="input-field"
                />
                <label className="checkbox-label">
                  <input
                    type="checkbox"
                    checked={requiresAuth}
                    onChange={(e) => setRequiresAuth(e.target.checked)}
                  />
                  Requires Authentication
                </label>
                <button onClick={registerWorld} disabled={loading} className="action-btn world-btn">
                  {loading ? 'Registering...' : 'Register World'}
                </button>
              </div>
            </div>

            {/* Access Control Section */}
            <div className="section">
              <h2>🔑 Access Control</h2>
              <div className="form-group">
                <input
                  type="text"
                  placeholder="User address to check"
                  value={accessCheckUser}
                  onChange={(e) => setAccessCheckUser(e.target.value)}
                  className="input-field"
                />
                <input
                  type="text"
                  placeholder="Platform name"
                  value={accessCheckPlatform}
                  onChange={(e) => setAccessCheckPlatform(e.target.value)}
                  className="input-field"
                />
                <div className="button-group">
                  <button onClick={checkAccess} disabled={loading} className="action-btn check-btn">
                    {loading ? 'Checking...' : 'Check Access'}
                  </button>
                  <button onClick={generateAccessToken} disabled={loading} className="action-btn token-btn">
                    {loading ? 'Generating...' : 'Generate Token'}
                  </button>
                </div>
              </div>
            </div>
          </>
        )}
      </main>

      <footer className="App-footer">
        <p>Privacy-Preserving IAM System - Blockchain-based Identity Management</p>
      </footer>
    </div>
  );
}

export default App;
