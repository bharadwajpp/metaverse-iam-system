// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "./PrivacyIAM.sol";

contract MetaverseRegistry {
    PrivacyIAM public immutable iamContract;
    
    struct VirtualWorld {
        string name;
        string endpoint;
        address owner;
        bool requiresAuth;
        uint256 createdAt;
    }
    
    mapping(string => VirtualWorld) public worlds;
    mapping(address => string[]) public ownerWorlds;
    
    event WorldRegistered(string indexed worldName, address indexed owner);
    event WorldUpdated(string indexed worldName, string newEndpoint);
    
    constructor(address _iamContract) {
        iamContract = PrivacyIAM(_iamContract);
    }
    
    function registerWorld(
        string memory worldName,
        string memory endpoint,
        bool requiresAuth
    ) external {
        require(bytes(worldName).length > 0, "World name required");
        require(bytes(endpoint).length > 0, "Endpoint required");
        require(worlds[worldName].owner == address(0), "World exists");
        
        worlds[worldName] = VirtualWorld({
            name: worldName,
            endpoint: endpoint,
            owner: msg.sender,
            requiresAuth: requiresAuth,
            createdAt: block.timestamp
        });
        
        ownerWorlds[msg.sender].push(worldName);
        
        emit WorldRegistered(worldName, msg.sender);
    }
    
    function canAccessWorld(address user, string memory worldName) 
        external 
        view 
        returns (bool) 
    {
        if (!worlds[worldName].requiresAuth) {
            return true;
        }
        
        return iamContract.hasAccess(user, worldName);
    }
    
    function updateWorldEndpoint(string memory worldName, string memory newEndpoint) 
        external 
    {
        require(worlds[worldName].owner == msg.sender, "Not owner");
        require(bytes(newEndpoint).length > 0, "Invalid endpoint");
        
        worlds[worldName].endpoint = newEndpoint;
        
        emit WorldUpdated(worldName, newEndpoint);
    }
}