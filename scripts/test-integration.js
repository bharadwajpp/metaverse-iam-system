const hre = require("hardhat");

async function main() {
    console.log("Starting integration test...");
    
    const [deployer, user1, user2, platformOwner] = await hre.ethers.getSigners();
    console.log("Test accounts ready");

    try {
        // Get deployed contract addresses (update these with your actual addresses)
        const PRIVACY_IAM_ADDRESS = process.env.PRIVACY_IAM_ADDRESS;
        const METAVERSE_REGISTRY_ADDRESS = process.env.METAVERSE_REGISTRY_ADDRESS;

        if (!PRIVACY_IAM_ADDRESS || !METAVERSE_REGISTRY_ADDRESS) {
            throw new Error("Please set contract addresses in .env file");
        }

        // Get contract instances
        const privacyIAM = await hre.ethers.getContractAt("PrivacyIAM", PRIVACY_IAM_ADDRESS);
        const metaverseRegistry = await hre.ethers.getContractAt("MetaverseRegistry", METAVERSE_REGISTRY_ADDRESS);

        console.log("Testing user registration...");
        const profileHash = hre.ethers.keccak256(hre.ethers.toUtf8Bytes("test_user_profile_" + Date.now()));
        const tx1 = await privacyIAM.connect(user1).registerUser(profileHash);
        await tx1.wait();
        console.log("✅ User registered successfully");

        console.log("Testing platform registration...");
        const tx2 = await privacyIAM.connect(platformOwner).registerPlatform("TestWorld");
        await tx2.wait();
        console.log("✅ Platform registered successfully");

        console.log("Testing access control...");
        const tx3 = await privacyIAM.connect(platformOwner).grantAccess(user1.address, "TestWorld");
        await tx3.wait();
        console.log("✅ Access granted successfully");

        const hasAccess = await privacyIAM.hasAccess(user1.address, "TestWorld");
        console.log("✅ User access verified:", hasAccess);

        console.log("Testing access token generation...");
        const accessToken = await privacyIAM.connect(user1).generateAccessToken("TestWorld");
        console.log("✅ Access token generated:", accessToken);

        console.log("Testing metaverse world registration...");
        const tx4 = await metaverseRegistry.connect(user1).registerWorld(
            "IntegrationTestWorld",
            "https://test.example.com",
            true
        );
        await tx4.wait();
        console.log("✅ Virtual world registered successfully");

        console.log("Testing world access check...");
        const canAccess = await metaverseRegistry.canAccessWorld(user1.address, "IntegrationTestWorld");
        console.log("✅ World access check:", canAccess);

        console.log("\n🎉 All integration tests passed!");

    } catch (error) {
        console.error("❌ Integration test failed:", error);
        process.exit(1);
    }
}

main()
    .then(() => {
        console.log("Integration test completed!");
        process.exit(0);
    })
    .catch((error) => {
        console.error("Integration test error:", error);
        process.exit(1);
    });