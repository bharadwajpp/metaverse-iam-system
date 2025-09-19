// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/access/AccessControl.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "@openzeppelin/contracts/utils/cryptography/ECDSA.sol";

contract PrivacyIAM is AccessControl, ReentrancyGuard {
    using ECDSA for bytes32;
    
    bytes32 public constant ADMIN_ROLE = keccak256("ADMIN_ROLE");
    bytes32 public constant METAVERSE_ROLE = keccak256("METAVERSE_ROLE");
    
    struct UserProfile {
        bytes32 profileHash;     
        address userAddress;     
        uint256 timestamp;       
        bool isActive;           
        mapping(string => bool) permissions; 
    }
    
    struct MetaversePlatform {
        string name;
        address owner;
        bool isActive;
        mapping(address => bool) authorizedUsers;
    }
    
    // Events
    event UserRegistered(address indexed user, bytes32 profileHash);
    event UserUpdated(address indexed user, bytes32 newProfileHash);
    event PlatformRegistered(string indexed platformName, address indexed owner);
    event AccessGranted(address indexed user, string indexed platform);
    event AccessRevoked(address indexed user, string indexed platform);
    
    // Storage
    mapping(address => UserProfile) public users;
    mapping(string => MetaversePlatform) public platforms;
    mapping(address => string[]) public userPlatforms;
    mapping(address => uint256) public userNonces;
    
    constructor() {
        _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);
        _grantRole(ADMIN_ROLE, msg.sender);
    }
    
    modifier onlyRegisteredUser() {
        require(users[msg.sender].isActive, "User not registered");
        _;
    }
    
    modifier onlyActivePlatform(string memory platformName) {
        require(platforms[platformName].isActive, "Platform not active");
        _;
    }
    
    function registerUser(bytes32 profileHash) external nonReentrant {
        require(!users[msg.sender].isActive, "User already registered");
        require(profileHash != bytes32(0), "Invalid profile hash");
        
        users[msg.sender].profileHash = profileHash;
        users[msg.sender].userAddress = msg.sender;
        users[msg.sender].timestamp = block.timestamp;
        users[msg.sender].isActive = true;
        userNonces[msg.sender] = 0;
        
        emit UserRegistered(msg.sender, profileHash);
    }
    
    function updateUserProfile(bytes32 newProfileHash) external onlyRegisteredUser {
        require(newProfileHash != bytes32(0), "Invalid profile hash");
        
        users[msg.sender].profileHash = newProfileHash;
        userNonces[msg.sender]++;
        
        emit UserUpdated(msg.sender, newProfileHash);
    }
    
    function registerPlatform(string memory platformName) external {
        require(bytes(platformName).length > 0, "Platform name required");
        require(!platforms[platformName].isActive, "Platform already exists");
        
        platforms[platformName].name = platformName;
        platforms[platformName].owner = msg.sender;
        platforms[platformName].isActive = true;
        
        _grantRole(METAVERSE_ROLE, msg.sender);
        
        emit PlatformRegistered(platformName, msg.sender);
    }
    
    function grantAccess(address user, string memory platformName) 
        external 
        onlyActivePlatform(platformName) 
    {
        require(
            msg.sender == platforms[platformName].owner || hasRole(ADMIN_ROLE, msg.sender),
            "Not authorized"
        );
        require(users[user].isActive, "User not registered");
        
        if (!platforms[platformName].authorizedUsers[user]) {
            platforms[platformName].authorizedUsers[user] = true;
            users[user].permissions[platformName] = true;
            userPlatforms[user].push(platformName);
            
            emit AccessGranted(user, platformName);
        }
    }
    
    function hasAccess(address user, string memory platformName) 
        external 
        view 
        returns (bool) 
    {
        return platforms[platformName].isActive && 
               users[user].isActive && 
               platforms[platformName].authorizedUsers[user];
    }
    
    function generateAccessToken(string memory platformName) 
        external 
        view 
        onlyRegisteredUser
        returns (bytes32) 
    {
        require(platforms[platformName].authorizedUsers[msg.sender], "Access denied");
        
        return keccak256(abi.encodePacked(
            msg.sender,
            platformName,
            userNonces[msg.sender],
            block.timestamp
        ));
    }
    
    function getUserPlatforms(address user) external view returns (string[] memory) {
        require(
            user == msg.sender || hasRole(ADMIN_ROLE, msg.sender),
            "Access denied"
        );
        return userPlatforms[user];
    }
    
    function revokeAccess(address user, string memory platformName) 
        external 
        onlyActivePlatform(platformName) 
    {
        require(
            msg.sender == platforms[platformName].owner || hasRole(ADMIN_ROLE, msg.sender),
            "Not authorized"
        );
        
        if (platforms[platformName].authorizedUsers[user]) {
            platforms[platformName].authorizedUsers[user] = false;
            users[user].permissions[platformName] = false;
            
            string[] storage userPlats = userPlatforms[user];
            for (uint i = 0; i < userPlats.length; i++) {
                if (keccak256(bytes(userPlats[i])) == keccak256(bytes(platformName))) {
                    userPlats[i] = userPlats[userPlats.length - 1];
                    userPlats.pop();
                    break;
                }
            }
            
            emit AccessRevoked(user, platformName);
        }
    }
    
    function deactivateUser() external onlyRegisteredUser {
        users[msg.sender].isActive = false;
        userNonces[msg.sender]++;
    }
}
