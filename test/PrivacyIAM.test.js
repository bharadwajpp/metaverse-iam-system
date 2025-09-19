const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("PrivacyIAM", function () {
    let privacyIAM;
    let metaverseRegistry;
    let owner;
    let user1;
    let user2;
    let platformOwner;

    beforeEach(async function () {
        [owner, user1, user2, platformOwner] = await ethers.getSigners();

        // Deploy PrivacyIAM contract
        const PrivacyIAM = await ethers.getContractFactory("PrivacyIAM");
        privacyIAM = await PrivacyIAM.deploy();
        await privacyIAM.waitForDeployment();

        // Deploy MetaverseRegistry contract
        const MetaverseRegistry = await ethers.getContractFactory("MetaverseRegistry");
        metaverseRegistry = await MetaverseRegistry.deploy(await privacyIAM.getAddress());
        await metaverseRegistry.waitForDeployment();

        console.log("PrivacyIAM deployed to:", await privacyIAM.getAddress());
        console.log("MetaverseRegistry deployed to:", await metaverseRegistry.getAddress());
    });

    describe("User Registration", function () {
        it("Should register a new user with profile hash", async function () {
            const profileHash = ethers.keccak256(ethers.toUtf8Bytes("encrypted_profile_data"));
            
            await expect(privacyIAM.connect(user1).registerUser(profileHash))
                .to.emit(privacyIAM, "UserRegistered")
                .withArgs(user1.address, profileHash);

            const userProfile = await privacyIAM.users(user1.address);
            expect(userProfile.profileHash).to.equal(profileHash);
            expect(userProfile.isActive).to.be.true;
        });

        it("Should not allow duplicate registration", async function () {
            const profileHash = ethers.keccak256(ethers.toUtf8Bytes("encrypted_profile_data"));
            
            await privacyIAM.connect(user1).registerUser(profileHash);
            
            await expect(privacyIAM.connect(user1).registerUser(profileHash))
                .to.be.revertedWith("User already registered");
        });

        it("Should update user profile hash", async function () {
            const profileHash1 = ethers.keccak256(ethers.toUtf8Bytes("encrypted_profile_data_1"));
            const profileHash2 = ethers.keccak256(ethers.toUtf8Bytes("encrypted_profile_data_2"));
            
            await privacyIAM.connect(user1).registerUser(profileHash1);
            
            await expect(privacyIAM.connect(user1).updateUserProfile(profileHash2))
                .to.emit(privacyIAM, "UserUpdated")
                .withArgs(user1.address, profileHash2);

            const userProfile = await privacyIAM.users(user1.address);
            expect(userProfile.profileHash).to.equal(profileHash2);
        });
    });

    describe("Platform Management", function () {
        it("Should register a metaverse platform", async function () {
            const platformName = "VirtualWorld1";
            
            await expect(privacyIAM.connect(platformOwner).registerPlatform(platformName))
                .to.emit(privacyIAM, "PlatformRegistered")
                .withArgs(platformName, platformOwner.address);

            const platform = await privacyIAM.platforms(platformName);
            expect(platform.name).to.equal(platformName);
            expect(platform.owner).to.equal(platformOwner.address);
            expect(platform.isActive).to.be.true;
        });

        it("Should not allow duplicate platform registration", async function () {
            const platformName = "VirtualWorld1";
            
            await privacyIAM.connect(platformOwner).registerPlatform(platformName);
            
            await expect(privacyIAM.connect(user1).registerPlatform(platformName))
                .to.be.revertedWith("Platform already exists");
        });
    });

    describe("Access Control", function () {
        beforeEach(async function () {
            // Register users
            const profileHash1 = ethers.keccak256(ethers.toUtf8Bytes("user1_profile"));
            const profileHash2 = ethers.keccak256(ethers.toUtf8Bytes("user2_profile"));
            
            await privacyIAM.connect(user1).registerUser(profileHash1);
            await privacyIAM.connect(user2).registerUser(profileHash2);
            
            // Register platform
            await privacyIAM.connect(platformOwner).registerPlatform("VirtualWorld1");
        });

        it("Should grant access to user for platform", async function () {
            await expect(privacyIAM.connect(platformOwner).grantAccess(user1.address, "VirtualWorld1"))
                .to.emit(privacyIAM, "AccessGranted")
                .withArgs(user1.address, "VirtualWorld1");

            const hasAccess = await privacyIAM.hasAccess(user1.address, "VirtualWorld1");
            expect(hasAccess).to.be.true;
        });

        it("Should revoke access from user", async function () {
            await privacyIAM.connect(platformOwner).grantAccess(user1.address, "VirtualWorld1");
            
            await expect(privacyIAM.connect(platformOwner).revokeAccess(user1.address, "VirtualWorld1"))
                .to.emit(privacyIAM, "AccessRevoked")
                .withArgs(user1.address, "VirtualWorld1");

            const hasAccess = await privacyIAM.hasAccess(user1.address, "VirtualWorld1");
            expect(hasAccess).to.be.false;
        });

        it("Should generate access token for authorized user", async function () {
            await privacyIAM.connect(platformOwner).grantAccess(user1.address, "VirtualWorld1");
            
            const accessToken = await privacyIAM.connect(user1).generateAccessToken("VirtualWorld1");
            expect(accessToken).to.not.equal(ethers.ZeroHash);
        });

        it("Should not generate access token for unauthorized user", async function () {
            await expect(privacyIAM.connect(user1).generateAccessToken("VirtualWorld1"))
                .to.be.revertedWith("Access denied");
        });
    });

    describe("Privacy Features", function () {
        beforeEach(async function () {
            const profileHash = ethers.keccak256(ethers.toUtf8Bytes("user1_profile"));
            await privacyIAM.connect(user1).registerUser(profileHash);
            await privacyIAM.connect(platformOwner).registerPlatform("VirtualWorld1");
            await privacyIAM.connect(platformOwner).grantAccess(user1.address, "VirtualWorld1");
        });

        it("Should allow user to view their own platforms", async function () {
            const platforms = await privacyIAM.connect(user1).getUserPlatforms(user1.address);
            expect(platforms).to.include("VirtualWorld1");
        });

        it("Should not allow other users to view user platforms", async function () {
            await expect(privacyIAM.connect(user2).getUserPlatforms(user1.address))
                .to.be.revertedWith("Access denied");
        });

        it("Should allow user to deactivate their account", async function () {
            await privacyIAM.connect(user1).deactivateUser();
            
            const userProfile = await privacyIAM.users(user1.address);
            expect(userProfile.isActive).to.be.false;
        });
    });

    describe("Metaverse Registry Integration", function () {
        beforeEach(async function () {
            const profileHash = ethers.keccak256(ethers.toUtf8Bytes("user1_profile"));
            await privacyIAM.connect(user1).registerUser(profileHash);
        });

        it("Should register a virtual world", async function () {
            await expect(metaverseRegistry.connect(user1).registerWorld(
                "MyWorld", 
                "https://myworld.example.com", 
                true
            ))
                .to.emit(metaverseRegistry, "WorldRegistered")
                .withArgs("MyWorld", user1.address);
        });

        it("Should check access to auth-required world", async function () {
            await metaverseRegistry.connect(user1).registerWorld(
                "MyWorld", 
                "https://myworld.example.com", 
                true
            );
            await privacyIAM.connect(user1).registerPlatform("MyWorld");

            // ✅ FIX: Register user2 before granting access
            const profileHash2 = ethers.keccak256(ethers.toUtf8Bytes("user2_profile"));
            await privacyIAM.connect(user2).registerUser(profileHash2);

            await privacyIAM.connect(user1).grantAccess(user2.address, "MyWorld");
            
            const canAccess = await metaverseRegistry.canAccessWorld(user2.address, "MyWorld");
            expect(canAccess).to.be.true;
        });

        it("Should allow access to public worlds", async function () {
            await metaverseRegistry.connect(user1).registerWorld(
                "PublicWorld", 
                "https://public.example.com", 
                false
            );
            
            const canAccess = await metaverseRegistry.canAccessWorld(user2.address, "PublicWorld");
            expect(canAccess).to.be.true;
        });
    });
});
